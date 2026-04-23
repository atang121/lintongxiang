import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('hidden demo reset page is present and wired to admin reset helper', () => {
  const adminPath = new URL('../src/lib/admin.ts', import.meta.url);
  const pagePath = new URL('../src/app/demo-reset/page.tsx', import.meta.url);

  assert.equal(fs.existsSync(adminPath), true);
  assert.equal(fs.existsSync(pagePath), true);

  const adminFile = fs.readFileSync(adminPath, 'utf8');
  const pageFile = fs.readFileSync(pagePath, 'utf8');

  assert.equal(adminFile.includes('resetDemoData'), true);
  assert.equal(adminFile.includes('x-demo-admin-token'), true);
  assert.equal(pageFile.includes('resetDemoData'), true);
  assert.equal(pageFile.includes('演示数据'), true);
});
