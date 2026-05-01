/**
 * AI router. Wraps Gemini calls with auth, rate-limiting, and audit logging.
 */
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import { emails, emailAccounts, tenants, users } from "@repo/shared/db/schema";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@repo/shared/types";
import { router, protectedProcedure } from "../trpc";
import {
  generateReply,
  generateTaskFromEmail,
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

function mapAiError(err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;
  logger.error({ err }, "AI generation failed");
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "AI generation failed",
  });
}

export const aiRouter = router({
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
