/** ETL step 5: pages, posts, redirects, nav menus, form submissions */
import { prisma } from "../db.js";
import { rows, fetchMeta } from "./db-src.js";
import { tryUnserialize } from "./php-unserialize.js";
import { STRIP_DIVI } from "./config.js";

export async function migrateContent(): Promise<void> {
  console.log("  [5] content...");

  // Pages
  const pages = await rows<{ ID: number; post_title: string; post_name: string; post_status: string; post_content: string }>(
    `SELECT ID, post_title, post_name, post_status, post_content FROM wp_posts WHERE post_type='page' AND post_status != 'auto-draft'`
  );
  const pageMeta = await fetchMeta(pages.map((p) => p.ID));
  for (const p of pages) {
    const m = pageMeta.get(p.ID) ?? {};
    const slug = p.post_name || `page-${p.ID}`;
    await prisma.page.upsert({
      where: { wpId: p.ID },
      update: {},
      create: {
        wpId: p.ID, title: p.post_title, slug,
        content: STRIP_DIVI(p.post_content),
        status: p.post_status === "publish" ? "published" : "draft",
        seoTitle: m._yoast_wpseo_title || null,
        seoDesc: m._yoast_wpseo_metadesc || null,
      },
    });
  }
  console.log(`    pages: ${pages.length}`);

  // Posts
  const posts = await rows<{ ID: number; post_title: string; post_name: string; post_status: string; post_content: string; post_excerpt: string; post_date: string }>(
    `SELECT ID, post_title, post_name, post_status, post_content, post_excerpt, post_date FROM wp_posts WHERE post_type='post' AND post_status != 'auto-draft'`
  );
  for (const p of posts) {
    await prisma.post.upsert({
      where: { wpId: p.ID },
      update: {},
      create: {
        wpId: p.ID, title: p.post_title, slug: p.post_name || `post-${p.ID}`,
        content: STRIP_DIVI(p.post_content), excerpt: p.post_excerpt || null,
        status: p.post_status === "publish" ? "published" : "draft",
        publishedAt: new Date(p.post_date),
      },
    });
  }
  console.log(`    posts: ${posts.length}`);

  // Redirections
  const redirects = await rows<{ source: string; url: string; action_code: number }>(
    `SELECT url AS source, action_data AS url, action_code FROM wp_redirection_items WHERE status='enabled'`
  );
  for (const r of redirects) {
    if (!r.source || !r.url) continue;
    await prisma.redirect.upsert({
      where: { source: r.source },
      update: { target: r.url, code: r.action_code || 301 },
      create: { source: r.source, target: r.url, code: r.action_code || 301 },
    });
  }
  console.log(`    redirects: ${redirects.length}`);

  // Nav menus
  const menuTerms = await rows<{ term_id: number; name: string; slug: string }>(
    `SELECT t.term_id, t.name, t.slug FROM wp_terms t
     JOIN wp_term_taxonomy tt ON t.term_id=tt.term_id WHERE tt.taxonomy='nav_menu'`
  );
  for (const menu of menuTerms) {
    const nav = await prisma.navigationMenu.upsert({
      where: { wpId: menu.term_id },
      update: {},
      create: { wpId: menu.term_id, name: menu.name, slug: menu.slug },
    });

    const menuItems = await rows<{ ID: number; post_title: string; menu_order: number }>(
      `SELECT p.ID, p.post_title, p.menu_order FROM wp_posts p
       JOIN wp_term_relationships tr ON p.ID=tr.object_id
       JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id=tt.term_taxonomy_id
       WHERE tt.term_id=? AND p.post_type='nav_menu_item' ORDER BY p.menu_order`, [menu.term_id]
    );
    const itemIds = menuItems.map((i) => i.ID);
    const itemMeta = await fetchMeta(itemIds);

    for (const item of menuItems) {
      const m = itemMeta.get(item.ID) ?? {};
      const existing = await prisma.navigationMenuItem.findFirst({ where: { wpId: item.ID } });
      if (!existing) {
        await prisma.navigationMenuItem.create({
          data: {
            wpId: item.ID, menuId: nav.id,
            label: m._menu_item_title || item.post_title || "",
            url: m._menu_item_url || m._menu_item_object_id || "#",
            position: item.menu_order,
          },
        });
      }
    }
  }
  console.log(`    nav menus: ${menuTerms.length}`);

  // Form submissions (CFDB7)
  const forms = await rows<{ id: number; form_name: string; your_name: string; data: string; created_at: string }>(
    `SELECT id, form_name, your_name, data, created_at FROM wp_db7_forms`
  ).catch(() => []);
  for (const f of forms) {
    await prisma.formSubmission.upsert({
      where: { wpId: f.id },
      update: {},
      create: {
        wpId: f.id, formName: f.form_name,
        payload: { raw: tryUnserialize(f.data) as string | null, name: f.your_name },
        createdAt: new Date(f.created_at),
      },
    });
  }
  console.log(`    form submissions: ${forms.length}`);
}
