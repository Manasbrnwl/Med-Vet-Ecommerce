/** ETL step 7: product reviews (wp_comments + wp_commentmeta) */
import { prisma } from "../db.js";
import { rows } from "./db-src.js";

type ReviewRow = {
  comment_ID: number;
  comment_post_ID: number;
  user_id: number;
  comment_author: string;
  comment_content: string;
  comment_approved: string;
  comment_date: string;
  rating: string | null;
};

export async function migrateReviews(): Promise<void> {
  console.log("  [7] reviews...");

  const reviews = await rows<ReviewRow>(`
    SELECT c.comment_ID, c.comment_post_ID, c.user_id, c.comment_author,
           c.comment_content, c.comment_approved, c.comment_date,
           cm.meta_value AS rating
    FROM wp_comments c
    JOIN wp_posts p ON c.comment_post_ID = p.ID AND p.post_type = 'product'
    LEFT JOIN wp_commentmeta cm ON c.comment_ID = cm.comment_id AND cm.meta_key = 'rating'
    WHERE c.comment_approved = '1'
  `);

  let count = 0;
  for (const r of reviews) {
    const product = await prisma.product.findFirst({ where: { wpId: r.comment_post_ID }, select: { id: true } });
    if (!product) continue;
    const user = r.user_id
      ? await prisma.user.findFirst({ where: { wpId: r.user_id }, select: { id: true } })
      : null;
    const existing = await prisma.review.findFirst({ where: { wpId: r.comment_ID } });
    if (!existing) {
      await prisma.review.create({
        data: {
          wpId: r.comment_ID,
          productId: product.id,
          userId: user?.id ?? null,
          authorName: r.comment_author || null,
          rating: r.rating ? parseInt(r.rating) : null,
          content: r.comment_content || null,
          approved: true,
          createdAt: new Date(r.comment_date),
        },
      });
      count++;
    }
  }
  console.log(`    reviews: ${count}`);
}
