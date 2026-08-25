# syntax=docker/dockerfile:1
FROM node:24-slim AS base
RUN corepack enable

# ---- Prune the monorepo down to only what `worker` needs to build ----
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2.10.11
COPY . .
RUN turbo prune worker --docker

# ---- Install the pruned dependency set ----
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=worker...

# ---- Runtime image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 workeruser
COPY --from=builder --chown=workeruser:nodejs /app .
USER workeruser
WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]
