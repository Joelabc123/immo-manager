import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  date,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").notNull(),
    street: text("street"),
    city: text("city"),
    zipCode: text("zip_code"),
    country: text("country").notNull().default("DE"),
    latitude: numeric("latitude"),
    longitude: numeric("longitude"),
    livingAreaSqm: integer("living_area_sqm").notNull(),
    landAreaSqm: integer("land_area_sqm"),
    constructionYear: integer("construction_year"),
    roomCount: integer("room_count"),
    purchasePrice: integer("purchase_price").notNull(),
    purchaseDate: date("purchase_date").notNull(),
    marketValue: integer("market_value"),
    unitCount: integer("unit_count").notNull().default(1),
    thumbnailPath: text("thumbnail_path"),
    notes: text("notes"),
    microLocationScore: integer("micro_location_score"),
    microLocationScoreManual: boolean("micro_location_score_manual")
      .notNull()
      .default(false),
    depreciationBuildingCost: integer("depreciation_building_cost"),
    depreciationRate: integer("depreciation_rate"),
    depreciationStart: date("depreciation_start"),
    propertyTaxAnnual: integer("property_tax_annual"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("properties_user_id_idx").on(table.userId),
    index("properties_status_idx").on(table.status),
    index("properties_type_idx").on(table.type),
    index("properties_city_idx").on(table.city),
  ],
);
