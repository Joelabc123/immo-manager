# 2025-07-14 - Customizable Dashboard with Drag-and-Drop Widgets

## Summary

Transformed the static dashboard into a fully customizable drag-and-drop widget system. Users can now add, remove, resize, and reorder 14 widgets on a 12-column CSS Grid. The layout is persisted as JSONB in the users table and auto-saved with debounce.

## Key Decisions

1. **@dnd-kit** for drag-and-drop (core + sortable + utilities + modifiers) - chosen for React 19 compatibility and SortableContext support.
2. **framer-motion** for layout animations with spring physics.
3. **12-column CSS Grid** with `auto-rows-[minmax(120px,auto)]` - each widget defines allowed sizes in grid units.
4. **JSONB column on users table** (`dashboard_layout`) - stores full `DashboardLayout` (widgets array + version) directly, avoiding a separate table.
5. **Widget registry with `next/dynamic`** - all 14 widgets are lazy-loaded for code splitting.
6. **No separate edit page** - inline edit mode toggle with toolbar (Pencil/Check), catalog sidebar (Sheet), and a confirm-to-reset pattern.
7. **Server-driven initial layout** - `localWidgets` state is `null` until user makes changes; falls back to server query data to avoid React ref-during-render issues.

## Architecture

### New Files

- `packages/shared/src/types/dashboard.ts` - Widget type system (WIDGET_TYPES, WidgetInstance, DashboardLayout, WIDGET_DEFINITIONS with size constraints, DEFAULT_DASHBOARD_LAYOUT)
- `packages/shared/src/validation/dashboard.ts` - Zod schemas for dashboard layout persistence
- `apps/nextjs/src/components/dashboard/dashboard-grid.tsx` - 12-column CSS Grid renderer with edit-mode grid overlay
- `apps/nextjs/src/components/dashboard/widget-wrapper.tsx` - Card wrapper with drag handle, remove, resize cycle, settings button
- `apps/nextjs/src/components/dashboard/dashboard-dnd-provider.tsx` - DndContext with PointerSensor (8px activation), SortableContext, DragOverlay
- `apps/nextjs/src/components/dashboard/dashboard-toolbar.tsx` - Edit toggle, add widget, reset with confirm state
- `apps/nextjs/src/components/dashboard/widget-catalog.tsx` - Sheet sidebar listing all 14 widget types
- `apps/nextjs/src/components/dashboard/widgets/index.ts` - Dynamic import registry mapping WidgetType to lazy components
- `apps/nextjs/src/components/dashboard/widgets/*.tsx` - 14 self-contained widget components (5 converted from existing, 9 new)
- `apps/nextjs/src/components/ui/bar-chart.tsx` - Recharts BarChart wrapper

### Modified Files

- `packages/shared/src/db/schema/users.ts` - Added `dashboardLayout` JSONB column
- `packages/shared/src/types/index.ts` - Re-export dashboard types
- `apps/nextjs/src/server/routers/dashboard.ts` - Added 11 new tRPC procedures (3 layout CRUD + 8 widget data queries)
- `apps/nextjs/src/app/(app)/dashboard/page.tsx` - Complete rewrite to use widget grid system
- `apps/nextjs/messages/de.json` - Added toolbar, catalog, and 14 widget i18n keys
- `apps/nextjs/messages/en.json` - Same i18n structure in English

### DB Migration

- `packages/shared/src/db/migrations/0003_lowly_stark_industries.sql` - `ALTER TABLE "users" ADD COLUMN "dashboard_layout" jsonb;`

## 14 Widgets

| Widget | Type Key | tRPC Procedure | Default Size |
|--------|----------|----------------|:------------:|
| KPI Bar | `kpi_bar` | `getKpis` (existing) | 12x1 |
| Health Score | `health_score` | `getKpis` (existing) | 6x2 |
| Wealth Forecast | `wealth_forecast` | `getWealthForecast` (existing) | 8x3 |
| Portfolio Allocation | `portfolio_allocation` | `getPortfolioAllocation` (existing) | 4x3 |
| Action Center | `action_center` | `getActionItems` (existing) | 12x3 |
| Rent Income Timeline | `rent_income_timeline` | `getRentIncomeTimeline` (new) | 6x2 |
| Vacancy Rate | `vacancy_rate` | `getVacancyRate` (new) | 4x2 |
| Upcoming Deadlines | `upcoming_deadlines` | `getUpcomingDeadlines` (new) | 4x2 |
| Rent Arrears | `rent_arrears` | `getRentArrears` (new) | 6x2 |
| Expenses by Category | `expenses_by_category` | `getExpensesByCategory` (new) | 6x2 |
| LTV Overview | `ltv_overview` | `getLtvOverview` (new) | 6x2 |
| Market Comparison | `market_comparison` | `getMarketComparison` (new) | 6x2 |
| Amortization Progress | `amortization_progress` | `getAmortizationProgress` (new) | 6x2 |
| Quick Actions | `quick_actions` | none (client-only) | 4x2 |

## Maintenance Notes

- Original dashboard components (`dashboard-kpi-bar.tsx`, `health-score-detail.tsx`, etc.) are preserved but no longer imported by `page.tsx`. They can be removed after confirming the widget versions work correctly.
- Widget components accept `{ config?: Record<string, unknown> }` props for future per-widget configuration (only `wealth_forecast` uses `config.growthRate` currently).
- To add a new widget: add to `WIDGET_TYPES` + `WIDGET_DEFINITIONS` in types, create widget component, register in `widgets/index.ts`, add tRPC procedure if needed, add i18n keys.

## Known Issues / Technical Debt

- The `_props` parameter in widget components triggers `@typescript-eslint/no-unused-vars` warnings (13 instances). The `_` prefix convention is not configured in the ESLint config to be ignored.
- Pre-existing `profile-section.tsx` type error was fixed (missing `email` and `emailSignature` in `updateProfile` mutation call).
- Widget reordering swaps positions between two widgets; a more sophisticated grid collision/placement algorithm could be added for free-form positioning.
- No undo/redo for layout changes (by design decision).
- Responsive grid behavior not yet implemented - widgets use fixed column counts on all screen sizes.
