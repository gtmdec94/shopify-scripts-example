# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/mfg-dashboard ./apps/mfg-dashboard

RUN npm ci --workspace=@b2b/mfg-dashboard --include-workspace-root

ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/mfg-dashboard && npx next build

# ---- Production Stage ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/mfg-dashboard/.next/standalone ./
COPY --from=builder /app/apps/mfg-dashboard/.next/static ./apps/mfg-dashboard/.next/static
COPY --from=builder /app/apps/mfg-dashboard/public ./apps/mfg-dashboard/public 2>/dev/null || true

USER nextjs

EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/mfg-dashboard/server.js"]
