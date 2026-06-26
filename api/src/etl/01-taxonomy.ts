/** ETL step 1: brands, categories, tags, attributes, attribute values */
import { prisma } from "../db.js";
import { rows } from "./db-src.js";

type Term = { term_id: number; name: string; slug: string; description: string; parent: number; count: number; taxonomy: string; meta_value?: string };

async function getTerms(taxonomy: string): Promise<Term[]> {
  return rows<Term>(`
    SELECT t.term_id, t.name, t.slug, tt.description, tt.parent, tt.count, tt.taxonomy,
           tm.meta_value
    FROM wp_terms t
    JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
    LEFT JOIN wp_termmeta tm ON t.term_id = tm.term_id AND tm.meta_key = 'thumbnail_id'
    WHERE tt.taxonomy = ?
  `, [taxonomy]);
}

export async function migrateTaxonomy(): Promise<void> {
  console.log("  [1] taxonomy...");

  // Brands (pwb-brand)
  const brands = await getTerms("pwb-brand");
  for (const b of brands) {
    await prisma.brand.upsert({
      where: { wpId: b.term_id },
      update: { name: b.name, slug: b.slug, description: b.description || null },
      create: { wpId: b.term_id, name: b.name, slug: b.slug, description: b.description || null },
    });
  }
  console.log(`    brands: ${brands.length}`);

  // Categories — two-pass for parent FK
  const cats = await getTerms("product_cat");
  for (const c of cats) {
    await prisma.category.upsert({
      where: { wpId: c.term_id },
      update: { name: c.name, slug: c.slug, description: c.description || null },
      create: { wpId: c.term_id, name: c.name, slug: c.slug, description: c.description || null },
    });
  }
  for (const c of cats.filter((x) => x.parent)) {
    const parent = await prisma.category.findFirst({ where: { wpId: c.parent }, select: { id: true } });
    if (parent) await prisma.category.update({ where: { wpId: c.term_id }, data: { parentId: parent.id } });
  }
  console.log(`    categories: ${cats.length}`);

  // Tags
  const tags = await getTerms("product_tag");
  for (const g of tags) {
    await prisma.tag.upsert({
      where: { wpId: g.term_id },
      update: { name: g.name, slug: g.slug },
      create: { wpId: g.term_id, name: g.name, slug: g.slug },
    });
  }
  console.log(`    tags: ${tags.length}`);

  // Attributes (global WC attributes)
  const attrs = await rows<{ attribute_id: number; attribute_name: string; attribute_label: string }>(
    `SELECT attribute_id, attribute_name, attribute_label FROM wp_woocommerce_attribute_taxonomies`
  );
  for (const a of attrs) {
    await prisma.attribute.upsert({
      where: { slug: `pa_${a.attribute_name}` },
      update: { label: a.attribute_label },
      create: { wpId: a.attribute_id, name: a.attribute_name, label: a.attribute_label, slug: `pa_${a.attribute_name}` },
    });
  }

  // Attribute values (terms of pa_* taxonomies)
  for (const a of attrs) {
    const taxonomy = `pa_${a.attribute_name}`;
    const vals = await getTerms(taxonomy);
    const attr = await prisma.attribute.findUnique({ where: { slug: taxonomy } });
    if (!attr) continue;
    for (const v of vals) {
      await prisma.attributeValue.upsert({
        where: { wpId: v.term_id },
        update: { value: v.name, slug: v.slug },
        create: { wpId: v.term_id, attributeId: attr.id, value: v.name, slug: v.slug },
      });
    }
    console.log(`    attr ${taxonomy}: ${vals.length} values`);
  }
}
