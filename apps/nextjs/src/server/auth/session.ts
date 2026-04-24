import { randomBytes, createHash } from "crypto";
import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { sessions, users } from "@repo/shared/db/schema";
import type { UserRole } from "@repo/shared/db/schema";
import type { SessionUser } from "@repo/shared/types";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
const CSRF_COOKIE = "csrf_token";
const REFRESH_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCESS_MAX_AGE = 15 * 60; // 15 minutes in seconds
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge: number;
}

function accessCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  };
}

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  };
}

function csrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false, // Must be readable by JS for double-submit
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  };
}

export async function createSessionTokens(
  userId: string,
  role: UserRole,
  email: string,
  name: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<{ accessToken: string; sessionId: string }> {
  const familyId = randomUUID();
  const sessionId = randomUUID();

  // Create refresh token JWT and hash it for storage
  const refreshToken = await signRefreshToken({
    sub: userId,
    sid: sessionId,
    familyId,
  });
  const refreshTokenHash = hashToken(refreshToken);
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_DURATION_MS);

  // Store session with hashed refresh token
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    refreshTokenHash,
    familyId,
    refreshTokenExpiresAt,
    userAgent: userAgent ?? null,
    ipAddress: ipAddress ?? null,
  });

  // Create access token JWT
  const accessToken = await signAccessToken({
    sub: userId,
    role,
    email,
    name,
  });

  // Generate CSRF token
  const csrfToken = generateCsrfToken();

  // Set all cookies
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, accessCookieOptions());
  cookieStore.set(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  cookieStore.set(CSRF_COOKIE, csrfToken, csrfCookieOptions());

  return { accessToken, sessionId };
}

export async function refreshSession(
  refreshTokenRaw: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<{ accessToken: string; user: SessionUser } | null> {
  // Verify refresh token JWT signature and expiry
  const refreshPayload = await verifyRefreshToken(refreshTokenRaw);
  if (!refreshPayload) {
    return null;
  }

  const { sub: userId, sid: sessionId, familyId } = refreshPayload;
  const incomingHash = hashToken(refreshTokenRaw);

  // Look up session by family
  const sessionResults = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.familyId, familyId), eq(sessions.userId, userId)))
    .limit(1);

  if (sessionResults.length === 0) {
    return null;
  }

  const session = sessionResults[0];

  // Reuse detection: if the hash doesn't match, a stolen token was replayed
  if (session.refreshTokenHash !== incomingHash) {
    // Kill ALL sessions for this user (breach detected)
    await db.delete(sessions).where(eq(sessions.userId, userId));
    clearAuthCookies(await cookies());
    return null;
  }

  // Check session ID matches
  if (session.id !== sessionId) {
    return null;
  }

  // Fetch user data for new access token
  const userResults = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      banned: users.banned,
      avatarUrl: users.avatarUrl,
      language: users.language,
      currency: users.currency,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResults.length === 0) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  // Reject refresh for banned users
  if (userResults[0].banned) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    clearAuthCookies(await cookies());
    return null;
  }

  const user = userResults[0] as SessionUser;

  // Token rotation: issue new refresh token, invalidate old one
  const newRefreshToken = await signRefreshToken({
    sub: userId,
    sid: sessionId,
    familyId,
  });
  const newRefreshTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_DURATION_MS);

  await db
    .update(sessions)
    .set({
      refreshTokenHash: newRefreshTokenHash,
      refreshTokenExpiresAt: newExpiresAt,
      lastActiveAt: new Date(),
      userAgent: userAgent ?? session.userAgent,
      ipAddress: ipAddress ?? session.ipAddress,
    })
    .where(eq(sessions.id, sessionId));

  // Issue new access token
  const accessToken = await signAccessToken({
    sub: userId,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  // Generate new CSRF token
  const csrfToken = generateCsrfToken();

  // Set cookies
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, accessCookieOptions());
  cookieStore.set(REFRESH_COOKIE, newRefreshToken, refreshCookieOptions());
  cookieStore.set(CSRF_COOKIE, csrfToken, csrfCookieOptions());

  return { accessToken, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const refreshTokenRaw = cookieStore.get(REFRESH_COOKIE)?.value;

  if (refreshTokenRaw) {
    const hash = hashToken(refreshTokenRaw);
    await db.delete(sessions).where(eq(sessions.refreshTokenHash, hash));
  }

  clearAuthCookies(cookieStore);
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
  clearAuthCookies(await cookies());
}

function clearAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): void {
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

export async function getSessionFromCookies(): Promise<{
  user: SessionUser;
  sessionId: string | null;
} | null> {
  const cookieStore = await cookies();
  const accessTokenRaw = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessTokenRaw) {
    return null;
  }

  const payload = await verifyAccessToken(accessTokenRaw);
  if (!payload) {
    return null;
  }

  return {
    user: {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      avatarUrl: null, // Not stored in JWT, fetched separately when needed
      language: "", // Not stored in JWT
      currency: "", // Not stored in JWT
    },
    sessionId: null, // Session ID only available from refresh token
  };
}

export async function getFullUserFromSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const accessTokenRaw = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessTokenRaw) {
    return null;
  }

  const payload = await verifyAccessToken(accessTokenRaw);
  if (!payload) {
    return null;
  }

  // Fetch full user data from DB for complete profile
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      language: users.language,
      currency: users.currency,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0] as SessionUser;
}

export function getRequestMeta(): {
  userAgent: string | null;
  ipAddress: string | null;
} {
  // headers() is async in Next.js 15+, but we handle it in the caller
  return {
    userAgent: null,
    ipAddress: null,
  };
}

export async function getRequestMetaAsync(): Promise<{
  userAgent: string | null;
  ipAddress: string | null;
}> {
  const headerStore = await headers();
  return {
    userAgent: headerStore.get("user-agent"),
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      null,
  };
}
