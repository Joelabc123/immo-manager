# Mail Compose, Property Editing, and Dunning MVP

Date: 2026-05-01

## Summary

Implemented the first slice of the requested feature package:

1. Free compose flow under `/mail/compose` with tenant recipient picker, CC/BCC, Tiptap editing, template insertion, AI draft improvement, local draft persistence, and outbound send through the existing mail account infrastructure.
2. Property detail editing improvements for rental units, loans, expenses, and property notes, including translated select values and additional audit coverage for recurring expense interval changes.
3. Dunning MVP covering claims, dunning records, dunning templates/settings, German business-day calculations, termination warning detection, PDF generation/download/archive, and a tenant-level dunning entry point.

## Changes

### Mail Compose

- Added `/mail/compose` and a primary entry button from `/mail`.
- Added `MailComposeEditor` with account selection, recipient chips, tenant email lookup, CC/BCC, subject/body editing, template insertion, localStorage draft persistence, send, and AI improvement.
- Added `RecipientPicker` backed by `tenants.emailRecipients` for tenant email discovery with tenant/property context.
- Extended the AI router/service with `improveEmailDraft`, using the same rate-limit and audit path as the existing AI features.

### Property Editing

- Rental units can be edited in-place, and clicking an assigned unit navigates to the tenant page.
- Loans can be edited with existing amortization-relevant optional fields preserved (`interestFixedUntil`, `annualSpecialRepaymentLimit`).
- Expenses can be edited, including recurring state and interval.
- Property notes can be edited from the property detail page, including clearing notes to an empty string.
- Property/share/expense select controls now render translated labels in `SelectValue` and `SelectItem.label`.

### Dunning MVP

- Added `claims`, `dunning_settings`, `dunning_level_configs`, `dunning_templates`, `dunning_alerts`, and the `dunning_record_claims` join table.
- Extended `dunning_records` with document type, status, payment deadline, subject/body snapshots, fee/total amount, archive/resolve/cancel timestamps, and document linkage.
- Added migration `packages/shared/src/db/migrations/0008_yummy_viper.sql` and applied it locally with `db:push`.
- Added shared dunning types, validation schemas, and dunning calculation helpers with tests.
- Replaced the minimal dunning router with procedures for records, claims, suggestions, PDF archiving/logging, settings, level configs, and templates.
- Added tenant dunning UI, dunning reader route, settings tab, snapshot renderer, and snapshot PDF generation/download/archive support.

## Key Decisions

- **Compose remains part of the existing mail service.** Sending still goes through `email.send`, so SMTP configuration, signatures, tenant/property metadata, and list invalidation stay centralized.
- **AI compose improvement does not send or invent content.** The prompt improves grammar, spelling, clarity, and structure while preserving facts. The application still appends the user's signature during send.
- **Dunning records store immutable text snapshots.** Generated subject/body are stored on the record so PDFs and audit history do not change when templates are edited later.
- **Claims are explicit records.** Claim suggestions from overdue rent payments are converted into claims before linking to a dunning record, which gives future workflows a stable object to update, cancel, or reconcile.
- **Termination thresholds warn, not automate.** If critical arrears are detected, the UI shows a legal-risk warning and the router creates an open alert. The current MVP does not proceed with automated termination steps.
- **German date logic uses UTC date-only math.** Utility due dates and business-day calculations avoid local timezone drift, which already caused a test failure on Windows.
- **React Compiler rules guided form state.** The dunning settings form avoids copying query data into state via effects; it uses derived values plus overrides and an uncontrolled keyed template form.

## Future Maintenance / Extension

- Add a dedicated dunning overview page for all tenants, claims, alert queues, and bulk follow-up actions.
- Add claim reconciliation against future rent payment imports so linked claims can move from open to partial/paid automatically.
- Add legal-review workflow states before any termination-related document can be sent or archived.
- Extend dunning templates with per-document placeholders surfaced in the settings UI.
- Add direct email sending of generated dunning PDFs once legal review, attachment handling, and delivery logging are specified.
- Keep the dunning API, use-case, and architecture docs in sync as automation and legal-review features are added.

## Known Issues / Technical Debt

- Dunning is an MVP and is still manually driven. Settings prepare automation but no scheduler uses them yet.
- `createDraft` currently creates records with status `created`; if a true editable draft lifecycle is needed, the procedure/status transition should be tightened.
- Claim suggestions currently focus on overdue rent payments and use an operating-cost-advance claim type for generated suggestions; refine claim classification when rent component data is split more granularly.
- PDF snapshot labels include a few hard-coded German strings and should eventually be fully localized.
- Dunning API, use-case, and architecture docs now describe the MVP only; update them before adding automation, direct sending, or legal-review states.

## Verification

- `cmd /c "pnpm --filter @repo/shared test"` - all shared tests passed, including `dunning.test.ts`.
- `cmd /c "pnpm --filter @repo/shared db:generate"` - generated `0008_yummy_viper.sql`.
- `cmd /c "pnpm --filter @repo/shared db:push"` - applied migration to the local dev database.
- `cmd /c "pnpm format-check"` - passed after applying Prettier to reported files.
- `cmd /c "pnpm -r type-check"` - passed across shared, email, nextjs, and websocket.
- `cmd /c "pnpm -r lint"` - passed cleanly.
- `cmd /c "pnpm build"` - Next.js production build passed.
