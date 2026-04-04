import { z } from "zod";
import { DOCUMENT_CATEGORIES } from "../types/document";

const documentCategoryValues = Object.values(DOCUMENT_CATEGORIES) as [
  string,
  ...string[],
];

export const uploadDocumentInput = z.object({
  propertyId: z.string().uuid(),
  category: z.enum(documentCategoryValues),
  fileName: z.string().min(1).optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentInput>;

export const updateDocumentInput = z.object({
  id: z.string().uuid(),
  fileName: z.string().min(1).optional(),
  category: z.enum(documentCategoryValues).optional(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentInput>;

export const listDocumentsInput = z.object({
  propertyId: z.string().uuid().optional(),
  category: z.enum(documentCategoryValues).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type ListDocumentsInput = z.infer<typeof listDocumentsInput>;

export const createShareLinkInput = z.object({
  propertyId: z.string().uuid(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  password: z.string().min(4).optional(),
});

export type CreateShareLinkInput = z.infer<typeof createShareLinkInput>;

export const verifyShareLinkInput = z.object({
  token: z.string().min(1),
  password: z.string().optional(),
});

export type VerifyShareLinkInput = z.infer<typeof verifyShareLinkInput>;
