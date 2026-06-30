/**
 * ETL step 10: backfill the gaps the main run left empty.
 *   - TaxRate              ← wp_woocommerce_tax_rates
 *   - ShippingZone/Method  ← wp_woocommerce_shipping_zones (+ zone 0) / _zone_methods / _zone_locations / wp_options
 *   - FormSubmission       ← wp_db7_forms (correct columns: form_id/form_post_id/form_value/form_date)
 *   - Product.description  ← re-clean wp_posts.post_content (keep text/HTML, drop shortcodes)
 *   - ProductAttribute     ← product ↔ pa_* term relationships
 *
 * Idempotent. Run: tsx src/etl/10-gaps.ts
 */
import { prisma } from "../db.js";
import { rows } from "./db-src.js";
import { tryUnserialize, dec } from "./php-unserialize.js";

/** Strip shortcodes + block/html comments but KEEP real text/HTML. */
function cleanDesc(html: string | null): string | null {
  if (!html) return null;
  const s = html
    .replace(/\[\/?[^\]]+\]/g, "")        // all [shortcodes]
    .replace(/<!--[\s\S]*?-->/g, "")      // html / wp-block comments
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s || null;
}

async function migrateTaxRates(): Promise<void> {
  const r = await rows<{
    tax_rate_id: number; tax_rate_country: string; tax_rate_state: string;
    tax_rate: string; tax_rate_name: string; tax_rate_class: string; tax_rate_priority: number;
  }>(`SELECT tax_rate_id, tax_rate_country, tax_rate_state, tax_rate, tax_rate_name, tax_rate_class, tax_rate_priority FROM wp_woocommerce_tax_rates`);
  await prisma.taxRate.deleteMany({});
  for (const t of r) {
    await prisma.taxRate.create({
      data: {
        wpId: t.tax_rate_id,
        country: t.tax_rate_country || null,
        state: t.tax_rate_state || null,
        rate: dec(t.tax_rate),
        name: t.tax_rate_name || null,
        taxClass: t.tax_rate_class || "standard",
        priority: t.tax_rate_priority || 1,
      },
    });
  }
  console.log(`    tax rates: ${r.length}`);
}

async function migrateShipping(): Promise<void> {
  const zones = await rows<{ zone_id: number; zone_name: string }>(
    `SELECT zone_id, zone_name FROM wp_woocommerce_shipping_zones`
  );
  // WooCommerce's implicit catch-all zone 0
  const allZones = [...zones, { zone_id: 0, zone_name: "Rest of the World" }];

  const locs = await rows<{ zone_id: number; location_code: string; location_type: string }>(
    `SELECT zone_id, location_code, location_type FROM wp_woocommerce_shipping_zone_locations`
  );
  const methods = await rows<{ zone_id: number; instance_id: number; method_id: string; is_enabled: number }>(
    `SELECT zone_id, instance_id, method_id, is_enabled FROM wp_woocommerce_shipping_zone_methods`
  );
  // method title/cost live in wp_options as woocommerce_<method_id>_<instance_id>_settings
  const optNames = methods.map((m) => `woocommerce_${m.method_id}_${m.instance_id}_settings`);
  const opts = optNames.length
    ? await rows<{ option_name: string; option_value: string }>(
        `SELECT option_name, option_value FROM wp_options WHERE option_name IN (?)`, [optNames]
      )
    : [];
  const optMap = new Map(opts.map((o) => [o.option_name, tryUnserialize(o.option_value) as Record<string, string>]));

  await prisma.shippingMethod.deleteMany({});
  await prisma.shippingZone.deleteMany({});

  for (const z of allZones) {
    const regions = locs.filter((l) => l.zone_id === z.zone_id).map((l) => ({ type: l.location_type, code: l.location_code }));
    const zone = await prisma.shippingZone.create({
      data: { wpId: z.zone_id, name: z.zone_name, regions: regions.length ? regions : undefined },
    });
    const zoneMethods = methods.filter((m) => m.zone_id === z.zone_id);
    for (const m of zoneMethods) {
      const o = optMap.get(`woocommerce_${m.method_id}_${m.instance_id}_settings`) ?? {};
      await prisma.shippingMethod.create({
        data: {
          wpId: m.instance_id,
          zoneId: zone.id,
          type: m.method_id,
          title: o.title || m.method_id,
          cost: o.cost ? dec(o.cost) : null,
          enabled: m.is_enabled === 1,
        },
      });
    }
  }
  console.log(`    shipping zones: ${allZones.length}, methods: ${methods.length}`);
}

