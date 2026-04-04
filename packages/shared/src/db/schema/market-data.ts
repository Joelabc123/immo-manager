import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const marketDataCache = pgTable("market_data_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  dataType: text("data_type").notNull(),
  region: text("region"),
  data: jsonb("data").notNull(),
  fetchedAt: timestamp("fetched_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
