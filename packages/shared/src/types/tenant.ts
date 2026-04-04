export const RENT_TYPES = {
  fixed: "fixed",
  graduated: "graduated",
  indexed: "indexed",
} as const;

export type RentType = (typeof RENT_TYPES)[keyof typeof RENT_TYPES];

export const GENDERS = {
  male: "male",
  female: "female",
  other: "other",
} as const;

export type Gender = (typeof GENDERS)[keyof typeof GENDERS];
