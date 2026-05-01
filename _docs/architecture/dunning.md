# Dunning Architecture

Updated: 2026-05-01

## Overview

The dunning MVP is a manually driven workflow layered on top of existing tenants, rent payments, documents, audit logs, and user settings. It introduces explicit claims and dunning records so generated letters can be audited, archived, and extended into automation later.

## Component Boundaries

| Layer            | Files                                                                                | Responsibility                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Shared types     | `packages/shared/src/types/dunning.ts`                                               | Single source of truth for document types, statuses, claim types, claim sources, federal states, and template tones.           |
| Validation       | `packages/shared/src/validation/dunning.ts`                                          | Zod input schemas and inferred API types.                                                                                      |
| Calculations     | `packages/shared/src/calculations/dunning.ts`                                        | German business-day helpers, utility due-date calculation, late-payment pattern detection, and termination-warning thresholds. |
| Database schema  | `packages/shared/src/db/schema/claims.ts`, `dunning-records.ts`, `dunning-config.ts` | Persistent claims, dunning records, record-claim links, settings, level configs, templates, and alerts.                        |
| Router           | `apps/nextjs/src/server/routers/dunning.ts`                                          | Auth, ownership checks, mutations/queries, audit logging, and orchestration.                                                   |
| Snapshot service | `apps/nextjs/src/server/services/dunning.ts`                                         | Template lookup fallback rendering and placeholder replacement.                                                                |
| Tenant UI        | `apps/nextjs/src/components/tenants/dunning-section.tsx`                             | Tenant-level dunning history, suggestion selection, warning display, and create dialog.                                        |
| Reader UI        | `apps/nextjs/src/app/(app)/tenants/[id]/dunning/[dunningId]/page.tsx`                | Record preview, PDF download/archive, resolve, cancel, and archived PDF access.                                                |
| Settings UI      | `apps/nextjs/src/components/settings/dunning-config-section.tsx`                     | User-specific dunning settings and template editing.                                                                           |
| PDF generation   | `apps/nextjs/src/components/documents/pdf/dunning-pdf.tsx`                           | Snapshot PDF rendering, blob creation, and download.                                                                           |

## Data Model

Core entities:

- `claims`: explicit receivables connected to tenants and optionally properties/rental units.
- `dunning_records`: generated dunning documents with immutable subject/body snapshots and lifecycle status.
- `dunning_record_claims`: many-to-many join between records and claims with included amount.
- `dunning_settings`: user-scoped defaults for business-day and late-payment behavior.
- `dunning_level_configs`: user-scoped per-document-type/per-level configuration.
- `dunning_templates`: user-scoped templates by document type, level, locale, and tone.
- `dunning_alerts`: tenant-scoped warnings such as termination-risk alerts.

Relationship summary:

- A tenant can have many claims.
- A tenant can have many dunning records.
- A dunning record can include many claims.
- A claim can appear in many dunning records, though current UI links selected suggestions once.
- A dunning record can link one archived document.
- Settings, level configs, and templates belong to a user.

## Creation Flow

1. UI calls `dunning.listClaimSuggestions` for a tenant when the create dialog opens.
2. Router loads tenant context and overdue rent payments.
3. Shared calculations evaluate termination warning thresholds.
4. UI lets the user select suggestions, document type, level, amount, dates, and deadline.
5. UI creates selected claims through `dunning.createClaim`.
6. UI calls `dunning.createDraft` with claim IDs.
7. Router validates claim ownership and tenant ownership.
8. Router loads a matching template or falls back to default text.
9. Snapshot service renders subject/body with placeholders.
10. Router inserts `dunning_records` and `dunning_record_claims` in a transaction.
11. Router writes audit events.

## PDF Archive Flow

1. Reader UI loads `dunning.getById`.
2. UI maps record snapshot data into `DunningSnapshotPdfData`.
3. User downloads or archives a PDF.
4. Download calls `dunning.logDownload` before generating the client-side PDF download.
5. Archive generates a PDF blob, uploads it through `/api/upload`, then calls `dunning.archiveGeneratedPdf` with the returned document ID.
6. Router verifies document ownership, links it to the record, marks status `archived`, and logs audit.

## Audit Strategy

Dunning uses the existing audit service. Record, claim, and configuration changes use dedicated action constants so the audit UI can translate them. Updates call `diffChanges` where field-level differences are useful.

Audit entity types:

- `dunning_record`
- `claim`
- `dunning_config`

## Date And Legal-Risk Handling

Business-day calculations use `date-holidays` with German federal-state subdivisions. Date-only calculations use UTC date construction to avoid local timezone drift on Windows and CI environments.

Termination-risk behavior is intentionally conservative. The system warns and creates an alert, but it does not automate termination or send legal documents.

## Extension Points

- Add a global dunning overview by querying `dunning.list` without tenant filtering and adding claim/alert summaries.
- Add a scheduler that consumes `dunning_settings` and `dunning_level_configs` after legal review and notification rules are defined.
- Add claim reconciliation by comparing future rent payment imports against open claims and moving claims to partial or paid.
- Add legal-review states before termination-related document types can be sent or archived.
- Add direct email delivery by reusing the existing mail send infrastructure and attaching archived/generated PDFs.

## Known Constraints

- The MVP stores `createDraft` records as `created`, not `draft`.
- Default server-side fallback templates still contain transliterated German strings and should be localized.
- Claim suggestions currently focus on overdue rent payments and need more granular claim classification later.
