/**
 * API 服务层
 * 统一封装所有后端接口，自动连接真实后端
 */

import { resolveApiBaseUrl } from './env';

export interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.localStorage?.getItem !== 'function') return null;
  return window.localStorage.getItem('token');
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

const FETCH_TIMEOUT_MS = 20000;

// 通用请求函数（自动附加 token）
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${resolveApiBaseUrl()}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e: unknown) {
    const name = e instanceof Error ? e.name : '';
    if (name === 'AbortError') {
      throw new Error('请求超时，请检查手机与电脑是否同一 Wi‑Fi，或稍后再试');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    // 401 表示 token 过期，自动清除本地登录态
    if (res.status === 401 && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('user');
    }
    if (res.status === 428 && err.code === 'SERVICE_AGREEMENT_REQUIRED' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tonglin:service-agreement-required'));
    }
    // 422 表示敏感词拦截，透传详细信息
    if (res.status === 422) {
      const sensitiveErr = new Error(err.error || '内容包含敏感词');
      (sensitiveErr as any).sensitive_words = err.sensitive_words || [];
      (sensitiveErr as any).categories = err.categories || [];
      (sensitiveErr as any).isSensitiveError = true;
      (sensitiveErr as any).code = err.code;
      throw sensitiveErr;
    }
    const apiError = new Error(err.error || `API Error: ${res.status}`);
    (apiError as any).status = res.status;
    (apiError as any).code = err.code;
    throw apiError;
  }

  return res.json();
}

// ===== API 导出 =====

