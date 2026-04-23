import { Router } from 'express';

import { getOne, query, run, uuid } from '../models/db';
import { getAuthUserId } from '../lib/session';

export const exchangesRouter = Router();

exchangesRouter.get('/', (req, res) => {
  const { item_id, user_id, status } = req.query;
  if (!item_id && !user_id) {
    return res.status(400).json({ error: 'item_id 或 user_id 必填' });
  }

  let sql = 'SELECT * FROM exchanges WHERE 1 = 1';
  const params: unknown[] = [];

  if (item_id) {
    sql += ' AND item_id = ?';
    params.push(item_id);
  }

  if (user_id) {
    sql += ' AND (requester_id = ? OR owner_id = ?)';
    params.push(user_id, user_id);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT 20';

  const rows = query(sql, params);
  res.json({ data: item_id ? rows[0] ?? null : rows });
});

exchangesRouter.post('/', (req, res) => {
  const { item_id, requester_id, owner_id, message } = req.body;
  if (!item_id || !requester_id || !owner_id) {
    return res.status(400).json({ error: '缺少预约字段' });
  }
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录后再预约' });
  }
  if (authUserId !== String(requester_id)) {
    return res.status(403).json({ error: '当前登录身份无法发起这次预约' });
  }

  const item = getOne('SELECT * FROM items WHERE id = ?', [item_id]) as Record<string, any> | null;
  if (!item) return res.status(404).json({ error: '物品不存在' });
  if (String(item.status) === 'completed') return res.status(400).json({ error: '该物品已完成交换' });

  const id = `exchange_${uuid().slice(0, 8)}`;
  run(
    `INSERT INTO exchanges (id, item_id, requester_id, owner_id, status, message)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [id, item_id, requester_id, owner_id, message || '想预约这件物品']
  );
  run(`UPDATE items SET status = 'pending' WHERE id = ?`, [item_id]);
  run(
    `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
     VALUES (?, ?, 'exchange', '新的预约申请', ?, ?, 0)`,
    [`notif_${uuid().slice(0, 8)}`, owner_id, '有邻居发起了预约，请尽快确认。', item_id]
  );

  const exchange = getOne('SELECT * FROM exchanges WHERE id = ?', [id]);
  res.status(201).json({ data: exchange });
});

exchangesRouter.put('/:id/complete', (req, res) => {
  const exchange = getOne('SELECT * FROM exchanges WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!exchange) return res.status(404).json({ error: '预约不存在' });
  const actorId = String(req.body?.actor_id || '');
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录后再确认交接' });
  }
  if (!actorId || actorId !== authUserId) {
    return res.status(403).json({ error: '当前登录身份无法确认这次交接' });
  }
  if (![String(exchange.owner_id), String(exchange.requester_id)].includes(actorId)) {
    return res.status(403).json({ error: '只有参与预约的双方才能确认交接' });
  }

  run(`UPDATE exchanges SET status = 'completed' WHERE id = ?`, [req.params.id]);
  run(`UPDATE items SET status = 'completed' WHERE id = ?`, [exchange.item_id]);
  run(
    `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
     VALUES (?, ?, 'exchange', '一次交换已完成', ?, ?, 0)`,
    [`notif_${uuid().slice(0, 8)}`, exchange.requester_id, '你预约的物品已完成交接。', exchange.item_id]
  );

  res.json({ data: getOne('SELECT * FROM exchanges WHERE id = ?', [req.params.id]) });
});
