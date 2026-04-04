import { TRPCError } from "@trpc/server";
import { eq, and, desc, isNull, isNotNull, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import {
  emailAccounts,
  emails,
  emailTemplates,
  users,
} from "@repo/shared/db/schema";
import {
  createEmailAccountInput,
  updateEmailAccountInput,
  testEmailConnectionInput,
  sendEmailInput,
  manualAssignInput,
  listEmailsInput,
  createEmailTemplateInput,
  updateEmailTemplateInput,
} from "@repo/shared/validation";
import { router, protectedProcedure } from "../trpc";
import { logAudit } from "../services/audit";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";
import {
  encryptEmailPassword,
  decryptEmailPassword,
} from "../services/email-crypto";
import { logger } from "@/lib/logger";

// Helper to fetch email source from IMAP by message-id
async function fetchEmailSource(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  messageId: string,
): Promise<Buffer | null> {
  const uids = await client.search(
    { header: { "message-id": messageId } },
    { uid: true },
  );
  if (!uids || uids.length === 0) return null;
  const message = await client.fetchOne(String(uids[0]), { source: true });
  return message?.source ?? null;
}

export const emailRouter = router({
  // ────────────────── Email Account CRUD ──────────────────

  createAccount: protectedProcedure
    .input(createEmailAccountInput)
    .mutation(async ({ ctx, input }) => {
      // Only one email account per user
      const existing = await db
        .select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Email account already configured. Update or delete it first.",
        });
      }

      const { encryptedPassword, encryptionIv, encryptionTag } =
        encryptEmailPassword(input.password);

      const [account] = await db
        .insert(emailAccounts)
        .values({
          userId: ctx.user.id,
          imapHost: input.imapHost,
          imapPort: input.imapPort,
          smtpHost: input.smtpHost,
          smtpPort: input.smtpPort,
          username: input.username,
          encryptedPassword,
          encryptionIv,
          encryptionTag,
          fromAddress: input.fromAddress,
        })
        .returning({
          id: emailAccounts.id,
          imapHost: emailAccounts.imapHost,
          imapPort: emailAccounts.imapPort,
          smtpHost: emailAccounts.smtpHost,
          smtpPort: emailAccounts.smtpPort,
          username: emailAccounts.username,
          fromAddress: emailAccounts.fromAddress,
        });

      logger.info(
        { userId: ctx.user.id, accountId: account.id },
        "Email account created",
      );

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.email_account,
        entityId: account.id,
        action: "create",
      });

      return account;
    }),

  getAccount: protectedProcedure.query(async ({ ctx }) => {
    const [account] = await db
      .select({
        id: emailAccounts.id,
        imapHost: emailAccounts.imapHost,
        imapPort: emailAccounts.imapPort,
        smtpHost: emailAccounts.smtpHost,
        smtpPort: emailAccounts.smtpPort,
        username: emailAccounts.username,
        fromAddress: emailAccounts.fromAddress,
        createdAt: emailAccounts.createdAt,
        updatedAt: emailAccounts.updatedAt,
      })
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, ctx.user.id))
      .limit(1);

    return account ?? null;
  }),

  updateAccount: protectedProcedure
    .input(updateEmailAccountInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({
          id: emailAccounts.id,
          userId: emailAccounts.userId,
        })
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.id),
            eq(emailAccounts.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email account not found",
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (input.imapHost !== undefined) updateData.imapHost = input.imapHost;
      if (input.imapPort !== undefined) updateData.imapPort = input.imapPort;
      if (input.smtpHost !== undefined) updateData.smtpHost = input.smtpHost;
      if (input.smtpPort !== undefined) updateData.smtpPort = input.smtpPort;
      if (input.username !== undefined) updateData.username = input.username;
      if (input.fromAddress !== undefined)
        updateData.fromAddress = input.fromAddress;

      if (input.password !== undefined) {
        const { encryptedPassword, encryptionIv, encryptionTag } =
          encryptEmailPassword(input.password);
        updateData.encryptedPassword = encryptedPassword;
        updateData.encryptionIv = encryptionIv;
        updateData.encryptionTag = encryptionTag;
      }

      const [updated] = await db
        .update(emailAccounts)
        .set(updateData)
        .where(eq(emailAccounts.id, input.id))
        .returning({
          id: emailAccounts.id,
          imapHost: emailAccounts.imapHost,
          imapPort: emailAccounts.imapPort,
          smtpHost: emailAccounts.smtpHost,
          smtpPort: emailAccounts.smtpPort,
          username: emailAccounts.username,
          fromAddress: emailAccounts.fromAddress,
        });

      logger.info(
        { userId: ctx.user.id, accountId: updated.id },
        "Email account updated",
      );

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.email_account,
        entityId: updated.id,
        action: "update",
      });

      return updated;
    }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const deleted = await db
      .delete(emailAccounts)
      .where(eq(emailAccounts.userId, ctx.user.id))
      .returning({ id: emailAccounts.id });

    if (deleted.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No email account found",
      });
    }

    logger.info({ userId: ctx.user.id }, "Email account deleted");

    logAudit({
      userId: ctx.user.id,
      entityType: AUDIT_ENTITY_TYPES.email_account,
      entityId: deleted[0].id,
      action: "delete",
    });

    return { success: true };
  }),

  testConnection: protectedProcedure
    .input(testEmailConnectionInput)
    .mutation(async ({ input }) => {
      const results = {
        imap: false,
        smtp: false,
        imapError: "",
        smtpError: "",
      };

      // Test IMAP
      try {
        const { ImapFlow } = await import("imapflow");
        const client = new ImapFlow({
          host: input.imapHost,
          port: input.imapPort,
          secure: input.imapPort === 993,
          auth: { user: input.username, pass: input.password },
          logger: false,
        });
        await client.connect();
        await client.logout();
        results.imap = true;
      } catch (error) {
        results.imapError =
          error instanceof Error ? error.message : "IMAP connection failed";
        logger.warn({ err: error }, "IMAP connection test failed");
      }

      // Test SMTP
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.default.createTransport({
          host: input.smtpHost,
          port: input.smtpPort,
          secure: input.smtpPort === 465,
          auth: { user: input.username, pass: input.password },
        });
        await transporter.verify();
        results.smtp = true;
      } catch (error) {
        results.smtpError =
          error instanceof Error ? error.message : "SMTP connection failed";
        logger.warn({ err: error }, "SMTP connection test failed");
      }

      return results;
    }),

  // ────────────────── Email Listing & Actions ──────────────────

  list: protectedProcedure
    .input(listEmailsInput)
    .query(async ({ ctx, input }) => {
      const [account] = await db
        .select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id))
        .limit(1);

      if (!account) {
        return { emails: [], total: 0, page: input.page, limit: input.limit };
      }

      const matchCondition = input.matched
        ? isNotNull(emails.tenantId)
        : isNull(emails.tenantId);

      const whereClause = and(
        eq(emails.emailAccountId, account.id),
        matchCondition,
      );

      const [totalResult] = await db
        .select({ count: count() })
        .from(emails)
        .where(whereClause);

      const results = await db
        .select()
        .from(emails)
        .where(whereClause)
        .orderBy(desc(emails.receivedAt))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);

      return {
        emails: results,
        total: totalResult.count,
        page: input.page,
        limit: input.limit,
      };
    }),

  getThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [account] = await db
        .select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id))
        .limit(1);

      if (!account) return [];

      return db
        .select()
        .from(emails)
        .where(
          and(
            eq(emails.emailAccountId, account.id),
            eq(emails.threadId, input.threadId),
          ),
        )
        .orderBy(emails.receivedAt);
    }),

  getBody: protectedProcedure
    .input(z.object({ emailId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No email account configured",
        });
      }

      const [email] = await db
        .select()
        .from(emails)
        .where(
          and(
            eq(emails.id, input.emailId),
            eq(emails.emailAccountId, account.id),
          ),
        )
        .limit(1);

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      try {
        const password = decryptEmailPassword(account);
        const { ImapFlow } = await import("imapflow");
        const client = new ImapFlow({
          host: account.imapHost,
          port: account.imapPort,
          secure: account.imapPort === 993,
          auth: { user: account.username, pass: password },
          logger: false,
        });

        await client.connect();
        const lock = await client.getMailboxLock("INBOX");

        try {
          const source = await fetchEmailSource(client, email.messageId);

          if (!source) {
            return {
              email,
              html: "",
              text: "Email body no longer available on server.",
            };
          }

          const { simpleParser } = await import("mailparser");
          const parsed = await simpleParser(source);

          return {
            email,
            html: parsed.html || "",
            text: parsed.text || "",
          };
        } finally {
          lock.release();
          await client.logout();
        }
      } catch (error) {
        logger.error(
          { err: error, emailId: input.emailId },
          "Failed to fetch email body",
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch email body from server",
        });
      }
    }),

  getAttachments: protectedProcedure
    .input(z.object({ emailId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No email account configured",
        });
      }

      const [email] = await db
        .select()
        .from(emails)
        .where(
          and(
            eq(emails.id, input.emailId),
            eq(emails.emailAccountId, account.id),
          ),
        )
        .limit(1);

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      try {
        const password = decryptEmailPassword(account);
        const { ImapFlow } = await import("imapflow");
        const client = new ImapFlow({
          host: account.imapHost,
          port: account.imapPort,
          secure: account.imapPort === 993,
          auth: { user: account.username, pass: password },
          logger: false,
        });

        await client.connect();
        const lock = await client.getMailboxLock("INBOX");

        try {
          const source = await fetchEmailSource(client, email.messageId);

          if (!source) return [];

          const { simpleParser } = await import("mailparser");
          const parsed = await simpleParser(source);

          return (parsed.attachments || []).map(
            (att: {
              filename?: string;
              contentType: string;
              size: number;
            }) => ({
              filename: att.filename || "attachment",
              contentType: att.contentType,
              size: att.size,
            }),
          );
        } finally {
          lock.release();
          await client.logout();
        }
      } catch (error) {
        logger.error(
          { err: error, emailId: input.emailId },
          "Failed to fetch attachments",
        );
        return [];
      }
    }),

  markRead: protectedProcedure
    .input(z.object({ emailId: z.string().uuid(), isRead: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [account] = await db
        .select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No email account configured",
        });
      }

      await db
        .update(emails)
        .set({ isRead: input.isRead })
        .where(
          and(
            eq(emails.id, input.emailId),
            eq(emails.emailAccountId, account.id),
          ),
        );

      return { success: true };
    }),

  assign: protectedProcedure
    .input(manualAssignInput)
    .mutation(async ({ ctx, input }) => {
      const [account] = await db
        .select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No email account configured",
        });
      }

      await db
        .update(emails)
        .set({
          tenantId: input.tenantId,
          propertyId: input.propertyId,
        })
        .where(
          and(
            eq(emails.id, input.emailId),
            eq(emails.emailAccountId, account.id),
          ),
        );

      return { success: true };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [account] = await db
      .select({ id: emailAccounts.id })
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, ctx.user.id))
      .limit(1);

    if (!account) return { count: 0 };

    const [result] = await db
      .select({ count: count() })
      .from(emails)
      .where(
        and(eq(emails.emailAccountId, account.id), eq(emails.isRead, false)),
      );

    return { count: result.count };
  }),

  syncNow: protectedProcedure.mutation(async ({ ctx }) => {
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, ctx.user.id))
      .limit(1);

    if (!account) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No email account configured",
      });
    }

    // Dynamic import to avoid circular deps
    const { syncEmailAccount } = await import("../services/email-sync");
    const result = await syncEmailAccount(account);

    return result;
  }),

  // ────────────────── Email Sending ──────────────────

  send: protectedProcedure
    .input(sendEmailInput)
    .mutation(async ({ ctx, input }) => {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No email account configured",
        });
      }

      const [user] = await db
        .select({
          emailSignature: users.emailSignature,
          trackingPixelEnabled: users.trackingPixelEnabled,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const password = decryptEmailPassword(account);
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: account.smtpHost,
        port: account.smtpPort,
        secure: account.smtpPort === 465,
        auth: { user: account.username, pass: password },
      });

      let htmlBody = input.htmlBody;

      // Append signature if configured
      if (user?.emailSignature) {
        htmlBody += `<br/><br/>--<br/>${user.emailSignature}`;
      }

      // Generate tracking token if enabled
      let trackingToken: string | null = null;
      if (user?.trackingPixelEnabled) {
        const { randomBytes } = await import("crypto");
        trackingToken = randomBytes(32).toString("base64url");
        const baseUrl =
          process.env.NEXTAUTH_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000";
        htmlBody += `<img src="${baseUrl}/api/track/${trackingToken}" width="1" height="1" style="display:none" alt="" />`;
      }

      const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${account.smtpHost}>`;

      await transporter.sendMail({
        from: account.fromAddress,
        to: input.to.join(", "),
        cc: input.cc?.join(", "),
        bcc: input.bcc?.join(", "),
        subject: input.subject,
        html: htmlBody,
        messageId,
        inReplyTo: input.replyToMessageId,
        references: input.replyToMessageId,
      });

      // Store sent email in DB
      await db.insert(emails).values({
        emailAccountId: account.id,
        tenantId: input.tenantId ?? null,
        propertyId: input.propertyId ?? null,
        messageId,
        inReplyTo: input.replyToMessageId ?? null,
        threadId: input.threadId ?? messageId,
        fromAddress: account.fromAddress,
        toAddresses: input.to.join(", "),
        subject: input.subject,
        receivedAt: new Date(),
        isRead: true,
        isInbound: false,
        trackingToken,
      });

      logger.info(
        { userId: ctx.user.id, to: input.to },
        "Email sent successfully",
      );

      return { success: true, messageId };
    }),

  // ────────────────── Email Templates ──────────────────

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.userId, ctx.user.id))
      .orderBy(emailTemplates.name);
  }),

  createTemplate: protectedProcedure
    .input(createEmailTemplateInput)
    .mutation(async ({ ctx, input }) => {
      const [template] = await db
        .insert(emailTemplates)
        .values({
          userId: ctx.user.id,
          name: input.name,
          subject: input.subject,
          body: input.body,
        })
        .returning();

      return template;
    }),

  updateTemplate: protectedProcedure
    .input(updateEmailTemplateInput)
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.subject !== undefined) updateData.subject = input.subject;
      if (input.body !== undefined) updateData.body = input.body;

      const [updated] = await db
        .update(emailTemplates)
        .set(updateData)
        .where(
          and(
            eq(emailTemplates.id, input.id),
            eq(emailTemplates.userId, ctx.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      return updated;
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db
        .delete(emailTemplates)
        .where(
          and(
            eq(emailTemplates.id, input.id),
            eq(emailTemplates.userId, ctx.user.id),
          ),
        )
        .returning({ id: emailTemplates.id });

      if (deleted.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      return { success: true };
    }),

  // ────────────────── Attachment Transfer ──────────────────

  transferAttachment: protectedProcedure
    .input(
      z.object({
        emailId: z.string().uuid(),
        filename: z.string().min(1),
        propertyId: z.string().uuid(),
        category: z.string().min(1),
        newFilename: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No email account configured",
        });
      }

      const [email] = await db
        .select()
        .from(emails)
        .where(
          and(
            eq(emails.id, input.emailId),
            eq(emails.emailAccountId, account.id),
          ),
        )
        .limit(1);

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      try {
        const password = decryptEmailPassword(account);
        const { ImapFlow } = await import("imapflow");
        const client = new ImapFlow({
          host: account.imapHost,
          port: account.imapPort,
          secure: account.imapPort === 993,
          auth: { user: account.username, pass: password },
          logger: false,
        });

        await client.connect();
        const lock = await client.getMailboxLock("INBOX");

        try {
          const source = await fetchEmailSource(client, email.messageId);

          if (!source) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Email no longer on server",
            });
          }

          const { simpleParser } = await import("mailparser");
          const parsed = await simpleParser(source);

          const attachment = parsed.attachments?.find(
            (att: { filename?: string }) => att.filename === input.filename,
          );

          if (!attachment) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Attachment not found",
            });
          }

          // Validate file size (25MB)
          if (attachment.size > 25 * 1024 * 1024) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Attachment exceeds 25MB limit",
            });
          }

          const fs = await import("fs/promises");
          const path = await import("path");

          const finalFilename = input.newFilename || input.filename;
          const uploadDir = path.join(
            process.cwd(),
            "uploads",
            ctx.user.id,
            input.propertyId,
            input.category,
          );

          await fs.mkdir(uploadDir, { recursive: true });
          const filePath = path.join(uploadDir, finalFilename);
          await fs.writeFile(filePath, attachment.content);

          // Store in documents table
          const { documents } = await import("@repo/shared/db/schema");
          const [doc] = await db
            .insert(documents)
            .values({
              userId: ctx.user.id,
              propertyId: input.propertyId,
              category: input.category,
              fileName: finalFilename,
              filePath: `uploads/${ctx.user.id}/${input.propertyId}/${input.category}/${finalFilename}`,
              fileSize: attachment.size,
              mimeType: attachment.contentType,
              emailId: input.emailId,
              sourceFilename: input.filename,
            })
            .returning();

          logger.info(
            {
              userId: ctx.user.id,
              documentId: doc.id,
              emailId: input.emailId,
            },
            "Attachment transferred to property documents",
          );

          return { documentId: doc.id, fileName: finalFilename };
        } finally {
          lock.release();
          await client.logout();
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error({ err: error }, "Failed to transfer attachment");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to transfer attachment",
        });
      }
    }),

  // ────────────────── User Preferences ──────────────────

  updateSignature: protectedProcedure
    .input(z.object({ signature: z.string().max(5000) }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(users)
        .set({
          emailSignature: input.signature,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select({
        emailSignature: users.emailSignature,
        pushEnabled: users.pushEnabled,
        notifyNewEmail: users.notifyNewEmail,
        notifyOverdueRent: users.notifyOverdueRent,
        notifyContractExpiry: users.notifyContractExpiry,
        trackingPixelEnabled: users.trackingPixelEnabled,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return user;
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        pushEnabled: z.boolean().optional(),
        notifyNewEmail: z.boolean().optional(),
        notifyOverdueRent: z.boolean().optional(),
        notifyContractExpiry: z.boolean().optional(),
        trackingPixelEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.pushEnabled !== undefined)
        updateData.pushEnabled = input.pushEnabled;
      if (input.notifyNewEmail !== undefined)
        updateData.notifyNewEmail = input.notifyNewEmail;
      if (input.notifyOverdueRent !== undefined)
        updateData.notifyOverdueRent = input.notifyOverdueRent;
      if (input.notifyContractExpiry !== undefined)
        updateData.notifyContractExpiry = input.notifyContractExpiry;
      if (input.trackingPixelEnabled !== undefined)
        updateData.trackingPixelEnabled = input.trackingPixelEnabled;

      await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
});
