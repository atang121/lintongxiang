import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app';
import { initDatabase, getOne, run } from '../src/models/db';
import { sendLoginCode } from '../src/services/sms';
import { invokeApp } from './helpers/invoke-app';

function withEnv<T>(patch: Record<string, string | undefined>, fn: () => Promise<T>) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(patch)) {
    previous[key] = process.env[key];
    if (patch[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = patch[key];
    }
  }

  return fn().finally(() => {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });
}

async function loginDevUser(app: ReturnType<typeof createApp>, nickname: string) {
  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: { nickname, community: '梧桐湾' },
  });
  assert.equal(response.status, 200);
  return {
    userId: response.json.data.user.id as string,
    token: response.json.data.token as string,
  };
}

test('production SMS configuration gaps do not return preview verification codes', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      SMS_ENABLED: 'false',
      TENCENT_SMS_APP_ID: undefined,
      TENCENT_SMS_APP_KEY: undefined,
      TENCENT_SMS_TEMPLATE_ID: undefined,
    },
    async () => {
      const result = await sendLoginCode('13800000000', '123456');

      assert.equal(result.success, false);
      assert.equal(result.preview_code, undefined);
    }
  );
});

test('uploaded image keys ignore unsafe category and filename extensions', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const { token } = await loginDevUser(app, '上传安全测试用户');

  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/uploads/images',
    headers: { authorization: `Bearer ${token}` },
    body: {
      category: '../public',
      file_name: 'payload.html',
      data_url: 'data:image/png;base64,aGVsbG8=',
    },
  });

  assert.equal(response.status, 201);
  assert.match(response.json.data.key, /^items\/\d{4}\/\d{2}\//);
  assert.equal(response.json.data.key.includes('..'), false);
  assert.equal(response.json.data.key.endsWith('.png'), true);
});

test('exchange queries require a participant or admin token', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const requester = await loginDevUser(app, '预约查询本人');
  const outsider = await loginDevUser(app, '预约查询旁观者');

  const item = getOne("SELECT * FROM items WHERE status = 'available' LIMIT 1") as Record<string, any>;
  assert.ok(item);

  const reserveResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: { authorization: `Bearer ${requester.token}` },
    body: {
      item_id: item.id,
      requester_id: requester.userId,
      owner_id: item.user_id,
      message: '想预约看看',
    },
  });
  assert.equal(reserveResponse.status, 201);

  const unauthenticated = await invokeApp(app, {
    method: 'GET',
    url: `/api/exchanges?item_id=${item.id}`,
  });
  assert.equal(unauthenticated.status, 401);

  const forbidden = await invokeApp(app, {
    method: 'GET',
    url: `/api/exchanges?item_id=${item.id}`,
    headers: { authorization: `Bearer ${outsider.token}` },
  });
  assert.equal(forbidden.status, 403);

  const allowed = await invokeApp(app, {
    method: 'GET',
    url: `/api/exchanges?item_id=${item.id}`,
    headers: { authorization: `Bearer ${requester.token}` },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.json.data.id, reserveResponse.json.data.id);
});

test('exchange creation derives owner from the item and rejects unavailable items', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const requester = await loginDevUser(app, '预约 owner 校验用户');
  const wrongOwner = await loginDevUser(app, '错误 owner');

  const item = getOne("SELECT * FROM items WHERE status = 'available' LIMIT 1") as Record<string, any>;
  assert.ok(item);

  const wrongOwnerResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: { authorization: `Bearer ${requester.token}` },
    body: {
      item_id: item.id,
      requester_id: requester.userId,
      owner_id: wrongOwner.userId,
      message: '尝试伪造 owner',
    },
  });
  assert.equal(wrongOwnerResponse.status, 400);

  run("UPDATE items SET status = 'deleted' WHERE id = ?", [item.id]);
  const deletedItemResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: { authorization: `Bearer ${requester.token}` },
    body: {
      item_id: item.id,
      requester_id: requester.userId,
      owner_id: item.user_id,
      message: '尝试预约下架物品',
    },
  });
  assert.equal(deletedItemResponse.status, 400);
});

test('public user profile responses do not expose contact or credential fields', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const { userId } = await loginDevUser(app, '用户脱敏测试');

  run(
    'UPDATE users SET phone = ?, email = ?, openid = ?, password_hash = ?, child_age_ranges = ?, child_count = ? WHERE id = ?',
    ['13800000001', 'private@example.com', 'openid-secret', 'hash-secret', '["3-6"]', 1, userId]
  );

  const response = await invokeApp(app, {
    method: 'GET',
    url: `/api/users/${userId}`,
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.data.phone, undefined);
  assert.equal(response.json.data.email, undefined);
  assert.equal(response.json.data.openid, undefined);
  assert.equal(response.json.data.password_hash, undefined);
  assert.equal(response.json.data.child_age_ranges, undefined);
  assert.equal(response.json.data.child_count, undefined);
});

