import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { users } from "@repo/shared/db/schema";
import {
  updateProfileInput,
  changePasswordInput,
  updatePreferencesInput,
} from "@repo/shared/validation";
import { hashPassword, verifyPassword } from "../auth/password";
import { router, protectedProcedure } from "../trpc";
import { logAudit } from "../services/audit";

export const userSettingsRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        emailSignature: users.emailSignature,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),

  updateProfile: protectedProcedure
    .input(updateProfileInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailSignature: users.emailSignature,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (input.email !== existing.email) {
        const [emailTaken] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (emailTaken) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }
      }

      await db
        .update(users)
        .set({
          name: input.name,
          email: input.email,
          emailSignature: input.emailSignature,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      const changes = [];
      if (input.name !== existing.name) {
        changes.push({
          field: "name",
          oldValue: existing.name,
          newValue: input.name,
        });
      }
      if (input.email !== existing.email) {
        changes.push({
          field: "email",
          oldValue: existing.email,
          newValue: input.email,
        });
      }
      if (input.emailSignature !== existing.emailSignature) {
        changes.push({
          field: "emailSignature",
          oldValue: existing.emailSignature,
          newValue: input.emailSignature,
        });
      }

      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: "user",
          entityId: ctx.user.id,
          action: "update",
          changes,
        });
      }

      return { success: true };
    }),

  changePassword: protectedProcedure
    .input(changePasswordInput)
    .mutation(async ({ ctx, input }) => {
      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      const [user] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const valid = await verifyPassword(
        user.passwordHash,
        input.currentPassword,
      );
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      const newHash = await hashPassword(input.newPassword);

      await db
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, ctx.user.id));

      logAudit({
        userId: ctx.user.id,
        entityType: "user",
        entityId: ctx.user.id,
        action: "update",
        changes: [{ field: "password", oldValue: null, newValue: "[changed]" }],
      });

      return { success: true };
    }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select({
        currency: users.currency,
        language: users.language,
        taxRate: users.taxRate,
        retirementYear: users.retirementYear,
        healthScoreCashflowWeight: users.healthScoreCashflowWeight,
        healthScoreLtvWeight: users.healthScoreLtvWeight,
        healthScoreYieldWeight: users.healthScoreYieldWeight,
        kpiPeriod: users.kpiPeriod,
        dscrTarget: users.dscrTarget,
        donutThreshold: users.donutThreshold,
        brokerFeeDefault: users.brokerFeeDefault,
        shareLinkValidityDays: users.shareLinkValidityDays,
        annualAppreciationDefault: users.annualAppreciationDefault,
        capitalGainsTax: users.capitalGainsTax,
        pushEnabled: users.pushEnabled,
        notifyNewEmail: users.notifyNewEmail,
        notifyOverdueRent: users.notifyOverdueRent,
        notifyContractExpiry: users.notifyContractExpiry,
        trackingPixelEnabled: users.trackingPixelEnabled,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),

  updatePreferences: protectedProcedure
    .input(updatePreferencesInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({
          currency: users.currency,
          language: users.language,
          taxRate: users.taxRate,
          retirementYear: users.retirementYear,
          healthScoreCashflowWeight: users.healthScoreCashflowWeight,
          healthScoreLtvWeight: users.healthScoreLtvWeight,
          healthScoreYieldWeight: users.healthScoreYieldWeight,
          kpiPeriod: users.kpiPeriod,
          dscrTarget: users.dscrTarget,
          donutThreshold: users.donutThreshold,
          brokerFeeDefault: users.brokerFeeDefault,
          shareLinkValidityDays: users.shareLinkValidityDays,
          annualAppreciationDefault: users.annualAppreciationDefault,
          capitalGainsTax: users.capitalGainsTax,
          pushEnabled: users.pushEnabled,
          notifyNewEmail: users.notifyNewEmail,
          notifyOverdueRent: users.notifyOverdueRent,
          notifyContractExpiry: users.notifyContractExpiry,
          trackingPixelEnabled: users.trackingPixelEnabled,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await db
        .update(users)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(users.id, ctx.user.id));

      const changes: {
        field: string;
        oldValue: string | null;
        newValue: string | null;
      }[] = [];
      for (const key of Object.keys(input) as (keyof typeof input)[]) {
        const oldVal = existing[key];
        const newVal = input[key];
        if (String(oldVal) !== String(newVal)) {
          changes.push({
            field: key,
            oldValue: oldVal != null ? String(oldVal) : null,
            newValue: newVal != null ? String(newVal) : null,
          });
        }
      }

      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: "user",
          entityId: ctx.user.id,
          action: "update",
          changes,
        });
      }

      return { success: true };
    }),

  deleteAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    await db
      .update(users)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(users.id, ctx.user.id));

    logAudit({
      userId: ctx.user.id,
      entityType: "user",
      entityId: ctx.user.id,
      action: "update",
      changes: [{ field: "avatarUrl", oldValue: null, newValue: null }],
    });

    return { success: true };
  }),
});
