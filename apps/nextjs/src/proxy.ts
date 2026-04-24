import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/offline",
];

// Paths that always pass through without auth checks
const PASSTHROUGH_PATHS = [
  "/api/trpc",
  "/api/auth/refresh",
  "/api/share/",
  "/share/",
  "/_next",
  "/icons/",
  "/manifest.json",
  "/sw.js",
  "/favicon.ico",
];

function isPassthrough(pathname: string): boolean {
  return (
    PASSTHROUGH_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.includes(".")
  );
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let passthrough paths through without any checks
  if (isPassthrough(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;

  if (isPublicPath(pathname)) {
    // If user is already authenticated, redirect away from auth pages
    if (accessToken) {
      const payload = await verifyEdge(accessToken);
      if (payload) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected route: require valid access token
  if (!accessToken) {
    // No access token — check if refresh token exists for client-side refresh
    const refreshToken = request.cookies.get("refresh_token")?.value;
    if (!refreshToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Allow request through so client can trigger refresh
    return NextResponse.next();
  }

  const payload = await verifyEdge(accessToken);
  if (!payload) {
    // Access token expired or invalid -- let client-side refresh handle it
    const refreshToken = request.cookies.get("refresh_token")?.value;
    if (!refreshToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Admin-only paths
  if (pathname.startsWith("/admin") && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

async function verifyEdge(
  token: string,
): Promise<{ sub: string; role: string } | null> {
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) return null;
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return {
      sub: payload.sub as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
