import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const VERIFICATION_TOKEN_TYPES = [
  "email_verify",
  "password_reset",
] as const;
export type VerificationTokenType = (typeof VERIFICATION_TOKEN_TYPES)[number];

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    type: text("type").notNull().$type<VerificationTokenType>(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("verification_tokens_token_hash_idx").on(table.tokenHash),
    index("verification_tokens_user_id_idx").on(table.userId),
  ],
);
