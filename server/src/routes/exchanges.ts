import { Router, Response } from 'express';

import { getOne, query, run, uuid } from '../models/db';
import { getAuthUserId, getAuthUser } from '../lib/session';
import { requireServiceAgreement } from '../lib/compliance';
import { checkSensitiveText } from '../services/sensitiveWord';

/** 检查用户状态，muted/deactivated 返回错误响应 */
function checkUserStatus(user: Record<string, any> | null, res: Response, action: string): boolean {
  const status = user?.status || 'active';
  if (status === 'muted') {
    res.status(403).json({ error: `你的账号已被禁言，无法${action}，如有疑问请联系管理员` });
    return false;
  }
  if (status === 'deactivated') {
    res.status(403).json({ error: `该账号已被注销，无法${action}` });
    return false;
  }
  return true;
}

export const exchangesRouter = Router();

const QUEUE_ACTIVE_HOURS = Math.max(1, Number(process.env.EXCHANGE_ACTIVE_HOURS || 48));

function toSqlTime(date: Date) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function nowSql() {
  return toSqlTime(new Date());
}

function nextActiveUntil() {
  return toSqlTime(new Date(Date.now() + QUEUE_ACTIVE_HOURS * 60 * 60 * 1000));
}

function getQueuePosition(itemId: string) {
  const row = getOne(
    "SELECT COUNT(*) as count FROM exchanges WHERE item_id = ? AND status IN ('pending', 'waiting')",
    [itemId]
  ) as Record<string, any> | null;
  return Number(row?.count || 0) + 1;
}

function reindexWaitingQueue(itemId: string) {
  const rows = query(
    "SELECT id FROM exchanges WHERE item_id = ? AND status = 'waiting' ORDER BY queue_position ASC, created_at ASC",
    [itemId]
  ) as Record<string, any>[];

  rows.forEach((row, index) => {
    run('UPDATE exchanges SET queue_position = ?, updated_at = ? WHERE id = ?', [index + 2, nowSql(), row.id]);
  });
}

