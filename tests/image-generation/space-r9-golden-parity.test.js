// R9 golden text-level parity test.
//
// The production compiler (src/space) is the frozen R8.6 core migrated
// equivalently. R10.4.1 added a deliberate functional-layer sanitization
// (decorative-object demotion) that rewrites e.g. "视线引导至艺术装置" into
// "建立清晰入口视觉焦点和空间导向", so the post-repair prompt hash differs from
// the R8.6 record by design. Parity here therefore asserts STRUCTURAL
// equivalence (block order, budget, architecture-before-brand) plus the
// R10.4.1 functional hygiene (no decorative object as a hard functional
// requirement), not byte-identical hashes.
import test from 'node:test';
import assert from 'node:assert/strict';
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

test('R9/R10.4.1 production compiler keeps R8.6 block structure and functional hygiene', () => {
  const decorative = /艺术装置|雕塑|装饰装置|中心装置|艺术品|sculpture|art installation/i;
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
    // Structural parity: block order is unchanged; budget stays near R8.6.
    assert.deepEqual(out.blockIds, manifest.blockIds, `${brand}/${scene}: block order identical`);
    assert.ok(Math.abs(out.budget.chars - run.promptChars) < 400, `${brand}/${scene}: budget near R8.6 (${out.budget.chars} vs ${run.promptChars})`);
    // R10.4.1 functional hygiene: no decorative object as a hard requirement
    // in the positive functional sections of any brand.
    const functional = out.blocksById.architecture_function_bridge.text.split('**Concept Drift Guards')[0]
      + out.blocksById.functional_requirement.text;
    assert.doesNotMatch(functional, decorative, `${brand}/${scene}: no decorative-object functional hard requirement`);
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
