import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

const SITE_URL = (process.env.SITE_URL ?? "https://vetmedagri.net").replace(/\/$/, "");

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function url(loc: string, lastmod?: Date | string | null, priority = "0.5") {
  const mod = lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : "";
  return `  <url>\n    <loc>${xmlEscape(SITE_URL + loc)}</loc>${mod}\n    <priority>${priority}</priority>\n  </url>`;
}

// GET /sitemap.xml
router.get("/sitemap.xml", async (_req, res) => {
  const [products, categories, pages] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({
      select: { slug: true },
    }),
    prisma.page.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const entries = [
    url("/", null, "1.0"),
    url("/shop", null, "0.9"),
    ...products.map((p) => url(`/product/${p.slug}`, p.updatedAt, "0.8")),
    ...categories.map((c) => url(`/shop?category=${c.slug}`, null, "0.6")),
    ...pages.map((p) => url(`/pages/${p.slug}`, p.updatedAt, "0.5")),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

// GET /robots.txt
router.get("/robots.txt", (_req, res) => {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=86400");
  res.send(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /wp-admin/",
      "",
      `Sitemap: ${SITE_URL}/sitemap.xml`,
    ].join("\n")
  );
});

export default router;