function notify(userId: string, type: string, title: string, content: string, itemId: string) {
  run(
    `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [`notif_${uuid().slice(0, 8)}`, userId, type, title, content, itemId]
  );
}

function promoteNextWaiting(itemId: string) {
  const next = getOne(
    "SELECT * FROM exchanges WHERE item_id = ? AND status = 'waiting' ORDER BY queue_position ASC, created_at ASC LIMIT 1",
    [itemId]
  ) as Record<string, any> | null;

  if (!next) {
    run("UPDATE items SET status = 'available' WHERE id = ? AND status != 'completed'", [itemId]);
    return null;
  }

  const now = nowSql();
  const activeUntil = nextActiveUntil();
  run(
    `UPDATE exchanges
     SET status = 'pending', queue_position = 1, active_until = ?, promoted_at = ?, reminder_sent_at = ?, updated_at = ?
     WHERE id = ?`,
    [activeUntil, now, now, now, next.id]
  );
  run("UPDATE items SET status = 'pending' WHERE id = ?", [itemId]);
  notify(
    String(next.requester_id),
    'exchange',
    '轮到你预约了',
    `前一位邻居已释放预约，已为你锁定 ${QUEUE_ACTIVE_HOURS} 小时，请尽快和发布者确认交接。`,
    itemId
  );
  notify(
    String(next.owner_id),
    'exchange',
    '候补已自动顺延',
    '前一位预约已释放，系统已把下一位候补转为当前预约。',
    itemId
  );
  reindexWaitingQueue(itemId);

  return getOne('SELECT * FROM exchanges WHERE id = ?', [next.id]);
}

function expireStalePendingExchanges() {
  const now = nowSql();
  const rows = query(
    "SELECT * FROM exchanges WHERE status = 'pending' AND active_until != '' AND active_until < ? ORDER BY active_until ASC",
    [now]
  ) as Record<string, any>[];
  let promoted = 0;

  rows.forEach((exchange) => {
    const stillPending = getOne(
      "SELECT id FROM exchanges WHERE id = ? AND status = 'pending'",
      [exchange.id]
    );
    if (!stillPending) return;

    run(
      "UPDATE exchanges SET status = 'expired', expired_at = ?, updated_at = ? WHERE id = ?",
      [now, now, exchange.id]
    );
    notify(
      String(exchange.requester_id),
      'exchange',
      '预约已超时释放',
      '你锁定的预约已超时，物品将顺延给下一位候补邻居。',
      String(exchange.item_id)
    );
    if (promoteNextWaiting(String(exchange.item_id))) {
      promoted += 1;
    }
  });

  return { expired: rows.length, promoted };
}

exchangesRouter.get('/', (req, res) => {
  expireStalePendingExchanges();

  const { item_id, user_id, status } = req.query;
  if (!item_id && !user_id) {
    return res.status(400).json({ error: 'item_id 或 user_id 必填' });
  }
  const auth = getAuthUser(req.headers.authorization);
  if (!auth) {
    return res.status(401).json({ error: '请先登录后查看预约' });
  }
  if (user_id && String(user_id) !== auth.userId && !auth.isAdmin) {
    return res.status(403).json({ error: '当前登录身份无法查看这些预约' });
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

  sql += ` ORDER BY
    CASE status WHEN 'pending' THEN 0 WHEN 'waiting' THEN 1 WHEN 'completed' THEN 2 WHEN 'cancelled' THEN 3 WHEN 'failed' THEN 4 WHEN 'expired' THEN 5 ELSE 6 END,
    queue_position ASC,
    created_at DESC
    LIMIT 20`;

  let rows = query(sql, params) as Record<string, any>[];
  if (!auth.isAdmin) {
    rows = rows.filter((row) =>
      String(row.requester_id) === auth.userId || String(row.owner_id) === auth.userId
    );
  }
  if (item_id && !user_id) {
    if (rows.length === 0) {
      const existing = getOne('SELECT requester_id, owner_id FROM exchanges WHERE item_id = ? LIMIT 1', [item_id]) as Record<string, any> | null;
      if (existing && !auth.isAdmin) {
        return res.status(403).json({ error: '当前登录身份无法查看这次预约' });
      }
    }
    return res.json({ data: rows[0] || null });
  }
  res.json({ data: rows });
});

exchangesRouter.post('/expire-stale', (req, res) => {
  const auth = getAuthUser(req.headers.authorization);
  if (!auth) {
    return res.status(401).json({ error: '请先登录后处理超时预约' });
  }

  res.json({ data: expireStalePendingExchanges() });
});

exchangesRouter.post('/', (req, res) => {
  try {
  expireStalePendingExchanges();

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
  const serviceAgreementError = requireServiceAgreement(authUserId);
  if (serviceAgreementError) {
    return res.status(428).json(serviceAgreementError);
  }
  // BUG-03: 不允许自己和自己交换
  if (String(requester_id) === String(owner_id)) {
    return res.status(400).json({ error: '不能和自己发起交换' });
  }

  // 检查用户状态
  const requesterUser = getOne('SELECT status FROM users WHERE id = ?', [authUserId]) as Record<string, any> | null;
  if (!checkUserStatus(requesterUser, res, '发起预约')) return;

  const item = getOne('SELECT * FROM items WHERE id = ?', [item_id]) as Record<string, any> | null;
  if (!item) return res.status(404).json({ error: '物品不存在' });
  if (String(item.user_id) !== String(owner_id)) {
    return res.status(400).json({ error: '物品归属信息不一致，请刷新后重试' });
  }
  if (!['available', 'pending'].includes(String(item.status))) {
    return res.status(400).json({ error: '该物品当前不可预约' });
  }
  const existing = getOne(
    "SELECT * FROM exchanges WHERE item_id = ? AND requester_id = ? AND status IN ('pending', 'waiting') ORDER BY created_at DESC LIMIT 1",
    [item_id, requester_id]
  ) as Record<string, any> | null;
  if (existing) {
    return res.status(200).json({ data: existing });
  }

  // 敏感词过滤 — 替换放行策略：将预约留言中的敏感词替换为 ***
  const rawMessage = message || '想预约这件物品';
  const messageCheck = checkSensitiveText(String(rawMessage));
  const sanitizedMessage = messageCheck.sanitizedText;
  if (messageCheck.hasSensitive) {
    console.log(`[敏感词] 预约留言被替换: ${messageCheck.matches.map(m => m.word).join(', ')}`);
  }

  const id = `exchange_${uuid().slice(0, 8)}`;
  const activeExchange = getOne(
    "SELECT * FROM exchanges WHERE item_id = ? AND status = 'pending' ORDER BY queue_position ASC, created_at ASC LIMIT 1",
    [item_id]
  ) as Record<string, any> | null;
  const status = activeExchange ? 'waiting' : 'pending';
  const queuePosition = status === 'pending' ? 1 : getQueuePosition(String(item_id));
  const activeUntil = status === 'pending' ? nextActiveUntil() : '';
  const now = nowSql();
  run(
    `INSERT INTO exchanges (id, item_id, requester_id, owner_id, status, message, queue_position, active_until, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, item_id, requester_id, owner_id, status, sanitizedMessage, queuePosition, activeUntil, now]
  );
  run(`UPDATE items SET status = 'pending' WHERE id = ?`, [item_id]);
  if (status === 'pending') {
    notify(String(owner_id), 'exchange', '新的预约申请', '有邻居发起了预约，请尽快确认。', String(item_id));
  } else {
    notify(String(owner_id), 'exchange', '新的候补申请', `有邻居加入候补队列，目前排第 ${queuePosition} 位。`, String(item_id));
    notify(String(requester_id), 'exchange', '已加入候补队列', `当前已有邻居预约，你已排在第 ${queuePosition} 位。轮到你时会自动提醒。`, String(item_id));
  }

  const exchange = getOne('SELECT * FROM exchanges WHERE id = ?', [id]);
  res.status(201).json({ data: exchange });
  } catch (err) {
    console.error('[Exchange Create Error]', err);
    res.status(500).json({ error: '创建预约失败，请稍后重试' });
  }
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
  if (String(exchange.owner_id) !== actorId) {
    return res.status(403).json({ error: '只有发布者才能确认交接完成' });
  }
  if (String(exchange.status) !== 'pending') {
    return res.status(400).json({ error: '只有待确认的预约才能完成交接' });
  }

  // BUG-02: 检查用户状态
  const actorUser = getOne('SELECT status FROM users WHERE id = ?', [actorId]) as Record<string, any> | null;
  if (!checkUserStatus(actorUser, res, '确认交接')) return;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  run(`UPDATE exchanges SET status = 'completed', updated_at = ?, completed_at = ? WHERE id = ?`, [now, now, req.params.id]);
  run(`UPDATE items SET status = 'completed' WHERE id = ?`, [exchange.item_id]);
  run(`UPDATE exchanges SET status = 'expired', expired_at = ?, updated_at = ? WHERE item_id = ? AND status = 'waiting'`, [now, now, exchange.item_id]);
  run(
    `UPDATE users SET exchange_count = COALESCE(exchange_count, 0) + 1 WHERE id IN (?, ?)`,
    [exchange.owner_id, exchange.requester_id]
  );
  // BUG-21: 通知双方（而非仅 requester）
  const otherUserId = actorId === String(exchange.owner_id) ? String(exchange.requester_id) : String(exchange.owner_id);
  run(
    `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
     VALUES (?, ?, 'exchange', '一次交换已完成', ?, ?, 0)`,
    [`notif_${uuid().slice(0, 8)}`, otherUserId, '你参与的物品交换已完成交接。', exchange.item_id]
  );

  res.json({ data: getOne('SELECT * FROM exchanges WHERE id = ?', [req.params.id]) });
});

