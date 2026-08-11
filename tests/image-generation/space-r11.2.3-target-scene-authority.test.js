// R11.2.3 Reference-First Target Scene Authority & Cross-Scene Repair.
//
// Freezes: when Reference-First has a concrete target scene, the scene owns the
// functional program — Functional Requirement, Architecture-Function Bridge,
// Must-Be-Visible, Lighting Functional Intent and View Strategy. The
// project-wide program (Reception / Treatment / Rest / Arrival) must NOT be
// "must be legible in one image". Reference-First stays high-fidelity VISUAL
// (function 听 Target, 视觉 听 Reference). Continuation / Standard no regression.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import {
  buildTargetSceneProjection,
  resolveTargetViewStrategy,
  validateTargetSceneAuthority,
} from '@masterpiece/image-generation-runtime/space/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
const compileUrl = pathToFileURL(path.join(repoRoot, 'packages/image-generation-runtime/src/vnext/compile.js')).href;
const { compileVNextImageGeneration } = await import(compileUrl);
const spaceUrl = pathToFileURL(path.join(repoRoot, 'packages/image-generation-runtime/src/space/index.js')).href;
const { compilePhase9bSpacePrompt, createSpaceContinuationContract } = await import(spaceUrl);

function loadPacket(brand) {
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, `space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`),
    'utf8',
  ));
}

function compilePrompt(taskContract) {
  const packet = loadPacket('jiuzhou-aesthetics');
  const ctx = { projectId: 'proj-r1123' };
  ctx.visualDecisionPacket = packet;
  return compilePhase9bSpacePrompt({
    packet,
    taskContract,
    projectContext: ctx,
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 3,
  });
}

function referenceFirstTask(overrides = {}) {
  return {
    schemaVersion: '1.0', taskId: 'r1123-ref', projectId: 'proj-r1123',
    deliverableFamily: 'space', subtype: 'consultation', shot: 'entrance_view', count: 1,
    aspectRatio: '16:9', currentInstruction: '生成真实可进入的咨询室空间',
    generationBasis: 'reference_first', mustInclude: [], mustAvoid: [],
    referenceAssetIds: ['asset-ref'], logoUsageMode: 'post_composite',
    shotSource: 'target_scene_default', createdAt: new Date().toISOString(),
    ...overrides,
  };
}

test('R11.2.3 consultation projection is reference-first + target authority (function 听 target)', () => {
  const out = compilePrompt(referenceFirstTask());
  const blocksById = Object.fromEntries(out.blocks.map((b) => [b.id, b.text]));

  // View strategy: the target scene owns the view (not legacy entrance_view).
  assert.match(blocksById.task, /consultation.*human_scale_consultation_view/);
  assert.doesNotMatch(blocksById.task, /entrance_view/);

  // Functional Requirement: consultation-only program nodes.
  assert.match(blocksById.functional_requirement, /1 对 1|专业咨询/);
  assert.doesNotMatch(blocksById.functional_requirement, /大型公共接待台|大型公共前台|等候休息区/);

  // Architecture-Function Bridge: no project-wide hard requirements.
  assert.doesNotMatch(blocksById.architecture_function_bridge, /前台作为核心展示区|接待区位于空间前部|治疗室位于空间后部|休息区靠近外侧/);

  // Must-Be-Visible: consultation elements, not project-wide focal items.
  assert.match(blocksById.composition, /咨询桌或低桌|2–3 人咨询座位|半私密或私密边界/);
  assert.doesNotMatch(blocksById.composition, /底部发光的前台接待台|等候休息区|治疗室/);

  // Lighting functional intent: no reception underglow / reception-vs-treatment.
  assert.doesNotMatch(blocksById.lighting, /底部发光|前台/);
  assert.match(blocksById.lighting, /calm 咨询室|focal zone/);

  // Provenance: the functional blocks came from the target scene projection.
  assert.equal(out.layers.targetSceneProjection?.functionalBlockSource, 'target_scene_projection');
  assert.equal(out.layers.targetSceneProjection?.architectureBridgeSource, 'target_scene_projection');
  assert.equal(out.layers.targetSceneProjection?.viewStrategySource, 'target_scene_default');
  assert.equal(out.layers.shotSource, 'target_scene_default');
  assert.equal(out.layers.viewStrategy, 'human_scale_consultation_view');
});

test('R11.2.3 user-explicit shot keeps the lens but the program stays consultation', () => {
  const out = compilePrompt(referenceFirstTask({ shot: 'entrance_view', shotSource: 'user_explicit' }));
  const blocksById = Object.fromEntries(out.blocks.map((b) => [b.id, b.text]));
  // User-explicit entrance_view is respected as the lens...
  assert.match(blocksById.task, /consultation.*entrance_view/);
  assert.equal(out.layers.shotSource, 'user_explicit');
  // ...but the functional program is still consultation-only.
  assert.match(blocksById.functional_requirement, /1 对 1|专业咨询/);
  assert.doesNotMatch(blocksById.functional_requirement, /大型公共接待台|等候休息区/);
  assert.doesNotMatch(blocksById.composition, /底部发光的前台接待台/);
});

