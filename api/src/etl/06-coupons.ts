/** ETL step 6: coupons */
import { prisma } from "../db.js";
import { rows, fetchMeta } from "./db-src.js";
import { dec } from "./php-unserialize.js";

const COUPON_TYPE: Record<string, string> = {
  percent: "PERCENT", fixed_cart: "FIXED_CART", fixed_product: "FIXED_PRODUCT",
};

export async function migrateCoupons(): Promise<void> {
  console.log("  [6] coupons...");
  const posts = await rows<{ ID: number; post_title: string; post_excerpt: string }>(
    `SELECT ID, post_title, post_excerpt FROM wp_posts WHERE post_type='shop_coupon'`
  );
  const meta = await fetchMeta(posts.map((p) => p.ID));
  for (const p of posts) {
    const m = meta.get(p.ID) ?? {};
    const expiry = m.expiry_date || m.date_expires ? new Date(m.expiry_date || parseInt(m.date_expires!) * 1000) : null;
    const code = p.post_title.toLowerCase();
    await prisma.coupon.upsert({
      where: { code },
      update: { wpId: p.ID },
      create: {
        wpId: p.ID, code,
        type: (COUPON_TYPE[m.discount_type ?? "fixed_cart"] ?? "FIXED_CART") as never,
        amount: dec(m.coupon_amount),
        description: p.post_excerpt || null,
        freeShipping: m.free_shipping === "yes",
        minSpend: m.minimum_amount ? dec(m.minimum_amount) : null,
        maxSpend: m.maximum_amount ? dec(m.maximum_amount) : null,
        usageLimit: m.usage_limit ? parseInt(m.usage_limit) : null,
        usageCount: parseInt(m.usage_count ?? "0"),
        expiresAt: expiry,
      },
    });
  }
  console.log(`    coupons: ${posts.length}`);
}
