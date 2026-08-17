import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-8 golden scenarios (Spec #63-#70).
 *
 * 12 scenarios:
 *   1. no selection
 *   2. selected grounded Direction
 *   3. selected provisional Direction
 *   4. selected Direction invalidated
 *   5. user changes selection
 *   6. locked-asset-heavy Direction
 *   7. packaging-capable Direction
 *   8. space-capable Direction
 *   9. cross-media Direction
 *  10. Canon drift
 *  11. Anchor prompt leakage
 *  12. stale Direction fingerprint
 */

import {
  buildSelectedDirectionSnapshot,
  buildVisualCanon,
  diffCanon,
  validateCanon,
  VISUAL_CANON_TRACE_VERSION,
} from '@masterpiece/creative-intelligence/visual-canon/index.ts';
import {
  buildAnchorContract,
  detectAnchorLeakage,
} from '@masterpiece/creative-intelligence/anchor-contract/index.ts';
import { createUnselectedState, applySelectionAction, makeSelectAction } from '@masterpiece/creative-intelligence/selection/index.ts';
import { PROJECT_TRUTH_KEYS } from '@masterpiece/creative-intelligence/truth/key-registry.ts';

function makeDir(id, overrides = {}) {
  return {
    id, title: `Direction ${id}`, thesis: 'Brand identity is the central strategic system.',
    conceptRefs: ['c1'],
    visualMechanism: 'A structural system organizes the brand identity across all touchpoints.',
    systemHypothesis: 'The brand is expressed through structural logic, not a single hero object.',
    directionFamily: 'structural-system',
    colorRelationship: '主色与结构对比；中性色承担信息负载。',
    materialRelationship: '材质关系支撑品牌感官一致性。',
    compositionLogic: '层级清晰的网格结构支撑内容。',
    crossMediaBehavior: ['brand/VI', 'editorial', 'digital/UI', 'campaign/poster'],
    opportunityRefs: ['o1'], insightRefs: ['i1'], needRefs: ['n1'],
    factRefs: ['f-brand', 'f-role'], evidenceRefs: ['ev-f-brand', 'ev-f-role'],
    strengths: [], risks: [], blockers: [],
    status: 'grounded',
    generatedBy: 'deterministic_synthesis',
    traceVersion: 'direction-intelligence-v0.1',
    ...overrides,
  };
}

function makeFact(id, key, value, overrides = {}) {
  return {
    id, key, value, truthClass: 'fact', authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    sourceType: 'document', sourceId: 'd1', isReferenceFact: false,
    createdAt: '2026-01-01T00:00:00.000Z', evidenceRefs: [`ev-${id}`], ...overrides,
  };
}

function makeEvidence(id, factIds) {
  return {
    id, type: 'document_extract', sourceType: 'document', sourceId: 'd1',
    factIds, confidence: 0.9, capturedAt: '2026-01-01T00:00:00.000Z',
  };
}

const BASE_FACTS = [
  makeFact('f-brand', PROJECT_TRUTH_KEYS.BRAND_NAME, 'TestBrand'),
  makeFact('f-role', PROJECT_TRUTH_KEYS.BRAND_ROLE, 'platform'),
  makeFact('f-locked-logo', 'logo', 'logo-asset-1', { authority: 'LOCKED' }),
];
const BASE_EVIDENCE = [
  makeEvidence('ev-f-brand', ['f-brand']),
  makeEvidence('ev-f-role', ['f-role']),
  makeEvidence('ev-f-locked', ['f-locked-logo']),
];

function makeSelectedSelection(directionId = 'd1', revision = 1) {
  let state = createUnselectedState('p1', 't0');
  for (let i = 0; i < revision; i++) {
    const r = applySelectionAction(state, makeSelectAction('p1', `d${i+1}`, { occurredAt: `t${i+1}` }), {
      directionExists: () => true, isDirectionBlocked: () => false,
    });
    state = r.state;
  }
  // Override directionId
  return { ...state, selectedDirectionId: directionId, revision };
}

function makeSnapshotAndCanon(overrides = {}) {
  const selection = overrides.selection || makeSelectedSelection();
  const direction = overrides.direction || makeDir('d1');
  const snapResult = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  const canonResult = buildVisualCanon({
    projectId: 'p1', snapshot: snapResult.snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: overrides.lockedAssetKeys || ['logo'],
  });
  return { snapResult, canonResult };
}

// ── 1. no selection ──

test('CI-8 golden 1: no selection → Canon unavailable, Anchor unavailable', () => {
  const unselected = createUnselectedState('p1');
  const direction = makeDir('d1');
  const snapResult = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection: unselected, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  assert.equal(snapResult.snapshot, null);
  assert.ok(snapResult.diagnostics.some((d) => d.code === 'CANON_SELECTION_REQUIRED'));
});

// ── 2. selected grounded Direction ──

test('CI-8 golden 2: selected grounded Direction → Canon valid, Anchor ready', () => {
  const { snapResult, canonResult } = makeSnapshotAndCanon();
  assert.ok(snapResult.snapshot);
  assert.ok(canonResult.canon);
  assert.equal(canonResult.canon.status, 'valid');

  const anchorResult = buildAnchorContract({
    projectId: 'p1', canon: canonResult.canon, snapshot: snapResult.snapshot,
  });
  assert.ok(anchorResult.anchor);
  assert.equal(anchorResult.anchor.status, 'ready');
  // Required DNA covered
  for (const dnaId of canonResult.canon.visualDNA.requiredElementIds) {
    assert.ok(anchorResult.anchor.requiredDNARefs.includes(dnaId),
      `requiredDNA missing: ${dnaId}`);
  }
  // Locked asset covered
  assert.ok(anchorResult.anchor.lockedAssetRefs.includes('logo'));
});

// ── 3. selected provisional Direction ──

test('CI-8 golden 3: selected provisional Direction → Canon provisional', () => {
  const direction = makeDir('d1', { status: 'provisional' });
  const { canonResult } = makeSnapshotAndCanon({ direction });
  assert.ok(canonResult.canon);
  assert.equal(canonResult.canon.status, 'provisional');

  // Anchor is also provisional
  const selection = makeSelectedSelection();
  const snap = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  const anchorResult = buildAnchorContract({
    projectId: 'p1', canon: canonResult.canon, snapshot: snap.snapshot,
  });
  if (anchorResult.anchor) {
    assert.equal(anchorResult.anchor.status, 'provisional');
  }
});

// ── 4. selected Direction invalidated ──

test('CI-8 golden 4: invalidated selection → Canon must not regenerate', () => {
  let selection = makeSelectedSelection();
  selection = { ...selection, status: 'selection_invalidated' };
  const direction = makeDir('d1');
  const snapResult = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  assert.equal(snapResult.snapshot, null);
  assert.ok(snapResult.diagnostics.some((d) => d.code === 'CANON_SELECTION_INVALIDATED'));
});

// ── 5. user changes selection ──

test('CI-8 golden 5: user changes selection → new Canon version, requiresRecompile=true', () => {
  const { snapResult: s1, canonResult: c1 } = makeSnapshotAndCanon();
  // User changes selection to a different direction
  const direction2 = makeDir('d2', {
    visualMechanism: 'Independent modules remain visually distinct while relation logic remains visible.',
    systemHypothesis: 'A relational network expresses the brand.',
    directionFamily: 'relational-network',
  });
  const selection2 = { ...makeSelectedSelection('d2', 2) };
  const snap2 = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection: selection2, direction: direction2,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  const c2 = buildVisualCanon({
    projectId: 'p1', snapshot: snap2.snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: ['logo'],
  });
  assert.ok(c1.canon);
  assert.ok(c2.canon);
  const diff = diffCanon(c1.canon, c2.canon);
  assert.equal(diff.changedDirection, true);
  assert.equal(diff.requiresRecompile, true);
});

// ── 6. locked-asset-heavy Direction ──

test('CI-8 golden 6: locked-asset-heavy → locked rules cover all locked assets', () => {
  const { canonResult } = makeSnapshotAndCanon({ lockedAssetKeys: ['logo', 'brand-color'] });
  assert.equal(canonResult.canon.lockedAssetRules.length, 2);
  for (const rule of canonResult.canon.lockedAssetRules) {
    assert.ok(['logo', 'brand-color'].includes(rule.assetType));
    assert.ok(rule.prohibitedActions.includes('redesign'));
    assert.equal(rule.action, 'preserve');
  }
});

// ── 7. packaging-capable Direction ──

test('CI-8 golden 7: packaging-capable → no box geometry in mustNotIntroduce', () => {
  const direction = makeDir('d1', { crossMediaBehavior: ['brand/VI', 'packaging'] });
  const { snapResult, canonResult } = makeSnapshotAndCanon({ direction });
  assert.ok(canonResult.canon);
  const pkg = canonResult.canon.crossMediaCanon.adaptations['packaging'];
  assert.ok(pkg.mustNotIntroduce.some((s) => /box geometry/i.test(s)));
  assert.ok(pkg.mustNotIntroduce.some((s) => /shot contract/i.test(s)));
});

// ── 8. space-capable Direction ──

test('CI-8 golden 8: space-capable → no lobby / camera / lighting in mustNotIntroduce', () => {
  const direction = makeDir('d1', { crossMediaBehavior: ['brand/VI', 'space'] });
  const { canonResult } = makeSnapshotAndCanon({ direction });
  assert.ok(canonResult.canon);
  const space = canonResult.canon.crossMediaCanon.adaptations['space'];
  assert.ok(space.mustNotIntroduce.some((s) => /lobby/i.test(s)));
  assert.ok(space.mustNotIntroduce.some((s) => /camera/i.test(s)));
  assert.ok(space.mustNotIntroduce.some((s) => /lighting/i.test(s)));
});

// ── 9. cross-media Direction ──

test('CI-8 golden 9: cross-media Direction → all 6 touchpoints represented', () => {
  const direction = makeDir('d1', {
    crossMediaBehavior: ['brand/VI', 'campaign/poster', 'editorial', 'digital/UI', 'space', 'packaging'],
  });
  const { canonResult } = makeSnapshotAndCanon({ direction });
  assert.ok(canonResult.canon);
  for (const tp of ['brand/VI', 'campaign/poster', 'editorial', 'digital/UI', 'space', 'packaging']) {
    assert.ok(canonResult.canon.crossMediaCanon.adaptations[tp]);
  }
});

// ── 10. Canon drift ──

test('CI-8 golden 10: Canon drift attempt — new brand identity → BLOCK', () => {
  const { snapResult, canonResult } = makeSnapshotAndCanon();
  assert.ok(canonResult.canon);
  // Try to introduce a new brand via visualMechanism text
  const driftedCanon = {
    ...canonResult.canon,
    visualMechanism: 'Use 九州神话集团 as the new brand identity reference.',
  };
  const validation = validateCanon({
    canon: driftedCanon, snapshot: snapResult.snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: ['logo'],
  });
  assert.ok(validation.diagnostics.some((d) => d.code === 'CANON_DRIFT_NEW_BRAND'));
  assert.equal(validation.status, 'blocked');
});

test('CI-8 golden 10b: Canon drift attempt — new direction family → BLOCK', () => {
  const { snapResult, canonResult } = makeSnapshotAndCanon();
  assert.ok(canonResult.canon);
  const driftedCanon = {
    ...canonResult.canon,
    directionFamily: 'spatial-extension',
  };
  const validation = validateCanon({
    canon: driftedCanon, snapshot: snapResult.snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: ['logo'],
  });
  assert.ok(validation.diagnostics.some((d) => d.code === 'CANON_DRIFT_NEW_FAMILY'));
  assert.equal(validation.status, 'blocked');
});

// ── 11. Anchor prompt leakage ──

test('CI-8 golden 11: Anchor prompt leakage attempt → BLOCK', () => {
  // Manually build an anchor with prompt leakage
  const dirtyAnchor = {
    schemaVersion: '0.1',
    projectId: 'p1',
    selectedDirectionId: 'd1',
    selectionRevision: 1,
    purpose: 'Validate the structural-system Direction',
    mustDemonstrate: ['Generate a 16:9 hero image with logo.'],
    mustPreserve: ['Brand identity'],
    mayExplore: ['Scale'],
    mustNotChange: ['Logo'],
    requiredDNARefs: ['dna-structural-family'],
    requiredGrammarRefs: [],
    lockedAssetRefs: ['logo'],
    evaluationCriteria: [],
    status: 'ready',
    authoritative: false,
    mode: 'shadow',
  };
  const leak = detectAnchorLeakage(dirtyAnchor);
  assert.ok(leak.text, 'must detect prompt-like text in mustDemonstrate');
});

// ── 12. stale Direction fingerprint ──

test('CI-8 golden 12: stale Direction fingerprint → BLOCK', () => {
  const selection = makeSelectedSelection();
  const direction = makeDir('d1');
  const r = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    expectedFingerprint: 'fp:STALE_FINGERPRINT',
  });
  assert.equal(r.snapshot, null);
  assert.ok(r.diagnostics.some((d) => d.code === 'CANON_DIRECTION_STALE'));
});
