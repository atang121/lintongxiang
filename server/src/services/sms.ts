import * as tencentcloud from 'tencentcloud-sdk-nodejs';

// 短信服务 - 腾讯云
// 文档: https://cloud.tencent.com/document/product/1014

const SmsClient = (tencentcloud as any).sms.v20210111.Client;

interface SmsConfig {
  enabled: boolean;
  secretId: string;
  secretKey: string;
  sdkAppId: string;
  sign: string;
  templateId: string;
  region?: string;
}

interface SendCodeResult {
  success: boolean;
  provider: 'tencent' | 'preview' | 'mock';
  message?: string;
  preview_code?: string; // 开发模式下返回
  error?: string;
}

function getSmsConfig(): SmsConfig {
  return {
    enabled: process.env.SMS_ENABLED === 'true',
    secretId: process.env.TENCENT_SECRET_ID || process.env.TENCENTCLOUD_SECRET_ID || '',
    secretKey: process.env.TENCENT_SECRET_KEY || process.env.TENCENTCLOUD_SECRET_KEY || '',
    sdkAppId: process.env.TENCENT_SMS_SDK_APP_ID || process.env.TENCENT_SMS_APP_ID || '',
    sign: process.env.TENCENT_SMS_SIGN || '童邻市集',
    templateId: process.env.TENCENT_SMS_TEMPLATE_ID || '',
    region: process.env.TENCENT_SMS_REGION || 'ap-guangzhou',
  };
}

// 开发模式预览服务（未配置短信时使用）
async function sendPreviewCode(phone: string, code: string): Promise<SendCodeResult> {
  console.log(`📱 [SMS Preview] 短信预览 - 手机号: ${phone}, 验证码: ${code}`);
  return {
    success: true,
    provider: 'preview',
    preview_code: code, // 开发模式下直接返回验证码
    message: '开发模式：验证码在响应中返回',
  };
}

// 腾讯云短信发送
async function sendViaTencentSms(phone: string, code: string, config: SmsConfig): Promise<SendCodeResult> {
  try {
    const client = new SmsClient({
      credential: {
        secretId: config.secretId,
        secretKey: config.secretKey,
      },
      region: config.region,
    });

    // 手机号需要添加 +86 前缀（国际码）
    const phoneWithCountryCode = phone.startsWith('+86') ? phone : `+86${phone}`;

    const response = await client.SendSms({
      PhoneNumberSet: [phoneWithCountryCode],
      SmsSdkAppId: config.sdkAppId,
      SignName: config.sign,
      TemplateId: config.templateId,
      TemplateParamSet: [code], // 验证码
    });

    console.log(`✅ [SMS] 短信发送成功 - 手机号: ${phone}`, response);

    return {
      success: true,
      provider: 'tencent',
      message: '验证码已发送',
    };
  } catch (error: any) {
    console.error(`❌ [SMS] 短信发送失败 - 手机号: ${phone}`, error.message);
    return {
      success: false,
      provider: 'tencent',
      error: error.message || '短信发送失败',
    };
  }
}

// 发送登录验证码
export async function sendLoginCode(phone: string, code: string): Promise<SendCodeResult> {
  const config = getSmsConfig();

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return {
      success: false,
      provider: 'mock',
      error: '手机号格式不正确',
    };
  }

  // 如果未启用短信服务，使用预览模式
  if (!config.enabled || !config.secretId || !config.secretKey || !config.sdkAppId) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        provider: 'tencent',
        error: '短信服务未完成配置',
      };
    }
    console.warn('⚠️ [SMS] 短信服务未配置，使用预览模式');
    return sendPreviewCode(phone, code);
  }

  // 检查必要配置
  if (!config.templateId) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        provider: 'tencent',
        error: '短信模板未完成配置',
      };
    }
    console.warn('⚠️ [SMS] 短信模板ID未配置，使用预览模式');
    return sendPreviewCode(phone, code);
  }

  // 发送真实短信
  return sendViaTencentSms(phone, code, config);
}

// 发送注册验证码
export async function sendRegisterCode(phone: string, code: string): Promise<SendCodeResult> {
  // 注册验证码和登录验证码使用相同逻辑
  return sendLoginCode(phone, code);
}

// 健康检查
export function getSmsHealth(): { enabled: boolean; configured: boolean; provider: string } {
  const config = getSmsConfig();
  return {
    enabled: config.enabled,
    configured: Boolean(config.secretId && config.secretKey && config.sdkAppId && config.templateId),
    provider: config.enabled ? 'tencent' : 'preview',
  };
}
