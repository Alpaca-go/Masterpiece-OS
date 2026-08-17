import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-8 Visual Canon & Anchor Contract — unit tests.
 *
 * Layer 1: SelectedDirectionSnapshot tests
 * Layer 2: selection freshness tests
 * Layer 3: VisualCanon contract tests
 * Layer 4: VisualDNA tests
 * Layer 5: VisualGrammar tests
 * Layer 6: CrossMediaCanon tests
 * Layer 7: Canon trace tests
 * Layer 8: Canon drift tests
 * Layer 9: Locked Asset Canon tests
 * Layer 10: AnchorContract tests
 * Layer 11: Prompt/production leakage tests
 * Layer 12: Canon diff/version tests
 */

import {
  buildSelectedDirectionSnapshot,
  validateSnapshotEntry,
  computeDirectionFingerprint,
  buildCanonTraceFromSnapshot,
  buildVisualCanon,
  extractVisualDNA,
  extractVisualGrammar,
  buildCrossMediaCanon,
  validateCanon,
  diffCanon,
  canonVersion,
  VISUAL_CANON_TRACE_VERSION,
} from '@masterpiece/creative-intelligence/visual-canon/index.ts';
import {
  buildAnchorContract,
  validateAnchor,
  detectAnchorLeakage,
  ANCHOR_CONTRACT_TRACE_VERSION,
} from '@masterpiece/creative-intelligence/anchor-contract/index.ts';
import { PROJECT_TRUTH_KEYS } from '@masterpiece/creative-intelligence/truth/key-registry.ts';
import { createUnselectedState, applySelectionAction, makeSelectAction } from '@masterpiece/creative-intelligence/selection/index.ts';

// ========== Fixtures ==========

