import { TRPCError } from "@trpc/server";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  ilike,
  or,
  sql,
  count,
} from "drizzle-orm";
import { db } from "@repo/shared/db";
import {
  tasks,
  tenants,
  properties,
  rentalUnits,
  emails,
} from "@repo/shared/db/schema";
import {
  createTaskInput,
  updateTaskInput,
  updateTaskStatusInput,
  listTasksInput,
  taskIdInput,
  taskCountsByEmailIdsInput,
} from "@repo/shared/validation";
import {
  AUDIT_ENTITY_TYPES,
  AUDIT_ACTIONS,
  TASK_STATUSES,
  OPEN_TASK_STATUSES,
  type TaskStatus,
} from "@repo/shared/types";
import { publishEvent, REDIS_CHANNELS } from "@repo/shared/utils/redis";
import { router, protectedProcedure } from "../trpc";
import { logAudit } from "../services/audit";

/**
 * Verify that a task exists and belongs to the current user.
 */
async function verifyTaskOwnership(taskId: string, userId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  if (!task) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  }

  return task;
}

/**
 * Resolve property/rentalUnit context from a tenantId. Returns nulls when not found.
 */
async function resolveTenantContext(
  tenantId: string,
  userId: string,
): Promise<{ propertyId: string | null; rentalUnitId: string | null }> {
  const [row] = await db
    .select({
      rentalUnitId: tenants.rentalUnitId,
      propertyId: rentalUnits.propertyId,
    })
    .from(tenants)
    .leftJoin(rentalUnits, eq(rentalUnits.id, tenants.rentalUnitId))
    .where(and(eq(tenants.id, tenantId), eq(tenants.userId, userId)))
    .limit(1);

  if (!row) {
    return { propertyId: null, rentalUnitId: null };
  }

  return {
    propertyId: row.propertyId ?? null,
    rentalUnitId: row.rentalUnitId ?? null,
  };
}

const taskRowSelect = {
  id: tasks.id,
  userId: tasks.userId,
  assigneeUserId: tasks.assigneeUserId,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  priority: tasks.priority,
  category: tasks.category,
  dueDate: tasks.dueDate,
  tenantId: tasks.tenantId,
  propertyId: tasks.propertyId,
  rentalUnitId: tasks.rentalUnitId,
  sourceEmailId: tasks.sourceEmailId,
  completedAt: tasks.completedAt,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
  tenantFirstName: tenants.firstName,
  tenantLastName: tenants.lastName,
  propertyStreet: properties.street,
  propertyCity: properties.city,
  rentalUnitName: rentalUnits.name,
  emailSubject: emails.subject,
  emailFromAddress: emails.fromAddress,
} as const;

