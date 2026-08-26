// r2.0 §4.10 / B-3 / Phase 9B: Reference Boundary text block injection.
//
// The v1 seedream-adapter path has always appended the Reference Boundary
// text block for `reference_first` runs. The Phase 9B compile path (which
// is what the vnext space flow uses) used to skip this injection — the
// compiled prompt therefore did NOT carry the boundary marker, and Gate B
// (Provider Prompt Gate) would fail closed with
// `SPACE_PROVIDER_PROMPT_INVALID` for every Reference-First run with the
// "missingBoundaryLabel" finding. F-3 tests were working around this with
// an `editedPrompt` injection (see vnext-f3-similarity-audit-wiring.test.ts
// top comment), but real production users have no such workaround.
//
// These tests pin the Phase 9B contract: the boundary is appended to
// `finalPrompt` (and recorded in `blockTextsByName` for budget accounting)
// but is NOT added as a new entry to `ordered` / `blockIds` so the frozen
// R8.6 block order stays intact.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSpacePrompt } from '@masterpiece/image-generation-runtime/space/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));
}

function baseTaskContract(overrides = {}) {
  return {
    schemaVersion: '1.0',
    taskId: 'phase9b-boundary-fixture',
    projectId: 'phase9b-boundary',
    deliverableFamily: 'space',
    subtype: 'consultation',
    shot: 'entrance_view',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'JZMX cross-scene Reference-First smoke (text-only, refs=1).',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: ['ref-jz-1'],
    logoUsageMode: 'post_composite',
    createdAt: '2026-08-11T00:00:00.000Z',
    ...overrides,
  };
}

const REFERENCE_BOUNDARY_HEADER = 'REFERENCE BOUNDARY';

test('r2.0 B-3: Phase 9B compile appends the Reference Boundary for reference_first (cross-scene)', () => {
  const packet = load('space-generator/quality-baselines/current-verification/source-packets/_packets/jiuzhou-aesthetics/visual-decision-packet.json');
  const out = compileSpacePrompt({
    packet,
    taskContract: baseTaskContract({
      generationBasis: 'reference_first',
      referenceSceneRelation: 'cross_scene',
    }),
    projectContext: { projectId: 'phase9b-boundary' },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 3,
  });
  assert.ok(out.finalPrompt.includes(REFERENCE_BOUNDARY_HEADER),
    'Phase 9B reference_first compile must include REFERENCE BOUNDARY header in finalPrompt');
  assert.match(out.finalPrompt, /high-priority/i,
    'boundary block should self-label as a high-priority instruction');
  assert.match(out.finalPrompt, /different functional class/i,
    'cross-scene relation must surface in the boundary intent line');
  assert.match(out.finalPrompt, /Target scene: consultation\./i,
    'target scene label from the task contract must reach the boundary');
});

test('r2.0 B-3: Phase 9B compile keeps the frozen R8.6 block order intact after boundary injection', () => {
  const packet = load('space-generator/quality-baselines/current-verification/source-packets/_packets/jiuzhou-aesthetics/visual-decision-packet.json');
  const out = compileSpacePrompt({
    packet,
    taskContract: baseTaskContract({
      generationBasis: 'reference_first',
      referenceSceneRelation: 'cross_scene',
    }),
    projectContext: { projectId: 'phase9b-boundary' },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 3,
  });
  // The boundary must NOT be promoted to a structured block. The last
  // structured block must remain negative_constraints to keep Gate A's
  // R8.6 parity check green.
  assert.equal(out.blockIds[out.blockIds.length - 1], 'negative_constraints',
    'R8.6 invariant: last structured block must still be negative_constraints');
  assert.ok(!out.blockIds.includes('reference_boundary'),
    'reference_boundary must NOT be added to blockIds (block order is frozen)');
  // The boundary text is appended AFTER the last block.
  const lastBlock = out.blocks[out.blocks.length - 1];
  assert.ok(out.finalPrompt.endsWith(out.finalPrompt.includes(REFERENCE_BOUNDARY_HEADER)
    ? out.finalPrompt.slice(out.finalPrompt.lastIndexOf(REFERENCE_BOUNDARY_HEADER)).trimEnd()
    : lastBlock.text),
    'boundary should be appended at the end of finalPrompt, not prepended');
});

