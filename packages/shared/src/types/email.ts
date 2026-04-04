export const EMAIL_TEMPLATE_VARIABLES = {
  tenant_name: "{{tenant_name}}",
  tenant_first_name: "{{tenant_first_name}}",
  property_address: "{{property_address}}",
  cold_rent: "{{cold_rent}}",
  warm_rent: "{{warm_rent}}",
  unit_name: "{{unit_name}}",
} as const;

export type EmailTemplateVariable =
  (typeof EMAIL_TEMPLATE_VARIABLES)[keyof typeof EMAIL_TEMPLATE_VARIABLES];
