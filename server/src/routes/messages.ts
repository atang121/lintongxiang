import { Router } from 'express';
import { getOne, query, run, uuid } from '../models/db';
import { getAuthUserId } from '../lib/session';
import { requireServiceAgreement } from '../lib/compliance';
import { resolveAssetUrls } from '../services/storage';
import { checkSensitiveText, CATEGORY_LABEL, CATEGORY_EMOJI } from '../services/sensitiveWord';

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
  const serviceAgreementError = requireServiceAgreement(authUserId);
  if (serviceAgreementError) {
    return res.status(428).json(serviceAgreementError);
  }

  // 检查用户状态
  const sender = getOne('SELECT status FROM users WHERE id = ?', [authUserId]) as Record<string, any> | null;
  const senderStatus = sender?.status || 'active';
  if (senderStatus === 'muted') {
    return res.status(403).json({ error: '你的账号已被禁言，无法发送私信，如有疑问请联系管理员' });
  }
  if (senderStatus === 'deactivated') {
    return res.status(403).json({ error: '该账号已被注销，无法发送私信' });
  }

  // 敏感词过滤 — 替换放行策略：将敏感词替换为 *** 后存入数据库
  const contentCheck = checkSensitiveText(String(content));
  const sanitizedContent = contentCheck.sanitizedText;
  if (contentCheck.hasSensitive) {
    const categoryNames = Array.from(contentCheck.categories).map(c => `${CATEGORY_EMOJI[c]}${CATEGORY_LABEL[c]}`);
    const uniqueWords = [...new Set(contentCheck.matches.map(m => m.word))];
    console.log(`[敏感词] 私信被替换: ${uniqueWords.join(', ')} (${categoryNames.join('、')})`);
  }

  const id = 'msg_' + uuid().slice(0, 8);
  run(`INSERT INTO messages (id, item_id, from_user_id, to_user_id, content) VALUES (?, ?, ?, ?, ?)`,
    [id, item_id, from_user_id, to_user_id, sanitizedContent]);

  const created = getOne(
    `SELECT m.*, f.nickname as from_nickname, f.avatar as from_avatar, t.nickname as to_nickname, t.avatar as to_avatar, i.title as item_title
     FROM messages m
     JOIN users f ON m.from_user_id = f.id
     JOIN users t ON m.to_user_id = t.id
     JOIN items i ON m.item_id = i.id
     WHERE m.id = ?`,
    [id]
  );

  res.status(201).json({ data: created });
});

// PUT /api/messages/:id/read
messagesRouter.put('/:id/read', (req, res) => {
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录' });
  }
  // BUG-07: 检查当前用户是否是消息的收件人
  const msg = getOne('SELECT to_user_id FROM messages WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!msg) return res.status(404).json({ error: '消息不存在' });
  if (String(msg.to_user_id) !== authUserId) {
    return res.status(403).json({ error: '只能标记自己的消息为已读' });
  }
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
    // BUG-42: 查询真实未读数
    const unreadRow = getOne(
      'SELECT COUNT(*) as cnt FROM messages WHERE from_user_id = ? AND to_user_id = ? AND item_id = ? AND read = 0',
      [partnerId, user_id, typedRow.item_id]
    ) as Record<string, any> | null;
    acc.push({
      ...typedRow,
      partner_id: partnerId,
      item_images: resolveAssetUrls(JSON.parse(String(typedRow.item_images || '[]'))),
      unread: unreadRow?.cnt || 0,
    });
    return acc;
  }, []);

  res.json({ data: conversations });
});
