import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { rentalUnits } from "./rental-units";

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rentalUnitId: uuid("rental_unit_id").references(() => rentalUnits.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone"),
    gender: text("gender"),
    iban: text("iban"),
    previousAddress: text("previous_address"),
    depositPaid: boolean("deposit_paid").notNull().default(false),
    rentStart: date("rent_start").notNull(),
    rentEnd: date("rent_end"),
    terminationStatus: text("termination_status"),
    coldRent: integer("cold_rent").notNull(),
    warmRent: integer("warm_rent").notNull(),
    noticePeriodMonths: integer("notice_period_months"),
    rentType: text("rent_type"),
    graduatedRentData: jsonb("graduated_rent_data"),
    indexedRentData: jsonb("indexed_rent_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tenants_user_id_idx").on(table.userId),
    index("tenants_rental_unit_id_idx").on(table.rentalUnitId),
  ],
);

export const tenantEmails = pgTable(
  "tenant_emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    index("tenant_emails_tenant_id_idx").on(table.tenantId),
    index("tenant_emails_email_idx").on(table.email),
  ],
);
