import test from 'node:test';
import assert from 'node:assert/strict';

import { parsePm2Jlist } from './server.mjs';

test('parsePm2Jlist tolerates pm2 hints before json output', () => {
  const output = 'Use --update-env to update environment variables\n[{"name":"tonglin-h5","pm2_env":{"status":"online"},"pid":123,"monit":{"memory":1,"cpu":0}}]\n';

  const rows = parsePm2Jlist(output);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'tonglin-h5');
});

test('parsePm2Jlist reports a readable error when json is missing', () => {
  assert.throws(
    () => parsePm2Jlist('l format. You may use this command differently.'),
    /PM2 jlist 未返回 JSON/
  );
});
