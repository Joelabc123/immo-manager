import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { rentalUnits } from "./rental-units";

export const rentPayments = pgTable(
  "rent_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    rentalUnitId: uuid("rental_unit_id").references(() => rentalUnits.id, {
      onDelete: "set null",
    }),
    expectedAmount: integer("expected_amount").notNull(),
    paidAmount: integer("paid_amount"),
    dueDate: date("due_date").notNull(),
    paidDate: date("paid_date"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("rent_payments_tenant_id_idx").on(table.tenantId),
    index("rent_payments_rental_unit_id_idx").on(table.rentalUnitId),
  ],
);
