# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:22-alpine AS web-builder
WORKDIR /build/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ── Stage 2: Compile Express API ──────────────────────────────────────────────
FROM node:22-alpine AS api-builder
WORKDIR /build/api
COPY api/package*.json ./
RUN npm ci
COPY api/prisma ./prisma
RUN npx prisma generate
COPY api/tsconfig.json ./
COPY api/src ./src
RUN npx tsc -p tsconfig.json

# ── Stage 3: Runtime image ────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Production API deps
COPY api/package*.json ./
RUN npm ci --omit=dev

# Compiled API
COPY --from=api-builder /build/api/dist        ./dist
COPY --from=api-builder /build/api/node_modules/.prisma  ./node_modules/.prisma
COPY api/prisma ./prisma

# Built frontend — placed at /app/web/dist (matched by server.ts SPA path)
COPY --from=web-builder /build/web/dist ./web/dist

# Mount point for extracted media (populated at first run via volume)
RUN mkdir -p public/wp-content/uploads

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/server.js"]
