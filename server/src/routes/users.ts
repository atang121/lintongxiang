import { Router } from 'express';
import { getOne, query, run, uuid } from '../models/db';
import { getAuthUser, getAuthUserId } from '../lib/session';
import { resolveAssetUrls } from '../services/storage';

export const usersRouter = Router();

const VALID_CHILD_AGE_RANGES = ['0-3', '3-6', '6-12', '12-18'];

function normalizeChildAgeRanges(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry))
    .filter((entry, index, array) => VALID_CHILD_AGE_RANGES.includes(entry) && array.indexOf(entry) === index);
}

function normalizeChildCount(value: unknown) {
  return Math.max(0, Math.min(10, Number(value) || 0));
}

function toPublicUser(user: Record<string, any>) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    community: user.community || '',
    district: user.district || '',
    bio: user.bio || '',
    credit_score: user.credit_score,
    exchange_count: user.exchange_count,
    is_liaison: user.is_liaison,
    badge: JSON.parse(String(user.badge || '[]')),
    created_at: user.created_at,
  };
}

// GET /api/users/:id
usersRouter.get('/:id', (req, res) => {
  const user = getOne('SELECT * FROM users WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ data: toPublicUser(user) });
});

// POST /api/users — 需要认证（仅用于微信登录内部创建用户）
usersRouter.post('/', (req, res) => {
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录' });
  }
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

// PUT /api/users/:id — 需要认证且只能修改自己的资料
usersRouter.put('/:id', (req, res) => {
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录' });
  }
  if (authUserId !== req.params.id) {
    return res.status(403).json({ error: '只能修改自己的资料' });
  }
  const { nickname, avatar, community, district, lat, lng, child_age_ranges, child_count } = req.body;
  const fields: string[] = []; const params: unknown[] = [];
  if (nickname !== undefined) { fields.push('nickname = ?'); params.push(nickname); }
  if (avatar !== undefined) { fields.push('avatar = ?'); params.push(avatar); }
  if (community !== undefined) { fields.push('community = ?'); params.push(community); }
  if (district !== undefined) { fields.push('district = ?'); params.push(district); }
  if (lat !== undefined) { fields.push('lat = ?'); params.push(lat); }
  if (lng !== undefined) { fields.push('lng = ?'); params.push(lng); }
  if (child_age_ranges !== undefined) { fields.push('child_age_ranges = ?'); params.push(JSON.stringify(normalizeChildAgeRanges(child_age_ranges))); }
  if (child_count !== undefined) { fields.push('child_count = ?'); params.push(normalizeChildCount(child_count)); }
  if (!fields.length) return res.status(400).json({ error: '无更新字段' });

  params.push(req.params.id);
  run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  const user = getOne('SELECT * FROM users WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ data: { ...user, badge: JSON.parse(String(user.badge || '[]')) } });
});

// DELETE /api/users/:id — 用户主动注销账号（软注销，保留必要审计记录）
usersRouter.delete('/:id', (req, res) => {
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录' });
  }
  if (authUserId !== req.params.id) {
    return res.status(403).json({ error: '只能注销自己的账号' });
  }

  const user = getOne('SELECT id, status FROM users WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (String(user.status || 'active') === 'deactivated') {
    return res.json({ data: { ok: true, status: 'deactivated' } });
  }

  const reason = String(req.body?.reason || '用户主动注销').trim().slice(0, 120) || '用户主动注销';
  run(
    'UPDATE users SET status = ?, status_reason = ?, status_updated_at = datetime(\'now\') WHERE id = ?',
    ['deactivated', reason, req.params.id]
  );
  run(
    "UPDATE items SET status = 'deleted', delete_reason = ?, deleted_by = ?, deleted_at = datetime('now') WHERE user_id = ? AND status IN ('available', 'pending')",
    ['用户注销账号，系统自动下架', req.params.id, req.params.id]
  );

  res.json({ data: { ok: true, status: 'deactivated' } });
});

// GET /api/users/:id/items
usersRouter.get('/:id/items', (req, res) => {
  const auth = getAuthUser(req.headers.authorization);
  if (!auth) {
    return res.status(401).json({ error: '请先登录' });
  }
  if (!auth.isAdmin && auth.userId !== req.params.id) {
    return res.status(403).json({ error: '只能查看自己的发布' });
  }

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
