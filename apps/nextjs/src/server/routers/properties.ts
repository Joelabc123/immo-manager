import { TRPCError } from "@trpc/server";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
  asc,
  inArray,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import {
  properties,
  rentalUnits,
  tags,
  propertyTags,
} from "@repo/shared/db/schema";
import {
  createPropertyInput,
  updatePropertyInput,
} from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";
import { logAudit, diffChanges } from "../services/audit";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";
import { geocodeAddressClient } from "@/lib/geocoding";

const PROPERTY_TRACKED_FIELDS = [
  "street",
  "city",
  "zipCode",
  "country",
  "type",
  "status",
  "purchasePrice",
  "purchaseDate",
  "marketValue",
  "livingAreaSqm",
  "landAreaSqm",
  "constructionYear",
  "roomCount",
  "unitCount",
  "notes",
  "latitude",
  "longitude",
  "microLocationScore",
] as const;

export const propertiesRouter = router({
  create: protectedProcedure
    .input(createPropertyInput)
    .mutation(async ({ ctx, input }) => {
      // Geocode address if street and city are provided
      let latitude: string | undefined;
      let longitude: string | undefined;
      if (input.street && input.city) {
        const query = [input.street, input.zipCode, input.city, input.country]
          .filter(Boolean)
          .join(", ");
        const result = await geocodeAddressClient(query);
        if (result) {
          latitude = String(result.latitude);
          longitude = String(result.longitude);
        }
      }

      const [property] = await db
        .insert(properties)
        .values({
          userId: ctx.user.id,
          ...input,
          latitude,
          longitude,
        })
        .returning();

      // Auto-create rental units based on type and unit count
      const unitCount = input.unitCount ?? 1;
      if (unitCount > 0) {
        const unitValues = Array.from({ length: unitCount }, (_, i) => ({
          propertyId: property.id,
          name: unitCount === 1 ? "Main Unit" : `Unit ${i + 1}`,
        }));
        await db.insert(rentalUnits).values(unitValues);
      }

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.property,
        entityId: property.id,
        action: "create",
      });

      return property;
    }),

  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        type: z.string().optional(),
        tagIds: z.array(z.string().uuid()).optional(),
        sortBy: z
          .enum([
            "createdAt",
            "purchasePrice",
            "marketValue",
            "city",
            "livingAreaSqm",
          ])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        search,
        status,
        type,
        tagIds,
        sortBy,
        sortOrder,
        page,
        pageSize,
      } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [eq(properties.userId, ctx.user.id)];

      if (status) {
        conditions.push(eq(properties.status, status));
      }
      if (type) {
        conditions.push(eq(properties.type, type));
      }
      if (search) {
        conditions.push(
          or(
            ilike(properties.street, `%${search}%`),
            ilike(properties.city, `%${search}%`),
            ilike(properties.zipCode, `%${search}%`),
          )!,
        );
      }
      if (tagIds && tagIds.length > 0) {
        const propertyIdsWithTags = db
          .select({ propertyId: propertyTags.propertyId })
          .from(propertyTags)
          .where(inArray(propertyTags.tagId, tagIds));
        conditions.push(inArray(properties.id, propertyIdsWithTags));
      }

      const whereClause = and(...conditions);

      const sortColumn = {
        createdAt: properties.createdAt,
        purchasePrice: properties.purchasePrice,
        marketValue: properties.marketValue,
        city: properties.city,
        livingAreaSqm: properties.livingAreaSqm,
      }[sortBy];

      const orderFn = sortOrder === "asc" ? asc : desc;

      const [items, [totalResult]] = await Promise.all([
        db
          .select()
          .from(properties)
          .where(whereClause)
          .orderBy(orderFn(sortColumn))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(properties).where(whereClause),
      ]);

      // Fetch tags for all returned properties
      const propertyIds = items.map((p) => p.id);
      const propertyTagRows =
        propertyIds.length > 0
          ? await db
              .select({
                propertyId: propertyTags.propertyId,
                tagId: tags.id,
                tagName: tags.name,
                tagColor: tags.color,
              })
              .from(propertyTags)
              .innerJoin(tags, eq(propertyTags.tagId, tags.id))
              .where(inArray(propertyTags.propertyId, propertyIds))
          : [];

      const tagsByProperty = new Map<
        string,
        Array<{ id: string; name: string; color: string | null }>
      >();
      for (const row of propertyTagRows) {
        const existing = tagsByProperty.get(row.propertyId) ?? [];
        existing.push({
          id: row.tagId,
          name: row.tagName,
          color: row.tagColor,
        });
        tagsByProperty.set(row.propertyId, existing);
      }

      return {
        items: items.map((item) => ({
          ...item,
          tags: tagsByProperty.get(item.id) ?? [],
        })),
        total: totalResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(totalResult.count / pageSize),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [property] = await db
        .select()
        .from(properties)
        .where(
          and(eq(properties.id, input.id), eq(properties.userId, ctx.user.id)),
        )
        .limit(1);

      if (!property) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property not found",
        });
      }

      // Fetch related data
      const [units, propertyTagRows] = await Promise.all([
        db
          .select()
          .from(rentalUnits)
          .where(eq(rentalUnits.propertyId, property.id)),
        db
          .select({
            tagId: tags.id,
            tagName: tags.name,
            tagColor: tags.color,
          })
          .from(propertyTags)
          .innerJoin(tags, eq(propertyTags.tagId, tags.id))
          .where(eq(propertyTags.propertyId, property.id)),
      ]);

      return {
        ...property,
        rentalUnits: units,
        tags: propertyTagRows.map((t) => ({
          id: t.tagId,
          name: t.tagName,
          color: t.tagColor,
        })),
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updatePropertyInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(properties)
        .where(
          and(eq(properties.id, input.id), eq(properties.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property not found",
        });
      }

      // Re-geocode if address fields changed
      const updateData: Record<string, unknown> = { ...input.data };
      const addressChanged =
        (input.data.street !== undefined &&
          input.data.street !== existing.street) ||
        (input.data.city !== undefined && input.data.city !== existing.city) ||
        (input.data.zipCode !== undefined &&
          input.data.zipCode !== existing.zipCode) ||
        (input.data.country !== undefined &&
          input.data.country !== existing.country);

      if (addressChanged) {
        const street = input.data.street ?? existing.street;
        const city = input.data.city ?? existing.city;
        if (street && city) {
          const zipCode = input.data.zipCode ?? existing.zipCode;
          const country = input.data.country ?? existing.country;
          const query = [street, zipCode, city, country]
            .filter(Boolean)
            .join(", ");
          const result = await geocodeAddressClient(query);
          if (result) {
            updateData.latitude = String(result.latitude);
            updateData.longitude = String(result.longitude);
          }
        }
      }

      const [updated] = await db
        .update(properties)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, input.id))
        .returning();

      const changes = diffChanges(existing, input.data, [
        ...PROPERTY_TRACKED_FIELDS,
      ]);
      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.property,
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
        .select({ id: properties.id })
        .from(properties)
        .where(
          and(eq(properties.id, input.id), eq(properties.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property not found",
        });
      }

      // Cascading delete is handled by FK constraints
      await db.delete(properties).where(eq(properties.id, input.id));

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.property,
        entityId: input.id,
        action: "delete",
      });

      return { success: true };
    }),

  getDependencies: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [property] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(
          and(eq(properties.id, input.id), eq(properties.userId, ctx.user.id)),
        )
        .limit(1);

      if (!property) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property not found",
        });
      }

      const [unitCount] = await db
        .select({ count: count() })
        .from(rentalUnits)
        .where(eq(rentalUnits.propertyId, input.id));

      const [tagCount] = await db
        .select({ count: count() })
        .from(propertyTags)
        .where(eq(propertyTags.propertyId, input.id));

      return {
        rentalUnits: unitCount.count,
        tags: tagCount.count,
      };
    }),

  duplicate: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        includeUnits: z.boolean().default(true),
        includeTags: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [original] = await db
        .select()
        .from(properties)
        .where(
          and(eq(properties.id, input.id), eq(properties.userId, ctx.user.id)),
        )
        .limit(1);

      if (!original) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property not found",
        });
      }

      // Remove fields that should not be duplicated
      const {
        id: _id,
        createdAt: _ca,
        updatedAt: _ua,
        thumbnailPath: _tp,
        ...propertyData
      } = original;

      const [newProperty] = await db
        .insert(properties)
        .values(propertyData)
        .returning();

      if (input.includeUnits) {
        const units = await db
          .select()
          .from(rentalUnits)
          .where(eq(rentalUnits.propertyId, original.id));

        if (units.length > 0) {
          await db.insert(rentalUnits).values(
            units.map((unit) => ({
              propertyId: newProperty.id,
              name: unit.name,
              floor: unit.floor,
              areaSqm: unit.areaSqm,
            })),
          );
        }
      }

      if (input.includeTags) {
        const existingTags = await db
          .select()
          .from(propertyTags)
          .where(eq(propertyTags.propertyId, original.id));

        if (existingTags.length > 0) {
          await db.insert(propertyTags).values(
            existingTags.map((pt) => ({
              propertyId: newProperty.id,
              tagId: pt.tagId,
            })),
          );
        }
      }

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.property,
        entityId: newProperty.id,
        action: "create",
        changes: [
          { field: "duplicatedFrom", oldValue: null, newValue: original.id },
        ],
      });

      return newProperty;
    }),

  updateTags: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        tagIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const [property] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(
          and(
            eq(properties.id, input.propertyId),
            eq(properties.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!property) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property not found",
        });
      }

      // Replace all tags
      await db
        .delete(propertyTags)
        .where(eq(propertyTags.propertyId, input.propertyId));

      if (input.tagIds.length > 0) {
        await db.insert(propertyTags).values(
          input.tagIds.map((tagId) => ({
            propertyId: input.propertyId,
            tagId,
          })),
        );
      }

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.property,
        entityId: input.propertyId,
        action: "update",
        changes: [
          { field: "tags", oldValue: null, newValue: input.tagIds.join(", ") },
        ],
      });

      return { success: true };
    }),

  getAggregatedKpis: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .select({
        totalProperties: count(),
        totalUnits: sql<number>`COALESCE(SUM(${properties.unitCount}), 0)`,
        totalMarketValue: sql<number>`COALESCE(SUM(${properties.marketValue}), 0)`,
        totalPurchasePrice: sql<number>`COALESCE(SUM(${properties.purchasePrice}), 0)`,
      })
      .from(properties)
      .where(eq(properties.userId, ctx.user.id));

    return result[0];
  }),
});
