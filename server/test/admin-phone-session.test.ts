import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app';
import { initDatabase, getOne, run } from '../src/models/db';
import { invokeApp } from './helpers/invoke-app';

function expiresSoon() {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString();
}

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

test('configured admin phone becomes admin when completing first registration', async () => {
  await withEnv({ ADMIN_PHONES: '15271090260' }, async () => {
    await initDatabase({ forceReset: true });
    const app = createApp();
    run(
      `INSERT INTO auth_codes (email, code, type, expires_at, created_at)
       VALUES (?, ?, 'login', ?, datetime('now'))`,
      ['15271090260', '123456', expiresSoon()]
    );

    const verify = await invokeApp(app, {
      method: 'POST',
      url: '/api/auth/verify-code',
      body: { phone: '15271090260', code: '123456' },
    });
    assert.equal(verify.status, 200);
    assert.equal(verify.json.data.need_profile_completion, true);

    const setup = await invokeApp(app, {
      method: 'POST',
      url: '/api/auth/setup-profile',
      body: {
        temporary_token: verify.json.data.temporary_token,
        nickname: '管理员',
        community: '清华园',
        service_agreement_accepted: true,
      },
    });

    assert.equal(setup.status, 201);
    assert.equal(setup.json.data.user.is_admin, true);
    const user = getOne('SELECT is_admin FROM users WHERE phone = ?', ['15271090260']) as Record<string, any>;
    assert.equal(user.is_admin, 1);
  });
});

test('configured admin phone is repaired on existing user login', async () => {
  await withEnv({ ADMIN_PHONES: '15271090260' }, async () => {
    await initDatabase({ forceReset: true });
    const app = createApp();
    run(
      `INSERT INTO users
        (id, nickname, phone, community, service_agreement_version, service_agreement_confirmed_at)
       VALUES ('user_admin_phone', '管理员', '15271090260', '清华园', '2026-05-04', datetime('now'))`
    );
    run(
      `INSERT INTO auth_codes (email, code, type, expires_at, created_at)
       VALUES (?, ?, 'login', ?, datetime('now'))`,
      ['15271090260', '123456', expiresSoon()]
    );

    const response = await invokeApp(app, {
      method: 'POST',
      url: '/api/auth/verify-code',
      body: { phone: '15271090260', code: '123456' },
    });

    assert.equal(response.status, 200);
    assert.equal(response.json.data.need_profile_completion, false);
    assert.equal(response.json.data.user.is_admin, true);
    const user = getOne('SELECT is_admin FROM users WHERE phone = ?', ['15271090260']) as Record<string, any>;
    assert.equal(user.is_admin, 1);
  });
});
