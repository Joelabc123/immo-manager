import pino from "pino";

export const config = {
  database: {
    url: process.env.DATABASE_URL ?? "",
  },
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
  encryption: {
    key: process.env.EMAIL_ENCRYPTION_KEY ?? "",
  },
} as const;

export const logger = pino({
  name: "email-service",
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

export function validateConfig(): void {
  if (!config.database.url) {
    throw new Error("DATABASE_URL is required");
  }
  if (!config.encryption.key || config.encryption.key.length !== 64) {
    throw new Error(
      "EMAIL_ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes)",
    );
  }
}
