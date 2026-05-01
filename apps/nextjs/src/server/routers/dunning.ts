import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@repo/shared/db";
import {
  claims,
  documents,
  dunningAlerts,
  dunningLevelConfigs,
  dunningRecordClaims,
  dunningRecords,
  dunningSettings,
  dunningTemplates,
  properties,
  rentalUnits,
  rentPayments,
  tenants,
} from "@repo/shared/db/schema";
import {
  archiveDunningPdfInput,
  createClaimInput,
  createDunningDraftInput,
  createDunningInput,
  dunningIdInput,
  listClaimsInput,
  listDunningInput,
  updateClaimInput,
  updateDunningDraftInput,
  updateDunningSettingsInput,
  upsertDunningLevelConfigInput,
  upsertDunningTemplateInput,
} from "@repo/shared/validation";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  CLAIM_SOURCES,
  CLAIM_STATUSES,
  CLAIM_TYPES,
  DUNNING_DOCUMENT_TYPES,
  DUNNING_LEVELS,
  DUNNING_STATUSES,
  PAYMENT_STATUS,
  type DunningDocumentType,
  type DunningLevel,
} from "@repo/shared/types";
import { evaluateTerminationWarning } from "@repo/shared/calculations";

import { router, protectedProcedure } from "../trpc";
import { logAudit, diffChanges } from "../services/audit";
import { buildDunningSnapshot } from "../services/dunning";

interface TenantContext {
  tenantId: string;
  firstName: string;
  lastName: string;
  coldRent: number;
  warmRent: number;
  rentalUnitId: string | null;
  rentalUnitName: string | null;
  propertyId: string | null;
  propertyStreet: string | null;
  propertyZipCode: string | null;
  propertyCity: string | null;
}

interface TemplateRow {
  subjectTemplate: string;
  bodyTemplate: string;
}

function datePlusDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().split("T")[0];
}

function getDefaultDeadlineDays(level: string | null | undefined): number {
  if (level === DUNNING_LEVELS.first) return 10;
  if (level === DUNNING_LEVELS.second) return 7;
  return 14;
}

function getTenantName(context: TenantContext): string {
  return `${context.firstName} ${context.lastName}`.trim();
}

function getPropertyAddress(context: TenantContext): string {
  return [
    context.propertyStreet,
    [context.propertyZipCode, context.propertyCity].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

async function loadTenantContext(
  tenantId: string,
  userId: string,
): Promise<TenantContext> {
  const [tenant] = await db
    .select({
      tenantId: tenants.id,
      firstName: tenants.firstName,
      lastName: tenants.lastName,
      coldRent: tenants.coldRent,
      warmRent: tenants.warmRent,
      rentalUnitId: tenants.rentalUnitId,
      rentalUnitName: rentalUnits.name,
      propertyId: properties.id,
      propertyStreet: properties.street,
      propertyZipCode: properties.zipCode,
      propertyCity: properties.city,
    })
    .from(tenants)
    .leftJoin(rentalUnits, eq(rentalUnits.id, tenants.rentalUnitId))
    .leftJoin(properties, eq(properties.id, rentalUnits.propertyId))
    .where(and(eq(tenants.id, tenantId), eq(tenants.userId, userId)))
    .limit(1);

  if (!tenant) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Tenant not found",
    });
  }

  return tenant;
}

async function loadRecordForUser(id: string, userId: string) {
  const [record] = await db
    .select({ record: dunningRecords, tenant: tenants })
    .from(dunningRecords)
    .innerJoin(tenants, eq(tenants.id, dunningRecords.tenantId))
    .where(and(eq(dunningRecords.id, id), eq(tenants.userId, userId)))
    .limit(1);

  if (!record) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Dunning record not found",
    });
  }

  return record;
}

async function loadClaimForUser(id: string, userId: string) {
  const [claim] = await db
    .select({ claim: claims })
    .from(claims)
    .innerJoin(tenants, eq(tenants.id, claims.tenantId))
    .where(and(eq(claims.id, id), eq(tenants.userId, userId)))
    .limit(1);

  if (!claim) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });
  }

  return claim.claim;
}

