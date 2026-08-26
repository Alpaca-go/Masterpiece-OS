// CI-W2 Part O (Contract): C01–C08 — AnchorProductionContract compile
// and contract semantics.
//
// The compile path is pure: it MUST NOT touch the disk, the model,
// or the provider. These tests pin the contract's behavior so
// future refactors that accidentally introduce side effects fail
// fast.
//
// Source / Authority hierarchy (per Spec §H):
//   - Visual Canon > Reference
//   - Locked Assets MUST be preserved
//   - DNA / Grammar refs MUST be preserved
//   - Reference brand / logo / copy / product identity is FORBIDDEN
//
// All tests are pure: they do not start a service, do not write
// to disk, do not call the model. They only exercise the CI
// package's `buildAnchorProductionContract` and `canStartAnchorProduction`
// functions.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAnchorProductionContract,
  canStartAnchorProduction,
} from '@masterpiece/creative-intelligence/anchor-production/index.ts';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeSnapshot(overrides = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'project-test',
    directionId: 'dir-001',
    selectionRevision: 1,
    selectedAt: '2026-01-01T00:00:00.000Z',
    selectedBy: 'user',
    directionFingerprint: 'sha256:direction-fp',
    direction: { id: 'dir-001', title: 'Direction 001' },
    traceVersion: 'visual-canon-v0.1',
    ...overrides,
  };
}

function makeCanon(overrides = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'project-test',
    selectedDirectionId: 'dir-001',
    selectionRevision: 1,
    creativeThesis: 'A calm, material-led visual world for a Chinese tea brand.',
    visualMechanism: 'Slow camera + close material texture + restrained typography.',
    systemHypothesis: 'The visual system can carry brand across packaging and space without copy reliance.',
    directionFamily: 'material-led',
    visualDNA: {
      structuralDNA: [{ id: 'dna-struct-01', category: 'structure', rule: 'Central placement', rationale: '...', invariantLevel: 'hard', directionRefs: [], factRefs: [], evidenceRefs: [] }],
      identityDNA: [{ id: 'dna-id-01', category: 'identity', rule: 'Single emblem', rationale: '...', invariantLevel: 'hard', directionRefs: [], factRefs: [], evidenceRefs: [] }],
      rhythmDNA: [],
      hierarchyDNA: [],
      relationDNA: [],
      requiredElementIds: ['dna-struct-01', 'dna-id-01'],
      optionalElementIds: [],
      forbiddenMutations: ['No photo-real humans'],
    },
    visualGrammar: {
      compositionRules: [{ id: 'g-comp-01', rule: 'Centered', allowed: [], forbidden: [], dnaRefs: ['dna-struct-01'], invariantLevel: 'hard' }],
      hierarchyRules: [],
      repetitionRules: [],
      transformationRules: [],
      assetUsageRules: [],
      crossMediaAdaptationRules: [],
      forbiddenCombinations: [],
      invariants: ['centered composition'],
    },
    crossMediaCanon: { invariants: ['brand mark present'], adaptations: {} },
    lockedAssetRules: [],
    prohibitedMutations: ['No photo-real humans', 'No AI-rendered copy'],
    trace: {
      selectedDirectionRef: 'dir-001',
      conceptRefs: ['c-01'],
      opportunityRefs: [],
      insightRefs: [],
      needRefs: [],
      factRefs: [],
      evidenceRefs: [],
      selectionRevision: 1,
      directionFingerprint: 'sha256:direction-fp',
    },
    status: 'valid',
    authoritative: false,
    mode: 'shadow',
    ...overrides,
  };
}

