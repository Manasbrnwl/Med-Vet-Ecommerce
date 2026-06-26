import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "SHOP_MANAGER"));

const pageParams = (query: Record<string, unknown>) => ({
  page:  Math.max(1, parseInt(query.page as string) || 1),
  limit: Math.min(100, parseInt(query.limit as string) || 20),
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get("/stats", async (_req, res) => {
  const [products, orders, users, pendingOrders, totalRevenue] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.aggregate({ where: { status: { in: ["PROCESSING", "COMPLETED"] } }, _sum: { total: true } }),
  ]);
  res.json({ products, orders, users, pendingOrders, totalRevenue: totalRevenue._sum.total ?? 0 });
});

// ── Products ──────────────────────────────────────────────────────────────────
router.get("/products", async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const q = (req.query.q as string) ?? "";
  const status = req.query.status as string | undefined;

  const where = {
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }] }),
    ...(status && { status: status as never }),
  };

  const [total, data] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, slug: true, name: true, status: true, type: true, sku: true,
        price: true, regularPrice: true, salePrice: true,
        stockStatus: true, stockQuantity: true, manageStock: true,
        totalSales: true, featured: true, createdAt: true, updatedAt: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        brand: { select: { name: true, slug: true } },
        _count: { select: { variants: true } },
      },
    }),
  ]);
  res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get("/products/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(String(req.params.id)) },
    include: { images: true, brand: true, categories: true, tags: true, variants: true },
  });
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json(product);
});

const productUpdateSchema = z.object({
  name:          z.string().min(1).optional(),
  status:        z.enum(["PUBLISHED", "DRAFT", "PRIVATE", "TRASH"]).optional(),
  price:         z.number().nonnegative().optional(),
  regularPrice:  z.number().nonnegative().optional(),
  salePrice:     z.number().nonnegative().nullable().optional(),
  stockStatus:   z.enum(["IN_STOCK", "OUT_OF_STOCK", "ON_BACKORDER"]).optional(),
  stockQuantity: z.number().int().nonnegative().nullable().optional(),
  featured:      z.boolean().optional(),
  description:   z.string().optional(),
});

router.put("/products/:id", async (req, res) => {
  const body = productUpdateSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.flatten() }); return; }
  const product = await prisma.product.update({ where: { id: parseInt(String(req.params.id)) }, data: body.data as never });
  res.json(product);
});

router.delete("/products/:id", async (req, res) => {
  await prisma.product.update({ where: { id: parseInt(String(req.params.id)) }, data: { status: "TRASH" } });
  res.status(204).end();
});

// ── Orders ────────────────────────────────────────────────────────────────────
router.get("/orders", async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const status = req.query.status as string | undefined;
  const q = req.query.q as string | undefined;

  const where = {
    ...(status && { status: status as never }),
    ...(q && { OR: [
      { customerEmail: { contains: q, mode: "insensitive" as const } },
      { orderKey:      { contains: q, mode: "insensitive" as const } },
    ]}),
  };

  const [total, data] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, status: true, total: true, currency: true, customerEmail: true,
        paymentMethod: true, paymentMethodTitle: true, datePaid: true, createdAt: true,
        billing: true,
        _count: { select: { items: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get("/orders/:id", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: parseInt(String(req.params.id)) },
    include: { items: { include: { product: { select: { slug: true, name: true } } } }, invoice: true, refunds: true, user: { select: { id: true, email: true } } },
  });
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.json(order);
});

const orderUpdateSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "ON_HOLD", "COMPLETED", "CANCELLED", "REFUNDED", "FAILED"]).optional(),
  customerNote: z.string().optional(),
});

router.put("/orders/:id", async (req, res) => {
  const body = orderUpdateSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.flatten() }); return; }
  const data = body.data as Record<string, unknown>;
  if (data.status === "COMPLETED" && !data.dateCompleted) data.dateCompleted = new Date();
  const order = await prisma.order.update({ where: { id: parseInt(String(req.params.id)) }, data: data as never });
  res.json(order);
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const q = req.query.q as string | undefined;
  const where = q ? {
    OR: [
      { email:     { contains: q, mode: "insensitive" as const } },
      { firstName: { contains: q, mode: "insensitive" as const } },
      { lastName:  { contains: q, mode: "insensitive" as const } },
    ],
  } : {};

  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, phone: true, createdAt: true, lastLoginAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);
  res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.put("/users/:id/role", requireRole("ADMIN"), async (req, res) => {
  const { role } = z.object({ role: z.enum(["CUSTOMER", "ADMIN", "SHOP_MANAGER"]) }).parse(req.body);
  const user = await prisma.user.update({ where: { id: parseInt(String(req.params.id)) }, data: { role } });
  res.json({ id: user.id, role: user.role });
});

// ── Coupons ───────────────────────────────────────────────────────────────────
router.get("/coupons", async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const [total, data] = await Promise.all([
    prisma.coupon.count(),
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
  ]);
  res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// ── Reviews ───────────────────────────────────────────────────────────────────
router.get("/reviews", async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const pending = req.query.pending === "true";
  const [total, data] = await Promise.all([
    prisma.review.count({ where: pending ? { approved: false } : {} }),
    prisma.review.findMany({
      where: pending ? { approved: false } : {},
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { product: { select: { slug: true, name: true } } },
    }),
  ]);
  res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.put("/reviews/:id/approve", async (req, res) => {
  const review = await prisma.review.update({ where: { id: parseInt(String(req.params.id)) }, data: { approved: true } });
  res.json(review);
});

router.delete("/reviews/:id", async (req, res) => {
  await prisma.review.delete({ where: { id: parseInt(String(req.params.id)) } });
  res.status(204).end();
});

export default router;
