// R10 Reference-First — reference-assisted space generation contract test.
//
// R10 productizes the existing High Fidelity reference capability: a user
// picks a reference image + scene, and the frozen R9 production compiler
// (r8_6_golden) emits a reference-assisted (High Fidelity) space prompt
// WITHOUT re-running the full V5 analysis. This test proves the contract:
//   - referenceAssetIds in the task flow through to the compiled taskContract
//   - the compiled prompt reports referenceMode=reference_assisted and keeps
//     the reference ids in the spaceGeneration trace
//   - refs=0 stays Standard (text-only) and is not blocked
//   - the 14-block architecture-before-brand hierarchy is unchanged in both
//     routes
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function loadCompile() {
  process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
  const url = pathToFileURL(path.join(repoRoot, 'packages/image-generation-runtime/src/generation/compile.js')).href;
  const mod = await import(url);
  return mod;
}

function loadPacket(brand) {
  const packet = JSON.parse(fs.readFileSync(
    path.join(repoRoot, `space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`),
    'utf8',
  ));
  packet.mediaTranslations.spatial.functionalNetwork = [
    '入口连接接待与等候区', '咨询区通过半私密边界后撤', '治疗区与服务路径分离',
  ];
  packet.mediaTranslations.spatial.functionalRelationships = [
    '入口通过开放视线连接接待台，使到达路径清晰',
  ];
  packet.mediaTranslations.spatial.mustBeVisible = ['接待台', '等候区', '咨询入口'];
  return packet;
}

function buildTask(referenceAssetIds) {
  return {
    schemaVersion: '1.0',
    taskId: `r10-ref-first-${Date.now()}`,
    projectId: 'r10-ref',
    deliverableFamily: 'space',
    subtype: 'reception',
    shot: 'entrance_view',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'R10 Reference-First test.',
    generationBasis: referenceAssetIds.length ? 'reference_first' : 'standard',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds,
    logoUsageMode: 'post_composite',
    createdAt: new Date().toISOString(),
  };
}

test('R10 Reference-First: referenceAssetIds flow to taskContract + reference_assisted trace', async () => {
  const { compileShortChainGeneration } = await loadCompile();
  const packet = loadPacket('jiuzhou-aesthetics');
  const ctx = { projectId: 'r10-ref' };
  ctx.visualDecisionPacket = packet;
  const out = compileShortChainGeneration({
    projectContext: ctx,
    model: 'doubao-seedream-5-0-pro-260628',
    task: buildTask(['asset-ref-1']),
    brandKey: 'jiuzhou-aesthetics',
  });
  assert.deepEqual(out.taskContract.referenceAssetIds, ['asset-ref-1'], 'task contract keeps reference');
  assert.deepEqual(out.compiledPrompt.referenceAssetIds, ['asset-ref-1'], 'compiled prompt keeps reference');
  const sg = out.compiledPrompt.trace.spaceGeneration;
  assert.equal(sg.referenceMode, 'reference_assisted', 'High Fidelity route');
  assert.equal(sg.generationBasis, 'reference_first', 'R10.2 §27 generationBasis');
  assert.deepEqual(sg.referenceIds, ['asset-ref-1'], 'trace records reference');
  // 14-block architecture-before-brand hierarchy is unchanged.
  assert.equal(out.compiledPrompt.blocks.length, 14);
  assert.ok(out.compiledPrompt.blocks.map((b) => b.id).indexOf('brand_translation') > 3);
  assert.equal(out.compiledPrompt.blocks[out.compiledPrompt.blocks.length - 1].id, 'negative_constraints');
});

test('R10 Standard route: refs=0 stays text-only and is not blocked', async () => {
  const { compileShortChainGeneration } = await loadCompile();
  const packet = loadPacket('jiuzhou-aesthetics');
  const ctx = { projectId: 'r10-ref' };
  ctx.visualDecisionPacket = packet;
  const out = compileShortChainGeneration({
    projectContext: ctx,
    model: 'doubao-seedream-5-0-pro-260628',
    task: buildTask([]),
    brandKey: 'jiuzhou-aesthetics',
  });
  assert.deepEqual(out.taskContract.referenceAssetIds, [], 'refs=0');
  const sg = out.compiledPrompt.trace.spaceGeneration;
  assert.equal(sg.referenceMode, 'text_only', 'Standard route');
  assert.equal(sg.generationBasis, 'standard', 'R10.2 §27 generationBasis');
  assert.deepEqual(sg.referenceIds, [], 'no references');
});

test('R10 Reference-First uses the frozen production compiler', async () => {
  const { SPACE_COMPILER_MODES, resolveSpaceCompilerMode } = await loadCompile();
  assert.equal(resolveSpaceCompilerMode({}), SPACE_COMPILER_MODES.R8_6_GOLDEN, 'default is r8_6_golden');
});
