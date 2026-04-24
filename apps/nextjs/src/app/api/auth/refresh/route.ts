import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { refreshSession } from "@/server/auth/session";

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? undefined;
  const ipAddress =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    undefined;

  const result = await refreshSession(refreshToken, userAgent, ipAddress);

  if (!result) {
    return NextResponse.json(
      { error: "Invalid or expired refresh token" },
      { status: 401 },
    );
  }

  return NextResponse.json({ success: true });
}
