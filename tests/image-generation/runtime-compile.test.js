// 生图功能 V1 Phase 2：Prompt Compiler / Reference Selector / 三层 Gate 单元测试。
// 全部为确定性纯逻辑，无网络、无文件 IO。
// 运行：node --test tests/image-generation/runtime-compile.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import { compileImageGenerationTask } from '../../packages/image-generation-runtime/src/task-builder.js';
import { compilePrompt, TEXT_SAFETY_RULES } from '../../packages/image-generation-runtime/src/prompt-compiler.js';
import { orderReferences, selectReferences } from '../../packages/image-generation-runtime/src/reference-selector.js';
import {
  evaluateIdentityGate,
  evaluateTaskGate,
  evaluateArtifactGate,
} from '../../packages/image-generation-runtime/src/gates.js';

// ── Fixtures ──

function resolvedContext() {
  return {
    schemaVersion: '1.0',
    projectId: 'proj-1',
    generatedAt: '2026-01-01T00:00:00.000Z',
    identity: { projectName: '冯烫烫', brandName: '冯烫烫', industry: '餐饮' },
    lockedAssets: { logoLocked: true, logoAssetIds: ['logo-1'], lockedFacts: ['主色为暖橙'] },
    products: ['招牌烫菜'],
    services: ['堂食'],
    targetAudience: ['年轻上班族'],
    pricePositioning: '中端',
    businessModel: '连锁',
    brandPersonality: ['热闹'],
    visualPreferences: ['可调整版式'],
    currentVisualSystem: {
      existingVisualAssets: [],
      primaryColors: ['#E8622D'],
      supportingColors: [],
      graphicAssets: [],
      typographySignals: [],
      materialSignals: [],
      photographySignals: [],
    },
    packaging: { structures: [], status: 'unknown', evidenceSources: [] },
    businessTouchpoints: { packaging: ['外卖盒'], viApplications: [], spatial: [], digital: [] },
    prohibitedDirections: ['禁止冷淡性冷淡风'],
    uncertainties: [],
    conflicts: [],
    sourceVersions: { resolverVersion: '1.0' },
  };
}

function capsule() {
  return {
    schemaVersion: '1.0',
    sourceRunId: 'ref-run-1',
    currentProjectId: 'proj-1',
    generatedAt: '2026-01-01T00:00:00.000Z',
    currentProject: {
      brandName: '冯烫烫',
      industry: '餐饮',
      logoLocked: true,
      logoAssetIds: ['logo-1'],
      lockedFacts: ['主色为暖橙'],
      coreProducts: ['招牌烫菜'],
      businessTouchpoints: ['外卖盒'],
    },
    projectFacts: {
      coreProducts: ['招牌烫菜'],
      services: ['堂食'],
      touchpoints: { packaging: ['外卖盒'], viApplications: [], serviceMaterials: [], spatial: [], digital: [] },
      designAdvice: [],
      uncertainties: [],
    },
    inheritedStyle: {
      color: ['暖橙主色 + 米白背景'],
      layoutAndTypography: ['大标题 + 网格'],
      graphicLanguage: ['手绘食材图形'],
      materialAndPhotography: ['哑光纸质感'],
      extensionMechanism: ['图形可平铺'],
    },
    userPreference: '希望更有烟火气',
    userAvoidance: ['避免高冷极简'],
    prohibitedReferenceIdentity: {
      brandNames: ['某参考品牌X'],
      logos: ['参考品牌X的圆形logo'],
      slogans: ['参考品牌X的slogan'],
      signatureGraphics: ['参考品牌X的波浪纹'],
      proprietaryPatterns: [],
    },
    anchorGoal: '确立冯烫烫的暖橙烟火气主视觉',
    aspectRatio: '16:9',
    humanNotes: [],
    uncertainties: [],
  };
}

function references() {
  return [
    { assetId: 'ref-style-1', role: 'reference_style', localPath: '/a/ref1.png', sha256: 'h1', source: 'reference_anchor_run', includeReason: '色彩参考' },
    { assetId: 'logo-1', role: 'current_project_logo', localPath: '/a/logo.png', sha256: 'h2', source: 'project_visual_context', includeReason: '品牌Logo' },
    { assetId: 'prod-1', role: 'current_project_product', localPath: '/a/prod.png', sha256: 'h3', source: 'project_visual_context', includeReason: '产品结构' },
  ];
}

