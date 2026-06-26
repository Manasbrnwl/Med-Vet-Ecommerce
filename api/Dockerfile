FROM node:22-alpine AS base
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source + prisma
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client + build
RUN npx prisma generate
RUN npx tsc -p tsconfig.json

# Runtime image
FROM node:22-alpine AS runtime
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma

# public/ is mounted as a volume in production (media files)
RUN mkdir -p public/wp-content/uploads

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/server.js"]
