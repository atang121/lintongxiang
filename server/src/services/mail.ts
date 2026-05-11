import nodemailer from 'nodemailer';

export type MailMode = 'preview' | 'smtp';

export type MailDeliveryResult = {
  provider: MailMode;
  delivered_to: string;
  preview_code?: string;
  message_id?: string;
};

/** HTML 转义，防止邮件 XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type SendLoginCodePayload = {
  email: string;
  code: string;
  expiresInMinutes: number;
};

export type SendFeedbackPayload = {
  type: string;
  content: string;
  contact?: string;
  userEmail?: string;
  userId?: string;
};

export interface MailService {
  getMode: () => MailMode;
  sendLoginCode: (payload: SendLoginCodePayload) => Promise<MailDeliveryResult>;
  sendFeedbackNotification?: (payload: SendFeedbackPayload) => Promise<MailDeliveryResult>;
}

let serviceOverride: MailService | null = null;
let serviceInstance: MailService | null = null;

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function createMailService(): MailService {
  if (!hasSmtpConfig()) {
    return {
      getMode: () => 'preview',
      async sendLoginCode({ email, code }) {
        return {
          provider: 'preview',
          delivered_to: email,
          preview_code: code,
        };
      },
      async sendFeedbackNotification(payload) {
        return {
          provider: 'preview',
          delivered_to: process.env.FEEDBACK_RECEIVER || process.env.SMTP_USER || payload.contact || 'local-feedback-box',
        };
      },
    };
  }

  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@qq.com';
  const feedbackReceiver = process.env.FEEDBACK_RECEIVER || process.env.SUPPORT_EMAIL || process.env.SMTP_USER || '';

  return {
    getMode: () => 'smtp',
    async sendLoginCode({ email, code, expiresInMinutes }) {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject: '童邻市集验证码',
        text: `你的验证码是 ${code}，${expiresInMinutes} 分钟内有效。若不是你本人操作，请忽略此邮件。`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;color:#1f3a30;">
            <h2 style="margin-bottom:12px;">童邻市集验证码</h2>
            <p style="margin:0 0 12px;">你好，以下是本次登录验证码：</p>
            <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0 16px;">${code}</div>
            <p style="margin:0 0 8px;">验证码 <strong>${expiresInMinutes} 分钟内有效</strong>。</p>
            <p style="margin:0;color:#6b7d74;">若不是你本人操作，请忽略这封邮件。</p>
          </div>
        `,
      });

      return {
        provider: 'smtp',
        delivered_to: email,
        message_id: info.messageId,
      };
    },
    async sendFeedbackNotification({ type, content, contact, userEmail, userId }) {
      if (!feedbackReceiver) {
        return {
          provider: 'preview',
          delivered_to: 'local-feedback-box',
        };
      }

      const info = await transporter.sendMail({
        from,
        to: feedbackReceiver,
        subject: `童邻市集反馈：${type}`,
        text: [
          `反馈类型：${type}`,
          userId ? `用户 ID：${userId}` : '',
          userEmail ? `登录邮箱：${userEmail}` : '',
          contact ? `联系方式：${contact}` : '',
          '',
          '反馈内容：',
          content,
        ]
          .filter(Boolean)
          .join('\n'),
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;color:#1f3a30;line-height:1.7;">
            <h2 style="margin:0 0 16px;">童邻市集反馈</h2>
            <p style="margin:0 0 8px;"><strong>反馈类型：</strong>${type}</p>
            ${userId ? `<p style="margin:0 0 8px;"><strong>用户 ID：</strong>${userId}</p>` : ''}
            ${userEmail ? `<p style="margin:0 0 8px;"><strong>登录邮箱：</strong>${userEmail}</p>` : ''}
            ${contact ? `<p style="margin:0 0 8px;"><strong>联系方式：</strong>${contact}</p>` : ''}
            <div style="margin-top:16px;padding:16px;border-radius:14px;background:#f6f4ef;">
              <div style="font-weight:700;margin-bottom:8px;">反馈内容</div>
              <div style="white-space:pre-wrap;">${escapeHtml(content)}</div>
            </div>
          </div>
        `,
      });

      return {
        provider: 'smtp',
        delivered_to: feedbackReceiver,
        message_id: info.messageId,
      };
    },
  };
}

export function getMailService() {
  if (serviceOverride) return serviceOverride;
  if (!serviceInstance) {
    serviceInstance = createMailService();
  }
  return serviceInstance;
}

export function setMailServiceForTests(service: MailService) {
  serviceOverride = service;
  serviceInstance = null;
}

export function resetMailServiceForTests() {
  serviceOverride = null;
  serviceInstance = null;
}
