/** ETL step 2: products, variants, images, attributes */
import { prisma } from "../db.js";
import { rows, fetchMeta } from "./db-src.js";
import { dec } from "./php-unserialize.js";
import { STRIP_DIVI } from "./config.js";

type WPPost = { ID: number; post_title: string; post_name: string; post_status: string; post_content: string; post_excerpt: string };

const TYPE_MAP: Record<string, string> = {
  simple: "SIMPLE", variable: "VARIABLE", grouped: "GROUPED", external: "EXTERNAL",
};
const STOCK_MAP: Record<string, string> = {
  instock: "IN_STOCK", outofstock: "OUT_OF_STOCK", onbackorder: "ON_BACKORDER",
};
const STATUS_MAP: Record<string, string> = {
  publish: "PUBLISHED", draft: "DRAFT", private: "PRIVATE", trash: "TRASH",
};

async function getProductType(postId: number): Promise<string> {
  const r = await rows<{ name: string }>(
    `SELECT t.name FROM wp_terms t JOIN wp_term_taxonomy tt ON t.term_id=tt.term_id
     JOIN wp_term_relationships tr ON tt.term_taxonomy_id=tr.term_taxonomy_id
     WHERE tr.object_id=? AND tt.taxonomy='product_type' LIMIT 1`, [postId]
  );
  return TYPE_MAP[r[0]?.name ?? "simple"] ?? "SIMPLE";
}

export async function migrateProducts(): Promise<void> {
  console.log("  [2] products...");

  const products = await rows<WPPost>(
    `SELECT ID, post_title, post_name, post_status, post_content, post_excerpt
     FROM wp_posts WHERE post_type='product' AND post_status != 'auto-draft'`
  );
  const ids = products.map((p) => p.ID);
  const meta = await fetchMeta(ids);

  for (const p of products) {
    const m = meta.get(p.ID) ?? {};
    const type = await getProductType(p.ID);
    const brandTerm = await rows<{ t: number }>(
      `SELECT t.term_id AS t FROM wp_terms t JOIN wp_term_taxonomy tt ON t.term_id=tt.term_id
       JOIN wp_term_relationships tr ON tt.term_taxonomy_id=tr.term_taxonomy_id
       WHERE tr.object_id=? AND tt.taxonomy='pwb-brand' LIMIT 1`, [p.ID]
    );
    const brand = brandTerm[0] ? await prisma.brand.findFirst({ where: { wpId: brandTerm[0].t }, select: { id: true } }) : null;

    const catTerms = await rows<{ term_id: number }>(
      `SELECT t.term_id FROM wp_terms t JOIN wp_term_taxonomy tt ON t.term_id=tt.term_id
       JOIN wp_term_relationships tr ON tt.term_taxonomy_id=tr.term_taxonomy_id
       WHERE tr.object_id=? AND tt.taxonomy='product_cat'`, [p.ID]
    );
    const tagTerms = await rows<{ term_id: number }>(
      `SELECT t.term_id FROM wp_terms t JOIN wp_term_taxonomy tt ON t.term_id=tt.term_id
       JOIN wp_term_relationships tr ON tt.term_taxonomy_id=tr.term_taxonomy_id
       WHERE tr.object_id=? AND tt.taxonomy='product_tag'`, [p.ID]
    );
    const cats = await prisma.category.findMany({ where: { wpId: { in: catTerms.map((x) => x.term_id) } } });
    const tags = await prisma.tag.findMany({ where: { wpId: { in: tagTerms.map((x) => x.term_id) } } });

    let slug = p.post_name || `product-${p.ID}`;

    await prisma.product.upsert({
      where: { wpId: p.ID },
      update: {},
      create: {
        wpId: p.ID,
        type: type as never,
        status: (STATUS_MAP[p.post_status] ?? "DRAFT") as never,
        name: p.post_title,
        slug,
        sku: m._sku || null,
        description: STRIP_DIVI(p.post_content),
        shortDescription: STRIP_DIVI(p.post_excerpt),
        price: m._price ? dec(m._price) : null,
        regularPrice: m._regular_price ? dec(m._regular_price) : null,
        salePrice: m._sale_price ? dec(m._sale_price) : null,
        manageStock: m._manage_stock === "yes",
        stockQuantity: m._stock ? parseInt(m._stock) : null,
        stockStatus: (STOCK_MAP[m._stock_status ?? "instock"] ?? "IN_STOCK") as never,
        taxStatus: m._tax_status ?? "taxable",
        taxClass: m._tax_class || null,
        weight: m._weight ? dec(m._weight) : null,
        length: m._length ? dec(m._length) : null,
        width: m._width ? dec(m._width) : null,
        height: m._height ? dec(m._height) : null,
        featured: m._featured === "yes",
        totalSales: m.total_sales ? parseInt(m.total_sales) : 0,
        externalUrl: m._product_url || null,
        brandId: brand?.id ?? null,
        categories: { connect: cats.map((c) => ({ id: c.id })) },
        tags: { connect: tags.map((t) => ({ id: t.id })) },
      },
    });
  }
  console.log(`    products: ${products.length}`);

  // Variants
  await migrateVariants();

  // Product images (gallery + thumbnail)
  await migrateProductImages();
}

