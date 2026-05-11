import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('frontend exposes unified phone-code auth, optional child profile, community setup, and real image upload affordances', () => {
  const loginPage = fs.readFileSync(new URL('../src/app/login/page.tsx', import.meta.url), 'utf8');
  const homePage = fs.readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
  const publishPage = fs.readFileSync(new URL('../src/app/publish/page.tsx', import.meta.url), 'utf8');
  const topBar = fs.readFileSync(new URL('../src/components/TopBar.tsx', import.meta.url), 'utf8');
  const appContext = fs.readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');
  const normalizeFile = fs.readFileSync(new URL('../src/lib/normalize.ts', import.meta.url), 'utf8');
  const apiFile = fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
  const authRoute = fs.readFileSync(new URL('../../server/src/routes/auth.ts', import.meta.url), 'utf8');

  assert.equal(loginPage.includes('QQ邮箱'), false);
  assert.equal(loginPage.includes('邮箱验证码登录'), false);
  assert.equal(loginPage.includes('手机号注册/登录'), true);
  assert.equal(loginPage.includes('手机号验证码，快速注册/登录'), true);
  assert.equal(loginPage.includes('PHONE CODE ACCESS'), false);
  assert.equal(loginPage.includes('milk-panel'), false);
  assert.equal(loginPage.includes('首次使用，请补全昵称和所在小区完成注册'), true);
  assert.equal(loginPage.includes('CommunityPicker'), true);
  assert.equal(loginPage.includes('所在小区'), true);
  assert.equal(loginPage.includes('请选择或填写你所在的小区'), true);
  assert.equal(loginPage.includes('孩子年龄段'), true);
  assert.equal(loginPage.includes('孩子数量'), true);
  assert.equal(loginPage.includes('选好数量后，可填写每个孩子的年龄段'), true);
  assert.equal(loginPage.includes('孩子${index + 1} 年龄段'), true);
  assert.equal(loginPage.includes('信息仅用于个性化推荐，不会公开'), true);
  assert.equal(loginPage.includes('绝不会公开展示，也不会用于其他用途'), true);
  assert.equal(loginPage.includes('暂不填'), true);
  assert.equal(loginPage.includes('获取验证码'), true);
  assert.equal(loginPage.includes('注册/登录'), true);
  assert.equal(loginPage.includes('完成注册并登录'), true);
  assert.equal(loginPage.includes('showSubmitError'), true);
  assert.equal(loginPage.includes('childAgeRanges.filter(Boolean)'), true);
  assert.equal(loginPage.includes('当前环境可直接使用这组验证码继续'), true);
  assert.equal(loginPage.includes('找回密码'), false);
  assert.equal(loginPage.includes('密码'), false);

  assert.equal(apiFile.includes('sendCode:'), true);
  assert.equal(apiFile.includes('verifyCode:'), true);
  assert.equal(apiFile.includes('setupProfile:'), true);
  assert.equal(apiFile.includes('community: string'), true);
  assert.equal(authRoute.includes('请选择或填写你所在的小区'), true);
  assert.equal(authRoute.includes('normalizedCommunity'), true);
  assert.equal(fs.readFileSync(new URL('../src/components/CommunityPicker.tsx', import.meta.url), 'utf8').includes('找不到我的小区？手动添加'), true);
  assert.equal(apiFile.includes('uploadImage:'), true);
  assert.equal(apiFile.includes('bootstrap:'), true);
  assert.equal(apiFile.includes('/uploads/images'), true);
  assert.equal(apiFile.includes('/ops/bootstrap'), true);

  assert.equal(publishPage.includes('type="file"'), true);
  assert.equal(publishPage.includes('生成演示图'), false);
  assert.equal(publishPage.includes('希望如何获得'), true);
  assert.equal(publishPage.includes('希望对方如何回应'), false);
  assert.equal(publishPage.includes('accept="image/*"'), true);
  assert.equal(publishPage.includes('请先登录后再发布'), true);
  assert.equal(publishPage.includes('至少上传 1 张图片'), true);
  assert.equal(publishPage.includes('api.uploads.uploadImage'), true);
  assert.equal(publishPage.includes('图片上传中'), true);

  assert.equal(topBar.includes('童邻市集'), true);
  assert.equal(topBar.includes('/app-icon.svg'), false);
  assert.equal(topBar.includes('闲置有爱 · 邻里互助 · 绿色成长'), true);
  assert.equal(topBar.includes('href="/login"'), true);
  assert.equal(topBar.includes('XIANGYANG_COMMUNITIES'), false);
  assert.equal(loginPage.includes('XIANGYANG_COMMUNITIES'), false);
  assert.equal(appContext.includes("useState<string>('')"), true);
  assert.equal(appContext.includes('communityOptions'), true);
  assert.equal(appContext.includes('bootstrap'), true);
  assert.equal(normalizeFile.includes("community: String(raw?.community || '襄阳邻里')"), false);

  assert.equal(homePage.includes('Xiangyang Neighborhood Swap'), false);
  assert.equal(homePage.includes('Open Booth'), false);
  assert.equal(loginPage.includes('Neighborhood Demo'), false);
  assert.equal(topBar.includes('真实演示物品'), false);
  assert.equal(homePage.includes('东门口周边 · 儿童闲置交换'), true);
  assert.equal(homePage.includes('让孩子的好物继续被需要'), true);
  assert.equal(homePage.includes('绘本、中小学配套读物、玩具、童装等，看到感兴趣的，先预约沟通，谈好后再当面交接。'), true);
  assert.equal(homePage.includes('东门口 · 儿童好物循环'), false);
  assert.equal(homePage.includes('让孩子闲置的好物，在邻里之间继续被需要。'), false);
});

