/**
 * ETL step 11: backfill product images the main run missed.
 *
 * 02-products.ts only imported attachments whose post_parent = product, so featured
 * images / gallery images stored as unattached media (post_parent 0 or other) were dropped.
 * This step links, per product:
 *   - _thumbnail_id            → primary image
 *   - _product_image_gallery   → gallery images (ordered)
 *   - post_parent=product      → any remaining attachments
 * regardless of post_parent, deduped by attachment id, with exactly one isPrimary.
 *
 * Idempotent (upsert by wpId). Run AFTER the main ETL; then re-run 09 to CDN-rewrite new rows.
 * Run: tsx src/etl/11-images.ts
 */
import { prisma } from "../db.js";
import { rows } from "./db-src.js";

type Attach = { ID: number; guid: string; post_title: string };

async function main(): Promise<void> {
  console.log("=== ETL 11: product image backfill ===");

  const products = await prisma.product.findMany({ select: { id: true, wpId: true } });
  const prodByWp = new Map(products.map((p) => [p.wpId!, p.id]));
  const wpIds = products.map((p) => p.wpId!).filter(Boolean);

  // featured + gallery meta for all products
  const thumbMeta = await rows<{ post_id: number; meta_value: string }>(
    `SELECT post_id, meta_value FROM wp_postmeta WHERE meta_key='_thumbnail_id' AND post_id IN (?) AND meta_value<>''`,
    [wpIds]
  );
  const galleryMeta = await rows<{ post_id: number; meta_value: string }>(
    `SELECT post_id, meta_value FROM wp_postmeta WHERE meta_key='_product_image_gallery' AND post_id IN (?) AND meta_value<>''`,
    [wpIds]
  );
  const parented = await rows<{ ID: number; post_parent: number }>(
    `SELECT ID, post_parent FROM wp_posts WHERE post_type='attachment' AND post_parent IN (?)`,
    [wpIds]
  );

  const thumbOf = new Map(thumbMeta.map((m) => [m.post_id, parseInt(m.meta_value)]));
  const galleryOf = new Map(
    galleryMeta.map((m) => [m.post_id, m.meta_value.split(",").map((s) => parseInt(s.trim())).filter(Boolean)])
  );
  const parentedOf = new Map<number, number[]>();
  for (const a of parented) {
    if (!parentedOf.has(a.post_parent)) parentedOf.set(a.post_parent, []);
    parentedOf.get(a.post_parent)!.push(a.ID);
  }

  // build per-product ordered, deduped attachment list (thumbnail first)
  const wantByProduct = new Map<number, number[]>();
  const allAttachIds = new Set<number>();
  for (const wpId of wpIds) {
    const seen = new Set<number>();
    const list: number[] = [];
    const push = (id?: number) => { if (id && !seen.has(id)) { seen.add(id); list.push(id); allAttachIds.add(id); } };
    push(thumbOf.get(wpId));
    (galleryOf.get(wpId) ?? []).forEach(push);
    (parentedOf.get(wpId) ?? []).forEach(push);
    if (list.length) wantByProduct.set(wpId, list);
  }

  // fetch attachment rows (url + alt) for every referenced id
  const attachRows = allAttachIds.size
    ? await rows<Attach>(
        `SELECT ID, guid, post_title FROM wp_posts WHERE post_type='attachment' AND ID IN (?)`,
        [[...allAttachIds]]
      )
    : [];
  const attachById = new Map(attachRows.map((a) => [a.ID, a]));

  let created = 0, primarySet = 0, productsTouched = 0;
  for (const [wpId, ids] of wantByProduct) {
    const productId = prodByWp.get(wpId)!;
    const thumbId = thumbOf.get(wpId);
    productsTouched++;
    let pos = 0;
    for (const attachId of ids) {
      const a = attachById.get(attachId);
      if (!a) continue; // referenced attachment missing from dump
      const isPrimary = attachId === thumbId || (!thumbId && pos === 0);
      const existing = await prisma.productImage.findFirst({ where: { wpId: attachId } });
      if (existing) {
        await prisma.productImage.update({
          where: { id: existing.id },
          data: { productId, position: pos, isPrimary },
        });
      } else {
        await prisma.productImage.create({
          data: { wpId: attachId, productId, url: a.guid, alt: a.post_title || null, position: pos, isPrimary },
        });
        created++;
      }
      if (isPrimary) primarySet++;
      pos++;
    }
    // ensure only the chosen primary stays primary for this product
    if (thumbId) {
      await prisma.productImage.updateMany({
        where: { productId, wpId: { not: thumbId }, isPrimary: true },
        data: { isPrimary: false },
      });
    }
  }

  const [total, noImg, noPrimary] = await Promise.all([
    prisma.productImage.count(),
    prisma.product.count({ where: { images: { none: {} } } }),
    prisma.product.count({ where: { images: { some: {} }, AND: { images: { none: { isPrimary: true } } } } }),
  ]);
  console.log(`    products touched: ${productsTouched}, images created: ${created}, primaries set: ${primarySet}`);
  console.log({ totalImages: total, productsWithNoImage: noImg, productsWithImagesButNoPrimary: noPrimary });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await import("./db-src.js").then((m) => m.closeSrc()); await prisma.$disconnect(); });
