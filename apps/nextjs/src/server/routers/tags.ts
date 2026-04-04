import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import { tags } from "@repo/shared/db/schema";
import { router, protectedProcedure } from "../trpc";

export const tagsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [tag] = await db
        .insert(tags)
        .values({
          userId: ctx.user.id,
          name: input.name,
          color: input.color ?? null,
        })
        .returning();

      return tag;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return db.select().from(tags).where(eq(tags.userId, ctx.user.id));
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.id, input.id), eq(tags.userId, ctx.user.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
      }

      const [updated] = await db
        .update(tags)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.color !== undefined && { color: input.color }),
        })
        .where(eq(tags.id, input.id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.id, input.id), eq(tags.userId, ctx.user.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
      }

      // Cascading delete handles propertyTags junction entries
      await db.delete(tags).where(eq(tags.id, input.id));

      return { success: true };
    }),
});
