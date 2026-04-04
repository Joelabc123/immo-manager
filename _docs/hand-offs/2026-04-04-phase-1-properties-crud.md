# Phase 1 - Properties CRUD & Core Structure

**Date:** 2026-04-04

## Summary

Phase 1 implements the complete Properties management feature end-to-end: tRPC routers for properties and tags, file upload/serving endpoints, geocoding and POI services, the application shell with sidebar navigation, and the full properties UI (list page, detail page, add wizard, edit/delete/duplicate dialogs, map, POI display, thumbnail upload). All i18n translations (de/en) were added for the properties domain.

## Key Decisions

### Properties Router Design

- `list` procedure supports pagination (page + limit), full-text search (name, street, city, zip), status filter, tag filter (via `inArray` subquery on `propertyTags`), and 5 sort options (createdAt, purchasePrice, marketValue, city, livingArea).
- `getById` returns the property with its rental units and assigned tags in a single query using Drizzle relational queries.
- `create` auto-creates an initial rental unit for non-multi-unit property types (single_family, semi_detached, terraced, apartment, garage).
- `duplicate` supports optional inclusion of rental units and tags via transaction.
- `getDependencies` returns counts of related records (rental units, tag assignments) for the delete confirmation dialog.
- `getAggregatedKpis` computes portfolio-level totals (property count, unit count, total market value, total purchase price) using SQL aggregation.

### File Upload Strategy

