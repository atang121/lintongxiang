import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app';
import { initDatabase } from '../src/models/db';
import { invokeApp } from './helpers/invoke-app';

test('supports publish -> message -> reserve -> complete and creates notifications', async () => {
  await initDatabase({ forceReset: true });

  const app = createApp();

  const loginResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: {
      nickname: '试玩妈妈',
      community: '民发・庞公别苑',
    },
  });
  assert.equal(loginResponse.status, 200);
  const userId = loginResponse.json.data.user.id as string;
  const userToken = loginResponse.json.data.token as string;

  const publishResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/items',
    headers: {
      authorization: `Bearer ${userToken}`,
    },
    body: {
      user_id: userId,
      title: '火火兔故事机',
      description: '音质正常，适合2-5岁。',
      images: ['data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22/%3E'],
      category: 'education',
      age_range: '3-6',
      exchange_mode: 'gift',
      condition: '轻微使用',
      tags: ['故事机', '英语启蒙'],
      community: '民发・庞公别苑',
      lat: 32.0078,
      lng: 112.1264,
    },
  });
  assert.equal(publishResponse.status, 201);

  const itemsResponse = await invokeApp(app, {
    method: 'GET',
    url: '/api/items',
  });
  assert.equal(itemsResponse.status, 200);

  const seededOwnerItem = itemsResponse.json.data.find(
    (item: { user_id: string }) => item.user_id !== userId
  );
  assert.ok(seededOwnerItem);
  const ownerId = seededOwnerItem.user_id as string;

  const messageResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/messages',
    headers: {
      authorization: `Bearer ${userToken}`,
    },
    body: {
      item_id: seededOwnerItem.id,
      from_user_id: userId,
      to_user_id: ownerId,
      content: '这件还在吗？周末可以自提。',
    },
  });
  assert.equal(messageResponse.status, 201);

  const reserveResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    headers: {
      authorization: `Bearer ${userToken}`,
    },
    body: {
      item_id: seededOwnerItem.id,
      requester_id: userId,
      owner_id: ownerId,
      message: '想预约这件物品',
    },
  });
  assert.equal(reserveResponse.status, 201);

  const completeResponse = await invokeApp(app, {
    method: 'PUT',
    url: `/api/exchanges/${reserveResponse.json.data.id}/complete`,
    headers: {
      authorization: `Bearer ${userToken}`,
    },
    body: { actor_id: userId },
  });
  assert.equal(completeResponse.status, 200);

  const notificationsResponse = await invokeApp(app, {
    method: 'GET',
    url: `/api/notifications?user_id=${userId}`,
    headers: {
      authorization: `Bearer ${userToken}`,
    },
  });
  assert.equal(notificationsResponse.status, 200);
  assert.ok(notificationsResponse.json.data.length > 0);
});

test('rejects publish and reservation mutations without a matching auth token', async () => {
  await initDatabase({ forceReset: true });

  const app = createApp();

  const loginResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: {
      nickname: '受保护接口测试用户',
      community: '民发・庞公别苑',
    },
  });
  assert.equal(loginResponse.status, 200);

  const userId = loginResponse.json.data.user.id as string;
  const token = loginResponse.json.data.token as string;

  const unauthorizedPublish = await invokeApp(app, {
    method: 'POST',
    url: '/api/items',
    body: {
      user_id: userId,
      title: '未授权发布',
      description: '不应该成功',
      images: ['data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22/%3E'],
      category: 'toy',
      age_range: '3-6',
      exchange_mode: 'gift',
      condition: '轻微使用',
    },
  });
  assert.equal(unauthorizedPublish.status, 401);

  const authorizedPublish = await invokeApp(app, {
    method: 'POST',
    url: '/api/items',
    headers: {
      authorization: `Bearer ${token}`,
    },
    body: {
      user_id: userId,
      title: '授权发布',
      description: '这次应该成功',
      images: ['data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22/%3E'],
      category: 'toy',
      age_range: '3-6',
      exchange_mode: 'gift',
      condition: '轻微使用',
    },
  });
  assert.equal(authorizedPublish.status, 201);

  const itemsResponse = await invokeApp(app, {
    method: 'GET',
    url: '/api/items',
  });
  const seededOwnerItem = itemsResponse.json.data.find(
    (item: { user_id: string }) => item.user_id !== userId
  );
  assert.ok(seededOwnerItem);

  const unauthorizedReserve = await invokeApp(app, {
    method: 'POST',
    url: '/api/exchanges',
    body: {
      item_id: seededOwnerItem.id,
      requester_id: userId,
      owner_id: seededOwnerItem.user_id,
      message: '这次不带 token',
    },
  });
  assert.equal(unauthorizedReserve.status, 401);

  const unauthorizedNotifications = await invokeApp(app, {
    method: 'GET',
    url: `/api/notifications?user_id=${userId}`,
  });
  assert.equal(unauthorizedNotifications.status, 401);
});
