import { encryptCredential, decryptCredential } from "@repo/shared/utils";
import { logger } from "@/lib/logger";

function getEncryptionKey(): string {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      "EMAIL_ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes)",
    );
  }
  return key;
}

/**
 * Encrypt an email account password for storage in the database.
 */
export function encryptEmailPassword(password: string): {
  encryptedPassword: string;
  encryptionIv: string;
  encryptionTag: string;
} {
  const key = getEncryptionKey();
  const result = encryptCredential(password, key);
  return {
    encryptedPassword: result.encrypted,
    encryptionIv: result.iv,
    encryptionTag: result.tag,
  };
}

/**
 * Decrypt an email account password from the database.
 */
export function decryptEmailPassword(account: {
  encryptedPassword: string;
  encryptionIv: string;
  encryptionTag: string;
}): string {
  const key = getEncryptionKey();
  try {
    return decryptCredential(
      account.encryptedPassword,
      account.encryptionIv,
      account.encryptionTag,
      key,
    );
  } catch (error) {
    logger.error(
      { err: error },
      "Failed to decrypt email password — key may have changed",
    );
    throw new Error("Failed to decrypt email credentials");
  }
}
