import { cookies } from "next/headers";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

export async function validateCsrfToken(
  headerValue: string | null,
): Promise<boolean> {
  if (!headerValue) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(CSRF_COOKIE)?.value;

  if (!cookieValue) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (headerValue.length !== cookieValue.length) {
    return false;
  }

  const encoder = new TextEncoder();
  const a = encoder.encode(headerValue);
  const b = encoder.encode(cookieValue);

  if (a.byteLength !== b.byteLength) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.byteLength; i++) {
    mismatch |= a[i] ^ b[i];
  }

  return mismatch === 0;
}

export function getCsrfHeaderName(): string {
  return CSRF_HEADER;
}
