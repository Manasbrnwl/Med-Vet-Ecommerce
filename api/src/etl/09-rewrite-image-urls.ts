/**
 * ETL step 09: rewrite media URLs in Postgres.
 *
 * Replaces old WordPress domain (https://vetmedagri.net) with the new
 * MEDIA_BASE_URL (default: http://localhost:4000) in:
 *   - ProductImage.url
 *   - Brand.imageUrl
 *   - Category.imageUrl
 *
 * Usage:
 *   tsx src/etl/09-rewrite-image-urls.ts [--dry-run]
 */

import { prisma } from "../db.js";

const DRY_RUN   = process.argv.includes("--dry-run");
const OLD_BASE  = process.env.MEDIA_OLD_BASE ?? "https://vedmedagri.net";
const NEW_BASE  = (process.env.MEDIA_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function main() {
  console.log(`Old base : ${OLD_BASE}`);
  console.log(`New base : ${NEW_BASE}`);
  console.log(`Mode     : ${DRY_RUN ? "DRY RUN" : "LIVE UPDATE"}\n`);

  // ProductImage.url
  const imgCount = await prisma.productImage.count({
    where: { url: { startsWith: OLD_BASE } },
  });
  console.log(`  ProductImage.url   — ${imgCount} rows to update`);

  if (!DRY_RUN && imgCount > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "ProductImage" SET "url" = $1 || SUBSTRING("url" FROM LENGTH($2) + 1) WHERE "url" LIKE $3`,
      NEW_BASE,
      OLD_BASE,
      `${OLD_BASE}%`
    );
  }

  // Brand.imageUrl
  const brandCount = await prisma.brand.count({
    where: { imageUrl: { startsWith: OLD_BASE } },
  });
  console.log(`  Brand.imageUrl     — ${brandCount} rows to update`);

  if (!DRY_RUN && brandCount > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Brand" SET "imageUrl" = $1 || SUBSTRING("imageUrl" FROM LENGTH($2) + 1) WHERE "imageUrl" LIKE $3`,
      NEW_BASE,
      OLD_BASE,
      `${OLD_BASE}%`
    );
  }

  // Category.imageUrl
  const catCount = await prisma.category.count({
    where: { imageUrl: { startsWith: OLD_BASE } },
  });
  console.log(`  Category.imageUrl  — ${catCount} rows to update`);

  if (!DRY_RUN && catCount > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Category" SET "imageUrl" = $1 || SUBSTRING("imageUrl" FROM LENGTH($2) + 1) WHERE "imageUrl" LIKE $3`,
      NEW_BASE,
      OLD_BASE,
      `${OLD_BASE}%`
    );
  }

  const total = imgCount + brandCount + catCount;
  console.log(`\n${DRY_RUN ? "[Dry run] Would update" : "Updated"} ${total} rows total.`);
  if (DRY_RUN) console.log("Run without --dry-run to apply.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
