import { TRPCError } from "@trpc/server";
import {
  eq,
  and,
  desc,
  isNull,
  isNotNull,
  count,
  inArray,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import {
  emailAccounts,
  emailFolders,
  emails,
  emailLabels,
  emailEmailLabels,
  emailTemplates,
  users,
  tenants,
  rentalUnits,
  properties,
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
  createLabelInput,
  updateLabelInput,
  assignLabelsInput,
} from "@repo/shared/validation";
import { PREDEFINED_LABELS, AUDIT_ENTITY_TYPES } from "@repo/shared/types";
import { publishEvent, REDIS_CHANNELS } from "@repo/shared/utils/redis";
import { router, protectedProcedure } from "../trpc";
import { logAudit } from "../services/audit";
import {
  encryptEmailPassword,
  decryptEmailPassword,
} from "../services/email-crypto";
import { logger } from "@/lib/logger";

/**
 * Verify that an email account belongs to the current user.
 * Throws NOT_FOUND if the account does not exist or belongs to another user.
 */
async function verifyAccountOwnership(accountId: string, userId: string) {
  const [account] = await db
    .select()
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

/**
 * Seed predefined labels for a user (only if they have none yet).
 */
async function seedPredefinedLabels(userId: string) {
  const existing = await db
    .select({ id: emailLabels.id })
    .from(emailLabels)
    .where(eq(emailLabels.userId, userId))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(emailLabels).values(
    PREDEFINED_LABELS.map((label) => ({
      userId,
      name: label.name,
      color: label.color,
      isPredefined: true,
    })),
  );
}

export const emailRouter = router({
  // ────────────────── Email Account CRUD ──────────────────

  createAccount: protectedProcedure
    .input(createEmailAccountInput)
    .mutation(async ({ ctx, input }) => {
      const { encryptedPassword, encryptionIv, encryptionTag } =
        encryptEmailPassword(input.password);

      const [account] = await db
        .insert(emailAccounts)
        .values({
          userId: ctx.user.id,
          label: input.label,
          imapHost: input.imapHost,
          imapPort: input.imapPort,
          smtpHost: input.smtpHost,
          smtpPort: input.smtpPort,
          username: input.username,
          encryptedPassword,
          encryptionIv,
          encryptionTag,
          fromAddress: input.fromAddress,
          syncIntervalMinutes: input.syncIntervalMinutes,
        })
        .returning({
          id: emailAccounts.id,
          label: emailAccounts.label,
          imapHost: emailAccounts.imapHost,
          imapPort: emailAccounts.imapPort,
          smtpHost: emailAccounts.smtpHost,
          smtpPort: emailAccounts.smtpPort,
          username: emailAccounts.username,
          fromAddress: emailAccounts.fromAddress,
          syncIntervalMinutes: emailAccounts.syncIntervalMinutes,
          isActive: emailAccounts.isActive,
        });

      // Seed predefined labels on first account creation
      await seedPredefinedLabels(ctx.user.id);

      // Set as default if it's the first account
      const allAccounts = await db
        .select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id));

      if (allAccounts.length === 1) {
        await db
          .update(users)
          .set({ defaultEmailAccountId: account.id })
          .where(eq(users.id, ctx.user.id));
      }

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

      // Notify email microservice
      await publishEvent(REDIS_CHANNELS.EMAIL_ACCOUNT_UPDATED, {
        accountId: account.id,
        userId: ctx.user.id,
        action: "create",
      });

      return account;
    }),

  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        id: emailAccounts.id,
        label: emailAccounts.label,
        imapHost: emailAccounts.imapHost,
        imapPort: emailAccounts.imapPort,
        smtpHost: emailAccounts.smtpHost,
        smtpPort: emailAccounts.smtpPort,
        username: emailAccounts.username,
        fromAddress: emailAccounts.fromAddress,
        syncIntervalMinutes: emailAccounts.syncIntervalMinutes,
        lastSyncAt: emailAccounts.lastSyncAt,
        syncStatus: emailAccounts.syncStatus,
        syncError: emailAccounts.syncError,
        isActive: emailAccounts.isActive,
        createdAt: emailAccounts.createdAt,
        updatedAt: emailAccounts.updatedAt,
      })
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, ctx.user.id))
      .orderBy(emailAccounts.createdAt);
  }),

  getAccount: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const account = await verifyAccountOwnership(
        input.accountId,
        ctx.user.id,
      );
      // Return without sensitive fields
      return {
        id: account.id,
        label: account.label,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        username: account.username,
        fromAddress: account.fromAddress,
        syncIntervalMinutes: account.syncIntervalMinutes,
        lastSyncAt: account.lastSyncAt,
        syncStatus: account.syncStatus,
        syncError: account.syncError,
        isActive: account.isActive,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      };
    }),

  setDefaultAccount: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyAccountOwnership(input.accountId, ctx.user.id);

      await db
        .update(users)
        .set({ defaultEmailAccountId: input.accountId })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  updateAccount: protectedProcedure
    .input(updateEmailAccountInput)
    .mutation(async ({ ctx, input }) => {
      await verifyAccountOwnership(input.id, ctx.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (input.label !== undefined) updateData.label = input.label;
      if (input.imapHost !== undefined) updateData.imapHost = input.imapHost;
      if (input.imapPort !== undefined) updateData.imapPort = input.imapPort;
      if (input.smtpHost !== undefined) updateData.smtpHost = input.smtpHost;
      if (input.smtpPort !== undefined) updateData.smtpPort = input.smtpPort;
      if (input.username !== undefined) updateData.username = input.username;
      if (input.fromAddress !== undefined)
        updateData.fromAddress = input.fromAddress;
      if (input.syncIntervalMinutes !== undefined)
        updateData.syncIntervalMinutes = input.syncIntervalMinutes;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

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
          label: emailAccounts.label,
          imapHost: emailAccounts.imapHost,
          imapPort: emailAccounts.imapPort,
          smtpHost: emailAccounts.smtpHost,
          smtpPort: emailAccounts.smtpPort,
          username: emailAccounts.username,
          fromAddress: emailAccounts.fromAddress,
          syncIntervalMinutes: emailAccounts.syncIntervalMinutes,
          isActive: emailAccounts.isActive,
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

      await publishEvent(REDIS_CHANNELS.EMAIL_ACCOUNT_UPDATED, {
        accountId: updated.id,
        userId: ctx.user.id,
        action: "update",
      });

      return updated;
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyAccountOwnership(input.accountId, ctx.user.id);

      await db
        .delete(emailAccounts)
        .where(eq(emailAccounts.id, input.accountId));

      // If this was the default, clear or reassign
      const [user] = await db
        .select({ defaultEmailAccountId: users.defaultEmailAccountId })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (user?.defaultEmailAccountId === input.accountId) {
        const [next] = await db
          .select({ id: emailAccounts.id })
          .from(emailAccounts)
          .where(eq(emailAccounts.userId, ctx.user.id))
          .limit(1);

        await db
          .update(users)
          .set({ defaultEmailAccountId: next?.id ?? null })
          .where(eq(users.id, ctx.user.id));
      }

      logger.info(
        { userId: ctx.user.id, accountId: input.accountId },
        "Email account deleted",
      );

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.email_account,
        entityId: input.accountId,
        action: "delete",
      });

      await publishEvent(REDIS_CHANNELS.EMAIL_ACCOUNT_UPDATED, {
        accountId: input.accountId,
        userId: ctx.user.id,
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

  // ────────────────── Folders ──────────────────

  listFolders: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyAccountOwnership(input.accountId, ctx.user.id);

      return db
        .select()
        .from(emailFolders)
        .where(eq(emailFolders.emailAccountId, input.accountId))
        .orderBy(emailFolders.type, emailFolders.name);
    }),

  // ────────────────── Labels ──────────────────

  listLabels: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(emailLabels)
      .where(eq(emailLabels.userId, ctx.user.id))
      .orderBy(emailLabels.isPredefined, emailLabels.name);
  }),

  createLabel: protectedProcedure
    .input(createLabelInput)
    .mutation(async ({ ctx, input }) => {
      const [label] = await db
        .insert(emailLabels)
        .values({
          userId: ctx.user.id,
          name: input.name,
          color: input.color,
          isPredefined: false,
        })
        .returning();

      return label;
    }),

  updateLabel: protectedProcedure
    .input(updateLabelInput)
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.color !== undefined) updateData.color = input.color;

      const [updated] = await db
        .update(emailLabels)
        .set(updateData)
        .where(
          and(
            eq(emailLabels.id, input.id),
            eq(emailLabels.userId, ctx.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Label not found",
        });
      }

      return updated;
    }),

  deleteLabel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db
        .delete(emailLabels)
        .where(
          and(
            eq(emailLabels.id, input.id),
            eq(emailLabels.userId, ctx.user.id),
            eq(emailLabels.isPredefined, false),
          ),
        )
        .returning({ id: emailLabels.id });

      if (deleted.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Label not found or is predefined",
        });
      }

      return { success: true };
    }),

  assignLabels: protectedProcedure
    .input(assignLabelsInput)
    .mutation(async ({ ctx, input }) => {
      // Verify the email belongs to one of the user's accounts
      const [email] = await db
        .select({ id: emails.id, emailAccountId: emails.emailAccountId })
        .from(emails)
        .where(eq(emails.id, input.emailId))
        .limit(1);

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      await verifyAccountOwnership(email.emailAccountId, ctx.user.id);

      // Verify all labels belong to the user
      if (input.labelIds.length > 0) {
        const validLabels = await db
          .select({ id: emailLabels.id })
          .from(emailLabels)
          .where(
            and(
              inArray(emailLabels.id, input.labelIds),
              eq(emailLabels.userId, ctx.user.id),
            ),
          );

        if (validLabels.length !== input.labelIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more labels not found",
          });
        }
      }

      // Remove existing labels
      await db
        .delete(emailEmailLabels)
        .where(eq(emailEmailLabels.emailId, input.emailId));

      // Insert new assignments
      if (input.labelIds.length > 0) {
        await db.insert(emailEmailLabels).values(
          input.labelIds.map((labelId) => ({
            emailId: input.emailId,
            labelId,
          })),
        );
      }

      return { success: true };
    }),

  removeLabel: protectedProcedure
    .input(
      z.object({
        emailId: z.string().uuid(),
        labelId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [email] = await db
        .select({ emailAccountId: emails.emailAccountId })
        .from(emails)
        .where(eq(emails.id, input.emailId))
        .limit(1);

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      await verifyAccountOwnership(email.emailAccountId, ctx.user.id);

      await db
        .delete(emailEmailLabels)
        .where(
          and(
            eq(emailEmailLabels.emailId, input.emailId),
            eq(emailEmailLabels.labelId, input.labelId),
          ),
        );

      return { success: true };
    }),

  // ────────────────── Email Listing & Actions ──────────────────

  tenantsWithEmails: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyAccountOwnership(input.accountId, ctx.user.id);

      // Find all tenants who have sent at least one inbound email to this account
      const results = await db
        .select({
          tenantId: emails.tenantId,
          firstName: tenants.firstName,
          lastName: tenants.lastName,
          propertyStreet: properties.street,
          propertyCity: properties.city,
          unreadCount: sql<number>`count(*) filter (where ${emails.isRead} = false)`,
        })
        .from(emails)
        .innerJoin(tenants, eq(emails.tenantId, tenants.id))
        .leftJoin(rentalUnits, eq(tenants.rentalUnitId, rentalUnits.id))
        .leftJoin(properties, eq(rentalUnits.propertyId, properties.id))
        .where(
          and(
            eq(emails.emailAccountId, input.accountId),
            isNotNull(emails.tenantId),
            eq(emails.isInbound, true),
          ),
        )
        .groupBy(
          emails.tenantId,
          tenants.firstName,
          tenants.lastName,
          properties.street,
          properties.city,
        )
        .orderBy(tenants.lastName, tenants.firstName);

      return results.map((r) => ({
        tenantId: r.tenantId!,
        firstName: r.firstName,
        lastName: r.lastName,
        propertyName:
          [r.propertyStreet, r.propertyCity].filter(Boolean).join(", ") || null,
        unreadCount: Number(r.unreadCount),
      }));
    }),

  list: protectedProcedure
    .input(listEmailsInput)
    .query(async ({ ctx, input }) => {
      await verifyAccountOwnership(input.accountId, ctx.user.id);

      const conditions = [eq(emails.emailAccountId, input.accountId)];

      if (input.tenantId) {
        // Tenant view: show only inbound emails from this tenant (cross-folder)
        conditions.push(eq(emails.tenantId, input.tenantId));
        conditions.push(eq(emails.isInbound, true));
      } else if (input.folderId) {
        conditions.push(eq(emails.folderId, input.folderId));
      } else if (input.inboundOnly) {
        // "Alle Mails" view: only received emails
        conditions.push(eq(emails.isInbound, true));
      }

      if (input.matched === true) {
        conditions.push(isNotNull(emails.tenantId));
      } else if (input.matched === false) {
        conditions.push(isNull(emails.tenantId));
      }

      const whereClause = and(...conditions);

      const emailSelect = {
        id: emails.id,
        emailAccountId: emails.emailAccountId,
        folderId: emails.folderId,
        tenantId: emails.tenantId,
        propertyId: emails.propertyId,
        messageId: emails.messageId,
        inReplyTo: emails.inReplyTo,
        threadId: emails.threadId,
        fromAddress: emails.fromAddress,
        toAddresses: emails.toAddresses,
        subject: emails.subject,
        snippet: emails.snippet,
        receivedAt: emails.receivedAt,
        isRead: emails.isRead,
        isInbound: emails.isInbound,
        hasAttachments: emails.hasAttachments,
        createdAt: emails.createdAt,
      };

      let emailResults;
      let totalCount: number;

      if (input.labelId) {
        const labelCondition = and(
          whereClause,
          eq(emailEmailLabels.labelId, input.labelId),
        );

        // Fix: include label join in count query
        const [totalResult] = await db
          .select({ count: count() })
          .from(emails)
          .innerJoin(emailEmailLabels, eq(emails.id, emailEmailLabels.emailId))
          .where(labelCondition);

        totalCount = totalResult.count;

        emailResults = await db
          .select(emailSelect)
          .from(emails)
          .innerJoin(emailEmailLabels, eq(emails.id, emailEmailLabels.emailId))
          .where(labelCondition)
          .orderBy(desc(emails.receivedAt))
          .limit(input.limit)
          .offset((input.page - 1) * input.limit);
      } else {
        const [totalResult] = await db
          .select({ count: count() })
          .from(emails)
          .where(whereClause);

        totalCount = totalResult.count;

        emailResults = await db
          .select(emailSelect)
          .from(emails)
          .where(whereClause)
          .orderBy(desc(emails.receivedAt))
          .limit(input.limit)
          .offset((input.page - 1) * input.limit);
      }

      return {
        emails: emailResults,
        total: totalCount,
        page: input.page,
        limit: input.limit,
      };
    }),

  getThread: protectedProcedure
    .input(z.object({ threadId: z.string(), accountId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyAccountOwnership(input.accountId, ctx.user.id);

      return db
        .select()
        .from(emails)
        .where(
          and(
            eq(emails.emailAccountId, input.accountId),
            eq(emails.threadId, input.threadId),
          ),
        )
        .orderBy(emails.receivedAt);
    }),

  getBody: protectedProcedure
    .input(z.object({ emailId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [email] = await db
        .select()
        .from(emails)
        .where(eq(emails.id, input.emailId))
        .limit(1);

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      await verifyAccountOwnership(email.emailAccountId, ctx.user.id);

      // Get labels for this email
      const labels = await db
        .select({
          id: emailLabels.id,
          name: emailLabels.name,
          color: emailLabels.color,
          isPredefined: emailLabels.isPredefined,
        })
        .from(emailEmailLabels)
        .innerJoin(emailLabels, eq(emailEmailLabels.labelId, emailLabels.id))
        .where(eq(emailEmailLabels.emailId, input.emailId));

      return {
        email,
        html: email.htmlBody ?? "",
        text: email.textBody ?? "",
        labels,
      };
    }),

  getAttachments: protectedProcedure
    .input(z.object({ emailId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [email] = await db
        .select()
        .from(emails)
        .where(eq(emails.id, input.emailId))
        .limit(1);

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      const account = await verifyAccountOwnership(
        email.emailAccountId,
        ctx.user.id,
      );

      if (!email.hasAttachments) return [];

      // Fetch from IMAP on-demand (attachments are not cached in DB)
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

        // Find the folder for this email
        const [folder] = email.folderId
          ? await db
              .select({ path: emailFolders.path })
              .from(emailFolders)
              .where(eq(emailFolders.id, email.folderId))
              .limit(1)
          : [{ path: "INBOX" }];

        const lock = await client.getMailboxLock(folder.path);

        try {
          if (email.uid) {
            const message = await client.fetchOne(String(email.uid), {
              source: true,
            });
            if (!message || !message.source) return [];

            const { simpleParser } = await import("mailparser");
            const parsed = await simpleParser(message.source);

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
          }
          return [];
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
      const [email] = await db
        .select({ emailAccountId: emails.emailAccountId })
        .from(emails)
        .where(eq(emails.id, input.emailId))
        .limit(1);

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      await verifyAccountOwnership(email.emailAccountId, ctx.user.id);

      await db
        .update(emails)
        .set({ isRead: input.isRead })
        .where(eq(emails.id, input.emailId));

      return { success: true };
    }),

  assign: protectedProcedure
    .input(manualAssignInput)
    .mutation(async ({ ctx, input }) => {
      const [email] = await db
        .select({ emailAccountId: emails.emailAccountId })
        .from(emails)
        .where(eq(emails.id, input.emailId))
        .limit(1);

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      await verifyAccountOwnership(email.emailAccountId, ctx.user.id);

      await db
        .update(emails)
        .set({
          tenantId: input.tenantId,
          propertyId: input.propertyId,
        })
        .where(eq(emails.id, input.emailId));

      return { success: true };
    }),

  getUnreadCount: protectedProcedure
    .input(z.object({ accountId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.accountId) {
        await verifyAccountOwnership(input.accountId, ctx.user.id);

        const [result] = await db
          .select({ count: count() })
          .from(emails)
          .where(
            and(
              eq(emails.emailAccountId, input.accountId),
              eq(emails.isRead, false),
            ),
          );

        return { count: result.count };
      }

      // Count across all accounts
      const accounts = await db
        .select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id));

      if (accounts.length === 0) return { count: 0 };

      const [result] = await db
        .select({ count: count() })
        .from(emails)
        .where(
          and(
            inArray(
              emails.emailAccountId,
              accounts.map((a) => a.id),
            ),
            eq(emails.isRead, false),
          ),
        );

      return { count: result.count };
    }),

  syncNow: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyAccountOwnership(input.accountId, ctx.user.id);

      // Publish sync request via Redis — the email microservice handles it
      await publishEvent(REDIS_CHANNELS.EMAIL_SYNC_REQUEST, {
        accountId: input.accountId,
      });

      return { success: true, message: "Sync requested" };
    }),

  // ────────────────── Email Sending ──────────────────

  send: protectedProcedure
    .input(sendEmailInput)
    .mutation(async ({ ctx, input }) => {
      const account = await verifyAccountOwnership(
        input.accountId,
        ctx.user.id,
      );

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

      // Find the "sent" folder for this account
      const [sentFolder] = await db
        .select({ id: emailFolders.id })
        .from(emailFolders)
        .where(
          and(
            eq(emailFolders.emailAccountId, account.id),
            eq(emailFolders.type, "sent"),
          ),
        )
        .limit(1);

      // Store sent email in DB
      await db.insert(emails).values({
        emailAccountId: account.id,
        folderId: sentFolder?.id ?? null,
        tenantId: input.tenantId ?? null,
        propertyId: input.propertyId ?? null,
        messageId,
        inReplyTo: input.replyToMessageId ?? null,
        threadId: input.threadId ?? messageId,
        fromAddress: account.fromAddress,
        toAddresses: input.to.join(", "),
        subject: input.subject,
        htmlBody,
        textBody: null,
        snippet: input.subject.slice(0, 200),
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
      const [email] = await db
        .select()
        .from(emails)
        .where(eq(emails.id, input.emailId))
        .limit(1);

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      const account = await verifyAccountOwnership(
        email.emailAccountId,
        ctx.user.id,
      );

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

        // Find the folder for this email
        const [folder] = email.folderId
          ? await db
              .select({ path: emailFolders.path })
              .from(emailFolders)
              .where(eq(emailFolders.id, email.folderId))
              .limit(1)
          : [{ path: "INBOX" }];

        const lock = await client.getMailboxLock(folder.path);

        try {
          let source: Buffer | null = null;
          if (email.uid) {
            const message = await client.fetchOne(String(email.uid), {
              source: true,
            });
            source = message ? (message.source ?? null) : null;
          }

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
