import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('first-login welcome modal is compact and does not require internal scrolling', () => {
  const homePage = fs.readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');

  assert.equal(homePage.includes('overflow-y-auto'), false);
  assert.equal(homePage.includes('max-h-[calc(100svh-1rem)]'), true);
  assert.equal(homePage.includes('text-[24px]'), true);
  assert.equal(homePage.includes('grid grid-cols-2'), true);
  assert.equal(homePage.includes('更安心：周边小区 · 当面确认 · 不走平台交易'), true);
});

test('feedback reply notifications expand in place and click marks them read without a separate read button', () => {
  const messagesPage = fs.readFileSync(new URL('../src/app/messages/page.tsx', import.meta.url), 'utf8');

  assert.equal(messagesPage.includes('selectedNotificationId'), true);
  assert.equal(messagesPage.includes('handleNotificationClick'), true);
  assert.equal(messagesPage.includes('notification_detail_panel'), true);
  assert.equal(messagesPage.includes('!selected && ('), true);
  assert.equal(messagesPage.includes('完整回复'), true);
  assert.equal(messagesPage.includes('平台反馈回复'), true);
  assert.equal(messagesPage.includes('已读'), true);
  assert.equal(messagesPage.includes('标记已阅读'), false);
  assert.equal(messagesPage.includes("notification.relatedItemId && !isFeedbackReply"), true);
});
