# Email-to-Task Workflow + Tasks Dashboard Widget

Date: 2026-04-27

## Summary

Implemented a tasks domain with end-to-end UX:

1. New `tasks` table with status, priority, category, due date, and optional links to tenant, property, rental unit, source email, and assignee user.
2. tRPC `tasks` router exposing list / listGroupedByTenant / getById / create / update / updateStatus / delete / countsByEmailIds / openCount.
3. Reusable `TaskDialog` (create + edit) with prefill from an email source (subject -> title, text body -> description truncated 2000 chars, tenantId carried over, sourceEmailId linked).
4. Dashboard widget `tasks` ("Offene Aufgaben") rendering tasks grouped by tenant. Available variants: `xl`, `hero` (matching Action Center options).
5. Mail integration:
   - "+ Task" button in `mail-reader.tsx` header opening the dialog with email context.
   - Task count badge per email row in `email-list.tsx` via batched `countsByEmailIds` query.
6. New full `/tasks` page route with search/status/priority filters and inline status toggle.
7. Audit logging + Redis pub/sub (`task:updated`) on every task mutation.
8. i18n keys added in both `de.json` and `en.json` (nav, dashboard.tasks, dashboard.widgets.tasks, dashboard.bento.widget.tasks, tasks.\*, email.createTask/taskCreated).

## Key decisions

- **No AI prefill yet.** Dialog only mirrors raw subject/body. Hook for future AI step is a no-op slot in `TaskDialog` (`fromEmail` prop already isolates the prefill source).
- **Per-user scoping only.** Every query filters by `eq(tasks.userId, ctx.user.id)`. No multi-tenant org separation introduced.
- **Auto-resolve property/rental unit from tenant** in mutations so callers do not need to pass redundant ids.
- **Status -> done sets `completedAt = now`**, otherwise it is cleared. Avoids stale completion timestamps when a task is reopened.
- **Widget grouping by tenant**: groups returned from server (already joined) to avoid N+1 hydration on the client. "Ohne Mieter" group renders for tasks without `tenantId`.
- **Two-column grid** (`xl:grid-cols-2`) on widget for the `xl` and `hero` variants — visually consistent with Action Center.
- **Eslint-disable for `react-hooks/set-state-in-effect`** in `TaskDialog`: the form-init effect intentionally hydrates from server-fetched `existing` task or from `fromEmail`. Using a derived-state-during-render variant would require a sentinel ref and an extra render — not worth it for an init pattern.

## Files

### New

- `packages/shared/src/db/schema/tasks.ts`
- `packages/shared/src/types/tasks.ts`
- `packages/shared/src/validation/tasks.ts`
- `packages/shared/src/db/migrations/0007_rapid_fenris.sql`
- `apps/nextjs/src/server/routers/tasks.ts`
- `apps/nextjs/src/components/tasks/task-dialog.tsx`
- `apps/nextjs/src/components/dashboard/widgets/tasks-widget.tsx`
- `apps/nextjs/src/app/(app)/tasks/page.tsx`

### Modified

- `packages/shared/src/utils/redis.ts` (added `TASK_UPDATED` channel + `TaskUpdatedPayload`)
- `packages/shared/src/types/audit.ts` (added `task` entity type)
- `packages/shared/src/types/dashboard.ts` (added `tasks` widget definition)
- `apps/nextjs/src/server/routers/_app.ts` (registered `tasks` router)
- `apps/nextjs/src/components/dashboard/widgets/index.ts` (registered tasks widget)
- `apps/nextjs/src/components/app-shell.tsx` (added "Tasks" nav entry)
- `apps/nextjs/src/components/mail/mail-reader.tsx`
- `apps/nextjs/src/components/mail/email-list.tsx`
- `apps/nextjs/src/components/mail/email-list-item.tsx`
- `apps/nextjs/messages/de.json`, `apps/nextjs/messages/en.json`

## Future maintenance / extension

- **Assignee UI** — schema already supports `assigneeUserId`. Currently always equals `userId`. Add a UI selector once teams/multi-user is rolled out.
- **Recurring tasks** — out of scope. Add `recurrence` enum + cron job in `apps/email` or a dedicated worker.
- **AI prefill** — wire a server procedure `tasks.draftFromEmail({ emailId })` returning suggested title/category/priority. Call from `TaskDialog` when `fromEmail` is set, on a debounced "Vorschlag generieren" button or on dialog open.
- **Notifications** — `task:updated` events are already published. Subscribe in WebSocket gateway to push toasts for shared workspaces in the future.
- **Dashboard variants** — add `m` / `l` if a denser layout is requested. Constants are in `packages/shared/src/types/dashboard.ts`.

## Known issues / technical debt

- `Select` filters in `/tasks` page use the project's render-prop convention; some labels resolve through `tStatus(value)`. If a value is unknown, fallback empty string is shown. Keep status enum and i18n in sync.
- Task counts on email list re-fetch on every page change (no global cache prefill). Acceptable at current page size.
- No bulk operations (multi-select). Could be added with checkbox column on `/tasks`.
- No drag-and-drop reordering / kanban. Status transitions are dropdown-driven.
- Migration `0007_rapid_fenris.sql` applied locally. Ensure CI runs `db:generate` then `db:push` against a fresh DB before promoting.

## Verification

- `cmd /c "pnpm -r type-check"` — clean across all packages.
- `cmd /c "pnpm -r lint"` — only pre-existing warnings unrelated to tasks remain (unused `Input` imports in 4 unrelated files).
- `cmd /c "pnpm --filter @repo/nextjs build"` — successful, 22 static pages generated.
