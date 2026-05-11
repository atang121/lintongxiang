import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app';
import { getOne, initDatabase, run } from '../src/models/db';
import { invokeApp } from './helpers/invoke-app';

async function loginUser(app: ReturnType<typeof createApp>, nickname: string) {
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

test('same-item reservations form a fair queue and cancellation promotes the next neighbor', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const first = await loginUser(app, '队列第一位');
  const second = await loginUser(app, '队列第二位');

  const item = getOne("SELECT * FROM items WHERE status = 'available' LIMIT 1") as Record<string, any>;
  assert.ok(item);

  const firstReserve = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: { authorization: `Bearer ${first.token}` },
    body: {
      item_id: item.id,
      requester_id: first.userId,
      owner_id: item.user_id,
      message: '我想第一个预约',
    },
  });
  assert.equal(firstReserve.status, 201);
  assert.equal(firstReserve.json.data.status, 'pending');
  assert.equal(firstReserve.json.data.queue_position, 1);
  assert.ok(firstReserve.json.data.active_until);

  const secondReserve = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: { authorization: `Bearer ${second.token}` },
    body: {
      item_id: item.id,
      requester_id: second.userId,
      owner_id: item.user_id,
      message: '我排候补',
    },
  });
  assert.equal(secondReserve.status, 201);
  assert.equal(secondReserve.json.data.status, 'waiting');
  assert.equal(secondReserve.json.data.queue_position, 2);

  const secondNotice = getOne(
    "SELECT * FROM notifications WHERE user_id = ? AND title = '已加入候补队列'",
    [second.userId]
  );
  assert.ok(secondNotice);

  const cancelFirst = await invokeApp(app, {
    method: 'PUT',
    url: `/api/exchanges/${firstReserve.json.data.id}/cancel`,
    headers: { authorization: `Bearer ${first.token}` },
    body: { actor_id: first.userId },
  });
  assert.equal(cancelFirst.status, 200);

  const promoted = getOne('SELECT * FROM exchanges WHERE id = ?', [secondReserve.json.data.id]) as Record<string, any>;
  assert.equal(promoted.status, 'pending');
  assert.equal(promoted.queue_position, 1);
  assert.ok(promoted.promoted_at);
  assert.ok(promoted.active_until);

  const promotionNotice = getOne(
    "SELECT * FROM notifications WHERE user_id = ? AND title = '轮到你预约了'",
    [second.userId]
  );
  assert.ok(promotionNotice);
});

test('requester can reserve again after cancelling a released reservation', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const requester = await loginUser(app, '取消后重新预约');

  const item = getOne("SELECT * FROM items WHERE status = 'available' LIMIT 1") as Record<string, any>;
  assert.ok(item);

  const firstReserve = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: { authorization: `Bearer ${requester.token}` },
    body: {
      item_id: item.id,
      requester_id: requester.userId,
      owner_id: item.user_id,
      message: '第一次预约',
    },
  });
  assert.equal(firstReserve.status, 201);
  assert.equal(firstReserve.json.data.status, 'pending');

  const cancelFirst = await invokeApp(app, {
    method: 'PUT',
    url: `/api/exchanges/${firstReserve.json.data.id}/cancel`,
    headers: { authorization: `Bearer ${requester.token}` },
    body: { actor_id: requester.userId },
  });
  assert.equal(cancelFirst.status, 200);
  assert.equal(cancelFirst.json.data.status, 'cancelled');

  const secondReserve = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: { authorization: `Bearer ${requester.token}` },
    body: {
      item_id: item.id,
      requester_id: requester.userId,
      owner_id: item.user_id,
      message: '重新预约',
    },
  });
  assert.equal(secondReserve.status, 201);
  assert.notEqual(secondReserve.json.data.id, firstReserve.json.data.id);
  assert.equal(secondReserve.json.data.status, 'pending');

  const oldExchange = getOne('SELECT * FROM exchanges WHERE id = ?', [firstReserve.json.data.id]) as Record<string, any>;
  assert.equal(oldExchange.status, 'cancelled');
});

test('expired active reservations are released and the next waiting neighbor is reminded', async () => {
  await initDatabase({ forceReset: true });
  const app = createApp();
  const first = await loginUser(app, '超时第一位');
  const second = await loginUser(app, '超时第二位');

  const item = getOne("SELECT * FROM items WHERE status = 'available' LIMIT 1") as Record<string, any>;
  assert.ok(item);

  const firstReserve = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: { authorization: `Bearer ${first.token}` },
    body: {
      item_id: item.id,
      requester_id: first.userId,
      owner_id: item.user_id,
      message: '先预约',
    },
  });
  assert.equal(firstReserve.status, 201);

  const secondReserve = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: { authorization: `Bearer ${second.token}` },
    body: {
      item_id: item.id,
      requester_id: second.userId,
      owner_id: item.user_id,
      message: '我等候补',
    },
  });
  assert.equal(secondReserve.status, 201);
  assert.equal(secondReserve.json.data.status, 'waiting');

  run("UPDATE exchanges SET active_until = '2000-01-01 00:00:00' WHERE id = ?", [firstReserve.json.data.id]);

  const expireResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges/expire-stale',
    headers: { authorization: `Bearer ${second.token}` },
  });
  assert.equal(expireResponse.status, 200);
  assert.equal(expireResponse.json.data.expired, 1);
  assert.equal(expireResponse.json.data.promoted, 1);

  const expired = getOne('SELECT * FROM exchanges WHERE id = ?', [firstReserve.json.data.id]) as Record<string, any>;
  const promoted = getOne('SELECT * FROM exchanges WHERE id = ?', [secondReserve.json.data.id]) as Record<string, any>;
  assert.equal(expired.status, 'expired');
  assert.equal(promoted.status, 'pending');

  const reminder = getOne(
    "SELECT * FROM notifications WHERE user_id = ? AND title = '轮到你预约了'",
    [second.userId]
  );
  assert.ok(reminder);
});
