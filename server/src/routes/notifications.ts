import { Router } from 'express';

import { getOne, query, run } from '../models/db';
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
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录' });
  }
  // BUG-08: 检查通知是否属于当前用户
  const notif = getOne('SELECT user_id FROM notifications WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!notif) return res.status(404).json({ error: '通知不存在' });
  if (String(notif.user_id) !== authUserId) {
    return res.status(403).json({ error: '只能标记自己的通知为已读' });
  }
  run(`UPDATE notifications SET read = 1 WHERE id = ?`, [req.params.id]);
  res.json({ data: 'ok' });
});

// PUT /read-all - 批量标记已读
notificationsRouter.put('/read-all', (req, res) => {
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录' });
  }

  const { ids, all } = req.body;

  if (all === true) {
    // 标记所有为已读
    run(`UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0`, [authUserId]);
    res.json({ data: { ok: true, mode: 'all' } });
  } else if (Array.isArray(ids) && ids.length > 0) {
    // 标记指定ID为已读（需验证这些通知属于当前用户）
    const placeholders = ids.map(() => '?').join(',');
    const rows = query(
      `SELECT id FROM notifications WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, authUserId]
    ) as Record<string, any>[];
    
    const validIds = rows.map((row: Record<string, any>) => row.id);
    if (validIds.length === 0) {
      return res.json({ data: { ok: true, updated: 0 } });
    }
    
    const updatePlaceholders = validIds.map(() => '?').join(',');
    run(
      `UPDATE notifications SET read = 1 WHERE id IN (${updatePlaceholders})`,
      validIds
    );
    
    res.json({ data: { ok: true, updated: validIds.length, mode: 'partial' } });
  } else {
    return res.status(400).json({ error: '请提供 ids 数组或设置 all=true' });
  }
});
