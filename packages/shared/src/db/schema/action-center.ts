import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const actionCenterDismissed = pgTable(
  "action_center_dismissed",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ruleType: text("rule_type").notNull(),
    entityId: uuid("entity_id"),
    dismissedAt: timestamp("dismissed_at").defaultNow().notNull(),
  },
  (table) => [index("action_center_dismissed_user_id_idx").on(table.userId)],
);