async function loadTemplate(
  userId: string,
  documentType: string,
  level: string | null,
): Promise<TemplateRow | null> {
  const [template] = await db
    .select({
      subjectTemplate: dunningTemplates.subjectTemplate,
      bodyTemplate: dunningTemplates.bodyTemplate,
    })
    .from(dunningTemplates)
    .where(
      and(
        eq(dunningTemplates.userId, userId),
        eq(dunningTemplates.documentType, documentType),
        level === null
          ? sql`${dunningTemplates.level} IS NULL`
          : eq(dunningTemplates.level, level),
        eq(dunningTemplates.locale, "de"),
      ),
    )
    .limit(1);

  return template ?? null;
}

async function createRecord(input: {
  userId: string;
  tenantId: string;
  documentType: DunningDocumentType;
  level: DunningLevel;
  amount: number;
  feeAmount: number;
  dunningDate: string;
  paymentDeadline?: string | null;
  subject?: string;
  body?: string;
  claimIds: string[];
}) {
  const tenantContext = await loadTenantContext(input.tenantId, input.userId);
  const paymentDeadline =
    input.paymentDeadline ??
    datePlusDays(input.dunningDate, getDefaultDeadlineDays(input.level));
  const totalAmount = input.amount + input.feeAmount;

  const linkedClaims = input.claimIds.length
    ? await db
        .select({ claim: claims })
        .from(claims)
        .innerJoin(tenants, eq(tenants.id, claims.tenantId))
        .where(
          and(
            inArray(claims.id, input.claimIds),
            eq(claims.tenantId, input.tenantId),
            eq(tenants.userId, input.userId),
          ),
        )
    : [];

  if (linkedClaims.length !== input.claimIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more claims are invalid",
    });
  }

  const template = await loadTemplate(
    input.userId,
    input.documentType,
    input.level,
  );
  const rendered = buildDunningSnapshot(
    {
      tenantName: getTenantName(tenantContext),
      propertyAddress: getPropertyAddress(tenantContext),
      rentalUnitName: tenantContext.rentalUnitName,
      amount: input.amount,
      feeAmount: input.feeAmount,
      totalAmount,
      dunningDate: input.dunningDate,
      paymentDeadline,
      level: input.level,
      documentType: input.documentType,
    },
    template,
  );
  const subject = input.subject ?? rendered.subject;
  const body = input.body ?? rendered.body;

  const [record] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(dunningRecords)
      .values({
        tenantId: input.tenantId,
        documentType: input.documentType,
        level: input.level,
        amount: input.amount,
        feeAmount: input.feeAmount,
        totalAmount,
        dunningDate: input.dunningDate,
        paymentDeadline,
        subjectSnapshot: subject,
        bodySnapshot: body,
        status: DUNNING_STATUSES.created,
      })
      .returning();

    if (linkedClaims.length > 0) {
      await tx.insert(dunningRecordClaims).values(
        linkedClaims.map(({ claim }) => ({
          dunningRecordId: created.id,
          claimId: claim.id,
          amountIncluded: Math.min(claim.remainingAmount, totalAmount),
        })),
      );
    }

    return [created];
  });

  logAudit({
    userId: input.userId,
    entityType: AUDIT_ENTITY_TYPES.dunning_record,
    entityId: record.id,
    action: AUDIT_ACTIONS.create_dunning,
    changes: [
      { field: "documentType", oldValue: null, newValue: input.documentType },
      { field: "level", oldValue: null, newValue: input.level },
      { field: "amount", oldValue: null, newValue: String(input.amount) },
    ],
  });

  return record;
}

async function ensureSettings(userId: string) {
  const [settings] = await db
    .insert(dunningSettings)
    .values({ userId })
    .onConflictDoUpdate({
      target: dunningSettings.userId,
      set: { updatedAt: new Date() },
    })
    .returning();

  return settings;
}

