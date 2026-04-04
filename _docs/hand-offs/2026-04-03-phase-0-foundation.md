# Phase 0 - Project Foundation & Infrastructure

**Date:** 2026-04-03

## Summary

Phase 0 establishes the complete technical foundation for the Immo Manager project. This includes the monorepo restructuring, full database schema (21 tables), custom authentication (argon2 + DB sessions), structured logging (pino), CI/CD pipeline (GitHub Actions), and internationalization (next-intl with de/en).

## Key Decisions

### Monorepo Structure

- pnpm workspaces with 6 packages: `@repo/shared`, `@repo/nextjs`, `@repo/websocket`, `@repo/email`, `@repo/redis`, `@repo/code-executor`
- `apps/` for deployable services, `packages/` for shared libraries
- Each package has its own `package.json`, `tsconfig.json`, and lint config (shared uses typescript-eslint, nextjs uses eslint-config-next)
- Root `tsconfig.base.json` provides shared TS settings; all packages extend it

### Database Schema

- All monetary values stored as integer cents (NFR-2.6)
- All percentages stored as integer basis points (e.g. 350 = 3.50%)
- Email passwords encrypted with AES-256-GCM (encryptedPassword, encryptionIv, encryptionTag)
- `as const` objects for all type constants (no enums)
- Zod 4 for validation schemas

### Authentication

- argon2id (memoryCost 65536, timeCost 3, parallelism 4) for password hashing
- DB-based sessions with 30-day expiry
- HTTP-only, Secure, SameSite=Lax cookies
- crypto.randomBytes(32).toString("base64url") for session tokens
- Next.js middleware checks cookie presence for route protection (edge-compatible, no DB call)
- tRPC `protectedProcedure` validates session against DB for API protection

### Logging

- pino for structured JSON logging (production: info level, development: pino-pretty)
- Sentry integration deferred — DSN not yet configured

### i18n

- next-intl with locale cookie (`locale`), default: `de`
- Translation files: `apps/nextjs/messages/de.json`, `en.json`
- Formatting utilities in `packages/shared/src/utils/formatting.ts` (formatCurrency, formatPercentage, formatDate)

## Files Created/Modified

### New Files (Key)

- `packages/shared/src/db/schema/` — 21 schema files (users, sessions, properties, tags, rental-units, tenants, rent-adjustments, loans, expenses, rent-payments, documents, dunning-records, email, notifications, audit-logs, share-links, scenarios, market-data, push-subscriptions, action-center, maintenance-reserves)
- `packages/shared/src/types/` — 8 type constant files
- `packages/shared/src/validation/` — 5 Zod validation schemas
- `packages/shared/src/utils/formatting.ts` — Currency/percentage/date formatters
- `apps/nextjs/src/server/auth/` — password.ts, session.ts, index.ts
- `apps/nextjs/src/server/routers/auth.ts` — register, login, logout, me procedures
- `apps/nextjs/src/middleware.ts` — Route protection middleware
- `apps/nextjs/src/app/(auth)/` — Login + Register pages with shadcn UI
- `apps/nextjs/src/i18n/` — config.ts, request.ts
- `apps/nextjs/messages/` — de.json, en.json
- `apps/nextjs/src/lib/logger.ts` — Pino logger
- `.github/workflows/ci.yml` — CI pipeline (type-check, lint, build)

### Modified Files

- `apps/nextjs/src/server/trpc.ts` — Added auth context, protectedProcedure
- `apps/nextjs/src/server/routers/_app.ts` — Registered auth router
- `apps/nextjs/src/app/layout.tsx` — Added NextIntlClientProvider
- `apps/nextjs/next.config.ts` — Added next-intl plugin
- `apps/nextjs/src/server/cron/index.ts` — Replaced console.log with pino
- `apps/nextjs/src/server/mail/index.ts` — Replaced console.log with pino

## Maintenance Notes

- To add a new DB table: create schema file in `packages/shared/src/db/schema/`, export from `index.ts`, run `make db-generate` then `make db-push`
- To add a new tRPC route: create router in `apps/nextjs/src/server/routers/`, register in `_app.ts`
- Sentry needs to be configured when DSN is available (`sentry.client.config.ts`, `sentry.server.config.ts`)
- Next.js 16 uses the new "proxy" convention instead of "middleware" (build warning) — can be migrated later

## Known Issues / Technical Debt

1. **Middleware deprecation warning**: Next.js 16 prefers `proxy` over `middleware`. Current middleware works but shows a build warning.
2. **Sentry not configured**: Deferred until DSN is available.
3. **Placeholder packages**: `@repo/websocket`, `@repo/email`, `@repo/redis`, `@repo/code-executor` are minimal stubs.
4. **DB migrations not generated yet**: Schema files exist but `make db-generate` hasn't been run (requires running PostgreSQL).
5. **Auth pages use hardcoded German strings**: Should be migrated to use `useTranslations()` from next-intl.
