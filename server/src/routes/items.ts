import { Router } from 'express';
import { getOne, query, run, uuid } from '../models/db';
import { getAuthUser, getAuthUserId } from '../lib/session';
import { getOpsService } from '../services/ops';
import { resolveAssetUrls } from '../services/storage';

export const itemsRouter = Router();

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/items
itemsRouter.get('/', (req, res) => {
  const { category, age_range, exchange_mode, lat, lng, radius = 5, status, listing_type, community } = req.query;

  let sql = `SELECT i.*, u.nickname as owner_name, u.avatar as owner_avatar, u.community as owner_community, u.credit_score as owner_credit, u.badge as owner_badges
    FROM items i JOIN users u ON i.user_id = u.id WHERE 1 = 1`;
  const params: unknown[] = [];

  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  if (category) { sql += ' AND i.category = ?'; params.push(category); }
  if (age_range) { sql += ' AND i.age_range = ?'; params.push(age_range); }
  if (exchange_mode) { sql += ' AND i.exchange_mode = ?'; params.push(exchange_mode); }
  if (listing_type) { sql += ' AND i.listing_type = ?'; params.push(listing_type); }

  // 小区名模糊匹配（容忍微小差异，如"民发盛特区"vs"民发盛特区(东津新区)"）
  if (community) {
    sql += ' AND LOWER(i.community) LIKE LOWER(?)';
    params.push(`%${String(community)}%`);
  }

  sql += ' ORDER BY i.created_at DESC LIMIT 120';

  let items: Array<Record<string, any>> = query(sql, params).map((row) => {
    const typedRow = row as Record<string, any>;
    return {
      ...typedRow,
      images: resolveAssetUrls(JSON.parse(String(typedRow.images || '[]'))),
      tags: JSON.parse(String(typedRow.tags || '[]')),
      owner_badges: JSON.parse(String(typedRow.owner_badges || '[]')),
    };
  });

  // offer 和 wanted 统一距离过滤（默认 5km，避免位置不精确时误差太大）
  // wanted 物品也参与距离过滤，不再仅靠社区名称匹配
  if (lat && lng) {
    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    // 后端固定用 5km 兜底，前端页面显示 3km/5km/10km 由用户选择
    const radiusKm = parseFloat(radius as string) || 5;
    const effectiveRadius = Math.max(radiusKm, 5);
    items = items
      .map((item) => ({
        ...(item as Record<string, any>),
        distance: getDistance(userLat, userLng, Number(item.lat), Number(item.lng)),
      }))
      .filter((item: any) => {
        if (!item.lat || !item.lng) return true;
        return item.distance <= effectiveRadius;
      })
      .sort((a: any, b: any) => {
        if (a.lat && a.lng && (!b.lat || !b.lng)) return -1;
        if ((!a.lat || !a.lng) && b.lat && b.lng) return 1;
        return (a.distance || 999) - (b.distance || 999);
      });
  }

  res.json({ data: items, total: items.length });
});

