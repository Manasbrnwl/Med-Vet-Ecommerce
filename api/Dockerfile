FROM node:22-alpine AS base
WORKDIR /app

# Install ALL deps (dev deps like typescript + @types are needed to compile)
COPY package*.json ./
RUN npm ci

# Copy source + prisma
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client + build (dev deps stay; unused at runtime but keeps the
# generated Prisma client intact — pruning risks removing .prisma/client)
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
