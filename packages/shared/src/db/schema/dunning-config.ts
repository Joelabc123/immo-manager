import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { tenants } from "./tenants";

export const dunningSettings = pgTable(
  "dunning_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    defaultFederalState: text("default_federal_state").notNull().default("NW"),
    latePaymentThresholdCount: integer("late_payment_threshold_count")
      .notNull()
      .default(2),
    latePaymentWindowMonths: integer("late_payment_window_months")
      .notNull()
      .default(12),
    automationEnabled: boolean("automation_enabled").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("dunning_settings_user_id_idx").on(table.userId)],
);

export const dunningLevelConfigs = pgTable(
  "dunning_level_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(),
    level: text("level").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    daysAfterDue: integer("days_after_due").notNull().default(7),
    feeAmount: integer("fee_amount").notNull().default(0),
    tone: text("tone").notNull().default("formal"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("dunning_level_configs_user_type_level_idx").on(
      table.userId,
      table.documentType,
      table.level,
    ),
    index("dunning_level_configs_user_id_idx").on(table.userId),
  ],
);

export const dunningTemplates = pgTable(
  "dunning_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(),
    level: text("level"),
    locale: text("locale").notNull().default("de"),
    subjectTemplate: text("subject_template").notNull(),
    bodyTemplate: text("body_template").notNull(),
    tone: text("tone").notNull().default("formal"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("dunning_templates_user_type_level_locale_idx").on(
      table.userId,
      table.documentType,
      table.level,
      table.locale,
    ),
    index("dunning_templates_user_id_idx").on(table.userId),
  ],
);

export const dunningAlerts = pgTable(
  "dunning_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").notNull().default("open"),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [index("dunning_alerts_tenant_id_idx").on(table.tenantId)],
);
