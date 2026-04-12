import { eq, and } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { tenantEmails, tenants, rentalUnits } from "@repo/shared/db/schema";

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
