import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('publish page shows a hard ban message for pets and live animals instead of generic sensitive-word copy', () => {
  const publishPage = fs.readFileSync(new URL('../src/app/publish/page.tsx', import.meta.url), 'utf8');
  const adminPage = fs.readFileSync(new URL('../src/app/admin/page.tsx', import.meta.url), 'utf8');
  const sensitiveService = fs.readFileSync(new URL('../../server/src/services/sensitiveWord.ts', import.meta.url), 'utf8');

  assert.equal(publishPage.includes('LIVE_ANIMAL_FORBIDDEN'), true);
  assert.equal(publishPage.includes('PROTOCOL_FORBIDDEN'), true);
  assert.equal(publishPage.includes('平台不支持发布或转让宠物、活体动物及相关领养、赠送、交易信息'), true);
  assert.equal(publishPage.includes('请不要通过更换称呼或拆分文字继续发布'), true);
  assert.equal(adminPage.includes('食品药品'), true);
  assert.equal(adminPage.includes('贴身卫生风险'), true);
  assert.equal(adminPage.includes('资金风险'), true);
  assert.equal(sensitiveService.includes("'food_medicine'"), true);
  assert.equal(sensitiveService.includes("'hygiene_risk'"), true);
  assert.equal(sensitiveService.includes("'dangerous_goods'"), true);
  assert.equal(sensitiveService.includes("'privacy'"), true);
  assert.equal(sensitiveService.includes("'小伙伴'"), true);
  assert.equal(sensitiveService.includes("'不养了'"), true);
});
