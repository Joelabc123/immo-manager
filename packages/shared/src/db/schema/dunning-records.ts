import {
  pgTable,
  primaryKey,
  uuid,
  text,
  timestamp,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { documents } from "./documents";
import { claims } from "./claims";

export const dunningRecords = pgTable("dunning_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  level: text("level").notNull(),
  amount: integer("amount").notNull(),
  documentType: text("document_type").notNull().default("rent"),
  status: text("status").notNull().default("created"),
  dunningDate: date("dunning_date").notNull(),
  paymentDeadline: date("payment_deadline"),
  subjectSnapshot: text("subject_snapshot"),
  bodySnapshot: text("body_snapshot"),
  feeAmount: integer("fee_amount").notNull().default(0),
  totalAmount: integer("total_amount"),
  documentId: uuid("document_id").references(() => documents.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  cancelledAt: timestamp("cancelled_at"),
  resolvedAt: timestamp("resolved_at"),
});

export const dunningRecordClaims = pgTable(
  "dunning_record_claims",
  {
    dunningRecordId: uuid("dunning_record_id")
      .notNull()
      .references(() => dunningRecords.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    amountIncluded: integer("amount_included").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.dunningRecordId, table.claimId] })],
);
