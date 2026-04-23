import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app';
import { initDatabase } from '../src/models/db';
import { invokeApp } from './helpers/invoke-app';

test('supports unified qq-email code login with first-time profile completion', async () => {
  await initDatabase({ forceReset: true });

  const app = createApp();
  const email = 'demo-user@qq.com';

  const codeResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/send-code',
    body: { email },
  });
  assert.equal(codeResponse.status, 200);
  assert.equal(typeof codeResponse.json.data.preview_code, 'string');
  assert.equal(codeResponse.json.data.email, email);
  assert.equal(codeResponse.json.data.delivery.provider, 'preview');

  const firstVerifyResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/verify-code',
    body: {
      email,
      code: codeResponse.json.data.preview_code,
    },
  });
  assert.equal(firstVerifyResponse.status, 200);
  assert.equal(firstVerifyResponse.json.data.need_profile_completion, true);
  assert.equal(typeof firstVerifyResponse.json.data.temporary_token, 'string');

  const setupResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/setup-profile',
    body: {
      temporary_token: firstVerifyResponse.json.data.temporary_token,
      nickname: '演示新用户',
      community: '民发・庞公别苑',
      phone: '13800000000',
    },
  });
  assert.equal(setupResponse.status, 201);
  assert.equal(setupResponse.json.data.user.email, email);
  assert.equal(setupResponse.json.data.user.nickname, '演示新用户');
  assert.equal(setupResponse.json.data.user.community, '民发・庞公别苑');

  const reloginCodeResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/send-code',
    body: { email },
  });
  assert.equal(reloginCodeResponse.status, 200);
  assert.equal(typeof reloginCodeResponse.json.data.preview_code, 'string');

  const reloginResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/verify-code',
    body: {
      email,
      code: reloginCodeResponse.json.data.preview_code,
    },
  });
  assert.equal(reloginResponse.status, 200);
  assert.equal(reloginResponse.json.data.need_profile_completion, false);
  assert.equal(reloginResponse.json.data.user.nickname, '演示新用户');
  assert.equal(typeof reloginResponse.json.data.token, 'string');
});
