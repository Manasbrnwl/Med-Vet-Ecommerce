import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const productSelect = {
  id: true, slug: true, name: true, status: true, type: true, featured: true,
  price: true, regularPrice: true, salePrice: true,
  stockStatus: true, stockQuantity: true, manageStock: true, sku: true,
  bonusBuyQty: true, bonusFreeQty: true,
  seoTitle: true, seoDesc: true, createdAt: true, updatedAt: true,
  images: { where: { isPrimary: true }, take: 1, select: { url: true, alt: true } },
  brand:  { select: { id: true, name: true, slug: true } },
  categories: { select: { id: true, name: true, slug: true } },
} as const;

const listQuery = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  brand:    z.string().optional(),
  q:        z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort:     z.enum(["newest", "price_asc", "price_desc", "name"]).default("newest"),
  featured: z.coerce.boolean().optional(),
});

// ── GET /api/products ─────────────────────────────────────────────────────────
router.get("/products", async (req, res) => {
  const q = listQuery.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.flatten() }); return; }
  const { page, limit, category, brand, q: search, minPrice, maxPrice, sort, featured } = q.data;

  const where = {
    status: "PUBLISHED" as const,
    ...(category  && { categories: { some: { slug: category } } }),
    ...(brand     && { brand: { slug: brand } }),
    ...(featured !== undefined && { featured }),
    ...(search    && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { sku:  { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(minPrice !== undefined || maxPrice !== undefined ? {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    } : {}),
  };

  const orderBy =
    sort === "price_asc"  ? { price: "asc" as const }  :
    sort === "price_desc" ? { price: "desc" as const } :
    sort === "name"       ? { name: "asc" as const }   :
    { createdAt: "desc" as const };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: productSelect, orderBy, skip: (page - 1) * limit, take: limit }),
  ]);

  res.json({ products, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// ── GET /api/products/featured ────────────────────────────────────────────────
router.get("/products/featured", async (_req, res) => {
  let products = await prisma.product.findMany({
    where: { status: "PUBLISHED", featured: true },
    select: productSelect,
    orderBy: { totalSales: "desc" },
    take: 12,
  });
  // Fallback: if no products are flagged featured, return best-sellers
  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: productSelect,
      orderBy: { totalSales: "desc" },
      take: 12,
    });
  }
  res.json(products);
});

// ── GET /api/products/:slug ───────────────────────────────────────────────────
router.get("/products/:slug", async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, status: "PUBLISHED" },
    include: {
      images:     { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
      brand:      true,
      categories: true,
      tags:       true,
      reviews:    { where: { approved: true }, orderBy: { createdAt: "desc" }, take: 20 },
      variants: {
        orderBy: { id: "asc" },
        include: {
          attributes: {
            include: { attributeValue: { include: { attribute: true } } },
          },
        },
      },
      attributes: {
        include: { attributeValue: { include: { attribute: true } } },
      },
    },
  });

  if (!product) { res.status(404).json({ error: "Not found" }); return; }

  const reviewSummary = product.reviews.reduce(
    (acc, r) => ({ count: acc.count + 1, sum: acc.sum + (r.rating ?? 0) }),
    { count: 0, sum: 0 }
  );

  res.json({
    ...product,
    reviewSummary: {
      count: reviewSummary.count,
      avg: reviewSummary.count ? +(reviewSummary.sum / reviewSummary.count).toFixed(1) : null,
    },
  });
});

// ── GET /api/categories ───────────────────────────────────────────────────────
router.get("/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, description: true, imageUrl: true, parentId: true, seoTitle: true, seoDesc: true },
  });
  res.json(categories);
});

// ── GET /api/categories/:slug ─────────────────────────────────────────────────
router.get("/categories/:slug", async (req, res) => {
  const q = listQuery.partial().safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.flatten() }); return; }
  const { page = 1, limit = 20, sort = "newest" } = q.data;

  const cat = await prisma.category.findUnique({ where: { slug: req.params.slug } });
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }

  const where = { status: "PUBLISHED" as const, categories: { some: { id: cat.id } } };
  const orderBy =
    sort === "price_asc"  ? { price: "asc" as const }  :
    sort === "price_desc" ? { price: "desc" as const } :
    sort === "name"       ? { name: "asc" as const }   :
    { createdAt: "desc" as const };

  const [total, data] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: productSelect, orderBy, skip: (page - 1) * limit, take: limit }),
  ]);

  res.json({ category: cat, data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// ── GET /api/brands ───────────────────────────────────────────────────────────
router.get("/brands", async (_req, res) => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, description: true, imageUrl: true },
  });
  res.json(brands);
});

// ── GET /api/brands/:slug ─────────────────────────────────────────────────────
router.get("/brands/:slug", async (req, res) => {
  const q = listQuery.partial().safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.flatten() }); return; }
  const { page = 1, limit = 20, sort = "newest" } = q.data;

  const brand = await prisma.brand.findUnique({ where: { slug: req.params.slug } });
  if (!brand) { res.status(404).json({ error: "Not found" }); return; }

  const where = { status: "PUBLISHED" as const, brandId: brand.id };
  const orderBy =
    sort === "price_asc"  ? { price: "asc" as const }  :
    sort === "price_desc" ? { price: "desc" as const } :
    sort === "name"       ? { name: "asc" as const }   :
    { createdAt: "desc" as const };

  const [total, data] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: productSelect, orderBy, skip: (page - 1) * limit, take: limit }),
  ]);

  res.json({ brand, data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// ── GET /api/search ───────────────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  const { q: search, limit: rawLimit = "10" } = req.query as Record<string, string>;
  if (!search?.trim()) { res.json({ data: [] }); return; }
  const limit = Math.min(50, parseInt(rawLimit) || 10);

  const data = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku:  { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    },
    select: productSelect,
    take: limit,
  });

  res.json({ data });
});

// ── GET /api/nav ──────────────────────────────────────────────────────────────
router.get("/nav", async (_req, res) => {
  const menus = await prisma.navigationMenu.findMany({
    include: { items: { orderBy: { position: "asc" } } },
  });
  res.json({ data: menus });
});

// ── GET /api/pages/:slug ──────────────────────────────────────────────────────
router.get("/pages/:slug", async (req, res) => {
  const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });
  if (!page || page.status !== "published") { res.status(404).json({ error: "Not found" }); return; }
  res.json(page);
});

export default router;
