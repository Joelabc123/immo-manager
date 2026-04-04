# Phase 8: Settings, PWA Preparation & Polish

**Date:** 2026-04-07
**Status:** Complete

## Summary

Phase 8 delivers the complete Settings tab with profile management, password change, financial preferences (including multi-currency support for EUR/USD/CHF), PWA preparation, responsive mobile polish, property detail sticky footer, and a database seed script with demo data.

## Key Changes

### 8.1 Settings Tab (Complete)

- **User Settings tRPC Router** (`apps/nextjs/src/server/routers/user-settings.ts`): 5 procedures — `getProfile`, `updateProfile`, `changePassword`, `getPreferences`, `updatePreferences`, `deleteAvatar`. All mutations log audit trail entries.
- **Validation Schemas** (`packages/shared/src/validation/user.ts`): `updateProfileInput`, `changePasswordInput`, `updatePreferencesInput` with exported constants `SUPPORTED_CURRENCIES`, `SUPPORTED_LANGUAGES`, `KPI_PERIODS`.
- **Profile Section** (`apps/nextjs/src/components/settings/profile-section.tsx`): Name, email, email signature editing; avatar upload via `/api/upload` with `uploadType=avatar`; avatar delete. Avatar stored at `uploads/{userId}/avatar.{ext}`.
- **Password Section** (`apps/nextjs/src/components/settings/password-section.tsx`): Current password verification, new password with confirmation, client-side validation.
- **Preferences Section** (`apps/nextjs/src/components/settings/preferences-section.tsx`): Currency (EUR/USD/CHF), language (de/en) with page reload on change, tax rate, retirement year, health score weights (must sum to 100), KPI period, DSCR target, broker fee, appreciation, capital gains tax, donut threshold, share link validity.
- **Settings Page** re-organized with Tabs (Profile, Preferences, Email, Notifications, Market Data).

### 8.1a Multi-Currency Support

- **UserProvider** (`apps/nextjs/src/components/user-provider.tsx`): React context providing user data (fetches via `trpc.auth.me`). `useUser()` hook.
- **useCurrency Hook** (`apps/nextjs/src/lib/hooks/use-currency.ts`): Returns `{ currency, locale, formatCurrency, formatCompactCurrency }` based on user preferences. Falls back to EUR/de-DE.
- **Session Context**: `validateSession()` now returns `language`, `currency`, `avatarUrl` from the users table join.
- **24 component files updated**: All `formatCurrency`/`formatCompactCurrency` calls now use the `useCurrency()` hook instead of direct imports. Components affected: dashboard (5), properties (6), tenants (4+1 page), analysis (5+1 page), area-chart, property detail page.
- **3 PDF components** (`property-detail-pdf.tsx`, `analysis-report-pdf.tsx`, `dunning-pdf.tsx`): Accept `currency` and `locale` parameters since they render outside the React DOM tree and cannot use hooks. Import renamed to `formatCurrencyRaw`.

### 8.2 Responsive Polish

- **Mobile Bottom Nav**: Extended from 4 items to 4 + "More" button. "More" opens a bottom Sheet with remaining nav items (Mail, Documents, Audit, Settings) plus logout.
- **Content Padding**: Mobile padding adjusted to `p-4 pb-20` (accounts for bottom nav height), desktop remains `p-6`.
- **Safe Area**: Bottom nav and property sticky footer respect `env(safe-area-inset-bottom)`.

### 8.3 PWA Preparation

- **Manifest** (`apps/nextjs/public/manifest.json`): App name, theme color, display standalone, SVG placeholder icons.
- **Placeholder Icons** (`apps/nextjs/public/icons/icon-{size}x{size}.svg`): 8 sizes (72-512px), navy background with "IM" text. For production, replace with PNG.
- **Service Worker** (`apps/nextjs/public/sw.js`): Extended with install/activate lifecycle, cache-first for static assets, network-first for navigation with offline fallback.
- **Offline Page** (`apps/nextjs/src/app/offline/page.tsx`): Simple offline indicator with retry button.
- **SW Registration** (`apps/nextjs/src/components/service-worker-registration.tsx`): Auto-registers SW on app load.
- **Layout Meta Tags**: manifest link, theme-color, apple-web-app-capable, mobile-web-app-capable, format-detection.
- **Icon generation script**: `scripts/generate-icons.js` creates SVG placeholders.

### 8.4 Sticky Footer

- **Property Detail**: On mobile, action buttons (Share, Duplicate, Edit, Delete) shown in a fixed footer bar above the bottom nav. Desktop buttons remain in the header.

### 8.5 Seed Data

- **Seed Script** (`packages/shared/src/db/seed.ts`): Creates 1 demo user (`demo@immo-manager.de` / `demo1234`) with:
  - 4 German properties (Berlin apartment, Munich 4-family house, Hamburg single-family, Frankfurt commercial)
  - 4 loans (one per property)
  - 8 rental units
  - 7 tenants with emails
  - 5 recurring expenses
  - 21 rent payments (3 months per tenant)
- **Makefile target**: `make db-seed`
- **Package script**: `pnpm --filter @repo/shared db:seed`
- **tsx** added as devDependency to `@repo/shared`

## Decisions

1. **Currency as user preference, not system-wide**: Each user can independently set EUR/USD/CHF. The `useCurrency()` hook provides locale-aware formatting everywhere.
2. **PDF components receive currency/locale as params** instead of using hooks, because `@react-pdf/renderer` renders outside the React DOM tree.
3. **Language switching triggers full page reload** to ensure all server-rendered content updates (next-intl uses server-side locale).
4. **SVG placeholder icons for PWA** instead of PNGs — no native canvas dependency needed. Replace with proper PNGs for production.
5. **Bottom Sheet for mobile "More" menu** — follows mobile app patterns (iOS/Android) for overflow navigation.

## Future Maintenance

- **Production PWA Icons**: Replace SVG placeholders at `public/icons/` with properly sized PNG files.
- **PDF Currency Callers**: When PDF generate functions are wired to UI buttons, pass `currency` and `locale` from the `useCurrency()` hook: `generatePropertyPdf(data, labels, currency, locale)`.
- **Avatar Serving**: Currently serves via `/api/uploads/{path}`. Consider CDN or S3 for production.
- **Service Worker Versioning**: Update `CACHE_NAME` in `sw.js` when deploying new static assets.
- **Health Score Weight Validation**: Server-side validation that cashflow + LTV + yield weights sum to 100 could be added as a Zod `.refine()`.

## Known Issues / Technical Debt

1. **No server-side validation for health score weight sum = 100**: Only enforced in UI. Add a `.refine()` to `updatePreferencesInput` for completeness.
2. **Avatar file cleanup**: When a user uploads a new avatar, the old file is not deleted from disk.
3. **PDF functions not yet wired to UI buttons** — documented in Phase 6 hand-off as pending.
4. **Seed script does not check for existing data** — running twice will create duplicates. Use `make db-reset` then `make db-seed` for clean seeding.
5. **tsx devDependency**: Added to `@repo/shared` for the seed script. Run `pnpm install` after pulling this change.
