# Phase 5: E-Mail-System & Benachrichtigungen

## Summary

Phase 5 adds a complete email system and notification infrastructure to Immo Manager. It includes IMAP/SMTP email account management with AES-256-GCM encrypted credentials, automatic email sync with tenant/property matching, a threaded inbox UI with Tiptap rich-text reply editor, email templates, opt-in tracking pixels, attachment transfer to the document system, in-app notifications with browser push support, and real-time WebSocket updates.

## Key Decisions

1. **AES-256-GCM encryption for email credentials**: IMAP/SMTP passwords are encrypted at rest using AES-256-GCM with a server-side key (`EMAIL_ENCRYPTION_KEY` env var). The shared crypto module (`packages/shared/src/utils/crypto.ts`) provides `encryptCredential`/`decryptCredential` functions. Each credential gets a unique IV and auth tag stored alongside the ciphertext.

2. **Cron-based IMAP sync in Next.js**: Email sync runs as a `node-cron` job (`*/15 * * * *`) within the Next.js server process rather than a separate service. The `syncAllEmailAccounts()` function iterates all accounts, connects via ImapFlow, and fetches new emails since the last sync timestamp.

3. **Tenant matching via email address**: Incoming emails are matched to tenants by looking up the sender's email in the `tenantEmails` table. Thread detection uses `In-Reply-To` headers first, with a subject-stripping fallback (`Re:`, `Fwd:`, `AW:`, `WG:` prefixes).

4. **Tiptap for rich-text replies**: The reply editor uses `@tiptap/react` with `StarterKit` and `Placeholder` extensions. The toolbar provides bold, italic, and list formatting. Email bodies are sent as `htmlBody` (matching the `sendEmailInput` schema).

5. **Opt-in tracking pixel**: Email open tracking is opt-in per user (`trackingPixelEnabled` column on users table). When enabled, a 1x1 transparent GIF is appended to outgoing emails with a unique token. The `/api/track/[token]` endpoint records the open timestamp.

6. **WebSocket for real-time updates**: A standalone WebSocket server (`apps/websocket/src/index.ts`) authenticates via the `session_token` cookie. The Next.js client hook (`useWebSocket`) auto-reconnects and invalidates tRPC queries on `email:new`, `notification:new`, and `email:sync-complete` messages.

7. **Dynamic import for mailparser**: `mailparser` is imported dynamically (`await import("mailparser")`) in the email router to avoid bundling issues with Next.js/Turbopack. This produces build warnings but works correctly at runtime.