test('R11.2.3 buildTargetSceneProjection projects a consultation-only subset', () => {
  const projection = buildTargetSceneProjection({
    targetProgram: { sceneId: 'consultation', sceneLabel: '咨询室', viewStrategy: 'human_scale_consultation_view',
      requiredFunctions: ['1 对 1 专业咨询'], requiredSpatialElements: ['咨询桌', '半私密边界'],
      circulationRequirements: ['明确进入咨询单元的过渡'], privacyRequirements: ['半私密'],
      scaleRequirements: ['人尺度'], operationalRequirements: ['桌面与座位关系'],
      sourceProgramElementsToDrop: ['大型公共接待台', '大面积公共等候区'] },
    projectConstraints: ['大型公共接待台位于前部', '咨询室保持安静'],
  });
  assert.ok(!projection.architectureFunctionBridge.operationConstraints.some((c) => /大型公共接待台/.test(c)), 'project-wide reception constraint dropped');
  assert.ok(!projection.architectureFunctionBridge.operationConstraints.some((c) => /咨询室保持安静/.test(c)), 'project constraints are never promoted into target-owned hard constraints');
  assert.equal(projection.provenance.operationConstraintsSource, 'target_scene_projection');
  assert.deepEqual(projection.functionalRequirement.sceneProgram, ['1 对 1 专业咨询']);
  assert.equal(projection.viewStrategy, 'human_scale_consultation_view');
  assert.equal(projection.requiredProgramNodes.length, 1, 'consultation-only subset');
  assert.equal(projection.provenance.functionalBlockSource, 'target_scene_projection');
});

test('R11.2.3 resolveTargetViewStrategy: target default unless user explicit', () => {
  assert.deepEqual(resolveTargetViewStrategy({ scene: 'consultation', shot: 'entrance_view', shotSource: 'target_scene_default' }), { viewStrategy: 'human_scale_consultation_view', shotSource: 'target_scene_default' });
  assert.deepEqual(resolveTargetViewStrategy({ scene: 'consultation', shot: 'entrance_view', shotSource: 'legacy_project_default' }), { viewStrategy: 'human_scale_consultation_view', shotSource: 'target_scene_default' });
  assert.deepEqual(resolveTargetViewStrategy({ scene: 'consultation', shot: 'entrance_view', shotSource: 'user_explicit' }), { viewStrategy: 'entrance_view', shotSource: 'user_explicit' });
  // Unknown scene: legacy fallback.
  const unknown = resolveTargetViewStrategy({ scene: 'exhibition', shot: 'front', shotSource: undefined });
  assert.equal(unknown.viewStrategy, null);
  assert.equal(unknown.shotSource, 'legacy_project_default');
});

test('R11.2.3 target scene authority gate fails closed on leaked project-wide program', () => {
  const blocksById = {
    functional_requirement: { text: 'Required Program Nodes: 接待区；治疗室；休息区 must be legible' },
    architecture_function_bridge: { text: '前台作为核心展示区' },
    composition: { text: 'Must Be Visible: 底部发光的前台接待台' },
    lighting: { text: 'Primary Strategy: 底部发光（前台）' },
  };
  assert.throws(
    () => validateTargetSceneAuthority({ targetScene: 'consultation', targetProgram: { sceneId: 'consultation' }, blocksById }),
    { code: 'SPACE_TARGET_SCENE_AUTHORITY_VIOLATION' },
  );
  // A clean projected prompt passes.
  const clean = {
    functional_requirement: { text: 'Required Program Nodes: 1 对 1 专业咨询' },
    architecture_function_bridge: { text: '咨询表面成为主要互动焦点' },
    composition: { text: 'Must Be Visible: 咨询桌或低桌' },
    lighting: { text: 'calm 咨询室 focal zone' },
  };
  assert.deepEqual(validateTargetSceneAuthority({ targetScene: 'consultation', targetProgram: { sceneId: 'consultation' }, blocksById: clean }), { status: 'pass', findings: [] });
  // A user-explicit mention is allowed.
  const userAllowed = {
    functional_requirement: { text: 'Required Program Nodes: 1 对 1 专业咨询' },
    architecture_function_bridge: { text: '咨询室内设一个小型接待/资料台' },
    composition: { text: '' },
    lighting: { text: '' },
  };
  assert.doesNotThrow(() => validateTargetSceneAuthority({
    targetScene: 'consultation',
    targetProgram: { sceneId: 'consultation' },
    blocksById: userAllowed,
    userRequirement: '咨询室内设一个小型接待/资料台',
  }));
});

test('R11.2.3 continuation stays world-consistency with leakage gate pass', () => {
  const continuation = createSpaceContinuationContract({
    projectId: 'proj-r1123', confirmedSourceAssetId: 'asset-confirmed',
    sourceRunId: 'run-source', sourceScene: 'reception', targetScene: 'consultation',
    userRequirement: '更私密', confirmedAt: '2026-08-09T10:00:00.000Z',
  });
  const packet = loadPacket('jiuzhou-aesthetics');
  const ctx = { projectId: 'proj-r1123' };
  ctx.visualDecisionPacket = packet;
  const out = compileVNextImageGeneration({
    projectContext: ctx, model: 'doubao-seedream-5-0-pro-260628',
    task: {
      schemaVersion: '1.0', taskId: 'cont', projectId: 'proj-r1123',
      deliverableFamily: 'space', subtype: 'consultation', shot: 'entrance_view', count: 1,
      aspectRatio: '16:9', currentInstruction: '延续已确认方向，生成咨询空间。', generationBasis: 'continuation',
      mustInclude: [], mustAvoid: [], referenceAssetIds: ['asset-confirmed'], logoUsageMode: 'post_composite',
      continuation, createdAt: new Date().toISOString(),
    },
    brandKey: 'jiuzhou-aesthetics',
  });
  const sg = out.compiledPrompt.trace.spaceGeneration;
  assert.equal(sg.generationBasis, 'continuation');
  assert.equal(sg.continuation?.referenceRole, 'world_consistency');
  assert.equal(sg.continuation?.sourceProgramLeakageGate, 'pass');
});