export const api = {
  items: {
    // 获取物品列表
    getList: (params?: {
      category?: string;
      age_range?: string;
      exchange_mode?: string;
      status?: string;
    }) => {
      if (!params) return fetchApi<{ data: any[]; total: number }>('/items');
      return fetchApi<{ data: any[]; total: number }>(
        `/items${buildQuery(params)}`
      );
    },
    getById: (id: string) => fetchApi<{ data: any }>(`/items/${id}`),
    create: (data: any) =>
      fetchApi<{ data: { id: string } }>('/items', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchApi<{ data: any }>(`/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<{ data: string }>(`/items/${id}`, { method: 'DELETE' }),
    relist: (id: string) =>
      fetchApi<{ data: string }>(`/items/${id}/relist`, { method: 'PUT' }),
  },
  users: {
    getById: (id: string) => fetchApi<{ data: any }>(`/users/${id}`),
    create: (data: any) =>
      fetchApi<{ data: any; isNew: boolean }>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchApi<{ data: any }>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deactivate: (id: string) =>
      fetchApi<{ data: { ok: boolean; status: string } }>(`/users/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: '用户主动注销' }),
      }),
    getMyItems: (id: string) =>
      fetchApi<{ data: any[] }>(`/users/${id}/items`),
  },
  messages: {
    getList: (userId: string, itemId?: string) =>
      fetchApi<{ data: any[] }>(`/messages?user_id=${userId}${itemId ? `&item_id=${itemId}` : ''}`),
    send: (data: { item_id: string; from_user_id: string; to_user_id: string; content: string }) =>
      fetchApi<{ data: any }>('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getConversations: (userId: string) =>
      fetchApi<{ data: any[] }>(`/messages/conversations?user_id=${userId}`),
    markRead: (id: string) =>
      fetchApi<{ data: string }>(`/messages/${id}/read`, { method: 'PUT' }),
  },
  notifications: {
    list: (userId: string) =>
      fetchApi<{ data: any[] }>(`/notifications${buildQuery({ user_id: userId })}`),
    markRead: (id: string) =>
      fetchApi<{ data: string }>(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: (userId: string, ids?: string[]) =>
      fetchApi<{ data: { updated: number } }>('/notifications/read-all', {
        method: 'PUT',
        body: JSON.stringify(ids && ids.length > 0 ? { ids } : { all: true, user_id: userId }),
      }),
  },
  exchanges: {
    list: (params: { item_id?: string; user_id?: string; status?: string }) =>
      fetchApi<{ data: any[] | any | null }>(`/exchanges${buildQuery(params)}`),
    create: (data: { item_id: string; requester_id: string; owner_id: string; message?: string }) =>
      fetchApi<{ data: any }>('/exchanges', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    complete: (id: string, actor_id?: string) =>
      fetchApi<{ data: any }>(`/exchanges/${id}/complete`, {
        method: 'PUT',
        body: JSON.stringify(actor_id ? { actor_id } : {}),
      }),
    cancel: (id: string, actor_id: string) =>
      fetchApi<{ data: any }>(`/exchanges/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ actor_id }),
      }),
    fail: (id: string, actor_id: string, reason?: string) =>
      fetchApi<{ data: any }>(`/exchanges/${id}/fail`, {
        method: 'PUT',
        body: JSON.stringify({ actor_id, reason }),
      }),
  },
  auth: {
    login: (data: { nickname: string; community?: string; lat?: number; lng?: number; phone?: string }) =>
      fetchApi<{ data: { token: string; user: any } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    sendCode: (data: { phone: string }) =>
      fetchApi<{ data: { phone: string; expires_in_seconds: number; cooldown_seconds: number; preview_code?: string; provider: string } }>('/auth/send-code', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    verifyCode: (data: { phone: string; code: string; service_agreement_accepted?: boolean; service_agreement_source?: string }) =>
      fetchApi<{ data: { need_profile_completion: boolean; token?: string; temporary_token?: string; user?: any; profile_draft?: any } }>('/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    setupProfile: (data: { temporary_token: string; nickname: string; community: string; district?: string; child_age_ranges?: string[]; child_count?: number; service_agreement_accepted?: boolean; service_agreement_source?: string }) =>
      fetchApi<{ data: { token: string; user: any } }>('/auth/setup-profile', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    register: (data: { email: string; password: string; verification_code: string; nickname?: string; community?: string; phone?: string }) =>
      fetchApi<{ data: { token: string; user: any } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    sendRegisterCode: (data: { email: string }) =>
      fetchApi<{ data: { email: string; code: string; hint: string } }>('/auth/send-register-code', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    emailLogin: (data: { email: string; password: string }) =>
      fetchApi<{ data: { token: string; user: any } }>('/auth/email-login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    forgotPassword: (data: { email: string }) =>
      fetchApi<{ data: { email: string; reset_code: string; demo_hint: string } }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    resetPassword: (data: { email: string; reset_code: string; new_password: string }) =>
      fetchApi<{ data: { reset: boolean } }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => fetchApi<{ data: any }>('/auth/me'),
    acceptServiceAgreement: (data?: { source?: string }) =>
      fetchApi<{ data: any }>('/auth/accept-service-agreement', {
        method: 'POST',
        body: JSON.stringify(data || { source: 'account' }),
      }),
  },
  uploads: {
    uploadImage: (data: { data_url: string; file_name?: string; category?: string }) =>
      fetchApi<{ data: { url: string; key: string; provider: string; mime_type: string; size: number } }>('/uploads/images', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  ops: {
    bootstrap: () =>
      fetchApi<{ data: { communities: any[]; config: any; source: { feishu_enabled: boolean; mail_provider: 'preview' | 'smtp'; image_upload_provider: string; image_upload_ready: boolean } } }>('/ops/bootstrap'),
  },
  legal: {
    getServiceAgreement: () =>
      fetchApi<any>('/legal/service-agreement'),
  },
  wechat: {
    getSignature: (url: string) =>
      fetchApi<{ data: any }>(`/wechat/signature?url=${encodeURIComponent(url)}`),
  },
  feedback: {
    submit: (data: { type: string; content: string; contact?: string }) =>
      fetchApi<{
        data: {
          id: string;
          provider: string;
          providers: string[];
          failed_providers: string[];
          delivery_attempts: Array<{ provider: string; ok: boolean; reason?: string }>;
        };
      }>('/feedback', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  behavior: {
    recordView: (data: { item_id: string; category?: string; age_range?: string }) =>
      fetchApi<{ data: { ok: boolean } }>('/behavior/view', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    recordSearch: (data: { keyword: string; result_count?: number }) =>
      fetchApi<{ data: { ok: boolean } }>('/behavior/search', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  admin: {
    resetDemo: (token: string) =>
      fetchApi<{ data: { reset: boolean } }>('/admin/reset-demo', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      }),
    getAllItems: (params?: { keyword?: string; status?: string }) =>
      fetchApi<{ data: any[]; total: number }>(
        `/items/admin/all${params ? buildQuery(params as Record<string, string>) : ''}`
      ),
    deleteItem: (id: string, reason?: string) =>
      fetchApi<{ data: string }>(`/items/${id}`, {
        method: 'DELETE',
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    restoreItem: (id: string) =>
      fetchApi<{ data: string }>(`/items/${id}/restore`, { method: 'PUT' }),
    broadcastNotification: (data: { title: string; content: string; type?: string; audience?: 'all' | 'community' | 'users'; community?: string; user_ids?: string[] }, token: string) =>
      fetchApi<{ data: { sent_count: number; notification_id: string } }>('/admin/broadcast-notification', {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: JSON.stringify(data),
      }),
    getUsers: (params?: { keyword?: string; limit?: number; offset?: number }) =>
      fetchApi<{ data: any[] }>(
        `/admin/users${params ? buildQuery(params as Record<string, string>) : ''}`
      ),
    setAdmin: (userId: string, isAdmin: boolean) =>
      fetchApi<{ data: { ok: boolean } }>(`/admin/users/${userId}/set-admin`, {
        method: 'POST',
        body: JSON.stringify({ isAdmin }),
      }),
    setUserStatus: (userId: string, status: string, reason?: string) =>
      fetchApi<{ data: { ok: boolean; status: string } }>(`/admin/users/${userId}/set-status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      }),
    getSensitiveWords: () =>
      fetchApi<{ data: Array<Record<string, string>> }>('/admin/sensitive-words'),
    addSensitiveWord: (word: string, category: string) =>
      fetchApi<{ data: { ok: boolean } }>('/admin/sensitive-words', {
        method: 'POST',
        body: JSON.stringify({ word, category }),
      }),
    deleteSensitiveWord: (word: string) =>
      fetchApi<{ data: { ok: boolean } }>(`/admin/sensitive-words/${encodeURIComponent(word)}`, {
        method: 'DELETE',
      }),
    reloadSensitiveWords: () =>
      fetchApi<{ data: { ok: boolean } }>('/admin/sensitive-words/reload', {
        method: 'POST',
      }),
    getServiceAgreement: () =>
      fetchApi<{ data: any }>('/admin/service-agreement'),
    getFeedback: (params?: { status?: string; limit?: number; offset?: number }) =>
      fetchApi<{ data: any[]; total: number }>(
        `/admin/feedback${params ? buildQuery(params as Record<string, string>) : ''}`
      ),
    replyFeedback: (id: string, data: { reply?: string; status?: string }) =>
      fetchApi<{ data: { ok: boolean; status: string; notification_sent: boolean } }>(`/admin/feedback/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    publishServiceAgreement: (data: { title: string; text: string; version: string; note?: string; summary?: string; source?: string }) =>
      fetchApi<{ data: any }>('/admin/service-agreement', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    extractServiceAgreementText: (data: { file_name: string; data_url: string }) =>
      fetchApi<{ data: { text: string } }>('/admin/service-agreement/extract', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getStats: () =>
      fetchApi<{
        data: {
          users: { total: number; newToday: number };
          items: { total: number; active: number; newToday: number };
          exchanges: { total: number; completed: number; pending: number; cancelled: number; failed: number };
          pendingReviews: number;
        }
      }>('/admin/stats'),
    getExchanges: (params?: { status?: string; limit?: number; offset?: number }) =>
      fetchApi<{ data: any[]; total: number }>(
        `/admin/exchanges${params ? buildQuery(params as Record<string, string>) : ''}`
      ),
    setExchangeStatus: (id: string, status: string, reason?: string) =>
      fetchApi<{ data: { ok: boolean; status: string } }>(`/admin/exchanges/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason }),
      }),
  },
};