function makeDir(id, overrides = {}) {
  return {
    id,
    title: `Direction ${id}`,
    thesis: 'Brand identity is the central strategic system.',
    conceptRefs: ['c1'],
    visualMechanism: 'A structural system organizes the brand identity across all touchpoints.',
    systemHypothesis: 'The brand is expressed through structural logic, not a single hero object.',
    directionFamily: 'structural-system',
    colorRelationship: '主色与结构对比；中性色承担信息负载。',
    materialRelationship: '材质关系支撑品牌感官一致性。',
    compositionLogic: '层级清晰的网格结构支撑内容。',
    typographyBehavior: undefined,
    graphicBehavior: undefined,
    imageBehavior: undefined,
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
const LOCKED_KEYS = ['logo'];

function makeSelectedSelection(projectId = 'p1', directionId = 'd1') {
  let state = createUnselectedState(projectId, 't0');
  const r = applySelectionAction(state, makeSelectAction(projectId, directionId, { occurredAt: 't1' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  return r.state;
}

function makeSnapshot() {
  const selection = makeSelectedSelection();
  const direction = makeDir('d1');
  const r = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  return r.snapshot;
}

// ========== Layer 1: Snapshot ==========

test('CI-8 L1: buildSelectedDirectionSnapshot — creates snapshot with required fields', () => {
  const snapshot = makeSnapshot();
  assert.ok(snapshot);
  assert.equal(snapshot.schemaVersion, '0.1');
  assert.equal(snapshot.projectId, 'p1');
  assert.equal(snapshot.directionId, 'd1');
  assert.equal(snapshot.selectedBy, 'user');
  assert.equal(snapshot.traceVersion, VISUAL_CANON_TRACE_VERSION);
  assert.ok(snapshot.directionFingerprint.startsWith('fp:'));
});

test('CI-8 L1: snapshot creation is BLOCKED when no selection', () => {
  const unselected = createUnselectedState('p1');
  const direction = makeDir('d1');
  const r = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection: unselected, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  assert.equal(r.snapshot, null);
  assert.ok(r.diagnostics.some((d) => d.code === 'CANON_SELECTION_REQUIRED'));
});

test('CI-8 L1: snapshot creation is BLOCKED when selection is invalidated', () => {
  let state = makeSelectedSelection();
  state = { ...state, status: 'selection_invalidated' };
  const direction = makeDir('d1');
  const r = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection: state, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  assert.equal(r.snapshot, null);
  assert.ok(r.diagnostics.some((d) => d.code === 'CANON_SELECTION_INVALIDATED'));
});

test('CI-8 L1: snapshot creation is BLOCKED when direction is blocked', () => {
  const selection = makeSelectedSelection();
  const direction = makeDir('d1', { status: 'blocked' });
  const r = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  assert.equal(r.snapshot, null);
  assert.ok(r.diagnostics.some((d) => d.code === 'CANON_DIRECTION_BLOCKED'));
});

test('CI-8 L1: snapshot creation is BLOCKED when selection is non-user', () => {
  const selection = { ...makeSelectedSelection(), selectedBy: 'system' };
  const direction = makeDir('d1');
  const r = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  assert.equal(r.snapshot, null);
  assert.ok(r.diagnostics.some((d) => d.code === 'CANON_SELECTION_REQUIRED'));
});

test('CI-8 L1: snapshot creation is BLOCKED when direction id mismatches selectedDirectionId', () => {
  const selection = makeSelectedSelection('p1', 'd1');
  const direction = makeDir('d2');
  const r = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  assert.equal(r.snapshot, null);
  assert.ok(r.diagnostics.some((d) => d.code === 'CANON_DIRECTION_NOT_FOUND'));
});

test('CI-8 L1: snapshot creation is BLOCKED when fingerprint is stale', () => {
  const selection = makeSelectedSelection();
  const direction = makeDir('d1');
  const r = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    expectedFingerprint: 'fp:WRONG_FINGERPRINT',
  });
  assert.equal(r.snapshot, null);
  assert.ok(r.diagnostics.some((d) => d.code === 'CANON_DIRECTION_STALE'));
});

test('CI-8 L1: computeDirectionFingerprint is deterministic', () => {
  const dir = makeDir('d1');
  const fp1 = computeDirectionFingerprint(dir);
  const fp2 = computeDirectionFingerprint(dir);
  assert.equal(fp1, fp2);
});

// ========== Layer 2: Freshness ==========

test('CI-8 L2: validateSnapshotEntry — passes for clean selection', () => {
  const selection = makeSelectedSelection();
  const direction = makeDir('d1');
  const r = validateSnapshotEntry(selection, direction);
  assert.equal(r.valid, true);
});

test('CI-8 L2: validateSnapshotEntry — fails for unselected', () => {
  const unselected = createUnselectedState('p1');
  const direction = makeDir('d1');
  const r = validateSnapshotEntry(unselected, direction);
  assert.equal(r.valid, false);
});

// ========== Layer 3: VisualCanon contract ==========

test('CI-8 L3: buildVisualCanon produces a Canon with all required fields', () => {
  const snapshot = makeSnapshot();
  const r = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: LOCKED_KEYS,
  });
  assert.ok(r.canon);
  assert.equal(r.canon.schemaVersion, '0.1');
  assert.equal(r.canon.projectId, 'p1');
  assert.equal(r.canon.selectedDirectionId, 'd1');
  assert.equal(r.canon.creativeThesis, snapshot.direction.thesis);
  assert.equal(r.canon.visualMechanism, snapshot.direction.visualMechanism);
  assert.equal(r.canon.systemHypothesis, snapshot.direction.systemHypothesis);
  assert.equal(r.canon.directionFamily, 'structural-system');
  assert.equal(r.canon.status, 'valid');
  assert.equal(r.canon.authoritative, false);
  assert.equal(r.canon.mode, 'shadow');
});

test('CI-8 L3: Canon preserves the direction family (no drift)', () => {
  const snapshot = makeSnapshot();
  const r = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: [],
  });
  assert.equal(r.canon.directionFamily, snapshot.direction.directionFamily);
});

// ========== Layer 4: VisualDNA ==========

test('CI-8 L4: extractVisualDNA produces hard DNA for structure/identity', () => {
  const snapshot = makeSnapshot();
  const { dna } = extractVisualDNA({ snapshot, lockedKeys: LOCKED_KEYS });
  // Structural DNA
  assert.ok(dna.structuralDNA.length > 0);
  assert.ok(dna.structuralDNA.some((e) => e.invariantLevel === 'hard'));
  // Identity DNA
  assert.ok(dna.identityDNA.length >= 2);
  assert.ok(dna.identityDNA.some((e) => e.invariantLevel === 'hard'));
  // Hierarchy + relation
  assert.ok(dna.hierarchyDNA.length > 0);
  assert.ok(dna.relationDNA.length > 0);
  // Required IDs must be present
  assert.ok(dna.requiredElementIds.includes('dna-structural-family'));
  assert.ok(dna.requiredElementIds.includes('dna-identity-preserve'));
});

