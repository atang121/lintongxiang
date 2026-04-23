import { Router } from 'express';
import { getOne, query, run, uuid } from '../models/db';
import { getAuthUserId } from '../lib/session';
import { resolveAssetUrls } from '../services/storage';

export const messagesRouter = Router();

// GET /api/messages?user_id=xxx
messagesRouter.get('/', (req, res) => {
  const { user_id, item_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id 必填' });
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) return res.status(401).json({ error: '请先登录后查看消息' });
  if (authUserId !== String(user_id)) return res.status(403).json({ error: '当前登录身份无法查看这些消息' });

  let sql = `SELECT m.*, f.nickname as from_nickname, f.avatar as from_avatar, t.nickname as to_nickname, t.avatar as to_avatar, i.title as item_title
    FROM messages m JOIN users f ON m.from_user_id = f.id JOIN users t ON m.to_user_id = t.id JOIN items i ON m.item_id = i.id
    WHERE (m.from_user_id = ? OR m.to_user_id = ?)`;
  const params: unknown[] = [user_id, user_id];

  if (item_id) { sql += ' AND m.item_id = ?'; params.push(item_id); }
  sql += ' ORDER BY m.created_at ASC';

  res.json({ data: query(sql, params) });
});

// POST /api/messages
messagesRouter.post('/', (req, res) => {
  const { item_id, from_user_id, to_user_id, content } = req.body;
  if (!item_id || !from_user_id || !to_user_id || !content) return res.status(400).json({ error: '缺少必填字段' });
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录后再发消息' });
  }
  if (authUserId !== String(from_user_id)) {
    return res.status(403).json({ error: '当前登录身份无法发送这条消息' });
  }

  const id = 'msg_' + uuid().slice(0, 8);
  run(`INSERT INTO messages (id, item_id, from_user_id, to_user_id, content) VALUES (?, ?, ?, ?, ?)`,
    [id, item_id, from_user_id, to_user_id, content]);
  run(
    `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
     VALUES (?, ?, 'message', '你收到一条新私信', ?, ?, 0)`,
    [`notif_${uuid().slice(0, 8)}`, to_user_id, content, item_id]
  );

  res.status(201).json({ data: getOne('SELECT * FROM messages WHERE id = ?', [id]) });
});

// PUT /api/messages/:id/read
messagesRouter.put('/:id/read', (req, res) => {
  run('UPDATE messages SET read = 1 WHERE id = ?', [req.params.id]);
  res.json({ data: 'ok' });
});

// GET /api/messages/conversations?user_id=xxx
messagesRouter.get('/conversations', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id 必填' });
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) return res.status(401).json({ error: '请先登录后查看会话' });
  if (authUserId !== String(user_id)) return res.status(403).json({ error: '当前登录身份无法查看这些会话' });

  const rows = query(`
    SELECT m.*, f.nickname as from_nickname, f.avatar as from_avatar, t.nickname as to_nickname, t.avatar as to_avatar,
           i.title as item_title, i.images as item_images
    FROM messages m
    JOIN users f ON m.from_user_id = f.id
    JOIN users t ON m.to_user_id = t.id
    JOIN items i ON m.item_id = i.id
    WHERE m.from_user_id = ? OR m.to_user_id = ?
    ORDER BY m.created_at DESC
  `, [user_id, user_id]);

  const seen = new Set<string>();
  const conversations = rows.reduce<Array<Record<string, any>>>((acc, row) => {
    const typedRow = row as Record<string, any>;
    const partnerId = String(typedRow.from_user_id) === String(user_id) ? String(typedRow.to_user_id) : String(typedRow.from_user_id);
    const key = `${partnerId}_${typedRow.item_id}`;
    if (seen.has(key)) return acc;
    seen.add(key);
    acc.push({
      ...typedRow,
      partner_id: partnerId,
      item_images: resolveAssetUrls(JSON.parse(String(typedRow.item_images || '[]'))),
      unread: 0,
    });
    return acc;
  }, []);

  res.json({ data: conversations });
});
