import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('feedback submissions expose delivery diagnostics for Feishu and email channels', () => {
  const feedbackRoute = fs.readFileSync(new URL('../../server/src/routes/feedback.ts', import.meta.url), 'utf8');
  const apiFile = fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');

  assert.equal(feedbackRoute.includes('delivery_attempts'), true);
  assert.equal(feedbackRoute.includes('failed_providers'), true);
  assert.equal(feedbackRoute.includes('feishu_webhook'), true);
  assert.equal(feedbackRoute.includes('feishu_bitable'), true);
  assert.equal(feedbackRoute.includes('[Feedback] delivery summary'), true);
  assert.equal(feedbackRoute.includes("providers.join(',') || 'local'"), true);

  assert.equal(apiFile.includes('providers: string[]'), true);
  assert.equal(apiFile.includes('failed_providers: string[]'), true);
  assert.equal(apiFile.includes('delivery_attempts'), true);
});

test('admin can manage feedback and reply to logged-in users in app', () => {
  const adminRoute = fs.readFileSync(new URL('../../server/src/routes/admin.ts', import.meta.url), 'utf8');
  const dbFile = fs.readFileSync(new URL('../../server/src/models/db.ts', import.meta.url), 'utf8');
  const apiFile = fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
  const adminPage = fs.readFileSync(new URL('../src/app/admin/page.tsx', import.meta.url), 'utf8');
  const feedbackPage = fs.readFileSync(new URL('../src/app/feedback/page.tsx', import.meta.url), 'utf8');
  const messagesPage = fs.readFileSync(new URL('../src/app/messages/page.tsx', import.meta.url), 'utf8');
  const typesFile = fs.readFileSync(new URL('../src/types/index.ts', import.meta.url), 'utf8');

  assert.equal(dbFile.includes('admin_reply'), true);
  assert.equal(dbFile.includes('replied_by'), true);
  assert.equal(adminRoute.includes("adminRouter.get('/feedback'"), true);
  assert.equal(adminRoute.includes("adminRouter.post('/feedback/:id/reply'"), true);
  assert.equal(adminRoute.includes('反馈处理回复'), true);
  assert.equal(apiFile.includes('getFeedback'), true);
  assert.equal(apiFile.includes('replyFeedback'), true);
  assert.equal(adminPage.includes("'feedback'"), true);
  assert.equal(adminPage.includes('反馈处理'), true);
  assert.equal(adminPage.includes('回复用户'), true);
  assert.equal(adminPage.includes('用户查看位置：消息 → 通知'), true);
  assert.equal(adminPage.includes('快捷回复'), true);
  assert.equal(adminPage.includes('发送站内回复并标记已回复'), true);
  assert.equal(feedbackPage.includes('登录用户可在消息通知中收到处理回复'), true);
  assert.equal(messagesPage.includes("notification.type === 'feedback'"), true);
  assert.equal(messagesPage.includes('平台反馈回复'), true);
  assert.equal(messagesPage.includes('feedback_reply_notice'), true);
  assert.equal(typesFile.includes("'feedback'"), true);
  assert.equal(adminRoute.includes("related_item_id, read)"), true);
  assert.equal(adminRoute.includes('feedback.user_id'), true);
});
