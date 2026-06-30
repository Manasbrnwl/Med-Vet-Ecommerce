/**
 * ETL step 12: backfill ProductVariant.imageUrl from each variation's _thumbnail_id.
 *
 * WooCommerce variations carry their own featured image (shown when the option is
 * selected). The main ETL never set ProductVariant.imageUrl. This links it, writing the
 * final CDN url directly (host swapped vedmedagri.net → MEDIA_BASE_URL).
 *
 * Idempotent. Run: tsx src/etl/12-variant-images.ts
 */
import { prisma } from "../db.js";
import { rows } from "./db-src.js";

const OLD_BASE = process.env.MEDIA_OLD_BASE ?? "https://vedmedagri.net";
const NEW_BASE = (process.env.MEDIA_BASE_URL ?? "https://vedmedagri.net").replace(/\/$/, "");

function toCdn(url: string): string {
  return url.startsWith(OLD_BASE) ? NEW_BASE + url.slice(OLD_BASE.length) : url;
}

async function main(): Promise<void> {
  console.log("=== ETL 12: variant images ===");
  console.log(`  ${OLD_BASE} -> ${NEW_BASE}`);

  // variation wpId -> thumbnail attachment id
  const thumbs = await rows<{ post_id: number; meta_value: string }>(
    `SELECT post_id, meta_value FROM wp_postmeta
     WHERE meta_key='_thumbnail_id' AND meta_value<>''
       AND post_id IN (SELECT ID FROM wp_posts WHERE post_type='product_variation')`
  );
  const attachIds = [...new Set(thumbs.map((t) => parseInt(t.meta_value)).filter(Boolean))];
  const attachments = attachIds.length
    ? await rows<{ ID: number; guid: string }>(
        `SELECT ID, guid FROM wp_posts WHERE post_type='attachment' AND ID IN (?)`, [attachIds]
      )
    : [];
  const guidById = new Map(attachments.map((a) => [a.ID, a.guid]));

  const variants = await prisma.productVariant.findMany({ select: { id: true, wpId: true } });
  const variantByWp = new Map(variants.map((v) => [v.wpId!, v.id]));

  let updated = 0, missingFile = 0;
  for (const t of thumbs) {
    const variantId = variantByWp.get(t.post_id);
    const guid = guidById.get(parseInt(t.meta_value));
    if (!variantId || !guid) { if (variantId && !guid) missingFile++; continue; }
    await prisma.productVariant.update({ where: { id: variantId }, data: { imageUrl: toCdn(guid) } });
    updated++;
  }

  const withImg = await prisma.productVariant.count({ where: { imageUrl: { not: null } } });
  console.log(`    variant images set: ${updated} (attachment missing for ${missingFile})`);
  console.log({ variantsWithImage: withImg });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await import("./db-src.js").then((m) => m.closeSrc()); await prisma.$disconnect(); });
