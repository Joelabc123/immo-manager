import Redis from "ioredis";

let publisherClient: Redis | null = null;
let subscriberClient: Redis | null = null;

/**
 * Get or create a Redis publisher client (for sending messages).
 */
export function getRedisPublisher(url?: string): Redis {
  if (!publisherClient) {
    publisherClient = new Redis(
      url ?? process.env.REDIS_URL ?? "redis://localhost:6379",
      {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      },
    );
  }
  return publisherClient;
}

/**
 * Get or create a Redis subscriber client (for listening to channels).
 * A separate client is required because a subscribed Redis connection
 * cannot issue non-subscribe commands.
 */
export function getRedisSubscriber(url?: string): Redis {
  if (!subscriberClient) {
    subscriberClient = new Redis(
      url ?? process.env.REDIS_URL ?? "redis://localhost:6379",
      {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      },
    );
  }
  return subscriberClient;
}

/**
 * Disconnect all Redis clients. Call on process shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (publisherClient) {
    await publisherClient.quit();
    publisherClient = null;
  }
  if (subscriberClient) {
    await subscriberClient.quit();
    subscriberClient = null;
  }
}

// ─── Event Channel Constants ─────────────────────────────────────────────────

export const REDIS_CHANNELS = {
  /** Published when new emails are synced. Payload: { accountId, userId, count } */
  EMAIL_NEW: "email:new",
  /** Published when a full sync cycle completes. Payload: { accountId, userId, newEmails, matched, errors } */
  EMAIL_SYNC_COMPLETE: "email:sync-complete",
  /** Published by Next.js to request an immediate sync. Payload: { accountId } */
  EMAIL_SYNC_REQUEST: "email:sync-request",
  /** Published when an email account is created/updated/deleted. Payload: { accountId, userId, action } */
  EMAIL_ACCOUNT_UPDATED: "email:account-updated",
  /** Published when sync encounters an error. Payload: { accountId, userId, error } */
  EMAIL_SYNC_ERROR: "email:sync-error",
} as const;

export type RedisChannel = (typeof REDIS_CHANNELS)[keyof typeof REDIS_CHANNELS];

// ─── Typed Event Payloads ────────────────────────────────────────────────────

interface EmailNewPayload {
  accountId: string;
  userId: string;
  count: number;
}

interface EmailSyncCompletePayload {
  accountId: string;
  userId: string;
  newEmails: number;
  matched: number;
  errors: number;
}

interface EmailSyncRequestPayload {
  accountId: string;
}

interface EmailAccountUpdatedPayload {
  accountId: string;
  userId: string;
  action: "create" | "update" | "delete";
}

interface EmailSyncErrorPayload {
  accountId: string;
  userId: string;
  error: string;
}

type ChannelPayloadMap = {
  [REDIS_CHANNELS.EMAIL_NEW]: EmailNewPayload;
  [REDIS_CHANNELS.EMAIL_SYNC_COMPLETE]: EmailSyncCompletePayload;
  [REDIS_CHANNELS.EMAIL_SYNC_REQUEST]: EmailSyncRequestPayload;
  [REDIS_CHANNELS.EMAIL_ACCOUNT_UPDATED]: EmailAccountUpdatedPayload;
  [REDIS_CHANNELS.EMAIL_SYNC_ERROR]: EmailSyncErrorPayload;
};

/**
 * Publish a typed event to a Redis channel.
 */
export async function publishEvent<C extends RedisChannel>(
  channel: C,
  payload: ChannelPayloadMap[C],
): Promise<void> {
  const client = getRedisPublisher();
  await client.publish(channel, JSON.stringify(payload));
}

/**
 * Subscribe to a typed Redis channel and invoke a callback on each message.
 */
export function subscribeToChannel<C extends RedisChannel>(
  channel: C,
  callback: (payload: ChannelPayloadMap[C]) => void,
): void {
  const client = getRedisSubscriber();
  void client.subscribe(channel);
  client.on("message", (ch: string, message: string) => {
    if (ch === channel) {
      callback(JSON.parse(message) as ChannelPayloadMap[C]);
    }
  });
}