async function migrateVariants(): Promise<void> {
  const variants = await rows<WPPost>(
    `SELECT ID, post_title, post_name, post_status, post_parent, post_content
     FROM wp_posts WHERE post_type='product_variation' AND post_status != 'auto-draft'`
  ) as (WPPost & { post_parent: number })[];

  const ids = variants.map((v) => v.ID);
  const meta = await fetchMeta(ids);

  for (const v of variants as (WPPost & { post_parent: number })[]) {
    const m = meta.get(v.ID) ?? {};
    const parent = await prisma.product.findFirst({ where: { wpId: v.post_parent }, select: { id: true } });
    if (!parent) continue;

    const variant = await prisma.productVariant.upsert({
      where: { wpId: v.ID },
      update: {},
      create: {
        wpId: v.ID,
        productId: parent.id,
        sku: m._sku || null,
        price: m._price ? dec(m._price) : null,
        regularPrice: m._regular_price ? dec(m._regular_price) : null,
        salePrice: m._sale_price ? dec(m._sale_price) : null,
        manageStock: m._manage_stock === "yes",
        stockQuantity: m._stock ? parseInt(m._stock) : null,
        stockStatus: (STOCK_MAP[m._stock_status ?? "instock"] ?? "IN_STOCK") as never,
        weight: m._weight ? dec(m._weight) : null,
      },
    });

    // Variation attribute values: meta keys like `attribute_pa_select-options` or `attribute_quantity`
    for (const [key, val] of Object.entries(m)) {
      if (!key.startsWith("attribute_") || !val) continue;

      const rawName = key.replace("attribute_pa_", "").replace("attribute_", "");
      let attrSlug = rawName;
      if (!attrSlug.startsWith("pa_")) {
        attrSlug = "pa_" + attrSlug;
      }

      // Find or create attribute dynamically
      let attr = await prisma.attribute.findUnique({ where: { slug: attrSlug } });
      if (!attr) {
        const label = rawName.split(/[_-]+/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
        attr = await prisma.attribute.create({
          data: {
            name: rawName,
            label: label,
            slug: attrSlug,
          }
        });
      }

      // Find or create attribute value dynamically
      const valSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      let av = await prisma.attributeValue.findFirst({
        where: {
          attributeId: attr.id,
          slug: valSlug,
        }
      });
      if (!av) {
        av = await prisma.attributeValue.create({
          data: {
            attributeId: attr.id,
            value: val,
            slug: valSlug,
          }
        });
      }

      await prisma.variantAttribute.upsert({
        where: { variantId_attributeValueId: { variantId: variant.id, attributeValueId: av.id } },
        update: {},
        create: { variantId: variant.id, attributeValueId: av.id },
      });
    }
  }
  console.log(`    variants: ${variants.length}`);
}

async function migrateProductImages(): Promise<void> {
  const attachments = await rows<{ ID: number; post_parent: number; guid: string; post_title: string }>(
    `SELECT ID, post_parent, guid, post_title FROM wp_posts
     WHERE post_type='attachment' AND post_parent IN (SELECT ID FROM wp_posts WHERE post_type='product')`
  );
  for (const a of attachments) {
    const product = await prisma.product.findFirst({ where: { wpId: a.post_parent }, select: { id: true } });
    if (!product) continue;
    const existing = await prisma.productImage.findFirst({ where: { wpId: a.ID } });
    if (!existing) {
      await prisma.productImage.create({
        data: { wpId: a.ID, productId: product.id, url: a.guid, alt: a.post_title || null },
      });
    }
  }
  // Set isPrimary = thumbnail attachment
  const thumbRows = await rows<{ post_id: number; meta_value: string }>(
    `SELECT post_id, meta_value FROM wp_postmeta WHERE meta_key='_thumbnail_id'
     AND post_id IN (SELECT ID FROM wp_posts WHERE post_type='product')`
  );
  for (const { post_id, meta_value } of thumbRows) {
    const attachId = parseInt(meta_value);
    if (!attachId) continue;
    await prisma.productImage.updateMany({ where: { wpId: attachId }, data: { isPrimary: true } });
  }
  console.log(`    images: ${attachments.length}`);
}