test('wanted listings without photos render a purpose-built cover instead of an empty image placeholder', () => {
  const itemCard = fs.readFileSync(new URL('../src/components/ItemCard.tsx', import.meta.url), 'utf8');
  const itemImageCarousel = fs.readFileSync(new URL('../src/components/ItemImageCarousel.tsx', import.meta.url), 'utf8');
  const profilePage = fs.readFileSync(new URL('../src/app/profile/page.tsx', import.meta.url), 'utf8');
  const wantedCover = fs.readFileSync(new URL('../src/components/WantedCover.tsx', import.meta.url), 'utf8');

  assert.equal(wantedCover.includes('求购需求'), true);
  assert.equal(wantedCover.includes('预算 ¥'), true);
  assert.equal(wantedCover.includes('CATEGORY_LABELS'), true);
  assert.equal(wantedCover.includes('AGE_LABELS'), true);
  assert.equal(itemCard.includes('<WantedCover item={item} />'), true);
  assert.equal(itemImageCarousel.includes('<WantedCover item={item} />'), true);
  assert.equal(profilePage.includes('<WantedCover item={item} compact />'), true);
});

test('item detail photos support touch carousel and polished portrait landscape fitting', () => {
  const itemDetailPage = fs.readFileSync(new URL('../src/app/items/[id]/page.tsx', import.meta.url), 'utf8');
  const itemImageCarousel = fs.readFileSync(new URL('../src/components/ItemImageCarousel.tsx', import.meta.url), 'utf8');

  assert.equal(itemDetailPage.includes('ItemImageCarousel'), true);
  assert.equal(itemImageCarousel.includes('onTouchStart'), true);
  assert.equal(itemImageCarousel.includes('onTouchEnd'), true);
  assert.equal(itemImageCarousel.includes('blur-2xl'), true);
  assert.equal(itemImageCarousel.includes('object-contain'), true);
  assert.equal(itemImageCarousel.includes('currentIndex + 1'), true);
  assert.equal(itemImageCarousel.includes('aria-label={`查看第 ${index + 1} 张图片`}'), true);
});

test('neighbor trust is shown as exchange-count levels instead of decimal credit scores', () => {
  const profilePage = fs.readFileSync(new URL('../src/app/profile/page.tsx', import.meta.url), 'utf8');
  const itemDetailPage = fs.readFileSync(new URL('../src/app/items/[id]/page.tsx', import.meta.url), 'utf8');
  const adminPage = fs.readFileSync(new URL('../src/app/admin/page.tsx', import.meta.url), 'utf8');
  const trustLevel = fs.readFileSync(new URL('../src/lib/trustLevel.ts', import.meta.url), 'utf8');
  const exchangesRoute = fs.readFileSync(new URL('../../server/src/routes/exchanges.ts', import.meta.url), 'utf8');
  const adminRoute = fs.readFileSync(new URL('../../server/src/routes/admin.ts', import.meta.url), 'utf8');

  for (const label of ['新邻居', '有过交换', '靠谱邻居', '热心邻居']) {
    assert.equal(trustLevel.includes(label), true);
  }

  assert.equal(profilePage.includes('邻里等级'), true);
  assert.equal(profilePage.includes('信用评分'), false);
  assert.equal(profilePage.includes('getTrustLevel(currentUser.exchangeCount)'), true);
  assert.equal(itemDetailPage.includes('getTrustLevel(owner.exchangeCount)'), true);
  assert.equal(itemDetailPage.includes('★★★★★'), false);
  assert.equal(adminPage.includes('getTrustLevel(user.exchange_count)'), true);
  assert.equal(adminPage.includes('信用 {user.credit_score}'), false);
  assert.equal(exchangesRoute.includes('exchange_count = COALESCE(exchange_count, 0) + 1'), true);
  assert.equal(adminRoute.includes('exchange_count = COALESCE(exchange_count, 0) + 1'), true);
});