- Upload endpoint at `/api/upload` accepts multipart/form-data (POST).
- MIME-type whitelist: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`.
- Max file size: 25 MB (validated server-side).
- Storage path: `uploads/{userId}/{propertyId}/thumbnail.{ext}` — filesystem-based, not cloud storage.
- Serving endpoint at `/api/uploads/[...path]` with auth check, directory traversal prevention, and user-scoped access control.
- Client-side image compression via Canvas API (max 800px, JPEG quality 0.8) before upload to reduce bandwidth.

### Geocoding & POI

- Nominatim (OpenStreetMap) for address-to-coordinates geocoding — no API key required.
- Overpass API for POI fetching with 7 categories: restaurant, supermarket, doctor, kindergarten, pharmacy, school, public_transport.
- Search radius: 1500m from property coordinates.
- Micro-location score (0-100) calculated based on category coverage (70% weight) and average distance (30% weight).
- Both server-side (`server/services/geocoding.ts`) and client-side (`lib/geocoding.ts`) geocoding functions exist.

### Map Component

- Leaflet + react-leaflet for interactive maps.
- PropertyMap uses vanilla Leaflet API with refs for marker management (more reliable than react-leaflet declarative markers for dynamic updates).
- Lazy-loaded via `dynamic(() => import(...), { ssr: false })` to avoid SSR issues with Leaflet's window dependency.
- Supports both single-property view (detail page) and multi-property view (list page).

### Zod v4 / react-hook-form Compatibility

- `@hookform/resolvers` v5.2.2 has a type mismatch with Zod 4.3.6 — the Zod 4 overload expects `_zod.version.minor: 0` but Zod 4.3.6 reports `minor: 3`.
- Solved with a custom `zodResolver` wrapper at `lib/zod-resolver.ts` that calls `schema.safeParse()` directly and maps errors to react-hook-form's `FieldErrors` format.
- Returns `{} as Record<string, never>` for the error case values to satisfy the `ResolverError` type constraint.

### UI Component Conventions

- shadcn/ui uses `@base-ui/react` (NOT `@radix-ui`) — uses `render` prop instead of `asChild`.
- Select `onValueChange` can return `null` (must be handled).
- Add Property Wizard: 4-step form (Basic Info → Address → Financial → Details) with step navigation and validation per step.
- App Shell: Collapsible sidebar on desktop, bottom navigation bar on mobile. 5 nav items: Dashboard, Properties, Tenants, Documents, Settings.

## Files Created/Modified

### New Files

- `apps/nextjs/src/server/routers/properties.ts` — Properties tRPC router (create, list, getById, update, delete, duplicate, getDependencies, updateTags, getAggregatedKpis)
- `apps/nextjs/src/server/routers/tags.ts` — Tags tRPC router (create, list, update, delete)
- `apps/nextjs/src/server/services/geocoding.ts` — Nominatim geocoding, Overpass POI fetching, haversine distance, POI score calculation
- `apps/nextjs/src/app/api/upload/route.ts` — File upload endpoint (POST, multipart/form-data)
- `apps/nextjs/src/app/api/uploads/[...path]/route.ts` — File serving endpoint (GET, auth-protected, user-scoped)
- `apps/nextjs/src/lib/geocoding.ts` — Client-side geocoding helper
- `apps/nextjs/src/lib/zod-resolver.ts` — Custom Zod v4 resolver for react-hook-form
- `apps/nextjs/src/components/app-shell.tsx` — Application shell with sidebar and mobile nav
- `apps/nextjs/src/app/(app)/page.tsx` — Root page (redirects to /properties)
- `apps/nextjs/src/app/(app)/properties/page.tsx` — Properties list page (search, filter, sort, pagination, map toggle, KPI bar)
- `apps/nextjs/src/app/(app)/properties/[id]/page.tsx` — Property detail page (hero, details, units, tags, map, actions)
- `apps/nextjs/src/components/properties/property-card.tsx` — Property card for grid view
- `apps/nextjs/src/components/properties/property-kpi-bar.tsx` — Aggregated KPI bar
- `apps/nextjs/src/components/properties/add-property-wizard.tsx` — 4-step add wizard
- `apps/nextjs/src/components/properties/edit-property-dialog.tsx` — Edit property dialog
- `apps/nextjs/src/components/properties/delete-property-dialog.tsx` — Delete confirmation with dependency listing
- `apps/nextjs/src/components/properties/duplicate-property-dialog.tsx` — Duplicate with options (units, tags)
- `apps/nextjs/src/components/properties/thumbnail-upload.tsx` — Drag & drop upload with client-side compression
- `apps/nextjs/src/components/properties/property-map.tsx` — Leaflet map component
- `apps/nextjs/src/components/properties/poi-display.tsx` — POI category display with distances

### Modified Files

- `apps/nextjs/src/server/routers/_app.ts` — Registered `propertiesRouter` and `tagsRouter`
- `apps/nextjs/src/app/(app)/layout.tsx` — Wrapped with `AppShell` component
- `apps/nextjs/messages/de.json` — Added full `properties` section, `nav.logout`
- `apps/nextjs/messages/en.json` — Added matching English translations

## Maintenance Notes

- To add sort options to the properties list: extend the `sort` switch in `properties.ts` router and add the i18n key in both `de.json` and `en.json` under `properties.sort`.
- To add new POI categories: extend the `poiQueries` array in `server/services/geocoding.ts` and add the i18n key under `properties.poi.categories`.
- Upload storage is filesystem-based at `uploads/` in the project root. For production, migrate to cloud storage (S3/R2) and update both the upload route and serving route.
- The custom `zodResolver` should be removed once `@hookform/resolvers` releases a version compatible with Zod 4.3+.
- Map component is lazy-loaded — any new map usage must also use `dynamic(() => import(...), { ssr: false })`.

## Known Issues / Technical Debt

1. **DB migrations not generated**: Schema files exist but `make db-generate` hasn't been run yet (requires running PostgreSQL). Carried over from Phase 0.
2. **Tag management page missing**: Tags can be assigned to properties, but there is no standalone page to create/edit/delete tags. Currently only possible via direct API calls.
3. **POI auto-fetch not wired**: Geocoding and POI services exist but are not automatically triggered when entering an address in the add/edit wizard. Must be integrated in a future iteration.
4. **Filesystem-based uploads**: Not suitable for production. Should be migrated to S3-compatible storage (e.g., Cloudflare R2).
5. **Zod v4 resolver workaround**: Custom `zodResolver` exists due to `@hookform/resolvers` type mismatch. Monitor upstream for a fix.
6. **Lint warnings (acceptable)**: 10 warnings remain — `react-hooks/incompatible-library` for `watch()`, `@next/next/no-img-element` for dynamic upload thumbnails, `exhaustive-deps` on map initialization (all intentional).
7. **Auth pages still use hardcoded German**: Carried over from Phase 0 — should use `useTranslations()`.
