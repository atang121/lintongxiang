import { Router } from 'express';
import { getOne, query, run, uuid } from '../models/db';
import { getAuthUser, getAuthUserId } from '../lib/session';
import { requireServiceAgreement } from '../lib/compliance';
import { getOpsService } from '../services/ops';
import { resolveAssetUrls } from '../services/storage';
import { checkSensitiveText, CATEGORY_LABEL, CATEGORY_EMOJI, SensitiveCategory } from '../services/sensitiveWord';
import { publishLimiter } from '../middleware/rateLimit';

export const itemsRouter = Router();

const DEFAULT_PUBLISH_AGREEMENT_VERSION = '2026-05-04';

const PROTOCOL_BLOCKED_CATEGORIES = new Set<SensitiveCategory>([
  'food_medicine',
  'hygiene_risk',
  'safety_hazard',
  'counterfeit',
  'dangerous_goods',
  'payment_risk',
  'privacy',
]);

const PROTOCOL_BLOCKED_MESSAGES: Partial<Record<SensitiveCategory, string>> = {
  food_medicine: '平台不支持发布食品、药品、保健品或医疗器械类信息',
  hygiene_risk: '平台不支持发布贴身衣物、已使用母婴卫生用品等高卫生风险物品',
  safety_hazard: '平台不支持发布存在破损、变形、结构松动等安全隐患的儿童用品',
  counterfeit: '平台不支持发布盗版、侵权、仿冒或来源不明的物品',
  dangerous_goods: '平台不支持发布管制刀具、易燃易爆、有毒有害等危险物品',
  payment_risk: '发布内容中不要要求定金、预付款、保证金或引导私下转账',
  privacy: '发布内容中不要公开手机号、详细住址、孩子姓名、学校班级等敏感隐私',
};

const LIVE_ANIMAL_SAFE_CONTEXT_RE = /(绘本|童书|读物|故事书|漫画|玩具|玩偶|积木|拼图|贴纸|模型|卡片|图案|衣服|童装)/;
const LIVE_ANIMAL_TRADE_CONTEXT_RE = /(宠物|活物|活体|领养|送养|转让|出售|交易|免费送|找主人|找领养|小动物|幼崽|鱼苗|龟苗|繁殖)/;
const LIVE_ANIMAL_STRONG_RE = /(宠物|活物|活体|领养|送养|小猫|猫咪|小狗|狗狗|仓鼠|鹦鹉|兔子|乌龟|金鱼|观赏鱼|爬宠|蜥蜴|鱼苗|龟苗)/;
const LIVE_ANIMAL_EVASION_RE = /(小伙伴|不养了|养不了|没人养|找人养|谁喜欢|名字叫|会说话|鸟笼|笼子|皮蛋)/;

