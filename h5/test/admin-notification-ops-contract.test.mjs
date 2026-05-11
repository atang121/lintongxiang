import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('admin notification composer separates manual platform notices from automatic private-message and exchange events', () => {
  const adminPage = fs.readFileSync(new URL('../src/app/admin/page.tsx', import.meta.url), 'utf8');
  const apiFile = fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
  const typesFile = fs.readFileSync(new URL('../src/types/index.ts', import.meta.url), 'utf8');
  const itemsRoute = fs.readFileSync(new URL('../../server/src/routes/items.ts', import.meta.url), 'utf8');

  assert.equal(adminPage.includes('发布平台通知'), true);
  assert.equal(adminPage.includes('平台公告'), true);
  assert.equal(adminPage.includes('运营提醒'), true);
  assert.equal(adminPage.includes('处理通知'), true);
  assert.equal(adminPage.includes('全部用户'), true);
  assert.equal(adminPage.includes('指定小区'), true);
  assert.equal(adminPage.includes('指定用户'), true);
  assert.equal(adminPage.includes('本次将发送'), true);
  assert.equal(adminPage.includes('通知运营面板'), true);
  assert.equal(adminPage.includes('收件人选择器'), true);
  assert.equal(adminPage.includes('按当前筛选全选'), true);
  assert.equal(adminPage.includes('清空已选'), true);
  assert.equal(adminPage.includes('notifVisibleUsers'), true);
  assert.equal(adminPage.includes('推荐：先选发送对象，再写通知内容'), true);
  assert.equal(adminPage.includes('私信只显示未读角标'), true);
  assert.equal(adminPage.includes('删除并通知发布者'), true);
  assert.equal(adminPage.includes('系统会同步发送给发布者'), true);
  assert.equal(adminPage.includes('delete_reason'), true);
  assert.equal(adminPage.includes('<option value="message">私信提醒</option>'), false);
  assert.equal(adminPage.includes('<option value="exchange">交换动态</option>'), false);

  assert.equal(apiFile.includes("audience?: 'all' | 'community' | 'users'"), true);
  assert.equal(apiFile.includes('user_ids?: string[]'), true);
  assert.equal(apiFile.includes('deleteItem: (id: string, reason?: string)'), true);
  assert.equal(itemsRoute.includes('管理员删除内容时必须填写删除原因'), true);
  assert.equal(itemsRoute.includes('发布内容已被删除'), true);
  assert.equal(typesFile.includes("'platform'"), true);
  assert.equal(typesFile.includes("'ops'"), true);
  assert.equal(typesFile.includes("'handling'"), true);
});
