import { firestore } from "@/lib/db";

export async function createNotification(
  userId: string,
  notification: { type: string; title: string; message: string; actionUrl?: string }
): Promise<void> {
  await firestore.addDoc("notifications", {
    userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl: notification.actionUrl ?? null,
  });
}
