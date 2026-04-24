import { z } from "zod";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { users, sessions, properties } from "@repo/shared/db/schema";
import type { UserRole } from "@repo/shared/db/schema";
import { router, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { invalidateSession } from "../auth/session";

const USER_ROLES_VALID: UserRole[] = ["member", "admin"];

export const adminRouter = router({
  listUsers: adminProcedure.query(async () => {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        banned: users.banned,
        emailVerified: users.emailVerified,
        language: users.language,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return result;
  }),

  getUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          banned: users.banned,
          emailVerified: users.emailVerified,
          language: users.language,
          currency: users.currency,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Count active sessions
      const [sessionCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sessions)
        .where(eq(sessions.userId, input.userId));

      // Count properties
      const [propertyCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(properties)
        .where(eq(properties.userId, input.userId));

      return {
        ...user,
        sessionCount: sessionCount?.count ?? 0,
        propertyCount: propertyCount?.count ?? 0,
      };
    }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(["member", "admin"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }

      if (!USER_ROLES_VALID.includes(input.role)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid role" });
      }

      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete your own account",
        });
      }

      await db.delete(users).where(eq(users.id, input.userId));
      return { success: true };
    }),

  listAllProperties: adminProcedure.query(async () => {
    const result = await db
      .select({
        id: properties.id,
        street: properties.street,
        city: properties.city,
        type: properties.type,
        status: properties.status,
        userId: properties.userId,
        ownerName: users.name,
        ownerEmail: users.email,
        createdAt: properties.createdAt,
      })
      .from(properties)
      .innerJoin(users, eq(properties.userId, users.id))
      .orderBy(desc(properties.createdAt));

    return result;
  }),

  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const updates: Record<string, string> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.email !== undefined) updates.email = input.email;

      if (Object.keys(updates).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fields to update",
        });
      }

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await db.update(users).set(updates).where(eq(users.id, input.userId));

      return { success: true };
    }),

  banUser: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        banned: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot ban your own account",
        });
      }

      // Check target user exists and is not an admin
      const [targetUser] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (targetUser.role === "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot ban an admin user",
        });
      }

      await db
        .update(users)
        .set({ banned: input.banned })
        .where(eq(users.id, input.userId));

      // When banning, invalidate all sessions to force logout
      if (input.banned) {
        await db.delete(sessions).where(eq(sessions.userId, input.userId));
      }

      return { success: true };
    }),

  listUserSessions: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          id: sessions.id,
          userAgent: sessions.userAgent,
          ipAddress: sessions.ipAddress,
          lastActiveAt: sessions.lastActiveAt,
          createdAt: sessions.createdAt,
        })
        .from(sessions)
        .where(eq(sessions.userId, input.userId))
        .orderBy(desc(sessions.lastActiveAt));

      return result;
    }),

  revokeUserSession: adminProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await invalidateSession(input.sessionId);
      return { success: true };
    }),

  revokeAllUserSessions: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(sessions).where(eq(sessions.userId, input.userId));
      return { success: true };
    }),
});