test('users can self-deactivate while keeping audit records for safety', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const { userId, token } = await loginDevUser(app, '主动注销测试用户');

  run("UPDATE items SET user_id = ?, status = 'available' WHERE id = (SELECT id FROM items WHERE status = 'available' LIMIT 1)", [userId]);

  const response = await invokeApp(app, {
    method: 'DELETE',
    url: `/api/users/${userId}`,
    headers: { authorization: `Bearer ${token}` },
    body: { reason: '用户主动注销' },
  });

  assert.equal(response.status, 200);

  const user = getOne('SELECT status, status_reason FROM users WHERE id = ?', [userId]) as Record<string, any>;
  assert.equal(user.status, 'deactivated');
  assert.equal(user.status_reason, '用户主动注销');

  const item = getOne('SELECT status FROM items WHERE user_id = ? LIMIT 1', [userId]) as Record<string, any>;
  assert.equal(item.status, 'deleted');
});

test('admin item listing route is reachable before generic item detail route', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const { userId, token } = await loginDevUser(app, '管理员路由测试');
  run('UPDATE users SET is_admin = 1 WHERE id = ?', [userId]);

  const response = await invokeApp(app, {
    method: 'GET',
    url: '/api/items/admin/all',
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(response.json.data), true);
});

test('item publishing rejects pets and live animals before saving', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const { userId, token } = await loginDevUser(app, '活物禁发测试用户');
  run(
    "UPDATE users SET service_agreement_version = ?, service_agreement_confirmed_at = datetime('now') WHERE id = ?",
    ['2026-05-04', userId]
  );

  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/items',
    headers: { authorization: `Bearer ${token}` },
    body: {
      user_id: userId,
      title: '免费送小仓鼠',
      description: '孩子养不了，想找邻居领养活体小动物',
      images: ['https://example.com/hamster.png'],
      category: 'toy',
      age_range: '3-6',
      exchange_mode: 'free',
      condition: '健康',
      tags: ['宠物'],
      community: '梧桐湾',
      district: '东门口周边',
      listing_type: 'offer',
      agreement_confirmed: true,
      agreement_version: '2026-05-04',
    },
  });

  assert.equal(response.status, 422);
  assert.equal(response.json.code, 'LIVE_ANIMAL_FORBIDDEN');
  assert.equal(
    response.json.error,
    '平台禁止发布宠物、活体动物及相关领养、赠送、交易信息'
  );
});

test('item publishing rejects live-animal euphemisms without explicit species names', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const { userId, token } = await loginDevUser(app, '活物规避测试用户');
  run(
    "UPDATE users SET service_agreement_version = ?, service_agreement_confirmed_at = datetime('now') WHERE id = ?",
    ['2026-05-04', userId]
  );

  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/items',
    headers: { authorization: `Bearer ${token}` },
    body: {
      user_id: userId,
      title: '孩子的小伙伴不养了，名字叫皮蛋，谁喜欢',
      description: '会说话，带鸟笼一起给邻居',
      images: ['https://example.com/bird.png'],
      category: 'toy',
      age_range: '3-6',
      exchange_mode: 'gift',
      condition: '正常使用',
      tags: ['小伙伴'],
      community: '梧桐湾',
      district: '东门口周边',
      listing_type: 'offer',
      agreement_confirmed: true,
      agreement_version: '2026-05-04',
    },
  });

  assert.equal(response.status, 422);
  assert.equal(response.json.code, 'LIVE_ANIMAL_FORBIDDEN');
});

test('admin item deletion requires a reason and notifies the publisher', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const publisher = await loginDevUser(app, '删除通知发布者');
  const admin = await loginDevUser(app, '删除通知管理员');
  run('UPDATE users SET is_admin = 1 WHERE id = ?', [admin.userId]);
  run(
    "UPDATE users SET service_agreement_version = ?, service_agreement_confirmed_at = datetime('now') WHERE id = ?",
    ['2026-05-04', publisher.userId]
  );

  const createResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/items',
    headers: { authorization: `Bearer ${publisher.token}` },
    body: {
      user_id: publisher.userId,
      title: '普通绘本转让',
      description: '孩子读过的书',
      images: ['https://example.com/book.png'],
      category: 'book',
      age_range: '3-6',
      exchange_mode: 'gift',
      condition: '正常使用',
      tags: ['绘本'],
      community: '梧桐湾',
      district: '东门口周边',
      listing_type: 'offer',
      agreement_confirmed: true,
      agreement_version: '2026-05-04',
    },
  });
  assert.equal(createResponse.status, 201);
  const itemId = createResponse.json.data.id;

  const missingReason = await invokeApp(app, {
    method: 'DELETE',
    url: `/api/items/${itemId}`,
    headers: { authorization: `Bearer ${admin.token}` },
    body: {},
  });
  assert.equal(missingReason.status, 400);

  const deleteResponse = await invokeApp(app, {
    method: 'DELETE',
    url: `/api/items/${itemId}`,
    headers: { authorization: `Bearer ${admin.token}` },
    body: { reason: '测试删除原因' },
  });
  assert.equal(deleteResponse.status, 200);

  const item = getOne('SELECT status, delete_reason, deleted_by FROM items WHERE id = ?', [itemId]) as Record<string, any>;
  assert.equal(item.status, 'deleted');
  assert.equal(item.delete_reason, '测试删除原因');
  assert.equal(item.deleted_by, admin.userId);

  const notice = getOne(
    "SELECT * FROM notifications WHERE user_id = ? AND type = 'handling' AND related_item_id = ?",
    [publisher.userId, itemId]
  ) as Record<string, any> | null;
  assert.ok(notice);
  assert.equal(notice.title, '发布内容已被删除');
  assert.equal(String(notice.content).includes('测试删除原因'), true);
});

