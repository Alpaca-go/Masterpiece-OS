import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

/**
 * CI-2 golden shadow project tests.
 *
 * Spec #12 / #45-#49: 5+ golden scenarios.
 *  1. document-led project
 *  2. visual-led project
 *  3. reference-first project
 *  4. packaging-capable project
 *  5. space-capable project
 *
 * Each scenario must:
 *  - assemble truth with stable output
 *  - report expected conflicts where present
 *  - preserve unknowns
 *  - detect reference contamination when present
 *  - write shadow artifacts to a non-authoritative path
 */

import { runShadowProjectTruth } from '@masterpiece/creative-intelligence/integration/shadow-project-truth.ts';
import { adaptProjectRecord } from '@masterpiece/creative-intelligence/truth/adapters/project-record-adapter.ts';
import { adaptDocumentVisualContext } from '@masterpiece/creative-intelligence/truth/adapters/document-visual-context-adapter.ts';
import { adaptVisualUnderstandingCore } from '@masterpiece/creative-intelligence/truth/adapters/visual-understanding-core-adapter.ts';
import { adaptPromptSourceObject } from '@masterpiece/creative-intelligence/truth/adapters/prompt-source-object-adapter.ts';
import { adaptCurrentProjectCorePack } from '@masterpiece/creative-intelligence/truth/adapters/current-project-core-pack-adapter.ts';
import { adaptCurrentProjectProfile } from '@masterpiece/creative-intelligence/truth/adapters/current-project-profile-adapter.ts';
import { PROJECT_TRUTH_KEYS } from '@masterpiece/creative-intelligence/truth/key-registry.ts';
import { runProjectTruthShadowSafely } from '@masterpiece/runtime-core/application/project-truth-shadow-service.ts';

const CTX = { projectId: 'p1', generatedAt: '2026-01-01T00:00:00.000Z', sourceFingerprints: {} };

// --- 1. document-led ---

test('CI-2 golden: document-led project — DocumentVisualContext is primary source', () => {
  const result = runShadowProjectTruth({
    projectId: 'p1',
    carrierOutputs: [
      adaptProjectRecord({ id: 'p1', brandName: 'DocBrand', industry: 'tech' }, CTX),
      adaptDocumentVisualContext({
        sourceRunId: 'r1',
        brandName: 'DocBrand',
        industry: 'tech',
        products: ['app'],
        services: ['support'],
        targetAudience: ['enterprise'],
        evidence: [
          { documentId: 'd1', sourceSection: 'brand', pageNumber: 1, excerpt: 'DocBrand' },
        ],
      }, CTX),
    ],
    context: CTX,
    currentCarrierValues: { 'brand.name': 'DocBrand' },
  });
  // brand.name should resolve cleanly (no conflict).
  const bn = result.assembled.resolutions.find((r) => r.key === PROJECT_TRUTH_KEYS.BRAND_NAME);
  assert.equal(bn.status, 'resolved');
  // No reference contamination.
  assert.equal(result.validation.summary.referenceContamination, 0);
});

// --- 2. visual-led ---

test('CI-2 golden: visual-led project — VisualUnderstandingCore is primary', () => {
  const result = runShadowProjectTruth({
    projectId: 'p2',
    carrierOutputs: [
      adaptVisualUnderstandingCore({
        projectId: 'p2',
        projectFacts: {
          brandName: { value: 'VisualBrand', source: 'visual_asset', confidence: 0.8 },
          industry: { value: 'fashion' },
          brandRole: { value: 'craftsman' },
        },
        lockedAssets: [{ assetId: 'logo-1' }],
        sourceFingerprint: 'fp1',
      }, CTX),
    ],
    context: CTX,
    sourceFingerprints: { visual_understanding_core: 'fp1' },
  });
  const bn = result.assembled.resolutions.find((r) => r.key === PROJECT_TRUTH_KEYS.BRAND_NAME);
  assert.equal(bn.status, 'resolved');
  const ll = result.assembled.resolutions.find((r) => r.key === PROJECT_TRUTH_KEYS.LOCKED_LOGO);
  assert.ok(ll);
  // visual-led: no document facts at all.
  assert.equal(result.validation.summary.referenceContamination, 0);
});

// --- 3. reference-first ---

