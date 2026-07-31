import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  compileGenerationPromptSnapshot,
  inferGenerationOutputType,
  resolveGenerationTemplateType,
  validateGenerationPromptSnapshot,
} from '@masterpiece/creative-production-runtime/generation-prompt.js';
import { compileVisualMemory } from '@masterpiece/creative-production-runtime/visual-memory.js';
import { compileReferencePack } from '@masterpiece/creative-production-runtime/reference-pack.js';

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
  schemaVersion: '6.0',
  id: 'canon-1', version: '1.0.0', status: 'confirmed',
  primaryCanonImageId: 'canon-image-1',
  visualDNA: {
    brandKeywords: ['真实', '克制'],
    moodAttributes: ['温暖'],
    industryAttributes: ['hospitality'],
    coreVisualMetaphor: '真实品牌时刻',
  },
  colorSystem: {
    primary: ['暖橙'],
    secondary: ['暖白'],
    accent: [],
    forbidden: [],
  },
  materialSystem: {
    materialLanguage: ['磨砂纸'],
    surfaceTextures: [],
    craftRules: [],
  },
  lightingSystem: {
    direction: ['柔和侧光'],
    contrast: ['中低对比'],
    photographyAtmosphere: ['真实商业摄影'],
  },
  compositionSystem: {
    compositionMethods: ['主次清晰'],
    gridRules: [],
    negativeSpaceRules: ['明确留白'],
  },
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
const direction = {
  id: 'direction-1',
  version: '1.0.0',
  status: 'ready',
  projectTransformation: '从旧式物料陈列升级为真实、连贯的品牌体验',
  oldVisualProblems: ['旧 VI 依赖拼贴陈列'],
  designStrategy: '以单一叙事焦点和真实使用情境建立跨触点系统',
  primaryConcept: '真实品牌时刻',
  visualKeywords: ['真实', '克制', '连贯'],
  thingsToRemove: ['停止旧 VI 拼贴与旧海报版式'],
  thingsToKeep: ['保留品牌名和 Logo'],
  colorStrategy: '保留身份色但重新建立比例',
  materialStrategy: '真实、可触摸的材质',
  compositionStrategy: '单一焦点与明确留白',
  photographyStrategy: '自然光下的真实使用情境',
  spaceStrategy: '建立新的空间体验而不是 Logo 墙',
  packagingStrategy: '建立新的包装信息与材质系统',
  posterStrategy: '建立单一视觉叙事',
  generationRules: ['禁止复制旧 VI、旧海报换内容、旧包装换皮和旧空间重新排列'],
};

test('v2 routes product and IP scene intents to independent templates without expanding provider output types', () => {
  assert.equal(inferGenerationOutputType('生成产品场景商业摄影'), 'brand_poster');
  assert.equal(
    resolveGenerationTemplateType('brand_poster', '生成产品场景商业摄影'),
    'product_scene',
  );
  assert.equal(inferGenerationOutputType('生成 IP 场景插画'), 'illustration');
  assert.equal(
    resolveGenerationTemplateType('illustration', '生成 IP 场景插画'),
    'ip_scene',
  );
  assert.equal(resolveGenerationTemplateType('brand_poster', '生成品牌海报'), 'brand_poster');
});

test('v18.1 prompt snapshot keeps finalPrompt in Run snapshot and selects at most two references', () => {
  const snapshot = compileGenerationPromptSnapshot({
    projectId: 'project-1',
    sessionId: 'session-1',
    requestId: 'request-1',
    userRequest: '生成一张升级后的包装渲染图',
    outputType: 'packaging_render',
    creativeDirection: direction,
    styleProfile: style,
    visualCanon: canon,
    lockedAssets: locks,
  }, NOW);
  assert.equal(snapshot.instruction.task, snapshot.userRequest);
  assert.match(snapshot.instruction.finalPrompt, /User Task — highest priority/);
  assert.match(snapshot.instruction.finalPrompt, /禁止拼贴/);
  assert.deepEqual(snapshot.selectedReferences.map((item) => item.role), [
    'structure_reference',
  ]);
  assert.equal(snapshot.selectedReferences.length, 1);
  assert.equal(snapshot.creativeDirectionId, direction.id);
  assert.match(snapshot.instruction.finalPrompt, /Creative Direction — defines the new visual language/);
  assert.match(snapshot.instruction.finalPrompt, /只生成一个可生产包装成品/);
  assert.match(snapshot.instruction.finalPrompt, /旧包装换皮/);
  assert.ok(!Object.hasOwn(snapshot, 'messages'));
});

