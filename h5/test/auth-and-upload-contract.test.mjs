import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('frontend exposes unified email-code auth, community setup, and real image upload affordances', () => {
  const loginPage = fs.readFileSync(new URL('../src/app/login/page.tsx', import.meta.url), 'utf8');
  const homePage = fs.readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
  const publishPage = fs.readFileSync(new URL('../src/app/publish/page.tsx', import.meta.url), 'utf8');
  const topBar = fs.readFileSync(new URL('../src/components/TopBar.tsx', import.meta.url), 'utf8');
  const appContext = fs.readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');
  const normalizeFile = fs.readFileSync(new URL('../src/lib/normalize.ts', import.meta.url), 'utf8');
  const apiFile = fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');

  assert.equal(loginPage.includes('QQ邮箱'), true);
  assert.equal(loginPage.includes('邮箱验证码登录'), true);
  assert.equal(loginPage.includes('首次使用还需要补全小区和昵称'), true);
  assert.equal(loginPage.includes('获取验证码'), true);
  assert.equal(loginPage.includes('继续使用'), true);
  assert.equal(loginPage.includes('当前验证码'), false);
  assert.equal(loginPage.includes('找回密码'), false);
  assert.equal(loginPage.includes('密码'), false);

  assert.equal(apiFile.includes('sendCode:'), true);
  assert.equal(apiFile.includes('verifyCode:'), true);
  assert.equal(apiFile.includes('setupProfile:'), true);
  assert.equal(apiFile.includes('uploadImage:'), true);
  assert.equal(apiFile.includes('bootstrap:'), true);
  assert.equal(apiFile.includes('/uploads/images'), true);
  assert.equal(apiFile.includes('/ops/bootstrap'), true);

  assert.equal(publishPage.includes('type="file"'), true);
  assert.equal(publishPage.includes('生成演示图'), false);
  assert.equal(publishPage.includes('accept="image/*"'), true);
  assert.equal(publishPage.includes('请先登录后再发布'), true);
  assert.equal(publishPage.includes('至少上传 1 张图片'), true);
  assert.equal(publishPage.includes('api.uploads.uploadImage'), true);
  assert.equal(publishPage.includes('图片上传中'), true);

  assert.equal(topBar.includes('选择小区'), true);
  assert.equal(topBar.includes('onClick'), true);
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
});
