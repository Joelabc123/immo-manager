export const PROPERTY_TYPES = {
  single_family: "single_family",
  semi_detached: "semi_detached",
  terraced: "terraced",
  apartment: "apartment",
  commercial: "commercial",
  land: "land",
  garage: "garage",
  other: "other",
  multi_family: "multi_family",
} as const;

export type PropertyType = (typeof PROPERTY_TYPES)[keyof typeof PROPERTY_TYPES];

export const PROPERTY_STATUS = {
  rented: "rented",
  vacant: "vacant",
  owner_occupied: "owner_occupied",
  fix_flip: "fix_flip",
  renovation: "renovation",
  sale_planned: "sale_planned",
} as const;

export type PropertyStatus =
  (typeof PROPERTY_STATUS)[keyof typeof PROPERTY_STATUS];

export const MULTI_UNIT_TYPES: ReadonlySet<PropertyType> = new Set([
  PROPERTY_TYPES.multi_family,
  PROPERTY_TYPES.commercial,
]);
