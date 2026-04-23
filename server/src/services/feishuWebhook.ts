import axios from 'axios';

export type FeishuFeedbackPayload = {
  type: string;
  content: string;
  contact?: string;
  userEmail?: string;
  userId?: string;
  userNickname?: string;
};

function getTypeEmoji(type: string) {
  const map: Record<string, string> = {
    '功能建议': '💡',
    'bug': '🐛',
    '投诉': '😠',
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
          content: `${emoji} 邻里童享收到新反馈`,
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

export async function sendFeishuWebhookNotification(payload: FeishuFeedbackPayload): Promise<boolean> {
  if (!process.env.FEISHU_WEBHOOK_URL) {
    console.warn('[Feishu] FEISHU_WEBHOOK_URL not configured, skipping webhook');
    return false;
  }

  try {
    const body = buildWebhookPayload(payload);
    await axios.post(process.env.FEISHU_WEBHOOK_URL, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    console.log('[Feishu] Webhook notification sent successfully');
    return true;
  } catch (error: any) {
    console.error('[Feishu] Webhook notification failed:', error?.message);
    return false;
  }
}
