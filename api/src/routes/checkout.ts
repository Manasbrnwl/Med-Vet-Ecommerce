import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { createPaymentRequest, verifyWebhookSignature } from "../lib/hitpay.js";

const router = Router();

const addressSchema = z.object({
  firstName: z.string().optional(),
  lastName:  z.string().optional(),
  company:   z.string().optional(),
  address1:  z.string().optional(),
  address2:  z.string().optional(),
  city:      z.string().optional(),
  state:     z.string().optional(),
  postcode:  z.string().optional(),
  country:   z.string().optional(),
  phone:     z.string().optional(),
  email:     z.string().email().optional(),
});

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.number().int().positive(),
    variantId: z.number().int().positive().optional(),
    qty:       z.number().int().min(1),
  })).min(1),
  billing:       addressSchema,
  shipping:      addressSchema.optional(),
  couponCode:    z.string().optional(),
  customerEmail: z.string().email(),
  customerNote:  z.string().optional(),
});

// ── POST /api/checkout ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const body = checkoutSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.flatten() }); return; }
  const { items, billing, shipping, couponCode, customerEmail, customerNote } = body.data;

  // Auth is optional (guest checkout allowed)
  const token: string | undefined = req.headers.authorization?.replace("Bearer ", "");
  let userId: number | null = null;
  if (token) {
    try {
      const p = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
      userId = p.id;
    } catch { /* guest */ }
  }

  // Resolve products and calculate subtotal
  let subtotal = 0;
  const resolvedItems: Array<{
    productId: number; variantId: number | null;
    name: string; sku: string | null; quantity: number; bonusQuantity: number;
    subtotal: number; total: number; taxTotal: number;
  }> = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { id: true, name: true, price: true, sku: true, stockStatus: true, manageStock: true, stockQuantity: true, bonusBuyQty: true, bonusFreeQty: true, expiryDate: true },
    });
    if (!product) { res.status(422).json({ error: `Product ${item.productId} not found` }); return; }
    if (product.expiryDate && product.expiryDate < new Date()) {
      res.status(422).json({ error: `${product.name} has expired and can't be ordered` }); return;
    }

    let price = Number(product.price ?? 0);
    let sku   = product.sku;

    if (item.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: item.variantId, productId: item.productId },
        select: { price: true, sku: true, stockStatus: true, stockQuantity: true, manageStock: true },
      });
      if (!variant) { res.status(422).json({ error: `Variant ${item.variantId} not found` }); return; }
      if (variant.stockStatus === "OUT_OF_STOCK") { res.status(422).json({ error: `${product.name} is out of stock` }); return; }
      if (variant.manageStock && variant.stockQuantity !== null && variant.stockQuantity < item.qty) {
        res.status(422).json({ error: `Insufficient stock for ${product.name}` }); return;
      }
      price = Number(variant.price ?? price);
      sku   = variant.sku ?? sku;
    } else {
      if (product.stockStatus === "OUT_OF_STOCK") { res.status(422).json({ error: `${product.name} is out of stock` }); return; }
      if (product.manageStock && product.stockQuantity !== null && product.stockQuantity < item.qty) {
        res.status(422).json({ error: `Insufficient stock for ${product.name}` }); return;
      }
    }

    // Bulk bonus: buy N get M extra free, repeating per multiple. Charged qty is unchanged.
    const bonusQuantity =
      product.bonusBuyQty && product.bonusFreeQty && product.bonusBuyQty > 0
        ? Math.floor(item.qty / product.bonusBuyQty) * product.bonusFreeQty
        : 0;

    const lineTotal = price * item.qty;
    subtotal += lineTotal;
    resolvedItems.push({
      productId: item.productId, variantId: item.variantId ?? null,
      name: product.name, sku, quantity: item.qty, bonusQuantity,
      subtotal: lineTotal, total: lineTotal, taxTotal: 0,
    });
  }

  // Apply coupon
  let discountTotal = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toLowerCase() } });
    if (!coupon) { res.status(422).json({ error: "Invalid coupon code" }); return; }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) { res.status(422).json({ error: "Coupon expired" }); return; }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) { res.status(422).json({ error: "Coupon usage limit reached" }); return; }
    if (coupon.minSpend && subtotal < Number(coupon.minSpend)) {
      res.status(422).json({ error: `Minimum spend of ${coupon.minSpend} required` }); return;
    }
    if (coupon.type === "PERCENT") discountTotal = +(subtotal * Number(coupon.amount) / 100).toFixed(2);
    else if (coupon.type === "FIXED_CART") discountTotal = Math.min(subtotal, Number(coupon.amount));
    else discountTotal = 0; // FIXED_PRODUCT handled per item — simplified
  }

  const shippingTotal = 0; // TODO: compute from ShippingZone
  const taxTotal      = 0; // TODO: GST
  const total         = +(subtotal - discountTotal + shippingTotal + taxTotal).toFixed(2);

  // Create order
  const order = await prisma.order.create({
    data: {
      status: "PENDING",
      currency: "SGD",
      subtotal, discountTotal, shippingTotal, taxTotal, total,
      userId, customerEmail,
      customerNote: customerNote ?? null,
      billing, shipping: shipping ?? billing,
      createdVia: "api",
      ipAddress: req.ip ?? null,
      items: {
        create: resolvedItems,
      },
    },
  });

  // Increment coupon usage
  if (couponCode) {
    await prisma.coupon.update({ where: { code: couponCode.toLowerCase() }, data: { usageCount: { increment: 1 } } });
  }

  // Initiate payment
  if (process.env.HITPAY_API_KEY) {
    try {
      const rawProto = req.headers["x-forwarded-proto"];
      const protocol = (Array.isArray(rawProto) ? rawProto[0] : rawProto) ?? "http";
      const host = req.headers.host ?? "localhost:4000";
      const { url, paymentId } = await createPaymentRequest({
        amount: total,
        currency: "SGD",
        name: `${billing.firstName ?? ""} ${billing.lastName ?? ""}`.trim() || "Customer",
        email: customerEmail,
        phone: billing.phone,
        reference: String(order.id),
        redirectUrl: `${protocol}://${host}/checkout/success?orderId=${order.id}`,
        webhookUrl:  `${protocol}://${host}/api/checkout/webhook`,
      });
      await prisma.order.update({ where: { id: order.id }, data: { transactionId: paymentId } });
      res.status(201).json({ orderId: order.id, paymentUrl: url });
    } catch (e) {
      res.status(201).json({ orderId: order.id, paymentUrl: null, warning: "Payment gateway error — contact support" });
    }
  } else {
    res.status(201).json({ orderId: order.id, paymentUrl: null, note: "HitPay not configured — order created in pending state" });
  }
});

