# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/b2b-portal ./apps/b2b-portal

RUN npm ci --workspace=@b2b/portal --include-workspace-root

ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/b2b-portal && npx next build

# ---- Production Stage ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/b2b-portal/.next/standalone ./
COPY --from=builder /app/apps/b2b-portal/.next/static ./apps/b2b-portal/.next/static
COPY --from=builder /app/apps/b2b-portal/public ./apps/b2b-portal/public 2>/dev/null || true

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/b2b-portal/server.js"]
