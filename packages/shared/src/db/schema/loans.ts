import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  index,
} from "drizzle-orm/pg-core";
import { properties } from "./properties";

export const loans = pgTable(
  "loans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    bankName: text("bank_name").notNull(),
    loanAmount: integer("loan_amount").notNull(),
    remainingBalance: integer("remaining_balance").notNull(),
    interestRate: integer("interest_rate").notNull(),
    repaymentRate: integer("repayment_rate").notNull(),
    monthlyPayment: integer("monthly_payment").notNull(),
    interestFixedUntil: date("interest_fixed_until"),
    loanStart: date("loan_start").notNull(),
    loanTermMonths: integer("loan_term_months"),
    annualSpecialRepaymentLimit: integer("annual_special_repayment_limit"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("loans_property_id_idx").on(table.propertyId)],
);
