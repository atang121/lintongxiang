import { Router } from 'express';

import { query, run, uuid, getOne } from '../models/db';

// BUG-37/25: 转义 LIKE 通配符，防止 SQL 注入
function escapeLike(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
import { resetDemoData } from '../models/db';
import { getOpsService } from '../services/ops';
import { getAuthUser } from '../lib/session';
import { addSensitiveWord, removeSensitiveWord, listDynamicWords, reloadSensitiveWords, CATEGORY_LABEL, SensitiveCategory } from '../services/sensitiveWord';
import { extractAgreementTextFromUpload, getLatestServiceAgreementRecord, publishServiceAgreement } from '../services/serviceAgreement';

export const adminRouter = Router();

let adminLogTableChecked = false;

// 管理员操作日志表 - 延迟初始化
function ensureAdminLogTable() {
  if (adminLogTableChecked) return;
  adminLogTableChecked = true;

  try {
    const exists = query("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_logs'");
    if (exists.length === 0) {
      run(`
        CREATE TABLE admin_logs (
          id TEXT PRIMARY KEY,
          admin_id TEXT NOT NULL,
          admin_nickname TEXT DEFAULT '',
          action TEXT NOT NULL,
          target_type TEXT DEFAULT '',
          target_id TEXT DEFAULT '',
          details TEXT DEFAULT '',
          ip TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.log('✅ admin_logs 表已创建');
    }
  } catch (err) {
    console.error('❌ 确保 admin_logs 表失败:', err);
    adminLogTableChecked = false; // 重置以便重试
  }
}

// 记录管理员操作
function logAdminAction(adminId: string, adminNickname: string, action: string, targetType: string, targetId: string, details: string, ip: string) {
  ensureAdminLogTable(); // 确保表存在
  const id = 'log_' + uuid().slice(0, 8);
  run(
    `INSERT INTO admin_logs (id, admin_id, admin_nickname, action, target_type, target_id, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, adminId, adminNickname, action, targetType, targetId, details, ip]
  );
}

// 验证管理员权限（两种方式）：
// 1. 请求带 Authorization: Bearer <user_token>，且用户 is_admin=1
// 2. 请求带 X-Admin-Token: <admin专用token>（仅临时过渡）
function validateAdmin(req: { headers: Record<string, string | string[] | undefined>; ip?: string }, res: any): { adminId: string; adminNickname: string } | null {
  const authHeader = req.headers.authorization as string | undefined;
  const adminToken = req.headers['x-admin-token'] as string;
  const envAdminToken = process.env.ADMIN_TOKEN || '';

  // 方式1: 用户JWT token + is_admin 标志（主要方式）
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const user = getAuthUser(authHeader);
    if (user?.isAdmin) {
      const userInfo = query('SELECT nickname FROM users WHERE id = ?', [user.userId]);
      const nickname = (userInfo[0] as Record<string, any>)?.nickname || user.userId;
      return { adminId: user.userId, adminNickname: nickname };
    }
  }

  // 方式2: Admin专用token（环境变量配置，仅作为过渡）
  // 开发模式下允许 local-demo-reset 作为测试token
  const isDev = process.env.NODE_ENV !== 'production';
  if (adminToken) {
    if (isDev && adminToken === 'local-demo-reset') {
      return { adminId: 'dev_admin', adminNickname: '开发管理员' };
    }
    if (envAdminToken && adminToken === envAdminToken) {
      return { adminId: 'env_admin', adminNickname: '环境管理员' };
    }
  }

  res.status(401).json({ error: '需要管理员权限' });
  return null;
}

// POST /api/admin/reset-demo - 重置演示数据
adminRouter.post('/reset-demo', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: '生产环境禁用 demo 重置' });
  }

  if (!validateAdmin(req as any, res)) return;

  await resetDemoData();
  res.json({ data: { reset: true } });
});

// GET /api/admin/reviews - 获取待审核列表
adminRouter.get('/reviews', async (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const reviews = await getOpsService().listReviews();
  res.json({ data: reviews });
});

