import { randomBytes, createHash } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { verificationTokens } from "@repo/shared/db/schema";
import type { VerificationTokenType } from "@repo/shared/db/schema";

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getTtl(type: VerificationTokenType): number {
  return type === "email_verify" ? EMAIL_VERIFY_TTL_MS : PASSWORD_RESET_TTL_MS;
}

export async function createVerificationToken(
  userId: string,
  type: VerificationTokenType,
): Promise<string> {
  // Delete any existing tokens of this type for this user
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.userId, userId),
        eq(verificationTokens.type, type),
      ),
    );

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + getTtl(type));

  await db.insert(verificationTokens).values({
    userId,
    tokenHash,
    type,
    expiresAt,
  });

  return token; // Return unhashed token for email link
}

export async function validateVerificationToken(
  token: string,
  type: VerificationTokenType,
): Promise<{ userId: string; tokenId: string } | null> {
  const tokenHash = hashToken(token);

  const result = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, tokenHash),
        eq(verificationTokens.type, type),
      ),
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const record = result[0];

  if (new Date(record.expiresAt) < new Date()) {
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.id, record.id));
    return null;
  }

  return { userId: record.userId, tokenId: record.id };
}

export async function deleteVerificationToken(tokenId: string): Promise<void> {
  await db.delete(verificationTokens).where(eq(verificationTokens.id, tokenId));
}

export async function deleteAllVerificationTokens(
  userId: string,
  type: VerificationTokenType,
): Promise<void> {
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.userId, userId),
        eq(verificationTokens.type, type),
      ),
    );
}
