import { SignJWT, jwtVerify } from "jose";
import type { JwtAccessPayload, JwtRefreshPayload } from "@repo/shared/types";
import type { UserRole } from "@repo/shared/db/schema";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

function getAccessSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_REFRESH_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: {
  sub: string;
  role: UserRole;
  email: string;
  name: string;
}): Promise<string> {
  return new SignJWT({
    role: payload.role,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getAccessSecret());
}

export async function signRefreshToken(payload: {
  sub: string;
  sid: string;
  familyId: string;
}): Promise<string> {
  return new SignJWT({ sid: payload.sid, familyId: payload.familyId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(
  token: string,
): Promise<JwtAccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret());
    return {
      sub: payload.sub as string,
      role: payload.role as UserRole,
      email: payload.email as string,
      name: payload.name as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string,
): Promise<JwtRefreshPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecret());
    return {
      sub: payload.sub as string,
      sid: payload.sid as string,
      familyId: payload.familyId as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

/**
 * Verify access token using only Web Crypto API (Edge-compatible).
 * Used in Next.js middleware where Node.js crypto is not available.
 */
export async function verifyAccessTokenEdge(
  token: string,
  secret: string,
): Promise<JwtAccessPayload | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return {
      sub: payload.sub as string,
      role: payload.role as UserRole,
      email: payload.email as string,
      name: payload.name as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}