test('item publishing rejects protocol-forbidden food and medicine items', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const { userId, token } = await loginDevUser(app, '协议风控测试用户');
  run(
    "UPDATE users SET service_agreement_version = ?, service_agreement_confirmed_at = datetime('now') WHERE id = ?",
    ['2026-05-04', userId]
  );

  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/items',
    headers: { authorization: `Bearer ${token}` },
    body: {
      user_id: userId,
      title: '未拆封儿童奶粉转让',
      description: '家里买多了，想低价处理食品类物品',
      images: ['https://example.com/milk.png'],
      category: 'feeding',
      age_range: '0-3',
      exchange_mode: 'sell',
      condition: '全新',
      tags: ['奶粉'],
      community: '梧桐湾',
      district: '东门口周边',
      listing_type: 'offer',
      agreement_confirmed: true,
      agreement_version: '2026-05-04',
    },
  });

  assert.equal(response.status, 422);
  assert.equal(response.json.code, 'PROTOCOL_FORBIDDEN');
  assert.equal(response.json.category, 'food_medicine');
});

test('live animal guard does not block children books or toys that mention animal names', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const { userId, token } = await loginDevUser(app, '动物绘本测试用户');
  run(
    "UPDATE users SET service_agreement_version = ?, service_agreement_confirmed_at = datetime('now') WHERE id = ?",
    ['2026-05-04', userId]
  );

  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/items',
    headers: { authorization: `Bearer ${token}` },
    body: {
      user_id: userId,
      title: '猫和老鼠绘本',
      description: '孩子读过的童书，适合亲子阅读',
      images: ['https://example.com/book.png'],
      category: 'book',
      age_range: '3-6',
      exchange_mode: 'gift',
      condition: '正常使用',
      tags: ['绘本'],
      community: '梧桐湾',
      district: '东门口周边',
      listing_type: 'offer',
      agreement_confirmed: true,
      agreement_version: '2026-05-04',
    },
  });

  assert.equal(response.status, 201);
  assert.equal(response.json.data.title, '猫和老鼠绘本');
});

test('admins can publish a new service agreement version as structured content', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const { userId, token } = await loginDevUser(app, '协议管理测试管理员');
  run('UPDATE users SET is_admin = 1 WHERE id = ?', [userId]);

  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/admin/service-agreement',
    headers: { authorization: `Bearer ${token}` },
    body: {
      title: '用户服务协议',
      text: '第一条 平台仅提供信息展示。\n第二条 禁止发布宠物、活物及相关领养信息。',
      version: '2026-05-04-test',
      note: '测试发布',
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.data.version, '2026-05-04-test');
  assert.equal(response.json.data.documents['user-service-agreement'].paragraphs.length, 2);

  const latest = await invokeApp(app, {
    method: 'GET',
    url: '/api/admin/service-agreement',
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(latest.status, 200);
  assert.equal(latest.json.data.version, '2026-05-04-test');
  assert.equal(latest.json.data.note, '测试发布');
});

test('admins can reply to feedback and notify logged-in users in app', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const reporter = await loginDevUser(app, '反馈用户');
  const admin = await loginDevUser(app, '反馈管理员');
  run('UPDATE users SET is_admin = 1 WHERE id = ?', [admin.userId]);
  run(
    `INSERT INTO feedback_entries
       (id, user_id, user_email, type, content, contact, provider, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ['feedback_test_001', reporter.userId, '', '举报投诉', '有人发布不合适内容', '', 'local', 'submitted']
  );

  const list = await invokeApp(app, {
    method: 'GET',
    url: '/api/admin/feedback',
    headers: { authorization: `Bearer ${admin.token}` },
  });
  assert.equal(list.status, 200);
  assert.equal(list.json.data[0].id, 'feedback_test_001');

  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/admin/feedback/feedback_test_001/reply',
    headers: { authorization: `Bearer ${admin.token}` },
    body: { reply: '已收到，我们会核实处理。', status: 'replied' },
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.data.ok, true);
  assert.equal(response.json.data.notification_sent, true);

  const feedback = getOne('SELECT status, admin_reply, replied_by FROM feedback_entries WHERE id = ?', ['feedback_test_001']) as Record<string, any>;
  assert.equal(feedback.status, 'replied');
  assert.equal(feedback.admin_reply, '已收到，我们会核实处理。');
  assert.equal(feedback.replied_by, admin.userId);

  const notification = getOne(
    "SELECT * FROM notifications WHERE user_id = ? AND type = 'feedback' ORDER BY created_at DESC LIMIT 1",
    [reporter.userId]
  ) as Record<string, any> | null;
  assert.ok(notification);
  assert.equal(notification.title, '反馈处理回复');
  assert.match(String(notification.content), /已收到，我们会核实处理/);
});