function makeAnchorContract(overrides = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'project-test',
    selectedDirectionId: 'dir-001',
    selectionRevision: 1,
    purpose: 'Visual confirmation of the selected Creative Direction.',
    mustDemonstrate: ['Centered composition', 'Single emblem'],
    mustPreserve: ['Brand mark', 'Material-led color palette'],
    mayExplore: ['Background lighting'],
    mustNotChange: ['No photo-real humans'],
    requiredDNARefs: ['dna-struct-01', 'dna-id-01'],
    requiredGrammarRefs: ['g-comp-01'],
    lockedAssetRefs: ['logo-001', 'palette-001'],
    evaluationCriteria: [
      { id: 'ev-01', criterion: 'Composition centered', severity: 'hard', sourceRefs: ['dna-struct-01'] },
    ],
    status: 'ready',
    authoritative: false,
    mode: 'shadow',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// C01: valid Canon ready → AnchorProductionContract.status = 'ready'
// ---------------------------------------------------------------------------

test('C01: valid Canon + valid selection → AnchorProductionContract ready with all bindings', () => {
  const result = buildAnchorProductionContract({
    projectId: 'project-test',
    creativeIntelligenceRunId: 'run-001',
    candidateCount: 3,
    selectedDirectionSnapshot: makeSnapshot(),
    visualCanon: makeCanon(),
    anchorContract: makeAnchorContract(),
    lockedAssetKeys: ['logo-001', 'palette-001'],
    selectionRevision: 1,
  });
  assert.equal(result.diagnostics.length, 0, 'no diagnostics for a ready contract');
  assert.ok(result.contract, 'contract must be produced');
  assert.equal(result.contract.status, 'ready');
  assert.equal(result.contract.selectedDirectionId, 'dir-001');
  assert.equal(result.contract.selectionRevision, 1);
  assert.equal(result.contract.candidateCount, 3);
  assert.equal(result.contract.requiredDNARefs.length, 2);
  assert.equal(result.contract.requiredGrammarRefs.length, 1);
  assert.equal(result.contract.lockedAssetRuleRefs.length, 2);
  assert.equal(result.contract.mustDemonstrate.length, 2);
  assert.equal(result.contract.mustPreserve.length, 2);
  assert.equal(result.contract.evaluationCriteria.length, 1);
  assert.notEqual(result.contract.sourceFingerprint, '', 'sourceFingerprint must be set');
  assert.notEqual(result.contract.productionFingerprint, '', 'productionFingerprint must be set');
  assert.equal(result.contract.authoritative, false, 'CI-W2 contracts are shadow-only (CI-10 lock)');
  assert.equal(result.contract.mode, 'shadow');
});

// ---------------------------------------------------------------------------
// C02: no selection → blocked
// ---------------------------------------------------------------------------

test('C02: no selection snapshot → blocked with ANCHOR_PRODUCTION_SELECTION_REQUIRED', () => {
  const result = buildAnchorProductionContract({
    projectId: 'project-test',
    creativeIntelligenceRunId: 'run-002',
    selectedDirectionSnapshot: null,
    visualCanon: makeCanon(),
    anchorContract: makeAnchorContract(),
    lockedAssetKeys: ['logo-001'],
    selectionRevision: 1,
  });
  assert.equal(result.contract, null, 'contract must NOT be produced when no selection');
  const codes = result.diagnostics.map((d) => d.code);
  assert.ok(codes.includes('ANCHOR_PRODUCTION_SELECTION_REQUIRED'),
    `expected ANCHOR_PRODUCTION_SELECTION_REQUIRED, got: ${codes.join(', ')}`);
});

// ---------------------------------------------------------------------------
// C03: stale Canon → blocked
// ---------------------------------------------------------------------------

test('C03: stale Canon (selectionRevision mismatch) → blocked with ANCHOR_PRODUCTION_SELECTION_INVALIDATED', () => {
  const result = buildAnchorProductionContract({
    projectId: 'project-test',
    creativeIntelligenceRunId: 'run-003',
    selectedDirectionSnapshot: makeSnapshot({ selectionRevision: 1 }),
    visualCanon: makeCanon(),
    anchorContract: makeAnchorContract(),
    lockedAssetKeys: ['logo-001'],
    selectionRevision: 2,
  });
  assert.equal(result.contract, null);
  const codes = result.diagnostics.map((d) => d.code);
  assert.ok(codes.includes('ANCHOR_PRODUCTION_SELECTION_INVALIDATED'),
    `expected ANCHOR_PRODUCTION_SELECTION_INVALIDATED, got: ${codes.join(', ')}`);
});

// ---------------------------------------------------------------------------
// C04: blocked AnchorContract → blocked
// ---------------------------------------------------------------------------

test('C04: blocked AnchorContract → blocked with ANCHOR_PRODUCTION_ANCHOR_CONTRACT_BLOCKED', () => {
  const result = buildAnchorProductionContract({
    projectId: 'project-test',
    creativeIntelligenceRunId: 'run-004',
    selectedDirectionSnapshot: makeSnapshot(),
    visualCanon: makeCanon(),
    anchorContract: makeAnchorContract({ status: 'blocked' }),
    lockedAssetKeys: ['logo-001'],
    selectionRevision: 1,
  });
  assert.equal(result.contract, null);
  const codes = result.diagnostics.map((d) => d.code);
  assert.ok(codes.includes('ANCHOR_PRODUCTION_ANCHOR_CONTRACT_BLOCKED'),
    `expected ANCHOR_PRODUCTION_ANCHOR_CONTRACT_BLOCKED, got: ${codes.join(', ')}`);
});

// ---------------------------------------------------------------------------
// C05: locked asset refs preserved (intersection with declared)
// ---------------------------------------------------------------------------

test('C05: locked asset refs are preserved (only declared keys surface)', () => {
  // The Anchor Contract declares [logo-001, palette-001]; the locked
  // asset keys list has [logo-001, palette-001, extra-001]. The
  // contract exposes only the declared ones.
  const result = buildAnchorProductionContract({
    projectId: 'project-test',
    creativeIntelligenceRunId: 'run-005',
    selectedDirectionSnapshot: makeSnapshot(),
    visualCanon: makeCanon(),
    anchorContract: makeAnchorContract(),
    lockedAssetKeys: ['logo-001', 'palette-001', 'extra-001'],
    selectionRevision: 1,
  });
  assert.equal(result.contract.status, 'ready');
  assert.deepEqual(result.contract.lockedAssetRuleRefs, ['logo-001', 'palette-001']);
});

// ---------------------------------------------------------------------------
// C06: DNA refs preserved
// ---------------------------------------------------------------------------

test('C06: DNA element ids from the Visual Canon are preserved', () => {
  const result = buildAnchorProductionContract({
    projectId: 'project-test',
    creativeIntelligenceRunId: 'run-006',
    selectedDirectionSnapshot: makeSnapshot(),
    visualCanon: makeCanon(),
    anchorContract: makeAnchorContract(),
    lockedAssetKeys: ['logo-001'],
    selectionRevision: 1,
  });
  assert.equal(result.contract.status, 'ready');
  assert.ok(result.contract.requiredDNARefs.includes('dna-struct-01'));
  assert.ok(result.contract.requiredDNARefs.includes('dna-id-01'));
});

// ---------------------------------------------------------------------------
// C07: Grammar refs preserved
// ---------------------------------------------------------------------------

test('C07: Grammar rule ids from the Visual Canon are preserved', () => {
  const result = buildAnchorProductionContract({
    projectId: 'project-test',
    creativeIntelligenceRunId: 'run-007',
    selectedDirectionSnapshot: makeSnapshot(),
    visualCanon: makeCanon(),
    anchorContract: makeAnchorContract(),
    lockedAssetKeys: ['logo-001'],
    selectionRevision: 1,
  });
  assert.equal(result.contract.status, 'ready');
  assert.ok(result.contract.requiredGrammarRefs.includes('g-comp-01'));
});

// ---------------------------------------------------------------------------
// C08: deterministic fingerprint
// ---------------------------------------------------------------------------

test('C08: sourceFingerprint and productionFingerprint are stable for the same input', () => {
  const input = {
    projectId: 'project-test',
    creativeIntelligenceRunId: 'run-008',
    candidateCount: 3,
    selectedDirectionSnapshot: makeSnapshot(),
    visualCanon: makeCanon(),
    anchorContract: makeAnchorContract(),
    lockedAssetKeys: ['logo-001', 'palette-001'],
    selectionRevision: 1,
  };
  const a = buildAnchorProductionContract(input);
  const b = buildAnchorProductionContract(input);
  assert.equal(a.contract.sourceFingerprint, b.contract.sourceFingerprint);
  assert.equal(a.contract.productionFingerprint, b.contract.productionFingerprint);
});

// ---------------------------------------------------------------------------
// canStartAnchorProduction: preflight gate
// ---------------------------------------------------------------------------

test('canStartAnchorProduction: returns allowed=true on valid state', () => {
  const result = canStartAnchorProduction(
    makeSnapshot(),
    makeCanon(),
    makeAnchorContract(),
    1,
  );
  assert.equal(result.allowed, true);
  assert.equal(result.reason, null);
});

test('canStartAnchorProduction: rejects when AnchorContract blocked', () => {
  const result = canStartAnchorProduction(
    makeSnapshot(),
    makeCanon(),
    makeAnchorContract({ status: 'blocked' }),
    1,
  );
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'CI_ANCHOR_CONTRACT_BLOCKED');
});
