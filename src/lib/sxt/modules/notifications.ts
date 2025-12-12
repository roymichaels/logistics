import { sxtExecute, sxtQuery } from '../client';
import type { Notification } from '../../data/types';

export async function listNotifications(userId: string): Promise<Notification[]> {
  return sxtQuery<Notification>(
    `
    SELECT *
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC;
    `,
    [userId]
  );
}

export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  type?: string;
}): Promise<Notification> {
  const { userId, title, body, type } = input;
  const id = crypto.randomUUID();

  await sxtExecute(
    `
    INSERT INTO notifications (
      id, user_id, title, body, type, read, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, FALSE, NOW(), NOW()
    );
    `,
    [id, userId, title, body, type ?? null]
  );

  const rows = await sxtQuery<Notification>('SELECT * FROM notifications WHERE id = $1;', [id]);
  return rows[0];
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await sxtExecute(
    `
    UPDATE notifications
    SET read = TRUE, updated_at = NOW()
    WHERE id = $1 AND user_id = $2;
    `,
    [notificationId, userId]
  );
}
