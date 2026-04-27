# Tasks Widget Layout Fix

Date: 2026-04-27

## Summary

The dashboard widget "Offene Aufgaben" (`tasks`) cut off task rows vertically and
wasted horizontal space because the inner `ScrollArea` had no real flex height
and tenant groups were rendered in a fixed `xl:grid-cols-2` grid even when only
one group was present. The widget now uses the full widget area, supports
variant-specific layouts (`xl` single column, `hero` two columns from the `xl`
breakpoint upward), sorts tasks by priority then due date, replaces the wide
status `Select` with a compact status `Badge` dropdown, and shows the full task
title via tooltip when truncated.

## Changes

- `apps/nextjs/src/components/dashboard/widgets/index.ts`: extended
  `WidgetComponentProps` with optional `variant?: WidgetSizeVariant`.
- `apps/nextjs/src/components/dashboard/bento/bento-widget.tsx`: passes
  `widget.variant` through to the dynamic widget component.
- `apps/nextjs/src/components/dashboard/widgets/tasks-widget.tsx`:
  - `CardContent` is now `flex-1 min-h-0 overflow-hidden p-0` so the inner
    `ScrollArea h-full` actually scrolls instead of clipping rows.
  - Tenant groups: `flex flex-col gap-3` for `xl`, `grid gap-3 xl:grid-cols-2`
    for `hero`.
  - Tasks per tenant are sorted client-side: priority (high → medium → low),
    then `dueDate` ascending (null last).
  - Status `Select` replaced with a `DropdownMenu` whose trigger is a colored
    `Badge` (variant per status). Compact (~80–96 px) leaving more room for the
    title.
  - Task title wrapped in `Tooltip` so the full title is visible on hover when
    truncated.
  - Empty/loading states now use `flex-1` instead of fixed `h-[120px]` so they
    fill the widget.
- `apps/nextjs/src/components/tasks/task-dialog.tsx`: moved the existing
  `eslint-disable react-hooks/set-state-in-effect` from a single-line directive
  above `useEffect` (where it had no effect on the actual `setForm` calls) to a
  block disable/enable around the effect. Pre-existing trivial fix surfaced by
  `make lint`.

## Key Decisions

- Sorting is done client-side rather than in `tasks.listGroupedByTenant` to
  keep this an isolated UI change without touching the tRPC contract.
- All open tasks remain visible (scroll inside the widget); no pagination/limit
  was introduced — matches the user's requirement to never hide work.
- Status as `Badge`+`DropdownMenu` (instead of a wider `Select`) maximises
  horizontal space for task titles, especially on the single-column `xl`
  variant.
- `xl` is single column; only `hero` opts into a two-column tenant grid (and
  only at the Tailwind `xl` breakpoint), so narrow dashboards never render
  half-empty rows.

## Maintenance Notes

- New widget variants (e.g. `xxl`) should reuse the existing `variant` prop
  pipeline: add to `WidgetSizeVariant`, then opt-in in `tasks-widget.tsx` by
  branching `groupListClass`.
- Adding a new task status requires updating `STATUS_BADGE_VARIANT` and the
  array in `<DropdownMenuContent>` inside `TaskRowItem`.
- If the `tasks.listGroupedByTenant` procedure starts returning a guaranteed
  ordering, the `sortTasks` helper can be removed.

## Known Issues / Tech Debt

- `dueDate` is sorted lexicographically; this assumes ISO `YYYY-MM-DD`. If the
  backend ever returns localized dates this will silently misorder.
- The status badge dropdown shows all four statuses unconditionally; "cancelled"
  may be uncommon enough to warrant moving behind a secondary action later.
- No unit/visual tests cover the widget; manual verification only.
