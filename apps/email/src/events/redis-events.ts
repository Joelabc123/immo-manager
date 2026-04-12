import {
  getRedisPublisher,
  getRedisSubscriber,
  publishEvent,
  subscribeToChannel,
  REDIS_CHANNELS,
  disconnectRedis,
} from "@repo/shared/utils/redis";
import { config, logger } from "../config";

/**
 * Initialize Redis connections for the email service.
 */
export async function initRedis(): Promise<void> {
  const pub = getRedisPublisher(config.redis.url);
  const sub = getRedisSubscriber(config.redis.url);

  await pub.connect();
  await sub.connect();

  logger.info("Redis connections established");
}

/**
 * Publish that new emails were synced.
 */
export async function publishNewEmails(
  accountId: string,
  userId: string,
  count: number,
): Promise<void> {
  await publishEvent(REDIS_CHANNELS.EMAIL_NEW, {
    accountId,
    userId,
    count,
  });
}

/**
 * Publish that a sync cycle completed.
 */
export async function publishSyncComplete(
  accountId: string,
  userId: string,
  newEmails: number,
  matched: number,
  errors: number,
): Promise<void> {
  await publishEvent(REDIS_CHANNELS.EMAIL_SYNC_COMPLETE, {
    accountId,
    userId,
    newEmails,
    matched,
    errors,
  });
}

/**
 * Publish that a sync error occurred.
 */
export async function publishSyncError(
  accountId: string,
  userId: string,
  error: string,
): Promise<void> {
  await publishEvent(REDIS_CHANNELS.EMAIL_SYNC_ERROR, {
    accountId,
    userId,
    error,
  });
}

/**
 * Listen for sync-request events from Next.js.
 */
export function onSyncRequest(
  callback: (payload: { accountId: string }) => void,
): void {
  subscribeToChannel(REDIS_CHANNELS.EMAIL_SYNC_REQUEST, callback);
}

/**
 * Listen for account-updated events (create/update/delete).
 */
export function onAccountUpdated(
  callback: (payload: {
    accountId: string;
    userId: string;
    action: "create" | "update" | "delete";
  }) => void,
): void {
  subscribeToChannel(REDIS_CHANNELS.EMAIL_ACCOUNT_UPDATED, callback);
}

/**
 * Gracefully disconnect Redis on shutdown.
 */
export async function shutdownRedis(): Promise<void> {
  await disconnectRedis();
  logger.info("Redis connections closed");
}
