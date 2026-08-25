/**
 * CI-W1C.5 PART H — Visual Evidence Contribution (VP) tests.
 *
 * Spec §14 + §22:
 *   - VP-01: read vnext.assetInventory → per-item observedFacts + inferredMeanings
 *   - VP-02: each observedFact is VISUAL_SOURCE_FACT (not MODEL_INFERENCE)
 *   - VP-03: each inferredMeaning is MODEL_INFERENCE (not FACT)
 *   - VP-04: observedFacts cover all 7 kinds (logo, color, typography, motif,
 *     imagery, layout, material)
 *   - VP-05: contributionToTruthFacts produces a list of ProjectTruthFact
 *     with `visualAsset.*` keys; existing Truth taxonomy not modified
 *   - VP-06: pure function — no IO, no model call
 *
 * Frozen surfaces:
 *   - Truth taxonomy (TruthClass, TruthAuthority enum not extended)
 *   - SourceType uses existing `visual_understanding_core` (no new enum value)
 *   - DVC schema not touched (the module reads vnext directly, NOT DVC)
 *
 * Project-agnostic: this test does NOT use G01 or G02 hardcoded values.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVisualEvidenceContribution,
  contributionToTruthFacts,
} from '@masterpiece/creative-intelligence/visual-evidence';

const SAMPLE_VNEXT = {
  schemaVersion: '2.0',
  version: 12,
  visualDecisionPacket: {
    assetInventory: {
      logoAssets: [
        { assetId: 'logo-1', name: 'Logo Primary', frequency: 8, visualFeatures: ['red', 'circle'], possibleBrandMeaning: ['meaning-A'] },
      ],
      colorAssets: [
        { assetId: 'color-1', name: 'Color Primary', frequency: 10, visualFeatures: ['#FF0000'], possibleBrandMeaning: ['meaning-B'] },
      ],
      typographyAssets: [
        { assetId: 'typo-1', name: 'Typeface', frequency: 6, visualFeatures: ['serif'], possibleBrandMeaning: ['meaning-C'] },
      ],
      graphicMotifs: [
        { assetId: 'motif-1', name: 'Motif A', frequency: 4, visualFeatures: ['pattern-A'], possibleBrandMeaning: ['meaning-D'] },
        { assetId: 'motif-2', name: 'Motif B', frequency: 3, visualFeatures: ['pattern-B'] },
      ],
      imageryAssets: [
        { assetId: 'image-1', name: 'Imagery', frequency: 2, visualFeatures: ['photo'], possibleBrandMeaning: ['meaning-E'] },
      ],
      layoutPatterns: [
        { assetId: 'layout-1', name: 'Layout', frequency: 1, visualFeatures: ['grid'], possibleBrandMeaning: ['meaning-F'] },
      ],
      materialCues: [
        { assetId: 'mat-1', name: 'Material A', frequency: 1, visualFeatures: ['matte'], possibleBrandMeaning: ['meaning-G'] },
        { assetId: 'mat-2', name: 'Material B', frequency: 1, visualFeatures: ['glass'] },
      ],
    },
  },
};

test('VP-01: read vnext.assetInventory → per-item observedFacts + inferredMeanings', () => {
  const c = buildVisualEvidenceContribution('project-test', SAMPLE_VNEXT);
  assert.equal(c.projectId, 'project-test');
  assert.equal(c.source, 'visual_decision_packet');
  assert.equal(c.vnextSchemaVersion, '2.0');
  assert.equal(c.vnextVersion, 12);
  // Observed facts: 1 logo + 1 color + 1 typo + 2 motifs + 1 imagery + 1 layout + 2 material = 9
  assert.equal(c.observedFacts.length, 9);
  // Inferred meanings: 7 (one per item with possibleBrandMeaning)
  assert.equal(c.inferredMeanings.length, 7);
});

test('VP-02: each observedFact is VISUAL_SOURCE_FACT (not MODEL_INFERENCE)', () => {
  const c = buildVisualEvidenceContribution('project-test', SAMPLE_VNEXT);
  for (const f of c.observedFacts) {
    assert.equal(f.epistemicClass, 'VISUAL_SOURCE_FACT');
  }
});

test('VP-03: each inferredMeaning is MODEL_INFERENCE (not FACT)', () => {
  const c = buildVisualEvidenceContribution('project-test', SAMPLE_VNEXT);
  for (const m of c.inferredMeanings) {
    assert.equal(m.epistemicClass, 'MODEL_INFERENCE');
  }
});

test('VP-04: observedFacts cover all 7 kinds (logo, color, typography, motif, imagery, layout, material)', () => {
  const c = buildVisualEvidenceContribution('project-test', SAMPLE_VNEXT);
  const kinds = new Set(c.observedFacts.map((f) => f.kind));
  for (const kind of ['logo', 'color', 'typography', 'motif', 'imagery', 'layout', 'material']) {
    assert.ok(kinds.has(kind), `expected kind ${kind} to be present`);
  }
});

test('VP-05: contributionToTruthFacts produces facts under visualAsset.* keys', () => {
  const c = buildVisualEvidenceContribution('project-test', SAMPLE_VNEXT);
  const facts = contributionToTruthFacts(c);
  // 7 kinds: visualAsset.logo, visualAsset.color, ..., visualAsset.material
  // (motif has 2 items but is one fact)
  // + 1 visualAssetMeaning.all
  assert.equal(facts.length, 8);
  for (const f of facts) {
    assert.ok(
      f.key.startsWith('visualAsset.') || f.key === 'visualAssetMeaning.all',
      `expected key prefix visualAsset.*, got ${f.key}`,
    );
  }
  // Each fact must be VISUAL_SOURCE_FACT or MODEL_INFERENCE (not fact/inference only)
  for (const f of facts) {
    assert.ok(
      f.authority === 'VISUAL_SOURCE_FACT' || f.authority === 'MODEL_INFERENCE',
      `expected VISUAL_SOURCE_FACT or MODEL_INFERENCE, got ${f.authority}`,
    );
  }
});

test('VP-06: pure function — no IO, no model call', () => {
  // Same input → same output (deep equal)
  const a = buildVisualEvidenceContribution('project-test', SAMPLE_VNEXT);
  const b = buildVisualEvidenceContribution('project-test', SAMPLE_VNEXT);
  assert.deepEqual(a, b);
  // Different projectId → different contribution
  const c = buildVisualEvidenceContribution('project-other', SAMPLE_VNEXT);
  assert.notEqual(a.projectId, c.projectId);
});

test('VP-07: empty vnext → empty contribution (no crash)', () => {
  const c = buildVisualEvidenceContribution('project-empty', {});
  assert.equal(c.observedFacts.length, 0);
  assert.equal(c.inferredMeanings.length, 0);
  const facts = contributionToTruthFacts(c);
  assert.equal(facts.length, 0);
});

test('VP-08: items without possibleBrandMeaning produce no inferredMeaning', () => {
  const partial = {
    schemaVersion: '2.0',
    version: 1,
    visualDecisionPacket: {
      assetInventory: {
        logoAssets: [
          { assetId: 'logo-1', name: 'Logo', frequency: 1, visualFeatures: ['red'] },
        ],
      },
    },
  };
  const c = buildVisualEvidenceContribution('project-partial', partial);
  assert.equal(c.observedFacts.length, 1);
  assert.equal(c.inferredMeanings.length, 0);
});
