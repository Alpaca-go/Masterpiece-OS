// R10.3 Workflow Acceptance — contract tests for the 4 Reference-First
// workflow links (R10 §39).
//
//   Case 1: Standard refs=0            -> referenceMode=text_only, PASS
//   Case 2: Reference-First upload 1   -> referenceCount>=1, reference_assisted, PASS
//   Case 3: Reference-First project asset -> PASS (same route as Case 2)
//   Case 4: Reference-First remove all -> Generate disabled, NO silent fallback
//
// Cases 1-3 are proven at the compiler level (referenceAssetIds ->
// r8_6_golden -> spaceGeneration trace). Case 4 is proven at the UI state
// level (canUseGenerationBasis returns false for refs=0; the task contract
// must NOT silently become text_only while the user is in Reference-First).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const {
  canUseGenerationBasis,
  removeReferenceId,
  MAX_SPACE_REFERENCE_IMAGES,
} = await import(pathToFileURL(path.join(
  repoRoot,
  'apps/web/src/reference-first/state.js',
)).href);

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
    taskId: `r10-workflow-${Date.now()}`,
    projectId: 'r10-workflow',
    deliverableFamily: 'space',
    subtype: 'reception',
    shot: 'entrance_view',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'R10.3 workflow acceptance.',
    generationBasis: referenceAssetIds.length ? 'reference_first' : 'standard',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds,
    logoUsageMode: 'post_composite',
    createdAt: new Date().toISOString(),
  };
}

async function compileWith(refs) {
  const { compileShortChainGeneration } = await loadCompile();
  const packet = loadPacket('jiuzhou-aesthetics');
  const ctx = { projectId: 'r10-workflow' };
  ctx.visualDecisionPacket = packet;
  return compileShortChainGeneration({
    projectContext: ctx,
    model: 'doubao-seedream-5-0-pro-260628',
    task: buildTask(refs),
    brandKey: 'jiuzhou-aesthetics',
  });
}

// Case 1 — Standard, refs=0 -> text_only.
test('R10.3 Case 1: Standard refs=0 compiles as text_only', async () => {
  const out = await compileWith([]);
  assert.deepEqual(out.taskContract.referenceAssetIds, []);
  const sg = out.compiledPrompt.trace.spaceGeneration;
  assert.equal(sg.generationBasis, 'standard');
  assert.equal(sg.referenceMode, 'text_only');
  // Standard CTA is enabled by the scene alone (no reference needed).
  assert.equal(canUseGenerationBasis('standard', [], true), true);
});

// Case 2 — Reference-First, upload 1 -> reference_assisted.
test('R10.3 Case 2: Reference-First with 1 reference is reference_assisted', async () => {
  const out = await compileWith(['uploaded-ref-1']);
  assert.deepEqual(out.taskContract.referenceAssetIds, ['uploaded-ref-1']);
  const sg = out.compiledPrompt.trace.spaceGeneration;
  assert.equal(sg.generationBasis, 'reference_first');
  assert.equal(sg.referenceMode, 'reference_assisted');
  assert.deepEqual(sg.referenceIds, ['uploaded-ref-1']);
  // CTA requires >= 1 reference in Reference-First.
  assert.equal(canUseGenerationBasis('reference', ['uploaded-ref-1'], true), true);
});

// Case 3 — Reference-First, existing project asset -> same route.
test('R10.3 Case 3: Reference-First with an existing project asset is reference_assisted', async () => {
  const out = await compileWith(['project-asset-42']);
  const sg = out.compiledPrompt.trace.spaceGeneration;
  assert.equal(sg.generationBasis, 'reference_first');
  assert.equal(sg.referenceMode, 'reference_assisted');
  assert.deepEqual(sg.referenceIds, ['project-asset-42']);
});

// Case 4 — Reference-First, remove all refs -> Generate disabled, no fallback.
test('R10.3 Case 4: removing all references disables Generate without silent fallback', async () => {
  // removeReferenceId drops one id; simulating removing the only reference.
  const afterRemove = removeReferenceId(['only'], 'only');
  assert.deepEqual(afterRemove, []);
  // Reference-First with refs=0 must be disabled, even with a valid scene.
  assert.equal(canUseGenerationBasis('reference', [], true), false, 'refs=0 blocks Generate in Reference-First');
  // The basis is NOT silently switched to standard: the state module still
  // treats it as 'reference' (no fallback), which is why it stays disabled.
  assert.equal(canUseGenerationBasis('reference', afterRemove, true), false);
  // A max-cap guard is shared so the 1..4 rule is a single source of truth.
  assert.ok(MAX_SPACE_REFERENCE_IMAGES >= 1 && MAX_SPACE_REFERENCE_IMAGES <= 4);
});
