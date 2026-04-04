import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { users } from "@repo/shared/db/schema";
import { registerInput, loginInput } from "@repo/shared/validation";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, invalidateSession } from "../auth/session";
import { router, publicProcedure, protectedProcedure } from "../trpc";

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

    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
      })
      .returning({ id: users.id, name: users.name, email: users.email });

    await createSession(user.id);

    return { user };
  }),

  login: publicProcedure.input(loginInput).mutation(async ({ input }) => {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
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

    await createSession(user.id);

    return {
      user: { id: user.id, name: user.name, email: user.email },
    };
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await invalidateSession(ctx.sessionToken);
    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const [fullUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
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
