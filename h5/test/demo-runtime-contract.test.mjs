import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('frontend runtime exposes live exchange and notification api contracts', () => {
  const apiFile = fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
  const detailPage = fs.readFileSync(new URL('../src/app/items/[id]/page.tsx', import.meta.url), 'utf8');
  const appContext = fs.readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');
  const homePage = fs.readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');

  assert.equal(apiFile.includes('exchanges:'), true);
  assert.equal(apiFile.includes('notifications:'), true);
  assert.equal(apiFile.includes('/admin/reset-demo'), true);

  assert.equal(appContext.includes('refreshNotifications'), true);
  assert.equal(appContext.includes("notification.type !== 'message'"), true);
  assert.equal(homePage.includes("notification.type === 'exchange'"), true);
  assert.equal(detailPage.includes('createExchange'), true);
  assert.equal(detailPage.includes('completeExchange'), true);
});

test('messages page separates private chats from notifications and supports replies', () => {
  const messagesPage = fs.readFileSync(new URL('../src/app/messages/page.tsx', import.meta.url), 'utf8');
  const topBar = fs.readFileSync(new URL('../src/components/TopBar.tsx', import.meta.url), 'utf8');
  const timeUtil = fs.readFileSync(new URL('../src/lib/time.ts', import.meta.url), 'utf8');

  assert.equal(messagesPage.includes('serviceNotifications'), true);
  assert.equal(messagesPage.includes("notification.type !== 'message'"), true);
  assert.equal(messagesPage.includes('openConversation'), true);
  assert.equal(messagesPage.includes('activeConversation'), true);
  assert.equal(messagesPage.includes('replyText'), true);
  assert.equal(messagesPage.includes('handleReply'), true);
  assert.equal(messagesPage.includes('api.messages.markRead'), true);
  assert.equal(messagesPage.includes('写下回复'), true);
  assert.equal(messagesPage.includes('发送回复'), true);
  assert.equal(messagesPage.includes('私信只在左侧私信里处理'), false);
  assert.equal(messagesPage.includes('formatRelativeTime'), true);
  assert.equal(messagesPage.includes('toTimeMs'), true);
  assert.equal(topBar.includes("pathname !== '/messages'"), true);
  assert.equal(timeUtil.includes('SQL_DATETIME_RE'), true);
  assert.equal(timeUtil.includes("raw.replace(' ', 'T')}Z"), true);

  const messagesRoute = fs.readFileSync(new URL('../../server/src/routes/messages.ts', import.meta.url), 'utf8');
  assert.equal(messagesRoute.includes("type, title, content, related_item_id"), false);
  assert.equal(messagesRoute.includes("你收到一条新私信"), false);
});

test('item detail and inbox share a conversation workflow with owner-side interest replies', () => {
  const itemDetailPage = fs.readFileSync(new URL('../src/app/items/[id]/page.tsx', import.meta.url), 'utf8');
  const messagesPage = fs.readFileSync(new URL('../src/app/messages/page.tsx', import.meta.url), 'utf8');

  assert.equal(itemDetailPage.includes('getMyMessages'), true);
  assert.equal(itemDetailPage.includes('interestConversations'), true);
  assert.equal(itemDetailPage.includes('预约与留言'), true);
  assert.equal(itemDetailPage.includes('当前预约'), true);
  assert.equal(itemDetailPage.includes('候补第'), true);
  assert.equal(itemDetailPage.includes('replyToInterest'), true);
  assert.equal(itemDetailPage.includes('该回复仅你和留言者可见'), true);
  assert.equal(itemDetailPage.includes('openInterestConversation'), true);

  assert.equal(messagesPage.includes('消息'), true);
  assert.equal(messagesPage.includes('看物品'), true);
  assert.equal(messagesPage.includes('写下回复'), true);
  assert.equal(messagesPage.includes('rounded-[26px]'), true);
});

test('owner item detail refreshes interest conversations while the page is open', () => {
  const itemDetailPage = fs.readFileSync(new URL('../src/app/items/[id]/page.tsx', import.meta.url), 'utf8');

  assert.equal(itemDetailPage.includes('refreshItemConversations'), true);
  assert.equal(itemDetailPage.includes('refreshMessages'), true);
  assert.equal(itemDetailPage.includes('window.setInterval'), true);
  assert.equal(itemDetailPage.includes('visibilitychange'), true);
});

