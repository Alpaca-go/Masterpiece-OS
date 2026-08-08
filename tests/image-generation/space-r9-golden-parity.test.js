// R9 golden text-level parity test.
//
// The production compiler (src/space) is the frozen R8.6 core migrated
// equivalently. The strongest offline parity signal is that compiling each
// frozen final-smoke packet through the production compiler reproduces the
// EXACT recorded R8.6 prompt hash (which produced the accepted golden images).
// This is Mode A ≈ Mode B at text level; real image parity (R9.9) is a
// separate user-authorized provider run.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilePhase9bSpacePrompt } from '@masterpiece/image-generation-runtime/space/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = 'space-generator/quality-baselines/r8.6';

const SCENES = [
  { brand: 'jiuzhou-aesthetics', scene: 'final-reception-1', subtype: 'reception', shot: 'entrance_view' },
  { brand: 'jiuzhou-aesthetics', scene: 'final-entrance-1', subtype: 'storefront', shot: 'entrance_view' },
  { brand: 'feng-tang-tang', scene: 'final-dining-1', subtype: 'lobby', shot: 'entrance_view' },
  { brand: 'yi-ji-liang-fang', scene: 'final-reception-1', subtype: 'reception', shot: 'entrance_view' },
];

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function buildTask(manifest, subtype, shot) {
  return {
    schemaVersion: '1.0',
    taskId: `r9-golden-parity-${manifest.brandKey}-${manifest.scene}`,
    projectId: manifest.project?.projectId || `${manifest.brandKey}-parity`,
    deliverableFamily: 'space',
    subtype,
    shot,
    count: 1,
    aspectRatio: manifest.provider?.aspectRatio || '16:9',
    currentInstruction: 'R8.6 final smoke run 1/1 (text-only, refs=0).',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    logoUsageMode: 'post_composite',
    createdAt: '2026-08-08T00:00:00.000Z',
  };
}

test('R9 production compiler reproduces the exact R8.6 golden prompt hashes', () => {
  for (const { brand, scene, subtype, shot } of SCENES) {
    const manifest = load(`${base}/${brand}/${scene}/manifest.json`);
    const run = load(`${base}/${brand}/${scene}/run.json`);
    const packet = load(`space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`);
    const out = compilePhase9bSpacePrompt({
      packet,
      taskContract: buildTask(manifest, subtype, shot),
      projectContext: { projectId: manifest.project?.projectId },
      brandKey: brand,
      anchorMaxCount: 3,
    });
    const hash = sha256(out.finalPrompt);
    assert.equal(hash, run.promptHash, `${brand}/${scene}: production hash matches frozen R8.6 hash`);
    assert.equal(out.budget.chars, run.promptChars, `${brand}/${scene}: character budget identical`);
    assert.deepEqual(out.blockIds, manifest.blockIds, `${brand}/${scene}: block order identical`);
  }
});

test('R9 production compiler keeps architecture-before-brand and negatives last', () => {
  for (const { brand, scene, subtype, shot } of SCENES) {
    const manifest = load(`${base}/${brand}/${scene}/manifest.json`);
    const packet = load(`space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`);
    const out = compilePhase9bSpacePrompt({
      packet,
      taskContract: buildTask(manifest, subtype, shot),
      projectContext: { projectId: manifest.project?.projectId },
      brandKey: brand,
      anchorMaxCount: 3,
    });
    assert.ok(
      out.blockIds.indexOf('brand_translation') > out.blockIds.indexOf('architecture_dna'),
      `${brand}: architecture before brand`,
    );
    assert.equal(out.blockIds[out.blockIds.length - 1], 'negative_constraints', `${brand}: negatives last`);
  }
});

test('R9 production compiler does not inject project hardcode into prompts', () => {
  for (const { brand, scene, subtype, shot } of SCENES) {
    const manifest = load(`${base}/${brand}/${scene}/manifest.json`);
    const packet = load(`space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`);
    const out = compilePhase9bSpacePrompt({
      packet,
      taskContract: buildTask(manifest, subtype, shot),
      projectContext: { projectId: manifest.project?.projectId },
      brandKey: brand,
      anchorMaxCount: 3,
    });
    // The universal negatives are the 2 generic guards; no brand-specific
    // "no feather / no peacock" hardcode lines may exist in any brand prompt.
    assert.ok(!/no feather|no peacock/iu.test(out.finalPrompt), `${brand}: no project-specific negative`);
  }
});
