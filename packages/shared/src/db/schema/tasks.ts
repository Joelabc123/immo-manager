import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { tenants } from "./tenants";
import { properties } from "./properties";
import { rentalUnits } from "./rental-units";
import { emails } from "./email";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assigneeUserId: uuid("assignee_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("new"),
    priority: text("priority").notNull().default("medium"),
    category: text("category").notNull().default("other"),
    dueDate: date("due_date"),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    rentalUnitId: uuid("rental_unit_id").references(() => rentalUnits.id, {
      onDelete: "set null",
    }),
    sourceEmailId: uuid("source_email_id").references(() => emails.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tasks_user_id_status_idx").on(table.userId, table.status),
    index("tasks_tenant_id_idx").on(table.tenantId),
    index("tasks_source_email_id_idx").on(table.sourceEmailId),
    index("tasks_assignee_user_id_idx").on(table.assigneeUserId),
  ],
);
