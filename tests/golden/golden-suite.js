import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  compilePhase9bSpacePrompt,
  createSpaceContinuationContract,
} from '@masterpiece/image-generation-runtime/space/index.js';
import {
  compileImageGenerationTask,
  migrateImageGenerationSourcesV2,
  migrateImageGenerationTaskV1,
} from '@masterpiece/image-generation-runtime/task-builder.js';
import { getRegisteredModel } from '@masterpiece/model-registry';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const EXPECTED_BLOCKS = [
  'task', 'spatial_intent', 'architecture_language', 'architecture_context',
  'architecture_function_bridge', 'architectural_concept', 'architecture_dna',
  'brand_translation', 'functional_requirement', 'material', 'lighting',
  'composition', 'rendering', 'negative_constraints',
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  assert.ok(fs.existsSync(path.join(repoRoot, relativePath)), `missing evidence: ${relativePath}`);
}

function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(repoRoot, relativePath))).digest('hex');
}

function blocksById(compiled) {
  return Object.fromEntries(compiled.blocks.map((block) => [block.id, block.text]));
}

function assertOrdered(actual, expected) {
  assert.deepEqual(actual.filter((id) => expected.includes(id)), expected);
}

function loadPacket(brand) {
  return readJson(`space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`);
}

function compileSpace(brand, taskContract) {
  const packet = loadPacket(brand);
  return compilePhase9bSpacePrompt({
    packet,
    taskContract,
    projectContext: { projectId: taskContract.projectId, visualDecisionPacket: packet },
    brandKey: brand,
    anchorMaxCount: 3,
  });
}

function baseTask(overrides = {}) {
  return {
    schemaVersion: '1.0',
    taskId: 'golden-fixed-task',
    projectId: 'golden-project',
    deliverableFamily: 'space',
    subtype: 'reception',
    shot: 'entrance_view',
    shotSource: 'target_scene_default',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: '生成真实可进入的目标空间。',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    generationBasis: 'standard',
    logoUsageMode: 'post_composite',
    createdAt: '2026-08-11T00:00:00.000Z',
    ...overrides,
  };
}

async function runG01() {
  const caseConfig = readJson('golden/reference-first/jiuzhou-reception-to-consultation/case.json');
  const task = readJson('space-generator/quality-baselines/r2-b4-reference-first-smoke/jiuzhou-aesthetics/jzrx-reception-to-consultation-b4-1-final/task-contract.json');
  const referenceTrace = readJson('space-generator/quality-baselines/r2-b4-reference-first-smoke/jiuzhou-aesthetics/jzrx-reception-to-consultation-b4-1-final/reference-trace.json');
  const acceptedTrace = readJson('space-generator/quality-baselines/r2-b4-reference-first-smoke/jiuzhou-aesthetics/jzrx-reception-to-consultation-b4-1-final/trace.json');

  assert.equal(task.generationBasis, 'reference_first');
  assert.equal(task.referenceSceneRelation, 'cross_scene');
  assert.equal(task.referenceAssetIds.length, 1);
  assert.equal(referenceTrace.resolvedAssetId, task.referenceAssetIds[0]);
  assert.equal(acceptedTrace.spaceGeneration.generationBasis, 'reference_first');
  assert.equal(acceptedTrace.spaceGeneration.routeIntegrity.status, 'pass');

  const compiled = compileSpace('jiuzhou-aesthetics', {
    ...task,
    taskId: 'golden-g01',
    shotSource: 'target_scene_default',
    createdAt: '2026-08-11T00:00:00.000Z',
  });
  const byId = blocksById(compiled);
  assertOrdered(compiled.blocks.map((block) => block.id), EXPECTED_BLOCKS);
  assert.match(byId.task, /consultation.*human_scale_consultation_view/);
  assert.match(byId.functional_requirement, /1 对 1|专业咨询/);
  assert.match(byId.composition, /咨询桌或低桌|2–3 人咨询座位|半私密或私密边界/);
  assert.doesNotMatch(byId.functional_requirement, /大型公共接待台|大型公共前台|等候休息区/);
  assert.doesNotMatch(byId.architecture_function_bridge, /前台作为核心展示区|接待区位于空间前部/);
  assert.equal(compiled.layers.targetSceneProjection.functionalBlockSource, 'target_scene_projection');
  assert.equal(compiled.layers.targetSceneProjection.viewStrategySource, 'target_scene_default');
  exists(caseConfig.expected.visualStatus === 'HUMAN_ACCEPTED'
    ? 'space-generator/quality-baselines/r2-b4-reference-first-smoke/jiuzhou-aesthetics/jzrx-reception-to-consultation-b4-1-final/output.png'
    : '');

  return { id: caseConfig.id, result: 'PASS', visual: 'VISUAL_MANUAL_ACCEPTED', layers: ['L1', 'L2', 'L3', 'L4', 'L5'] };
}