function capabilities(overrides = {}) {
  return {
    providerId: 'dashscope',
    modelId: 'wan2.7-image-pro',
    supportsTextToImage: true,
    supportsMultiImageReference: true,
    supportsNegativePrompt: true,
    supportsRemoteCancel: true,
    maxReferenceImages: 6,
    maxOutputCount: 1,
    supportedSizes: ['2048*1152', '1024*1024'],
    outputMimeTypes: ['image/png'],
    ...overrides,
  };
}

function compileInput(overrides = {}) {
  return {
    projectId: 'proj-1',
    runId: 'run-1',
    taskId: 'task-1',
    referenceAnchorRunId: 'ref-run-1',
    anchorApproved: true,
    resolvedContext: resolvedContext(),
    capsule: capsule(),
    anchorBriefMarkdown: '# Anchor Brief\n暖橙烟火气主视觉方向。',
    references: references(),
    capabilities: capabilities(),
    providerConfig: { apiKey: 'sk-xxx', baseUrl: 'https://example.com', model: 'wan2.7-image-pro' },
    parameters: { size: '2048*1152', region: 'beijing', aspectRatio: '16:9' },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Reference Selector ──

test('orderReferences sorts by role priority and is stable within a role', () => {
  const ordered = orderReferences(references());
  assert.deepEqual(ordered.map((r) => r.assetId), ['logo-1', 'prod-1', 'ref-style-1']);
});

test('selectReferences reduces to maxReferenceImages with REFERENCE_IMAGES_REDUCED and keeps identity first', () => {
  const many = [
    ...references(),
    { assetId: 'ref-style-2', role: 'reference_style', localPath: '/a/r2.png', sha256: 'x', source: 'reference_anchor_run', includeReason: 'r2' },
    { assetId: 'ref-style-3', role: 'reference_style', localPath: '/a/r3.png', sha256: 'y', source: 'reference_anchor_run', includeReason: 'r3' },
  ];
  const { selected, warnings } = selectReferences(many, capabilities({ maxReferenceImages: 3 }));
  assert.equal(selected.length, 3);
  assert.deepEqual(selected.map((r) => r.role).slice(0, 3), [
    'current_project_logo',
    'current_project_product',
    'reference_style',
  ]);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, 'REFERENCE_IMAGES_REDUCED');
});

// ── Prompt Compiler ──

test('compilePrompt produces fixed A–K structure with text safety and prohibited identity', () => {
  const { compiledPromptMarkdown, providerPayloadPreview, promptSourceMap } = compilePrompt({
    resolvedContext: resolvedContext(),
    capsule: capsule(),
    anchorBriefMarkdown: 'brief',
    references: orderReferences(references()),
    capabilities: capabilities(),
    parameters: { size: '2048*1152', aspectRatio: '16:9' },
    modelId: 'wan2.7-image-pro',
  });
  for (const sec of ['## A.', '## B.', '## C.', '## D.', '## E.', '## F.', '## G.', '## H.', '## I.', '## J.', '## K.']) {
    assert.ok(compiledPromptMarkdown.includes(sec), `缺少段落 ${sec}`);
  }
  for (const rule of TEXT_SAFETY_RULES) {
    assert.ok(compiledPromptMarkdown.includes(rule), `缺少文字安全条款：${rule}`);
  }
  // 禁止的参考品牌身份必须写入 I 段
  assert.ok(compiledPromptMarkdown.includes('某参考品牌X'));
  // payload 参考图顺序 = logo→product→style
  assert.deepEqual(providerPayloadPreview.referenceImages.map((r) => r.assetId), ['logo-1', 'prod-1', 'ref-style-1']);
  // payload 不含 apiKey
  assert.ok(!JSON.stringify(providerPayloadPreview).toLowerCase().includes('apikey'));
  assert.equal(promptSourceMap.upstream.capsuleSourceRunId, 'ref-run-1');
});

test('compilePrompt is deterministic (same input → identical output)', () => {
  const args = {
    resolvedContext: resolvedContext(),
    capsule: capsule(),
    anchorBriefMarkdown: 'brief',
    references: orderReferences(references()),
    capabilities: capabilities(),
    parameters: { size: '2048*1152', aspectRatio: '16:9' },
    modelId: 'wan2.7-image-pro',
  };
  const a = compilePrompt(args);
  const b = compilePrompt(args);
  assert.equal(a.compiledPromptMarkdown, b.compiledPromptMarkdown);
  assert.deepEqual(a.providerPayloadPreview, b.providerPayloadPreview);
});

// ── task-builder (dry-run) ──

test('compileImageGenerationTask happy path passes pre-submit gates', () => {
  const result = compileImageGenerationTask(compileInput());
  assert.equal(result.gate.blocked, false);
  assert.deepEqual(result.gate.errors, []);
  assert.equal(result.task.outputType, 'master_anchor_image');
  assert.equal(result.task.providerId, 'dashscope');
  assert.equal(result.task.parameters.outputCount, 1);
  assert.equal(result.task.parameters.watermark, false);
  assert.equal(result.snapshot.brandName, '冯烫烫');
});

// ── Gate A ──

test('Gate A blocks when context missing / anchor not approved / unresolved conflict', () => {
  assert.ok(evaluateIdentityGate({}).some((e) => e.code === 'CURRENT_PROJECT_CONTEXT_MISSING'));

  const notApproved = evaluateIdentityGate({ resolvedContext: resolvedContext(), anchorApproved: false, capsule: capsule(), compiledPromptMarkdown: '某参考品牌X 参考品牌X的圆形logo 参考品牌X的slogan 参考品牌X的波浪纹' });
  assert.ok(notApproved.some((e) => e.code === 'REFERENCE_ANCHOR_NOT_APPROVED'));

  const ctx = resolvedContext();
  ctx.conflicts = [{ field: 'brandName', visualValue: 'a', documentValue: 'b', resolution: 'unresolved' }];
  const conflict = evaluateIdentityGate({ resolvedContext: ctx, anchorApproved: true, capsule: capsule(), compiledPromptMarkdown: '某参考品牌X 参考品牌X的圆形logo 参考品牌X的slogan 参考品牌X的波浪纹' });
  assert.ok(conflict.some((e) => e.code === 'LOCKED_ASSET_CONFLICT_UNRESOLVED'));
});

test('Gate A flags reference identity leak when prohibited brand missing from prompt', () => {
  const errs = evaluateIdentityGate({
    resolvedContext: resolvedContext(),
    anchorApproved: true,
    capsule: capsule(),
    compiledPromptMarkdown: '一个不含任何禁止身份的 prompt',
  });
  assert.ok(errs.some((e) => e.code === 'REFERENCE_BRAND_IDENTITY_LEAK'));
  assert.ok(errs.some((e) => e.code === 'REFERENCE_LOGO_DIRECT_COPY'));
});

// ── Gate B ──

test('Gate B blocks on missing brief / unsupported size / no identity ref / missing provider config', () => {
  const errs = evaluateTaskGate({
    anchorBriefMarkdown: '',
    task: { projectId: 'p', runId: 'r', sourceReferenceAnchorRunId: 'ra', providerId: 'dashscope', modelId: 'wan2.7-image-pro', region: 'beijing', outputType: 'master_anchor_image' },
    compiledPromptMarkdown: 'x',
    references: [{ assetId: 's', role: 'reference_style', localPath: '/a', sha256: 'h', source: 'reference_anchor_run', includeReason: 'x' }],
    capabilities: capabilities(),
    providerConfig: null,
    parameters: { size: '999*999' },
  });
  assert.ok(errs.some((e) => e.code === 'ANCHOR_GENERATION_BRIEF_MISSING'));
  assert.ok(errs.some((e) => e.code === 'ASPECT_OR_SIZE_UNSUPPORTED'));
  assert.ok(errs.some((e) => e.code === 'REFERENCE_IMAGE_MISSING'));
  assert.ok(errs.some((e) => e.code === 'PROVIDER_CONFIG_MISSING'));
});

// ── Gate C ──

test('Gate C passes for a valid downloaded PNG and flags problems otherwise', () => {
  const ok = evaluateArtifactGate({
    providerTaskId: 'ptid',
    providerResult: { images: [{ url: 'https://x/y.png' }] },
    downloaded: { mimeType: 'image/png', sizeBytes: 12345, sha256: 'abc', decoded: true, written: true },
  });
  assert.deepEqual(ok, []);

  const missing = evaluateArtifactGate({ providerTaskId: 'ptid', providerResult: null });
  assert.ok(missing.some((e) => e.code === 'PROVIDER_RESULT_MISSING'));

  const badMime = evaluateArtifactGate({
    providerTaskId: 'ptid',
    providerResult: { images: [{ url: 'https://x/y.gif' }] },
    downloaded: { mimeType: 'image/gif', sizeBytes: 10, sha256: 'abc', decoded: true, written: true },
  });
  assert.ok(badMime.some((e) => e.code === 'IMAGE_MIME_INVALID'));

  const empty = evaluateArtifactGate({
    providerTaskId: 'ptid',
    providerResult: { images: [{ url: 'https://x/y.png' }] },
    downloaded: { mimeType: 'image/png', sizeBytes: 0, sha256: 'abc', decoded: true, written: true },
  });
  assert.ok(empty.some((e) => e.code === 'IMAGE_FILE_EMPTY'));
});
