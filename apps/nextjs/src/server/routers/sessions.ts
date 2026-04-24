import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { sessions } from "@repo/shared/db/schema";
import { router, protectedProcedure } from "../trpc";
import { invalidateSession, invalidateAllSessions } from "../auth/session";

export const sessionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .select({
        id: sessions.id,
        userAgent: sessions.userAgent,
        ipAddress: sessions.ipAddress,
        lastActiveAt: sessions.lastActiveAt,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, ctx.user.id))
      .orderBy(sessions.lastActiveAt);

    return result;
  }),

  revoke: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Ensure user owns the session
      const [session] = await db
        .select({ id: sessions.id, userId: sessions.userId })
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .limit(1);

      if (!session || session.userId !== ctx.user.id) {
        return { success: false };
      }

      await invalidateSession(input.sessionId);
      return { success: true };
    }),

  revokeAll: protectedProcedure.mutation(async ({ ctx }) => {
    await invalidateAllSessions(ctx.user.id);
    return { success: true };
  }),
});
