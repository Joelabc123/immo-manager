import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const USER_ROLES = ["member", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("member").$type<UserRole>(),
  banned: boolean("banned").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  avatarUrl: text("avatar_url"),
  language: text("language").notNull().default("de"),
  currency: text("currency").notNull().default("EUR"),
  taxRate: integer("tax_rate"),
  retirementYear: integer("retirement_year"),
  healthScoreCashflowWeight: integer("health_score_cashflow_weight")
    .notNull()
    .default(34),
  healthScoreLtvWeight: integer("health_score_ltv_weight")
    .notNull()
    .default(33),
  healthScoreYieldWeight: integer("health_score_yield_weight")
    .notNull()
    .default(33),
  kpiPeriod: text("kpi_period").notNull().default("current_month"),
  dscrTarget: integer("dscr_target").notNull().default(120),
  donutThreshold: integer("donut_threshold").notNull().default(5),
  brokerFeeDefault: integer("broker_fee_default").notNull().default(357),
  emailSignature: text("email_signature"),
  shareLinkValidityDays: integer("share_link_validity_days")
    .notNull()
    .default(7),
  annualAppreciationDefault: integer("annual_appreciation_default")
    .notNull()
    .default(200),
  capitalGainsTax: integer("capital_gains_tax").notNull().default(2500),
  pushEnabled: boolean("push_enabled").notNull().default(false),
  notifyNewEmail: boolean("notify_new_email").notNull().default(true),
  notifyOverdueRent: boolean("notify_overdue_rent").notNull().default(true),
  notifyContractExpiry: boolean("notify_contract_expiry")
    .notNull()
    .default(true),
  trackingPixelEnabled: boolean("tracking_pixel_enabled")
    .notNull()
    .default(false),
  dashboardLayout: jsonb("dashboard_layout"),
  defaultEmailAccountId: uuid("default_email_account_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
