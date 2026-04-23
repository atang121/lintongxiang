import { resolveApiBaseUrl } from '@/lib/env';

export const DEMO_ADMIN_HEADER = 'x-demo-admin-token';
export const DEFAULT_DEMO_ADMIN_TOKEN =
  process.env.NEXT_PUBLIC_DEMO_ADMIN_TOKEN || 'local-demo-reset';

export async function resetDemoData(token = DEFAULT_DEMO_ADMIN_TOKEN) {
  const response = await fetch(`${resolveApiBaseUrl()}/admin/reset-demo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [DEMO_ADMIN_HEADER]: token,
    },
  });

  const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
  if (!response.ok) {
    throw new Error(payload.error || '演示数据重置失败');
  }

  return payload;
}
