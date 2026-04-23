import { Router } from 'express';
import { getOne, query, run, uuid } from '../models/db';
import { resolveAssetUrls } from '../services/storage';
import { createCommunitySubmissionInFeishu } from '../services/feishuBase';

export const usersRouter = Router();

// GET /api/users/:id
usersRouter.get('/:id', (req, res) => {
  const user = getOne('SELECT * FROM users WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ data: { ...user, badge: JSON.parse(String(user.badge || '[]')), email: user.email || '' } });
});

// POST /api/users
usersRouter.post('/', (req, res) => {
  const { nickname, avatar, phone, community, district, lat, lng, openid, email, password_hash } = req.body;
  if (!nickname) return res.status(400).json({ error: '昵称必填' });

  if (openid) {
    const existing = getOne('SELECT * FROM users WHERE openid = ?', [openid]) as Record<string, any> | null;
    if (existing) return res.json({ data: { ...existing, badge: JSON.parse(String(existing.badge || '[]')), email: existing.email || '' }, isNew: false });
  }

  const id = 'user_' + uuid().slice(0, 8);
  run(`INSERT INTO users (id, nickname, avatar, phone, community, district, lat, lng, openid, email, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, nickname, avatar || '😊', phone || '', community || '', district || '', lat || null, lng || null, openid || null, email || null, password_hash || null]);

  const user = getOne('SELECT * FROM users WHERE id = ?', [id]) as Record<string, any> | null;
  if (!user) return res.status(500).json({ error: '用户创建失败' });
  res.status(201).json({ data: { ...user, badge: JSON.parse(String(user.badge || '[]')), email: user.email || '' }, isNew: true });
});

// PUT /api/users/:id
usersRouter.put('/:id', (req, res) => {
  const { nickname, avatar, phone, community, district, lat, lng, isCustomCommunity } = req.body;
  const fields: string[] = []; const params: unknown[] = [];
  if (nickname !== undefined) { fields.push('nickname = ?'); params.push(nickname); }
  if (avatar !== undefined) { fields.push('avatar = ?'); params.push(avatar); }
  if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
  if (community !== undefined) { fields.push('community = ?'); params.push(community); }
  if (district !== undefined) { fields.push('district = ?'); params.push(district); }
  if (lat !== undefined) { fields.push('lat = ?'); params.push(lat); }
  if (lng !== undefined) { fields.push('lng = ?'); params.push(lng); }
  if (!fields.length) return res.status(400).json({ error: '无更新字段' });

  params.push(req.params.id);
  run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  const user = getOne('SELECT * FROM users WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!user) return res.status(404).json({ error: '用户不存在' });

  // 用户提交自定义小区 → 异步写飞书审核表（不影响主流程）
  if (isCustomCommunity && community && district) {
    createCommunitySubmissionInFeishu({
      userId: req.params.id,
      userNickname: user.nickname,
      communityName: community,
      district,
    }).catch((err) => console.error('[Feishu] 提交小区补充申请失败:', err));
  }

  res.json({ data: { ...user, badge: JSON.parse(String(user.badge || '[]')) } });
});

// GET /api/users/:id/items
usersRouter.get('/:id/items', (req, res) => {
  const items = query('SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC', [req.params.id]);
  res.json({
    data: items.map((item) => {
      const typedItem = item as Record<string, any>;
      return {
        ...typedItem,
        images: resolveAssetUrls(JSON.parse(String(typedItem.images || '[]'))),
        tags: JSON.parse(String(typedItem.tags || '[]')),
      };
    }),
  });
});