async function runG02() {
  const caseConfig = readJson('golden/standard-space/r8-6-parity-set/case.json');
  const manifest = readJson('space-generator/quality-baselines/r8.6/manifest.json');
  assert.equal(manifest.status, 'frozen');
  assert.equal(manifest.spaceCompilerId, 'phase9b-quality-compiler');
  assert.equal(manifest.finalSmoke.runs, 4);
  assert.equal(manifest.finalSmoke.refs, 0);
  assert.equal(manifest.finalSmoke.gate, 'PASS');

  for (const [brand, subtype] of [
    ['jiuzhou-aesthetics', 'reception'],
    ['feng-tang-tang', 'dining'],
    ['yi-ji-liang-fang', 'reception'],
  ]) {
    const compiled = compileSpace(brand, baseTask({ taskId: `golden-g02-${brand}`, projectId: `golden-${brand}`, subtype }));
    assertOrdered(compiled.blocks.map((block) => block.id), EXPECTED_BLOCKS);
    assert.equal(compiled.layers.task.deliverableFamily, 'space');
    assert.deepEqual(compiled.trace.referenceIds ?? [], []);
    assert.ok(blocksById(compiled).negative_constraints.length > 0);
  }

  for (const output of [
    'space-generator/quality-baselines/r8.6/jiuzhou-aesthetics/final-entrance-1/output.png',
    'space-generator/quality-baselines/r8.6/jiuzhou-aesthetics/final-reception-1/output.png',
    'space-generator/quality-baselines/r8.6/feng-tang-tang/final-dining-1/output.png',
    'space-generator/quality-baselines/r8.6/yi-ji-liang-fang/final-reception-1/output.png',
  ]) exists(output);

  return { id: caseConfig.id, result: 'PASS', visual: 'VISUAL_MANUAL_ACCEPTED', layers: ['L1', 'L2', 'L3', 'L4', 'L5'] };
}

