import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('user-facing exchange actions keep owner completion authority and requester cancellation flow', () => {
  const itemDetailPage = fs.readFileSync(new URL('../src/app/items/[id]/page.tsx', import.meta.url), 'utf8');
  const bottomNav = fs.readFileSync(new URL('../src/components/BottomNav.tsx', import.meta.url), 'utf8');
  const exchangesRoute = fs.readFileSync(new URL('../../server/src/routes/exchanges.ts', import.meta.url), 'utf8');

  assert.equal(bottomNav.includes("pathname.startsWith('/items/')"), true);
  assert.equal(bottomNav.includes('return null'), true);
  assert.equal(itemDetailPage.includes('z-[70]'), true);
  assert.equal(itemDetailPage.includes('!showContact && !showShareGuide'), true);
  assert.equal(itemDetailPage.includes('className="fixed inset-0 z-[90]'), true);
  assert.equal(itemDetailPage.includes("show('已收藏，稍后可以从我的页面继续查看'"), true);
  assert.equal(itemDetailPage.includes("show('已取消收藏'"), true);
  assert.equal(itemDetailPage.includes('setShowShareGuide(true)'), true);
  assert.equal(itemDetailPage.includes('复制链接'), true);
  assert.equal(itemDetailPage.includes('发送并预约'), true);
  assert.equal(itemDetailPage.includes('发送并重新预约'), true);
  assert.equal(itemDetailPage.includes('重新预约并候补'), true);
  assert.equal(itemDetailPage.includes('getItemClosingNote'), true);
  assert.equal(itemDetailPage.includes('每一次当面交接，都是闲置好物的温暖接力'), true);
  assert.equal(itemDetailPage.includes('说出你的小需求，让邻里来搭把手'), true);
  assert.equal(itemDetailPage.includes('每一次以物换物，都让好物继续被需要'), false);
  assert.equal(itemDetailPage.includes('pb-[calc(104px+env(safe-area-inset-bottom))]'), true);
  assert.equal(itemDetailPage.includes('确认已交接'), true);
  assert.equal(itemDetailPage.includes('未能成交'), true);
  assert.equal(itemDetailPage.includes('取消预约'), true);
  assert.equal(itemDetailPage.includes('提醒发布者确认'), true);
  assert.equal(itemDetailPage.includes('handleRemindOwnerToConfirm'), true);
  assert.equal(itemDetailPage.includes('我已取到，请确认交接'), true);
  assert.equal(itemDetailPage.includes("'✅ 已交接'"), false);
  assert.equal(itemDetailPage.includes('标记失败'), false);

  assert.equal(exchangesRoute.includes('只有发布者才能确认交接完成'), true);
  assert.equal(exchangesRoute.includes('String(exchange.owner_id) !== actorId'), true);
  assert.equal(exchangesRoute.includes('只有预约发起者才能取消预约'), true);
});

test('private chat can trigger reservation actions without returning to item detail', () => {
  const messagesPage = fs.readFileSync(new URL('../src/app/messages/page.tsx', import.meta.url), 'utf8');
  const bottomNav = fs.readFileSync(new URL('../src/components/BottomNav.tsx', import.meta.url), 'utf8');

  assert.equal(messagesPage.includes('createExchange'), true);
  assert.equal(messagesPage.includes('cancelExchange'), true);
  assert.equal(messagesPage.includes('getConversationExchangeAction'), true);
  assert.equal(messagesPage.includes('预约这件'), true);
  assert.equal(messagesPage.includes('加入候补'), true);
  assert.equal(messagesPage.includes('我想预约「'), true);
  assert.equal(messagesPage.includes('当前有人预约，可候补'), true);
  assert.equal(messagesPage.includes('load conversation item failed'), true);

  assert.equal(bottomNav.includes('overflow-visible'), true);
  assert.equal(bottomNav.includes('-right-1.5 -top-1.5'), true);
  assert.equal(bottomNav.includes("unreadCount > 99 ? '99+'"), true);
});
