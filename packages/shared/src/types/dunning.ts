export const DUNNING_LEVELS = {
  reminder: "reminder",
  first: "first",
  second: "second",
  third: "third",
} as const;

export type DunningLevel = (typeof DUNNING_LEVELS)[keyof typeof DUNNING_LEVELS];
