# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
# pnpm-Version an packageManager-Pin in package.json halten
RUN npm install -g pnpm@11.3.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Runtime-Image: nur der Next.js-Standalone-Server (CLAUDE.md §13)
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

# Jobs-Image: volle Sourcen + Dev-Tooling für One-offs auf dem VPS
# (pnpm seed, pnpm sync:uex) — wird als eigener Tag mitveröffentlicht.
FROM base AS jobs
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Kein --env-file wie im lokalen "pnpm seed" — Env kommt vom Compose-Service
CMD ["pnpm", "exec", "tsx", "scripts/seed.ts"]
