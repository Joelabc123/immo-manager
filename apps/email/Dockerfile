FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/email/package.json apps/email/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source
COPY packages/shared packages/shared
COPY apps/email apps/email

# Build
RUN pnpm --filter @repo/email build

WORKDIR /app/apps/email
CMD ["node", "dist/index.js"]
