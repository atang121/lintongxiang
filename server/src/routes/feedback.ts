import { Router } from 'express';

import { getAuthUserId } from '../lib/session';
import { getOne, run, uuid } from '../models/db';
import { getMailService } from '../services/mail';
import { sendFeishuWebhookNotification } from '../services/feishuWebhook';
import { createFeedbackRecordInFeishu } from '../services/feishuBase';

export const feedbackRouter = Router();

feedbackRouter.post('/', async (req, res) => {
  const { type, content, contact } = req.body;
  const trimmedType = String(type || '').trim();
  const trimmedContent = String(content || '').trim();
  const trimmedContact = String(contact || '').trim();

  if (!trimmedType || !trimmedContent) {
    return res.status(400).json({ error: '反馈类型和内容必填' });
  }

  if (trimmedContent.length < 5) {
    return res.status(400).json({ error: '请至少填写 5 个字的反馈内容' });
  }

  const authUserId = getAuthUserId(req.headers.authorization);
  const user = authUserId
    ? (getOne('SELECT id, email, nickname FROM users WHERE id = ?', [authUserId]) as Record<string, any> | null)
    : null;

  const feedbackId = 'feedback_' + uuid().slice(0, 8);
  const providers: string[] = [];

  // 1. 发送飞书群机器人 Webhook（优先，失败不影响后续）
  try {
    const webhookOk = await sendFeishuWebhookNotification({
      type: trimmedType,
      content: trimmedContent,
      contact: trimmedContact,
      userEmail: user?.email ? String(user.email) : undefined,
      userId: user?.id ? String(user.id) : undefined,
      userNickname: user?.nickname ? String(user.nickname) : undefined,
    });
    if (webhookOk) providers.push('feishu_webhook');
  } catch (error) {
    // 飞书 webhook 失败，记录但不中断
    console.error('[Feedback] Feishu webhook failed:', error instanceof Error ? error.message : error);
  }

  // 2. 写入飞书多维表格反馈表
  try {
    const bitableOk = await createFeedbackRecordInFeishu({
      feedbackId,
      type: trimmedType,
      content: trimmedContent,
      contact: trimmedContact,
      userEmail: user?.email ? String(user.email) : undefined,
      userId: user?.id ? String(user.id) : undefined,
    });
    if (bitableOk) providers.push('feishu_bitable');
  } catch (error) {
    console.error('Feishu bitable write failed:', error);
  }

  // 3. 发送邮件通知（兜底）
  try {
    const delivery = await getMailService().sendFeedbackNotification?.({
      type: trimmedType,
      content: trimmedContent,
      contact: trimmedContact,
      userEmail: user?.email ? String(user.email) : undefined,
      userId: user?.id ? String(user.id) : undefined,
    });
    if (delivery?.provider && delivery.provider !== 'preview') {
      providers.push('email');
    }
  } catch (error) {
    console.error('Email notification failed:', error);
  }

  // 4. 本地数据库存档
  run(
    `INSERT INTO feedback_entries
      (id, user_id, user_email, type, content, contact, provider, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      feedbackId,
      user?.id ? String(user.id) : '',
      user?.email ? String(user.email) : '',
      trimmedType,
      trimmedContent,
      trimmedContact,
      providers.join(',') || 'local',
      'submitted',
    ]
  );

  res.status(201).json({
    data: {
      id: feedbackId,
      provider: providers[0] || 'local',
    },
  });
});
