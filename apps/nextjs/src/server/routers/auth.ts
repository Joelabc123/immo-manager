import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { users } from "@repo/shared/db/schema";
import {
  registerInput,
  loginInput,
  verifyEmailInput,
  forgotPasswordInput,
  resetPasswordInput,
  resendVerificationInput,
} from "@repo/shared/validation";
import { hashPassword, verifyPassword } from "../auth/password";
import {
  createSessionTokens,
  invalidateCurrentSession,
  invalidateAllSessions,
  getRequestMetaAsync,
} from "../auth/session";
import {
  createVerificationToken,
  validateVerificationToken,
  deleteVerificationToken,
} from "../auth/verification";
import { logger } from "@/lib/logger";
import { sendMail } from "../mail";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import type { UserRole } from "@repo/shared/db/schema";

interface AuthEmailRecipient {
  email: string;
  name: string;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function sendVerificationEmail(
  recipient: AuthEmailRecipient,
  token: string,
): Promise<void> {
  const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: recipient.email,
    subject: "Verify your Immo Manager account",
    text: `Hello ${recipient.name},\n\nplease verify your email address by opening this link:\n${verifyUrl}\n\nIf you did not create this account, you can ignore this email.`,
    html: `<p>Hello ${recipient.name},</p><p>Please verify your email address by opening this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>If you did not create this account, you can ignore this email.</p>`,
  });
}

async function sendPasswordResetEmail(
  recipient: AuthEmailRecipient,
  token: string,
): Promise<void> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: recipient.email,
    subject: "Reset your Immo Manager password",
    text: `Hello ${recipient.name},\n\nuse this link to reset your password:\n${resetUrl}\n\nIf you did not request a password reset, you can ignore this email.`,
    html: `<p>Hello ${recipient.name},</p><p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request a password reset, you can ignore this email.</p>`,
  });
}

export const authRouter = router({
  register: publicProcedure.input(registerInput).mutation(async ({ input }) => {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Email already registered",
      });
    }

    const passwordHash = await hashPassword(input.password);

    // Auto-promote to admin if email matches ADMIN_EMAIL env var
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const isAdmin = adminEmail && input.email.toLowerCase() === adminEmail;
    const role: UserRole = isAdmin ? "admin" : "member";

    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
        role,
        emailVerified: isAdmin ? true : false,
      })
      .returning({ id: users.id, name: users.name, email: users.email });

    if (!isAdmin) {
      // Create email verification token
      const token = await createVerificationToken(user.id, "email_verify");

      await sendVerificationEmail(
        {
          email: input.email,
          name: input.name,
        },
        token,
      );
    }

    return {
      success: true,
      message: isAdmin ? "admin_account_created" : "verification_email_sent",
      requiresVerification: !isAdmin,
    };
  }),

  login: publicProcedure.input(loginInput).mutation(async ({ input }) => {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        banned: users.banned,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    if (user.banned) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "account_banned",
      });
    }

    if (!user.emailVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "email_not_verified",
      });
    }

    const { userAgent, ipAddress } = await getRequestMetaAsync();

    await createSessionTokens(
      user.id,
      user.role as UserRole,
      user.email,
      user.name,
      userAgent ?? undefined,
      ipAddress ?? undefined,
      input.rememberMe,
    );

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }),

  verifyEmail: publicProcedure
    .input(verifyEmailInput)
    .mutation(async ({ input }) => {
      const result = await validateVerificationToken(
        input.token,
        "email_verify",
      );

      if (!result) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification token",
        });
      }

      // Mark user as verified
      const [user] = await db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, result.userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        });

      // Delete used token
      await deleteVerificationToken(result.tokenId);

      // Auto-login after verification
      const { userAgent, ipAddress } = await getRequestMetaAsync();
      await createSessionTokens(
        user.id,
        user.role as UserRole,
        user.email,
        user.name,
        userAgent ?? undefined,
        ipAddress ?? undefined,
      );

      return { success: true };
    }),

  forgotPassword: publicProcedure
    .input(forgotPasswordInput)
    .mutation(async ({ input }) => {
      const [user] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (user) {
        const token = await createVerificationToken(user.id, "password_reset");

        try {
          await sendPasswordResetEmail(
            {
              email: input.email,
              name: user.name,
            },
            token,
          );
        } catch (error) {
          logger.error(
            {
              err: error,
              userId: user.id,
              email: input.email,
            },
            "Failed to send password reset email",
          );
        }
      }

      // Always return success to prevent email enumeration
      return { success: true };
    }),

  resetPassword: publicProcedure
    .input(resetPasswordInput)
    .mutation(async ({ input }) => {
      const result = await validateVerificationToken(
        input.token,
        "password_reset",
      );

      if (!result) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token",
        });
      }

      const passwordHash = await hashPassword(input.password);

      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, result.userId));

      // Delete used token
      await deleteVerificationToken(result.tokenId);

      // Invalidate all sessions for security
      await invalidateAllSessions(result.userId);

      return { success: true };
    }),

  resendVerification: publicProcedure
    .input(resendVerificationInput)
    .mutation(async ({ input }) => {
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (user && !user.emailVerified) {
        const token = await createVerificationToken(user.id, "email_verify");

        await sendVerificationEmail(
          {
            email: input.email,
            name: user.name,
          },
          token,
        );
      }

      // Always return success to prevent email enumeration
      return { success: true };
    }),

  logout: protectedProcedure.mutation(async () => {
    await invalidateCurrentSession();
    return { success: true };
  }),

  logoutAll: protectedProcedure.mutation(async ({ ctx }) => {
    await invalidateAllSessions(ctx.user.id);
    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const [fullUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        language: users.language,
        currency: users.currency,
        taxRate: users.taxRate,
        retirementYear: users.retirementYear,
        healthScoreCashflowWeight: users.healthScoreCashflowWeight,
        healthScoreLtvWeight: users.healthScoreLtvWeight,
        healthScoreYieldWeight: users.healthScoreYieldWeight,
        kpiPeriod: users.kpiPeriod,
        dscrTarget: users.dscrTarget,
        donutThreshold: users.donutThreshold,
        brokerFeeDefault: users.brokerFeeDefault,
        annualAppreciationDefault: users.annualAppreciationDefault,
        capitalGainsTax: users.capitalGainsTax,
        emailSignature: users.emailSignature,
        shareLinkValidityDays: users.shareLinkValidityDays,
        pushEnabled: users.pushEnabled,
        notifyNewEmail: users.notifyNewEmail,
        notifyOverdueRent: users.notifyOverdueRent,
        notifyContractExpiry: users.notifyContractExpiry,
        trackingPixelEnabled: users.trackingPixelEnabled,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return { user: fullUser };
  }),
});
