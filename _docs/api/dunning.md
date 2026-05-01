# Dunning API

Updated: 2026-05-01

## Scope

The dunning API is exposed through the protected tRPC router `dunning`. It covers manual claim management, dunning record creation, dunning PDF audit actions, and user-specific dunning settings/templates.

Primary implementation files:

- `apps/nextjs/src/server/routers/dunning.ts`
- `apps/nextjs/src/server/services/dunning.ts`
- `packages/shared/src/validation/dunning.ts`
- `packages/shared/src/types/dunning.ts`
- `packages/shared/src/db/schema/claims.ts`
- `packages/shared/src/db/schema/dunning-records.ts`
- `packages/shared/src/db/schema/dunning-config.ts`

## Authentication And Ownership

All procedures use `protectedProcedure` and require an authenticated user.

Tenant-scoped operations verify ownership through the tenant record. Claim and dunning record operations join back to `tenants.userId`, so a user cannot access or mutate another user's claims or dunning records.

Document archive operations additionally verify that the target document belongs to the authenticated user.

## Record Procedures

| Procedure                     | Type     | Purpose                                                                                                            |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `dunning.create`              | mutation | Legacy-compatible rent dunning creation. Creates a rent dunning record without linked claims.                      |
| `dunning.createDraft`         | mutation | Creates a dunning record from document type, level, amount, deadline, optional subject/body, and linked claim IDs. |
| `dunning.list`                | query    | Lists dunning records for the authenticated user, optionally filtered by tenant, document type, or status.         |
| `dunning.getById`             | query    | Loads one dunning record with tenant context, linked claims, and archived document metadata.                       |
| `dunning.updateDraft`         | mutation | Updates editable record fields unless the record is archived.                                                      |
| `dunning.cancel`              | mutation | Marks a dunning record as cancelled and stores `cancelledAt`.                                                      |
| `dunning.markResolved`        | mutation | Marks a dunning record as resolved and stores `resolvedAt`.                                                        |
| `dunning.archiveGeneratedPdf` | mutation | Links an uploaded document to a dunning record and marks it archived.                                              |
| `dunning.logDownload`         | mutation | Writes an audit event when a generated PDF is downloaded.                                                          |

Important MVP note: `createDraft` currently stores records with status `created`. A true draft status and explicit publish transition are not implemented yet.

## Claim Procedures

| Procedure                      | Type     | Purpose                                                                                 |
| ------------------------------ | -------- | --------------------------------------------------------------------------------------- |
| `dunning.listClaims`           | query    | Lists claims for a tenant, optionally filtered by status.                               |
| `dunning.listClaimSuggestions` | query    | Returns overdue rent-payment suggestions and termination-warning metadata for a tenant. |
| `dunning.createClaim`          | mutation | Creates a claim after validating tenant, property, and rental-unit ownership context.   |
| `dunning.updateClaim`          | mutation | Updates claim fields and records audit diffs.                                           |
| `dunning.cancelClaim`          | mutation | Marks a claim as cancelled.                                                             |

Claim suggestions currently derive from overdue rent payments where status is not `paid`. Suggestions are converted into explicit claims before they are linked to a dunning record.

## Settings And Template Procedures

| Procedure                   | Type     | Purpose                                                                                           |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `dunning.getSettings`       | query    | Ensures default settings exist, then returns settings, level configs, and templates for the user. |
| `dunning.updateSettings`    | mutation | Updates default federal state, late-payment thresholds, window months, and automation flag.       |
| `dunning.upsertLevelConfig` | mutation | Creates or updates a per-user document type and level configuration.                              |
| `dunning.upsertTemplate`    | mutation | Creates or updates a per-user document type, level, locale, and tone template.                    |

Settings are user scoped. They currently prepare automation, but no scheduler consumes them yet.

## Audit Events

The router writes audit entries for the following actions:

- `create_dunning`
- `update_dunning`
- `cancel_dunning`
- `resolve_dunning`
- `archive_dunning_pdf`
- `download_dunning_pdf`
- `create_claim`
- `update_claim`
- `cancel_claim`
- `update_dunning_config`

Entity types are `dunning_record`, `claim`, and `dunning_config`.

## Data Contracts

The shared validation file exports the canonical Zod schemas and inferred TypeScript types. API consumers should import shared validation/types instead of duplicating string unions.

Key shared constants include:

- `DUNNING_DOCUMENT_TYPES`
- `DUNNING_LEVELS`
- `DUNNING_STATUSES`
- `DUNNING_TEMPLATE_TONES`
- `CLAIM_TYPES`
- `CLAIM_STATUSES`
- `CLAIM_SOURCES`
- `GERMAN_FEDERAL_STATES`
