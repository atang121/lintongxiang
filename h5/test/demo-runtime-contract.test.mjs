import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('frontend runtime exposes live exchange and notification api contracts', () => {
  const apiFile = fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
  const detailPage = fs.readFileSync(new URL('../src/app/items/[id]/page.tsx', import.meta.url), 'utf8');
  const appContext = fs.readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');

  assert.equal(apiFile.includes('exchanges:'), true);
  assert.equal(apiFile.includes('notifications:'), true);
  assert.equal(apiFile.includes('/admin/reset-demo'), true);

  assert.equal(appContext.includes('refreshNotifications'), true);
  assert.equal(detailPage.includes('createExchange'), true);
  assert.equal(detailPage.includes('completeExchange'), true);
});
