# Phase 6: Documents & Reports (Hand-Off)

## Summary

Implemented Phase 6 of Immo Manager, covering:

- **Document Management**: Upload, categorize, rename, preview, and delete documents per property
- **PDF Export**: Three PDF report types using `@react-pdf/renderer` (Property Detail, Analysis Report, Dunning Letter)
- **Property Sharing**: Token-based share links with optional password protection and public read-only view
- **Email Attachment Back-Links**: Badge on email attachments showing which ones were already transferred to documents

## Key Decisions

1. **PDF Library**: `@react-pdf/renderer` chosen for client-side PDF generation — no server-side rendering needed, works with React component model
2. **Share Authentication**: Token-based with optional argon2id password hash, separate from main auth system. Public `verify` procedure validates token + password
3. **File Storage**: Filesystem-based at `uploads/{userId}/{propertyId}/{category}/{uuid}.{ext}`, consistent with existing thumbnail uploads
4. **Share Page**: Outside `(app)` and `(auth)` route groups, no sidebar/auth required. Shows basic property info only (no financial data)
5. **Email Back-Links**: Extended `documents` schema with `emailId` + `sourceFilename` columns to track document origin. Badge shown in attachment list via `getTransferredByEmail` query

## Files Created

### Backend

- `packages/shared/src/validation/document.ts` — Zod schemas for document/share operations
- `apps/nextjs/src/server/routers/documents.ts` — Documents tRPC router (list, getByProperty, update, delete, getStats, getTransferredByEmail)
- `apps/nextjs/src/server/routers/share-links.ts` — Share links tRPC router (create, list, delete, verify)

### Frontend - Documents

- `apps/nextjs/src/components/documents/upload-document-dialog.tsx` — Drag-and-drop multi-file upload with category selector
- `apps/nextjs/src/components/documents/document-preview.tsx` — Image zoom + PDF embed preview dialog
- `apps/nextjs/src/components/documents/document-actions.tsx` — Rename, recategorize, delete action dialogs
- `apps/nextjs/src/components/documents/documents-section.tsx` — Property detail page document section
- `apps/nextjs/src/app/(app)/documents/page.tsx` — Global documents page with search/filters/pagination

### Frontend - PDF

- `apps/nextjs/src/components/documents/pdf/property-detail-pdf.tsx` — Property detail report PDF
- `apps/nextjs/src/components/documents/pdf/analysis-report-pdf.tsx` — Analysis report PDF
- `apps/nextjs/src/components/documents/pdf/dunning-pdf.tsx` — Formal dunning letter PDF

### Frontend - Sharing

- `apps/nextjs/src/components/properties/share-link-dialog.tsx` — Create/manage share links dialog
- `apps/nextjs/src/app/share/[token]/page.tsx` — Public share page with password gate
- `apps/nextjs/src/app/api/share/[token]/route.ts` — Public API route serving shared property thumbnails

### Database

- `packages/shared/src/db/migrations/0001_sloppy_luminals.sql` — Migration adding emailId/sourceFilename to documents, userId/passwordHash to share_links

## Files Modified

- `packages/shared/src/validation/index.ts` — Added document validation export
- `packages/shared/src/db/schema/documents.ts` — Added emailId, sourceFilename columns
- `packages/shared/src/db/schema/share-links.ts` — Added userId, passwordHash columns
- `apps/nextjs/src/app/api/upload/route.ts` — Extended for document category uploads
- `apps/nextjs/src/server/routers/_app.ts` — Registered documents + shareLinks routers
- `apps/nextjs/src/server/routers/email.ts` — Transfer procedure now stores emailId/sourceFilename
- `apps/nextjs/src/app/(app)/properties/[id]/page.tsx` — Added share button + documents section
- `apps/nextjs/src/components/mail/attachment-list.tsx` — Added "Saved" badge for transferred attachments
- `apps/nextjs/src/middleware.ts` — Added `/api/share/` to public paths
- `apps/nextjs/messages/de.json` — Added documents, sharing, pdf namespaces + share/saved keys
- `apps/nextjs/messages/en.json` — Matching English translations

## Maintenance Notes

- **PDF Export Wiring**: The `generatePropertyPdf()`, `generateAnalysisReportPdf()`, and `generateDunningPdf()` export functions need to be wired to UI buttons (e.g., property detail page export button, analysis page export, dunning section "Generate PDF" button)
- **Migration**: Run `make db-push` to apply migration `0001_sloppy_luminals.sql` before deploying
- **Share link cleanup**: Expired links remain in DB — consider a cron job for periodic cleanup
- **Document search**: Currently searches by filename only; could be extended with full-text search

## Known Issues / Technical Debt

- Pre-existing `mailparser` module warnings during build (unrelated to Phase 6)
- Pre-existing lint warnings in email.ts and documents.ts (unused destructured variables)
- PDF components use hardcoded German labels in some places (stress test section, dunning level subjects) — should be fully i18n-ized if multi-language PDFs are needed
- Share page does not display a map even though coordinates are returned — could add lazy-loaded map component