// POST /api/admin/reviews/:id/approve - 审核通过
adminRouter.post('/reviews/:id/approve', async (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { id } = req.params;
  const review = query('SELECT * FROM review_queue WHERE id = ?', [id]);

  if (!review || review.length === 0) {
    return res.status(404).json({ error: '审核项不存在' });
  }

  // 更新物品状态为 available
  const itemId = (review[0] as Record<string, any>).item_id;
  run("UPDATE items SET status = 'available' WHERE id = ?", [itemId]);
  run("UPDATE review_queue SET status = 'approved' WHERE id = ?", [id]);

  logAdminAction(admin.adminId, admin.adminNickname, 'approve_review', 'review', id, `通过物品 ${itemId}`, req.ip || '');

  res.json({ data: { ok: true } });
});

// POST /api/admin/reviews/:id/reject - 审核拒绝
adminRouter.post('/reviews/:id/reject', async (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { id } = req.params;
  const { reason } = req.body;
  const review = query('SELECT * FROM review_queue WHERE id = ?', [id]);

  if (!review || review.length === 0) {
    return res.status(404).json({ error: '审核项不存在' });
  }

  // 更新物品状态为 deleted
  const itemId = (review[0] as Record<string, any>).item_id;
  run("UPDATE items SET status = 'deleted' WHERE id = ?", [itemId]);
  run("UPDATE review_queue SET status = 'rejected' WHERE id = ?", [id]);

  logAdminAction(admin.adminId, admin.adminNickname, 'reject_review', 'review', id, `拒绝物品 ${itemId}: ${reason || '无原因'}`, req.ip || '');

  res.json({ data: { ok: true } });
});

// GET /api/admin/reviews/stats - 审核统计
adminRouter.get('/reviews/stats', async (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const total = query('SELECT COUNT(*) as count FROM review_queue WHERE status = ?', ['submitted']);
  const approved = query('SELECT COUNT(*) as count FROM review_queue WHERE status = ?', ['approved']);
  const rejected = query('SELECT COUNT(*) as count FROM review_queue WHERE status = ?', ['rejected']);

  res.json({
    data: {
      pending: total[0]?.count || 0,
      approved: approved[0]?.count || 0,
      rejected: rejected[0]?.count || 0,
    },
  });
});

