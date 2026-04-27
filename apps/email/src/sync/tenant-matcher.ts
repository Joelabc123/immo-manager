import { eq, and, inArray } from "drizzle-orm";
import { db } from "@repo/shared/db";
import {
  tenantEmails,
  tenants,
  rentalUnits,
  emails,
  emailFolders,
} from "@repo/shared/db/schema";

/**
 * Match an email sender address against all tenant email addresses
 * for the given user. Returns tenantId and propertyId if matched.
 */
export async function matchSenderToTenant(
  fromAddress: string,
  userId: string,
): Promise<{ tenantId: string; propertyId: string | null } | null> {
  // Extract email from "Name <email>" format
  const emailMatch = fromAddress.match(/<([^>]+)>/);
  const cleanEmail = emailMatch ? emailMatch[1] : fromAddress;
  const normalizedEmail = cleanEmail.toLowerCase().trim();

  const results = await db
    .select({
      tenantId: tenantEmails.tenantId,
      rentalUnitId: tenants.rentalUnitId,
    })
    .from(tenantEmails)
    .innerJoin(tenants, eq(tenantEmails.tenantId, tenants.id))
    .where(
      and(eq(tenantEmails.email, normalizedEmail), eq(tenants.userId, userId)),
    )
    .limit(1);

  if (results.length === 0) return null;

  const result = results[0];
  let propertyId: string | null = null;

  if (result.rentalUnitId) {
    const [unit] = await db
      .select({ propertyId: rentalUnits.propertyId })
      .from(rentalUnits)
      .where(eq(rentalUnits.id, result.rentalUnitId))
      .limit(1);

    if (unit) {
      propertyId = unit.propertyId;
    }
  }

  return { tenantId: result.tenantId, propertyId };
}

/**
 * Normalize a sender address: extracts the email out of "Name <email>"
 * notation and lowercases/trims it.
 */
function normalizeAddress(fromAddress: string): string {
  const emailMatch = fromAddress.match(/<([^>]+)>/);
  const cleanEmail = emailMatch ? emailMatch[1] : fromAddress;
  return cleanEmail.toLowerCase().trim();
}

/**
 * Re-match all stored inbound inbox emails of a single account against the
 * current set of tenant email addresses for the owning user. Used to keep
 * historical emails categorized when tenant addresses are added or changed.
 *
 * Only updates rows where the resolved (tenantId, propertyId) actually
 * differs from the stored values, to avoid unnecessary writes.
 */
export async function rematchAccountEmails(
  accountId: string,
  userId: string,
): Promise<{ updated: number; cleared: number }> {
  // 1. Build address -> { tenantId, propertyId } lookup for this user.
  const tenantRows = await db
    .select({
      email: tenantEmails.email,
      tenantId: tenantEmails.tenantId,
      rentalUnitId: tenants.rentalUnitId,
      propertyId: rentalUnits.propertyId,
    })
    .from(tenantEmails)
    .innerJoin(tenants, eq(tenantEmails.tenantId, tenants.id))
    .leftJoin(rentalUnits, eq(tenants.rentalUnitId, rentalUnits.id))
    .where(eq(tenants.userId, userId));

  const lookup = new Map<
    string,
    { tenantId: string; propertyId: string | null }
  >();
  for (const row of tenantRows) {
    const normalized = row.email.toLowerCase().trim();
    if (!lookup.has(normalized)) {
      lookup.set(normalized, {
        tenantId: row.tenantId,
        propertyId: row.propertyId ?? null,
      });
    }
  }

  // 2. Get inbox folder ids of this account.
  const inboxFolders = await db
    .select({ id: emailFolders.id })
    .from(emailFolders)
    .where(
      and(
        eq(emailFolders.emailAccountId, accountId),
        eq(emailFolders.type, "inbox"),
      ),
    );

  if (inboxFolders.length === 0) {
    return { updated: 0, cleared: 0 };
  }

  const folderIds = inboxFolders.map((f) => f.id);

  // 3. Load all inbound emails of these folders.
  const inboxEmails = await db
    .select({
      id: emails.id,
      fromAddress: emails.fromAddress,
      tenantId: emails.tenantId,
      propertyId: emails.propertyId,
    })
    .from(emails)
    .where(
      and(
        eq(emails.emailAccountId, accountId),
        eq(emails.isInbound, true),
        inArray(emails.folderId, folderIds),
      ),
    );

  let updated = 0;
  let cleared = 0;

  // 4. Diff & update only rows whose mapping changed.
  for (const row of inboxEmails) {
    const normalized = normalizeAddress(row.fromAddress);
    const target = lookup.get(normalized) ?? null;
    const targetTenantId = target?.tenantId ?? null;
    const targetPropertyId = target?.propertyId ?? null;

    if (
      row.tenantId === targetTenantId &&
      row.propertyId === targetPropertyId
    ) {
      continue;
    }

    await db
      .update(emails)
      .set({
        tenantId: targetTenantId,
        propertyId: targetPropertyId,
      })
      .where(eq(emails.id, row.id));

    if (targetTenantId === null) {
      cleared++;
    } else {
      updated++;
    }
  }

  return { updated, cleared };
}
