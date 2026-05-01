/**
 * Per-user, per-day rate limiter for AI calls. Backed by Redis.
 *
 * Key format: `ai:usage:{userId}:{YYYY-MM-DD}`
 * Counter is incremented atomically and expires after 24h.
 */
import { TRPCError } from "@trpc/server";
import { getRedisPublisher } from "@repo/shared/utils/redis";
import { logger } from "@/lib/logger";

const DAY_SECONDS = 60 * 60 * 24;
const DEFAULT_DAILY_LIMIT = 50;

function todayKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return `ai:usage:${userId}:${today}`;
}

function getDailyLimit(): number {
  const raw = process.env.AI_DAILY_LIMIT_PER_USER;
  if (!raw) return DEFAULT_DAILY_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_DAILY_LIMIT;
}

/**
 * Atomically increment the user's daily counter and throw TOO_MANY_REQUESTS
 * if the limit is exceeded. Failures of Redis itself fail open (logged) so
 * an outage does not block AI features entirely.
 */
export async function enforceAiRateLimit(userId: string): Promise<void> {
  const limit = getDailyLimit();
  const key = todayKey(userId);

  try {
    const redis = getRedisPublisher();
    const next = await redis.incr(key);
    if (next === 1) {
      await redis.expire(key, DAY_SECONDS);
    }
    if (next > limit) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `AI daily limit reached (${limit} requests/day). Please try again tomorrow.`,
      });
    }
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    logger.warn({ err, userId }, "AI rate-limit Redis check failed; allowing");
  }
}
