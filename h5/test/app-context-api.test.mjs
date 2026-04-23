import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('primary runtime state no longer depends on mockData notifications', () => {
  const appContext = fs.readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');
  const homePage = fs.readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
  const messagesPage = fs.readFileSync(new URL('../src/app/messages/page.tsx', import.meta.url), 'utf8');

  assert.equal(appContext.includes('MOCK_NOTIFICATIONS'), false);
  assert.equal(homePage.includes('MOCK_NOTIFICATIONS'), false);
  assert.equal(messagesPage.includes('MOCK_NOTIFICATIONS'), false);
});
