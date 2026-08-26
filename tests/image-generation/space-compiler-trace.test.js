// R9 production trace + deliverable-router test.
//
// R9 §20: every space run records a spaceGeneration trace with compilerId,
// compilerVersion, sourceAdapterVersion, semanticSeparationVersion,
// architectureAnchorIds, referenceMode, referenceIds, referenceSources,
// prompt/architecture/brand/negative character counts, promptHash, provider,
// model.
//
// R9 §17 + §19: the deliverable router sends space → production Space
// Compiler, packaging → packaging compiler; MASTERPIECE_SPACE_COMPILER_MODE
// supports r8_6_golden | phase9b_quality | vnext_legacy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function loadCompile() {
  const url = pathToFileURL(path.join(repoRoot, 'packages/image-generation-runtime/src/generation/compile.js')).href;
  const mod = await import(url);
  return mod;
}

function loadPacket(brand) {
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, `space-generator/quality-baselines/current-verification/source-packets/_packets/${brand}/visual-decision-packet.json`),
    'utf8',
  ));
}

function buildTask(family, subtype, shot) {
  return {
    schemaVersion: '1.0',
    taskId: `r9-trace-${family}-${Date.now()}`,
    projectId: 'r9-trace',
    deliverableFamily: family,
    subtype,
    shot,
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: `R9 trace test (${family}).`,
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    logoUsageMode: 'post_composite',
    createdAt: new Date().toISOString(),
  };
}

test('R9 compile emits the spaceGeneration trace schema (space route)', async () => {
  const { compileShortChainGeneration } = await loadCompile();
  process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
  const packet = loadPacket('jiuzhou-aesthetics');
  const ctx = { projectId: 'r9-trace' };
  ctx.visualDecisionPacket = packet;
  const out = compileShortChainGeneration({
    projectContext: ctx,
    model: 'doubao-seedream-5-0-pro-260628',
    task: buildTask('space', 'reception', 'entrance_view'),
    brandKey: 'jiuzhou-aesthetics',
  });
  const sg = out.compiledPrompt.trace.spaceGeneration;
  assert.ok(sg, 'spaceGeneration present');
  assert.ok(sg.compilerId, 'compilerId');
  assert.ok(sg.compilerVersion, 'compilerVersion');
  assert.ok(sg.sourceAdapterVersion, 'sourceAdapterVersion');
  assert.ok(sg.semanticSeparationVersion, 'semanticSeparationVersion');
  assert.ok(Array.isArray(sg.architectureAnchorIds), 'architectureAnchorIds');
  assert.equal(sg.referenceMode, 'text_only');
  assert.deepEqual(sg.referenceIds, []);
  assert.ok(sg.promptCharacters > 0, 'promptCharacters');
  assert.ok(sg.architectureCharacters > 0, 'architectureCharacters');
  assert.ok(sg.negativeCharacters > 0, 'negativeCharacters');
  assert.ok(sg.promptHash && sg.promptHash.length === 64, 'promptHash sha256');
  assert.equal(sg.provider, 'seedream');
  assert.equal(sg.model, 'doubao-seedream-5-0-pro-260628');
});

test('R9 deliverable router: r8_6_golden resolves and phase9b alias both hit production', async () => {
  const { SPACE_COMPILER_MODES, resolveSpaceCompilerMode, isProductionSpaceMode } = await loadCompile();
  assert.equal(resolveSpaceCompilerMode({}), SPACE_COMPILER_MODES.R8_6_GOLDEN, 'default is r8_6_golden after R9.10');
  assert.equal(resolveSpaceCompilerMode({ MASTERPIECE_SPACE_COMPILER_MODE: 'r8_6_golden' }), SPACE_COMPILER_MODES.R8_6_GOLDEN);
  assert.equal(resolveSpaceCompilerMode({ MASTERPIECE_SPACE_COMPILER_MODE: 'vnext_legacy' }), SPACE_COMPILER_MODES.VNEXT_LEGACY);
  assert.equal(isProductionSpaceMode(SPACE_COMPILER_MODES.R8_6_GOLDEN), true);
  assert.equal(isProductionSpaceMode(SPACE_COMPILER_MODES.PHASE9B_QUALITY), true);
  assert.equal(isProductionSpaceMode(SPACE_COMPILER_MODES.VNEXT_LEGACY), false);
});

test('R9 packaging route stays on the packaging compiler (no space trace)', async () => {
  // The vNext packaging route requires a full Project Visual Context 2.0,
  // which is beyond this offline unit test. Instead we verify the router in
  // compile.js: only deliverableFamily === 'space' may enter the production
  // Space Compiler (which is the only path that emits the spaceGeneration
  // trace); packaging/vi/poster fall through to compileShortChainPrompt and never
  // get a spaceGeneration trace injected.
  const compileSrc = fs.readFileSync(
    path.join(repoRoot, 'packages/image-generation-runtime/src/generation/compile.js'),
    'utf8',
  );
  assert.match(compileSrc, /deliverableFamily === 'space'/, 'router guards on space family');
  assert.match(compileSrc, /isProductionSpaceMode\(spaceMode\)/, 'production space gate');
  // The spaceGeneration trace is only assembled inside the space compile path.
  assert.match(compileSrc, /spaceGeneration:/, 'spaceGeneration emitted only in space path');
  // compileShortChainPrompt (packaging) path does not reference spaceGeneration.
  const legacyBlock = compileSrc.split('compileShortChainPrompt({')[1]?.slice(0, 400) ?? '';
  assert.ok(!/spaceGeneration/.test(legacyBlock), 'packaging path has no spaceGeneration');
});
