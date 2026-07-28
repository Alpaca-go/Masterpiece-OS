import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  compileGenerationPromptSnapshot,
  inferGenerationOutputType,
} from '../packages/creative-production-runtime/src/generation-prompt.js';

const NOW = '2026-07-28T00:00:00.000Z';
const style = {
  id: 'style-1', version: '1.0.0', status: 'confirmed',
  promptComponents: { required: ['暖橙主色'], negative: ['旧 VI 拼贴'] },
  forbiddenVariations: ['复制旧海报'],
  compositionSystem: { hierarchy: ['主次清晰'], focalPointRules: ['单一焦点'] },
  materialAndTexture: { materials: ['磨砂纸'] },
  lightingSystem: { type: '柔和侧光', contrast: '中低对比' },
  typographyCompatibility: ['简洁中文标题'],
  graphicLanguage: { coreMotifs: ['抽象线条'] },
};
const canon = {
  id: 'canon-1', version: '1.0.0', status: 'confirmed',
  primaryCanonImageId: 'canon-image-1',
  sharedRules: ['整体气质统一'],
  canonImages: [{
    id: 'canon-image-1', type: 'brand_hero', priority: 'primary',
    role: '整体视觉基准', imagePath: 'anchors/candidates/a/image.webp',
  }],
};
const locks = [
  {
    id: 'lock-logo', type: 'logo', priority: 'critical', sourceAssetId: 'logo-1',
    sourceFile: 'assets/logo.png', rule: 'Logo 原样保留', forbiddenChanges: ['不得重绘 Logo'],
  },
  {
    id: 'lock-structure', type: 'packaging_structure', priority: 'critical',
    sourceAssetId: 'package-1', sourceFile: 'assets/package.png',
    rule: '包装结构不变', forbiddenChanges: ['不得改变盒型'],
  },
];

test('V18 prompt snapshot keeps finalPrompt in Run snapshot and selects at most three references', () => {
  const snapshot = compileGenerationPromptSnapshot({
    projectId: 'project-1',
    sessionId: 'session-1',
    requestId: 'request-1',
    userRequest: '生成一张升级后的包装渲染图',
    outputType: 'packaging_render',
    styleProfile: style,
    visualCanon: canon,
    lockedAssets: locks,
  }, NOW);
  assert.equal(snapshot.instruction.task, snapshot.userRequest);
  assert.match(snapshot.instruction.finalPrompt, /User Task — highest priority/);
  assert.match(snapshot.instruction.finalPrompt, /禁止拼贴/);
  assert.deepEqual(snapshot.selectedReferences.map((item) => item.role), [
    'identity_reference', 'structure_reference', 'core_reference',
  ]);
  assert.equal(snapshot.selectedReferences.length, 3);
  assert.ok(!Object.hasOwn(snapshot, 'messages'));
});

test('reading-only legacy assets cannot enter the final provider reference set', () => {
  const snapshot = compileGenerationPromptSnapshot({
    projectId: 'project-1',
    sessionId: 'session-1',
    userRequest: '生成品牌海报',
    outputType: 'brand_poster',
    styleProfile: style,
    visualCanon: canon,
    lockedAssets: locks,
    understanding: {
      assetReadingSummary: [{ assetId: 'old-poster', recommendedUsage: 'reading_only' }],
    },
  }, NOW);
  assert.ok(!snapshot.selectedReferences.some((item) => item.id === 'old-poster'));
});

test('prompt compiler fails closed for empty tasks and unconfirmed Canon', () => {
  assert.throws(() => compileGenerationPromptSnapshot({
    projectId: 'project-1', sessionId: 'session-1', userRequest: '',
    outputType: 'brand_poster', styleProfile: style, visualCanon: canon, lockedAssets: locks,
  }, NOW), { code: 'GENERATION_TASK_EMPTY' });
  assert.throws(() => compileGenerationPromptSnapshot({
    projectId: 'project-1', sessionId: 'session-1', userRequest: '海报',
    outputType: 'brand_poster', styleProfile: style,
    visualCanon: { ...canon, status: 'draft' }, lockedAssets: locks,
  }, NOW), { code: 'VISUAL_CANON_NOT_CONFIRMED' });
});

test('Generation Prompt Snapshot schema is closed and references max three images', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.join(process.cwd(), 'schemas/creative-production/generation-prompt-snapshot.schema.json'),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.selectedReferences.maxItems, 3);
  assert.ok(schema.properties.instruction.required.includes('finalPrompt'));
});

test('conversational request infers one hidden output responsibility without Preset input', () => {
  assert.equal(inferGenerationOutputType('生成一张店内装修效果图'), 'interior_scene');
  assert.equal(inferGenerationOutputType('生成升级后的包装渲染'), 'packaging_render');
  assert.equal(inferGenerationOutputType('生成一张横版品牌海报'), 'brand_poster');
  assert.throws(() => inferGenerationOutputType('帮我做个设计'), { code: 'GENERATION_OUTPUT_AMBIGUOUS' });
});
