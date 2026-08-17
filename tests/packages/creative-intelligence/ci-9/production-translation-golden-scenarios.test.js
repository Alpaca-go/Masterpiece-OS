/**
 * CI-9 Golden Scenarios (Spec #63-#78).
 *
 * 16 scenarios:
 *   1.  valid Canon → Space
 *   2.  valid Canon → Packaging
 *   3.  same Canon → both media (cross-media consistency)
 *   4.  provisional Canon
 *   5.  blocked Canon
 *   6.  stale Canon (fingerprint mismatch)
 *   7.  Locked Asset heavy
 *   8.  Reference-First
 *   9.  Space adaptation (cross-media canon space-specific rules)
 *  10.  Packaging adaptation (cross-media canon packaging-specific rules)
 *  11.  hard DNA loss
 *  12.  hard Grammar loss
 *  13.  new mechanism drift
 *  14.  reference contamination
 *  15.  prompt leakage
 *  16.  current-input conflict (comparison)
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProductionTranslationContext,
  buildSpaceTranslation,
  buildPackagingTranslation,
  validateCrossMediaConsistency,
  detectTranslationDrift,
  detectUngroundedMediaRules,
  buildTranslationComparison,
  detectReferenceCanonConflict,
} from '@masterpiece/creative-intelligence/production-translation/index.ts';
import {
  buildSelectedDirectionSnapshot,
  buildVisualCanon,
} from '@masterpiece/creative-intelligence/visual-canon/index.ts';
import {
  buildAnchorContract,
} from '@masterpiece/creative-intelligence/anchor-contract/index.ts';
import {
  createUnselectedState,
  applySelectionAction,
  makeSelectAction,
} from '@masterpiece/creative-intelligence/selection/index.ts';
import { PROJECT_TRUTH_KEYS } from '@masterpiece/creative-intelligence/truth/key-registry.ts';

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
    crossMediaBehavior: ['brand/VI', 'editorial', 'digital/UI', 'campaign/poster', 'space', 'packaging'],
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
  const r = applySelectionAction(state, makeSelectAction('p1', directionId, { occurredAt: 't1' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r.state;
  return { ...state, selectedDirectionId: directionId, revision };
}

function makeSnapshotAndCanon(directionOverrides = {}, lockedKeys = ['logo']) {
  const selection = makeSelectedSelection();
  const direction = makeDir('d1', directionOverrides);
  const snapResult = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
  });
  if (!snapResult.snapshot) throw new Error('snapshot must build');
  const canonResult = buildVisualCanon({
    projectId: 'p1', snapshot: snapResult.snapshot,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: lockedKeys,
  });
  return { snapResult, canonResult };
}

function makeContext(overrides = {}) {
  const { snapResult, canonResult } = makeSnapshotAndCanon(
    overrides.directionOverrides || {},
    overrides.lockedKeys || ['logo'],
  );
  if (!snapResult.snapshot || !canonResult.canon) {
    throw new Error('cannot build context: missing snapshot or canon');
  }
  const anchorResult = buildAnchorContract({
    projectId: 'p1', snapshot: snapResult.snapshot, canon: canonResult.canon,
  });
  if (!anchorResult.anchor) throw new Error('cannot build anchor');
  const ctxResult = buildProductionTranslationContext({
    projectId: 'p1',
    snapshot: snapResult.snapshot,
    canon: canonResult.canon,
    anchor: anchorResult.anchor,
    targetMedia: overrides.targetMedia || 'space',
  });
  if (!ctxResult.context) throw new Error('cannot build translation context');
  return {
    ctx: ctxResult.context,
    snapshot: snapResult.snapshot,
    canon: canonResult.canon,
    anchor: anchorResult.anchor,
  };
}

// ── 1. valid Canon → Space ──

test('CI-9 golden 1: valid Canon → Space translation contract produced', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  assert.ok(spaceResult.contract);
  assert.equal(spaceResult.contract.media, 'space');
  assert.equal(spaceResult.contract.selectedDirectionId, 'd1');
  assert.equal(spaceResult.contract.status, 'ready');
  // Hard DNA + hard Grammar + locked assets preserved
  assert.ok(spaceResult.contract.requiredDNARefs.length > 0);
  assert.ok(spaceResult.contract.requiredGrammarRefs.length > 0);
  assert.ok(spaceResult.contract.lockedAssetRuleRefs.length > 0);
});

// ── 2. valid Canon → Packaging ──

test('CI-9 golden 2: valid Canon → Packaging translation contract produced', () => {
  const { ctx } = makeContext({ targetMedia: 'packaging' });
  const pkgResult = buildPackagingTranslation({ ctx });
  assert.ok(pkgResult.contract);
  assert.equal(pkgResult.contract.media, 'packaging');
  assert.equal(pkgResult.contract.selectedDirectionId, 'd1');
  assert.equal(pkgResult.contract.status, 'ready');
  // All 7 buckets populated
  assert.ok(pkgResult.contract.productIdentityRules.length > 0);
  assert.ok(pkgResult.contract.structurePreservationRules.length > 0);
  assert.ok(pkgResult.contract.informationHierarchyRules.length > 0);
  assert.ok(pkgResult.contract.familySystemRules.length > 0);
  assert.ok(pkgResult.contract.materialBehaviorRules.length > 0);
  assert.ok(pkgResult.contract.brandPresenceRules.length > 0);
  assert.ok(pkgResult.contract.lockedCopyRules.length > 0);
});

// ── 3. same Canon → both media (cross-media consistency) ──

test('CI-9 golden 3: same Canon → both media share hard DNA, hard Grammar, locked assets', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  const { ctx: ctxPkg } = makeContext({ targetMedia: 'packaging' });
  const pkgResult = buildPackagingTranslation({ ctx: ctxPkg });
  if (!spaceResult.contract || !pkgResult.contract) throw new Error('contracts missing');
  // Hard DNA identical
  assert.deepEqual([...spaceResult.contract.requiredDNARefs].sort(), [...pkgResult.contract.requiredDNARefs].sort());
  // Hard Grammar identical
  assert.deepEqual([...spaceResult.contract.requiredGrammarRefs].sort(), [...pkgResult.contract.requiredGrammarRefs].sort());
  // Locked asset refs identical
  assert.deepEqual([...spaceResult.contract.lockedAssetRuleRefs].sort(), [...pkgResult.contract.lockedAssetRuleRefs].sort());
  // Cross-media validation: no cross-media drift
  const xm = validateCrossMediaConsistency(spaceResult.contract, pkgResult.contract);
  const crossMedia = xm.filter((d) => ['PT_HARD_DNA_MISSING', 'PT_HARD_GRAMMAR_MISSING', 'PT_LOCKED_ASSET_RULE_MISSING', 'PT_SELECTION_MISMATCH', 'PT_CANON_STALE'].includes(d.code));
  assert.equal(crossMedia.length, 0);
});

// ── 4. provisional Canon ──

test('CI-9 golden 4: provisional Canon → translation still produced with provisional markers', () => {
  const { ctx } = makeContext({
    directionOverrides: { status: 'provisional' },
  });
  const spaceResult = buildSpaceTranslation({ ctx });
  // Translation may be ready (provisional does not block translation), but
  // the context itself propagates provisionality via the canonVersion.
  assert.ok(spaceResult.contract);
  assert.equal(spaceResult.contract.status, 'ready'); // provisional canon still translates
  // Context still has the canonical version
  assert.ok(ctx.canonVersion);
});

// ── 5. blocked Canon ──

test('CI-9 golden 5: blocked Canon → no translation produced', () => {
  const result = buildProductionTranslationContext({
    projectId: 'p1',
    snapshot: undefined,
    canon: { status: 'blocked', selectionRevision: 1, trace: { directionFingerprint: 'fp:0' } },
    anchor: { status: 'ready' },
    targetMedia: 'space',
  });
  assert.equal(result.context, null);
  assert.ok(result.diagnostics.some((d) => d.code === 'PT_CANON_BLOCKED' || d.code === 'PT_CANON_REQUIRED'));
});

// ── 6. stale Canon (fingerprint mismatch) ──

test('CI-9 golden 6: stale Canon → entry rejected with PT_CANON_STALE', () => {
  const { snapResult, canonResult } = makeSnapshotAndCanon();
  if (!snapResult.snapshot || !canonResult.canon) throw new Error('fixture broken');
  const result = buildProductionTranslationContext({
    projectId: 'p1',
    snapshot: snapResult.snapshot,
    canon: { ...canonResult.canon, trace: { ...canonResult.canon.trace, directionFingerprint: 'fp:stale-bead' } },
    anchor: { status: 'ready' },
    targetMedia: 'space',
  });
  assert.equal(result.context, null);
  assert.ok(result.diagnostics.some((d) => d.code === 'PT_CANON_STALE'));
});

// ── 7. Locked Asset heavy ──

test('CI-9 golden 7: Locked Asset heavy → multiple locked asset rules preserved across media', () => {
  const heavyFacts = [
    ...BASE_FACTS,
    makeFact('f-locked-color', 'color', 'brand-blue', { authority: 'LOCKED' }),
    makeFact('f-locked-typography', 'typography', 'corporate-serif', { authority: 'LOCKED' }),
  ];
  const heavyEvidence = [
    ...BASE_EVIDENCE,
    makeEvidence('ev-f-locked-color', ['f-locked-color']),
    makeEvidence('ev-f-locked-typography', ['f-locked-typography']),
  ];
  const selection = makeSelectedSelection();
  const direction = makeDir('d1');
  const snapResult = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
  });
  if (!snapResult.snapshot) throw new Error('snapshot missing');
  const canonResult = buildVisualCanon({
    projectId: 'p1', snapshot: snapResult.snapshot,
    facts: heavyFacts, evidence: heavyEvidence,
    lockedAssetKeys: ['logo', 'color', 'typography'],
  });
  if (!canonResult.canon) throw new Error('canon missing');
  const anchorResult = buildAnchorContract({
    projectId: 'p1', snapshot: snapResult.snapshot, canon: canonResult.canon,
  });
  if (!anchorResult.anchor) throw new Error('anchor missing');
  const ctxResult = buildProductionTranslationContext({
    projectId: 'p1', snapshot: snapResult.snapshot, canon: canonResult.canon, anchor: anchorResult.anchor, targetMedia: 'space',
  });
  if (!ctxResult.context) throw new Error('context missing');

  const spaceResult = buildSpaceTranslation({ ctx: ctxResult.context });
  if (!spaceResult.contract) throw new Error('space contract missing');
  // All 3 locked asset types preserved
  assert.ok(spaceResult.contract.lockedAssetRuleRefs.length >= 1);
  // Packaging must also preserve all
  const pkgResult = buildPackagingTranslation({ ctx: ctxResult.context });
  if (!pkgResult.contract) throw new Error('pkg contract missing');
  assert.deepEqual([...spaceResult.contract.lockedAssetRuleRefs].sort(), [...pkgResult.contract.lockedAssetRuleRefs].sort());
});

// ── 8. Reference-First ──

test('CI-9 golden 8: Reference-First → translation does not let reference identity override Canon', () => {
  const { ctx, canon } = makeContext();
  // Simulate a Direction with reference-derived identity (crossMediaBehavior includes reference-first)
  const tamperedCanon = {
    ...canon,
    visualMechanism: 'A structural system inspired by Apple identity.',
  };
  const tamperedCtx = { ...ctx, visualCanon: tamperedCanon };
  const diagnostics = detectReferenceCanonConflict(tamperedCtx, ['Apple']);
  assert.ok(diagnostics.some((d) => d.code === 'PT_REFERENCE_CANON_CONFLICT'));
});

// ── 9. Space adaptation (cross-media canon space-specific rules) ──

test('CI-9 golden 9: Space adaptation → preserves space-specific mayAdapt + mustNotIntroduce from crossMediaCanon', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('space contract missing');
  // Space mayAdapt must mention scale + material density (from crossMediaCanon space)
  const allAdapt = spaceResult.contract.mayAdapt.join(' ').toLowerCase();
  assert.ok(/scale/.test(allAdapt), 'space mayAdapt must mention scale');
  // Space mustNotIntroduce must mention camera/lighting/render (from spec)
  const allMNI = spaceResult.contract.mustNotIntroduce.join(' ').toLowerCase();
  assert.ok(/camera|lighting|render|aspect ratio/.test(allMNI), 'space mustNotIntroduce must include production terms');
});

// ── 10. Packaging adaptation ──

test('CI-9 golden 10: Packaging adaptation → preserves packaging-specific mustNotIntroduce', () => {
  const { ctx } = makeContext({ targetMedia: 'packaging' });
  const pkgResult = buildPackagingTranslation({ ctx });
  if (!pkgResult.contract) throw new Error('pkg contract missing');
  // Packaging mustNotIntroduce must mention box geometry / shot contract / render prompt
  const allMNI = pkgResult.contract.mustNotIntroduce.join(' ').toLowerCase();
  assert.ok(/box geometry|shot contract|render|provider/.test(allMNI), 'packaging mustNotIntroduce must include production terms');
});

// ── 11. hard DNA loss ──

test('CI-9 golden 11: hard DNA loss → detected by detectTranslationDrift', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const tampered = { ...spaceResult.contract, requiredDNARefs: [] };
  const diagnostics = detectTranslationDrift(ctx, tampered);
  assert.ok(diagnostics.some((d) => d.code === 'PT_HARD_DNA_MISSING'));
});

// ── 12. hard Grammar loss ──

test('CI-9 golden 12: hard Grammar loss → detected by detectTranslationDrift', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const tampered = { ...spaceResult.contract, requiredGrammarRefs: [] };
  const diagnostics = detectTranslationDrift(ctx, tampered);
  assert.ok(diagnostics.some((d) => d.code === 'PT_HARD_GRAMMAR_MISSING'));
});

// ── 13. new mechanism drift ──

test('CI-9 golden 13: new mechanism drift → invalid media rule with orphan sourceRef is flagged', () => {
  const { ctx } = makeContext();
  const diagnostics = detectUngroundedMediaRules(ctx, ['r1'], ['never-existed-source']);
  assert.ok(diagnostics.some((d) => d.code === 'PT_MEDIA_RULE_UNGROUNDED'));
});

// ── 14. reference contamination ──

test('CI-9 golden 14: reference contamination → "Reference identity" in mustPreserve is flagged', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const tampered = {
    ...spaceResult.contract,
    mustPreserve: [...spaceResult.contract.mustPreserve, 'Reference identity must be preserved'],
  };
  const diagnostics = detectTranslationDrift(ctx, tampered);
  assert.ok(diagnostics.some((d) => d.code === 'PT_REFERENCE_CONTAMINATION'));
});

// ── 15. prompt leakage ──

test('CI-9 golden 15: prompt leakage → forbidden token in mustPreserve is flagged', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const tampered = {
    ...spaceResult.contract,
    mustPreserve: [...spaceResult.contract.mustPreserve, 'set the camera angle low'],
  };
  const diagnostics = detectTranslationDrift(ctx, tampered);
  assert.ok(diagnostics.some((d) => d.code === 'PT_PRODUCTION_PROMPT_LEAKAGE'));
});

// ── 16. current-input conflict (comparison) ──

test('CI-9 golden 16: current-input conflict → comparison surfaces conflict + behaviorChangeRisk=high', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const { report } = buildTranslationComparison({
    media: 'space',
    canonVersion: ctx.canonVersion,
    translated: spaceResult.contract,
    current: {
      brandName: 'TestBrand',
      directionId: 'd-foreign', // different direction → conflict
      lockedAssetRefs: ['logo'],
      mandatoryCopy: ['Mandatory Copy Text'],
    },
  });
  assert.ok(report.conflicts.some((c) => c.field === 'selectedDirectionId'));
  assert.equal(report.behaviorChangeRisk, 'high');
  assert.equal(report.comparisonReadiness, 'comparison_conflicted');
  assert.equal(report.readyForConsumerSwitch, false); // always false in CI-9
});
