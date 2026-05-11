import { Router } from 'express';

import { getAuthUserId } from '../lib/session';
import { getOne, run, uuid } from '../models/db';
import { getMailService } from '../services/mail';
import { sendFeishuWebhookNotification } from '../services/feishuWebhook';
import { createFeedbackRecordInFeishu } from '../services/feishuBase';
import { feedbackLimiter } from '../middleware/rateLimit';

export const feedbackRouter = Router();

type DeliveryProvider = 'feishu_webhook' | 'feishu_bitable' | 'email';

type DeliveryAttempt = {
  provider: DeliveryProvider;
  ok: boolean;
  reason?: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'unknown error');
}

function normalizeFeedbackType(type: unknown) {
  const value = String(type || '').trim();
  return value === '投诉' ? '举报投诉' : value;
}

feedbackRouter.post('/', feedbackLimiter, async (req, res) => {
  const { type, content, contact } = req.body;
  const trimmedType = normalizeFeedbackType(type);
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
    ? (getOne('SELECT id, email, nickname, community FROM users WHERE id = ?', [authUserId]) as Record<string, any> | null)
    : null;

  const feedbackId = 'feedback_' + uuid().slice(0, 8);
  const providers: string[] = [];
  const deliveryAttempts: DeliveryAttempt[] = [];

  const recordAttempt = (provider: DeliveryProvider, ok: boolean, reason?: string) => {
    deliveryAttempts.push({ provider, ok, ...(reason ? { reason } : {}) });
    if (ok) providers.push(provider);
  };

  // 1. 发送飞书群机器人 Webhook（优先，失败不影响后续）
  try {
    const webhookDelivery = await sendFeishuWebhookNotification({
      type: trimmedType,
      content: trimmedContent,
      contact: trimmedContact,
      userEmail: user?.email ? String(user.email) : undefined,
      userId: user?.id ? String(user.id) : undefined,
      userNickname: user?.nickname ? String(user.nickname) : undefined,
    });
    recordAttempt(
      'feishu_webhook',
      webhookDelivery.ok,
      webhookDelivery.ok ? undefined : webhookDelivery.reason || 'Webhook 未配置、签名校验未适配，或飞书请求失败；请查看服务端日志'
    );
  } catch (error) {
    console.error('Feishu webhook failed:', error);
    recordAttempt('feishu_webhook', false, errorMessage(error));
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
      userNickname: user?.nickname ? String(user.nickname) : undefined,
      community: user?.community ? String(user.community) : undefined,
    });
    recordAttempt(
      'feishu_bitable',
      bitableOk,
      bitableOk ? undefined : '多维表格未配置、字段不匹配、权限不足，或飞书请求失败；请查看服务端日志'
    );
  } catch (error) {
    console.error('Feishu bitable write failed:', error);
    recordAttempt('feishu_bitable', false, errorMessage(error));
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
    recordAttempt(
      'email',
      Boolean(delivery?.provider && delivery.provider !== 'preview'),
      delivery?.provider === 'preview' ? '邮件当前为预览模式，未真实发送' : undefined
    );
  } catch (error) {
    console.error('Email notification failed:', error);
    recordAttempt('email', false, errorMessage(error));
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

  const failedProviders = deliveryAttempts
    .filter((attempt) => !attempt.ok)
    .map((attempt) => attempt.provider);

  console.info('[Feedback] delivery summary', {
    feedback_id: feedbackId,
    providers,
    failed_providers: failedProviders,
    delivery_attempts: deliveryAttempts,
  });

  res.status(201).json({
    data: {
      id: feedbackId,
      provider: providers[0] || 'local',
      providers,
      failed_providers: failedProviders,
      delivery_attempts: deliveryAttempts,
    },
  });
});