// POST /api/admin/broadcast-notification - 管理员发布平台通知
adminRouter.post('/broadcast-notification', async (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { title, content, type = 'platform', related_item_id } = req.body;
  const audience = String(req.body?.audience || 'all');
  const community = String(req.body?.community || '').trim();
  const userIds = Array.isArray(req.body?.user_ids)
    ? [...new Set(req.body.user_ids.map((id: unknown) => String(id)).filter(Boolean))]
    : [];
  const notificationType = String(type || 'platform');
  const validManualTypes = new Set(['platform', 'ops', 'handling', 'system']);
  const validAudiences = new Set(['all', 'community', 'users']);

  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }
  if (!validManualTypes.has(notificationType)) {
    return res.status(400).json({ error: '该通知类型不能由管理员手动群发' });
  }
  if (!validAudiences.has(audience)) {
    return res.status(400).json({ error: '无效的发送对象' });
  }

  const notificationId = `notif_${uuid().slice(0, 8)}`;
  let users: Array<Record<string, any>> = [];

  if (audience === 'all') {
    users = query("SELECT id FROM users WHERE COALESCE(status, 'active') != 'deactivated'") as Array<Record<string, any>>;
  } else if (audience === 'community') {
    if (!community) return res.status(400).json({ error: '请选择小区' });
    users = query(
      "SELECT id FROM users WHERE community = ? AND COALESCE(status, 'active') != 'deactivated'",
      [community]
    ) as Array<Record<string, any>>;
  } else {
    if (userIds.length === 0) return res.status(400).json({ error: '请选择要通知的用户' });
    const placeholders = userIds.map(() => '?').join(',');
    users = query(
      `SELECT id FROM users WHERE id IN (${placeholders}) AND COALESCE(status, 'active') != 'deactivated'`,
      userIds
    ) as Array<Record<string, any>>;
  }

  let sentCount = 0;

  for (const user of users) {
    const userId = (user as Record<string, unknown>).id as string;
    run(
      `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [`${notificationId}_${sentCount}`, userId, notificationType, title, content, related_item_id || null]
    );
    sentCount++;
  }

  const targetText = audience === 'community' ? `小区「${community}」` : audience === 'users' ? `${userIds.length} 个指定用户` : '全部用户';
  logAdminAction(admin.adminId, admin.adminNickname, 'broadcast_notification', 'notification', notificationId, `向${targetText}发送 ${sentCount} 条通知: ${title}`, req.ip || '');

  res.json({ data: { sent_count: sentCount, notification_id: notificationId, audience, type: notificationType } });
});

// PUT /api/admin/notifications/:id/recall - 撤回指定通知
adminRouter.put('/notifications/:id/recall', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { id } = req.params;
  
  const notif = getOne('SELECT * FROM notifications WHERE id = ?', [id]) as Record<string, any> | null;
  if (!notif) {
    return res.status(404).json({ error: '通知不存在' });
  }

  if (notif.recalled) {
    return res.status(400).json({ error: '通知已被撤回' });
  }

  run(`UPDATE notifications SET recalled = 1 WHERE id = ?`, [id]);
  
  logAdminAction(
    admin.adminId, admin.adminNickname,
    'recall_notification', 'notification', id,
    `撤回通知: ${notif.title || '无标题'}`,
    req.ip || ''
  );

  res.json({ data: { ok: true, id } });
});

// PUT /api/admin/notifications/recall-batch - 批量撤回通知
adminRouter.put('/notifications/recall-batch', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请提供要撤回的通知ID数组' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const rows = query(
    `SELECT id, title FROM notifications WHERE id IN (${placeholders}) AND recalled = 0`,
    ids
  ) as Record<string, any>[];
  
  if (rows.length === 0) {
    return res.json({ data: { ok: true, recalled: 0, message: '没有可撤回的通知' } });
  }

  const validIds = rows.map((row: Record<string, any>) => row.id);
  const updatePlaceholders = validIds.map(() => '?').join(',');
  run(
    `UPDATE notifications SET recalled = 1 WHERE id IN (${updatePlaceholders})`,
    validIds
  );

  logAdminAction(
    admin.adminId, admin.adminNickname,
    'recall_notification_batch', 'notification', `${validIds.length}条`,
    `批量撤回 ${validIds.length} 条通知`,
    req.ip || ''
  );

  res.json({ data: { ok: true, recalled: validIds.length, total: ids.length } });
});

// GET /api/admin/logs - 管理员操作日志
adminRouter.get('/logs', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { limit = 50, offset = 0 } = req.query;
  const logs = query('SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT ? OFFSET ?', [Number(limit), Number(offset)]);

  res.json({ data: logs });
});

// GET /api/admin/feedback - 管理员查看反馈与举报投诉
adminRouter.get('/feedback', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { status, limit = 100, offset = 0 } = req.query;
  const params: unknown[] = [];
  let where = 'WHERE 1 = 1';

  if (status && status !== 'all') {
    where += ' AND f.status = ?';
    params.push(String(status));
  }

  const rows = query(
    `SELECT f.*,
        u.nickname as user_nickname,
        u.community as user_community,
        u.phone as user_phone
      FROM feedback_entries f
      LEFT JOIN users u ON f.user_id = u.id
      ${where}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  const total = query(
    `SELECT COUNT(*) as count FROM feedback_entries f ${where}`,
    params
  )[0]?.count || 0;

  res.json({ data: rows, total });
});

// POST /api/admin/feedback/:id/reply - 回复登录用户或更新反馈状态
adminRouter.post('/feedback/:id/reply', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { id } = req.params;
  const reply = String(req.body?.reply || '').trim();
  const status = String(req.body?.status || (reply ? 'replied' : 'processing'));
  const validStatuses = ['submitted', 'processing', 'replied', 'closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '无效的处理状态' });
  }
  if (status === 'replied' && !reply) {
    return res.status(400).json({ error: '回复内容不能为空' });
  }

  const feedback = getOne('SELECT * FROM feedback_entries WHERE id = ?', [id]) as Record<string, any> | null;
  if (!feedback) {
    return res.status(404).json({ error: '反馈不存在' });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const updateReply = reply || String(feedback.admin_reply || '');
  const repliedBy = reply ? admin.adminId : String(feedback.replied_by || '');
  const repliedAt = reply ? now : String(feedback.replied_at || '');
  const handledAt = ['replied', 'closed'].includes(status) ? now : String(feedback.handled_at || '');

  run(
    `UPDATE feedback_entries
      SET status = ?, admin_reply = ?, replied_by = ?, replied_at = ?, handled_at = ?
      WHERE id = ?`,
    [status, updateReply, repliedBy, repliedAt, handledAt, id]
  );

  let notificationSent = false;
  if (reply && feedback.user_id) {
    const notificationId = `notif_${uuid().slice(0, 8)}`;
    run(
      `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
       VALUES (?, ?, 'feedback', '反馈处理回复', ?, ?, 0)`,
      [
        notificationId,
        feedback.user_id,
        `你提交的「${feedback.type || '反馈'}」已有处理回复：${reply}`,
        null,
      ]
    );
    notificationSent = true;
  }

  const STATUS_LABEL: Record<string, string> = {
    submitted: '待处理',
    processing: '处理中',
    replied: '已回复',
    closed: '已关闭',
  };
  logAdminAction(
    admin.adminId,
    admin.adminNickname,
    reply ? 'reply_feedback' : `feedback_${status}`,
    'feedback',
    id,
    `${STATUS_LABEL[status] || status}${reply ? `：${reply.slice(0, 80)}` : ''}`,
    req.ip || ''
  );

  res.json({ data: { ok: true, status, notification_sent: notificationSent } });
});

// GET /api/admin/service-agreement - 获取当前服务协议内容
adminRouter.get('/service-agreement', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  res.json({ data: getLatestServiceAgreementRecord() });
});

