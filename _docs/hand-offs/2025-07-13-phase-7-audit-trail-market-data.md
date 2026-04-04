# Hand-Off: Phase 7 — Audit Trail & Market Data

**Date:** 2025-07-13
**Phase:** 7 (Audit Trail & Marktdaten)
**Status:** Complete

## Summary

Phase 7 implements two major features: a comprehensive audit trail system for tracking all data changes, and a market data integration layer connecting the application to ECB interest rate data and manual rent benchmarks.

## Key Decisions

### Audit Trail (7.1)

- **Approach:** Explicit utility function (`logAudit`) called in each router mutation, NOT tRPC middleware. This gives full control over which fields to track and how to compute diffs.
- **Storage:** One row per changed field in the `audit_logs` table (schema from Phase 0). Create/delete actions log a single row with null field/value columns. Update actions log one row per changed field with old/new values.
- **Fire-and-forget:** Audit inserts use `.catch()` error logging to avoid blocking mutations. A failed audit write does not roll back the actual operation.
- **Diff tracking:** `diffChanges()` utility compares old and new records for a list of tracked fields, stringifying values for storage.
- **Coverage:** All 9 entity types are audited: property, tenant, loan, expense, rental_unit, rent_payment, rent_adjustment, document, email_account.
- **UI:** Dedicated `/audit` page with table view, filtering (by entity type, action, entity ID), and pagination. Per-entity audit sections added to property and tenant detail pages.

### Market Data (7.2)

- **ECB Integration:** Real API calls to `data-api.ecb.europa.eu` using SDMX-JSON format. Two series: ECB key rate (`FM.D.U2.EUR.4F.KR.MRR_FR.LEV`) and Euro area mortgage rate (`MIR.M.U2.B.A2C.AM.R.A.2250.EUR.N`).
- **Cron sync:** Daily at 06:00 via `registerMarketDataSyncJob()`. Manual sync available via settings UI.
- **Rent benchmarks:** Manual per-city entries stored in `market_data_cache` table. Users create benchmarks via settings page with city, rent/sqm, valid-from date, and source.
- **Action center integration:** `evaluateRentPotential()` now accepts optional `rentBenchmarks` Map (propertyId → centsPerSqm). Dashboard fetches benchmarks from market data cache, maps them to properties by city name. Falls back to default 600 cents/sqm (6 EUR/sqm) when no benchmark exists.
- **Analysis integration:** Stress-test and refinancing sections display current ECB rates as reference below their rate sliders.
- **Settings UI:** New "Market Data" section with interest rate display (with sync button) and rent benchmark CRUD table.

## Files Created

