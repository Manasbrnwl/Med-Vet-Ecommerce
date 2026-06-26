/** Main ETL runner: WP MariaDB → Postgres via Prisma. Run: npx tsx src/etl/run.ts */
import "dotenv/config";
import { migrateTaxonomy }  from "./01-taxonomy.js";
import { migrateProducts }  from "./02-products.js";
import { migrateCustomers } from "./03-customers.js";
import { migrateOrders }    from "./04-orders.js";
import { migrateContent }   from "./05-content.js";
import { migrateCoupons }   from "./06-coupons.js";
import { migrateReviews }   from "./07-reviews.js";
import { closeSrc }         from "./db-src.js";
import { prisma }           from "../db.js";

async function main(): Promise<void> {
  console.log("=== VetMedAgri ETL start ===");
  const t0 = Date.now();
  await migrateTaxonomy();
  await migrateProducts();
  await migrateCustomers();
  await migrateOrders();
  await migrateCoupons();
  await migrateContent();
  await migrateReviews();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== Done in ${secs}s ===`);

  // Quick counts
  const [products, variants, orders, users, pages, reviews] = await Promise.all([
    prisma.product.count(), prisma.productVariant.count(), prisma.order.count(),
    prisma.user.count(), prisma.page.count(), prisma.review.count(),
  ]);
  console.log({ products, variants, orders, users, pages, reviews });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await closeSrc(); await prisma.$disconnect(); });
