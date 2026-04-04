import { z } from "zod";

export const updateNotificationPreferencesInput = z.object({
  pushEnabled: z.boolean().optional(),
  notifyNewEmail: z.boolean().optional(),
  notifyOverdueRent: z.boolean().optional(),
  notifyContractExpiry: z.boolean().optional(),
  trackingPixelEnabled: z.boolean().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesInput
>;

export const pushSubscriptionInput = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInput>;
