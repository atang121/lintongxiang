import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app';
import { initDatabase } from '../src/models/db';
import { resetMailServiceForTests, setMailServiceForTests } from '../src/services/mail';
import { resetOpsServiceForTests } from '../src/services/ops';
import { invokeApp } from './helpers/invoke-app';

test('smtp delivery mode does not leak raw verification code in API responses', async () => {
  await initDatabase({ forceReset: true });

  let deliveredEmail = '';
  let deliveredCode = '';

  setMailServiceForTests({
    getMode: () => 'smtp',
    sendLoginCode: async ({ email, code }) => {
      deliveredEmail = email;
      deliveredCode = code;

      return {
        provider: 'smtp',
        delivered_to: email,
        message_id: 'smtp-message-1',
      };
    },
  });

  const app = createApp();
  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/send-code',
    body: { email: 'formal-user@qq.com' },
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.data.email, 'formal-user@qq.com');
  assert.equal(response.json.data.delivery.provider, 'smtp');
  assert.equal(response.json.data.preview_code, undefined);
  assert.equal(deliveredEmail, 'formal-user@qq.com');
  assert.match(deliveredCode, /^\d{6}$/);

  resetMailServiceForTests();
});

test('mail delivery failures return a 502 response instead of crashing the server', async () => {
  await initDatabase({ forceReset: true });

  setMailServiceForTests({
    getMode: () => 'smtp',
    sendLoginCode: async () => {
      throw new Error('smtp rejected recipient');
    },
  });

  const app = createApp();
  const response = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/send-code',
    body: { email: 'receiver@qq.com' },
  });

  assert.equal(response.status, 502);
  assert.equal(response.json.error, '验证码发送失败，请检查邮箱地址后重试');

  resetMailServiceForTests();
});

test('ops bootstrap exposes formalized community/config data and authenticated image upload contract', async () => {
  await initDatabase({ forceReset: true });
  resetOpsServiceForTests();
  resetMailServiceForTests();

  const app = createApp();

  const bootstrapResponse = await invokeApp(app, {
    method: 'GET',
    url: '/api/ops/bootstrap',
  });
  assert.equal(bootstrapResponse.status, 200);
  assert.equal(Array.isArray(bootstrapResponse.json.data.communities), true);
  assert.equal(bootstrapResponse.json.data.communities.length >= 6, true);
  assert.equal(bootstrapResponse.json.data.config.auth_mode, 'qq_email_code');
  assert.equal(typeof bootstrapResponse.json.data.config.require_publish_review, 'boolean');
  assert.equal(typeof bootstrapResponse.json.data.config.image_upload_provider, 'string');

  const codeResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/send-code',
    body: { email: 'uploader@qq.com' },
  });
  assert.equal(codeResponse.status, 200);

  const verifyResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/verify-code',
    body: {
      email: 'uploader@qq.com',
      code: codeResponse.json.data.preview_code,
    },
  });
  assert.equal(verifyResponse.status, 200);
  assert.equal(verifyResponse.json.data.need_profile_completion, true);

  const setupResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/setup-profile',
    body: {
      temporary_token: verifyResponse.json.data.temporary_token,
      nickname: '上传测试用户',
      community: '民发・庞公别苑',
    },
  });
  assert.equal(setupResponse.status, 201);

  const unauthenticatedUpload = await invokeApp(app, {
    method: 'POST',
    url: '/api/uploads/images',
    body: {
      file_name: 'toy.png',
      data_url: 'data:image/png;base64,aGVsbG8=',
    },
  });
  assert.equal(unauthenticatedUpload.status, 401);

  const uploadResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/uploads/images',
    headers: {
      authorization: `Bearer ${setupResponse.json.data.token}`,
    },
    body: {
      file_name: 'toy.png',
      data_url: 'data:image/png;base64,aGVsbG8=',
      category: 'items',
    },
  });
  assert.equal(uploadResponse.status, 201);
  assert.equal(typeof uploadResponse.json.data.url, 'string');
  assert.equal(typeof uploadResponse.json.data.provider, 'string');
  assert.equal(typeof uploadResponse.json.data.key, 'string');
});

test('cos mode without full credentials returns a clear storage configuration error', async () => {
  await initDatabase({ forceReset: true });

  const previous = {
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    COS_SECRET_ID: process.env.COS_SECRET_ID,
    COS_SECRET_KEY: process.env.COS_SECRET_KEY,
    COS_BUCKET: process.env.COS_BUCKET,
    COS_REGION: process.env.COS_REGION,
  };

  process.env.STORAGE_PROVIDER = 'cos';
  delete process.env.COS_SECRET_ID;
  delete process.env.COS_SECRET_KEY;
  delete process.env.COS_BUCKET;
  delete process.env.COS_REGION;

  const app = createApp();

  const loginResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: {
      nickname: '存储配置测试',
      community: '民发・庞公别苑',
    },
  });
  assert.equal(loginResponse.status, 200);

  const uploadResponse = await invokeApp(app, {
    method: 'POST',
    url: '/api/uploads/images',
    headers: {
      authorization: `Bearer ${loginResponse.json.data.token}`,
    },
    body: {
      file_name: 'broken-cos.png',
      data_url: 'data:image/png;base64,aGVsbG8=',
      category: 'items',
    },
  });

  assert.equal(uploadResponse.status, 503);
  assert.equal(uploadResponse.json.error.includes('COS'), true);

  process.env.STORAGE_PROVIDER = previous.STORAGE_PROVIDER;
  process.env.COS_SECRET_ID = previous.COS_SECRET_ID;
  process.env.COS_SECRET_KEY = previous.COS_SECRET_KEY;
  process.env.COS_BUCKET = previous.COS_BUCKET;
  process.env.COS_REGION = previous.COS_REGION;
});
