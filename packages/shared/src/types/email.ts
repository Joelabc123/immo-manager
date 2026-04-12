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

export const FOLDER_TYPES = [
  "inbox",
  "sent",
  "drafts",
  "trash",
  "spam",
  "archive",
  "custom",
] as const;

export type FolderType = (typeof FOLDER_TYPES)[number];

export const SYNC_STATUSES = ["idle", "syncing", "error"] as const;

export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const SYNC_INTERVAL_OPTIONS = [5, 10, 15, 30, 60] as const;

export type SyncInterval = (typeof SYNC_INTERVAL_OPTIONS)[number];

export const PREDEFINED_LABELS = [
  { name: "Vertrag", color: "#3b82f6" },
  { name: "Mahnung", color: "#ef4444" },
  { name: "Reparatur", color: "#f97316" },
  { name: "Anfrage", color: "#22c55e" },
  { name: "Kuendigung", color: "#a855f7" },
  { name: "Nebenkosten", color: "#eab308" },
] as const;
