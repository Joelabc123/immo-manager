import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { properties } from "./properties";
import { rentalUnits } from "./rental-units";

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    rentalUnitId: uuid("rental_unit_id").references(() => rentalUnits.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    remainingAmount: integer("remaining_amount").notNull(),
    dueDate: date("due_date").notNull(),
    status: text("status").notNull().default("open"),
    source: text("source").notNull().default("manual"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("claims_tenant_id_idx").on(table.tenantId),
    index("claims_property_id_idx").on(table.propertyId),
    index("claims_rental_unit_id_idx").on(table.rentalUnitId),
    index("claims_status_idx").on(table.status),
  ],
);
