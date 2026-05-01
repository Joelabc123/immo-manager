export const AUDIT_ENTITY_TYPES = {
  property: "property",
  tenant: "tenant",
  loan: "loan",
  expense: "expense",
  rental_unit: "rental_unit",
  rent_payment: "rent_payment",
  rent_adjustment: "rent_adjustment",
  document: "document",
  email_account: "email_account",
  email: "email",
  task: "task",
  claim: "claim",
  dunning_record: "dunning_record",
  dunning_config: "dunning_config",
} as const;

export type AuditEntityType =
  (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES];
