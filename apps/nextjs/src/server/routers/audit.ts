import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { auditLogs } from "@repo/shared/db/schema";
import {
  listAuditLogsInput,
  getEntityAuditInput,
} from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";

const sortColumnMap = {
  createdAt: auditLogs.createdAt,
  action: auditLogs.action,
  entityType: auditLogs.entityType,
  fieldName: auditLogs.fieldName,
} as const;

export const auditRouter = router({
  list: protectedProcedure
    .input(listAuditLogsInput)
    .query(async ({ ctx, input }) => {
      const {
        entityType,
        action,
        entityId,
        search,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
        page,
        pageSize,
      } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [eq(auditLogs.userId, ctx.user.id)];

      if (entityType) {
        conditions.push(eq(auditLogs.entityType, entityType));
      }
      if (action) {
        conditions.push(eq(auditLogs.action, action));
      }
      if (entityId) {
        conditions.push(eq(auditLogs.entityId, entityId));
      }
      if (search) {
        const pattern = `%${search}%`;
        conditions.push(
          or(
            ilike(auditLogs.fieldName, pattern),
            ilike(auditLogs.oldValue, pattern),
            ilike(auditLogs.newValue, pattern),
          )!,
        );
      }
      if (dateFrom) {
        const { gte } = await import("drizzle-orm");
        conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)));
      }
      if (dateTo) {
        const { lte } = await import("drizzle-orm");
        conditions.push(lte(auditLogs.createdAt, new Date(dateTo)));
      }

      const whereClause = and(...conditions);
      const sortCol = sortColumnMap[sortBy];
      const orderBy = sortOrder === "asc" ? asc(sortCol) : desc(sortCol);

      const [items, [totalResult]] = await Promise.all([
        db
          .select()
          .from(auditLogs)
          .where(whereClause)
          .orderBy(orderBy)
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(auditLogs).where(whereClause),
      ]);

      return {
        items,
        total: totalResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(totalResult.count / pageSize),
      };
    }),

  getByEntity: protectedProcedure
    .input(getEntityAuditInput)
    .query(async ({ ctx, input }) => {
      const { entityType, entityId, page, limit } = input;
      const offset = (page - 1) * limit;

      const whereClause = and(
        eq(auditLogs.userId, ctx.user.id),
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId),
      );

      const [items, [totalResult]] = await Promise.all([
        db
          .select()
          .from(auditLogs)
          .where(whereClause)
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(auditLogs).where(whereClause),
      ]);

      return {
        items,
        total: totalResult.count,
        page,
        limit,
        totalPages: Math.ceil(totalResult.count / limit),
      };
    }),
});