// ── POST /api/checkout/webhook ────────────────────────────────────────────────
router.post("/webhook", async (req, res) => {
  const payload = req.body as Record<string, string>;
  const hmac = payload.hmac;
  if (!hmac || !verifyWebhookSignature(payload, hmac)) {
    res.status(400).json({ error: "Invalid signature" }); return;
  }

  const orderId = parseInt(payload.reference_number);
  if (!orderId) { res.status(400).json({ error: "Missing reference" }); return; }

  const status = payload.status === "completed" ? "PROCESSING" :
                 payload.status === "failed"    ? "FAILED"     : null;

  if (status) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as "PROCESSING" | "FAILED",
        datePaid: status === "PROCESSING" ? new Date() : null,
        paymentMethod: payload.payment_type ?? null,
      },
    });
  }

  res.json({ success: true });
});

// ── GET /api/checkout/orders/:id/status ───────────────────────────────────────
router.get("/orders/:id/status", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: parseInt(String(req.params.id)) },
    select: { id: true, status: true, total: true, currency: true, datePaid: true },
  });
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.json(order);
});

// ── GET /api/checkout/orders/:id (authenticated owner or admin) ───────────────
router.get("/orders/:id/detail", requireAuth, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: parseInt(String(req.params.id)), userId: req.user!.id },
    include: { items: true, invoice: true },
  });
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.json(order);
});

export default router;
