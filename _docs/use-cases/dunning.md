# Dunning Use Cases

Updated: 2026-05-01

## Actors

- Property manager: authenticated application user who manages tenants, rent payments, documents, and dunning records.
- Tenant: person assigned to a rental unit and optionally linked to overdue rent payments or claims.

## Entry Points

- Tenant detail page dunning section: create and review tenant-specific dunning records.
- Dunning reader route: `/tenants/[id]/dunning/[dunningId]` for PDF preview, download, archive, resolve, and cancel actions.
- Settings page dunning tab: configure federal state, late-payment thresholds, automation flag, and templates.

## UC-01 Create A Dunning Record From A Tenant

Preconditions:

- User is authenticated.
- Tenant belongs to the authenticated user.
- Tenant may have overdue rent payments.

Flow:

1. User opens a tenant detail page.
2. User opens the dunning creation dialog.
3. System loads claim suggestions from overdue rent payments.
4. System evaluates whether critical arrears require a termination warning.
5. User selects document type, dunning level, amount, dunning date, payment deadline, and optional suggested claims.
6. System creates explicit claims for selected suggestions.
7. System creates a dunning record with immutable subject/body snapshots.
8. System logs audit events for created claims and dunning record creation.

Postconditions:

- A dunning record exists for the tenant.
- Selected overdue payment suggestions are represented as claims and linked to the dunning record.
- The dunning history list refreshes.

## UC-02 Review, Download, And Archive A Dunning PDF

Preconditions:

- User owns the tenant and dunning record.
- Dunning record has generated subject/body snapshots.

Flow:

1. User opens a dunning record from the tenant dunning list.
2. System displays record metadata, linked claims, and letter preview.
3. User downloads a generated PDF.
4. System logs `download_dunning_pdf`.
5. User archives the generated PDF.
6. System uploads the PDF through the existing upload API, links the document to the dunning record, and marks the record archived.
7. System logs `archive_dunning_pdf`.

Postconditions:

- Download actions are auditable.
- Archived PDFs are linked to a document record and can be opened later.

## UC-03 Cancel Or Resolve A Dunning Record

Preconditions:

- User owns the dunning record.
- Record is not already cancelled or resolved.

Flow:

1. User opens the dunning reader route.
2. User chooses either cancel or mark resolved.
3. System updates record status and timestamp.
4. System logs the corresponding audit event.

Postconditions:

- Cancelled records store `cancelledAt`.
- Resolved records store `resolvedAt`.

## UC-04 Configure Dunning Settings And Templates

Preconditions:

- User is authenticated.

Flow:

1. User opens Settings and selects the dunning tab.
2. System ensures default user settings exist.
3. User adjusts the German federal state for business-day calculations, late-payment threshold, late-payment window, or automation flag.
4. User edits a template for document type, level, locale, and tone.
5. System persists settings/templates and logs dunning config audit events.

Postconditions:

- Future generated records use the matching template when one exists.
- Automation settings are stored, but no scheduler consumes them in the MVP.

## UC-05 Critical Arrears Warning

Preconditions:

- Tenant has overdue rent payments.
- Cold rent is available on the tenant record.

Flow:

1. System evaluates arrears against consecutive-term and two-cold-rent thresholds.
2. If thresholds are met, the dialog displays a legal-risk warning.
3. Router creates an open termination-warning alert if one does not already exist.

Postconditions:

- User is warned to stop regular dunning and seek legal review before termination-related steps.
- No termination is automated.

## Current MVP Boundaries

- No global dunning overview exists yet.
- No scheduler uses dunning settings yet.
- No claim reconciliation runs against future rent payment imports yet.
- No direct email sending of generated dunning PDFs exists yet.
- No legal-review approval workflow exists yet.
