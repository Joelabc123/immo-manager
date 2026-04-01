import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

/**
 * Create and return a configured nodemailer transporter.
 * Uses SMTP configuration from environment variables.
 */
export function createMailTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
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
    console.log("[MAIL] SMTP connection verified successfully.");
    return true;
  } catch (error) {
    console.error("[MAIL] SMTP connection verification failed:", error);
    return false;
  }
}
