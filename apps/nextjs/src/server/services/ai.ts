/**
 * Gemini AI service. Wraps @google/genai for two use-cases:
 *  - Generate a task (title + description) from an email.
 *  - Generate a polite reply to an email.
 *
 * Uses structured output (responseJsonSchema) on `gemini-2.5-flash`.
 */
import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";
import { logger } from "@/lib/logger";

const MODEL_ID = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const taskOutputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000),
  language: z.string().min(2).max(8),
});

const replyOutputSchema = z.object({
  html: z.string().min(1),
  language: z.string().min(2).max(8),
});

const improvedDraftOutputSchema = z.object({
  subject: z.string().min(1).max(998),
  html: z.string().min(1),
  language: z.string().min(2).max(8),
});

export type TaskGenerationResult = z.infer<typeof taskOutputSchema>;
export type ReplyGenerationResult = z.infer<typeof replyOutputSchema>;
export type ImprovedDraftGenerationResult = z.infer<
  typeof improvedDraftOutputSchema
>;

export const REPLY_TONES = ["formal", "friendly", "short"] as const;
export type ReplyTone = (typeof REPLY_TONES)[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

interface UsageMetadata {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

function extractUsage(response: GenerateContentResponse): UsageMetadata {
  const usage = response.usageMetadata;
  return {
    promptTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
    totalTokens: usage?.totalTokenCount ?? 0,
  };
}

function parseResponseText(response: GenerateContentResponse): unknown {
  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    logger.error({ err, text }, "Failed to parse Gemini JSON response");
    throw new Error("Invalid JSON in Gemini response");
  }
}

// ─── Task generation ─────────────────────────────────────────────────────────

interface GenerateTaskInput {
  subject: string | null;
  textBody: string | null;
}

const TASK_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description:
        "Short, action-oriented task title derived from the email (max 100 chars).",
    },
    description: {
      type: "string",
      description:
        "Concise task description summarising the email, including key facts (names, dates, numbers) and what needs to be done. 2–6 sentences.",
    },
    language: {
      type: "string",
      description:
        "ISO 639-1 language code of the generated text (e.g. 'de', 'en'). Must match the email language.",
    },
  },
  required: ["title", "description", "language"],
} as const;

export async function generateTaskFromEmail(
  input: GenerateTaskInput,
): Promise<{ result: TaskGenerationResult; usage: UsageMetadata }> {
  const subject = input.subject?.trim() || "(no subject)";
  const body = truncate((input.textBody ?? "").trim(), 8000) || "(empty body)";

  const prompt = [
    "You are an assistant that converts incoming emails into actionable tasks for a property manager.",
    "Read the email below and produce a task with:",
    "- A short title (imperative, action-oriented).",
    "- A concise description summarising the request, key facts (names, dates, amounts) and what needs to be done.",
    "Always respond in the same language as the email.",
    "",
    `Email subject: ${subject}`,
    "Email body:",
    body,
  ].join("\n");

  const response = await getClient().models.generateContent({
    model: MODEL_ID,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: TASK_RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  });

  const parsed = parseResponseText(response);
  const result = taskOutputSchema.parse(parsed);

  return { result, usage: extractUsage(response) };
}

// ─── Reply generation ────────────────────────────────────────────────────────

interface GenerateReplyInput {
  subject: string | null;
  textBody: string | null;
  fromAddress: string;
  tone: ReplyTone;
  /** User's display name. Used as the final line of the signature block. */
  signatureName: string;
  /** Optional rich signature stored in user settings. Falls back to signatureName. */
  signatureBlock?: string | null;
  /** Matched tenant for personalised salutation. Null if not matched. */
  tenant?: {
    firstName: string;
    lastName: string;
    gender: string | null;
  } | null;
  existingDraft?: string | null;
}

const REPLY_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    html: {
      type: "string",
      description:
        "The reply email body as simple HTML. Use <p> for paragraphs and <ul>/<ol>/<li> for lists. No <html>/<body> wrapper, no inline styles, no images. End with a closing greeting and the signature name on its own line.",
    },
    language: {
      type: "string",
      description:
        "ISO 639-1 language code of the generated reply (e.g. 'de', 'en'). Must match the source email.",
    },
  },
  required: ["html", "language"],
} as const;

const IMPROVED_DRAFT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    subject: {
      type: "string",
      description:
        "Improved subject line. Keep it concise and aligned with the existing intent.",
    },
    html: {
      type: "string",
      description:
        "Improved email body as simple HTML. Use <p> for paragraphs and <ul>/<ol>/<li> for lists. No <html>/<body> wrapper, no inline styles, no images, no signature.",
    },
    language: {
      type: "string",
      description:
        "ISO 639-1 language code of the generated draft (e.g. 'de', 'en').",
    },
  },
  required: ["subject", "html", "language"],
} as const;

const TONE_INSTRUCTIONS: Record<ReplyTone, string> = {
  formal:
    "Use a formal, professional tone. Use formal salutations (e.g. 'Sehr geehrte/r ...' or 'Dear ...').",
  friendly:
    "Use a polite but warm and friendly tone. Use a relaxed greeting (e.g. 'Hallo ...' or 'Hi ...').",
  short:
    "Be very concise: a brief greeting, 1–3 short sentences, a closing. Stay polite.",
};
/**
 * Closing phrase per tone, paired to the language of the source email.
 * The KI inserts the matching translation; defaults shown are German.
 */