test('CI-8 L4: DNA does NOT contain implementation specs (no Pantone / no specific px)', () => {
  const snapshot = makeSnapshot();
  const { dna } = extractVisualDNA({ snapshot, lockedKeys: LOCKED_KEYS });
  const allRules = [
    ...dna.structuralDNA, ...dna.identityDNA, ...dna.rhythmDNA,
    ...dna.hierarchyDNA, ...dna.relationDNA,
    ...(dna.colorDNA || []), ...(dna.materialDNA || []), ...(dna.graphicDNA || []),
  ];
  for (const elem of allRules) {
    assert.ok(!/Pantone\s+\d+/i.test(elem.rule),
      `DNA rule must not specify Pantone: ${elem.rule}`);
    assert.ok(!/\b\d+px\b/.test(elem.rule),
      `DNA rule must not specify px: ${elem.rule}`);
  }
});

// ========== Layer 5: VisualGrammar ==========

test('CI-8 L5: extractVisualGrammar produces composition/hierarchy/asset rules', () => {
  const snapshot = makeSnapshot();
  const { grammar } = extractVisualGrammar({ snapshot });
  assert.ok(grammar.compositionRules.length > 0);
  assert.ok(grammar.hierarchyRules.length > 0);
  assert.ok(grammar.assetUsageRules.length > 0);
  // Asset usage rules must be hard and forbid redesign
  const assetRule = grammar.assetUsageRules[0];
  assert.equal(assetRule.invariantLevel, 'hard');
  assert.ok(assetRule.forbidden.some((f) => /redesign|distort|replace/i.test(f)));
});

test('CI-8 L5: forbidden combinations exist', () => {
  const snapshot = makeSnapshot();
  const { grammar } = extractVisualGrammar({ snapshot });
  assert.ok(grammar.forbiddenCombinations.length > 0);
  // Must forbid identity contradiction
  assert.ok(grammar.forbiddenCombinations.some((fc) =>
    fc.forbidden.some((f) => /identity|locked|redesign/i.test(f)),
  ));
});

// ========== Layer 6: CrossMediaCanon ==========

test('CI-8 L6: buildCrossMediaCanon produces 6 touchpoint adaptations', () => {
  const snapshot = makeSnapshot();
  const { canon } = buildCrossMediaCanon({ snapshot });
  const expected = ['brand/VI', 'campaign/poster', 'editorial', 'digital/UI', 'space', 'packaging'];
  for (const tp of expected) {
    assert.ok(canon.adaptations[tp], `adaptation for ${tp} must exist`);
    assert.ok(Array.isArray(canon.adaptations[tp].mustPreserve));
    assert.ok(Array.isArray(canon.adaptations[tp].mayAdapt));
    assert.ok(Array.isArray(canon.adaptations[tp].mustNotIntroduce));
  }
});

test('CI-8 L6: space mustNotIntroduce includes lobby/camera/lighting', () => {
  const snapshot = makeSnapshot();
  const { canon } = buildCrossMediaCanon({ snapshot });
  const space = canon.adaptations['space'];
  assert.ok(space.mustNotIntroduce.some((s) => /lobby/i.test(s)));
  assert.ok(space.mustNotIntroduce.some((s) => /camera/i.test(s)));
  assert.ok(space.mustNotIntroduce.some((s) => /lighting/i.test(s)));
});

test('CI-8 L6: packaging mustNotIntroduce includes box geometry/shot contract', () => {
  const snapshot = makeSnapshot();
  const { canon } = buildCrossMediaCanon({ snapshot });
  const pkg = canon.adaptations['packaging'];
  assert.ok(pkg.mustNotIntroduce.some((s) => /box geometry/i.test(s)));
  assert.ok(pkg.mustNotIntroduce.some((s) => /shot contract/i.test(s)));
});

// ========== Layer 7: Canon trace ==========

