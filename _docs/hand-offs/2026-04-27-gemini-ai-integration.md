# Hand-off: Gemini AI Integration for Mail (Task + Reply)

## Summary

Added two AI-powered features to `/mail` using Google Gemini:

1. **Task generation from email** — A bot-icon button in the `TaskDialog` (visible only when creating a task from an email) generates `title` and `description` from the source email's subject + text body.
2. **Reply generation** — A bot-icon button in the `ReplyEditor` toolbar (next to the ordered-list button) opens a dropdown with three tones (formal/friendly/short) and drafts a polite reply, refining the user's existing draft when present.

The Gemini SDK runs server-side inside the Next.js app — there is no separate microservice. Calls are routed through a new tRPC router `ai`, protected by per-user/per-day Redis rate-limiting and audit logging.

## Key Decisions

- **Server-side in Next.js (no microservice)** — Simpler than a dedicated `apps/ai/` service; keeps the API key on the server, avoids a new container/port.
- **Model `gemini-2.5-flash`** via `@google/genai` SDK (v1.50+). Single-response (non-streaming).
- **Structured output** with `responseMimeType: "application/json"` + `responseJsonSchema` — guarantees parseable shape; result is additionally Zod-validated defensively.
- **Source language preserved** — model is instructed to reply in the same language as the email; ISO code returned in the result for diagnostics.
- **Reply HTML output** — `<p>`, `<ul>`, `<ol>`, `<li>` only; no inline styles or wrapper tags. Drops directly into Tiptap via `editor.commands.setContent`.
- **Tone-Dropdown** with three options (formal/friendly/short) implemented via the existing Base UI `DropdownMenu`. Bot-icon button is the trigger (using the `render` prop pattern).
- **Signature** — model appends the current user's name (from session) on its own line.
- **Refinement, not replacement** — when the user has already drafted text, the existing HTML is sent to Gemini and the prompt instructs the model to refine/extend instead of starting over.
- **Confirm-before-overwrite in TaskDialog** — uses `confirm()` to match the existing app pattern (no toast library is in use).
- **Rate limiting via Redis** — key `ai:usage:{userId}:{YYYY-MM-DD}`, `INCR` + `EXPIRE 86400`. Default 50/day, configurable via `AI_DAILY_LIMIT_PER_USER` env var. Fails open on Redis outage (logged).
- **Audit logging** — one entry per AI call via the existing `logAudit` service. New audit actions `ai_generate_task` / `ai_generate_reply`, new entity type `email`. Total token counts are stored in the `field_name=tokens` row.
- **`Bot` icon from `lucide-react`** — same icon for both features (per requirement).

## Files Changed

### New
- `apps/nextjs/src/server/services/ai.ts` — Gemini client + `generateTaskFromEmail` / `generateReply` with JSON-schema config and Zod validation
- `apps/nextjs/src/server/services/ai-rate-limit.ts` — Redis-based per-user daily counter
- `apps/nextjs/src/server/routers/ai.ts` — tRPC router (`ai.generateTaskFromEmail`, `ai.generateReply`) with ownership check, rate-limit, audit
- `apps/nextjs/src/components/ai/ai-generate-button.tsx` — reusable Bot button (spinner while loading)

### Modified
- `apps/nextjs/package.json` — added `@google/genai` dependency
- `apps/nextjs/src/server/routers/_app.ts` — registered `ai` router
- `apps/nextjs/src/components/tasks/task-dialog.tsx` — Bot button next to title field; `confirm()` before overwriting filled fields
- `apps/nextjs/src/components/mail/reply-editor.tsx` — Bot button + tone-dropdown in toolbar; `sourceEmailId` prop
- `apps/nextjs/src/components/mail/mail-reader.tsx` — passes `sourceEmailId` to `ReplyEditor`
- `packages/shared/src/types/common.ts` — added `ai_generate_task` / `ai_generate_reply` to `AUDIT_ACTIONS`
- `packages/shared/src/types/audit.ts` — added `email` to `AUDIT_ENTITY_TYPES`
- `apps/nextjs/messages/de.json`, `apps/nextjs/messages/en.json` — `email.ai.*` and `tasks.ai.*` keys
- `.env.example` — `GEMINI_API_KEY`, `AI_DAILY_LIMIT_PER_USER`

## Configuration

Required:
```
GEMINI_API_KEY=...     # from https://aistudio.google.com/apikey
```

Optional:
```
AI_DAILY_LIMIT_PER_USER=50   # default 50
REDIS_URL=redis://localhost:6379   # already configured
```

## Maintenance / Extension

- **Adding a new AI feature**: add a new function to `services/ai.ts` (with its own JSON schema) and a new procedure in `routers/ai.ts`. Always pass through `enforceAiRateLimit` and `logAudit`.
- **Switching model**: change `MODEL_ID` in `services/ai.ts`. `gemini-2.5-pro` is a drop-in replacement (slower, more expensive, more accurate).
- **Tone customisation**: `TONE_INSTRUCTIONS` in `services/ai.ts`. To add a tone, also add it to `REPLY_TONES`, the i18n keys (`email.ai.tone.*`), and the dropdown items in `reply-editor.tsx`.
- **Per-user opt-out**: not implemented — feature is always-on. To add, gate the buttons in `task-dialog.tsx` / `reply-editor.tsx` on a `userSettings.aiEnabled` flag.
- **Admin-configurable rate limit**: currently env-var only. To make per-user configurable, replace `getDailyLimit()` with a lookup in `userSettings` (or app settings) and pass `userId` through.

## Known Issues / Tech Debt

- **Rate-limit fails open** on Redis outage — by design (don't block the feature) but means the limit is best-effort. Acceptable for current scale.
- **No streaming** — short prompts respond in 1–3 s with `gemini-2.5-flash`, so no UX issue. Add `generateContentStream` in `services/ai.ts` if responses ever feel slow.
- **No thread context for replies** — only the single email being replied to is sent. Long threads might benefit from full context; can be added by extending the `loadOwnedEmail` query and the prompt.
- **Audit token counts are stored as `String`** in the existing schema — fine for query-by-prefix, but aggregation requires a cast. If usage analytics become important, a dedicated `ai_usage` table is the better long-term home.
- **HTML sanitisation** — Gemini-generated HTML is set directly into Tiptap. Tiptap's StarterKit will drop unknown tags/attrs but does not strip XSS-relevant attributes. The prompt explicitly forbids inline styles/scripts; consider wrapping `editor.commands.setContent` with `DOMPurify` (already a dependency) for defence in depth.
- **Pre-existing lint warnings** (unused `Input` imports in 4 unrelated files) were not touched.

## Verification

- `cmd /c "pnpm -r type-check"` — clean
- `cmd /c "pnpm -r lint"` — only 4 pre-existing warnings, none from this change
- `cmd /c "pnpm --filter @repo/nextjs build"` — succeeds
- Manual: open `/mail` → select email → click `CheckSquare` → in `TaskDialog` click Bot → fields populated; reply via `Reply` → click Bot in toolbar → pick tone → editor populated.