// GET /api/items/:id
itemsRouter.get('/:id', (req, res) => {
  const row = getOne(`SELECT i.*, u.nickname as owner_name, u.avatar as owner_avatar, u.community as owner_community, u.credit_score as owner_credit
    FROM items i JOIN users u ON i.user_id = u.id WHERE i.id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: '物品不存在' });
  const typedRow = row as Record<string, any>;

  run('UPDATE items SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

  res.json({
    data: {
      ...typedRow,
      images: resolveAssetUrls(JSON.parse(String(typedRow.images || '[]'))),
      tags: JSON.parse(String(typedRow.tags || '[]')),
    },
  });
});

// POST /api/items/:id/like — 点赞/取消点赞
itemsRouter.post('/:id/like', (req, res) => {
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录' });
  }

  const itemId = req.params.id;
  const item = getOne('SELECT * FROM items WHERE id = ?', [itemId]);
  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  // 检查是否已点赞
  const existing = getOne('SELECT id FROM favorites WHERE user_id = ? AND item_id = ?', [authUserId, itemId]);

  let liked: boolean;
  if (existing) {
    // 取消点赞
    run('DELETE FROM favorites WHERE user_id = ? AND item_id = ?', [authUserId, itemId]);
    run('UPDATE items SET favorite_count = MAX(0, favorite_count - 1) WHERE id = ?', [itemId]);
    liked = false;
  } else {
    // 点赞
    const favId = 'fav_' + uuid().slice(0, 8);
    run('INSERT OR IGNORE INTO favorites (id, user_id, item_id) VALUES (?, ?, ?)', [favId, authUserId, itemId]);
    run('UPDATE items SET favorite_count = favorite_count + 1 WHERE id = ?', [itemId]);
    liked = true;
  }

  const updated = getOne('SELECT favorite_count FROM items WHERE id = ?', [itemId]) as { favorite_count: number } | null;
  res.json({ data: { liked, favoriteCount: updated?.favorite_count ?? 0 } });
});

// GET /api/items/:id/like — 获取当前用户是否已点赞
itemsRouter.get('/:id/like', (req, res) => {
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.json({ data: { liked: false, favoriteCount: 0 } });
  }

  const itemId = req.params.id;
  const existing = getOne('SELECT id FROM favorites WHERE user_id = ? AND item_id = ?', [authUserId, itemId]);
  const item = getOne('SELECT favorite_count FROM items WHERE id = ?', [itemId]) as { favorite_count: number } | null;

  res.json({
    data: {
      liked: !!existing,
      favoriteCount: item?.favorite_count ?? 0,
    },
  });
});

// POST /api/items
itemsRouter.post('/', async (req, res) => {
  const {
    user_id,
    title,
    description,
    images,
    category,
    age_range,
    exchange_mode,
    price,
    condition,
    tags,
    community,
    district,
    lat,
    lng,
    listing_type,
  } = req.body;
  const normalizedListingType = listing_type === 'wanted' ? 'wanted' : 'offer';
  const imageList = Array.isArray(images) ? images : [];

  if (!user_id || !title || !description) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  if (normalizedListingType !== 'wanted' && imageList.length === 0) {
    return res.status(400).json({ error: '闲置发布至少上传 1 张图片' });
  }
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录后再发布' });
  }
  if (authUserId !== String(user_id)) {
    return res.status(403).json({ error: '当前登录身份无法发布该物品' });
  }
  const id = 'item_' + uuid().slice(0, 8);
  run(`INSERT INTO items (id, user_id, title, description, images, category, age_range, exchange_mode, price, condition, tags, community, district, lat, lng, listing_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      user_id,
      title,
      description,
      JSON.stringify(imageList),
      category,
      age_range,
      exchange_mode,
      price || null,
      condition || '正常使用',
      JSON.stringify(tags || []),
      community || '',
      district || '',
      lat || null,
      lng || null,
      normalizedListingType,
    ]);

  const item = getOne('SELECT * FROM items WHERE id = ?', [id]) as Record<string, any> | null;
  if (!item) return res.status(500).json({ error: '物品创建失败' });

  let reviewReceipt = { provider: 'local', status: 'submitted' };
  const owner = getOne('SELECT nickname, community FROM users WHERE id = ?', [user_id]) as Record<string, any> | null;
  try {
    reviewReceipt = await getOpsService().submitPublishReview({
      itemId: id,
      title: String(title),
      ownerId: String(user_id),
      ownerNickname: String(owner?.nickname || ''),
      community: String(community || owner?.community || ''),
      coverImage: imageList.length > 0 ? String(imageList[0]) : '',
    });
  } catch (error) {
    console.error('submit review failed:', error);
  }

  res.status(201).json({
    data: {
      ...item,
      images: resolveAssetUrls(JSON.parse(String(item.images || '[]'))),
      tags: JSON.parse(String(item.tags || '[]')),
      ops_review: reviewReceipt,
    },
  });
});

// DELETE /api/items/:id  (owner or admin)
itemsRouter.delete('/:id', (req, res) => {
  const auth = getAuthUser(req.headers.authorization);
  if (!auth) {
    return res.status(401).json({ error: '请先登录后再操作' });
  }

  const item = getOne('SELECT * FROM items WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }
  if (!auth.isAdmin && String(item.user_id) !== auth.userId) {
    return res.status(403).json({ error: '只能下架自己发布的物品' });
  }
  run("UPDATE items SET status = 'deleted' WHERE id = ?", [req.params.id]);
  res.json({ data: 'ok' });
});

// GET /api/items/admin/all  — 管理员获取全量物品（含已删除）
itemsRouter.get('/admin/all', (req, res) => {
  const auth = getAuthUser(req.headers.authorization);
  if (!auth?.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const { keyword, status } = req.query;
  let sql = `SELECT i.*, u.nickname as owner_name, u.community as owner_community
    FROM items i JOIN users u ON i.user_id = u.id WHERE 1=1`;
  const params: unknown[] = [];

  if (status && status !== 'all') { sql += ' AND i.status = ?'; params.push(status); }
  if (keyword) {
    sql += ' AND (i.title LIKE ? OR u.nickname LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY i.created_at DESC LIMIT 300';

  const items = query(sql, params).map((row) => {
    const r = row as Record<string, any>;
    return {
      ...r,
      images: JSON.parse(String(r.images || '[]')),
      tags: JSON.parse(String(r.tags || '[]')),
    };
  });

  res.json({ data: items, total: items.length });
});

// PUT /api/items/:id/restore  — 管理员恢复已删除物品
itemsRouter.put('/:id/restore', (req, res) => {
  const auth = getAuthUser(req.headers.authorization);
  if (!auth?.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  const item = getOne('SELECT id FROM items WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ error: '物品不存在' });
  run("UPDATE items SET status = 'available' WHERE id = ?", [req.params.id]);
  res.json({ data: 'ok' });
});