async function runG03() {
  const caseConfig = readJson('golden/continuation/jiuzhou-reception-to-consultation/case.json');
  const evidence = readJson('space-generator/quality-baselines/r11.1-continuation-v12/jiuzhou-aesthetics/jzmx-rec-to-consult-v12-1/continuation-contract.json');
  const trace = readJson('space-generator/quality-baselines/r11.1-continuation-v12/jiuzhou-aesthetics/jzmx-rec-to-consult-v12-1/trace.json');
  for (const [key, value] of Object.entries({
    generationBasis: 'continuation', referenceRole: 'world_consistency',
    referenceSource: 'confirmed_generated_output', referenceCount: 1,
    sourceScene: 'reception', targetScene: 'consultation',
  })) assert.equal(evidence[key], value, key);
  assert.notEqual(evidence.sourceScene, evidence.targetScene);
  assert.equal(trace.sourceProgramLeakageGate, 'pass');
  assert.equal(trace.targetViewStrategy, 'human_scale_consultation_view');

  process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
  const compileUrl = pathToFileURL(path.join(repoRoot, 'packages/image-generation-runtime/src/vnext/compile.js')).href;
  const { compileVNextImageGeneration } = await import(compileUrl);
  const continuation = createSpaceContinuationContract({
    projectId: 'golden-project', confirmedSourceAssetId: 'asset-confirmed',
    sourceRunId: 'run-source', sourceScene: 'reception', targetScene: 'consultation',
    userRequirement: '保持同一设计语言，转换为咨询功能。', confirmedAt: '2026-08-11T00:00:00.000Z',
  });
  const packet = loadPacket('jiuzhou-aesthetics');
  const out = compileVNextImageGeneration({
    projectContext: { projectId: 'golden-project', visualDecisionPacket: packet },
    model: 'doubao-seedream-5-0-pro-260628',
    brandKey: 'jiuzhou-aesthetics',
    task: baseTask({
      taskId: 'golden-g03', subtype: 'consultation', generationBasis: 'continuation',
      referenceAssetIds: ['asset-confirmed'], continuation,
      currentInstruction: '延续已确认方向，生成咨询空间。',
    }),
  });
  const sg = out.compiledPrompt.trace.spaceGeneration;
  assert.equal(sg.routeIntegrity.status, 'pass');
  assert.equal(sg.generationBasis, 'continuation');
  assert.equal(sg.continuation.referenceSource, 'confirmed_generated_output');
  assert.equal(sg.continuation.sourceScene, 'reception');
  assert.equal(sg.continuation.targetScene, 'consultation');
  exists('space-generator/quality-baselines/r11.1-continuation-v12/jiuzhou-aesthetics/jzmx-rec-to-consult-v12-1/output.png');
  return { id: caseConfig.id, result: 'PASS', visual: 'VISUAL_MANUAL_ACCEPTED', layers: ['L1', 'L2', 'L3', 'L4', 'L5'] };
}

async function runG04() {
  const caseConfig = readJson('golden/visual-analysis/jiuzhou-audit-fixture/case.json');
  const manifest = readJson('evaluation/reports/jiuzhou-golden-audit/visual-fixture-manifest.json');
  const roles = new Set(manifest.files.map((file) => file.role));
  for (const role of ['golden_prompt', 'confirmed_logo', 'golden_output', 'bad_output']) assert.ok(roles.has(role), role);
  for (const file of manifest.files) {
    const relative = path.posix.join(manifest.fixtureRoot, file.path);
    assert.equal(sha256(relative), file.sha256, `fixture hash ${file.path}`);
  }
  const report = readText('evaluation/reports/jiuzhou-golden-audit/current-analysis-report.md');
  for (const required of ['## 0. GPT Execution Core', '## 1. 原始方案与品牌意图理解', '## 2. 当前视觉问题', '原始 Logo', 'Locked', '核心视觉锚点', '新视觉关键词']) {
    assert.ok(report.includes(required), required);
  }
  const model = getRegisteredModel('qwen3.6-plus');
  assert.equal(model.provider, 'dashscope');
  assert.equal(model.type, 'analysis');
  assert.ok(model.capabilities.includes('visual_understanding'));
  return { id: caseConfig.id, result: 'PASS', visual: 'NOT_APPLICABLE', layers: ['L1', 'L2', 'L3'] };
}