export const dunningRouter = router({
  create: protectedProcedure
    .input(createDunningInput)
    .mutation(async ({ ctx, input }) => {
      return createRecord({
        userId: ctx.user.id,
        tenantId: input.tenantId,
        documentType: DUNNING_DOCUMENT_TYPES.rent,
        level: input.level,
        amount: input.amount,
        feeAmount: 0,
        dunningDate: input.dunningDate,
        claimIds: [],
      });
    }),

  createDraft: protectedProcedure
    .input(createDunningDraftInput)
    .mutation(async ({ ctx, input }) => {
      return createRecord({
        userId: ctx.user.id,
        tenantId: input.tenantId,
        documentType: input.documentType,
        level: input.level ?? DUNNING_LEVELS.reminder,
        amount: input.amount,
        feeAmount: input.feeAmount,
        dunningDate: input.dunningDate,
        paymentDeadline: input.paymentDeadline,
        subject: input.subject,
        body: input.body,
        claimIds: input.claimIds,
      });
    }),

  list: protectedProcedure
    .input(listDunningInput)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tenants.userId, ctx.user.id)];

      if (input.tenantId) {
        conditions.push(eq(dunningRecords.tenantId, input.tenantId));
      }
      if (input.documentType) {
        conditions.push(eq(dunningRecords.documentType, input.documentType));
      }
      if (input.status) {
        conditions.push(eq(dunningRecords.status, input.status));
      }

      return db
        .select({
          id: dunningRecords.id,
          tenantId: dunningRecords.tenantId,
          level: dunningRecords.level,
          amount: dunningRecords.amount,
          feeAmount: dunningRecords.feeAmount,
          totalAmount: dunningRecords.totalAmount,
          documentType: dunningRecords.documentType,
          status: dunningRecords.status,
          dunningDate: dunningRecords.dunningDate,
          paymentDeadline: dunningRecords.paymentDeadline,
          documentId: dunningRecords.documentId,
          createdAt: dunningRecords.createdAt,
          tenantFirstName: tenants.firstName,
          tenantLastName: tenants.lastName,
        })
        .from(dunningRecords)
        .innerJoin(tenants, eq(tenants.id, dunningRecords.tenantId))
        .where(and(...conditions))
        .orderBy(desc(dunningRecords.dunningDate));
    }),

  getById: protectedProcedure
    .input(dunningIdInput)
    .query(async ({ ctx, input }) => {
      const { record } = await loadRecordForUser(input.id, ctx.user.id);
      const tenantContext = await loadTenantContext(
        record.tenantId,
        ctx.user.id,
      );

      const linkedClaims = await db
        .select({
          claim: claims,
          amountIncluded: dunningRecordClaims.amountIncluded,
        })
        .from(dunningRecordClaims)
        .innerJoin(claims, eq(claims.id, dunningRecordClaims.claimId))
        .where(eq(dunningRecordClaims.dunningRecordId, input.id));

      const [document] = record.documentId
        ? await db
            .select()
            .from(documents)
            .where(eq(documents.id, record.documentId))
            .limit(1)
        : [null];

      return {
        record,
        tenant: tenantContext,
        claims: linkedClaims,
        document,
      };
    }),

  updateDraft: protectedProcedure
    .input(updateDunningDraftInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const { record } = await loadRecordForUser(id, ctx.user.id);

      if (record.status === DUNNING_STATUSES.archived) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Archived dunning records cannot be edited",
        });
      }

      const updateData = {
        ...(data.documentType !== undefined && {
          documentType: data.documentType,
        }),
        ...(data.level !== undefined && {
          level: data.level ?? DUNNING_LEVELS.reminder,
        }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.feeAmount !== undefined && { feeAmount: data.feeAmount }),
        ...(data.dunningDate !== undefined && {
          dunningDate: data.dunningDate,
        }),
        ...(data.paymentDeadline !== undefined && {
          paymentDeadline: data.paymentDeadline,
        }),
        ...(data.subject !== undefined && { subjectSnapshot: data.subject }),
        ...(data.body !== undefined && { bodySnapshot: data.body }),
        updatedAt: new Date(),
      };

      const nextAmount = data.amount ?? record.amount;
      const nextFee = data.feeAmount ?? record.feeAmount;

      const [updated] = await db
        .update(dunningRecords)
        .set({ ...updateData, totalAmount: nextAmount + nextFee })
        .where(eq(dunningRecords.id, id))
        .returning();

      const changes = diffChanges(record, updateData, [
        "documentType",
        "level",
        "amount",
        "feeAmount",
        "dunningDate",
        "paymentDeadline",
        "subjectSnapshot",
        "bodySnapshot",
      ]);

      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.dunning_record,
          entityId: id,
          action: AUDIT_ACTIONS.update_dunning,
          changes,
        });
      }

      return updated;
    }),

  cancel: protectedProcedure
    .input(dunningIdInput)
    .mutation(async ({ ctx, input }) => {
      await loadRecordForUser(input.id, ctx.user.id);

      const [updated] = await db
        .update(dunningRecords)
        .set({
          status: DUNNING_STATUSES.cancelled,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dunningRecords.id, input.id))
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.dunning_record,
        entityId: input.id,
        action: AUDIT_ACTIONS.cancel_dunning,
      });

      return updated;
    }),

  markResolved: protectedProcedure
    .input(dunningIdInput)
    .mutation(async ({ ctx, input }) => {
      await loadRecordForUser(input.id, ctx.user.id);

      const [updated] = await db
        .update(dunningRecords)
        .set({
          status: DUNNING_STATUSES.resolved,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dunningRecords.id, input.id))
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.dunning_record,
        entityId: input.id,
        action: AUDIT_ACTIONS.resolve_dunning,
      });

      return updated;
    }),

  archiveGeneratedPdf: protectedProcedure
    .input(archiveDunningPdfInput)
    .mutation(async ({ ctx, input }) => {
      const { record } = await loadRecordForUser(input.id, ctx.user.id);
      const [document] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.id, input.documentId),
            eq(documents.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const [updated] = await db
        .update(dunningRecords)
        .set({
          documentId: input.documentId,
          status: DUNNING_STATUSES.archived,
          updatedAt: new Date(),
        })
        .where(eq(dunningRecords.id, record.id))
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.dunning_record,
        entityId: input.id,
        action: AUDIT_ACTIONS.archive_dunning_pdf,
        changes: [
          { field: "documentId", oldValue: null, newValue: input.documentId },
        ],
      });

      return updated;
    }),

  logDownload: protectedProcedure
    .input(dunningIdInput)
    .mutation(async ({ ctx, input }) => {
      await loadRecordForUser(input.id, ctx.user.id);

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.dunning_record,
        entityId: input.id,
        action: AUDIT_ACTIONS.download_dunning_pdf,
      });

      return { success: true };
    }),

  listClaims: protectedProcedure
    .input(listClaimsInput)
    .query(async ({ ctx, input }) => {
      await loadTenantContext(input.tenantId, ctx.user.id);
      const conditions = [eq(claims.tenantId, input.tenantId)];

      if (input.status) {
        conditions.push(eq(claims.status, input.status));
      }

      return db
        .select()
        .from(claims)
        .where(and(...conditions))
        .orderBy(desc(claims.dueDate));
    }),

  listClaimSuggestions: protectedProcedure
    .input(createDunningInput.pick({ tenantId: true }))
    .query(async ({ ctx, input }) => {
      const tenantContext = await loadTenantContext(
        input.tenantId,
        ctx.user.id,
      );
      const today = new Date().toISOString().split("T")[0];

      const overduePayments = await db
        .select()
        .from(rentPayments)
        .where(
          and(
            eq(rentPayments.tenantId, input.tenantId),
            lt(rentPayments.dueDate, today),
            sql`${rentPayments.status} <> ${PAYMENT_STATUS.paid}`,
          ),
        )
        .orderBy(desc(rentPayments.dueDate));

      const suggestions = overduePayments
        .map((payment) => {
          const paidAmount = payment.paidAmount ?? 0;
          const remainingAmount = payment.expectedAmount - paidAmount;
          return {
            paymentId: payment.id,
            tenantId: input.tenantId,
            rentalUnitId: payment.rentalUnitId,
            propertyId: tenantContext.propertyId,
            type: CLAIM_TYPES.operating_cost_advance,
            description: `Offene Mietzahlung vom ${payment.dueDate}`,
            amount: remainingAmount,
            remainingAmount,
            dueDate: payment.dueDate,
            source: CLAIM_SOURCES.rent_payment,
          };
        })
        .filter((suggestion) => suggestion.remainingAmount > 0);

      const terminationWarning = evaluateTerminationWarning(
        overduePayments.map((payment) => ({
          dueDate: payment.dueDate,
          expectedAmount: payment.expectedAmount,
          paidAmount: payment.paidAmount ?? 0,
        })),
        tenantContext.coldRent,
      );

      if (terminationWarning.shouldWarn) {
        const [existingAlert] = await db
          .select({ id: dunningAlerts.id })
          .from(dunningAlerts)
          .where(
            and(
              eq(dunningAlerts.tenantId, input.tenantId),
              eq(dunningAlerts.type, "termination_warning"),
              eq(dunningAlerts.status, "open"),
            ),
          )
          .limit(1);

        if (!existingAlert) {
          await db.insert(dunningAlerts).values({
            tenantId: input.tenantId,
            type: "termination_warning",
            message:
              "Critical rent arrears threshold reached. Stop regular dunning and review with legal counsel before termination steps.",
          });
        }
      }

      return { suggestions, terminationWarning };
    }),

  createClaim: protectedProcedure
    .input(createClaimInput)
    .mutation(async ({ ctx, input }) => {
      const tenantContext = await loadTenantContext(
        input.tenantId,
        ctx.user.id,
      );
      if (input.propertyId && input.propertyId !== tenantContext.propertyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid property",
        });
      }
      if (
        input.rentalUnitId &&
        input.rentalUnitId !== tenantContext.rentalUnitId
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid rental unit",
        });
      }

      const [claim] = await db
        .insert(claims)
        .values({
          ...input,
          propertyId: input.propertyId ?? tenantContext.propertyId,
          rentalUnitId: input.rentalUnitId ?? tenantContext.rentalUnitId,
          remainingAmount: input.remainingAmount ?? input.amount,
        })
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.claim,
        entityId: claim.id,
        action: AUDIT_ACTIONS.create_claim,
      });

      return claim;
    }),

  updateClaim: protectedProcedure
    .input(updateClaimInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await loadClaimForUser(id, ctx.user.id);
      const updateData = { ...data, updatedAt: new Date() };

      const [updated] = await db
        .update(claims)
        .set(updateData)
        .where(eq(claims.id, id))
        .returning();

      const changes = diffChanges(existing, updateData, [
        "type",
        "description",
        "amount",
        "remainingAmount",
        "dueDate",
        "status",
        "metadata",
      ]);

      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.claim,
          entityId: id,
          action: AUDIT_ACTIONS.update_claim,
          changes,
        });
      }

      return updated;
    }),

  cancelClaim: protectedProcedure
    .input(dunningIdInput)
    .mutation(async ({ ctx, input }) => {
      await loadClaimForUser(input.id, ctx.user.id);

      const [updated] = await db
        .update(claims)
        .set({ status: CLAIM_STATUSES.cancelled, updatedAt: new Date() })
        .where(eq(claims.id, input.id))
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.claim,
        entityId: input.id,
        action: AUDIT_ACTIONS.cancel_claim,
      });

      return updated;
    }),

  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ensureSettings(ctx.user.id);
    const [levelConfigs, templates] = await Promise.all([
      db
        .select()
        .from(dunningLevelConfigs)
        .where(eq(dunningLevelConfigs.userId, ctx.user.id)),
      db
        .select()
        .from(dunningTemplates)
        .where(eq(dunningTemplates.userId, ctx.user.id)),
    ]);

    return { settings, levelConfigs, templates };
  }),

  updateSettings: protectedProcedure
    .input(updateDunningSettingsInput)
    .mutation(async ({ ctx, input }) => {
      const settings = await ensureSettings(ctx.user.id);
      const [updated] = await db
        .update(dunningSettings)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(dunningSettings.userId, ctx.user.id))
        .returning();

      const changes = diffChanges(settings, input, [
        "defaultFederalState",
        "latePaymentThresholdCount",
        "latePaymentWindowMonths",
        "automationEnabled",
      ]);

      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.dunning_config,
          entityId: settings.id,
          action: AUDIT_ACTIONS.update_dunning_config,
          changes,
        });
      }

      return updated;
    }),

  upsertLevelConfig: protectedProcedure
    .input(upsertDunningLevelConfigInput)
    .mutation(async ({ ctx, input }) => {
      const [config] = await db
        .insert(dunningLevelConfigs)
        .values({ ...input, userId: ctx.user.id })
        .onConflictDoUpdate({
          target: [
            dunningLevelConfigs.userId,
            dunningLevelConfigs.documentType,
            dunningLevelConfigs.level,
          ],
          set: { ...input, updatedAt: new Date() },
        })
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.dunning_config,
        entityId: config.id,
        action: AUDIT_ACTIONS.update_dunning_config,
      });

      return config;
    }),

  upsertTemplate: protectedProcedure
    .input(upsertDunningTemplateInput)
    .mutation(async ({ ctx, input }) => {
      const [template] = await db
        .insert(dunningTemplates)
        .values({ ...input, userId: ctx.user.id, level: input.level ?? null })
        .onConflictDoUpdate({
          target: [
            dunningTemplates.userId,
            dunningTemplates.documentType,
            dunningTemplates.level,
            dunningTemplates.locale,
          ],
          set: {
            subjectTemplate: input.subjectTemplate,
            bodyTemplate: input.bodyTemplate,
            tone: input.tone,
            updatedAt: new Date(),
          },
        })
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.dunning_config,
        entityId: template.id,
        action: AUDIT_ACTIONS.update_dunning_config,
      });

      return template;
    }),
});