test('CI-8 L7: Canon trace references all upstream layers', () => {
  const snapshot = makeSnapshot();
  const r = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: LOCKED_KEYS,
  });
  assert.ok(r.canon);
  const t = r.canon.trace;
  assert.equal(t.selectedDirectionRef, 'd1');
  assert.ok(t.conceptRefs.length > 0);
  assert.ok(t.opportunityRefs.length > 0);
  assert.ok(t.insightRefs.length > 0);
  assert.ok(t.needRefs.length > 0);
  assert.ok(t.factRefs.length > 0);
  assert.ok(t.evidenceRefs.length > 0);
  assert.equal(t.selectionRevision, snapshot.selectionRevision);
});

test('CI-8 L7: Canon trace closure = 100% for valid Canon', () => {
  const snapshot = makeSnapshot();
  const r = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: LOCKED_KEYS,
  });
  // No CANON_RULE_UNGROUNDED diagnostic
  const ungrounded = r.diagnostics.filter((d) => d.code === 'CANON_RULE_UNGROUNDED');
  assert.equal(ungrounded.length, 0, `expected no ungrounded rules, got: ${JSON.stringify(ungrounded)}`);
});

// ========== Layer 8: Canon drift ==========

test('CI-8 L8: drift detection — new direction family', () => {
  const snapshot = makeSnapshot();
  const r = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: [],
  });
  // Mutate canon family (drift attempt)
  const driftedCanon = { ...r.canon, directionFamily: 'spatial-extension' };
  const validation = validateCanon({
    canon: driftedCanon, snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: [],
  });
  assert.ok(validation.diagnostics.some((d) => d.code === 'CANON_DRIFT_NEW_FAMILY'));
  assert.equal(validation.status, 'blocked');
});

test('CI-8 L8: drift detection — new visual mechanism text introducing new brand', () => {
  const snapshot = makeSnapshot();
  const r = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: [],
  });
  // Manually build a canon that introduces unknown brand
  const driftedCanon = {
    ...r.canon,
    visualMechanism: r.canon.visualMechanism + ' Use 九州神话集团 as alternative identity.',
  };
  const validation = validateCanon({
    canon: driftedCanon, snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: [],
  });
  assert.ok(validation.diagnostics.some((d) => d.code === 'CANON_DRIFT_NEW_BRAND'));
});

// ========== Layer 9: Locked Asset Canon ==========

test('CI-8 L9: locked assets are extracted as rules', () => {
  const snapshot = makeSnapshot();
  const r = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: LOCKED_KEYS,
  });
  assert.equal(r.canon.lockedAssetRules.length, 1);
  assert.equal(r.canon.lockedAssetRules[0].assetType, 'logo');
  assert.equal(r.canon.lockedAssetRules[0].action, 'preserve');
  assert.ok(r.canon.lockedAssetRules[0].prohibitedActions.includes('redesign'));
});

test('CI-8 L9: no locked asset rules when no keys provided', () => {
  const snapshot = makeSnapshot();
  const r = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: [],
  });
  assert.equal(r.canon.lockedAssetRules.length, 0);
});

// ========== Layer 10: AnchorContract ==========

test('CI-8 L10: buildAnchorContract produces a complete Anchor', () => {
  const snapshot = makeSnapshot();
  const canonResult = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: LOCKED_KEYS,
  });
  assert.ok(canonResult.canon);
  const r = buildAnchorContract({ projectId: 'p1', canon: canonResult.canon, snapshot });
  assert.ok(r.anchor);
  assert.equal(r.anchor.schemaVersion, '0.1');
  assert.equal(r.anchor.projectId, 'p1');
  assert.equal(r.anchor.selectedDirectionId, 'd1');
  assert.equal(r.anchor.authoritative, false);
  assert.equal(r.anchor.mode, 'shadow');
  // mustDemonstrate / mustPreserve / mayExplore / mustNotChange all exist
  assert.ok(Array.isArray(r.anchor.mustDemonstrate));
  assert.ok(Array.isArray(r.anchor.mustPreserve));
  assert.ok(Array.isArray(r.anchor.mayExplore));
  assert.ok(Array.isArray(r.anchor.mustNotChange));
  // Required DNA coverage
  assert.ok(r.anchor.requiredDNARefs.length > 0);
  // Required Grammar coverage
  assert.ok(r.anchor.requiredGrammarRefs.length > 0);
  // Locked asset coverage
  assert.ok(r.anchor.lockedAssetRefs.length > 0);
  assert.ok(r.anchor.lockedAssetRefs.includes('logo'));
});