// PUT /exchanges/:id/cancel — requester 取消预约
exchangesRouter.put('/:id/cancel', (req, res) => {
  const exchange = getOne('SELECT * FROM exchanges WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!exchange) return res.status(404).json({ error: '预约不存在' });
  const actorId = String(req.body?.actor_id || '');
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录后再操作' });
  }
  if (!actorId || actorId !== authUserId) {
    return res.status(403).json({ error: '当前登录身份无法取消这个预约' });
  }
  if (String(exchange.requester_id) !== actorId) {
    return res.status(403).json({ error: '只有预约发起者才能取消预约' });
  }
  if (!['pending', 'waiting'].includes(String(exchange.status))) {
    return res.status(400).json({ error: '只有待确认或候补中的预约才能取消' });
  }

  // BUG-02: 检查用户状态
  const actorUser = getOne('SELECT status FROM users WHERE id = ?', [actorId]) as Record<string, any> | null;
  if (!checkUserStatus(actorUser, res, '取消预约')) return;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  run(`UPDATE exchanges SET status = 'cancelled', updated_at = ?, cancelled_by = ?, cancelled_at = ? WHERE id = ?`, [now, actorId, now, req.params.id]);
  if (String(exchange.status) === 'pending') {
    promoteNextWaiting(String(exchange.item_id));
  } else {
    reindexWaitingQueue(String(exchange.item_id));
  }
  // 通知物主
  run(
    `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
     VALUES (?, ?, 'exchange', '预约已取消', ?, ?, 0)`,
    [`notif_${uuid().slice(0, 8)}`, exchange.owner_id, '对方已取消预约，你的物品已恢复为可预约状态。', exchange.item_id]
  );

  res.json({ data: getOne('SELECT * FROM exchanges WHERE id = ?', [req.params.id]) });
});

