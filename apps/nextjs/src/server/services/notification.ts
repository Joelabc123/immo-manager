import { eq } from "drizzle-orm";
import { db } from "@repo/shared/db";
import {
  notifications,
  users,
  pushSubscriptions,
} from "@repo/shared/db/schema";
import type { NotificationType } from "@repo/shared/types";
import { logger } from "@/lib/logger";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Create an in-app notification and optionally send a push notification.
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  const { userId, type, title, message, entityType, entityId } = params;

  // Check if user wants this notification type
  const [user] = await db
    .select({
      pushEnabled: users.pushEnabled,
      notifyNewEmail: users.notifyNewEmail,
      notifyOverdueRent: users.notifyOverdueRent,
      notifyContractExpiry: users.notifyContractExpiry,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;

  // Check per-type preference
  const shouldNotify =
    (type === "new_email" && user.notifyNewEmail) ||
    (type === "overdue_rent" && user.notifyOverdueRent) ||
    (type === "contract_expiry" && user.notifyContractExpiry) ||
    type === "vacancy" ||
    type === "action_center";

  if (!shouldNotify) return;

  // Insert in-app notification
  await db.insert(notifications).values({
    userId,
    type,
    title,
    message,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
  });

  // Send push notifications if enabled
  if (user.pushEnabled) {
    try {
      const subscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));

      if (subscriptions.length > 0) {
        const webpush = await import("web-push");

        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject =
          process.env.VAPID_SUBJECT || "mailto:admin@immo-manager.local";

        if (vapidPublicKey && vapidPrivateKey) {
          webpush.default.setVapidDetails(
            vapidSubject,
            vapidPublicKey,
            vapidPrivateKey,
          );

          const payload = JSON.stringify({
            title,
            body: message,
            type,
            entityType,
            entityId,
          });

          for (const sub of subscriptions) {
            try {
              await webpush.default.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: sub.keys as { auth: string; p256dh: string },
                },
                payload,
              );
            } catch (error) {
              // Remove expired/invalid subscriptions (410 Gone)
              const pushError = error as { statusCode?: number };
              if (pushError.statusCode === 410) {
                await db
                  .delete(pushSubscriptions)
                  .where(eq(pushSubscriptions.id, sub.id));
                logger.info(
                  { subscriptionId: sub.id },
                  "Removed expired push subscription",
                );
              } else {
                logger.warn(
                  { err: error, subscriptionId: sub.id },
                  "Failed to send push notification",
                );
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error({ err: error, userId }, "Failed to send push notifications");
    }
  }
}