test('pending items support a real waitlist reservation flow', () => {
  const itemDetailPage = fs.readFileSync(new URL('../src/app/items/[id]/page.tsx', import.meta.url), 'utf8');
  const normalizeFile = fs.readFileSync(new URL('../src/lib/normalize.ts', import.meta.url), 'utf8');
  const typesFile = fs.readFileSync(new URL('../src/types/index.ts', import.meta.url), 'utf8');

  assert.equal(itemDetailPage.includes('发送并候补'), true);
  assert.equal(itemDetailPage.includes('取消候补'), true);
  assert.equal(itemDetailPage.includes('候补中'), true);
  assert.equal(itemDetailPage.includes('queuePosition'), true);
  assert.equal(normalizeFile.includes("'waiting'"), true);
  assert.equal(typesFile.includes("'expired'"), true);
});

test('install prompt lives in profile instead of interrupting the home feed', () => {
  const homePage = fs.readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
  const profilePage = fs.readFileSync(new URL('../src/app/profile/page.tsx', import.meta.url), 'utf8');

  assert.equal(homePage.includes('<InstallAppPrompt />'), false);
  assert.equal(profilePage.includes('<InstallAppPrompt />'), true);
  assert.equal(profilePage.includes('添加到桌面'), true);
});

test('service notice explains platform boundaries without blocking key flows', () => {
  const loginPage = fs.readFileSync(new URL('../src/app/login/page.tsx', import.meta.url), 'utf8');
  const publishPage = fs.readFileSync(new URL('../src/app/publish/page.tsx', import.meta.url), 'utf8');
  const appContext = fs.readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');
  const itemDetailPage = fs.readFileSync(new URL('../src/app/items/[id]/page.tsx', import.meta.url), 'utf8');
  const profilePage = fs.readFileSync(new URL('../src/app/profile/page.tsx', import.meta.url), 'utf8');
  const termsPage = fs.readFileSync(new URL('../src/app/terms/page.tsx', import.meta.url), 'utf8');
  const publishAgreementPage = fs.readFileSync(new URL('../src/app/terms/publish-agreement/page.tsx', import.meta.url), 'utf8');
  const tradeSafetyPage = fs.readFileSync(new URL('../src/app/terms/trade-safety/page.tsx', import.meta.url), 'utf8');
  const serviceAgreementPage = fs.readFileSync(new URL('../src/app/terms/service-agreement/page.tsx', import.meta.url), 'utf8');
  const privacyPage = fs.readFileSync(new URL('../src/app/privacy/page.tsx', import.meta.url), 'utf8');
  const serviceDocPage = fs.readFileSync(new URL('../src/app/terms/[doc]/page.tsx', import.meta.url), 'utf8');
  const layoutFile = fs.readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
  const updatePrompt = fs.readFileSync(new URL('../src/components/ServiceAgreementUpdatePrompt.tsx', import.meta.url), 'utf8');
  const apiFile = fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
  const serviceAgreementData = fs.readFileSync(new URL('../src/data/serviceAgreement.ts', import.meta.url), 'utf8');
  const serviceAgreementContent = fs.readFileSync(new URL('../public/legal/service-agreement.json', import.meta.url), 'utf8');
  const agreementData = fs.readFileSync(new URL('../src/data/publishAgreement.ts', import.meta.url), 'utf8');
  const itemsRoute = fs.readFileSync(new URL('../../server/src/routes/items.ts', import.meta.url), 'utf8');
  const authRoute = fs.readFileSync(new URL('../../server/src/routes/auth.ts', import.meta.url), 'utf8');
  const complianceFile = fs.readFileSync(new URL('../../server/src/lib/compliance.ts', import.meta.url), 'utf8');

  assert.equal(loginPage.includes('仅提供邻里信息展示、沟通与预约工具；不参与交易、不提供担保'), true);
  assert.equal(loginPage.includes('AgreementConfirm'), true);
  assert.equal(loginPage.includes('sessionStorage'), true);
  assert.equal(loginPage.includes('请先阅读并勾选下方用户服务文件'), true);
  assert.equal(loginPage.includes('我已仔细阅读并同意'), true);
  assert.equal(loginPage.includes('并知悉'), true);
  assert.equal(loginPage.includes('/privacy?from=login'), true);
  assert.equal(loginPage.includes('我们仅收集必要信息用于邻里安全服务'), false);
  assert.equal(loginPage.includes('全部条款'), true);
  assert.equal(loginPage.includes('?from=login'), true);
  assert.equal(loginPage.includes('service_agreement_accepted: true'), true);
  assert.equal(publishPage.includes('agreementAccepted'), true);
  assert.equal(publishPage.includes('请阅读并勾选《用户服务协议》'), true);
  assert.equal(publishPage.includes('agreementError'), true);
  assert.equal(publishPage.includes('href="/terms/user-service-agreement?from=publish"'), true);
  assert.equal(publishPage.includes('disabled={submitting}'), true);
  assert.equal(publishPage.includes('tonglin-publish-draft'), true);
  assert.equal(publishPage.includes('localStorage'), true);
  assert.equal(publishPage.includes('removeItem(draftKey)'), true);
  assert.equal(publishPage.includes('服务协议'), true);
  assert.equal(appContext.includes('agreement_confirmed: itemData.agreement_confirmed === true'), true);
  assert.equal(appContext.includes('agreement_version: itemData.agreement_version'), true);
  assert.equal(itemsRoute.includes('agreement_confirmed !== true'), true);
  assert.equal(itemsRoute.includes('agreement_confirmed_at'), true);
  assert.equal(itemsRoute.includes('requireServiceAgreement'), true);
  assert.equal(itemDetailPage.includes('物品验收、付款、交付及售后由双方自行确认并承担相应风险'), true);
  assert.equal(profilePage.includes('/terms/service-agreement'), true);
  assert.equal(profilePage.includes('/privacy'), true);
  assert.equal(privacyPage.includes('童邻市集 隐私说明'), true);
  assert.equal(privacyPage.includes('孩子年龄段与孩子数量（选填，仅用于个性化推荐）'), true);
  assert.equal(privacyPage.includes('不会出售、出租或向无关第三方共享'), true);
  assert.equal(termsPage.includes('用户发布协议与交易安全须知'), true);
  assert.equal(serviceAgreementPage.includes('redirect(`/terms/${order[0]'), true);
  assert.equal(serviceAgreementPage.includes('loadServiceAgreementContent'), true);
  assert.equal(serviceDocPage.includes('document.title'), true);
  assert.equal(serviceDocPage.includes('document.paragraphs'), true);
  assert.equal(serviceDocPage.includes('document.summary'), false);
  assert.equal(serviceDocPage.includes('index + 1'), false);
  assert.equal(serviceDocPage.includes('isSectionTitle'), true);
  assert.equal(serviceDocPage.includes('返回注册/登录'), true);
  assert.equal(serviceDocPage.includes('已阅读，返回注册/登录'), true);
  assert.equal(serviceDocPage.includes('返回继续使用'), true);
  assert.equal(serviceAgreementPage.includes('return_to'), true);
  assert.equal(layoutFile.includes('ServiceAgreementUpdatePrompt'), true);
  assert.equal(layoutFile.includes('ServiceAgreementGate'), false);
  assert.equal(updatePrompt.includes('用户服务协议已更新'), true);
  assert.equal(updatePrompt.includes('同意并继续'), true);
  assert.equal(updatePrompt.includes('agreement_update_prompt'), true);
  assert.equal(updatePrompt.includes('return_to'), true);
  assert.equal(apiFile.includes('tonglin:service-agreement-required'), true);
  assert.equal(serviceAgreementData.includes('public/legal/service-agreement.json'), true);
  assert.equal(serviceAgreementContent.includes('"user-service-agreement"'), true);
  assert.equal(serviceAgreementContent.includes('"title": "用户服务协议"'), true);
  assert.equal(serviceAgreementContent.includes('平台定位与角色'), true);
  assert.equal(serviceAgreementContent.includes('用户发布承诺'), true);
  assert.equal(serviceAgreementContent.includes('账户注册与使用规范'), true);
  assert.equal(serviceAgreementContent.includes('通知送达方式'), true);
  assert.equal(serviceAgreementContent.includes('交易安全须知'), true);
  assert.equal(authRoute.includes('/accept-service-agreement'), true);
  assert.equal(authRoute.includes('service_agreement_accepted'), true);
  assert.equal(complianceFile.includes('SERVICE_AGREEMENT_VERSION'), true);
  assert.equal(complianceFile.includes('SERVICE_AGREEMENT_REQUIRED'), true);
  assert.equal(agreementData.includes('过期变质食品、药品医疗器械、已使用贴身母婴用品'), true);
  assert.equal(agreementData.includes('发布的闲置物品信息真实、来源合法'), true);
});