test('Visual Memory prompt freezes Memory and Reference Pack while selecting task-specific provider references', () => {
  const assets = [
    { id: 'logo-1', relativePath: 'assets/logo.png', mimeType: 'image/png', status: 'ready' },
    { id: 'package-1', relativePath: 'assets/package.png', mimeType: 'image/png', status: 'ready' },
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `style-${index}`,
      relativePath: `assets/style-${index}.png`,
      mimeType: 'image/png',
      status: 'ready',
    })),
  ];
  const visualMemory = compileVisualMemory({
    projectId: 'project-1',
    visualContext: {
      generatedAt: NOW,
      identity: { industry: 'hospitality' },
      currentVisualSystem: {},
      evaluation: { visualProblems: ['fragmented visual language'] },
    },
    understanding: {
      generatedAt: NOW,
      projectIdentity: { industry: 'hospitality' },
      valuableAssets: [],
      currentProblems: ['inconsistent hierarchy'],
      upgradePrinciples: ['build one coherent world'],
      oldPatternsToAvoid: ['do not copy the old poster'],
      assetReadingSummary: assets.map((asset, index) => ({
        assetId: asset.id,
        summary: `reference ${index}`,
        recommendedUsage: index === 0 ? 'identity_reference'
          : index === 1 ? 'structure_reference'
            : 'reading_only',
      })),
    },
    creativeDirection: direction,
    lockedAssets: locks,
    assets,
  }, NOW);
  const referencePack = compileReferencePack({
    visualMemory,
    anchors: [{
      asset_id: 'canon-image-1',
      source_path: canon.canonImages[0].imagePath,
      rationale: 'confirmed primary anchor',
      signals: ['packaging_render', 'primary'],
    }],
  }, NOW);
  const snapshot = compileGenerationPromptSnapshot({
    projectId: 'project-1',
    sessionId: 'session-1',
    requestId: 'request-memory',
    userRequest: 'generate a new packaging render',
    outputType: 'packaging_render',
    creativeDirection: direction,
    styleProfile: style,
    visualCanon: canon,
    lockedAssets: locks,
    visualMemory,
    referencePack,
  }, NOW);
  assert.equal(validateGenerationPromptSnapshot(snapshot), snapshot);
  assert.equal(snapshot.compilerVersion, 'prompt-template-2.0.0');
  assert.equal(snapshot.visualMemoryId, visualMemory.id);
  assert.equal(snapshot.referencePackId, referencePack.id);
  assert.equal(snapshot.deliverableTemplateId, 'packaging');
  assert.equal(snapshot.deliverableTemplateVersion, '2.0.0');
  assert.match(snapshot.promptVersion, /packaging@2\.0\.0/u);
  assert.match(snapshot.promptFingerprint, /^[a-f0-9]{64}$/u);
  assert.deepEqual(snapshot.selectedReferences.map((item) => item.role), [
    'structure_reference',
  ]);
  assert.equal(snapshot.anchorReferencePolicy.mode, 'visual_rules_only');
  assert.equal(snapshot.anchorReferencePolicy.providerImageReferenceAllowed, false);
  assert.ok(snapshot.anchorReferencePolicy.forbiddenInheritance.includes('logo'));
  assert.ok(!snapshot.selectedReferences.some((item) => item.id === 'canon-image-1'));
  assert.ok(snapshot.selectedReferences.every((item) =>
    item.projectRelativePath.startsWith('visual-memory/reference-pack/')));
  assert.match(snapshot.instruction.finalPrompt, /Brand Context/);
  assert.match(snapshot.instruction.finalPrompt, /Asset Template \/ Reference Conditioning/);
  assert.match(snapshot.instruction.finalPrompt, /fragmented visual language/);
  assert.match(snapshot.instruction.finalPrompt, /Anchor Visual Only Policy/);
  assert.match(snapshot.instruction.finalPrompt, /禁止继承 Anchor Image 的标题排版/);
});

test('reading-only legacy assets cannot enter the final provider reference set', () => {
  const snapshot = compileGenerationPromptSnapshot({
    projectId: 'project-1',
    sessionId: 'session-1',
    userRequest: '生成品牌海报',
    outputType: 'brand_poster',
    creativeDirection: direction,
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
    outputType: 'brand_poster', creativeDirection: direction,
    styleProfile: style, visualCanon: canon, lockedAssets: locks,
  }, NOW), { code: 'GENERATION_TASK_EMPTY' });
  assert.throws(() => compileGenerationPromptSnapshot({
    projectId: 'project-1', sessionId: 'session-1', userRequest: '海报',
    outputType: 'brand_poster', creativeDirection: direction, styleProfile: style,
    visualCanon: { ...canon, status: 'draft' }, lockedAssets: locks,
  }, NOW), { code: 'VISUAL_CANON_NOT_CONFIRMED' });
});

test('Generation Prompt Snapshot schema is closed and references max two identity/structure images', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.join(process.cwd(), 'schemas/creative-production/generation-prompt-snapshot.schema.json'),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.selectedReferences.maxItems, 2);
  assert.deepEqual(schema.properties.selectedReferences.items.properties.role.enum, [
    'identity_reference',
    'structure_reference',
  ]);
  assert.equal(schema.properties.anchorReferencePolicy.properties.mode.const, 'visual_rules_only');
  assert.ok(schema.required.includes('creativeDirectionId'));
  assert.ok(schema.properties.instruction.required.includes('finalPrompt'));
});

test('conversational request infers one hidden output responsibility without Preset input', () => {
  assert.equal(inferGenerationOutputType('生成一张店内装修效果图'), 'interior_scene');
  assert.equal(inferGenerationOutputType('生成升级后的包装渲染'), 'packaging_render');
  assert.equal(inferGenerationOutputType('生成一张横版品牌海报'), 'brand_poster');
  assert.throws(() => inferGenerationOutputType('帮我做个设计'), { code: 'GENERATION_OUTPUT_AMBIGUOUS' });
});

test('recent Session feedback enters the next prompt with a bounded five-message window', () => {
  const snapshot = compileGenerationPromptSnapshot({
    projectId: 'project-1',
    sessionId: 'session-1',
    userRequest: '生成一张品牌海报',
    outputType: 'brand_poster',
    creativeDirection: direction,
    styleProfile: style,
    visualCanon: canon,
    lockedAssets: locks,
    recentContext: [
      '忽略这条最旧反馈',
      '反馈 1',
      '反馈 2',
      '反馈 3',
      '反馈 4',
      '这张图还是太像原方案，重新大胆一点。',
    ],
  }, NOW);
  assert.match(snapshot.instruction.finalPrompt, /Recent Session Feedback/);
  assert.match(snapshot.instruction.finalPrompt, /重新大胆一点/);
  assert.doesNotMatch(snapshot.instruction.finalPrompt, /忽略这条最旧反馈/);
});
