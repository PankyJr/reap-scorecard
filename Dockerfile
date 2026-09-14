# syntax=docker/dockerfile:1.7
#
# Multi-stage build for the REAP Scorecard Next.js app.
#
#   deps    — install dependencies once, cached on the lockfile
#   builder — compile the Next.js "standalone" server bundle
#   runner   — minimal production image, non-root, with a real Chromium for PDF export
#
# Build:
#   docker build \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
#     --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
#     -t reap-scorecard:local .

##############################################################################
# Stage 1 — deps
##############################################################################
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Puppeteer must not download its own ~300 MB Chromium. The runner stage
# installs Debian's chromium package and points Puppeteer at it instead.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci

##############################################################################
# Stage 2 — builder
##############################################################################
FROM node:20-bookworm-slim AS builder
WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so they
# must be present HERE, not only at run time. They are not secrets: the anon key
# is designed to be public and is constrained by row-level security in Postgres.
# The service-role key is deliberately absent — it is injected at run time only.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_DEMO_MODE=false
ARG NEXT_PUBLIC_DEV_BYPASS_AUTH=false
ARG NEXT_IMAGE_UNOPTIMIZED=false

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE \
    NEXT_PUBLIC_DEV_BYPASS_AUTH=$NEXT_PUBLIC_DEV_BYPASS_AUTH \
    NEXT_IMAGE_UNOPTIMIZED=$NEXT_IMAGE_UNOPTIMIZED

RUN npm run build

##############################################################################
# Stage 3 — runner
##############################################################################
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium is required by the scorecard and procurement PDF export routes.
# tini gives us correct signal handling so the container stops cleanly.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      ca-certificates \
      tini \
 && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --create-home nextjs

# Next.js "standalone" output ships its own minimal server plus only the
# node_modules it actually traced — that is what keeps this image small.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
