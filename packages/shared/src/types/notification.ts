export const NOTIFICATION_TYPES = {
  new_email: "new_email",
  overdue_rent: "overdue_rent",
  vacancy: "vacancy",
  contract_expiry: "contract_expiry",
  action_center: "action_center",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
