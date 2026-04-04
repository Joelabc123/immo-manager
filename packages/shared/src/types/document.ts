export const DOCUMENT_CATEGORIES = {
  purchase_contract: "purchase_contract",
  rental_contract: "rental_contract",
  utility_bill: "utility_bill",
  image: "image",
  defect_report: "defect_report",
  other: "other",
} as const;

export type DocumentCategory =
  (typeof DOCUMENT_CATEGORIES)[keyof typeof DOCUMENT_CATEGORIES];
