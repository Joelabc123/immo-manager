import { z } from "zod";

export const createEmailAccountInput = z.object({
  imapHost: z.string().min(1).max(255),
  imapPort: z.number().int().min(1).max(65535),
  smtpHost: z.string().min(1).max(255),
  smtpPort: z.number().int().min(1).max(65535),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(1024),
  fromAddress: z.string().email().max(255),
});

export type CreateEmailAccountInput = z.infer<typeof createEmailAccountInput>;

export const updateEmailAccountInput = z.object({
  id: z.string().uuid(),
  imapHost: z.string().min(1).max(255).optional(),
  imapPort: z.number().int().min(1).max(65535).optional(),
  smtpHost: z.string().min(1).max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  username: z.string().min(1).max(255).optional(),
  password: z.string().min(1).max(1024).optional(),
  fromAddress: z.string().email().max(255).optional(),
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

export const sendEmailInput = z.object({
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

export const listEmailsInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  matched: z.boolean().default(true),
});

export type ListEmailsInput = z.infer<typeof listEmailsInput>;

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