async function migrateForms(): Promise<void> {
  const forms = await rows<{ form_id: number; form_post_id: number; form_value: string; form_date: string }>(
    `SELECT form_id, form_post_id, form_value, form_date FROM wp_db7_forms`
  );
  await prisma.formSubmission.deleteMany({});
  const data = forms.map((f) => {
    const v = tryUnserialize(f.form_value) as Record<string, unknown> | string | null;
    const d = new Date(f.form_date);
    return {
      wpId: f.form_id,
      formName: `form-${f.form_post_id}`,
      payload: (v && typeof v === "object" ? v : { raw: v }) as object,
      createdAt: isNaN(d.getTime()) ? new Date(0) : d,
    };
  });
  // batched insert
  for (let i = 0; i < data.length; i += 500) {
    await prisma.formSubmission.createMany({ data: data.slice(i, i + 500), skipDuplicates: true });
  }
  console.log(`    form submissions: ${data.length}`);
}

async function backfillDescriptions(): Promise<void> {
  const prods = await rows<{ ID: number; post_content: string }>(
    `SELECT ID, post_content FROM wp_posts WHERE post_type='product' AND post_content IS NOT NULL AND post_content<>''`
  );
  let updated = 0;
  for (const p of prods) {
    const desc = cleanDesc(p.post_content);
    if (!desc) continue;
    const res = await prisma.product.updateMany({ where: { wpId: p.ID }, data: { description: desc } });
    updated += res.count;
  }
  console.log(`    product descriptions backfilled: ${updated}`);
}

async function migrateProductAttributes(): Promise<void> {
  // product ↔ pa_* terms → ProductAttribute(productId, attributeValueId)
  const rels = await rows<{ object_id: number; term_id: number }>(
    `SELECT tr.object_id, tt.term_id
       FROM wp_term_relationships tr
       JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
       JOIN wp_posts p ON p.ID = tr.object_id
      WHERE p.post_type='product' AND tt.taxonomy LIKE 'pa\\_%'`
  );
  const prodMap = new Map((await prisma.product.findMany({ select: { id: true, wpId: true } })).map((p) => [p.wpId, p.id]));
  const avMap = new Map((await prisma.attributeValue.findMany({ select: { id: true, wpId: true } })).map((a) => [a.wpId, a.id]));

  const data: { productId: number; attributeValueId: number }[] = [];
  for (const r of rels) {
    const productId = prodMap.get(r.object_id);
    const attributeValueId = avMap.get(r.term_id);
    if (productId && attributeValueId) data.push({ productId, attributeValueId });
  }
  await prisma.productAttribute.deleteMany({});
  for (let i = 0; i < data.length; i += 500) {
    await prisma.productAttribute.createMany({ data: data.slice(i, i + 500), skipDuplicates: true });
  }
  console.log(`    product attributes: ${data.length}`);
}

async function main(): Promise<void> {
  console.log("=== ETL gaps backfill ===");
  await migrateTaxRates();
  await migrateShipping();
  await migrateForms();
  await backfillDescriptions();
  await migrateProductAttributes();
  const [tax, zones, methods, forms, attrs, desc] = await Promise.all([
    prisma.taxRate.count(), prisma.shippingZone.count(), prisma.shippingMethod.count(),
    prisma.formSubmission.count(), prisma.productAttribute.count(),
    prisma.product.count({ where: { description: { not: null } } }),
  ]);
  console.log({ tax, zones, methods, forms, attrs, productsWithDesc: desc });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await import("./db-src.js").then((m) => m.closeSrc()); await prisma.$disconnect(); });
