import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refreshTokenHash: text("refresh_token_hash").notNull().unique(),
    familyId: uuid("family_id").notNull(),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_refresh_token_hash_idx").on(table.refreshTokenHash),
    index("sessions_family_id_idx").on(table.familyId),
  ],
);
