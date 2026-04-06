import { z } from "zod";
import { AUDIT_ENTITY_TYPES } from "../types/audit";
import { AUDIT_ACTIONS } from "../types/common";

const entityTypeValues = Object.values(AUDIT_ENTITY_TYPES) as [
  string,
  ...string[],
];

const actionValues = Object.values(AUDIT_ACTIONS) as [string, ...string[]];

const auditSortColumns = ["createdAt", "action", "entityType", "fieldName"] as const;

export const listAuditLogsInput = z.object({
  entityType: z.enum(entityTypeValues).optional(),
  action: z.enum(actionValues).optional(),
  entityId: z.string().uuid().optional(),
  search: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(auditSortColumns).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type ListAuditLogsInput = z.infer<typeof listAuditLogsInput>;

export const getEntityAuditInput = z.object({
  entityType: z.enum(entityTypeValues),
  entityId: z.string().uuid(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export type GetEntityAuditInput = z.infer<typeof getEntityAuditInput>;