8. **Push notifications via web-push**: Browser push uses the Web Push API with VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` env vars). A service worker (`public/sw.js`) handles push events. Subscriptions are stored in the `pushSubscriptions` table.

9. **Notification preferences per user**: Users can toggle notifications for new emails, overdue rent, and contract expiry via boolean columns on the users table (`notifyNewEmail`, `notifyOverdueRent`, `notifyContractExpiry`). The notification service checks these preferences before creating records or sending push.

10. **manualAssignInput uses nullable fields**: `tenantId` and `propertyId` use Zod's `nullable()` (not `optional()`), meaning the UI must pass `null` explicitly to unassign.

## Files Created

### Shared Package (packages/shared/)

- `src/utils/crypto.ts` — AES-256-GCM encryption/decryption for email credentials
- `src/types/email.ts` — `EMAIL_TEMPLATE_VARIABLES` constant
- `src/validation/email.ts` — All email-related Zod schemas (account CRUD, send, assign, transfer, templates, list)
- `src/validation/notification.ts` — Notification preference and push subscription schemas
- `src/db/schema/email-templates.ts` — `emailTemplates` table schema

### Next.js Server (apps/nextjs/src/server/)

- `services/email-crypto.ts` — Wraps shared crypto with env-based encryption key
- `services/email-sync.ts` — IMAP sync engine with tenant matching and thread detection
- `services/notification.ts` — `createNotification()` with preference checking and web-push delivery
- `cron/email-sync.ts` — Cron job registration (`*/15 * * * *`)
- `routers/email.ts` — Full email tRPC router (accounts, emails, templates, sending, attachments)
- `routers/notifications.ts` — Notifications tRPC router (list, read, delete, push subscribe)

### Next.js API Routes

- `app/api/track/[token]/route.ts` — Tracking pixel endpoint (1x1 transparent GIF)

### Next.js UI Components

- `app/(app)/mail/page.tsx` — Split-layout inbox with matched/unmatched tabs
- `app/(app)/settings/page.tsx` — Settings page with email account form and notification preferences
- `components/mail/email-list.tsx` — Paginated email list component
- `components/mail/email-list-item.tsx` — Email row with read/unread state and open tracking badge
- `components/mail/mail-reader.tsx` — Email reader with thread view and reply integration
- `components/mail/reply-editor.tsx` — Tiptap-based rich-text reply editor
- `components/mail/template-selector.tsx` — Email template picker dropdown
- `components/mail/attachment-list.tsx` — Attachment display with transfer-to-documents dialog
- `components/mail/manual-assign-dialog.tsx` — Property/tenant assignment dialog
- `components/settings/email-account-form.tsx` — IMAP/SMTP credential form with connection test
- `components/settings/notification-preferences.tsx` — Notification toggle preferences
- `components/notifications/notification-bell.tsx` — Header notification bell with popover feed

### WebSocket

- `apps/websocket/src/index.ts` — WebSocket server with session-based auth and per-user routing
- `apps/nextjs/src/lib/websocket.ts` — `useWebSocket()` hook with auto-reconnect and tRPC invalidation

### Other

- `public/sw.js` — Service worker for push notifications

## Files Modified

- `packages/shared/src/utils/index.ts` — Added crypto export
- `packages/shared/src/types/index.ts` — Added email types export
- `packages/shared/src/validation/index.ts` — Added email and notification validation exports
- `packages/shared/src/db/schema/users.ts` — Added notification preference columns and `trackingPixelEnabled`
- `packages/shared/src/db/schema/email.ts` — Added `trackingToken`, `openedAt`, `toAddresses` columns
- `packages/shared/src/db/schema/index.ts` — Added email-templates export
- `apps/nextjs/src/server/cron/index.ts` — Registered email sync cron job
- `apps/nextjs/src/server/routers/_app.ts` — Registered email and notifications routers
- `apps/nextjs/src/components/app-shell.tsx` — Added Mail nav item and NotificationBell to header
- `apps/nextjs/messages/de.json` — Added email, notifications, settings i18n keys (German)
- `apps/nextjs/messages/en.json` — Added email, notifications, settings i18n keys (English)

## Required Environment Variables

```
EMAIL_ENCRYPTION_KEY=<64-char hex string for AES-256>
VAPID_PUBLIC_KEY=<VAPID public key for web-push>
VAPID_PRIVATE_KEY=<VAPID private key for web-push>
VAPID_SUBJECT=mailto:admin@example.com
NEXT_PUBLIC_WS_URL=ws://localhost:3002 (optional, defaults to current host:3002)
```

## Database Migration

Migration `0000_free_skullbuster.sql` was generated covering all schema changes. Run `make db-push` to apply.

## Maintenance Notes

- The `mailparser` dynamic import warnings during build are expected and harmless — the module resolves at runtime.
- The WebSocket server requires the same database access as Next.js for session validation. It imports `@repo/shared/db` directly.
- Email sync runs every 15 minutes. Adjust the cron expression in `apps/nextjs/src/server/cron/email-sync.ts` if needed.
- The React Compiler warnings about `react-hooks/incompatible-library` for React Hook Form `watch()` are pre-existing and unrelated to Phase 5.

## Known Issues / Technical Debt

- `mailparser` is dynamically imported to avoid Turbopack bundling issues — consider extracting email parsing to a separate server-only module.
- The WebSocket server does not yet have TLS termination — relies on a reverse proxy (nginx, etc.) in production.
- Attachment transfer downloads the full email source from IMAP each time — could benefit from caching.
- No rate limiting on the tracking pixel endpoint — could be abused for analytics inflation.
- The cron-based sync approach means up to 15-minute delay for new emails — consider IMAP IDLE for real-time sync in a future iteration.