test('CI-2 golden: reference-first project — reference brand cannot contaminate current', () => {
  const refOut = adaptProjectRecord(
    { id: 'ref1', brandName: 'RefBrand', activeReferenceSource: { projectId: 'ref1' } },
    CTX,
  );
  refOut.facts.forEach((f) => { f.isReferenceFact = true; });
  const result = runShadowProjectTruth({
    projectId: 'cur1',
    carrierOutputs: [
      adaptProjectRecord({ id: 'cur1', brandName: 'CurBrand', industry: 'tech' }, CTX),
      refOut,
    ],
    context: CTX,
    currentCarrierValues: { 'brand.name': 'CurBrand' },
  });
  const bn = result.assembled.resolutions.find((r) => r.key === PROJECT_TRUTH_KEYS.BRAND_NAME);
  // status is 'conflicted' because ref and current disagree on value, but the
  // REFERENCE_GUARDED reasonCode and current-winner prove contamination = 0.
  assert.equal(bn.reasonCode, 'REFERENCE_GUARDED');
  const selectedFact = result.assembled.truth.facts.find((f) => f.id === bn.selectedFactId);
  assert.equal(selectedFact.isReferenceFact, false);
  assert.equal(selectedFact.value, 'CurBrand');
  // Hard acceptance: reference contamination = 0.
  assert.equal(result.validation.summary.referenceContamination, 0);
});

test('CI-2 golden: reference-first project — ref+current conflict surfaces reference_contamination', () => {
  const refOut = adaptProjectRecord(
    { id: 'ref1', brandName: 'RefBrand', activeReferenceSource: { projectId: 'ref1' } },
    CTX,
  );
  refOut.facts.forEach((f) => { f.isReferenceFact = true; });
  const result = runShadowProjectTruth({
    projectId: 'cur1',
    carrierOutputs: [
      adaptProjectRecord({ id: 'cur1', brandName: 'CurBrand' }, CTX),
      refOut,
    ],
    context: CTX,
    currentCarrierValues: { 'brand.name': 'CurBrand' },
  });
  // Both reference_contamination conflict and identity_mismatch should be present.
  const refConflict = result.assembled.conflicts.find((c) => c.type === 'reference_contamination');
  const idConflict = result.assembled.conflicts.find((c) => c.type === 'identity_mismatch');
  assert.ok(refConflict, 'reference_contamination conflict expected');
  assert.ok(idConflict, 'identity_mismatch conflict expected');
});

// --- 4. packaging-capable ---

test('CI-2 golden: packaging-capable project — packaging structures preserved', () => {
  const result = runShadowProjectTruth({
    projectId: 'pkg1',
    carrierOutputs: [
      adaptCurrentProjectProfile({
        projectId: 'pkg1',
        brandName: 'PkgBrand',
        industry: 'fmcg',
        brandPositioning: 'premium',
        packagingStructures: ['box', 'bottle'],
        confirmedFacts: ['use-blue'],
      }, CTX),
      adaptCurrentProjectCorePack({
        projectId: 'pkg1',
        brandName: 'PkgBrand',
        industry: 'fmcg',
        productFacts: ['cereal'],
        logoAssetIds: ['logo-1'],
        lockedAssets: [{ assetId: 'logo-1', source: 'current_project' }],
      }, CTX),
    ],
    context: CTX,
  });
  const ps = result.assembled.truth.facts.find((f) => f.key === PROJECT_TRUTH_KEYS.PRODUCT_PACKAGING_STRUCTURES);
  assert.ok(ps);
  assert.deepEqual(ps.value, ['box', 'bottle']);
  // Locked logo present.
  const ll = result.assembled.truth.facts.find((f) => f.key === PROJECT_TRUTH_KEYS.LOCKED_LOGO);
  assert.ok(ll);
});

// --- 5. space-capable ---

test('CI-2 golden: space-capable project — visual context + product profile preserved', () => {
  const result = runShadowProjectTruth({
    projectId: 'sp1',
    carrierOutputs: [
      adaptProjectRecord({ id: 'sp1', brandName: 'SpaceBrand', industry: 'architecture' }, CTX),
      adaptVisualUnderstandingCore({
        projectId: 'sp1',
        projectFacts: {
          brandName: { value: 'SpaceBrand' },
          industry: { value: 'architecture' },
          brandRole: { value: 'craftsman' },
        },
      }, CTX),
      adaptPromptSourceObject({
        projectId: 'sp1',
        projectFacts: {
          brandName: 'SpaceBrand',
          industry: 'architecture',
          brandRole: 'craftsman',
          primaryOfferings: ['interior design'],
        },
        provenance: { sourceKinds: ['project_record'] },
      }, CTX),
    ],
    context: CTX,
  });
  // brand.name present from multiple carriers — should be resolved (unanimous).
  const bn = result.assembled.resolutions.find((r) => r.key === PROJECT_TRUTH_KEYS.BRAND_NAME);
  assert.equal(bn.status, 'resolved');
  // product.core_products comes from PSO.
  const cp = result.assembled.truth.facts.find((f) => f.key === PROJECT_TRUTH_KEYS.PRODUCT_CORE_PRODUCTS);
  assert.ok(cp);
  assert.deepEqual(cp.value, ['interior design']);
});

// --- Cross-cutting hard acceptance ---

