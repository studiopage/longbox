# 1. Base Image
FROM node:20-alpine AS base

# 2. Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application (produces .next/standalone)
RUN npm run build

# Bundle the DB schema to JS for drizzle-kit push
RUN npx esbuild src/db/schema.ts --bundle --platform=node --format=esm --outfile=dist/schema.mjs --external:drizzle-orm --external:postgres

# 4. Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone server + bundled node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create self-contained migrate directory with drizzle-kit + schema
RUN mkdir -p /app/migrate
COPY --from=builder /app/dist/schema.mjs /app/migrate/schema.mjs
COPY --from=builder /app/scripts/drizzle.config.mjs /app/migrate/drizzle.config.mjs
COPY --from=deps /app/node_modules /app/migrate/node_modules

# Copy entrypoint
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create writable cover cache directory
RUN mkdir -p /app/public/cache/covers && chown -R nextjs:nodejs /app/public/cache

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
