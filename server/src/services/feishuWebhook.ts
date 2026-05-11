import axios from 'axios';

export type FeishuFeedbackPayload = {
  type: string;
  content: string;
  contact?: string;
  userEmail?: string;
  userId?: string;
  userNickname?: string;
};

export type FeishuWebhookDelivery = {
  ok: boolean;
  reason?: string;
};

function getTypeEmoji(type: string) {
  const map: Record<string, string> = {
    '功能建议': '💡',
    '建议': '💡',
    'bug': '🐛',
    '举报投诉': '😠',
    '投诉': '😠',
    '物品问题': '📦',
    '其他': '💬',
  };
  return map[type] || '📩';
}

function buildWebhookPayload(payload: FeishuFeedbackPayload) {
  const emoji = getTypeEmoji(payload.type);
  const content = payload.content.length > 200 
    ? payload.content.slice(0, 200) + '...' 
    : payload.content;

  return {
    msg_type: 'interactive',
    card: {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: 'plain_text',
          content: `${emoji} 童邻市集收到新反馈`,
        },
        template: 'purple',
      },
      elements: [
        {
          tag: 'div',
          fields: [
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**反馈类型**\n${payload.type}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**联系方式**\n${payload.contact || '未填写'}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**用户邮箱**\n${payload.userEmail || '未登录用户'}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**提交时间**\n${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
              },
            },
          ],
        },
        {
          tag: 'hr',
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**反馈内容**\n${content}`,
          },
        },
      ],
    },
  };
}

export async function sendFeishuWebhookNotification(payload: FeishuFeedbackPayload): Promise<FeishuWebhookDelivery> {
  if (!process.env.FEISHU_WEBHOOK_URL) {
    console.warn('[Feishu] FEISHU_WEBHOOK_URL not configured, skipping webhook');
    return { ok: false, reason: 'FEISHU_WEBHOOK_URL 未配置' };
  }

  try {
    const body = buildWebhookPayload(payload);
    const response = await axios.post(process.env.FEISHU_WEBHOOK_URL, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    const statusCode = response.data?.StatusCode ?? response.data?.code ?? 0;
    if (statusCode !== 0) {
      const reason = response.data?.StatusMessage || response.data?.msg || `飞书机器人返回错误码 ${statusCode}`;
      console.error('[Feishu] Webhook notification rejected:', reason);
      return { ok: false, reason };
    }
    console.log('[Feishu] Webhook notification sent successfully');
    return { ok: true };
  } catch (error: any) {
    const reason = error?.response?.data?.StatusMessage || error?.response?.data?.msg || error?.message || '飞书机器人请求失败';
    console.error('[Feishu] Webhook notification failed:', reason);
    return { ok: false, reason };
  }
}