test('service agreement prompt trusts backend required flag after acceptance', () => {
  const normalizeFile = fs.readFileSync(new URL('../src/lib/normalize.ts', import.meta.url), 'utf8');

  assert.equal(normalizeFile.includes('service_agreement_required'), true);
  assert.equal(normalizeFile.includes('rawRequired'), true);
  assert.equal(normalizeFile.includes('rawRequired !== undefined'), true);
  assert.equal(normalizeFile.includes('toBooleanFlag(rawRequired)'), true);
});

test('published items can be edited, down-shelved, relisted, and marked as negotiable', () => {
  const publishPage = fs.readFileSync(new URL('../src/app/publish/page.tsx', import.meta.url), 'utf8');
  const profileItemsPage = fs.readFileSync(new URL('../src/app/profile/items/page.tsx', import.meta.url), 'utf8');
  const itemDetailPage = fs.readFileSync(new URL('../src/app/items/[id]/page.tsx', import.meta.url), 'utf8');
  const itemCard = fs.readFileSync(new URL('../src/components/ItemCard.tsx', import.meta.url), 'utf8');
  const apiFile = fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
  const typesFile = fs.readFileSync(new URL('../src/types/index.ts', import.meta.url), 'utf8');
  const normalizeFile = fs.readFileSync(new URL('../src/lib/normalize.ts', import.meta.url), 'utf8');
  const itemsRoute = fs.readFileSync(new URL('../../server/src/routes/items.ts', import.meta.url), 'utf8');
  const usersRoute = fs.readFileSync(new URL('../../server/src/routes/users.ts', import.meta.url), 'utf8');
  const dbFile = fs.readFileSync(new URL('../../server/src/models/db.ts', import.meta.url), 'utf8');

  assert.equal(publishPage.includes("searchParams.get('edit')"), true);
  assert.equal(publishPage.includes('保存并重新发布'), true);
  assert.equal(publishPage.includes('priceNegotiable'), true);
  assert.equal(publishPage.includes('getPriceNegotiableLabel(option, listingType)'), true);
  assert.equal(profileItemsPage.includes('编辑后发布'), true);
  assert.equal(profileItemsPage.includes('下架'), true);
  assert.equal(profileItemsPage.includes('重新发布'), true);
  assert.equal(itemDetailPage.includes('发布管理'), true);
  assert.equal(itemDetailPage.includes('handleDownShelf'), true);
  assert.equal(itemDetailPage.includes('handleRelist'), true);
  assert.equal(itemCard.includes('priceNote'), true);
  assert.equal(typesFile.includes("'可小刀'"), true);
  assert.equal(apiFile.includes('update: (id: string, data: any)'), true);
  assert.equal(apiFile.includes("`/items/${id}/relist`"), true);
  assert.equal(typesFile.includes('deleteReason'), true);
  assert.equal(normalizeFile.includes('delete_reason'), true);
  assert.equal(itemDetailPage.includes('平台已下架这条内容'), true);
  assert.equal(itemDetailPage.includes('canRelistDeletedItem'), true);
  assert.equal(itemsRoute.includes("itemsRouter.put('/:id'"), true);
  assert.equal(itemsRoute.includes("itemsRouter.put('/:id/relist'"), true);
  assert.equal(itemsRoute.includes("status = 'available'"), true);
  assert.equal(itemsRoute.includes('该内容由平台下架，需联系管理员处理后才能重新发布'), true);
  assert.equal(usersRoute.includes('getAuthUser(req.headers.authorization)'), true);
  assert.equal(usersRoute.includes('只能查看自己的发布'), true);
  assert.equal(dbFile.includes('price_negotiable TEXT DEFAULT'), true);
});

test('home item cards avoid wanted badge overlap and normalize upload image hosts', () => {
  const itemCard = fs.readFileSync(new URL('../src/components/ItemCard.tsx', import.meta.url), 'utf8');
  const normalizeFile = fs.readFileSync(new URL('../src/lib/normalize.ts', import.meta.url), 'utf8');

  assert.equal(itemCard.includes('!isWanted &&'), true);
  assert.equal(itemCard.includes('referrerPolicy="no-referrer"'), true);
  assert.equal(itemCard.includes('OfferImageFallback'), true);
  assert.equal(normalizeFile.includes("url.pathname.startsWith('/uploads/')"), true);
  assert.equal(normalizeFile.includes('apiPort'), true);
});
