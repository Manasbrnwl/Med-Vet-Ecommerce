# WooCommerce → App Product Sync — Webhook Setup

While the WordPress/WooCommerce site stays live, this lets it remain the source of
truth for product data: WooCommerce pushes a signed webhook to this app on every
product create/update/delete/restore, and `api/src/routes/webhooks.ts` upserts (or
soft-deletes) the matching row here, keyed by WordPress's product ID (`wpId`).

## 1 — Configure env vars on this app

```env
# Required — must match the "Secret" field on every webhook below
WC_WEBHOOK_SECRET=<generate: openssl rand -hex 24>

# Optional — only needed to sync variant price/stock for variable products.
# WooCommerce's product webhook payload lists variation ids but not their data,
# so a variable product's variants are pulled from the WooCommerce REST API instead.
WC_API_URL=https://<your-wordpress-site>/wp-json/wc/v3
WC_CONSUMER_KEY=<WooCommerce > Settings > Advanced > REST API>
WC_CONSUMER_SECRET=<same>
```

Restart the app after setting these so the new secret takes effect.

## 2 — Create four webhooks in WooCommerce

In WordPress admin: **WooCommerce → Settings → Advanced → Webhooks → Add webhook**.

Create one entry per topic below. They all point at the **same** delivery URL and
use the **same** secret — the app tells them apart via the `X-WC-Webhook-Event`
header WooCommerce sends with each delivery.

| Name | Topic | Delivery URL | Secret | API version |
|---|---|---|---|---|
| Product created | Product created | `https://<your-app-domain>/api/webhooks/woocommerce/products` | `WC_WEBHOOK_SECRET` value | WP REST API Integration v3 |
| Product updated | Product updated | same | same | same |
| Product deleted | Product deleted | same | same | same |
| Product restored | Product restored | same | same | same |

Set **Status** to `Active` on each. Save.

## 3 — Confirm it's connected

WooCommerce sends a one-time connectivity ping the moment you save a webhook (before
it's willing to deliver real events). If the ping fails, the webhook's edit screen
shows a red **"Delivery URL returned response code: ..."** banner instead of going
active — check:

- The delivery URL is reachable from the public internet (not `localhost`).
- `WC_WEBHOOK_SECRET` on the app exactly matches the **Secret** field in WooCommerce
  (no leading/trailing whitespace).
- The app is actually running and `GET /health` on the delivery URL's host returns
  `200`.

No error banner + status `Active` means the webhook is live.

## 4 — Test each event

| To trigger... | Do this in wp-admin |
|---|---|
| `created` | Add a new product and publish it |
| `updated` | Edit any field on an existing product and update |
| `deleted` | Products list → Trash a product |
| `restored` | Products → Trash → Restore that product |

Each delivery's result is visible under the webhook's **Delivery Logs** tab in
WooCommerce (response code + body), and correspondingly in this app's server logs.

## What syncs

- Core fields: name, slug, sku, description, price/regular/sale price, stock
  status/quantity, tax status/class, weight/dimensions, featured, external URL.
- Categories and tags — created here on first sight (matched by WordPress term ID),
  then kept in sync with the product's full category/tag set on every update.
- Brand — only if a brand plugin exposes it via the REST API's `brands` field; if
  absent, the product's existing brand is left untouched (never wiped).
- Images — added/removed/reordered to match the payload; first image is primary.
- Variants (variable products) — requires `WC_API_URL`/`WC_CONSUMER_KEY`/
  `WC_CONSUMER_SECRET` (see step 1); skipped gracefully if not configured.
- Delete/restore — soft-delete only (`status: TRASH` / restored status), matching
  how the in-app admin's own "delete product" button behaves. Orders reference
  products, so nothing is ever hard-deleted by a webhook.

## Not synced

- `expiryDate` / `batchNumber` — these were migrated once from the original
  WordPress dump and are managed in this app's admin panel; webhook syncs never
  touch them, so editing a product in WordPress won't wipe or override them.
