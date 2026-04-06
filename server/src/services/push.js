import webpush from 'web-push';
import { pool } from '../lib/db.js';

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'admin@naily.app'}`,
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function sendPushToUser(userId, role, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const { rows } = await pool.query(
      'SELECT subscription FROM push_subscriptions WHERE user_id = $1 AND role = $2',
      [userId, role]
    );
    for (const row of rows) {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query(
            'DELETE FROM push_subscriptions WHERE user_id = $1 AND role = $2',
            [userId, role]
          );
        }
      }
    }
  } catch (err) {
    console.error('Push send error:', err.message);
  }
}
