import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDemoItems, buildDemoUsers } from '../src/demo/seeds';
import { initDatabase, query, resetDemoData } from '../src/models/db';

test('loads a believable shared demo world and can reset back to it', async () => {
  await initDatabase({ forceReset: true });

  const items = query('SELECT community, status FROM items');
  assert.ok(items.length >= 60);

  const communities = new Set(items.map((item) => String(item.community)));
  assert.ok(communities.size >= 6);

  const statuses = new Set(items.map((item) => String(item.status)));
  assert.ok(statuses.has('available'));
  assert.ok(statuses.has('pending'));
  assert.ok(statuses.has('completed'));

  const users = query('SELECT COUNT(*) as count FROM users');
  assert.ok(Number(users[0].count) >= 24);

  await resetDemoData();

  const resetItems = query('SELECT id FROM items');
  assert.ok(resetItems.length >= 60);
});

test('demo item artwork avoids raw demo labels in the visible image text', () => {
  const users = buildDemoUsers();
  const items = buildDemoItems(users);

  assert.ok(items.length > 0);
  assert.equal(items[0].images[0].includes('Demo'), false);
  assert.equal(items[0].images[0].includes('邻里童享 Demo'), false);
});