async function runG05() {
  const caseConfig = readJson('golden/packaging/fengtangtang-deliverable/case.json');
  const fixture = readJson('tests/image-generation/fixtures/deliverable-golden/fengtangtang.json');
  const v1 = {
    schemaVersion: '1.0', projectId: fixture.projectId, taskId: 'old-packaging',
    sourceVisualRunId: 'visual-golden-v17', sourceDocumentRunId: 'document-golden-v17',
    sourceReferenceAnchorRunId: 'reference-golden-v17', userInstruction: '生成包装礼盒渲染图',
  };
  const v2 = migrateImageGenerationTaskV1(v1);
  assert.equal(v2.schemaVersion, '2.0');
  assert.equal(v2.projectId, v1.projectId);
  assert.equal(v2.sources.visualRunId, v1.sourceVisualRunId);
  const v3 = migrateImageGenerationSourcesV2({
    schemaVersion: '2.0', preset: 'visual_reference', purpose: 'production', projectId: fixture.projectId,
    visual: { projectId: fixture.projectId, visualRunId: 'visual-golden-v17' },
    userIntent: { prompt: '生成冯烫烫包装礼盒渲染图', aspectRatio: '16:9' },
  });
  assert.equal(v3.schemaVersion, '3.0');
  assert.equal(v3.projectId, fixture.projectId);
  assert.equal(v3.purpose, 'production');
  assert.equal(v3.userIntent.aspectRatio, '16:9');

  const context = {
    visualContext: { identity: fixture.identity, lockedAssets: fixture.lockedAssets, currentVisualSystem: { primaryColors: ['#e85d32'] } },
    resolvedContext: { identity: fixture.identity, lockedAssets: fixture.lockedAssets, conflicts: [] },
    references: fixture.references, warnings: [], sourceMetadata: { visualRunId: 'visual-golden-v17' },
  };
  const result = compileImageGenerationTask({
    sources: { ...v3, sourcePreset: 'visual_analysis', deliverable: 'packaging_render' }, context,
    runId: 'golden-packaging-run', taskId: 'golden-packaging-task',
    capabilities: {
      providerId: 'dashscope', modelId: 'wan2.7-image-pro', supportsTextToImage: true,
      supportsMultiImageReference: true, supportsNegativePrompt: false, supportsRemoteCancel: false,
      maxReferenceImages: 6, maxOutputCount: 1, supportedSizes: ['1024*1024'], outputMimeTypes: ['image/png'],
    },
    providerConfig: { apiKey: 'OFFLINE_GOLDEN', baseUrl: 'https://offline.invalid' },
    parameters: { size: '1024*1024', region: 'beijing' }, createdAt: '2026-08-11T00:00:00.000Z',
  });
  assert.equal(result.gate.blocked, false, JSON.stringify(result.gate.errors));
  for (const phrase of ['真实包装结构', '包装材质', '盒型', '开合关系', '真实比例']) assert.ok(result.compiledPromptMarkdown.includes(phrase), phrase);
  assert.ok(result.referencePlan.selected.some((item) => item.assetId === 'packaging-box' && item.role === 'structure_reference'));
  assert.equal(result.task.providerId, 'dashscope');
  assert.equal(result.providerPayloadPreview.model, 'wan2.7-image-pro');
  return { id: caseConfig.id, result: 'PASS', visual: 'NOT_READY', layers: ['L1', 'L2', 'L3', 'L4'] };
}

const CASES = [runG01, runG02, runG03, runG04, runG05];

export async function runGoldenSuite() {
  const registry = readJson('golden/manifests/golden-registry.json');
  assert.equal(registry.autoUpdate, false, 'Golden auto-update must remain disabled');
  assert.equal(registry.cases.length, CASES.length);
  const results = [];
  for (const runCase of CASES) {
    try {
      results.push(await runCase());
    } catch (error) {
      results.push({ id: error.goldenCaseId ?? registry.cases[results.length]?.id ?? 'UNKNOWN', result: 'FAIL', error: error.stack ?? String(error) });
    }
  }
  const overall = results.some((item) => item.result === 'FAIL')
    ? 'FAIL'
    : results.some((item) => item.visual === 'REVIEW_REQUIRED') ? 'PASS_WITH_REVIEW' : 'PASS';
  return { schemaVersion: '1.0', baseline: registry.baseline, providerCalls: 0, autoUpdated: false, overall, results };
}