test('r2.0 B-3: Phase 9B compile does NOT append the boundary for standard basis', () => {
  const packet = load('space-generator/quality-baselines/current-verification/source-packets/_packets/jiuzhou-aesthetics/visual-decision-packet.json');
  const out = compileSpacePrompt({
    packet,
    taskContract: baseTaskContract({ generationBasis: 'standard' }),
    projectContext: { projectId: 'phase9b-boundary' },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 3,
  });
  assert.ok(!out.finalPrompt.includes(REFERENCE_BOUNDARY_HEADER),
    'standard basis must NOT include a Reference Boundary block');
  assert.equal(out.trace?.referenceBoundary?.applied, false,
    'trace must record referenceBoundary.applied=false for standard');
});

test('r2.0 B-3: Phase 9B compile does NOT append the boundary for continuation basis', () => {
  const packet = load('space-generator/quality-baselines/current-verification/source-packets/_packets/jiuzhou-aesthetics/visual-decision-packet.json');
  const out = compileSpacePrompt({
    packet,
    taskContract: baseTaskContract({
      generationBasis: 'continuation',
      referenceSceneRelation: 'same_scene',
      referenceAssetIds: ['ref-confirmed-1'],
      continuation: {
        sourceAssetId: 'src-asset-1',
        sourceRunId: 'src-run-1',
        sourceScene: 'consultation',
        targetScene: 'consultation',
        referenceRole: 'world_consistency',
        targetFunctionalProgram: { sceneId: 'consultation' },
        continuationBoundary: { preserve: [], regenerate: [] },
        confirmedAt: '2026-08-11T00:00:00.000Z',
        confirmationSource: 'user_explicit',
      },
    }),
    projectContext: { projectId: 'phase9b-boundary' },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 3,
  });
  assert.ok(!out.finalPrompt.includes(REFERENCE_BOUNDARY_HEADER),
    'continuation basis must NOT carry the generic Reference Boundary (world_consistency is more specific)');
  assert.equal(out.trace?.referenceBoundary?.applied, false,
    'trace must record referenceBoundary.applied=false for continuation');
});

test('r2.0 B-3: Phase 9B compile records referenceBoundary metadata on the trace', () => {
  const packet = load('space-generator/quality-baselines/current-verification/source-packets/_packets/jiuzhou-aesthetics/visual-decision-packet.json');
  const out = compileSpacePrompt({
    packet,
    taskContract: baseTaskContract({
      generationBasis: 'reference_first',
      referenceSceneRelation: 'cross_scene',
    }),
    projectContext: { projectId: 'phase9b-boundary' },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 3,
  });
  const rb = out.trace?.referenceBoundary;
  assert.ok(rb, 'trace.referenceBoundary must be present');
  assert.equal(rb.applied, true);
  assert.match(rb.version, /^space-reference-boundary@/);
  // Default Seedream adapter capability has supported=false; the trace
  // honestly surfaces that so consumers don't assume weight control.
  assert.equal(rb.providerStrengthControl, 'unsupported');
  assert.ok(rb.promptCharacters > 200,
    'referenceBoundary.promptCharacters should reflect the actual rendered length');
});

test('r2.0 B-3: Phase 9B budget check sees the appended boundary characters', () => {
  const packet = load('space-generator/quality-baselines/current-verification/source-packets/_packets/jiuzhou-aesthetics/visual-decision-packet.json');
  const out = compileSpacePrompt({
    packet,
    taskContract: baseTaskContract({
      generationBasis: 'reference_first',
      referenceSceneRelation: 'cross_scene',
    }),
    projectContext: { projectId: 'phase9b-boundary' },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 3,
  });
  // budget.chars must equal finalPrompt's char count (the budget is
  // measured on the SAME string the Provider will see).
  assert.equal(out.budget.chars, [...out.finalPrompt].length,
    'budget.chars must equal the actual finalPrompt length (boundary included)');
  // The boundary is positive content; positiveRatio must be > 0.
  assert.ok(out.budget.positiveRatio > 0,
    'positiveRatio must be > 0 (boundary is positive content)');
});
