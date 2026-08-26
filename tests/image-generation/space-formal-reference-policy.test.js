// R10 final — frozen Standard / Reference-First reference policy test.
//
// Guards the R10.4 reference policy freeze (R10 §14-§15): Standard must be
// refs=0 with no auto-attached implicit anchor / architecture anchor /
// historical output; Reference-First requires explicit refs>=1 and records
// id/source/count; the architecture anchor is a prompt-level mechanism prior
// that never becomes an automatic Standard provider reference.
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
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, `space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`),
    'utf8',
  ));
}

function buildTask(referenceAssetIds, generationBasis = referenceAssetIds.length ? 'reference_first' : 'standard') {
  return {
    schemaVersion: '1.0',
    taskId: `r10-final-policy-${Date.now()}`,
    projectId: 'r10-final-policy',
    deliverableFamily: 'space',
    subtype: 'reception',
    shot: 'entrance_view',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'R10 final policy test.',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds,
    logoUsageMode: 'post_composite',
    createdAt: new Date().toISOString(),
  };
}

test('R10 Standard refs=0: no auto-attached reference, providerReferenceCount stays 0', async () => {
  const { compileShortChainGeneration } = await loadCompile();
  const packet = loadPacket('jiuzhou-aesthetics');
  const ctx = { projectId: 'r10-final-policy' };
  ctx.visualDecisionPacket = packet;
  const out = compileShortChainGeneration({
    projectContext: ctx,
    model: 'doubao-seedream-5-0-pro-260628',
    task: buildTask([], 'standard'),
    brandKey: 'jiuzhou-aesthetics',
  });
  assert.deepEqual(out.taskContract.referenceAssetIds, [], 'standard refs=0');
  const sg = out.compiledPrompt.trace.spaceGeneration;
  assert.equal(sg.generationBasis, 'standard');
  assert.equal(sg.referenceMode, 'text_only');
  assert.deepEqual(sg.referenceIds, [], 'no references auto-attached');
  // Even though the JZMX packet selects architecture anchors at the prompt
  // level, Standard must not attach them as provider references.
  assert.ok(Array.isArray(sg.architectureAnchorIds), 'anchor ids recorded at prompt level');
  assert.equal(sg.referenceMode, 'text_only', 'anchors do not flip Standard to reference-assisted');
});

test('R10 Reference-First explicit refs>=1 records id/source/count', async () => {
  const { compileShortChainGeneration } = await loadCompile();
  const packet = loadPacket('jiuzhou-aesthetics');
  const ctx = { projectId: 'r10-final-policy' };
  ctx.visualDecisionPacket = packet;
  const out = compileShortChainGeneration({
    projectContext: ctx,
    model: 'doubao-seedream-5-0-pro-260628',
    task: buildTask(['explicit-ref-1'], 'reference_first'),
    brandKey: 'jiuzhou-aesthetics',
  });
  assert.deepEqual(out.taskContract.referenceAssetIds, ['explicit-ref-1']);
  const sg = out.compiledPrompt.trace.spaceGeneration;
  assert.equal(sg.generationBasis, 'reference_first');
  assert.equal(sg.referenceMode, 'reference_assisted');
  assert.deepEqual(sg.referenceIds, ['explicit-ref-1']);
  assert.ok(sg.referenceSources !== undefined, 'reference sources recorded');
});

test('R10 route-baseline marks architecture anchor as prompt-level prior only', () => {
  const b = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'space-generator/quality-baselines/r10-final/route-baseline.json'),
    'utf8',
  ));
  assert.equal(b.architectureAnchorFreeze.standardAutoReference, false);
  assert.equal(b.architectureAnchorFreeze.referenceFirstReference, 'only when user explicitly selects');
  assert.equal(b.referencePolicyFreeze.standard.noAutoAttach.length >= 3, true, 'standard no-auto-attach list');
});