// PUT /exchanges/:id/fail — 双方标记交换失败
exchangesRouter.put('/:id/fail', (req, res) => {
  const exchange = getOne('SELECT * FROM exchanges WHERE id = ?', [req.params.id]) as Record<string, any> | null;
  if (!exchange) return res.status(404).json({ error: '预约不存在' });
  const actorId = String(req.body?.actor_id || '');
  const reason = String(req.body?.reason || '');
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录后再操作' });
  }
  if (!actorId || actorId !== authUserId) {
    return res.status(403).json({ error: '当前登录身份无法标记这个交换' });
  }
  if (![String(exchange.owner_id), String(exchange.requester_id)].includes(actorId)) {
    return res.status(403).json({ error: '只有参与预约的双方才能标记交换失败' });
  }
  if (!['pending', 'waiting'].includes(String(exchange.status))) {
    return res.status(400).json({ error: '只有待确认或候补中的预约才能标记失败' });
  }

  // BUG-02: 检查用户状态
  const actorUser = getOne('SELECT status FROM users WHERE id = ?', [actorId]) as Record<string, any> | null;
  if (!checkUserStatus(actorUser, res, '标记交换失败')) return;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  run(`UPDATE exchanges SET status = 'failed', updated_at = ?, failed_at = ?, fail_reason = ? WHERE id = ?`, [now, now, reason, req.params.id]);
  if (String(exchange.status) === 'pending') {
    promoteNextWaiting(String(exchange.item_id));
  } else {
    reindexWaitingQueue(String(exchange.item_id));
  }
  // 通知对方
  const otherUserId = actorId === String(exchange.owner_id) ? String(exchange.requester_id) : String(exchange.owner_id);
  run(
    `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
     VALUES (?, ?, 'exchange', '交换已标记为失败', ?, ?, 0)`,
    [`notif_${uuid().slice(0, 8)}`, otherUserId, reason ? `交换未成功，原因：${reason}` : '交换已标记为失败，物品已恢复为可预约状态。', exchange.item_id]
  );

  res.json({ data: getOne('SELECT * FROM exchanges WHERE id = ?', [req.params.id]) });
});
