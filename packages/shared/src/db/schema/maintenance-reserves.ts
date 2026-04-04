import { pgTable, uuid, timestamp, integer, index } from "drizzle-orm/pg-core";
import { properties } from "./properties";

export const maintenanceReserves = pgTable(
  "maintenance_reserves",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    monthlyAmount: integer("monthly_amount").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("maintenance_reserves_property_id_idx").on(table.propertyId),
  ],
);
