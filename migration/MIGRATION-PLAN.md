# VetMedAgri — WordPress → Node/React/Postgres Migration Plan

**Source:** `vedmedagri.net` (All-in-One WP Migration export, 2026-06-25)
**Target stack:** React + Node/Express + PostgreSQL + TypeScript
**Strategy:** Full rewrite (clean break). This is an **e-commerce application**, not a content site.

---

## 1. What the site actually is

A **WooCommerce store** for veterinary / agricultural products, Divi-themed, ~50 plugins.

| Signal | Value |
|---|---|
| Products | **314** (+ **1,477** variations) |
| Orders | **8,121** (legacy `shop_order`, **no HPOS**) |
| Customers / users | **319** |
| Coupons | 42 |
| Content pages | 26 (Divi page-builder) |
| Blog posts | 5 (negligible) |
| Contact-form submissions (CFDB7) | 2,488 |
| Media | 6.49 GB (32k files) — **not yet extracted** |
| DB size | 343 MB, 192 tables |
| Payment gateway | **HitPay** (Singapore/SEA) |
| Table prefix | `wp_` (dump uses `SERVMASK_PREFIX_` placeholder) |

## 2. Decisions on record
- **Content-only** migration for Divi *page layouts*: strip `[et_pb_*]` shortcodes, keep text/images/headings, reskin in React. (Does **not** apply to store data, which migrates faithfully.)
- **Media → local disk** for now; final hosting decided later.

## 3. Data model mapping (WooCommerce/WP → Postgres)

| WordPress source | New Postgres model | Notes |
|---|---|---|
| `posts` type=`product` (314) + `postmeta` | `products` | meta: `_sku`,`_price`,`_regular_price`,`_sale_price`,`_stock`,`_stock_status`,`_weight`, dims, `_virtual`,`_downloadable` |
| `posts` type=`product_variation` (1,477) | `product_variants` | per-variation price/stock/attributes |
| `woocommerce_attribute_taxonomies` (2) + `pa_*` terms | `attributes` / `attribute_values` | variable-product options |
| taxonomies `product_cat`,`product_tag`,`pwb-brand` (`terms`/`term_taxonomy`, 717) | `categories`,`tags`,`brands` | brand = Perfect WC Brands plugin |
| `posts` type=`shop_order` (8,121) + `postmeta` | `orders` | billing/shipping/totals/status in postmeta |
| `woocommerce_order_items` (43k) + `order_itemmeta` (412k) | `order_line_items` | product/qty/price per line |
| `users` (319) + `usermeta` | `users` / `customers` | **passwords are phpass-hashed → force reset on first login** |
| `posts` type=`shop_coupon` (42) | `coupons` | discount rules in postmeta |
| `comments` type=`review` (subset of 26k) | `reviews` | most of 26k is spam — filter by `comment_approved` |
| `posts` type=`page` (26) | `pages` | Divi-stripped content |
| `posts` type=`post` (5) | `posts` | trivial blog |
| `db7_forms` (2,488) | `form_submissions` | CFDB7 serialized payloads |
| `yoast_indexable` (1,005) | SEO columns per entity | meta title/desc/canonical/og |
| `redirection_items` | `redirects` | preserve SEO |
| `nav_menu_item` (126) | `navigation` | header/footer/megamenu |
| `woocommerce_tax_rates` (5), shipping zones/methods | config tables | |

## 4. Plugin → replacement map (this site)

| Plugin(s) | Replacement in new stack |
|---|---|
| WooCommerce core | Custom Express commerce API + Postgres (products, cart, checkout, orders) |
| HitPay gateway | HitPay REST API integration (server-side) — or Stripe |
| ACF Pro | JSON/`jsonb` columns or typed columns in Postgres |
| User Registration suite | Custom auth (JWT + bcrypt) + customer profile fields |
| Yoast SEO | `react-helmet`/Next metadata + generated sitemap |
| Redirection | `redirects` table + Express middleware |
| Contact Form 7 + CFDB7 | React forms + Express endpoint + email (Nodemailer/Resend) |
| WC PDF Invoices | Server-side PDF (pdfkit / puppeteer) |
| Ajax Search for WC | Postgres full-text search (or Meilisearch) |
| Perfect WC Brands | `brands` table |
| Back-in-stock / Abandoned cart (YITH) | Background jobs + email |
| MailPoet | Optional newsletter (defer) |
| RevSlider, WP Megamenu, Divi | Rebuilt React components |
| Solid Security, 2FA, reCAPTCHA, WP Rocket, Perfmatters | helmet/rate-limit/CDN/caching at app+infra layer |

## 5. Migration phases

1. **Phase 1 — Audit** ✅ (this document)
2. **Phase 2 — Schema** — design Prisma schema for the models in §3; review.
3. **Phase 3 — ETL scripts** — parse `database.sql` (or import to a scratch MySQL/MariaDB and read via SQL) → transform (unserialize PHP meta, strip Divi) → load into Postgres. Order: taxonomies → products → variants → customers → orders → reviews → pages → redirects.
4. **Phase 4 — Backend** — Express + TS API: catalog, search, cart, checkout (HitPay), auth, account/orders, admin.
5. **Phase 5 — Frontend** — React + TS storefront: catalog, product, cart, checkout, account, CMS pages; reskinned.
6. **Phase 6 — Media** — extract `uploads` (6.49 GB), re-host, rewrite URLs.
7. **Phase 7 — Cutover** — redirects, sitemap, SEO parity, parallel run, QA, DNS.

## 6. Key risks / gotchas
- **Passwords** (phpass) can't be reused as-is → bcrypt rehash-on-login or force reset.
- **Serialized PHP** in `postmeta`/`options`/`db7_forms` → unserialize during ETL.
- **Divi shortcodes** in page content → strip to clean HTML.
- **Order integrity** — 8k orders × line items + meta must reconcile (totals, tax, status).
- **Payment** — HitPay account/API keys needed; reconcile historical vs. new transactions.
- **SEO** — map every old URL (products, categories, pages) to new routes + 301s.

## 7. Tooling built so far (`migration/`)
- `wpress-tool.js` — index/extract the `.wpress` archive.
- `analyze-db.js` — stream-analyze `database.sql` → `db-analysis.md`.
- `extracted/` — `database.sql`, `package.json`, `themes/` (no media yet).
- `db-analysis.md` — full 192-table inventory + post-type counts.
- `wpress-manifest.tsv` (project root) — full file manifest.