// POST /api/admin/service-agreement - 发布新的服务协议版本
adminRouter.post('/service-agreement', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { title, summary, text, version, note, source } = req.body || {};
  try {
    const content = publishServiceAgreement({
      title,
      summary,
      text,
      version,
      note,
      source: source || 'admin',
      publishedBy: admin.adminId,
    });
    logAdminAction(
      admin.adminId,
      admin.adminNickname,
      'publish_service_agreement',
      'service_agreement',
      content.version,
      `发布协议版本 ${content.version}${note ? `：${note}` : ''}`,
      req.ip || ''
    );
    res.json({ data: content });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || '协议发布失败' });
  }
});

// POST /api/admin/service-agreement/extract - 从上传文件提取协议文本
adminRouter.post('/service-agreement/extract', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  try {
    const text = extractAgreementTextFromUpload({
      fileName: String(req.body?.file_name || ''),
      dataUrl: String(req.body?.data_url || ''),
    });
    res.json({ data: { text } });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || '协议文件解析失败' });
  }
});

// GET /api/admin/users - 用户列表
adminRouter.get('/users', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { keyword, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT id, nickname, phone, community, is_admin, is_liaison, credit_score, exchange_count, status, status_reason, status_updated_at, created_at FROM users';
  const params: unknown[] = [];

  if (keyword) {
    // BUG-25/37: 转义 SQL LIKE 通配符
    const escapedKeyword = escapeLike(String(keyword));
    sql += ' WHERE nickname LIKE ? ESCAPE \'\\\' OR phone LIKE ? ESCAPE \'\\\'';
    params.push(`%${escapedKeyword}%`, `%${escapedKeyword}%`);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const users = query(sql, params);
  res.json({ data: users });
});

// POST /api/admin/users/:id/set-admin - 设置管理员
adminRouter.post('/users/:id/set-admin', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { id } = req.params;
  const { isAdmin } = req.body;

  const user = query('SELECT id FROM users WHERE id = ?', [id]);
  if (!user || user.length === 0) {
    return res.status(404).json({ error: '用户不存在' });
  }

  run('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, id]);
  logAdminAction(admin.adminId, admin.adminNickname, 'set_admin', 'user', id, `设置管理员: ${isAdmin ? '是' : '否'}`, req.ip || '');

  res.json({ data: { ok: true } });
});

// POST /api/admin/users/:id/set-status - 设置用户状态
// status: 'active' | 'muted' | 'deactivated'
// muted=禁言（可登录但不能发布/私信）, deactivated=注销（无法登录）
adminRouter.post('/users/:id/set-status', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { id } = req.params;
  const { status, reason } = req.body;

  // 参数校验
  const validStatuses = ['active', 'muted', 'deactivated'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: '无效的状态值，支持: active, muted, deactivated' });
  }

  // 不能操作自己
  if (id === admin.adminId) {
    return res.status(403).json({ error: '不能修改自己的状态' });
  }

  const user = query('SELECT id, nickname, is_admin, status FROM users WHERE id = ?', [id]);
  if (!user || user.length === 0) {
    return res.status(404).json({ error: '用户不存在' });
  }

  // 不能对管理员执行禁言/注销
  const targetUser = user[0] as Record<string, any>;
  if (targetUser.is_admin && status !== 'active') {
    return res.status(403).json({ error: '不能对管理员执行禁言或注销操作' });
  }

  const prevStatus = String(targetUser.status || 'active');
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  run('UPDATE users SET status = ?, status_reason = ?, status_updated_at = ? WHERE id = ?', [
    status,
    reason || '',
    now,
    id,
  ]);

  // 如果注销用户，同时下架其所有在架物品
  if (status === 'deactivated') {
    run("UPDATE items SET status = 'deleted' WHERE user_id = ? AND status = 'available'", [id]);
  }

  // 如果恢复用户，同时恢复其被下架的物品
  if (status === 'active') {
    // 只在从 deactivated 恢复时才恢复物品
    if (prevStatus === 'deactivated') {
      run("UPDATE items SET status = 'available' WHERE user_id = ? AND status = 'deleted'", [id]);
    }
  }

  const STATUS_LABEL: Record<string, string> = { active: '恢复正常', muted: '禁言', deactivated: '注销' };
  logAdminAction(
    admin.adminId, admin.adminNickname,
    `set_status_${status}`, 'user', id,
    `${STATUS_LABEL[status]}用户 ${targetUser.nickname}${reason ? `，原因: ${reason}` : ''}`,
    req.ip || ''
  );

  res.json({ data: { ok: true, status } });
});

