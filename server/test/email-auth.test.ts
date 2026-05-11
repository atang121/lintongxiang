import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app';
import { initDatabase, run } from '../src/models/db';
import { invokeApp } from './helpers/invoke-app';

test('supports unified phone-code login with first-time profile completion', async () => {
  await initDatabase({ forceReset: true });

  const app = createApp();
  const phone = '13800000000';

  const codeResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/send-code',
    body: { phone },
  });
  assert.equal(codeResponse.status, 200);
  assert.equal(typeof codeResponse.json.data.preview_code, 'string');
  assert.equal(codeResponse.json.data.phone, phone);
  assert.equal(codeResponse.json.data.provider, 'preview');

  const firstVerifyResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/verify-code',
    body: {
      phone,
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
      community: '梧桐湾',
      child_age_ranges: ['3-6', '6-12'],
      child_count: 2,
      service_agreement_accepted: true,
      service_agreement_source: 'registration',
    },
  });
  assert.equal(setupResponse.status, 201);
  assert.equal(setupResponse.json.data.user.phone, phone);
  assert.equal(setupResponse.json.data.user.nickname, '演示新用户');
  assert.equal(setupResponse.json.data.user.community, '东门口');
  assert.deepEqual(setupResponse.json.data.user.child_age_ranges, ['3-6', '6-12']);
  assert.equal(setupResponse.json.data.user.child_count, 2);

  const reloginCodeResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/send-code',
    body: { phone },
  });
  assert.equal(reloginCodeResponse.status, 200);
  assert.equal(typeof reloginCodeResponse.json.data.preview_code, 'string');

  const reloginResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/verify-code',
    body: {
      phone,
      code: reloginCodeResponse.json.data.preview_code,
    },
  });
  assert.equal(reloginResponse.status, 200);
  assert.equal(reloginResponse.json.data.need_profile_completion, false);
  assert.equal(reloginResponse.json.data.user.nickname, '演示新用户');
  assert.equal(typeof reloginResponse.json.data.token, 'string');
});

test('existing users can log in without rechecking agreement when latest version is already accepted', async () => {
  await initDatabase({ forceReset: true });

  const app = createApp();
  const phone = '13800000001';

  const codeResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/send-code',
    body: { phone },
  });
  assert.equal(codeResponse.status, 200);

  const firstVerifyResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/verify-code',
    body: {
      phone,
      code: codeResponse.json.data.preview_code,
    },
  });
  assert.equal(firstVerifyResponse.status, 200);

  const setupResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/setup-profile',
    body: {
      temporary_token: firstVerifyResponse.json.data.temporary_token,
      nickname: '已确认协议用户',
      community: '清华园',
      service_agreement_accepted: true,
      service_agreement_source: 'registration',
    },
  });
  assert.equal(setupResponse.status, 201);
  assert.equal(setupResponse.json.data.user.service_agreement_required, false);

  run(
    `INSERT INTO auth_codes (email, code, type, expires_at, created_at)
     VALUES (?, ?, 'login', ?, datetime('now'))`,
    [phone, '246810', new Date(Date.now() + 5 * 60 * 1000).toISOString()]
  );

  const reloginResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/verify-code',
    body: {
      phone,
      code: '246810',
    },
  });
  assert.equal(reloginResponse.status, 200);
  assert.equal(reloginResponse.json.data.need_profile_completion, false);
  assert.equal(reloginResponse.json.data.user.service_agreement_required, false);
});
