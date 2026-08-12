// R11.1 Continuation compiler regression test (R11 §53-§55).
//
// Continuation uses the SAME frozen r8_6_golden Space Compiler with a
// different input contract. It must:
//   - keep all frozen architecture blocks (+ the optional continuation_intent)
//   - stay within the 7500 adapter budget (frozen + <=10%)
//   - pass the route integrity gate with generationBasis=continuation,
//     referenceMode=reference_assisted, refs=1, source=confirmed_generated_output
//   - record the continuation lineage in the spaceGeneration trace
//   - not affect packaging
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { createSpaceContinuationContract } from '@masterpiece/image-generation-runtime/space/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function loadCompile() {
  process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
  const url = pathToFileURL(path.join(repoRoot, 'packages/image-generation-runtime/src/generation/compile.js')).href;
  const mod = await import(url);
  return mod;
}

function loadPacket(brand) {
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, `space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`),
    'utf8',
  ));
}

function continuationTask(brand, sourceScene, targetScene, subtype) {
  const continuation = createSpaceContinuationContract({
    projectId: 'proj-r11',
    confirmedSourceAssetId: 'asset-confirmed',
    sourceRunId: 'run-source',
    sourceScene,
    targetScene,
    userRequirement: '保持同一空间语言，转换功能程序。',
    confirmedAt: '2026-08-09T10:00:00.000Z',
  });
  return {
    schemaVersion: '1.0',
    taskId: `r11-cont-${brand}-${Date.now()}`,
    projectId: 'proj-r11',
    deliverableFamily: 'space',
    subtype,
    shot: 'entrance_view',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: `延续此前方向，生成${targetScene}空间。`,
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: ['asset-confirmed'],
    generationBasis: 'continuation',
    continuation,
    logoUsageMode: 'post_composite',
    createdAt: new Date().toISOString(),
  };
}

test('R11.1 continuation compiles with frozen blocks + continuation_intent and passes route gate', async () => {
  const { compileShortChainGeneration } = await loadCompile();
  const packet = loadPacket('jiuzhou-aesthetics');
  const ctx = { projectId: 'proj-r11' };
  ctx.visualDecisionPacket = packet;
  const task = continuationTask('jiuzhou-aesthetics', 'reception', 'consultation', 'consultation');
  const out = compileShortChainGeneration({
    projectContext: ctx,
    model: 'doubao-seedream-5-0-pro-260628',
    task,
    brandKey: 'jiuzhou-aesthetics',
  });
  const cp = out.compiledPrompt;
  const ids = cp.blocks.map((b) => b.id);
  // Frozen blocks all present; continuation_intent right after task.
  const frozen = ['task', 'spatial_intent', 'architecture_language', 'architecture_context',
    'architecture_function_bridge', 'architectural_concept', 'architecture_dna',
    'brand_translation', 'functional_requirement', 'material', 'lighting',
    'composition', 'rendering', 'negative_constraints'];
  for (const id of frozen) assert.ok(ids.includes(id), `frozen block ${id} present`);
  assert.equal(ids[1], 'continuation_intent', 'continuation intent after task');
  // Route integrity pass + trace lineage.
  const sg = cp.trace.spaceGeneration;
  assert.equal(sg.generationBasis, 'continuation');
  assert.equal(sg.referenceMode, 'reference_assisted');
  assert.equal(sg.routeIntegrity?.status, 'pass');
  assert.equal(sg.continuation?.sourceRunId, 'run-source');
  assert.equal(sg.continuation?.sourceScene, 'reception');
  assert.equal(sg.continuation?.targetScene, 'consultation');
  assert.equal(sg.continuation?.referenceSource, 'confirmed_generated_output');
  assert.equal(sg.continuation?.confirmationSource, 'user_explicit');
  assert.equal(sg.continuation?.parentRunId, 'run-source');
  // Budget within adapter limit and frozen +10%.
  assert.ok(sg.promptCharacters <= 7500, `prompt ${sg.promptCharacters} <= 7500`);
});

test('R11.1 continuation stays within frozen +10% budget', async () => {
  const { compileShortChainGeneration } = await loadCompile();
  const { compileSpacePrompt } = await import('@masterpiece/image-generation-runtime/space/index.js');
  const packet = loadPacket('jiuzhou-aesthetics');
  const ctx = { projectId: 'proj-r11' };
  ctx.visualDecisionPacket = packet;
  // Standard frozen reception prompt as the budget baseline (compiler-level,
  // avoiding the vnext enforceSpatialSemantics difference on standard tasks).
  const stdOut = compileSpacePrompt({
    packet,
    taskContract: {
      schemaVersion: '1.0', taskId: 'std', projectId: 'proj-r11',
      deliverableFamily: 'space', subtype: 'reception', shot: 'entrance_view', count: 1,
      aspectRatio: '16:9', currentInstruction: '标准生成', mustInclude: [], mustAvoid: [],
      referenceAssetIds: [], generationBasis: 'standard', logoUsageMode: 'post_composite',
      createdAt: new Date().toISOString(),
    },
    projectContext: ctx,
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 3,
  });
  const stdChars = stdOut.budget.chars;

  const task = continuationTask('jiuzhou-aesthetics', 'reception', 'consultation', 'consultation');
  const cont = compileShortChainGeneration({ projectContext: ctx, model: 'doubao-seedream-5-0-pro-260628', task, brandKey: 'jiuzhou-aesthetics' });
  const contChars = cont.compiledPrompt.trace.spaceGeneration.promptCharacters;
  assert.ok(contChars <= stdChars * 1.10, `continuation ${contChars} <= standard ${stdChars} +10%`);
});
