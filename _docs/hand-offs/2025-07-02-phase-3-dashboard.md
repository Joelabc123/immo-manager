# Phase 3: Dashboard

**Date:** 2025-07-02
**Scope:** Full dashboard with KPI overview, health score, wealth forecast, portfolio allocation, and action center.

## Summary

Implemented the Phase 3 Dashboard feature for the Immo Manager portfolio management app. The dashboard provides a comprehensive overview of the user's real estate portfolio with interactive charts, a health score system, wealth projections, and an actionable risk/opportunity center.

## Key Decisions

### Calculation Engine (Pure Functions)

- All three calculation modules (`health-score`, `wealth-forecast`, `action-center-rules`) are pure functions in `@repo/shared/calculations/` with no database dependencies.
- Health score uses a 3-metric weighted average (cashflow, LTV, yield) with user-configurable weights stored on the `users` table.
- Wealth forecast reuses the existing `calculateAmortizationSchedule()` for loan projections rather than duplicating amortization logic.
- Action center rules engine takes pre-fetched data as input, making it fully testable without mocking DB.

### Chart Library

- Chose **Recharts** as the charting library (installed in `@repo/nextjs`).
- Created two Tremor Raw-style wrapper components (`AreaChart`, `DonutChart`) in `components/ui/` for consistent styling.

### Rent Potential Benchmark

- Uses a simple 6 EUR/sqm benchmark for rent potential detection. No Mietspiegel API integration yet — this is flagged as future enhancement.

### No Schema Changes Required

- All necessary DB tables (`scenarios`, `actionCenterDismissed`, user weight columns) already existed from Phase 0/1/2.

## New Files Created

### Calculations (`packages/shared/src/calculations/`)

- `health-score.ts` — Portfolio health score (0-100) with cashflow, LTV, yield sub-scores
- `wealth-forecast.ts` — Multi-year wealth projection with compound growth, amortization, rent growth, inflation
- `action-center-rules.ts` — Pure function rules engine with 7 rule types (vacancy, negative cashflow, overdue rent, interest binding expiry, contract expiry, rent potential, special repayment)

### Validation (`packages/shared/src/validation/`)

- `dashboard.ts` — Zod schemas for dashboard inputs (wealth forecast params, dismiss/save/update scenario)

### tRPC Routers (`apps/nextjs/src/server/routers/`)

- `dashboard.ts` — 5 queries + 2 mutations: getKpis, getWealthForecast, getPortfolioAllocation, getActionCenterItems, dismissActionItem, undismissActionItem
- `scenarios.ts` — Full CRUD for named scenarios (list, getById, create, update, delete)

### UI Components (`apps/nextjs/src/components/`)

- `ui/area-chart.tsx` — Recharts area chart wrapper
- `ui/donut-chart.tsx` — Recharts donut/pie chart wrapper
- `dashboard/dashboard-kpi-bar.tsx` — 5 KPI cards (net worth, cashflow, health score, portfolio value, optimization potential)
- `dashboard/health-score-detail.tsx` — Collapsible sub-metrics with progress bars
- `dashboard/wealth-forecast-chart.tsx` — Interactive stacked area chart with sliders
- `dashboard/portfolio-allocation-chart.tsx` — Donut chart with value/count toggle
- `dashboard/action-center.tsx` — Two-column risk/opportunity cards with dismiss

### Page

- `apps/nextjs/src/app/(app)/dashboard/page.tsx` — Dashboard page composing all sections

### Tests (`packages/shared/tests/`)

- `health-score.test.ts` — 7 tests
- `wealth-forecast.test.ts` — 7 tests
- `action-center-rules.test.ts` — 11 tests

## Modified Files

- `packages/shared/src/calculations/index.ts` — Added exports for new modules
- `packages/shared/src/validation/index.ts` — Added dashboard export
- `packages/shared/src/types/common.ts` — Added `ACTION_CENTER_RULE_TYPES`, `ActionCenterRuleType`, `ActionCenterSeverity`
- `packages/shared/src/utils/formatting.ts` — Added `formatCompactCurrency()`
- `packages/shared/src/utils/index.ts` — Added `formatCompactCurrency` export
- `apps/nextjs/src/server/routers/_app.ts` — Registered dashboard and scenarios routers
- `apps/nextjs/src/app/(app)/page.tsx` — Changed redirect from `/properties` to `/dashboard`
- `apps/nextjs/messages/de.json` — Added `dashboard` translation section
- `apps/nextjs/messages/en.json` — Added `dashboard` translation section

## Verification Results

- **Type-check** (`@repo/shared`): Pass
- **Type-check** (`@repo/nextjs`): Pass
- **Lint** (all): Pass (0 errors, warnings are pre-existing)
- **Tests** (`@repo/shared`): 44/44 pass (25 new)
- **Build** (`@repo/nextjs`): Compilation success (SSR page collection requires DB connection)

## Known Issues / Technical Debt

1. **Rent potential benchmark** is hardcoded at 6 EUR/sqm. Future: integrate Mietspiegel data or make user-configurable.
2. **Optimization potential KPI** currently shows 0 — needs to aggregate action center impact sums.
3. **Build requires DB** — `next build` page collection phase needs a running PostgreSQL instance for SSR pages.
4. **Health score weights** default to 34/33/33 on the dashboard page rather than reading user preferences. The router returns them but the page hardcodes fallbacks.
5. **Wealth forecast performance** — For large portfolios with many loans, the amortization schedule recalculation per year could be slow. Consider caching or approximation.

## Maintenance Notes

- To add new action center rules: add the rule type to `ACTION_CENTER_RULE_TYPES` in `common.ts`, implement the evaluator function in `action-center-rules.ts`, add it to the `evaluateActionCenterRules` aggregation, add icon mapping in `action-center.tsx`, and add i18n keys.
- Health score formula can be tuned by modifying the `calculateCashflowScore`, `calculateLtvScore`, and `calculateYieldScore` functions.
- Wealth forecast parameters (growth/inflation/rent growth rates) are user-adjustable via sliders on the frontend.
