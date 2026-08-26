// R9 production Space Compiler block-order test.
//
// The production compiler (src/space) must keep the frozen R8.6 prompt
// hierarchy exactly: Task → Spatial Intent → Architecture Language →
// Architecture Context → Architecture Function Bridge → Architectural
// Concept → Architecture DNA → Brand Translation → Functional Requirement →
// Material → Lighting → Composition → Rendering → Negative Constraints.
//
// Architecture-before-brand is the hard R9 rule; negatives stay last; the
// budget stays within the Seedream cap and near the R8.6 baseline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSpacePrompt } from '@masterpiece/image-generation-runtime/space/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const REQUIRED_ORDER = [
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

const BRANDS = [
  { key: 'jiuzhou-aesthetics', subtype: 'reception', shot: 'entrance_view' },
  { key: 'feng-tang-tang', subtype: 'lobby', shot: 'entrance_view' },
  { key: 'yi-ji-liang-fang', subtype: 'reception', shot: 'entrance_view' },
];

function loadPacket(brand) {
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, `space-generator/quality-baselines/current-verification/source-packets/_packets/${brand}/visual-decision-packet.json`),
    'utf8',
  ));
}

function buildTask(brand, subtype, shot) {
  return {
    schemaVersion: '1.0',
    taskId: `r9-block-order-${brand}`,
    projectId: `${brand}-r9`,
    deliverableFamily: 'space',
    subtype,
    shot,
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'R9 block-order test (text-only, refs=0).',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    logoUsageMode: 'post_composite',
    createdAt: '2026-08-08T00:00:00.000Z',
  };
}

test('R9 production compiler keeps the frozen R8.6 block order', () => {
  for (const { key, subtype, shot } of BRANDS) {
    const out = compileSpacePrompt({
      packet: loadPacket(key),
      taskContract: buildTask(key, subtype, shot),
      projectContext: { projectId: `${key}-r9` },
      brandKey: key,
      anchorMaxCount: 3,
    });
    assert.deepEqual(out.blockIds, REQUIRED_ORDER, `${key}: exact R8.6 block order`);
    // Architecture before brand: brand_translation must come after all
    // architecture blocks.
    assert.ok(
      out.blockIds.indexOf('brand_translation') > out.blockIds.indexOf('architecture_dna'),
      `${key}: architecture before brand`,
    );
    // Negatives last.
    assert.equal(out.blockIds[out.blockIds.length - 1], 'negative_constraints', `${key}: negatives last`);
  }
});

test('R9 production compiler budget stays under the Seedream 7500 cap', () => {
  for (const { key, subtype, shot } of BRANDS) {
    const out = compileSpacePrompt({
      packet: loadPacket(key),
      taskContract: buildTask(key, subtype, shot),
      projectContext: { projectId: `${key}-r9` },
      brandKey: key,
      anchorMaxCount: 3,
    });
    assert.ok(out.budget.chars <= 7500, `${key}: ${out.budget.chars} <= 7500`);
    assert.ok(out.budget.chars > 0, `${key}: prompt non-empty`);
  }
});

test('R9 production compiler emits all 14 frozen blocks', () => {
  const out = compileSpacePrompt({
    packet: loadPacket('jiuzhou-aesthetics'),
    taskContract: buildTask('jiuzhou-aesthetics', 'reception', 'entrance_view'),
    projectContext: { projectId: 'jiuzhou-aesthetics-r9' },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 3,
  });
  for (const id of REQUIRED_ORDER) {
    assert.ok(out.blocksById[id], `block ${id} present`);
    assert.ok(String(out.blocksById[id].text).length > 0, `block ${id} non-empty`);
  }
});