// GET /api/admin/stats - 数据统计
adminRouter.get('/stats', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  // 用户统计
  const totalUsers = query('SELECT COUNT(*) as count FROM users')[0]?.count || 0;
  const newUsersToday = query("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')")[0]?.count || 0;

  // 物品统计
  const totalItems = query('SELECT COUNT(*) as count FROM items')[0]?.count || 0;
  const activeItems = query("SELECT COUNT(*) as count FROM items WHERE status = 'available'")[0]?.count || 0;
  const newItemsToday = query("SELECT COUNT(*) as count FROM items WHERE date(created_at) = date('now')")[0]?.count || 0;

  // 交换统计
  const totalExchanges = query('SELECT COUNT(*) as count FROM exchanges')[0]?.count || 0;
  const completedExchanges = query("SELECT COUNT(*) as count FROM exchanges WHERE status = 'completed'")[0]?.count || 0;
  const pendingExchanges = query("SELECT COUNT(*) as count FROM exchanges WHERE status = 'pending'")[0]?.count || 0;
  const cancelledExchanges = query("SELECT COUNT(*) as count FROM exchanges WHERE status = 'cancelled'")[0]?.count || 0;
  const failedExchanges = query("SELECT COUNT(*) as count FROM exchanges WHERE status = 'failed'")[0]?.count || 0;

  // 待审核
  const pendingReviews = query("SELECT COUNT(*) as count FROM review_queue WHERE status = 'submitted'")[0]?.count || 0;

  res.json({
    data: {
      users: { total: totalUsers, newToday: newUsersToday },
      items: { total: totalItems, active: activeItems, newToday: newItemsToday },
      exchanges: { total: totalExchanges, completed: completedExchanges, pending: pendingExchanges, cancelled: cancelledExchanges, failed: failedExchanges },
      pendingReviews,
    },
  });
});

// ===== 敏感词管理 =====

// GET /api/admin/sensitive-words - 获取动态敏感词列表
adminRouter.get('/sensitive-words', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const words = listDynamicWords();
  res.json({ data: words });
});

// POST /api/admin/sensitive-words - 添加敏感词
adminRouter.post('/sensitive-words', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { word, category } = req.body;
  if (!word || !word.trim()) {
    return res.status(400).json({ error: '敏感词不能为空' });
  }

  const validCategories: SensitiveCategory[] = [
    'political',
    'porn',
    'gambling',
    'drugs',
    'insult',
    'ad',
    'live_animal',
    'food_medicine',
    'hygiene_risk',
    'safety_hazard',
    'counterfeit',
    'dangerous_goods',
    'payment_risk',
    'privacy',
    'other',
  ];
  const finalCategory = validCategories.includes(category) ? category : 'other';

  const ok = addSensitiveWord(word.trim(), finalCategory as SensitiveCategory, admin.adminId);
  if (!ok) {
    return res.status(500).json({ error: '添加失败，可能已存在' });
  }

  logAdminAction(admin.adminId, admin.adminNickname, 'add_sensitive_word', 'sensitive_word', word.trim(), `类别: ${CATEGORY_LABEL[finalCategory as SensitiveCategory]}`, req.ip || '');
  res.json({ data: { ok: true, word: word.trim(), category: finalCategory } });
});