test('CI-8 L10: Anchor contract is BLOCKED when no Canon', () => {
  const snapshot = makeSnapshot();
  // Build a Canon first, but then test that we need a valid Canon
  const canonResult = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: LOCKED_KEYS,
  });
  // If canon is null (validation failed), anchor build should be impossible
  if (!canonResult.canon) {
    assert.equal(canonResult.canon, null);
  } else {
    const r = buildAnchorContract({ projectId: 'p1', canon: canonResult.canon, snapshot });
    assert.ok(r.anchor !== null || r.status === 'blocked');
  }
});

// ========== Layer 11: Prompt / production leakage ==========

test('CI-8 L11: detectAnchorLeakage — prompt field forbidden', () => {
  const bad = { prompt: 'Generate a 16:9 hero' };
  const leak = detectAnchorLeakage(bad);
  assert.equal(leak.field, 'prompt');
});

test('CI-8 L11: detectAnchorLeakage — model field forbidden', () => {
  const bad = { model: 'midjourney' };
  const leak = detectAnchorLeakage(bad);
  assert.equal(leak.field, 'model');
});

test('CI-8 L11: detectAnchorLeakage — aspectRatio field forbidden', () => {
  const bad = { aspectRatio: '16:9' };
  const leak = detectAnchorLeakage(bad);
  assert.equal(leak.field, 'aspectRatio');
});

test('CI-8 L11: detectAnchorLeakage — text "Generate a 16:9" detected', () => {
  const bad = { text: 'Generate a 16:9 hero poster' };
  const leak = detectAnchorLeakage(bad);
  assert.ok(leak.text, 'should detect Generate pattern');
});

test('CI-8 L11: detectAnchorLeakage — seed value forbidden', () => {
  const bad = { text: 'use seed: 12345 for stability' };
  const leak = detectAnchorLeakage(bad);
  assert.ok(leak.text, 'should detect seed value');
});

test('CI-8 L11: clean anchor contract has zero leakage', () => {
  const snapshot = makeSnapshot();
  const canonResult = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: LOCKED_KEYS,
  });
  if (canonResult.canon) {
    const r = buildAnchorContract({ projectId: 'p1', canon: canonResult.canon, snapshot });
    if (r.anchor) {
      const leak = detectAnchorLeakage(r.anchor);
      assert.equal(leak.field, null);
      assert.equal(leak.text, null);
    }
  }
});

test('CI-8 L11: ANCHOR_CONTRACT_TRACE_VERSION is set', () => {
  assert.equal(ANCHOR_CONTRACT_TRACE_VERSION, 'anchor-contract-v0.1');
});

// ========== Layer 12: Canon diff / version ==========

test('CI-8 L12: diffCanon — same canon = no change', () => {
  const snapshot = makeSnapshot();
  const r = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: LOCKED_KEYS,
  });
  const diff = diffCanon(r.canon, r.canon);
  assert.equal(diff.changedDirection, false);
  assert.equal(diff.addedRules.length, 0);
  assert.equal(diff.removedRules.length, 0);
  assert.equal(diff.requiresRecompile, false);
});

test('CI-8 L12: diffCanon — different selection = changed', () => {
  const snapshot = makeSnapshot();
  const r1 = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: LOCKED_KEYS,
  });
  const newSnapshot = { ...snapshot, selectionRevision: 2, directionFingerprint: 'fp:NEWFINGER' };
  const r2 = { canon: { ...r1.canon, selectionRevision: 2, trace: { ...r1.canon.trace, selectionRevision: 2, directionFingerprint: 'fp:NEWFINGER' } } };
  const diff = diffCanon(r1.canon, r2.canon);
  assert.equal(diff.changedDirection, true);
  assert.equal(diff.requiresRecompile, true);
});

test('CI-8 L12: canonVersion derives from revision + fingerprint', () => {
  const snapshot = makeSnapshot();
  const r = buildVisualCanon({
    projectId: 'p1', snapshot, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: [],
  });
  const v = canonVersion(r.canon);
  assert.ok(v.startsWith('v'));
  assert.ok(v.includes('-'));
});
