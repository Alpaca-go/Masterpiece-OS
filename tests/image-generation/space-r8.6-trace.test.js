// R8.6 final-smoke trace test.
//
// Verifies the traceability contract of the frozen R8.6 baseline:
//   - the recorded promptHash of each final smoke matches a fresh offline
//     re-compile from the same frozen packet + task (no provider call)
//   - block order is architecture-before-brand and the negative block is last
//   - prompt budget stays under the Seedream 7500-char cap
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = 'space-generator/quality-baselines/r8.6';

const SCENES = [
  { brand: 'jiuzhou-aesthetics', scene: 'final-reception-1', subtype: 'reception', shot: 'entrance_view', rel: 'jiuzhou-aesthetics/final-reception-1' },
  { brand: 'jiuzhou-aesthetics', scene: 'final-entrance-1', subtype: 'storefront', shot: 'entrance_view', rel: 'jiuzhou-aesthetics/final-entrance-1' },
  { brand: 'feng-tang-tang', scene: 'final-dining-1', subtype: 'lobby', shot: 'entrance_view', rel: 'feng-tang-tang/final-dining-1' },
  { brand: 'yi-ji-liang-fang', scene: 'final-reception-1', subtype: 'reception', shot: 'entrance_view', rel: 'yi-ji-liang-fang/final-reception-1' },
];

const BLOCK_ORDER = [
  'task',
  'spatial_intent',
  'architecture_language',
  'architecture_context',
  'architecture_function_bridge',
  'architectural_concept',
  'architecture_dna',
  'brand_translation',
  'functional_requirement',
  'material',
  'lighting',
  'composition',
  'rendering',
  'negative_constraints',
];

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));
}

async function recompile(brand, scene, subtype, shot, projectId) {
  const packet = load(`space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`);
  const context = { projectId };
  context.visualDecisionPacket = packet;
  const task = {
    schemaVersion: '1.0',
    taskId: 'r8.6-trace-repro',
    projectId,
    deliverableFamily: 'space',
    subtype,
    shot,
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'R8.6 final smoke run 1/1 (text-only, refs=0).',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    logoUsageMode: 'post_composite',
    createdAt: '2026-08-08T00:00:00.000Z',
  };
  process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'phase9b_quality';
  const url = pathToFileURL(path.join(repoRoot, 'packages/image-generation-runtime/src/vnext/compile.js')).href;
  const mod = await import(url);
  const out = mod.compileVNextImageGeneration({ projectContext: context, model: 'doubao-seedream-5-0-pro-260628', task, brandKey: brand });
  return out.compiledPrompt;
}

test('R8.6 recorded prompt hash matches an offline re-compile (deterministic)', async () => {
  for (const { brand, scene, subtype, shot, rel } of SCENES) {
    const manifest = load(`${base}/${rel}/manifest.json`);
    const compiled = await recompile(brand, scene, subtype, shot, manifest.project.projectId);
    const finalPrompt = compiled.finalPrompt;
    const hash = crypto.createHash('sha256').update(Buffer.from(finalPrompt, 'utf8')).digest('hex');
    assert.equal(hash, manifest.promptHash, `${rel}: offline recompile hash matches recorded promptHash`);
  }
});

test('R8.6 final smoke prompts keep architecture-before-brand block order and negative last', () => {
  for (const { rel } of SCENES) {
    const manifest = load(`${base}/${rel}/manifest.json`);
    assert.deepEqual(manifest.blockIds, BLOCK_ORDER, `${rel}: block order`);
    assert.equal(manifest.blockIds[manifest.blockIds.length - 1], 'negative_constraints', `${rel}: negative block last`);
    assert.ok(
      manifest.blockIds.indexOf('brand_translation') > manifest.blockIds.indexOf('architecture_dna'),
      `${rel}: architecture before brand`,
    );
  }
});

test('R8.6 final smoke prompts stay under the Seedream 7500-char budget', () => {
  for (const { rel } of SCENES) {
    const run = load(`${base}/${rel}/run.json`);
    assert.ok(run.promptChars <= 7500, `${rel}: ${run.promptChars} <= 7500`);
    assert.ok(run.promptChars > 0, `${rel}: prompt non-empty`);
  }
});
