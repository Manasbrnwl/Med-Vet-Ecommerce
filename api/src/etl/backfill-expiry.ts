/**
 * Backfill Product.expiryDate + Product.batchNumber from the WordPress dump.
 *
 * Expiry/batch were never migrated — they live as free text in each variant's
 * `_variation_description` postmeta (plus a few `date_expires` unix timestamps).
 * We stream the 343 MB SQL dump (chunked regex, deduped by meta_id), parse each
 * value, map variant wpId → productId via our own DB, then set each product's
 * expiry to the EARLIEST expiry across its variants (variants are quantity packs
 * of the same stock, so they share a batch — earliest is the safe one to show).
 *
 * Idempotent. Run against whichever DB DATABASE_URL points at:
 *   DATABASE_URL=... npx tsx src/etl/backfill-expiry.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../db.js";
import { parseExpiry, parseBatch } from "./parse-expiry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DUMP = path.resolve(__dirname, "../../../migration/extracted/database.sql");

// tuple: (meta_id, post_id, 'meta_key', 'meta_value') — value may contain \' escapes
const TUPLE = /\((\d+),(\d+),'(_variation_description|date_expires)','((?:[^'\\]|\\.)*)'\)/g;

type Raw = { text: string | null; ts: string | null };

async function extractFromDump(): Promise<Map<number, Raw>> {
  if (!fs.existsSync(DUMP)) throw new Error(`dump not found: ${DUMP}`);
  const byMeta = new Map<number, { postId: number; key: string; val: string }>();
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(DUMP, { encoding: "utf8", highWaterMark: 4 * 1024 * 1024 });
    let carry = "";
    stream.on("data", (chunk: string | Buffer) => {
      const buf = carry + chunk.toString();
      let m: RegExpExecArray | null;
      TUPLE.lastIndex = 0;
      while ((m = TUPLE.exec(buf)) !== null) {
        byMeta.set(+m[1], { postId: +m[2], key: m[3], val: m[4] });
      }
      // keep a tail so a tuple split across the chunk boundary isn't lost
      carry = buf.slice(-2048);
    });
    stream.on("end", () => resolve());
    stream.on("error", reject);
  });

  // fold meta rows → per variant wpId
  const byVariant = new Map<number, Raw>();
  for (const { postId, key, val } of byMeta.values()) {
    const cur = byVariant.get(postId) ?? { text: null, ts: null };
    if (key === "_variation_description") cur.text = val;
    else if (key === "date_expires") cur.ts = val;
    byVariant.set(postId, cur);
  }
  return byVariant;
}

async function main() {
  console.log(`[expiry backfill] reading dump: ${DUMP}`);
  const byVariant = await extractFromDump();
  console.log(`  variant meta rows with expiry/date source: ${byVariant.size}`);

  // parse each variant's expiry + batch
  const parsed = new Map<number, { expiry: Date | null; batch: string | null }>();
  let parsedOk = 0;
  const unparseable: string[] = [];
  for (const [wpId, raw] of byVariant) {
    const expiry = parseExpiry(raw.text) ?? parseExpiry(raw.ts);
    const batch = parseBatch(raw.text);
    if (expiry) parsedOk++;
    else if (raw.text && /expiry/i.test(raw.text) && unparseable.length < 10) unparseable.push(raw.text);
    parsed.set(wpId, { expiry, batch });
  }
  console.log(`  parsed expiry OK: ${parsedOk} / ${byVariant.size}`);
  if (unparseable.length) {
    console.log(`  sample unparseable (${unparseable.length} shown):`);
    unparseable.forEach((u) => console.log(`    · ${u.slice(0, 90)}`));
  }

  // map variant wpId → productId (our DB)
  const wpIds = [...parsed.keys()];
  const variants = await prisma.productVariant.findMany({
    where: { wpId: { in: wpIds } },
    select: { wpId: true, productId: true },
  });
  console.log(`  variants matched in DB: ${variants.length}`);

  // group per product → earliest expiry (+ batch from that variant, fallback any batch)
  const perProduct = new Map<number, { expiry: Date | null; batch: string | null }>();
  for (const v of variants) {
    if (v.wpId == null) continue;
    const p = parsed.get(v.wpId);
    if (!p || (!p.expiry && !p.batch)) continue;
    const cur = perProduct.get(v.productId) ?? { expiry: null, batch: null };
    if (p.expiry && (!cur.expiry || p.expiry < cur.expiry)) {
      cur.expiry = p.expiry;
      if (p.batch) cur.batch = p.batch; // batch of the earliest-expiring variant
    }
    if (!cur.batch && p.batch) cur.batch = p.batch;
    perProduct.set(v.productId, cur);
  }
  console.log(`  products to update: ${perProduct.size}`);

  let updated = 0;
  for (const [productId, { expiry, batch }] of perProduct) {
    await prisma.product.update({
      where: { id: productId },
      data: { expiryDate: expiry, batchNumber: batch },
    });
    updated++;
    if (updated % 100 === 0) console.log(`    …${updated} updated`);
  }
  console.log(`[expiry backfill] done — ${updated} products updated`);

  // quick sanity sample
  const sample = await prisma.product.findMany({
    where: { expiryDate: { not: null } },
    select: { name: true, expiryDate: true, batchNumber: true },
    take: 5,
    orderBy: { expiryDate: "asc" },
  });
  console.log("  earliest-expiry sample:");
  sample.forEach((s) =>
    console.log(`    · ${s.expiryDate?.toISOString().slice(0, 10)}  batch=${s.batchNumber ?? "-"}  ${s.name.slice(0, 40)}`)
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
