# Med-Vet-Ecommerce

VetMedAgri Singapore — veterinary and agricultural e-commerce platform.

Migrated from WooCommerce (WordPress) to a modern React + Node.js + PostgreSQL stack.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| State | TanStack Query v5 + Zustand |
| Backend | Express v5 + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Payments | HitPay (Singapore) |

## Project Structure

```
├── api/              Express API + Prisma schema
│   ├── src/          TypeScript source
│   ├── prisma/       Schema + migrations
│   └── public/       Static media (wp-content/uploads — tracked via Git LFS)
├── web/              React SPA (Vite)
├── migration/        ETL scripts (WordPress → PostgreSQL)
├── Dockerfile        Multi-stage production build
├── docker-compose.yml
└── .env.example      Environment variable template
```

## Quick Start (development)

```bash
# 1. Copy env and fill values
cp .env.example .env

# 2. Start Postgres
docker compose up postgres -d

# 3. Push schema + seed
cd api && npx prisma migrate deploy

# 4. Start API (port 3001)
npm run dev

# 5. Start frontend (port 5173) — in a new terminal
cd web && npm run dev
```

## Production

```bash
cp .env.example .env   # fill POSTGRES_PASSWORD, JWT_SECRET, SITE_URL, HITPAY_* 
docker compose up --build -d
```

## Media

Product images are stored in `api/public/wp-content/uploads/` and tracked via **Git LFS**.
Original images were extracted from a `.wpress` archive using `migration/08-extract-media.js`.

## Environment Variables

See `.env.example` for all required variables. Never commit `.env`.
