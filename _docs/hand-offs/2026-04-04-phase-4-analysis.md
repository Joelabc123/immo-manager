# Phase 4: Analyse-Module (Financial Simulation Cockpit)

## Summary

Phase 4 adds a comprehensive financial analysis cockpit to Immo Manager. It provides four simulation tools (interest rate stress test, special repayment calculator, refinancing optimizer, exit strategy planner) plus a portfolio vitality overview. All tools are available on a single scrollable page with sticky sidebar navigation.

## Key Decisions

1. **Pure calculation functions**: All simulation logic lives in `packages/shared/src/calculations/` (stress-test, special-repayment, refinancing, exit-strategy). Functions are pure with no DB dependency, enabling easy unit testing and reuse across services.

2. **Single-page analysis cockpit**: Instead of separate pages per tool, all five sections live on `/analysis` with IntersectionObserver-based active section highlighting. Desktop uses a sticky sidebar nav; mobile uses fixed top tabs.

3. **No VFE (Vorfaelligkeitsentschaedigung)**: Refinancing and exit strategy calculators deliberately omit early repayment penalties. These are highly bank-specific and would add complexity without reliable accuracy.

4. **HealthScoreResult uses `score` field**: The `HealthScoreResult` interface from the health-score calculation module uses `score` (not `overall`). The router and UI consistently reference `healthScore.score`.

5. **Speculation tax uses 10-year rule**: Exit strategy implements the German Spekulationssteuer rule — sales after 10 years of ownership are tax-free. Depreciation recapture is included in taxable gains.

6. **ETF comparison in special repayment**: The special repayment calculator includes an ETF comparison pathway (compound growth with 25% capital gains tax) to help users decide between prepaying loans vs. investing.

7. **Values in cents/basis points**: Consistent with the project convention, all monetary values are in cents (integer) and all rates in basis points (integer, e.g. 200 = 2%).

8. **Native range inputs for sliders**: All parameter sliders use native `<input type="range">` elements since no shadcn Slider component exists in the project.

## Files Created

### Calculation Engine (packages/shared/src/calculations/)

- `stress-test.ts` — `calculateStressTest()`: DSCR calculation, break-even rate via binary search, per-year interest cost comparison
- `special-repayment.ts` — `calculateSpecialRepayment()`: Amortization comparison with/without special repayment, ETF compound growth with capital gains tax
- `refinancing.ts` — `calculateRefinancing()`: Old vs. new rate comparison per loan, amortization point calculation, aggregated savings
- `exit-strategy.ts` — `calculateExitStrategy()`: Compound appreciation projection, speculation tax check (10-year rule), depreciation recapture, timeline/chart data

### Validation Schemas (packages/shared/src/validation/)

- `analysis.ts` — `stressTestInput`, `specialRepaymentInput`, `refinancingInput`, `exitStrategyInput` with Zod schemas and default values

### Unit Tests (packages/shared/tests/)

- `stress-test.test.ts` — 9 tests: DSCR, break-even, cashflow delta, multi-loan, empty array
- `special-repayment.test.ts` — 11 tests: interest saved, months saved, limit enforcement, ETF comparison, winner determination
- `refinancing.test.ts` — 7 tests: savings at lower rate, worthIt logic, aggregation, empty array
- `exit-strategy.test.ts` — 11 tests: appreciation, broker fee, speculation tax, timeline, zero loan

### tRPC Router (apps/nextjs/src/server/routers/)

- `analysis.ts` — 6 procedures:
  - `getPortfolioVitality`: Health score + break-even rates + refinancing risk
  - `getStressTest`: Portfolio-wide + per-property stress test
  - `getSpecialRepaymentAnalysis`: Per-loan special repayment vs. ETF
  - `getRefinancingAnalysis`: All loans refinancing comparison
  - `getExitStrategy`: Per-property exit with speculation tax
  - `getLoansForAnalysis`: Loan selector data for UI

### UI Components (apps/nextjs/src/components/analysis/)

- `portfolio-vitality.tsx` — Health score display with color-coded status, sub-metrics with Progress bars, refinancing risk with timeframe selector, break-even rates per property
- `stress-test-section.tsx` — Scenario rate slider, KPI cards (cashflow delta, DSCR, break-even), AreaChart with baseline vs. scenario, per-property table
- `special-repayment-section.tsx` — Loan selector, amount/rate sliders, winner card (special repayment vs. ETF), summary KPIs, AreaChart with balance comparison
- `refinancing-section.tsx` — New rate slider, refinancing costs input, aggregated savings KPI, per-loan table with worthIt indicator
- `exit-strategy-section.tsx` — Sale year/appreciation/broker/tax sliders, per-property cards with speculation tax status, KPI cards, AreaChart (projected value vs. remaining balance vs. net equity)

### UI Primitives (apps/nextjs/src/components/ui/)

- `progress.tsx` — Simple div-based progress bar component (created because it was missing)

### Page (apps/nextjs/src/app/(app)/analysis/)

- `page.tsx` — Single-page layout with sticky sidebar nav (desktop) and fixed top tabs (mobile), IntersectionObserver for active section, PDF export placeholder

## Files Modified

- `packages/shared/src/calculations/index.ts` — Added 4 new calculation exports
- `packages/shared/src/types/common.ts` — Added `refinancing` to `SCENARIO_MODULES`
- `packages/shared/src/validation/index.ts` — Added `export * from "./analysis"`
- `apps/nextjs/src/server/routers/_app.ts` — Registered `analysisRouter`
- `apps/nextjs/src/components/app-shell.tsx` — Added "Analyse" nav item with BarChart3 icon
- `apps/nextjs/messages/de.json` — Added `analysis` nav key + full `analysis` namespace (German translations)
- `apps/nextjs/messages/en.json` — Added `analysis` nav key + full `analysis` namespace (English translations)

## Maintenance Notes

- **Adding new simulation tools**: Create calculation in `packages/shared/src/calculations/`, add validation in `analysis.ts`, add router procedure, create UI component, register in page.tsx SECTIONS array, add i18n keys.
- **PDF export**: The export button is a disabled placeholder. Implementation requires a PDF generation library (e.g. @react-pdf/renderer or html2canvas + jspdf).
- **Chart component**: All charts use the project's `AreaChart` wrapper which accepts `areas` (with `key`, `label`, `color`) and `xAxisKey` props — not raw Recharts.

## Known Issues / Technical Debt

- PDF export button is disabled (placeholder only).
- No loading states for individual sections — each section shows its own Skeleton independently.
- AreaChart data is passed in cents from the router; stress-test and special-repayment sections pass raw cents (formatted by AreaChart's formatYAxis), while exit-strategy passes raw cents too. All consistent.
- The `getStressTest` perProperty array can contain `null` entries for properties without loans. UI filters these with `.flatMap()`.

## Test Results

- 82/82 tests pass (38 new from Phase 4)
- Type-check: PASS (shared + nextjs)
- Lint: PASS (shared + nextjs)
- Build: PASS (nextjs)
