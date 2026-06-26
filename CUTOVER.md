# Cutover Runbook — VetMedAgri WordPress → New Stack

## Pre-cutover checklist

- [ ] HitPay API key + salt obtained and tested
- [ ] Production server provisioned (Ubuntu 24 LTS, Docker installed)
- [ ] Domain SSL cert ready (Let's Encrypt via Caddy or Nginx)
- [ ] `JWT_SECRET` generated (`openssl rand -hex 32`)
- [ ] `POSTGRES_PASSWORD` generated
- [ ] ETL verified: product counts match WooCommerce dashboard
- [ ] Smoke-tested locally: browse shop, add to cart, checkout flow

---

## Step 1 — Set production env vars

Create `/opt/vetmedagri/.env` on the production server:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-random>
JWT_SECRET=<openssl rand -hex 32>
SITE_URL=https://vetmedagri.net
HITPAY_API_KEY=<from HitPay dashboard>
HITPAY_SALT=<from HitPay dashboard>
```

---

## Step 2 — Upload media to production server

```bash
# From your local machine (2.4 GB)
rsync -avz --progress \
  api/public/wp-content/uploads/ \
  user@production:/opt/vetmedagri/media/

# OR: re-run the extraction script on the server
node migration/08-extract-media.js
```

---

## Step 3 — Build and deploy

```bash
# Build React frontend
cd web && npm run build   # → web/dist/

# Start production stack
cd ..
docker-compose -f docker-compose.prod.yml --env-file .env up -d

# Run Prisma migrations (first deploy only)
docker-compose -f docker-compose.prod.yml exec api \
  npx prisma migrate deploy

# Restore Postgres data from dev (if not migrating fresh)
# pg_dump from local and restore on prod:
pg_dump -h localhost -p 5433 -U postgres vetmedagri | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres vetmedagri
```

---

## Step 4 — Rewrite media URLs to production domain

After data is in production Postgres, run:

```bash
MEDIA_BASE_URL=https://vetmedagri.net \
  npx tsx src/etl/09-rewrite-image-urls.ts
```

---

## Step 5 — DNS cutover

1. In your DNS provider (CloudFlare / GoDaddy / etc.), update the **A record** for `vetmedagri.net` to point to the new server IP.
2. Set TTL to 300s (5 min) before cutover so it propagates quickly.
3. Keep the old WordPress server running for ~48 hours after cutover in case of rollback.

Propagation check: `nslookup vetmedagri.net`

---

## Step 6 — Verify after cutover

- [ ] `https://vetmedagri.net` loads the new storefront
- [ ] `https://vetmedagri.net/sitemap.xml` returns valid XML (crawlable)
- [ ] `https://vetmedagri.net/robots.txt` points to sitemap
- [ ] Product images load (not broken)
- [ ] `/my-account-2/lost-password/` → 301 → `/my-account/lost-password/` (redirect test)
- [ ] Add to cart works
- [ ] Checkout → HitPay payment page
- [ ] POST `https://vetmedagri.net/api/checkout/webhook` configured in HitPay dashboard
- [ ] API health: `https://vetmedagri.net/health` returns `{ ok: true, products: 314 }`

---

## Rollback plan

DNS rollback (if critical issues within 48h):
```bash
# Revert A record to old server IP in DNS provider
# Old WordPress site is still running — rollback is instant
```

---

## Post-cutover

- [ ] Submit `https://vetmedagri.net/sitemap.xml` to Google Search Console
- [ ] Set up uptime monitoring (UptimeRobot, BetterUptime, etc.)
- [ ] Configure automated Postgres backups (`pg_dump` cron)
- [ ] Decommission MariaDB container (ETL is complete)
- [ ] Decommission old WordPress server after 30 days
