import { Router } from 'express';

import { query, run, uuid } from '../models/db';
import { resetDemoData } from '../models/db';
import { getOpsService } from '../services/ops';

export const adminRouter = Router();

function validateAdminToken(req: { headers: Record<string, string | string[] | undefined> }, res: any) {
  const adminToken = process.env.DEMO_ADMIN_TOKEN || 'local-demo-reset';
  const providedToken = req.headers['x-demo-admin-token'];

  if (providedToken !== adminToken) {
    res.status(401).json({ error: '管理员口令错误' });
    return false;
  }

  return true;
}

adminRouter.post('/reset-demo', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: '生产环境禁用 demo 重置' });
  }

  if (!validateAdminToken(req as never, res)) return;

  await resetDemoData();
  res.json({ data: { reset: true } });
});

adminRouter.get('/reviews', async (req, res) => {
  if (!validateAdminToken(req as never, res)) return;
  const reviews = await getOpsService().listReviews();
  res.json({ data: reviews });
});

// POST /api/admin/broadcast-notification - 向所有用户或指定用户发送系统通知
adminRouter.post('/broadcast-notification', async (req, res) => {
  if (!validateAdminToken(req as never, res)) return;

  const { title, content, type = 'system', related_item_id } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }

  const notificationId = `notif_${uuid().slice(0, 8)}`;

  // 插入通知（不指定 user_id 表示广播给所有用户，当前简化处理：插入一条后再查所有用户发）
  // 为简化：向所有现有用户发送
  const users = query('SELECT id FROM users');
  let sentCount = 0;

  for (const user of users) {
    const userId = (user as Record<string, unknown>).id as string;
    run(
      `INSERT INTO notifications (id, user_id, type, title, content, related_item_id, read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [`${notificationId}_${sentCount}`, userId, type, title, content, related_item_id || null]
    );
    sentCount++;
  }

  res.json({ data: { sent_count: sentCount, notification_id: notificationId } });
});
