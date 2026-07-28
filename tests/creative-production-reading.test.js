import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreativeReadingPrompt,
  normalizeCreativeUnderstanding,
} from '../packages/creative-production-runtime/src/creative-reading.js';

const NOW = '2026-07-28T00:00:00.000Z';

function valid(overrides = {}) {
  return {
    projectIdentity: { brandName: '冯烫烫', industry: '餐饮', products: ['热卤'] },
    identityLocks: ['品牌名称与 Logo 原样保留'],
    valuableAssets: ['暖色识别'],
    currentProblems: ['旧物料堆叠'],
    upgradePrinciples: ['建立单一焦点'],
    oldPatternsToAvoid: ['禁止旧 VI 合集式拼贴'],
    creativeFreedom: ['可重构场景与构图'],
    assetReadingSummary: [
      { assetId: 'logo', summary: '身份依据', recommendedUsage: 'identity_reference' },
      { assetId: 'poster', summary: '只理解旧问题', recommendedUsage: 'reading_only' },
    ],
    ...overrides,
  };
}

test('Creative Reading prompt forbids image generation and enumerates every original asset', () => {
  const prompt = buildCreativeReadingPrompt({
    visualContext: { identity: { brandName: '冯烫烫' } },
    lockedAssets: [],
    reportText: '升级报告',
    assets: [{ id: 'logo', name: 'logo.png' }, { id: 'poster', name: 'poster.png' }],
  });
  assert.match(prompt, /禁止生成图片/);
  assert.match(prompt, /logo \| logo\.png/);
  assert.match(prompt, /poster \| poster\.png/);
  assert.match(prompt, /reading_only/);
});

test('Creative Understanding accepts a mixed reading strategy and covers all assets', () => {
  const result = normalizeCreativeUnderstanding(valid(), ['logo', 'poster'], NOW);
  assert.equal(result.assetReadingSummary.length, 2);
  assert.equal(result.generatedAt, NOW);
});

test('Creative Understanding minimal gates block all-final-reference and changeable Logo', () => {
  assert.throws(() => normalizeCreativeUnderstanding(valid({
    assetReadingSummary: [
      { assetId: 'logo', summary: '身份', recommendedUsage: 'identity_reference' },
      { assetId: 'poster', summary: '也作为身份', recommendedUsage: 'identity_reference' },
    ],
  }), ['logo', 'poster'], NOW), { code: 'ALL_ASSETS_MARKED_FINAL_REFERENCE' });
  assert.throws(() => normalizeCreativeUnderstanding(valid({
    creativeFreedom: ['Logo 可以自由重绘'],
  }), ['logo', 'poster'], NOW), { code: 'LOGO_MARKED_CHANGEABLE' });
});

test('Creative Understanding rejects missing or invented asset classifications', () => {
  assert.throws(() => normalizeCreativeUnderstanding(valid({
    assetReadingSummary: [{ assetId: 'invented', summary: '虚构', recommendedUsage: 'reading_only' }],
  }), ['logo', 'poster'], NOW), { code: 'ASSET_READING_SUMMARY_INVALID' });
});
