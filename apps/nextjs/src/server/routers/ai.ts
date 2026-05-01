/**
 * AI router. Wraps Gemini calls with auth, rate-limiting, and audit logging.
 */
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import {
  emails,
  emailAccounts,
  tenants,
  users,
  rentalUnits,
  properties,
} from "@repo/shared/db/schema";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@repo/shared/types";
import { router, protectedProcedure } from "../trpc";
import {
  generateReply,
  generateTaskFromEmail,
  improveEmailDraft,
  REPLY_TONES,
} from "../services/ai";
import { enforceAiRateLimit } from "../services/ai-rate-limit";
import { logAudit } from "../services/audit";
import { logger } from "@/lib/logger";

async function loadOwnedEmail(emailId: string, userId: string) {
  const [row] = await db
    .select({
      id: emails.id,
      subject: emails.subject,
      textBody: emails.textBody,
      fromAddress: emails.fromAddress,
      emailAccountId: emails.emailAccountId,
      tenantId: emails.tenantId,
      tenantFirstName: tenants.firstName,
      tenantLastName: tenants.lastName,
      tenantGender: tenants.gender,
    })
    .from(emails)
    .innerJoin(emailAccounts, eq(emailAccounts.id, emails.emailAccountId))
    .leftJoin(tenants, eq(tenants.id, emails.tenantId))
    .where(eq(emails.id, emailId))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
  }

  // Verify ownership via the joined account.
  const [account] = await db
    .select({ userId: emailAccounts.userId })
    .from(emailAccounts)
    .where(eq(emailAccounts.id, row.emailAccountId))
    .limit(1);

  if (!account || account.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
  }

  return row;
}

async function loadEmailSignature(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ emailSignature: users.emailSignature })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.emailSignature ?? null;
}

async function loadOwnedAccount(accountId: string, userId: string) {
  const [account] = await db
    .select({ id: emailAccounts.id })
    .from(emailAccounts)
    .where(
      and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId)),
    )
    .limit(1);

  if (!account) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Email account not found",
    });
  }

  return account;
}

async function loadComposeContext(input: {
  tenantId?: string | null;
  propertyId?: string | null;
  userId: string;
}): Promise<{
  tenant: {
    firstName: string;
    lastName: string;
    gender: string | null;
  } | null;
  property: {
    street: string | null;
    zipCode: string | null;
    city: string | null;
  } | null;
}> {
  let tenant: {
    firstName: string;
    lastName: string;
    gender: string | null;
  } | null = null;
  let property: {
    street: string | null;
    zipCode: string | null;
    city: string | null;
  } | null = null;

  if (input.tenantId) {
    const [row] = await db
      .select({
        firstName: tenants.firstName,
        lastName: tenants.lastName,
        gender: tenants.gender,
        propertyId: properties.id,
        propertyStreet: properties.street,
        propertyZipCode: properties.zipCode,
        propertyCity: properties.city,
      })
      .from(tenants)
      .leftJoin(rentalUnits, eq(rentalUnits.id, tenants.rentalUnitId))
      .leftJoin(properties, eq(properties.id, rentalUnits.propertyId))
      .where(
        and(eq(tenants.id, input.tenantId), eq(tenants.userId, input.userId)),
      )
      .limit(1);

    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
    }

    tenant = {
      firstName: row.firstName,
      lastName: row.lastName,
      gender: row.gender,
    };

    if (row.propertyId) {
      property = {
        street: row.propertyStreet,
        zipCode: row.propertyZipCode,
        city: row.propertyCity,
      };
    }
  }

  if (input.propertyId && !property) {
    const [row] = await db
      .select({
        street: properties.street,
        zipCode: properties.zipCode,
        city: properties.city,
      })
      .from(properties)
      .where(
        and(
          eq(properties.id, input.propertyId),
          eq(properties.userId, input.userId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
    }

    property = row;
  }

  return { tenant, property };
}

function mapAiError(err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;
  logger.error({ err }, "AI generation failed");
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "AI generation failed",
  });
}

export const aiRouter = router({
  improveEmailDraft: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        subject: z.string().min(1).max(998),
        htmlBody: z.string().min(1).max(20000),
        tone: z.enum(REPLY_TONES).default("formal"),
        recipients: z.array(z.string().email()).min(1).max(50),
        tenantId: z.string().uuid().nullable().optional(),
        propertyId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const account = await loadOwnedAccount(input.accountId, ctx.user.id);
      await enforceAiRateLimit(ctx.user.id);
      const context = await loadComposeContext({
        tenantId: input.tenantId ?? null,
        propertyId: input.propertyId ?? null,
        userId: ctx.user.id,
      });

      try {
        const { result, usage } = await improveEmailDraft({
          subject: input.subject,
          htmlBody: input.htmlBody,
          tone: input.tone,
          recipients: input.recipients,
          tenant: context.tenant,
          property: context.property,
        });

        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.email_account,
          entityId: account.id,
          action: AUDIT_ACTIONS.ai_improve_email,
          changes: [
            {
              field: "tokens",
              oldValue: null,
              newValue: String(usage.totalTokens),
            },
            {
              field: "tone",
              oldValue: null,
              newValue: input.tone,
            },
          ],
        });

        return { subject: result.subject, html: result.html };
      } catch (err) {
        throw mapAiError(err);
      }
    }),

  generateTaskFromEmail: protectedProcedure
    .input(z.object({ emailId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const email = await loadOwnedEmail(input.emailId, ctx.user.id);
      await enforceAiRateLimit(ctx.user.id);

      try {
        const { result, usage } = await generateTaskFromEmail({
          subject: email.subject,
          textBody: email.textBody,
        });

        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.email,
          entityId: email.id,
          action: AUDIT_ACTIONS.ai_generate_task,
          changes: [
            {
              field: "tokens",
              oldValue: null,
              newValue: String(usage.totalTokens),
            },
          ],
        });

        return {
          title: result.title,
          description: result.description,
        };
      } catch (err) {
        throw mapAiError(err);
      }
    }),

  generateReply: protectedProcedure
    .input(
      z.object({
        emailId: z.string().uuid(),
        tone: z.enum(REPLY_TONES).default("formal"),
        existingDraft: z.string().max(20000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = await loadOwnedEmail(input.emailId, ctx.user.id);
      await enforceAiRateLimit(ctx.user.id);

      const emailSignature = await loadEmailSignature(ctx.user.id);
      const tenant =
        email.tenantId &&
        email.tenantFirstName !== null &&
        email.tenantLastName !== null
          ? {
              firstName: email.tenantFirstName,
              lastName: email.tenantLastName,
              gender: email.tenantGender,
            }
          : null;

      try {
        const { result, usage } = await generateReply({
          subject: email.subject,
          textBody: email.textBody,
          fromAddress: email.fromAddress,
          tone: input.tone,
          signatureName: ctx.user.name,
          signatureBlock: emailSignature,
          tenant,
          existingDraft: input.existingDraft ?? null,
        });

        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.email,
          entityId: email.id,
          action: AUDIT_ACTIONS.ai_generate_reply,
          changes: [
            {
              field: "tokens",
              oldValue: null,
              newValue: String(usage.totalTokens),
            },
            {
              field: "tone",
              oldValue: null,
              newValue: input.tone,
            },
          ],
        });

        return { html: result.html };
      } catch (err) {
        throw mapAiError(err);
      }
    }),
});
