import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import { properties, shareLinks } from "@repo/shared/db/schema";
import {
  createShareLinkInput,
  verifyShareLinkInput,
} from "@repo/shared/validation";
import { hashPassword, verifyPassword } from "../auth/password";

import { router, protectedProcedure, publicProcedure } from "../trpc";

async function verifyPropertyOwnership(
  propertyId: string,
  userId: string,
): Promise<void> {
  const [property] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.userId, userId)))
    .limit(1);

  if (!property) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Property not found",
    });
  }
}

export const shareLinksRouter = router({
  create: protectedProcedure
    .input(createShareLinkInput)
    .mutation(async ({ ctx, input }) => {
      await verifyPropertyOwnership(input.propertyId, ctx.user.id);

      const token = crypto.randomBytes(32).toString("base64url");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      let passwordHash: string | null = null;
      if (input.password) {
        passwordHash = await hashPassword(input.password);
      }

      const [link] = await db
        .insert(shareLinks)
        .values({
          propertyId: input.propertyId,
          userId: ctx.user.id,
          token,
          passwordHash,
          expiresAt,
        })
        .returning();

      return { id: link.id, token: link.token, expiresAt: link.expiresAt };
    }),

  list: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyPropertyOwnership(input.propertyId, ctx.user.id);

      const links = await db
        .select({
          id: shareLinks.id,
          token: shareLinks.token,
          expiresAt: shareLinks.expiresAt,
          hasPassword: shareLinks.passwordHash,
          createdAt: shareLinks.createdAt,
        })
        .from(shareLinks)
        .where(
          and(
            eq(shareLinks.propertyId, input.propertyId),
            eq(shareLinks.userId, ctx.user.id),
          ),
        );

      return links.map((link) => ({
        ...link,
        hasPassword: link.hasPassword !== null,
        isExpired: link.expiresAt < new Date(),
      }));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(shareLinks)
        .where(
          and(eq(shareLinks.id, input.id), eq(shareLinks.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share link not found",
        });
      }

      await db.delete(shareLinks).where(eq(shareLinks.id, input.id));

      return { success: true };
    }),

  verify: publicProcedure
    .input(verifyShareLinkInput)
    .query(async ({ input }) => {
      const [link] = await db
        .select()
        .from(shareLinks)
        .where(
          and(
            eq(shareLinks.token, input.token),
            gt(shareLinks.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!link) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share link not found or expired",
        });
      }

      // Verify password if protected
      if (link.passwordHash) {
        if (!input.password) {
          return { requiresPassword: true as const, property: null };
        }

        const valid = await verifyPassword(link.passwordHash, input.password);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }
      }

      // Fetch basic property info (no financial data)
      const [property] = await db
        .select({
          id: properties.id,
          type: properties.type,
          status: properties.status,
          street: properties.street,
          zipCode: properties.zipCode,
          city: properties.city,
          livingAreaSqm: properties.livingAreaSqm,
          landAreaSqm: properties.landAreaSqm,
          constructionYear: properties.constructionYear,
          roomCount: properties.roomCount,
          thumbnailPath: properties.thumbnailPath,
          latitude: properties.latitude,
          longitude: properties.longitude,
          notes: properties.notes,
        })
        .from(properties)
        .where(eq(properties.id, link.propertyId))
        .limit(1);

      if (!property) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property not found",
        });
      }

      return { requiresPassword: false as const, property };
    }),
});
