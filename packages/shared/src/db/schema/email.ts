import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  unique,
  primaryKey,
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
    label: text("label").notNull().default(""),
    imapHost: text("imap_host").notNull(),
    imapPort: integer("imap_port").notNull(),
    smtpHost: text("smtp_host").notNull(),
    smtpPort: integer("smtp_port").notNull(),
    username: text("username").notNull(),
    encryptedPassword: text("encrypted_password").notNull(),
    encryptionIv: text("encryption_iv").notNull(),
    encryptionTag: text("encryption_tag").notNull(),
    fromAddress: text("from_address").notNull(),
    syncIntervalMinutes: integer("sync_interval_minutes").notNull().default(15),
    lastSyncAt: timestamp("last_sync_at"),
    syncStatus: text("sync_status").notNull().default("idle"),
    syncError: text("sync_error"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("email_accounts_user_id_idx").on(table.userId)],
);

export const emailFolders = pgTable(
  "email_folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    emailAccountId: uuid("email_account_id")
      .notNull()
      .references(() => emailAccounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    path: text("path").notNull(),
    type: text("type").notNull().default("custom"),
    totalMessages: integer("total_messages").notNull().default(0),
    unreadMessages: integer("unread_messages").notNull().default(0),
    uidValidity: integer("uid_validity"),
    lastSyncUid: integer("last_sync_uid"),
    lastSyncAt: timestamp("last_sync_at"),
  },
  (table) => [
    index("email_folders_account_id_idx").on(table.emailAccountId),
    unique("email_folders_account_path_unq").on(
      table.emailAccountId,
      table.path,
    ),
  ],
);

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    emailAccountId: uuid("email_account_id")
      .notNull()
      .references(() => emailAccounts.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => emailFolders.id, {
      onDelete: "cascade",
    }),
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
    toAddresses: text("to_addresses"),
    subject: text("subject").notNull(),
    htmlBody: text("html_body"),
    textBody: text("text_body"),
    snippet: text("snippet"),
    receivedAt: timestamp("received_at").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    isInbound: boolean("is_inbound").notNull().default(true),
    uid: integer("uid"),
    flags: text("flags"),
    size: integer("size"),
    hasAttachments: boolean("has_attachments").notNull().default(false),
    trackingToken: text("tracking_token"),
    openedAt: timestamp("opened_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("emails_email_account_id_idx").on(table.emailAccountId),
    index("emails_folder_id_idx").on(table.folderId),
    index("emails_message_id_idx").on(table.messageId),
    index("emails_from_address_idx").on(table.fromAddress),
    index("emails_tenant_id_idx").on(table.tenantId),
    index("emails_thread_id_idx").on(table.threadId),
    index("emails_uid_idx").on(table.folderId, table.uid),
  ],
);

export const emailLabels = pgTable(
  "email_labels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    isPredefined: boolean("is_predefined").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("email_labels_user_id_idx").on(table.userId),
    unique("email_labels_user_name_unq").on(table.userId, table.name),
  ],
);

export const emailEmailLabels = pgTable(
  "email_email_labels",
  {
    emailId: uuid("email_id")
      .notNull()
      .references(() => emails.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => emailLabels.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.emailId, table.labelId] }),
    index("email_email_labels_email_id_idx").on(table.emailId),
    index("email_email_labels_label_id_idx").on(table.labelId),
  ],
);