// DELETE /api/admin/sensitive-words/:word - 删除敏感词
adminRouter.delete('/sensitive-words/:word', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { word } = req.params;
  const ok = removeSensitiveWord(decodeURIComponent(word));
  if (!ok) {
    return res.status(500).json({ error: '删除失败' });
  }

  logAdminAction(admin.adminId, admin.adminNickname, 'remove_sensitive_word', 'sensitive_word', word, '', req.ip || '');
  res.json({ data: { ok: true } });
});

// POST /api/admin/sensitive-words/reload - 重新加载词库
adminRouter.post('/sensitive-words/reload', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  reloadSensitiveWords();
  res.json({ data: { ok: true } });
});

// ===== 交换管理 =====

// GET /api/admin/exchanges - 管理员查看交换列表
adminRouter.get('/exchanges', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { status, limit = 50, offset = 0 } = req.query;

  let sql = `SELECT e.*, i.title as item_title, i.images as item_images, i.status as item_status,
    r.nickname as requester_nickname, r.community as requester_community,
    o.nickname as owner_nickname, o.community as owner_community
    FROM exchanges e
    JOIN items i ON e.item_id = i.id
    JOIN users r ON e.requester_id = r.id
    JOIN users o ON e.owner_id = o.id
    WHERE 1 = 1`;
  const params: unknown[] = [];

  if (status) {
    sql += ' AND e.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = query(sql, params);

  // 获取总数
  let countSql = 'SELECT COUNT(*) as count FROM exchanges WHERE 1 = 1';
  const countParams: unknown[] = [];
  if (status) {
    countSql += ' AND status = ?';
    countParams.push(status);
  }
  const total = query(countSql, countParams)[0]?.count || 0;

  res.json({ data: rows, total });
});

// PUT /api/admin/exchanges/:id/status - 管理员手动修改交换状态
adminRouter.put('/exchanges/:id/status', (req, res) => {
  const admin = validateAdmin(req as any, res);
  if (!admin) return;

  const { id } = req.params;
  const { status, reason } = req.body;

  const validStatuses = ['completed', 'cancelled', 'failed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: '无效的状态值，支持: completed, cancelled, failed' });
  }

  const exchange = getOne('SELECT * FROM exchanges WHERE id = ?', [id]) as Record<string, any> | null;
  if (!exchange) {
    return res.status(404).json({ error: '交换记录不存在' });
  }
  if (String(exchange.status) !== 'pending') {
    return res.status(400).json({ error: '只有待确认的预约才能修改状态' });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  if (status === 'completed') {
    run(`UPDATE exchanges SET status = 'completed', updated_at = ?, completed_at = ? WHERE id = ?`, [now, now, id]);
    run(`UPDATE items SET status = 'completed' WHERE id = ?`, [exchange.item_id]);
    run(
      `UPDATE users SET exchange_count = COALESCE(exchange_count, 0) + 1 WHERE id IN (?, ?)`,
      [exchange.owner_id, exchange.requester_id]
    );
  } else if (status === 'cancelled') {
    run(`UPDATE exchanges SET status = 'cancelled', updated_at = ?, cancelled_by = ?, cancelled_at = ? WHERE id = ?`, [now, `admin:${admin.adminId}`, now, id]);
    run(`UPDATE items SET status = 'available' WHERE id = ?`, [exchange.item_id]);
  } else if (status === 'failed') {
    run(`UPDATE exchanges SET status = 'failed', updated_at = ?, failed_at = ?, fail_reason = ? WHERE id = ?`, [now, now, reason || '管理员操作', id]);
    run(`UPDATE items SET status = 'available' WHERE id = ?`, [exchange.item_id]);
  }

  const STATUS_LABEL: Record<string, string> = { completed: '标记完成', cancelled: '取消预约', failed: '标记失败' };
  logAdminAction(
    admin.adminId, admin.adminNickname,
    `exchange_${status}`, 'exchange', id,
    `${STATUS_LABEL[status]} ${id}${reason ? `，原因: ${reason}` : ''}`,
    req.ip || ''
  );

  res.json({ data: { ok: true, status } });
});
