import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { properties } from "./properties";

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    description: text("description"),
    amount: integer("amount").notNull(),
    date: date("date").notNull(),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurringInterval: text("recurring_interval"),
    isApportionable: boolean("is_apportionable").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("expenses_property_id_idx").on(table.propertyId)],
);