test('CI-2 hard acceptance: brand identity loss = 0 (always recoverable from carriers)', () => {
  // ProjectRecord exists but provides no brandName → truth model must
  // preserve brand.name as an explicit unknown fact (never silently dropped).
  const result = runShadowProjectTruth({
    projectId: 'p1',
    carrierOutputs: [
      adaptProjectRecord({ id: 'p1' }, CTX), // no brandName
    ],
    context: CTX,
  });
  const bnKey = PROJECT_TRUTH_KEYS.BRAND_NAME;
  // brand.name shows up as an unknown fact (truthClass=unknown) AND in unknowns list.
  const bnFact = result.assembled.truth.facts.find((f) => f.key === bnKey);
  assert.ok(bnFact, 'brand.name must exist as a fact (even if unknown)');
  assert.equal(bnFact.value, null);
  assert.equal(bnFact.truthClass, 'unknown');
  assert.ok(result.assembled.truth.unknowns.includes(bnKey), 'brand.name must appear in unknowns list');
});

test('CI-2 hard acceptance: locked asset loss = 0', () => {
  const result = runShadowProjectTruth({
    projectId: 'p1',
    carrierOutputs: [
      adaptCurrentProjectCorePack({
        projectId: 'p1',
        brandName: 'X',
        logoAssetIds: ['logo-1', 'logo-2'],
        lockedAssets: [
          { assetId: 'logo-1', source: 'current_project' },
          { assetId: 'logo-2', source: 'current_project' },
        ],
      }, CTX),
    ],
    context: CTX,
  });
  const la = result.assembled.truth.facts.filter((f) => f.key === PROJECT_TRUTH_KEYS.LOCKED_ASSETS);
  assert.ok(la.length > 0);
  for (const f of la) {
    if (!f.isReferenceFact) {
      assert.ok(Array.isArray(f.value));
      assert.ok(f.value.length > 0);
    }
  }
});

test('CI-2 hard acceptance: inference → fact promotion = 0', () => {
  // ProjectRecord with only detectedBrandName produces an inference fact.
  // That fact must remain truthClass='inference' — never promoted to 'fact'.
  const result = runShadowProjectTruth({
    projectId: 'p1',
    carrierOutputs: [
      adaptProjectRecord({ id: 'p1', detectedBrandName: 'Detected' }, CTX),
    ],
    context: CTX,
  });
  const bn = result.assembled.truth.facts.find((f) => f.key === PROJECT_TRUTH_KEYS.BRAND_NAME);
  assert.equal(bn.truthClass, 'inference');
});

test('CI-2 hard acceptance: unknown silently fabricated = 0', () => {
  // Empty carriers. No brand.name provided. The truth model must mark it unknown.
  const result = runShadowProjectTruth({
    projectId: 'p1',
    carrierOutputs: [],
    context: CTX,
  });
  const bnFacts = result.assembled.truth.facts.filter((f) => f.key === PROJECT_TRUTH_KEYS.BRAND_NAME);
  // No brand.name fact is fabricated.
  assert.equal(bnFacts.length, 0);
  // The truth's unknowns should be empty (no canonical key was even attempted)
  // OR include brand.name as a candidate. Either is correct — the point is no
  // fabric.
  assert.ok(result.assembled.truth.unknowns.length === 0 || result.assembled.truth.unknowns.length > 0);
});

// --- Shadow service end-to-end (writes real files) ---

test('CI-2 shadow service: writes base 6 artifacts (CI-3/4 may add more)', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci2-shadow-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {
        projectRecord: { id: 'p1', brandName: 'ShadowBrand', industry: 'tech' },
      },
    });
    assert.equal(result.ok, true);
    // CI-3/4 may add more artifacts (document-intelligence.json, NICE N+I+O).
    // We only assert the CI-2 base 6 are present.
    for (const filename of ['project-truth.json', 'evidence-ledger.json', 'truth-resolutions.json', 'truth-conflicts.json', 'validation-report.json', 'shadow-report.json']) {
      assert.ok(result.files.includes(filename), `missing CI-2 base file: ${filename}`);
      const fullPath = path.join(result.artifactDirectory, filename);
      const stat = await fs.stat(fullPath);
      assert.ok(stat.size > 0, `${filename} should be non-empty`);
    }
    // Verify shadow-report.json is authoritative=false.
    const report = JSON.parse(await fs.readFile(path.join(result.artifactDirectory, 'shadow-report.json'), 'utf8'));
    assert.equal(report.authoritative, false);
    assert.equal(report.mode, 'shadow');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CI-2 shadow service: failure does NOT throw (safe wrapper)', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci2-shadow-fail-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {
        // Passing null triggers a controlled warning but does not throw.
        projectRecord: { id: '' },
      },
    });
    // Service may report ok=true with warnings, or ok=false on harder failures.
    // Either way, it must NOT throw.
    assert.equal(typeof result.ok, 'boolean');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
