import { and, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@repo/shared/db";
import { dashboardPresets } from "@repo/shared/db/schema";
import {
  createPresetInput,
  updatePresetInput,
  renamePresetInput,
  presetIdInput,
  duplicatePresetInput,
} from "@repo/shared/validation";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_PRESET_NAME,
  type DashboardLayout,
  type DashboardPreset,
} from "@repo/shared/types";

import { router, protectedProcedure } from "../trpc";

function serializePreset(row: {
  id: string;
  name: string;
  isDefault: boolean;
  layout: unknown;
  createdAt: Date;
  updatedAt: Date;
}): DashboardPreset {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.isDefault,
    layout: row.layout as DashboardLayout,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureDefaultPreset(userId: string): Promise<DashboardPreset> {
  // Use onConflictDoUpdate to handle race conditions where a preset with the
  // same (userId, name) already exists (e.g. concurrent requests, stale data).
  const [seeded] = await db
    .insert(dashboardPresets)
    .values({
      userId,
      name: DEFAULT_PRESET_NAME,
      isDefault: true,
      layout: DEFAULT_DASHBOARD_LAYOUT,
    })
    .onConflictDoUpdate({
      target: [dashboardPresets.userId, dashboardPresets.name],
      set: {
        isDefault: true,
        layout: DEFAULT_DASHBOARD_LAYOUT,
        updatedAt: new Date(),
      },
    })
    .returning();

  return serializePreset(seeded);
}

function isLayoutStale(raw: unknown): boolean {
  const layout = raw as Partial<DashboardLayout> | null | undefined;
  if (!layout || !Array.isArray(layout.widgets)) return true;
  if (layout.widgets.length === 0) return true;
  if (
    typeof layout.version !== "number" ||
    layout.version < DEFAULT_DASHBOARD_LAYOUT.version
  ) {
    return true;
  }
  return layout.widgets.some(
    (w) =>
      !w ||
      typeof w !== "object" ||
      !("variant" in w) ||
      typeof (w as { variant?: unknown }).variant !== "string",
  );
}

export const dashboardPresetsRouter = router({
  list: protectedProcedure.query(
    async ({ ctx }): Promise<DashboardPreset[]> => {
      const rows = await db
        .select()
        .from(dashboardPresets)
        .where(eq(dashboardPresets.userId, ctx.user.id))
        .orderBy(desc(dashboardPresets.isDefault), dashboardPresets.createdAt);

      if (rows.length === 0) {
        const seeded = await ensureDefaultPreset(ctx.user.id);
        return [seeded];
      }

      // Auto-repair: if the default preset carries an empty or legacy layout
      // (e.g. migrated from the pre-bento schema without a `variant` field),
      // reset it to the canonical default so the user sees a working dashboard.
      const defaultRow = rows.find((r) => r.isDefault) ?? rows[0];
      if (defaultRow && isLayoutStale(defaultRow.layout)) {
        const [repaired] = await db
          .update(dashboardPresets)
          .set({ layout: DEFAULT_DASHBOARD_LAYOUT, updatedAt: new Date() })
          .where(eq(dashboardPresets.id, defaultRow.id))
          .returning();
        if (repaired) {
          const idx = rows.findIndex((r) => r.id === defaultRow.id);
          if (idx >= 0) rows[idx] = repaired;
        }
      }

      return rows.map(serializePreset);
    },
  ),

  get: protectedProcedure
    .input(presetIdInput)
    .query(async ({ ctx, input }): Promise<DashboardPreset> => {
      const [row] = await db
        .select()
        .from(dashboardPresets)
        .where(
          and(
            eq(dashboardPresets.id, input.id),
            eq(dashboardPresets.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Preset not found" });
      }

      return serializePreset(row);
    }),

  create: protectedProcedure
    .input(createPresetInput)
    .mutation(async ({ ctx, input }): Promise<DashboardPreset> => {
      const existing = await db
        .select({ id: dashboardPresets.id })
        .from(dashboardPresets)
        .where(
          and(
            eq(dashboardPresets.userId, ctx.user.id),
            eq(dashboardPresets.name, input.name),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A preset with this name already exists",
        });
      }

      if (input.isDefault) {
        await db
          .update(dashboardPresets)
          .set({ isDefault: false })
          .where(eq(dashboardPresets.userId, ctx.user.id));
      }

      const [created] = await db
        .insert(dashboardPresets)
        .values({
          userId: ctx.user.id,
          name: input.name,
          isDefault: input.isDefault ?? false,
          layout: input.layout,
        })
        .returning();

      return serializePreset(created);
    }),

  update: protectedProcedure
    .input(updatePresetInput)
    .mutation(async ({ ctx, input }): Promise<DashboardPreset> => {
      const [updated] = await db
        .update(dashboardPresets)
        .set({ layout: input.layout, updatedAt: new Date() })
        .where(
          and(
            eq(dashboardPresets.id, input.id),
            eq(dashboardPresets.userId, ctx.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Preset not found" });
      }

      return serializePreset(updated);
    }),

  rename: protectedProcedure
    .input(renamePresetInput)
    .mutation(async ({ ctx, input }): Promise<DashboardPreset> => {
      const duplicate = await db
        .select({ id: dashboardPresets.id })
        .from(dashboardPresets)
        .where(
          and(
            eq(dashboardPresets.userId, ctx.user.id),
            eq(dashboardPresets.name, input.name),
          ),
        )
        .limit(1);

      if (duplicate.length > 0 && duplicate[0].id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A preset with this name already exists",
        });
      }

      const [renamed] = await db
        .update(dashboardPresets)
        .set({ name: input.name, updatedAt: new Date() })
        .where(
          and(
            eq(dashboardPresets.id, input.id),
            eq(dashboardPresets.userId, ctx.user.id),
          ),
        )
        .returning();

      if (!renamed) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Preset not found" });
      }

      return serializePreset(renamed);
    }),

  delete: protectedProcedure
    .input(presetIdInput)
    .mutation(async ({ ctx, input }): Promise<{ success: true }> => {
      const [target] = await db
        .select()
        .from(dashboardPresets)
        .where(
          and(
            eq(dashboardPresets.id, input.id),
            eq(dashboardPresets.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Preset not found" });
      }

      await db
        .delete(dashboardPresets)
        .where(eq(dashboardPresets.id, input.id));

      // If we just deleted the default, promote another preset (or recreate default).
      if (target.isDefault) {
        const [next] = await db
          .select()
          .from(dashboardPresets)
          .where(eq(dashboardPresets.userId, ctx.user.id))
          .orderBy(dashboardPresets.createdAt)
          .limit(1);

        if (next) {
          await db
            .update(dashboardPresets)
            .set({ isDefault: true })
            .where(eq(dashboardPresets.id, next.id));
        } else {
          await ensureDefaultPreset(ctx.user.id);
        }
      }

      return { success: true };
    }),

  setDefault: protectedProcedure
    .input(presetIdInput)
    .mutation(async ({ ctx, input }): Promise<{ success: true }> => {
      const [target] = await db
        .select({ id: dashboardPresets.id })
        .from(dashboardPresets)
        .where(
          and(
            eq(dashboardPresets.id, input.id),
            eq(dashboardPresets.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Preset not found" });
      }

      await db
        .update(dashboardPresets)
        .set({ isDefault: false })
        .where(eq(dashboardPresets.userId, ctx.user.id));

      await db
        .update(dashboardPresets)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(dashboardPresets.id, input.id));

      return { success: true };
    }),

  duplicate: protectedProcedure
    .input(duplicatePresetInput)
    .mutation(async ({ ctx, input }): Promise<DashboardPreset> => {
      const [source] = await db
        .select()
        .from(dashboardPresets)
        .where(
          and(
            eq(dashboardPresets.id, input.id),
            eq(dashboardPresets.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Preset not found" });
      }

      const duplicate = await db
        .select({ id: dashboardPresets.id })
        .from(dashboardPresets)
        .where(
          and(
            eq(dashboardPresets.userId, ctx.user.id),
            eq(dashboardPresets.name, input.name),
          ),
        )
        .limit(1);

      if (duplicate.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A preset with this name already exists",
        });
      }

      const [created] = await db
        .insert(dashboardPresets)
        .values({
          userId: ctx.user.id,
          name: input.name,
          isDefault: false,
          layout: source.layout as DashboardLayout,
        })
        .returning();

      return serializePreset(created);
    }),

  resetDefault: protectedProcedure.mutation(
    async ({ ctx }): Promise<DashboardPreset> => {
      // Wipe every preset belonging to the user and reseed a clean default.
      // Intended as an escape hatch when a stored layout becomes corrupt
      // (e.g. overlapping positions) and the user wants a fresh start.
      await db
        .delete(dashboardPresets)
        .where(eq(dashboardPresets.userId, ctx.user.id));
      return ensureDefaultPreset(ctx.user.id);
    },
  ),
});
