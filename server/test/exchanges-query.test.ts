import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app';
import { initDatabase } from '../src/models/db';
import { invokeApp } from './helpers/invoke-app';

test('can fetch the latest exchange for an item', async () => {
  await initDatabase({ forceReset: true });

  const app = createApp();

  const itemsResponse = await invokeApp(app, {
    method: 'GET',
    url: '/api/items',
  });
  assert.equal(itemsResponse.status, 200);

  const reservableItem = itemsResponse.json.data.find(
    (item: { status: string }) => item.status === 'available'
  );
  assert.ok(reservableItem);

  const loginResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: {
      nickname: '查询预约的测试用户',
      community: '建华路社区',
    },
  });
  assert.equal(loginResponse.status, 200);

  const requesterId = loginResponse.json.data.user.id as string;
  const requesterToken = loginResponse.json.data.token as string;
  const reserveResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: {
      authorization: `Bearer ${requesterToken}`,
    },
    body: {
      item_id: reservableItem.id,
      requester_id: requesterId,
      owner_id: reservableItem.user_id,
      message: '想预约看看',
    },
  });
  assert.equal(reserveResponse.status, 201);

  const exchangeResponse = await invokeApp(app, {
    method: 'GET',
    url: `/api/exchanges?item_id=${reservableItem.id}`,
    headers: {
      authorization: `Bearer ${requesterToken}`,
    },
  });

  assert.equal(exchangeResponse.status, 200);
  assert.equal(exchangeResponse.json.data.id, reserveResponse.json.data.id);
});