| File                                                            | Purpose                                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/shared/src/types/audit.ts`                            | AUDIT_ENTITY_TYPES const + AuditEntityType type                        |
| `packages/shared/src/types/market.ts`                           | MARKET_DATA_TYPES, InterestRateData, RentBenchmarkData types           |
| `packages/shared/src/validation/audit.ts`                       | Zod schemas: listAuditLogsInput, getEntityAuditInput                   |
| `packages/shared/src/validation/market.ts`                      | Zod schemas: create/update/list rent benchmarks, interest rate history |
| `apps/nextjs/src/server/services/audit.ts`                      | logAudit(), diffChanges() utility functions                            |
| `apps/nextjs/src/server/services/market-data.ts`                | ECB API integration, syncEcbInterestRates(), getAllRentBenchmarks()    |
| `apps/nextjs/src/server/cron/market-data.ts`                    | Daily ECB sync cron job                                                |
| `apps/nextjs/src/server/routers/audit.ts`                       | Audit tRPC router (list, getByEntity)                                  |
| `apps/nextjs/src/server/routers/market-data.ts`                 | Market data tRPC router (8 procedures)                                 |
| `apps/nextjs/src/components/audit/audit-log-table.tsx`          | Reusable audit log table component                                     |
| `apps/nextjs/src/components/audit/entity-audit-section.tsx`     | Per-entity audit section (Card wrapper)                                |
| `apps/nextjs/src/components/settings/market-data-section.tsx`   | Market data settings UI                                                |
| `apps/nextjs/src/components/settings/rent-benchmark-dialog.tsx` | Add rent benchmark dialog                                              |
| `apps/nextjs/src/app/(app)/audit/page.tsx`                      | Global audit log page                                                  |

## Files Modified

| File                                                          | Changes                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `packages/shared/src/types/index.ts`                          | Added audit + market exports                                                                     |
| `packages/shared/src/validation/index.ts`                     | Added audit + market exports                                                                     |
| `packages/shared/src/calculations/action-center-rules.ts`     | Added optional `rentBenchmarks` to input, per-property benchmark lookup in evaluateRentPotential |
| `packages/shared/tests/action-center-rules.test.ts`           | Added test for per-property rent benchmark                                                       |
| `apps/nextjs/src/server/routers/_app.ts`                      | Registered audit + marketData routers                                                            |
| `apps/nextjs/src/server/routers/properties.ts`                | Audit logging on create/update/delete/duplicate/updateTags, fixed tracked field names            |
| `apps/nextjs/src/server/routers/tenants.ts`                   | Audit logging on create/update/delete                                                            |
| `apps/nextjs/src/server/routers/loans.ts`                     | Audit logging on create/update/delete, fixed tracked field names                                 |
| `apps/nextjs/src/server/routers/expenses.ts`                  | Audit logging on create/update/delete                                                            |
| `apps/nextjs/src/server/routers/rental-units.ts`              | Audit logging on create/update/delete                                                            |
| `apps/nextjs/src/server/routers/rent-payments.ts`             | Audit logging on record                                                                          |
| `apps/nextjs/src/server/routers/rent-adjustments.ts`          | Audit logging on create/delete                                                                   |
| `apps/nextjs/src/server/routers/documents.ts`                 | Audit logging on update/delete                                                                   |
| `apps/nextjs/src/server/routers/email.ts`                     | Audit logging on createAccount/updateAccount/deleteAccount                                       |
| `apps/nextjs/src/server/routers/dashboard.ts`                 | Fetches rent benchmarks for action center                                                        |
| `apps/nextjs/src/server/cron/index.ts`                        | Registered market data sync cron job                                                             |
| `apps/nextjs/src/components/app-shell.tsx`                    | Added Audit nav item with ClipboardList icon                                                     |
| `apps/nextjs/src/components/analysis/stress-test-section.tsx` | ECB rate reference display                                                                       |
| `apps/nextjs/src/components/analysis/refinancing-section.tsx` | ECB rate reference display                                                                       |
| `apps/nextjs/src/app/(app)/settings/page.tsx`                 | Added Market Data section                                                                        |
| `apps/nextjs/src/app/(app)/properties/[id]/page.tsx`          | Added EntityAuditSection                                                                         |
| `apps/nextjs/src/app/(app)/tenants/[id]/page.tsx`             | Added EntityAuditSection                                                                         |
| `apps/nextjs/messages/de.json`                                | Added audit + marketData translations                                                            |
| `apps/nextjs/messages/en.json`                                | Added audit + marketData translations                                                            |

## Maintenance Notes

- **ECB API:** The SDMX-JSON endpoint does not require authentication. If ECB changes their API format, update `parseEcbResponse()` in `services/market-data.ts`.
- **Rent benchmarks:** Currently matched by exact city name (case-insensitive). Future improvement could use fuzzy matching or postal code regions.
- **Audit log growth:** Consider adding a retention policy or archiving strategy for audit logs as the table grows.
- **Test count:** 83 tests passing (up from 82, added per-property rent benchmark test).

## Known Issues / Technical Debt

- Audit log search currently filters by entity ID (UUID) — a full-text search across all fields would be more user-friendly.
- The ECB API fetch does not handle rate limiting or retry logic beyond basic error logging.
- No database migration was needed — Phase 0 already created the `audit_logs` and `market_data_cache` tables.