// BUG-37/25: 转义 LIKE 通配符，防止 SQL 注入
function escapeLike(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function rejectForbiddenLiveAnimalContent(input: {
  title: unknown;
  description: unknown;
  tags?: unknown;
}) {
  const tagText = Array.isArray(input.tags) ? input.tags.join(' ') : '';
  const rawText = `${String(input.title || '')}\n${String(input.description || '')}\n${tagText}`;
  const check = checkSensitiveText(rawText);
  const liveMatches = check.matches.filter((m) => m.category === 'live_animal');
  if (liveMatches.length === 0) return null;
  const compactText = rawText.replace(/\s+/g, '');
  const hasTradeContext = LIVE_ANIMAL_TRADE_CONTEXT_RE.test(compactText);
  const hasStrongLiveAnimalTerm = LIVE_ANIMAL_STRONG_RE.test(compactText);
  const hasEvasionContext = LIVE_ANIMAL_EVASION_RE.test(compactText) && /(不养|养不了|谁喜欢|名字叫|笼|小伙伴)/.test(compactText);
  const onlySafeContext = LIVE_ANIMAL_SAFE_CONTEXT_RE.test(compactText) && !hasTradeContext;
  if (onlySafeContext) return null;
  if (!hasTradeContext && !hasStrongLiveAnimalTerm && !hasEvasionContext) return null;

  return {
    error: '平台禁止发布宠物、活体动物及相关领养、赠送、交易信息',
    code: 'LIVE_ANIMAL_FORBIDDEN',
    sensitive_words: [...new Set(check.matches.filter((m) => m.category === 'live_animal').map((m) => m.word))],
  };
}

function rejectProtocolForbiddenContent(input: {
  title: unknown;
  description: unknown;
  tags?: unknown;
}) {
  const tagText = Array.isArray(input.tags) ? input.tags.join(' ') : '';
  const check = checkSensitiveText(`${String(input.title || '')}\n${String(input.description || '')}\n${tagText}`);
  const blockedMatch = check.matches.find((match) => PROTOCOL_BLOCKED_CATEGORIES.has(match.category));
  if (!blockedMatch) return null;

  return {
    error: PROTOCOL_BLOCKED_MESSAGES[blockedMatch.category] || '发布内容包含平台协议禁止或限制发布的信息',
    code: 'PROTOCOL_FORBIDDEN',
    category: blockedMatch.category,
    category_label: `${CATEGORY_EMOJI[blockedMatch.category]}${CATEGORY_LABEL[blockedMatch.category]}`,
    sensitive_words: [...new Set(check.matches.filter((m) => m.category === blockedMatch.category).map((m) => m.word))],
  };
}

function sanitizePublishText(text: string) {
  const check = checkSensitiveText(text);
  const filteredMatches = check.matches.filter((match) => match.category !== 'live_animal');
  if (filteredMatches.length === 0) {
    return { ...check, hasSensitive: false, matches: [], categories: new Set<SensitiveCategory>(), sanitizedText: text };
  }

  let sanitizedText = text;
  for (let index = filteredMatches.length - 1; index >= 0; index--) {
    const match = filteredMatches[index];
    sanitizedText = sanitizedText.slice(0, match.position) + '*'.repeat(match.word.length) + sanitizedText.slice(match.position + match.word.length);
  }

  return {
    hasSensitive: true,
    matches: filteredMatches,
    categories: new Set(filteredMatches.map((match) => match.category)),
    sanitizedText,
  };
}

// GET /api/items
itemsRouter.get('/', (req, res) => {
  const { category, age_range, exchange_mode, status } = req.query;
  const auth = getAuthUser(req.headers.authorization);

  let sql = `SELECT i.*, u.nickname as owner_name, u.avatar as owner_avatar, u.community as owner_community, u.credit_score as owner_credit, u.badge as owner_badges
    FROM items i JOIN users u ON i.user_id = u.id WHERE 1 = 1`;
  const params: unknown[] = [];

  if (status && (status === 'available' || auth?.isAdmin)) {
    sql += ' AND i.status = ?';
    params.push(status);
  } else if (!auth?.isAdmin) {
    sql += " AND i.status = 'available'";
  }
  if (category) { sql += ' AND i.category = ?'; params.push(category); }
  if (age_range) { sql += ' AND i.age_range = ?'; params.push(age_range); }
  if (exchange_mode) { sql += ' AND i.exchange_mode = ?'; params.push(exchange_mode); }
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

  res.json({ data: items, total: items.length });
});

// POST /api/items
itemsRouter.post('/', publishLimiter, async (req, res) => {
  const {
    user_id,
    title,
    description,
    images,
    category,
    age_range,
    exchange_mode,
    price,
    price_negotiable,
    condition,
    tags,
    community,
    district,
    lat,
    lng,
    listing_type,
    agreement_confirmed,
    agreement_version,
  } = req.body;
  const normalizedListingType = listing_type === 'wanted' ? 'wanted' : 'offer';
  const normalizedPriceNegotiable = price_negotiable === 'fixed' || price_negotiable === 'negotiable'
    ? price_negotiable
    : '';
  const imageList = Array.isArray(images) ? images : [];

  if (!user_id || !title || !description) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  if (normalizedListingType !== 'wanted' && imageList.length === 0) {
    return res.status(400).json({ error: '闲置发布至少上传 1 张图片' });
  }
  if (agreement_confirmed !== true) {
    return res.status(400).json({ error: '请先阅读并同意《用户服务协议》' });
  }
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录后再发布' });
  }
  if (authUserId !== String(user_id)) {
    return res.status(403).json({ error: '当前登录身份无法发布该物品' });
  }
  const serviceAgreementError = requireServiceAgreement(authUserId);
  if (serviceAgreementError) {
    return res.status(428).json(serviceAgreementError);
  }

  const liveAnimalError = rejectForbiddenLiveAnimalContent({ title, description, tags });
  if (liveAnimalError) {
    return res.status(422).json(liveAnimalError);
  }
  const protocolForbiddenError = rejectProtocolForbiddenContent({ title, description, tags });
  if (protocolForbiddenError) {
    return res.status(422).json(protocolForbiddenError);
  }

  // 检查用户状态
  const publisher = getOne('SELECT status FROM users WHERE id = ?', [authUserId]) as Record<string, any> | null;
  const publisherStatus = publisher?.status || 'active';
  if (publisherStatus === 'muted') {
    return res.status(403).json({ error: '你的账号已被禁言，无法发布物品，如有疑问请联系管理员' });
  }
  if (publisherStatus === 'deactivated') {
    return res.status(403).json({ error: '该账号已被注销，无法发布物品' });
  }

  // 敏感词过滤 — 替换放行策略：将敏感词替换为 *** 后存入数据库
  const titleCheck = sanitizePublishText(String(title));
  const descCheck = sanitizePublishText(String(description));
  const sanitizedTitle = titleCheck.sanitizedText;
  const sanitizedDescription = descCheck.sanitizedText;
  if (titleCheck.hasSensitive || descCheck.hasSensitive) {
    const allCategories = new Set([...titleCheck.categories, ...descCheck.categories]);
    const categoryNames = Array.from(allCategories).map(c => `${CATEGORY_EMOJI[c]}${CATEGORY_LABEL[c]}`);
    const matchedWords = [...titleCheck.matches, ...descCheck.matches].map(m => m.word);
    const uniqueWords = [...new Set(matchedWords)];
    console.log(`[敏感词] 物品发布被替换: ${uniqueWords.join(', ')} (${categoryNames.join('、')})`);
  }

  const id = 'item_' + uuid().slice(0, 8);
  run(`INSERT INTO items (id, user_id, title, description, images, category, age_range, exchange_mode, price, price_negotiable, condition, tags, community, district, lat, lng, listing_type, agreement_confirmed, agreement_version, agreement_confirmed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      user_id,
      sanitizedTitle,
      sanitizedDescription,
      JSON.stringify(imageList),
      category,
      age_range,
      exchange_mode,
      price || null,
      normalizedPriceNegotiable,
      condition || '正常使用',
      JSON.stringify(tags || []),
      community || '',
      district || '',
      lat || null,
      lng || null,
      normalizedListingType,
      1,
      String(agreement_version || DEFAULT_PUBLISH_AGREEMENT_VERSION).slice(0, 32),
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

// PUT /api/items/:id — 发布者编辑后重新发布
itemsRouter.put('/:id', publishLimiter, async (req, res) => {
  const auth = getAuthUser(req.headers.authorization);
  if (!auth) {
    return res.status(401).json({ error: '请先登录后再编辑' });
  }

  const existing = getOne('SELECT * FROM items WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!existing) return res.status(404).json({ error: '物品不存在' });
  if (!auth.isAdmin && String(existing.user_id) !== auth.userId) {
    return res.status(403).json({ error: '只能编辑自己发布的物品' });
  }
  const serviceAgreementError = requireServiceAgreement(auth.userId);
  if (serviceAgreementError) {
    return res.status(428).json(serviceAgreementError);
  }

  const {
    title,
    description,
    images,
    category,
    age_range,
    exchange_mode,
    price,
    price_negotiable,
    condition,
    tags,
    community,
    district,
    lat,
    lng,
    listing_type,
    agreement_confirmed,
    agreement_version,
  } = req.body;

  const normalizedListingType = listing_type === 'wanted' ? 'wanted' : 'offer';
  const imageList = Array.isArray(images) ? images : [];
  const normalizedPriceNegotiable = price_negotiable === 'fixed' || price_negotiable === 'negotiable'
    ? price_negotiable
    : '';

  if (!title || !description) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  if (normalizedListingType !== 'wanted' && imageList.length === 0) {
    return res.status(400).json({ error: '闲置发布至少上传 1 张图片' });
  }
  if (agreement_confirmed !== true) {
    return res.status(400).json({ error: '请先阅读并同意用户发布协议和交易安全须知' });
  }

  const liveAnimalError = rejectForbiddenLiveAnimalContent({ title, description, tags });
  if (liveAnimalError) {
    return res.status(422).json(liveAnimalError);
  }

  const titleCheck = checkSensitiveText(String(title));
  const descCheck = checkSensitiveText(String(description));
  const sanitizedTitle = titleCheck.sanitizedText;
  const sanitizedDescription = descCheck.sanitizedText;

  run(
    `UPDATE items
     SET title = ?, description = ?, images = ?, category = ?, age_range = ?, exchange_mode = ?,
         price = ?, price_negotiable = ?, condition = ?, tags = ?, community = ?, district = ?,
         lat = ?, lng = ?, listing_type = ?, status = 'available',
         agreement_confirmed = 1, agreement_version = ?, agreement_confirmed_at = datetime('now')
     WHERE id = ?`,
    [
      sanitizedTitle,
      sanitizedDescription,
      JSON.stringify(imageList),
      category,
      age_range,
      exchange_mode,
      price || null,
      normalizedPriceNegotiable,
      condition || '正常使用',
      JSON.stringify(tags || []),
      community || '',
      district || '',
      lat || null,
      lng || null,
      normalizedListingType,
      String(agreement_version || DEFAULT_PUBLISH_AGREEMENT_VERSION).slice(0, 32),
      req.params.id,
    ]
  );

  const item = getOne('SELECT * FROM items WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!item) return res.status(500).json({ error: '物品更新失败' });

  res.json({
    data: {
      ...item,
      images: resolveAssetUrls(JSON.parse(String(item.images || '[]'))),
      tags: JSON.parse(String(item.tags || '[]')),
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
  const reason = String(req.body?.reason || '').trim();
  if (auth.isAdmin && !reason) {
    return res.status(400).json({ error: '管理员删除内容时必须填写删除原因' });
  }

  const deleteReason = auth.isAdmin ? reason.slice(0, 240) : '发布者主动下架';
  run("UPDATE items SET status = 'deleted', delete_reason = ?, deleted_by = ?, deleted_at = datetime('now') WHERE id = ?", [
    deleteReason,
    auth.userId,
    req.params.id,
  ]);
  if (auth.isAdmin && String(item.user_id) !== auth.userId) {
    run(
      `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
       VALUES (?, ?, 'handling', ?, ?, ?, 0)`,
      [
        `notif_${uuid().slice(0, 8)}`,
        item.user_id,
        '发布内容已被删除',
        `你发布的「${item.title}」已被管理员删除。原因：${deleteReason}`,
        req.params.id,
      ]
    );
  }
  res.json({ data: 'ok' });
});

// PUT /api/items/:id/relist — 发布者重新上架
itemsRouter.put('/:id/relist', (req, res) => {
  const auth = getAuthUser(req.headers.authorization);
  if (!auth) {
    return res.status(401).json({ error: '请先登录后再重新发布' });
  }
  const item = getOne('SELECT * FROM items WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!item) return res.status(404).json({ error: '物品不存在' });
  if (!auth.isAdmin && String(item.user_id) !== auth.userId) {
    return res.status(403).json({ error: '只能重新发布自己下架的物品' });
  }
  const deleteReason = String(item.delete_reason || '').trim();
  const wasPublisherDeleted =
    deleteReason === '发布者主动下架'
    || String(item.deleted_by || '') === auth.userId
    || (!deleteReason && !String(item.deleted_by || '').trim());
  if (!auth.isAdmin && !wasPublisherDeleted) {
    return res.status(403).json({ error: '该内容由平台下架，需联系管理员处理后才能重新发布' });
  }
  run("UPDATE items SET status = 'available', delete_reason = '', deleted_by = '', deleted_at = '' WHERE id = ?", [req.params.id]);
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
    const escapedKeyword = escapeLike(String(keyword));
    sql += ' AND (i.title LIKE ? ESCAPE \'\\\' OR u.nickname LIKE ? ESCAPE \'\\\')';
    params.push(`%${escapedKeyword}%`, `%${escapedKeyword}%`);
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

// GET /api/items/:id
itemsRouter.get('/:id', (req, res) => {
  const row = getOne(`SELECT i.*, u.nickname as owner_name, u.avatar as owner_avatar, u.community as owner_community, u.credit_score as owner_credit
    FROM items i JOIN users u ON i.user_id = u.id WHERE i.id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: '物品不存在' });
  const typedRow = row as Record<string, any>;
  const auth = getAuthUser(req.headers.authorization);
  if (String(typedRow.status) === 'deleted' && !auth?.isAdmin && String(typedRow.user_id) !== auth?.userId) {
    return res.status(404).json({ error: '物品不存在' });
  }

  run('UPDATE items SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

  res.json({
    data: {
      ...typedRow,
      images: resolveAssetUrls(JSON.parse(String(typedRow.images || '[]'))),
      tags: JSON.parse(String(typedRow.tags || '[]')),
    },
  });
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
