# Phase 2: Finanzierung, Mieter & Miet-Tracking

## Summary

Phase 2 adds the complete financial and tenant management layer to Immo Manager. This includes loan tracking with amortization schedules, tenant CRUD with multi-email support, rent payment generation and recording, expense tracking with apportionability, dunning records, rent adjustments, and a cashflow overview per property.

## Key Decisions

1. **Calculation Engine in shared package**: Amortization, cashflow, and maintenance reserve calculations live in `packages/shared/src/calculations/` so they can be reused by any service. All monetary values in cents, rates in basis points.

2. **Cashflow computed client-side**: Rather than a dedicated server procedure, the cashflow section gathers data from existing routers (loans, expenses, rental-units) and computes totals client-side. This avoids redundant queries and keeps the calculation simple.

3. **Tenant navigation via TenantCard internal routing**: TenantCard handles its own `router.push` for navigation, unlike PropertyCard which accepts an `onClick` prop. This simplifies the parent page.

4. **Expense summary uses nested objects**: The `expenses.getSummary` router returns `{ apportionable: { total, count }, nonApportionable: { total, count } }` — not flat fields.

5. **Optional tax parameters in cashflow**: `taxRate` and `monthlyDepreciation` default to 0, making the simple cashflow calculation work without tax configuration.

6. **Vitest for unit testing**: Added vitest to `@repo/shared` for testing calculation modules. 19 tests covering amortization schedules, cashflow, and maintenance reserve.

## Files Created

### Validation Schemas (packages/shared/src/validation/)

- `rental-unit.ts` — createRentalUnitInput, updateRentalUnitInput
- `rent-payment.ts` — recordRentPaymentInput, generateRentPaymentsInput
- `dunning.ts` — createDunningInput
- `rent-adjustment.ts` — createRentAdjustmentInput

### Calculation Engine (packages/shared/src/calculations/)

- `amortization.ts` — calculateAmortizationSchedule, aggregateYearlySummary
- `cashflow.ts` — calculateMonthlyCashflow (taxRate/monthlyDepreciation optional)
- `maintenance-reserve.ts` — calculateRecommendedReserve, calculateReserveBalance

### tRPC Routers (apps/nextjs/src/server/routers/)

- `loans.ts` — CRUD + amortization schedule
- `rental-units.ts` — CRUD with tenant info per unit
- `tenants.ts` — Full CRUD with search/filter/pagination, email sync
- `rent-payments.ts` — List, record, generateMonthly, getOverdue, getSummary
- `expenses.ts` — CRUD with category filter, getSummary
- `dunning.ts` — Create, list by tenant
- `rent-adjustments.ts` — Create (auto-captures oldColdRent), list, delete

### Tenant UI (apps/nextjs/src/components/tenants/)

- `tenant-card.tsx` — Grid card with status badge, rent info, actions
- `add-tenant-dialog.tsx` — 2-step wizard (personal info + contract)
- `edit-tenant-dialog.tsx` — Single-screen edit with email field array
- `delete-tenant-dialog.tsx` — Confirmation with dependency counts
- `rent-payment-table.tsx` — Payment list with inline record dialog
- `rent-adjustment-dialog.tsx` — Adjustment form with history display
- `dunning-section.tsx` — Dunning records list with create dialog

### Property Detail Sections (apps/nextjs/src/components/properties/)

- `loans-section.tsx` — Loan list with add dialog + expandable amortization table
- `expenses-section.tsx` — Expense list with add dialog, apportionable/non-apportionable summary
- `units-section.tsx` — Rental unit list with tenant badges, add dialog
- `cashflow-section.tsx` — Monthly cashflow overview with gross yield

### Pages (apps/nextjs/src/app/(app)/)

- `tenants/page.tsx` — Tenant list with search, status/property filters, pagination
- `tenants/[id]/page.tsx` — Tenant detail with personal/contract info, payments, adjustments, dunning

### Tests (packages/shared/tests/)

- `amortization.test.ts` — 4 tests
- `cashflow.test.ts` — 5 tests
- `maintenance-reserve.test.ts` — 10 tests

### UI Components Added

- `checkbox.tsx`, `collapsible.tsx`, `table.tsx` (via shadcn/ui)

## Files Modified

- `packages/shared/src/validation/index.ts` — Added exports for new validation schemas
- `packages/shared/src/calculations/index.ts` — Added exports for calculation modules
- `packages/shared/src/calculations/cashflow.ts` — Made taxRate/monthlyDepreciation optional
- `packages/shared/package.json` — Added vitest dev dep + test script
- `packages/shared/vitest.config.ts` — Created vitest configuration
- `apps/nextjs/src/server/routers/_app.ts` — Registered 7 new routers
- `apps/nextjs/messages/de.json` — Added 7 i18n namespaces (tenants, loans, expenses, rentPayments, dunning, rentAdjustments, rentalUnits, cashflow)
- `apps/nextjs/messages/en.json` — Matching English translations
- `apps/nextjs/src/app/(app)/properties/[id]/page.tsx` — Replaced static rental units section with UnitsSection, added LoansSection, ExpensesSection, CashflowSection

## Maintenance Notes

- **Adding new expense categories**: Update `EXPENSE_CATEGORIES` in `packages/shared/src/types/expense.ts`, then add i18n keys in `expenses.categories` in both locale files.
- **Adding new dunning levels**: Update `DUNNING_LEVELS` in `packages/shared/src/types/dunning.ts`, add i18n keys in `dunning.levels`.
- **Cashflow accuracy**: Current cashflow is a simplified calculation. For production, consider feeding actual interest portions from amortization schedule rather than using full loan payment.
- **Rent payment generation**: `rentPayments.generateMonthly` creates expected payments for a given month/year. Consider adding a cron job to auto-generate monthly.

## Known Issues / Technical Debt

- Cashflow section computes everything client-side which may cause loading flicker as multiple queries resolve.
- No edit functionality for expenses or loans yet (only create/delete).
- Rent payment table loads all payments at once (pageSize: 50); may need proper pagination for long-term tenants.
- The `form.watch()` pattern in Select components triggers React Hook Form lint warnings (pre-existing pattern from Phase 1).

## Verification

- `pnpm --filter @repo/shared type-check` — PASS
- `pnpm --filter @repo/nextjs type-check` — PASS (0 errors)
- `pnpm -r lint` — PASS (0 errors, 14 pre-existing warnings)
- `pnpm --filter @repo/nextjs build` — PASS
- `pnpm --filter @repo/shared test` — PASS (19/19 tests)
