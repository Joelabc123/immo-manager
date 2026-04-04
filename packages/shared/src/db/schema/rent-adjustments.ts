import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const rentAdjustments = pgTable("rent_adjustments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  oldColdRent: integer("old_cold_rent").notNull(),
  newColdRent: integer("new_cold_rent").notNull(),
  effectiveDate: date("effective_date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
