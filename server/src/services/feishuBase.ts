import axios from 'axios';

import { CommunityOption, OpsConfig } from '../config/opsFallback';

type FeishuRecord = {
  record_id?: string;
  fields?: Record<string, unknown>;
};

let tenantTokenCache: { token: string; expiresAt: number } | null = null;

function isTruthy(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'TRUE' || value === 'yes';
}

function extractFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
          return String(entry);
        }
        if (entry && typeof entry === 'object') {
          const typedEntry = entry as Record<string, unknown>;
          if (typeof typedEntry.text === 'string') return typedEntry.text;
          if (typeof typedEntry.name === 'string') return typedEntry.name;
          if (typeof typedEntry.value === 'string') return typedEntry.value;
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }
  if (value && typeof value === 'object') {
    const typedValue = value as Record<string, unknown>;
    if (typeof typedValue.text === 'string') return typedValue.text;
    if (typeof typedValue.name === 'string') return typedValue.name;
  }
  return '';
}

function getField(fields: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    if (alias in fields) return fields[alias];
  }
  return undefined;
}

function getNumberField(fields: Record<string, unknown>, aliases: string[], fallback = 0) {
  const raw = getField(fields, aliases);
  const value = Number(extractFieldValue(raw));
  return Number.isFinite(value) ? value : fallback;
}

function getBooleanField(fields: Record<string, unknown>, aliases: string[], fallback = true) {
  const raw = getField(fields, aliases);
  if (raw === undefined) return fallback;
  return isTruthy(extractFieldValue(raw) || raw);
}

export function isFeishuBaseConfigured() {
  return Boolean(
    process.env.FEISHU_APP_ID &&
      process.env.FEISHU_APP_SECRET &&
      process.env.FEISHU_BASE_TOKEN
  );
}

function normalizePublicUrl(value?: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (
      url.hostname === '127.0.0.1' ||
      url.hostname === 'localhost' ||
      url.hostname === '0.0.0.0'
    ) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

async function getTenantAccessToken() {
  if (!process.env.FEISHU_APP_ID || !process.env.FEISHU_APP_SECRET) {
    throw new Error('Feishu app credentials are not configured');
  }

  if (tenantTokenCache && tenantTokenCache.expiresAt > Date.now() + 60_000) {
    return tenantTokenCache.token;
  }

  const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: process.env.FEISHU_APP_ID,
    app_secret: process.env.FEISHU_APP_SECRET,
  });

  const token = response.data?.tenant_access_token;
  const expire = Number(response.data?.expire || 7200);
  if (!token) {
    throw new Error('Failed to acquire Feishu tenant access token');
  }

  tenantTokenCache = {
    token,
    expiresAt: Date.now() + expire * 1000,
  };

  return token;
}

async function listTableRecords(tableId: string) {
  const accessToken = await getTenantAccessToken();
  const response = await axios.get(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_TOKEN}/tables/${tableId}/records`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        page_size: 200,
      },
    }
  );

  if (response.data?.code && response.data.code !== 0) {
    throw new Error(response.data?.msg || 'Feishu list records failed');
  }

  return (response.data?.data?.items || []) as FeishuRecord[];
}

async function createTableRecord(tableId: string, fields: Record<string, unknown>) {
  const accessToken = await getTenantAccessToken();
  const response = await axios.post(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_TOKEN}/tables/${tableId}/records`,
    { fields },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.data?.code && response.data.code !== 0) {
    throw new Error(response.data?.msg || 'Feishu create record failed');
  }
}

function normalizeFeedbackType(type: string) {
  return String(type || '').trim() === '投诉' ? '举报投诉' : String(type || '').trim();
}

export async function loadCommunitiesFromFeishu(): Promise<CommunityOption[]> {
  if (!isFeishuBaseConfigured() || !process.env.FEISHU_COMMUNITIES_TABLE_ID) {
    return [];
  }

  const records = await listTableRecords(process.env.FEISHU_COMMUNITIES_TABLE_ID);

  return records
    .map((record, index) => {
      const fields = record.fields || {};
      return {
        name: extractFieldValue(getField(fields, ['小区名', '小区名称', '名称', 'name'])),
        district: extractFieldValue(getField(fields, ['区县', '区域', 'district'])),
        lat: getNumberField(fields, ['纬度', 'lat', 'latitude']),
        lng: getNumberField(fields, ['经度', 'lng', 'longitude']),
        enabled: getBooleanField(fields, ['启用', 'enabled', '是否启用'], true),
        sort: getNumberField(fields, ['排序', 'sort', '排序值'], (index + 1) * 10),
      };
    })
    .filter((community) => community.name && community.lat && community.lng)
    .filter((community) => community.enabled !== false)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0));
}

