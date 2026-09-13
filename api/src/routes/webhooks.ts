import { Router } from "express";
import { prisma } from "../db.js";
import { verifyWooSignature } from "../lib/woo-webhook.js";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const router = Router();

// ── WooCommerce → app field mappings (REST API uses lowercase strings) ────────
const TYPE_MAP: Record<string, string> = { simple: "SIMPLE", variable: "VARIABLE", grouped: "GROUPED", external: "EXTERNAL" };
const STOCK_MAP: Record<string, string> = { instock: "IN_STOCK", outofstock: "OUT_OF_STOCK", onbackorder: "ON_BACKORDER" };
const STATUS_MAP: Record<string, string> = { publish: "PUBLISHED", draft: "DRAFT", pending: "DRAFT", private: "PRIVATE", trash: "TRASH" };

function slugify(text: string): string {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/-+/g, "-");
}

/** WooCommerce sends numeric fields as strings (or "" when unset) — normalize to number|null. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface WooTerm { id: number; name: string; slug: string }
interface WooImage { id?: number; src: string; name?: string; alt?: string }
interface WooVariationAttribute { name: string; slug?: string; option: string }
interface WooVariation {
  id: number; sku?: string; price?: string; regular_price?: string; sale_price?: string;
  manage_stock?: boolean; stock_quantity?: number | null; stock_status?: string; weight?: string;
  image?: { src?: string }; attributes?: WooVariationAttribute[];
}
interface WooProduct {
  id: number; name: string; slug?: string; type?: string; status?: string; sku?: string;
  description?: string; short_description?: string;
  price?: string; regular_price?: string; sale_price?: string;
  manage_stock?: boolean; stock_quantity?: number | null; stock_status?: string;
  tax_status?: string; tax_class?: string; weight?: string;
  dimensions?: { length?: string; width?: string; height?: string };
  featured?: boolean; total_sales?: string; external_url?: string;
  categories?: WooTerm[]; tags?: WooTerm[]; brands?: WooTerm[];
  images?: WooImage[]; variations?: number[];
}

async function resolveCategories(terms: WooTerm[] = []): Promise<{ id: number }[]> {
  const out: { id: number }[] = [];
  for (const t of terms) {
    let row = await prisma.category.findUnique({ where: { wpId: t.id } });
    if (!row) {
      let slug = t.slug || slugify(t.name);
      if (await prisma.category.findUnique({ where: { slug } })) slug = `${slug}-${t.id}`;
      row = await prisma.category.create({ data: { wpId: t.id, name: t.name, slug } });
    }
    out.push({ id: row.id });
  }
  return out;
}

async function resolveTags(terms: WooTerm[] = []): Promise<{ id: number }[]> {
  const out: { id: number }[] = [];
  for (const t of terms) {
    let row = await prisma.tag.findUnique({ where: { wpId: t.id } });
    if (!row) {
      let slug = t.slug || slugify(t.name);
      if (await prisma.tag.findUnique({ where: { slug } })) slug = `${slug}-${t.id}`;
      row = await prisma.tag.create({ data: { wpId: t.id, name: t.name, slug } });
    }
    out.push({ id: row.id });
  }
  return out;
}

// Brand isn't part of the core WooCommerce REST product schema — only present when a
// brand plugin (e.g. Perfect Brands) exposes it. Absent => leave the product's existing brand untouched.
async function resolveBrandId(terms?: WooTerm[]): Promise<number | null | undefined> {
  const t = terms?.[0];
  if (!t) return undefined;
  let row = await prisma.brand.findUnique({ where: { wpId: t.id } });
  if (!row) {
    let slug = t.slug || slugify(t.name);
    if (await prisma.brand.findUnique({ where: { slug } })) slug = `${slug}-${t.id}`;
    row = await prisma.brand.create({ data: { wpId: t.id, name: t.name, slug } });
  }
  return row.id;
}

async function syncImages(productId: number, images: WooImage[] = []): Promise<void> {
  const existing = await prisma.productImage.findMany({ where: { productId } });
  const incomingIds = new Set(images.map((i) => i.id).filter((id): id is number => !!id));
  for (const img of existing) {
    if (img.wpId && !incomingIds.has(img.wpId)) await prisma.productImage.delete({ where: { id: img.id } });
  }
  for (let position = 0; position < images.length; position++) {
    const src = images[position];
    if (!src.id) continue; // no WP attachment id — can't dedupe reliably across deliveries
    const match = existing.find((e) => e.wpId === src.id);
    const data = { url: src.src, alt: src.alt || src.name || null, position, isPrimary: position === 0 };
    if (match) await prisma.productImage.update({ where: { id: match.id }, data });
    else await prisma.productImage.create({ data: { ...data, wpId: src.id, productId } });
  }
}

// Variation data isn't inlined in the product webhook payload (WooCommerce only sends
// variation ids) — pull each one from the WooCommerce REST API when credentials are configured.
const WC_API_URL = process.env.WC_API_URL?.replace(/\/$/, "");
const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;
const wcRestEnabled = !!(WC_API_URL && WC_CONSUMER_KEY && WC_CONSUMER_SECRET);

async function syncVariants(productId: number, wpProductId: number, variationIds: number[] = []): Promise<void> {
  if (!variationIds.length) return;
  if (!wcRestEnabled) {
    await prisma.productVariant.deleteMany({ where: { productId, wpId: { notIn: variationIds } } });
    return;
  }

  const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString("base64");
  for (const variationId of variationIds) {
    const res = await fetch(`${WC_API_URL}/products/${wpProductId}/variations/${variationId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) continue;
    const v = (await res.json()) as WooVariation;

    const variant = await prisma.productVariant.upsert({
      where: { wpId: v.id },
      update: {
        productId,
        sku: v.sku || null,
        price: num(v.price), regularPrice: num(v.regular_price), salePrice: num(v.sale_price),
        manageStock: !!v.manage_stock,
        stockQuantity: v.stock_quantity ?? null,
        stockStatus: (STOCK_MAP[v.stock_status ?? "instock"] ?? "IN_STOCK") as never,
        weight: num(v.weight),
        imageUrl: v.image?.src ?? null,
      },
      create: {
        wpId: v.id,
        productId,
        sku: v.sku || null,
        price: num(v.price), regularPrice: num(v.regular_price), salePrice: num(v.sale_price),
        manageStock: !!v.manage_stock,
        stockQuantity: v.stock_quantity ?? null,
        stockStatus: (STOCK_MAP[v.stock_status ?? "instock"] ?? "IN_STOCK") as never,
        weight: num(v.weight),
        imageUrl: v.image?.src ?? null,
      },
    });

    for (const attr of v.attributes ?? []) {
      if (!attr.option) continue;
      const rawSlug = attr.slug || slugify(attr.name);
      const attrSlug = rawSlug.startsWith("pa_") ? rawSlug : `pa_${rawSlug}`;

      let attribute = await prisma.attribute.findUnique({ where: { slug: attrSlug } });
      if (!attribute) {
        attribute = await prisma.attribute.create({ data: { name: attr.name, label: attr.name, slug: attrSlug } });
      }

      const valSlug = slugify(attr.option);
      let value = await prisma.attributeValue.findFirst({ where: { attributeId: attribute.id, slug: valSlug } });
      if (!value) {
        value = await prisma.attributeValue.create({ data: { attributeId: attribute.id, value: attr.option, slug: valSlug } });
      }

      await prisma.variantAttribute.upsert({
        where: { variantId_attributeValueId: { variantId: variant.id, attributeValueId: value.id } },
        update: {},
        create: { variantId: variant.id, attributeValueId: value.id },
      });
    }
  }

  await prisma.productVariant.deleteMany({ where: { productId, wpId: { notIn: variationIds } } });
}

// ── POST /api/webhooks/woocommerce/products ───────────────────────────────────
// Configure one WooCommerce webhook per topic (Product created / updated / deleted /
// restored), all pointing at this same URL — the `X-WC-Webhook-Event` header tells
// them apart. Only "deleted" is special-cased below: WooCommerce sends the full
// product object for created/updated/restored alike (restoring a trashed product
// isn't a delete-type action), so the normal upsert path re-syncs it — including
// `status`, which flips it back out of TRASH — with no extra branch needed.
router.post("/woocommerce/products", async (req, res) => {
  // WooCommerce's one-time connectivity ping (sent right after a webhook is saved) is
  // unsigned by design — body is just `webhook_id=N`, no signature header at all. It
  // carries no product data and triggers no writes, so just acknowledge it.
  if (!req.header("x-wc-webhook-signature") && req.body && "webhook_id" in req.body) {
    res.json({ ok: true, ping: true });
    return;
  }

  if (!verifyWooSignature(req.rawBody, req.header("x-wc-webhook-signature"))) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const event = req.header("x-wc-webhook-event"); // created | updated | deleted | restored
  const payload = req.body as WooProduct;
  if (!payload?.id) { res.status(400).json({ error: "Missing product id" }); return; }

  if (event === "deleted") {
    // Soft-delete, matching the in-app admin product delete (order history references products).
    await prisma.product.updateMany({ where: { wpId: payload.id }, data: { status: "TRASH" } });
    res.json({ ok: true });
    return;
  }

  const [categories, tags, brandId] = await Promise.all([
    resolveCategories(payload.categories),
    resolveTags(payload.tags),
    resolveBrandId(payload.brands),
  ]);

  let slug = payload.slug || slugify(payload.name);
  const slugOwner = await prisma.product.findUnique({ where: { slug }, select: { wpId: true } });
  if (slugOwner && slugOwner.wpId !== payload.id) slug = `${slug}-${payload.id}`;

  const scalars = {
    type: (TYPE_MAP[payload.type ?? "simple"] ?? "SIMPLE") as never,
    status: (STATUS_MAP[payload.status ?? "publish"] ?? "PUBLISHED") as never,
    name: payload.name,
    slug,
    sku: payload.sku || null,
    description: payload.description || null,
    shortDescription: payload.short_description || null,
    price: num(payload.price),
    regularPrice: num(payload.regular_price),
    salePrice: num(payload.sale_price),
    manageStock: !!payload.manage_stock,
    stockQuantity: payload.stock_quantity ?? null,
    stockStatus: (STOCK_MAP[payload.stock_status ?? "instock"] ?? "IN_STOCK") as never,
    taxStatus: payload.tax_status ?? "taxable",
    taxClass: payload.tax_class || null,
    weight: num(payload.weight),
    length: num(payload.dimensions?.length),
    width: num(payload.dimensions?.width),
    height: num(payload.dimensions?.height),
    featured: !!payload.featured,
    totalSales: num(payload.total_sales) ?? 0,
    externalUrl: payload.external_url || null,
    ...(brandId !== undefined ? { brandId } : {}),
  };

  const product = await prisma.product.upsert({
    where: { wpId: payload.id },
    update: { ...scalars, categories: { set: categories }, tags: { set: tags } } as never,
    create: { wpId: payload.id, ...scalars, categories: { connect: categories }, tags: { connect: tags } } as never,
  });

  await syncImages(product.id, payload.images);
  if (payload.type === "variable") await syncVariants(product.id, payload.id, payload.variations);

  res.json({ ok: true, productId: product.id });
});

export default router;
