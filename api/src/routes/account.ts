import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// ── GET /api/account/me ───────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      role: true, createdAt: true,
      addresses: true,
    },
  });
  res.json(user);
});

// ── PUT /api/account/me ───────────────────────────────────────────────────────
const updateSchema = z.object({
  firstName:       z.string().min(1).optional(),
  lastName:        z.string().min(1).optional(),
  phone:           z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword:     z.string().min(8).optional(),
}).refine(
  (d) => !(d.newPassword && !d.currentPassword),
  { message: "currentPassword required when changing password", path: ["currentPassword"] }
);

router.put("/me", async (req, res) => {
  const body = updateSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.flatten() }); return; }
  const { firstName, lastName, phone, currentPassword, newPassword } = body.data;

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const data: Record<string, unknown> = {};
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName  !== undefined) data.lastName  = lastName;
  if (phone     !== undefined) data.phone     = phone;

  if (newPassword) {
    if (!user.passwordHash) { res.status(400).json({ error: "Set a password first via password reset" }); return; }
    const ok = await bcrypt.compare(currentPassword!, user.passwordHash);
    if (!ok) { res.status(401).json({ error: "Current password incorrect" }); return; }
    data.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id: user.id }, data,
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
  });
  res.json(updated);
});

// ── POST /api/account/addresses ───────────────────────────────────────────────
const addressSchema = z.object({
  type:      z.enum(["BILLING", "SHIPPING"]),
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
  isDefault: z.boolean().default(false),
});

router.post("/addresses", async (req, res) => {
  const body = addressSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.flatten() }); return; }
  if (body.data.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id, type: body.data.type }, data: { isDefault: false } });
  }
  const addr = await prisma.address.create({ data: { ...body.data, userId: req.user!.id } });
  res.status(201).json(addr);
});

router.put("/addresses/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const addr = await prisma.address.findFirst({ where: { id, userId: req.user!.id } });
  if (!addr) { res.status(404).json({ error: "Not found" }); return; }
  const body = addressSchema.partial().safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.flatten() }); return; }
  if (body.data.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id, type: addr.type }, data: { isDefault: false } });
  }
  const updated = await prisma.address.update({ where: { id }, data: body.data });
  res.json(updated);
});

router.delete("/addresses/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const addr = await prisma.address.findFirst({ where: { id, userId: req.user!.id } });
  if (!addr) { res.status(404).json({ error: "Not found" }); return; }
  await prisma.address.delete({ where: { id } });
  res.status(204).end();
});

// ── GET /api/account/orders ───────────────────────────────────────────────────
router.get("/orders", async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 10);

  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { userId: req.user!.id } }),
    prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, status: true, total: true, currency: true,
        createdAt: true, datePaid: true, paymentMethodTitle: true,
        items: { take: 3, select: { name: true, quantity: true, total: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  res.json({ data: orders, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// ── GET /api/account/orders/:id ───────────────────────────────────────────────
router.get("/orders/:id", async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: parseInt(String(req.params.id)), userId: req.user!.id },
    include: {
      items: {
        include: {
          product: { select: { slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true, alt: true } } } },
        },
      },
      invoice: true,
    },
  });
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.json(order);
});

// ── Reviews (verified purchasers) ─────────────────────────────────────────────
const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating:    z.number().int().min(1).max(5),
  content:   z.string().max(2000).optional().nullable(),
});

// Can the current user review this product, and have they already?
router.get("/reviews/eligibility/:productId", async (req, res) => {
  const productId = parseInt(String(req.params.productId));
  const purchased = await prisma.orderItem.findFirst({
    where: { productId, order: { userId: req.user!.id } },
    select: { id: true },
  });
  const mine = await prisma.review.findFirst({
    where: { productId, userId: req.user!.id },
    select: { id: true, rating: true, content: true },
  });
  res.json({ canReview: !!purchased, mine });
});

// Create or update the user's review for a purchased product (auto-approved)
router.post("/reviews", async (req, res) => {
  const body = reviewSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.flatten() }); return; }
  const { productId, rating, content } = body.data;

  const purchased = await prisma.orderItem.findFirst({
    where: { productId, order: { userId: req.user!.id } },
    select: { id: true },
  });
  if (!purchased) { res.status(403).json({ error: "You can only review products you've purchased." }); return; }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { firstName: true, lastName: true } });
  const authorName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Customer";

  const existing = await prisma.review.findFirst({ where: { productId, userId: req.user!.id } });
  const data = { productId, userId: req.user!.id, authorName, rating, content: content ?? null, approved: true };
  const review = existing
    ? await prisma.review.update({ where: { id: existing.id }, data })
    : await prisma.review.create({ data });
  res.status(201).json(review);
});

export default router;
