# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY turbo.json tsconfig.base.json ./

# Copy Prisma schema package
COPY packages/prisma-schema ./packages/prisma-schema

# Copy API app
COPY apps/api ./apps/api

# Install all dependencies
RUN npm ci --workspace=@b2b/prisma-schema --workspace=@b2b/api --include-workspace-root

# Generate Prisma client
RUN cd packages/prisma-schema && npx prisma generate

# Build API
RUN cd apps/api && npx tsc -p tsconfig.build.json

# ---- Production Stage ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy package files for production install
COPY package.json package-lock.json ./
COPY packages/prisma-schema/package.json ./packages/prisma-schema/package.json
COPY apps/api/package.json ./apps/api/package.json

# Install production dependencies only
RUN npm ci --workspace=@b2b/prisma-schema --workspace=@b2b/api --include-workspace-root --omit=dev

# Copy Prisma schema and generate client
COPY packages/prisma-schema/prisma ./packages/prisma-schema/prisma
RUN cd packages/prisma-schema && npx prisma generate

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
