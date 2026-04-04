import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { tenants } from "./tenants";
import { properties } from "./properties";

export const emailAccounts = pgTable(
  "email_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    imapHost: text("imap_host").notNull(),
    imapPort: integer("imap_port").notNull(),
    smtpHost: text("smtp_host").notNull(),
    smtpPort: integer("smtp_port").notNull(),
    username: text("username").notNull(),
    encryptedPassword: text("encrypted_password").notNull(),
    encryptionIv: text("encryption_iv").notNull(),
    encryptionTag: text("encryption_tag").notNull(),
    fromAddress: text("from_address").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("email_accounts_user_id_idx").on(table.userId)],
);

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    emailAccountId: uuid("email_account_id")
      .notNull()
      .references(() => emailAccounts.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    messageId: text("message_id").notNull(),
    inReplyTo: text("in_reply_to"),
    threadId: text("thread_id"),
    fromAddress: text("from_address").notNull(),
    subject: text("subject").notNull(),
    receivedAt: timestamp("received_at").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    isInbound: boolean("is_inbound").notNull().default(true),
    trackingToken: text("tracking_token"),
    openedAt: timestamp("opened_at"),
    toAddresses: text("to_addresses"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("emails_email_account_id_idx").on(table.emailAccountId),
    index("emails_message_id_idx").on(table.messageId),
    index("emails_from_address_idx").on(table.fromAddress),
    index("emails_tenant_id_idx").on(table.tenantId),
    index("emails_thread_id_idx").on(table.threadId),
  ],
);