const TONE_CLOSING: Record<ReplyTone, { de: string; en: string }> = {
  formal: { de: "Mit freundlichen Gr\u00fc\u00dfen", en: "Best regards" },
  friendly: { de: "Liebe Gr\u00fc\u00dfe", en: "Kind regards" },
  short: { de: "Gr\u00fc\u00dfe", en: "Regards" },
};
export async function generateReply(
  input: GenerateReplyInput,
): Promise<{ result: ReplyGenerationResult; usage: UsageMetadata }> {
  const subject = input.subject?.trim() || "(no subject)";
  const body = truncate((input.textBody ?? "").trim(), 8000) || "(empty body)";
  const draft = input.existingDraft?.trim();

  const closing = TONE_CLOSING[input.tone];
  const signatureBlock =
    input.signatureBlock?.trim() && input.signatureBlock.trim().length > 0
      ? input.signatureBlock.trim()
      : input.signatureName;

  const recipientLines: string[] = [];
  if (input.tenant) {
    const fullName =
      `${input.tenant.firstName} ${input.tenant.lastName}`.trim();
    const genderHint =
      input.tenant.gender === "male"
        ? "male"
        : input.tenant.gender === "female"
          ? "female"
          : "unknown";
    recipientLines.push(
      `The recipient is a known tenant: ${fullName} (gender: ${genderHint}).`,
      "Address them by name in the salutation, using a form appropriate to the tone and the language of the email (e.g. 'Sehr geehrter Herr Mustermann' for formal/male, 'Hallo Max' for friendly).",
    );
  } else {
    recipientLines.push(
      "The recipient is not a known tenant. Use a generic salutation appropriate to the tone and language (e.g. 'Sehr geehrte Damen und Herren' for formal, 'Hallo' for friendly).",
    );
  }

  const promptParts = [
    "You are an assistant that drafts polite, professional email replies for a property manager.",
    TONE_INSTRUCTIONS[input.tone],
    "Guidelines:",
    "- Detect the language of the incoming email body and reply in that exact language. If ambiguous, default to German.",
    "- Output simple HTML using <p> for paragraphs and <ul>/<ol>/<li> for lists.",
    "- Do NOT include <html>, <head>, <body> tags or inline styles.",
    `- End the reply with the closing phrase '${closing.de}' (German) or '${closing.en}' (English) on its own line, matching the detected language.`,
    `- After the closing phrase, on a new line, place the signature block exactly as provided below. Do not modify it. Preserve line breaks within it (use <br> inside a single <p>, or one <p> per line).`,
    "- Do not invent facts. If information is missing, ask politely or say it will be checked.",
    "",
    ...recipientLines,
    "",
    "Signature block to use verbatim:",
    signatureBlock,
    "",
    `Incoming email from: ${input.fromAddress}`,
    `Subject: ${subject}`,
    "Body:",
    body,
  ];

  if (draft && draft !== "<p></p>") {
    promptParts.push(
      "",
      "The user has already drafted the following reply (HTML). Refine and extend it instead of replacing it from scratch. Keep the user's intent and wording where reasonable, fix grammar and tone:",
      draft,
    );
  }

  const response = await getClient().models.generateContent({
    model: MODEL_ID,
    contents: promptParts.join("\n"),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: REPLY_RESPONSE_SCHEMA,
      temperature: 0.6,
    },
  });

  const parsed = parseResponseText(response);
  const result = replyOutputSchema.parse(parsed);

  return { result, usage: extractUsage(response) };
}

// ─── Draft improvement ──────────────────────────────────────────────────────

interface ImproveEmailDraftInput {
  subject: string;
  htmlBody: string;
  tone: ReplyTone;
  recipients: string[];
  tenant?: {
    firstName: string;
    lastName: string;
    gender: string | null;
  } | null;
  property?: {
    street: string | null;
    zipCode: string | null;
    city: string | null;
  } | null;
}

export async function improveEmailDraft(
  input: ImproveEmailDraftInput,
): Promise<{ result: ImprovedDraftGenerationResult; usage: UsageMetadata }> {
  const subject = input.subject.trim() || "(no subject)";
  const body = truncate(input.htmlBody.trim(), 12000) || "<p></p>";
  const recipientContext = input.recipients.length
    ? input.recipients.join(", ")
    : "(no recipients selected)";
  const tenantContext = input.tenant
    ? `${input.tenant.firstName} ${input.tenant.lastName}`.trim()
    : "(no single tenant context)";
  const propertyContext = input.property
    ? [input.property.street, input.property.zipCode, input.property.city]
        .filter(Boolean)
        .join(", ") || "(property without address)"
    : "(no single property context)";

  const prompt = [
    "You are an assistant that improves email drafts for a property manager.",
    TONE_INSTRUCTIONS[input.tone],
    "Task:",
    "- Improve grammar, spelling, punctuation, sentence structure, clarity, and flow.",
    "- Keep the user's intent and concrete facts. Do not invent facts, promises, amounts, dates, or legal statements.",
    "- You may politely enhance wording and make the message more professional.",
    "- Keep the same language as the draft. If the draft is ambiguous, default to German.",
    "- Output simple HTML using <p> for paragraphs and <ul>/<ol>/<li> for lists.",
    "- Do NOT include <html>, <head>, <body> tags, inline styles, images, or a signature. The application appends the user's signature when sending.",
    "",
    `Recipients: ${recipientContext}`,
    `Tenant context: ${tenantContext}`,
    `Property context: ${propertyContext}`,
    `Current subject: ${subject}`,
    "Current body HTML:",
    body,
  ].join("\n");

  const response = await getClient().models.generateContent({
    model: MODEL_ID,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: IMPROVED_DRAFT_RESPONSE_SCHEMA,
      temperature: 0.45,
    },
  });

  const parsed = parseResponseText(response);
  const result = improvedDraftOutputSchema.parse(parsed);

  return { result, usage: extractUsage(response) };
}