export const tasksRouter = router({
  list: protectedProcedure
    .input(listTasksInput)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tasks.userId, ctx.user.id)];

      if (input.statuses && input.statuses.length > 0) {
        conditions.push(inArray(tasks.status, input.statuses));
      } else if (!input.includeCompleted) {
        conditions.push(
          inArray(tasks.status, OPEN_TASK_STATUSES as unknown as string[]),
        );
      }

      if (input.priorities && input.priorities.length > 0) {
        conditions.push(inArray(tasks.priority, input.priorities));
      }

      if (input.categories && input.categories.length > 0) {
        conditions.push(inArray(tasks.category, input.categories));
      }

      if (input.tenantId !== undefined) {
        if (input.tenantId === null) {
          conditions.push(isNull(tasks.tenantId));
        } else {
          conditions.push(eq(tasks.tenantId, input.tenantId));
        }
      }

      if (input.propertyId !== undefined && input.propertyId !== null) {
        conditions.push(eq(tasks.propertyId, input.propertyId));
      }

      if (input.search && input.search.trim().length > 0) {
        const term = `%${input.search.trim()}%`;
        const searchCond = or(
          ilike(tasks.title, term),
          ilike(tasks.description, term),
        );
        if (searchCond) conditions.push(searchCond);
      }

      const rows = await db
        .select(taskRowSelect)
        .from(tasks)
        .leftJoin(tenants, eq(tenants.id, tasks.tenantId))
        .leftJoin(properties, eq(properties.id, tasks.propertyId))
        .leftJoin(rentalUnits, eq(rentalUnits.id, tasks.rentalUnitId))
        .leftJoin(emails, eq(emails.id, tasks.sourceEmailId))
        .where(and(...conditions))
        .orderBy(
          // Open first
          sql`CASE WHEN ${tasks.status} = 'done' OR ${tasks.status} = 'cancelled' THEN 1 ELSE 0 END ASC`,
          // Priority high → low
          sql`CASE ${tasks.priority} WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC`,
          // Due date asc, nulls last
          sql`${tasks.dueDate} ASC NULLS LAST`,
          desc(tasks.createdAt),
        );

      return rows;
    }),

  listGroupedByTenant: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select(taskRowSelect)
      .from(tasks)
      .leftJoin(tenants, eq(tenants.id, tasks.tenantId))
      .leftJoin(properties, eq(properties.id, tasks.propertyId))
      .leftJoin(rentalUnits, eq(rentalUnits.id, tasks.rentalUnitId))
      .leftJoin(emails, eq(emails.id, tasks.sourceEmailId))
      .where(
        and(
          eq(tasks.userId, ctx.user.id),
          inArray(tasks.status, OPEN_TASK_STATUSES as unknown as string[]),
        ),
      )
      .orderBy(
        sql`CASE ${tasks.priority} WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC`,
        sql`${tasks.dueDate} ASC NULLS LAST`,
        desc(tasks.createdAt),
      );

    type Row = (typeof rows)[number];
    const groups = new Map<
      string,
      {
        tenantId: string | null;
        tenantFirstName: string | null;
        tenantLastName: string | null;
        propertyStreet: string | null;
        propertyCity: string | null;
        rentalUnitName: string | null;
        tasks: Row[];
      }
    >();

    for (const row of rows) {
      const key = row.tenantId ?? "__unassigned__";
      let entry = groups.get(key);
      if (!entry) {
        entry = {
          tenantId: row.tenantId,
          tenantFirstName: row.tenantFirstName,
          tenantLastName: row.tenantLastName,
          propertyStreet: row.propertyStreet,
          propertyCity: row.propertyCity,
          rentalUnitName: row.rentalUnitName,
          tasks: [],
        };
        groups.set(key, entry);
      }
      entry.tasks.push(row);
    }

    const result = Array.from(groups.values());
    // Sort: assigned first (alpha by last name), unassigned last
    result.sort((a, b) => {
      if (a.tenantId === null && b.tenantId !== null) return 1;
      if (b.tenantId === null && a.tenantId !== null) return -1;
      const aName = `${a.tenantLastName ?? ""} ${a.tenantFirstName ?? ""}`;
      const bName = `${b.tenantLastName ?? ""} ${b.tenantFirstName ?? ""}`;
      return aName.localeCompare(bName);
    });

    return result;
  }),

  getById: protectedProcedure
    .input(taskIdInput)
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select(taskRowSelect)
        .from(tasks)
        .leftJoin(tenants, eq(tenants.id, tasks.tenantId))
        .leftJoin(properties, eq(properties.id, tasks.propertyId))
        .leftJoin(rentalUnits, eq(rentalUnits.id, tasks.rentalUnitId))
        .leftJoin(emails, eq(emails.id, tasks.sourceEmailId))
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)))
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      return row;
    }),

  create: protectedProcedure
    .input(createTaskInput)
    .mutation(async ({ ctx, input }) => {
      let propertyId = input.propertyId ?? null;
      let rentalUnitId = input.rentalUnitId ?? null;

      // Auto-derive property/unit from tenant when omitted
      if (input.tenantId && (!propertyId || !rentalUnitId)) {
        const ctxData = await resolveTenantContext(input.tenantId, ctx.user.id);
        if (!propertyId) propertyId = ctxData.propertyId;
        if (!rentalUnitId) rentalUnitId = ctxData.rentalUnitId;
      }

      const [created] = await db
        .insert(tasks)
        .values({
          userId: ctx.user.id,
          assigneeUserId: input.assigneeUserId ?? ctx.user.id,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? TASK_STATUSES.new,
          priority: input.priority ?? "medium",
          category: input.category ?? "other",
          dueDate: input.dueDate ?? null,
          tenantId: input.tenantId ?? null,
          propertyId,
          rentalUnitId,
          sourceEmailId: input.sourceEmailId ?? null,
        })
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.task,
        entityId: created.id,
        action: AUDIT_ACTIONS.create,
      });

      await publishEvent(REDIS_CHANNELS.TASK_UPDATED, {
        taskId: created.id,
        userId: ctx.user.id,
        action: "create",
      });

      return created;
    }),

  update: protectedProcedure
    .input(updateTaskInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await verifyTaskOwnership(input.id, ctx.user.id);

      const updates: Partial<typeof tasks.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined)
        updates.description = input.description;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.category !== undefined) updates.category = input.category;
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
      if (input.assigneeUserId !== undefined)
        updates.assigneeUserId = input.assigneeUserId;

      // Tenant change: re-derive property/unit if not explicitly provided
      if (input.tenantId !== undefined) {
        updates.tenantId = input.tenantId;
        if (input.tenantId === null) {
          if (input.propertyId === undefined) updates.propertyId = null;
          if (input.rentalUnitId === undefined) updates.rentalUnitId = null;
        } else if (
          input.propertyId === undefined ||
          input.rentalUnitId === undefined
        ) {
          const ctxData = await resolveTenantContext(
            input.tenantId,
            ctx.user.id,
          );
          if (input.propertyId === undefined)
            updates.propertyId = ctxData.propertyId;
          if (input.rentalUnitId === undefined)
            updates.rentalUnitId = ctxData.rentalUnitId;
        }
      }

      if (input.propertyId !== undefined) updates.propertyId = input.propertyId;
      if (input.rentalUnitId !== undefined)
        updates.rentalUnitId = input.rentalUnitId;

      if (input.status !== undefined) {
        updates.status = input.status;
        updates.completedAt =
          input.status === TASK_STATUSES.done ? new Date() : null;
      }

      const [updated] = await db
        .update(tasks)
        .set(updates)
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)))
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.task,
        entityId: existing.id,
        action: AUDIT_ACTIONS.update,
      });

      await publishEvent(REDIS_CHANNELS.TASK_UPDATED, {
        taskId: existing.id,
        userId: ctx.user.id,
        action: "update",
      });

      return updated;
    }),

  updateStatus: protectedProcedure
    .input(updateTaskStatusInput)
    .mutation(async ({ ctx, input }) => {
      await verifyTaskOwnership(input.id, ctx.user.id);

      const status = input.status as TaskStatus;
      const [updated] = await db
        .update(tasks)
        .set({
          status,
          completedAt: status === TASK_STATUSES.done ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)))
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.task,
        entityId: input.id,
        action: AUDIT_ACTIONS.update,
      });

      await publishEvent(REDIS_CHANNELS.TASK_UPDATED, {
        taskId: input.id,
        userId: ctx.user.id,
        action: "update",
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(taskIdInput)
    .mutation(async ({ ctx, input }) => {
      await verifyTaskOwnership(input.id, ctx.user.id);

      await db
        .delete(tasks)
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)));

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.task,
        entityId: input.id,
        action: AUDIT_ACTIONS.delete,
      });

      await publishEvent(REDIS_CHANNELS.TASK_UPDATED, {
        taskId: input.id,
        userId: ctx.user.id,
        action: "delete",
      });

      return { success: true };
    }),

  countsByEmailIds: protectedProcedure
    .input(taskCountsByEmailIdsInput)
    .query(async ({ ctx, input }) => {
      if (input.emailIds.length === 0) {
        return {} as Record<string, number>;
      }

      const rows = await db
        .select({
          sourceEmailId: tasks.sourceEmailId,
          total: count(),
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, ctx.user.id),
            inArray(tasks.sourceEmailId, input.emailIds),
            inArray(tasks.status, OPEN_TASK_STATUSES as unknown as string[]),
          ),
        )
        .groupBy(tasks.sourceEmailId);

      const map: Record<string, number> = {};
      for (const row of rows) {
        if (row.sourceEmailId) {
          map[row.sourceEmailId] = Number(row.total);
        }
      }
      return map;
    }),

  openCount: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select({ total: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, ctx.user.id),
          inArray(tasks.status, OPEN_TASK_STATUSES as unknown as string[]),
        ),
      );
    return { count: Number(row.total) };
  }),
});
