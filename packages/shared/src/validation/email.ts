import { z } from "zod";

// ─── Sync Interval ───────────────────────────────────────────────────────────

export const syncIntervalSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(30),
  z.literal(60),
]);

export type SyncIntervalValue = z.infer<typeof syncIntervalSchema>;

// ─── Email Account CRUD ──────────────────────────────────────────────────────

export const createEmailAccountInput = z.object({
  label: z.string().max(100).default(""),
  imapHost: z.string().min(1).max(255),
  imapPort: z.number().int().min(1).max(65535),
  smtpHost: z.string().min(1).max(255),
  smtpPort: z.number().int().min(1).max(65535),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(1024),
  fromAddress: z.string().email().max(255),
  syncIntervalMinutes: syncIntervalSchema.default(15),
});

export type CreateEmailAccountInput = z.infer<typeof createEmailAccountInput>;

export const updateEmailAccountInput = z.object({
  id: z.string().uuid(),
  label: z.string().max(100).optional(),
  imapHost: z.string().min(1).max(255).optional(),
  imapPort: z.number().int().min(1).max(65535).optional(),
  smtpHost: z.string().min(1).max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  username: z.string().min(1).max(255).optional(),
  password: z.string().min(1).max(1024).optional(),
  fromAddress: z.string().email().max(255).optional(),
  syncIntervalMinutes: syncIntervalSchema.optional(),
  isActive: z.boolean().optional(),
});

export type UpdateEmailAccountInput = z.infer<typeof updateEmailAccountInput>;

export const testEmailConnectionInput = z.object({
  imapHost: z.string().min(1).max(255),
  imapPort: z.number().int().min(1).max(65535),
  smtpHost: z.string().min(1).max(255),
  smtpPort: z.number().int().min(1).max(65535),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(1024),
});

export type TestEmailConnectionInput = z.infer<typeof testEmailConnectionInput>;

// ─── Email Sending ───────────────────────────────────────────────────────────

export const sendEmailInput = z.object({
  accountId: z.string().uuid(),
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1).max(998),
  htmlBody: z.string().min(1),
  replyToMessageId: z.string().optional(),
  threadId: z.string().optional(),
  propertyId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailInput>;

// ─── Email Actions ───────────────────────────────────────────────────────────

export const manualAssignInput = z.object({
  emailId: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  propertyId: z.string().uuid().nullable(),
});

export type ManualAssignInput = z.infer<typeof manualAssignInput>;

export const transferAttachmentInput = z.object({
  emailId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  propertyId: z.string().uuid(),
  category: z.string().min(1),
  newFilename: z.string().min(1).max(255).optional(),
});

export type TransferAttachmentInput = z.infer<typeof transferAttachmentInput>;

// ─── Email Listing ───────────────────────────────────────────────────────────

export const listEmailsInput = z.object({
  accountId: z.string().uuid(),
  folderId: z.string().uuid().optional(),
  labelId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  inboundOnly: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  matched: z.boolean().optional(),
});

export type ListEmailsInput = z.infer<typeof listEmailsInput>;

// ─── Email Templates ─────────────────────────────────────────────────────────

export const createEmailTemplateInput = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(998),
  body: z.string().min(1),
});

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateInput>;

export const updateEmailTemplateInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(998).optional(),
  body: z.string().min(1).optional(),
});

export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateInput>;

// ─── Email Labels ────────────────────────────────────────────────────────────

export const createLabelInput = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color code"),
});

export type CreateLabelInput = z.infer<typeof createLabelInput>;

export const updateLabelInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color code")
    .optional(),
});

export type UpdateLabelInput = z.infer<typeof updateLabelInput>;

export const assignLabelsInput = z.object({
  emailId: z.string().uuid(),
  labelIds: z.array(z.string().uuid()),
});

export type AssignLabelsInput = z.infer<typeof assignLabelsInput>;
