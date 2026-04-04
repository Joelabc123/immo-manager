import { db } from "@repo/shared/db";
import { auditLogs } from "@repo/shared/db/schema";
import type { AuditAction } from "@repo/shared/types";
import { logger } from "@/lib/logger";

interface AuditChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

interface LogAuditParams {
  userId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes?: AuditChange[];
}

/**
 * Log an audit entry. Fire-and-forget — does not block the caller.
 * For create/delete: logs a single row with no field diff.
 * For update: logs one row per changed field.
 */
export function logAudit(params: LogAuditParams): void {
  const { userId, entityType, entityId, action, changes } = params;

  const doInsert = async () => {
    if (changes && changes.length > 0) {
      const rows = changes.map((change) => ({
        userId,
        entityType,
        entityId,
        action,
        fieldName: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
      }));
      await db.insert(auditLogs).values(rows);
    } else {
      await db.insert(auditLogs).values({
        userId,
        entityType,
        entityId,
        action,
        fieldName: null,
        oldValue: null,
        newValue: null,
      });
    }
  };

  doInsert().catch((err) => {
    logger.error(
      { err, entityType, entityId, action },
      "Failed to write audit log",
    );
  });
}

/**
 * Compare two records and return an array of changes for fields that differ.
 * Values are stringified for storage.
 */
export function diffChanges<T extends Record<string, unknown>>(
  oldRecord: T,
  newRecord: Partial<T>,
  trackedFields: (keyof T & string)[],
): AuditChange[] {
  const changes: AuditChange[] = [];

  for (const field of trackedFields) {
    if (!(field in newRecord)) continue;

    const oldVal = oldRecord[field];
    const newVal = newRecord[field];

    if (oldVal === newVal) continue;
    if (oldVal == null && newVal == null) continue;

    changes.push({
      field,
      oldValue: oldVal != null ? String(oldVal) : null,
      newValue: newVal != null ? String(newVal) : null,
    });
  }

  return changes;
}
