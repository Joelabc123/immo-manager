import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import { documents, properties } from "@repo/shared/db/schema";
import {
  listDocumentsInput,
  updateDocumentInput,
} from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";
import { logAudit, diffChanges } from "../services/audit";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";

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

export const documentsRouter = router({
  list: protectedProcedure
    .input(listDocumentsInput)
    .query(async ({ ctx, input }) => {
      const { propertyId, category, search, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [eq(documents.userId, ctx.user.id)];

      if (propertyId) {
        conditions.push(eq(documents.propertyId, propertyId));
      }

      if (category) {
        conditions.push(eq(documents.category, category));
      }

      if (search) {
        conditions.push(ilike(documents.fileName, `%${search}%`));
      }

      const whereClause = and(...conditions);

      const [items, [totalResult]] = await Promise.all([
        db
          .select({
            id: documents.id,
            propertyId: documents.propertyId,
            category: documents.category,
            fileName: documents.fileName,
            filePath: documents.filePath,
            fileSize: documents.fileSize,
            mimeType: documents.mimeType,
            createdAt: documents.createdAt,
            propertyStreet: properties.street,
            propertyCity: properties.city,
          })
          .from(documents)
          .leftJoin(properties, eq(documents.propertyId, properties.id))
          .where(whereClause)
          .orderBy(desc(documents.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(documents).where(whereClause),
      ]);

      return {
        items,
        total: totalResult.count,
        page,
        limit,
      };
    }),

  getByProperty: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyPropertyOwnership(input.propertyId, ctx.user.id);

      const items = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.propertyId, input.propertyId),
            eq(documents.userId, ctx.user.id),
          ),
        )
        .orderBy(desc(documents.createdAt));

      return items;
    }),

  update: protectedProcedure
    .input(updateDocumentInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(documents)
        .where(
          and(eq(documents.id, input.id), eq(documents.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const updateData: Record<string, string> = {};
      if (input.fileName) updateData.fileName = input.fileName;
      if (input.category) updateData.category = input.category;

      if (Object.keys(updateData).length === 0) {
        return existing;
      }

      const [updated] = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, input.id))
        .returning();

      const changes = diffChanges(existing, updateData, [
        "fileName",
        "category",
      ]);
      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.document,
          entityId: input.id,
          action: "update",
          changes,
        });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(documents)
        .where(
          and(eq(documents.id, input.id), eq(documents.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Delete file from disk
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const filePath = path.join(process.cwd(), "uploads", existing.filePath);
        await fs.unlink(filePath);
      } catch {
        // File may already be deleted — continue with DB cleanup
      }

      await db.delete(documents).where(eq(documents.id, input.id));

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.document,
        entityId: input.id,
        action: "delete",
      });

      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await db
      .select({
        propertyId: documents.propertyId,
        totalCount: count(),
        totalSize: sum(documents.fileSize),
      })
      .from(documents)
      .where(eq(documents.userId, ctx.user.id))
      .groupBy(documents.propertyId);

    const overall = stats.reduce(
      (acc, s) => ({
        totalCount: acc.totalCount + s.totalCount,
        totalSize: acc.totalSize + Number(s.totalSize ?? 0),
      }),
      { totalCount: 0, totalSize: 0 },
    );

    return {
      overall,
      byProperty: stats,
    };
  }),

  getTransferredByEmail: protectedProcedure
    .input(z.object({ emailId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const transferred = await db
        .select({
          sourceFilename: documents.sourceFilename,
          category: documents.category,
        })
        .from(documents)
        .where(
          and(
            eq(documents.userId, ctx.user.id),
            eq(documents.emailId, input.emailId),
          ),
        );

      return transferred;
    }),
});