export async function loadOpsConfigFromFeishu(): Promise<Partial<OpsConfig>> {
  if (!isFeishuBaseConfigured() || !process.env.FEISHU_OPS_CONFIG_TABLE_ID) {
    return {};
  }

  const records = await listTableRecords(process.env.FEISHU_OPS_CONFIG_TABLE_ID);
  if (records.length === 0) return {};

  const firstFields = records[0].fields || {};
  const keyFieldExists = Boolean(getField(firstFields, ['key', '键', '配置项', '配置键']));

  if (keyFieldExists) {
    const config: Record<string, string> = {};
    for (const record of records) {
      const fields = record.fields || {};
      const key = extractFieldValue(getField(fields, ['key', '键', '配置项', '配置键']));
      const value = extractFieldValue(getField(fields, ['value', '值', '配置值']));
      if (key) config[key] = value;
    }
    return {
      auth_mode: config.auth_mode === 'phone_code' ? 'phone_code' : undefined,
      require_publish_review: config.require_publish_review ? isTruthy(config.require_publish_review) : undefined,
      image_upload_provider: config.image_upload_provider || undefined,
      image_upload_max_count: config.image_upload_max_count ? Number(config.image_upload_max_count) : undefined,
      image_upload_max_mb: config.image_upload_max_mb ? Number(config.image_upload_max_mb) : undefined,
      announcement: config.announcement || undefined,
      support_contact: config.support_contact || undefined,
    };
  }

  return {
    auth_mode: extractFieldValue(getField(firstFields, ['auth_mode', '认证方式'])) === 'phone_code'
      ? 'phone_code'
      : undefined,
    require_publish_review: getField(firstFields, ['require_publish_review', '发布需审核']) !== undefined
      ? getBooleanField(firstFields, ['require_publish_review', '发布需审核'])
      : undefined,
    image_upload_provider: extractFieldValue(getField(firstFields, ['image_upload_provider', '图片上传服务'])) || undefined,
    image_upload_max_count: getField(firstFields, ['image_upload_max_count', '图片上限']) !== undefined
      ? getNumberField(firstFields, ['image_upload_max_count', '图片上限'])
      : undefined,
    image_upload_max_mb: getField(firstFields, ['image_upload_max_mb', '图片大小限制']) !== undefined
      ? getNumberField(firstFields, ['image_upload_max_mb', '图片大小限制'])
      : undefined,
    announcement: extractFieldValue(getField(firstFields, ['announcement', '公告'])) || undefined,
    support_contact: extractFieldValue(getField(firstFields, ['support_contact', '客服邮箱'])) || undefined,
  };
}

export async function createFeedbackRecordInFeishu(payload: {
  feedbackId: string;
  type: string;
  content: string;
  contact?: string;
  userEmail?: string;
  userId?: string;
  userNickname?: string;
  community?: string;
}) {
  if (!isFeishuBaseConfigured() || !process.env.FEISHU_FEEDBACK_TABLE_ID) {
    return false;
  }

  const fields: Record<string, unknown> = {
    类型: normalizeFeedbackType(payload.type),
    内容: payload.content,
    联系方式: payload.contact || '',
    user_id: payload.userId || '',
    昵称: payload.userNickname || payload.userEmail || '匿名',
    小区: payload.community || '未知',
    状态: '待处理',
    提交时间: Date.now(),
  };

  try {
    await createTableRecord(process.env.FEISHU_FEEDBACK_TABLE_ID, fields);
    return true;
  } catch (error) {
    console.error('[Feishu] createFeedbackRecord failed:', error);
    return false;
  }
}

export async function createReviewRecordInFeishu(payload: {
  itemId: string;
  title: string;
  ownerId: string;
  ownerNickname: string;
  community: string;
  coverImage?: string;
}) {
  if (!isFeishuBaseConfigured() || !process.env.FEISHU_REVIEW_TABLE_ID) {
    return false;
  }

  const coverImage = normalizePublicUrl(payload.coverImage);
  const fields: Record<string, unknown> = {
    item_id: payload.itemId,
    标题: payload.title,
    owner_id: payload.ownerId,
    发布人: payload.ownerNickname,
    小区: payload.community,
    状态: '待审核',
    提交时间: Date.now(),
  };

  if (coverImage) {
    fields.cover_image = coverImage;
  }

  await createTableRecord(process.env.FEISHU_REVIEW_TABLE_ID, fields);

  return true;
}
