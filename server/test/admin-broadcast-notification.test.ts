import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app';
import { initDatabase, getOne } from '../src/models/db';
import { invokeApp } from './helpers/invoke-app';

async function loginUser(app: ReturnType<typeof createApp>, nickname: string, community: string) {
  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: { nickname, community },
  });
  assert.equal(response.status, 200);
  return {
    userId: response.json.data.user.id as string,
    token: response.json.data.token as string,
  };
}

test('admin broadcast can target selected users without notifying everyone', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const target = await loginUser(app, '定向通知用户', '梧桐湾');
  const other = await loginUser(app, '不应收到通知用户', '清华园');

  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/admin/broadcast-notification',
    headers: { 'x-admin-token': 'local-demo-reset' },
    body: {
      title: '反馈处理说明',
      content: '你的反馈已处理。',
      type: 'handling',
      audience: 'users',
      user_ids: [target.userId],
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.data.sent_count, 1);

  const targetNotification = getOne(
    'SELECT * FROM notifications WHERE user_id = ? AND title = ?',
    [target.userId, '反馈处理说明']
  ) as Record<string, any> | null;
  const otherNotification = getOne(
    'SELECT * FROM notifications WHERE user_id = ? AND title = ?',
    [other.userId, '反馈处理说明']
  ) as Record<string, any> | null;

  assert.equal(targetNotification?.type, 'handling');
  assert.equal(otherNotification, null);
});

test('admin broadcast rejects automatic private-message and exchange notification types', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();

  for (const type of ['message', 'exchange']) {
    const response = await invokeApp(app, {
      method: 'POST',
      url: '/api/admin/broadcast-notification',
      headers: { 'x-admin-token': 'local-demo-reset' },
      body: {
        title: '不应发送',
        content: '自动通知类型不能手动广播。',
        type,
      },
    });

    assert.equal(response.status, 400);
  }
});
