# Authentication System Overhaul

**Date:** 2025-07-11
**Scope:** Complete authentication and authorization system replacement

## Summary

Replaced the existing simple session-cookie authentication with a full JWT dual-token system featuring:

- **JWT Access/Refresh Tokens** (HS256 via `jose`): Access token 15min TTL, Refresh token 30d TTL with rotation and reuse detection
- **Role-Based Authorization**: `member` / `admin` roles with `adminProcedure` in tRPC and proxy-level enforcement
- **Email Verification**: Required before login, 24h token TTL, Redis pub/sub event for email service
- **Password Reset**: 1h token TTL, invalidates all sessions on reset, Redis pub/sub event
- **CSRF Protection**: Double-Submit Cookie Pattern (csrf_token readable by JS, validated via x-csrf-token header)
- **Edge Proxy**: JWT validation at the edge via Next.js 16 `proxy.ts` (replaces `middleware.ts`)
- **Session Management**: Token family-based reuse detection, per-session revocation, "logout all devices"
- **Admin Panel API**: listUsers, getUser, updateUserRole, deleteUser, listAllProperties

## Key Decisions

| Decision                            | Rationale                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| HS256 (symmetric) over RS256        | Single-service JWT validation, simpler key management                              |
| `jose` library                      | Edge Runtime compatible, no Node.js crypto dependency at middleware level          |
| Token rotation with family tracking | Detects refresh token reuse (replay attacks) and kills all sessions in that family |
| SHA-256 hashed tokens in DB         | Refresh tokens and verification tokens stored as hashes, not plaintext             |
| ADMIN_EMAIL env var auto-promotion  | First admin gets role on registration, no separate seeding required                |
| Redis pub/sub for email events      | Decoupled email sending from auth logic; email service subscribes to channels      |
| proxy.ts instead of middleware.ts   | Next.js 16.2.2 requires proxy.ts; middleware.ts causes build conflict              |

## Files Modified / Created

### packages/shared

- `src/db/schema/users.ts` — Added `role`, `emailVerified` columns
- `src/db/schema/sessions.ts` — Completely replaced with JWT session fields (refreshTokenHash, familyId, etc.)
- `src/db/schema/verification-tokens.ts` — **NEW** — Email verify + password reset tokens
- `src/db/schema/index.ts` — Added verification-tokens export
- `src/types/auth.ts` — **NEW** — JwtAccessPayload, JwtRefreshPayload, SessionUser
- `src/types/index.ts` — Added auth types export
- `src/validation/auth.ts` — Complete rewrite with all auth Zod schemas
- `src/validation/user.ts` — Updated changePasswordInput to use new passwordSchema
- `src/utils/redis.ts` — Added AUTH_VERIFY_EMAIL, AUTH_PASSWORD_RESET channels + payload types

### apps/nextjs

- `src/proxy.ts` — Replaced old session_token check with JWT verification, admin path routing
- `src/server/auth/jwt.ts` — **NEW** — sign/verify for access + refresh tokens
- `src/server/auth/session.ts` — Complete rewrite with createSessionTokens, refreshSession, reuse detection
- `src/server/auth/csrf.ts` — **NEW** — Double-submit cookie validation with constant-time comparison
- `src/server/auth/verification.ts` — **NEW** — Verification token CRUD with hashing
- `src/server/auth/index.ts` — Updated barrel exports
- `src/server/trpc.ts` — JWT context, isAdmin middleware, adminProcedure
- `src/server/routers/auth.ts` — Complete rewrite with 9 procedures + Redis events
- `src/server/routers/sessions.ts` — **NEW** — list, revoke, revokeAll
- `src/server/routers/admin.ts` — **NEW** — Admin-only user and property management
- `src/server/routers/_app.ts` — Added sessions + admin routers
- `src/app/api/auth/refresh/route.ts` — **NEW** — Token refresh endpoint
- `src/app/providers.tsx` — CSRF headers, 401 retry with token refresh, deduplicated refresh
- `src/app/(auth)/login/page.tsx` — email_not_verified handling, forgot-password link
- `src/app/(auth)/register/page.tsx` — Verification flow UI
- `src/app/(auth)/verify-email/page.tsx` — **NEW**
- `src/app/(auth)/forgot-password/page.tsx` — **NEW**
- `src/app/(auth)/reset-password/page.tsx` — **NEW**
- `src/components/user-provider.tsx` — Added role to UserData

### apps/websocket

- `src/index.ts` — JWT access_token verification via jose (removed DB session lookup)

### Root

- `.env` — Added JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ADMIN_EMAIL
- `.env.example` — Added auth section with placeholder values

### Deleted

- `src/middleware.ts` — Replaced by proxy.ts (Next.js 16 requirement)

## Maintenance & Extension

### Adding a New Role

1. Add to `USER_ROLES` in `packages/shared/src/db/schema/users.ts`
2. Update `UserRole` type (auto-derived)
3. Add checks in proxy.ts if role needs path-based restrictions
4. Add tRPC middleware if needed (like `isAdmin`)

### Email Service Integration

The auth router publishes events to Redis channels `auth:verify-email` and `auth:password-reset`. The email service (`apps/email`) needs to:

1. Subscribe to these channels
2. Send templated emails with the token embedded in a URL (e.g., `{APP_URL}/verify-email?token={token}`)
3. **This is not yet implemented** — only the publishing side exists

### Environment Variables Required

| Variable             | Description                            | Min Length |
| -------------------- | -------------------------------------- | ---------- |
| `JWT_ACCESS_SECRET`  | HS256 signing key for access tokens    | 32 chars   |
| `JWT_REFRESH_SECRET` | HS256 signing key for refresh tokens   | 32 chars   |
| `ADMIN_EMAIL`        | Auto-promoted to admin on registration | -          |

### Password Requirements

- Minimum 10 characters
- At least 1 uppercase letter, 1 digit, 1 special character
- Maximum 128 characters
- Regex: `/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/`

## Known Issues / Technical Debt

1. **Email sending not implemented**: Redis events are published but the email service does not yet subscribe to `auth:verify-email` and `auth:password-reset` channels. Users cannot actually verify email or reset passwords until this is done.
2. **Rate limiting not implemented**: Auth endpoints (login, register, forgot-password) have no rate limiting. Consider adding middleware or using a Redis-based rate limiter.
3. **Admin UI not implemented**: Backend routes exist (`admin.*`) but no frontend admin panel pages exist yet.
4. **Session management UI not implemented**: Backend routes exist (`sessions.*`) but no frontend settings page for managing active sessions.
5. **Existing users need migration**: Current users have `emailVerified = false` and `role = 'member'` by default. The ADMIN_EMAIL user needs manual promotion if already registered, or a one-time migration script.
6. **Pre-existing lint warnings**: 32 lint issues (all pre-existing: `<img>` usage, React Compiler memoization, unused `_props`) — none from auth changes.
