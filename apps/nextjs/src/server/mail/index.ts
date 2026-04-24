import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";
import type Mail from "nodemailer/lib/mailer";

/**
 * Create and return a configured nodemailer transporter.
 * Uses SMTP configuration from environment variables.
 */
export function createMailTransporter(): nodemailer.Transporter {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    ...(user && pass ? { auth: { user, pass } } : {}),
  });
}

let transporter: nodemailer.Transporter | null = null;

/**
 * Get the singleton mail transporter instance
 */
export function getMailTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = createMailTransporter();
  }
  return transporter;
}

/**
 * Send an email using the configured transporter
 */
export async function sendMail(
  options: Mail.Options,
): Promise<nodemailer.SentMessageInfo> {
  const transport = getMailTransporter();
  return transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    ...options,
  });
}

/**
 * Verify the SMTP connection is working
 */
export async function verifyMailConnection(): Promise<boolean> {
  try {
    const transport = getMailTransporter();
    await transport.verify();
    logger.info("SMTP connection verified");
    return true;
  } catch (error) {
    logger.error({ err: error }, "SMTP connection verification failed");
    return false;
  }
}