test('new user welcome modal gives a clear first visit path instead of a long platform manifesto', () => {
  const homePage = fs.readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');

  assert.equal(homePage.includes('欢迎加入'), true);
  assert.equal(homePage.includes('让孩子的闲置好物，在邻里之间继续被喜欢'), true);
  assert.equal(homePage.includes('很多家长都在这样用'), true);
  assert.equal(homePage.includes('先逛附近好物'), true);
  assert.equal(homePage.includes('主推荐'), true);
  assert.equal(homePage.includes('家里闲置太多？'), true);
  assert.equal(homePage.includes('更安心：周边小区 · 当面确认 · 不走平台交易'), true);
  assert.equal(homePage.includes('发布我的闲置'), true);
  assert.equal(homePage.includes("router.push('/publish?type=offer')"), true);
  assert.equal(homePage.includes('我们相信'), false);
  assert.equal(homePage.includes('搭建邻里间的儿童物品流转平台'), false);
});

test('h5 is installable with manifest, branded icon, and a visible add-to-home prompt', () => {
  const layout = fs.readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
  const homePage = fs.readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
  const profilePage = fs.readFileSync(new URL('../src/app/profile/page.tsx', import.meta.url), 'utf8');
  const installPrompt = fs.readFileSync(new URL('../src/components/InstallAppPrompt.tsx', import.meta.url), 'utf8');
  const manifest = fs.readFileSync(new URL('../src/app/manifest.ts', import.meta.url), 'utf8');
  const icon = fs.readFileSync(new URL('../public/app-icon.svg', import.meta.url), 'utf8');

  assert.equal(layout.includes('appleWebApp'), true);
  assert.equal(layout.includes('/app-icon.png'), true);
  assert.equal(homePage.includes('<InstallAppPrompt />'), false);
  assert.equal(profilePage.includes('<InstallAppPrompt />'), true);
  assert.equal(installPrompt.includes('beforeinstallprompt'), true);
  assert.equal(installPrompt.includes('添加到桌面'), true);
  assert.equal(installPrompt.includes('/app-icon.png'), true);
  assert.equal(installPrompt.includes('右上角'), true);
  assert.equal(manifest.includes('童邻市集'), true);
  assert.equal(manifest.includes('/app-icon.png'), true);
  assert.equal(icon.includes('童邻'), true);
});

test('community picker prioritizes Dongmenkou pilot communities while allowing custom nearby communities', () => {
  const picker = fs.readFileSync(new URL('../src/components/CommunityPicker.tsx', import.meta.url), 'utf8');
  const communities = fs.readFileSync(new URL('../src/data/communities.ts', import.meta.url), 'utf8');
  const settingsPage = fs.readFileSync(new URL('../src/app/profile/settings/page.tsx', import.meta.url), 'utf8');

  assert.equal(picker.includes('XIANGYANG_DISTRICTS'), false);
  assert.equal(picker.includes('第一步：选择你所在的区县'), false);
  assert.equal(picker.includes('优先服务东门口周边小区'), true);
  assert.equal(picker.includes('找不到我的小区？手动添加'), true);
  assert.equal(picker.includes('当前主要在东门口周边试点，其他附近小区也可以先使用'), true);
  assert.equal(communities.includes('PILOT_AREA_LABEL'), true);
  assert.equal(communities.includes("district: PILOT_AREA_LABEL"), true);
  for (const name of ['梧桐湾', '清华园', '丽江泊林', '在水一方', '怡和苑']) {
    assert.equal(communities.includes(name), true);
  }
  assert.equal(communities.includes('丽江柏林/在水一方'), false);
  assert.equal(communities.includes('民发・庞公别苑'), false);
  assert.equal(communities.includes('北京公馆'), false);
  assert.equal(settingsPage.includes('填写新的小区名'), true);
  assert.equal(settingsPage.includes('findStandardCommunityName'), true);
  assert.equal(settingsPage.includes('将保存为标准名称'), true);
  assert.equal(settingsPage.includes('<CommunityPicker'), false);
});
