import { Router } from 'express';

import { query, run } from '../models/db';
import { getAuthUserId } from '../lib/session';

export const notificationsRouter = Router();

notificationsRouter.get('/', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id 必填' });
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) return res.status(401).json({ error: '请先登录后查看通知' });
  if (authUserId !== String(user_id)) return res.status(403).json({ error: '当前登录身份无法查看这些通知' });

  const rows = query(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [user_id]
  );

  res.json({ data: rows });
});

notificationsRouter.put('/:id/read', (req, res) => {
  run(`UPDATE notifications SET read = 1 WHERE id = ?`, [req.params.id]);
  res.json({ data: 'ok' });
});
