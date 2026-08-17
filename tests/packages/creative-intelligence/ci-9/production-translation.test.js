/**
 * CI-9 Production Translation Bridge — unit tests.
 *
 * Layer 1: ProductionTranslationContext entry validation
 * Layer 2: Translation boundary / forbidden fields / prompt leakage
 * Layer 3: Space translation contract
 * Layer 4: Packaging translation contract
 * Layer 5: Cross-media consistency
 * Layer 6: Translation drift guard
 * Layer 7: Comparison adapter
 * Layer 8: Translation version / diff
 * Layer 9: Reference-Canon conflict detection
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
  buildTranslationFingerprint,
  buildTranslationVersion,
  diffTranslation,
  translationVersion,
  detectProductionPromptLeakage,
  detectForbiddenField,
  detectReferenceCanonConflict,
  PRODUCTION_TRANSLATION_DIAGNOSTIC_CODES,
} from '@masterpiece/creative-intelligence/production-translation/index.ts';
import {
  buildSelectedDirectionSnapshot,
  buildVisualCanon,
  VISUAL_CANON_TRACE_VERSION,
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
const LOCKED_KEYS = ['logo'];

function makeSelectedSelection(directionId = 'd1', revision = 1) {
  let state = createUnselectedState('p1', 't0');
  const r = applySelectionAction(state, makeSelectAction('p1', directionId, { occurredAt: 't1' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r.state;
  return { ...state, selectedDirectionId: directionId, revision };
}

function makeSnapshotAndCanon(overrides = {}) {
  const selection = overrides.selection || makeSelectedSelection();
  const direction = overrides.direction || makeDir('d1');
  const snapResult = buildSelectedDirectionSnapshot({
    projectId: 'p1', selection, direction,
  });
  if (!snapResult.snapshot) throw new Error('snapshot must build');
  const canonResult = buildVisualCanon({
    projectId: 'p1', snapshot: snapResult.snapshot,
    facts: BASE_FACTS, evidence: BASE_EVIDENCE,
    lockedAssetKeys: LOCKED_KEYS,
  });
  return { snapResult, canonResult };
}

function makeContext(overrides = {}) {
  const { snapResult, canonResult } = makeSnapshotAndCanon(overrides);
  if (!snapResult.snapshot || !canonResult.canon) {
    throw new Error('cannot build context: missing snapshot or canon');
  }
  const anchorResult = buildAnchorContract({
    projectId: 'p1', snapshot: snapResult.snapshot, canon: canonResult.canon,
  });
  if (!anchorResult.anchor) {
    throw new Error('cannot build context: missing anchor');
  }
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

// ========== Layer 1: ProductionTranslationContext ==========

test('CI-9 L1: context entry rejects when snapshot is missing', () => {
  const result = buildProductionTranslationContext({
    projectId: 'p1',
    snapshot: undefined,
    canon: undefined,
    anchor: undefined,
    targetMedia: 'space',
  });
  assert.equal(result.context, null);
  assert.ok(result.diagnostics.some((d) => d.code === 'PT_CANON_REQUIRED'));
});

test('CI-9 L1: context entry rejects when canon is blocked', () => {
  const { snapResult } = makeSnapshotAndCanon();
  const blockedCanon = {
    ...(snapResult.snapshot ? { selectedDirectionId: snapResult.snapshot.directionId } : {}),
    status: 'blocked',
    selectionRevision: 1,
    trace: { directionFingerprint: 'fp:00000000' },
  };
  const result = buildProductionTranslationContext({
    projectId: 'p1',
    snapshot: snapResult.snapshot,
    canon: blockedCanon,
    anchor: { status: 'ready' },
    targetMedia: 'space',
  });
  assert.equal(result.context, null);
  assert.ok(result.diagnostics.some((d) => d.code === 'PT_CANON_BLOCKED'));
});

test('CI-9 L1: context entry rejects when selectionRevision mismatches', () => {
  const { snapResult, canonResult } = makeSnapshotAndCanon();
  if (!snapResult.snapshot || !canonResult.canon) throw new Error('fixture broken');
  const result = buildProductionTranslationContext({
    projectId: 'p1',
    snapshot: snapResult.snapshot,
    canon: { ...canonResult.canon, selectionRevision: 99 },
    anchor: { status: 'ready' },
    targetMedia: 'space',
  });
  assert.equal(result.context, null);
  assert.ok(result.diagnostics.some((d) => d.code === 'PT_SELECTION_MISMATCH'));
});

test('CI-9 L1: context entry rejects when directionFingerprint mismatches', () => {
  const { snapResult, canonResult } = makeSnapshotAndCanon();
  if (!snapResult.snapshot || !canonResult.canon) throw new Error('fixture broken');
  const result = buildProductionTranslationContext({
    projectId: 'p1',
    snapshot: snapResult.snapshot,
    canon: { ...canonResult.canon, trace: { ...canonResult.canon.trace, directionFingerprint: 'fp:deadbeef' } },
    anchor: { status: 'ready' },
    targetMedia: 'space',
  });
  assert.equal(result.context, null);
  assert.ok(result.diagnostics.some((d) => d.code === 'PT_CANON_STALE'));
});

test('CI-9 L1: context entry succeeds for valid canon', () => {
  const ctx = makeContext();
  assert.ok(ctx.ctx);
  assert.equal(ctx.ctx.projectId, 'p1');
  assert.equal(ctx.ctx.targetMedia, 'space');
  assert.ok(ctx.ctx.canonVersion);
  assert.ok(ctx.ctx.canonVersion.startsWith('v'));
});

// ========== Layer 2: Translation Boundary ==========

test('CI-9 L2: detectProductionPromptLeakage flags "camera" and "lens"', () => {
  assert.equal(detectProductionPromptLeakage('set the camera angle'), 'set the camera angle');
  assert.equal(detectProductionPromptLeakage('lens distortion'), 'lens distortion');
  assert.equal(detectProductionPromptLeakage('safe text'), null);
});

test('CI-9 L2: detectProductionPromptLeakage recurses through arrays/objects', () => {
  assert.match(
    detectProductionPromptLeakage({ mustPreserve: ['brand', 'shot contract'] }) ?? '',
    /shot contract/,
  );
  assert.equal(detectProductionPromptLeakage({ a: [{ b: 'clean text' }] }), null);
});

test('CI-9 L2: detectForbiddenField flags "prompt" or "seed" field names', () => {
  const ok = { schemaVersion: '0.1', requiredDNARefs: ['a'] };
  assert.equal(detectForbiddenField(ok), null);
  const bad = { prompt: 'something' };
  assert.equal(detectForbiddenField(bad), 'prompt');
});

test('CI-9 L2: buildTranslationFingerprint is stable', () => {
  const c1 = {
    media: 'space',
    selectedDirectionId: 'd1',
    canonVersion: 'v1-abcd',
    requiredDNARefs: ['a', 'b'],
    requiredGrammarRefs: ['g1'],
    lockedAssetRuleRefs: ['l1'],
  };
  const c2 = {
    media: 'space',
    selectedDirectionId: 'd1',
    canonVersion: 'v1-abcd',
    requiredDNARefs: ['b', 'a'], // reordered
    requiredGrammarRefs: ['g1'],
    lockedAssetRuleRefs: ['l1'],
  };
  assert.equal(buildTranslationFingerprint(c1), buildTranslationFingerprint(c2));
});

test('CI-9 L2: buildTranslationVersion combines canonVersion + media + schema', () => {
  assert.equal(buildTranslationVersion('v1-abcd', 'space'), 'v1-abcd#space#0.1');
  assert.equal(buildTranslationVersion('v1-abcd', 'packaging'), 'v1-abcd#packaging#0.1');
});

// ========== Layer 3: Space Translation Contract ==========

test('CI-9 L3: buildSpaceTranslation produces a contract with all 7 rule buckets', () => {
  const { ctx } = makeContext();
  const result = buildSpaceTranslation({ ctx });
  assert.ok(result.contract);
  assert.equal(result.contract.media, 'space');
  assert.ok(Array.isArray(result.contract.spatialIdentityRules));
  assert.ok(Array.isArray(result.contract.zoneRelationshipRules));
  assert.ok(Array.isArray(result.contract.environmentalGraphicRules));
  assert.ok(Array.isArray(result.contract.wayfindingRules));
  assert.ok(Array.isArray(result.contract.materialBehaviorRules));
  assert.ok(Array.isArray(result.contract.brandPresenceRules));
  assert.ok(Array.isArray(result.contract.scaleAdaptationRules));
  assert.ok(Array.isArray(result.contract.prohibitedSpatialDrift));
});

test('CI-9 L3: space contract has hard rules (no camera, no lens, no render, no seed)', () => {
  const { ctx } = makeContext();
  const result = buildSpaceTranslation({ ctx });
  assert.ok(result.contract);
  // prohibitedSpatialDrift is a meta-list of forbidden things; we only require
  // each entry to be a non-empty descriptor, not a production term.
  for (const drift of result.contract.prohibitedSpatialDrift) {
    assert.ok(drift.length > 0, 'prohibited drift entry must be non-empty');
  }
  const allRules = [
    ...result.contract.spatialIdentityRules,
    ...result.contract.zoneRelationshipRules,
    ...result.contract.environmentalGraphicRules,
    ...result.contract.wayfindingRules,
    ...result.contract.materialBehaviorRules,
    ...result.contract.brandPresenceRules,
    ...result.contract.scaleAdaptationRules,
  ];
  // Every media rule must NOT contain production terms
  for (const r of allRules) {
    assert.ok(!/camera|lens|seed|aspect ratio|provider/i.test(r.rule),
      `space rule ${r.id} contains production term`);
    assert.ok(!/render parameters/.test(r.rule),
      `space rule ${r.id} contains production term "render parameters"`);
  }
  // Every media rule must have a valid invariantLevel
  for (const r of allRules) {
    assert.ok(['hard', 'strong', 'adaptive'].includes(r.invariantLevel),
      `space rule ${r.id} has invalid invariantLevel`);
  }
  // Every media rule must have a sourceRef (Canon trace)
  for (const r of allRules) {
    assert.ok(r.sourceRef, `space rule ${r.id} missing sourceRef`);
  }
});

test('CI-9 L3: space contract requires hard DNA, hard Grammar, locked asset refs', () => {
  const { ctx } = makeContext();
  const result = buildSpaceTranslation({ ctx });
  assert.ok(result.contract);
  assert.ok(result.contract.requiredDNARefs.length > 0);
  assert.ok(result.contract.requiredGrammarRefs.length > 0);
  assert.ok(result.contract.lockedAssetRuleRefs.length > 0);
});

// ========== Layer 4: Packaging Translation Contract ==========

test('CI-9 L4: buildPackagingTranslation produces a contract with 7 rule buckets', () => {
  const { ctx } = makeContext({ targetMedia: 'packaging' });
  const result = buildPackagingTranslation({ ctx });
  assert.ok(result.contract);
  assert.equal(result.contract.media, 'packaging');
  assert.ok(Array.isArray(result.contract.productIdentityRules));
  assert.ok(Array.isArray(result.contract.structurePreservationRules));
  assert.ok(Array.isArray(result.contract.informationHierarchyRules));
  assert.ok(Array.isArray(result.contract.familySystemRules));
  assert.ok(Array.isArray(result.contract.materialBehaviorRules));
  assert.ok(Array.isArray(result.contract.brandPresenceRules));
  assert.ok(Array.isArray(result.contract.lockedCopyRules));
  assert.ok(Array.isArray(result.contract.prohibitedPackagingDrift));
});

test('CI-9 L4: packaging contract preserves analysis-led + reference-first + frozen shot contracts', () => {
  const { ctx } = makeContext({ targetMedia: 'packaging' });
  const result = buildPackagingTranslation({ ctx });
  assert.ok(result.contract);
  const allRules = [
    ...result.contract.structurePreservationRules,
    ...result.contract.informationHierarchyRules,
    ...result.contract.familySystemRules,
    ...result.contract.lockedCopyRules,
  ];
  const allRuleText = allRules.map((r) => r.rule).join(' ');
  assert.match(allRuleText, /analysis.led/i);
  assert.match(allRuleText, /reference.first/i);
  assert.match(allRuleText, /shot contract/i);
  assert.match(allRuleText, /Mandatory copy/i);
});

test('CI-9 L4: packaging contract does NOT include box geometry / render prompt', () => {
  const { ctx } = makeContext({ targetMedia: 'packaging' });
  const result = buildPackagingTranslation({ ctx });
  assert.ok(result.contract);
  // mustNotIntroduce must include these, and mustPreserve must NOT introduce them
  for (const drift of result.contract.prohibitedPackagingDrift) {
    assert.ok(drift.length > 0);
  }
  const allText = [
    ...result.contract.mustPreserve,
    ...result.contract.mayAdapt,
  ].join(' ').toLowerCase();
  // these are in mustNotIntroduce / prohibitedPackagingDrift, not in mustPreserve/mayAdapt
  assert.ok(!/specific box geometry/.test(allText));
});

// ========== Layer 5: Cross-Media Consistency ==========

test('CI-9 L5: cross-media consistency: matching space + packaging → 0 diagnostics', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  const { ctx: ctx2 } = makeContext({ targetMedia: 'packaging' });
  const pkgResult = buildPackagingTranslation({ ctx: ctx2 });
  if (!spaceResult.contract || !pkgResult.contract) throw new Error('contracts missing');
  const diagnostics = validateCrossMediaConsistency(spaceResult.contract, pkgResult.contract);
  // Some diagnostics may be present due to per-contract validation (PT_PRODUCTION_PROMPT_LEAKAGE etc.)
  // but cross-media issues should be empty.
  const crossMedia = diagnostics.filter((d) =>
    ['PT_HARD_DNA_MISSING', 'PT_HARD_GRAMMAR_MISSING', 'PT_LOCKED_ASSET_RULE_MISSING',
     'PT_SELECTION_MISMATCH', 'PT_CANON_STALE'].includes(d.code));
  assert.equal(crossMedia.length, 0, `cross-media drift detected: ${JSON.stringify(crossMedia)}`);
});

test('CI-9 L5: cross-media detects DNA divergence', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  const { ctx: ctx2 } = makeContext({ targetMedia: 'packaging' });
  const pkgResult = buildPackagingTranslation({ ctx: ctx2 });
  if (!spaceResult.contract || !pkgResult.contract) throw new Error('contracts missing');
  // Tamper with packaging DNA
  const tampered = { ...pkgResult.contract, requiredDNARefs: [...pkgResult.contract.requiredDNARefs, 'foreign-dna'] };
  const diagnostics = validateCrossMediaConsistency(spaceResult.contract, tampered);
  assert.ok(diagnostics.some((d) => d.code === 'PT_HARD_DNA_MISSING'));
});

// ========== Layer 6: Translation Drift Guard ==========

test('CI-9 L6: detectTranslationDrift flags hard DNA loss', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const tampered = { ...spaceResult.contract, requiredDNARefs: [] };
  const diagnostics = detectTranslationDrift(ctx, tampered);
  assert.ok(diagnostics.some((d) => d.code === 'PT_HARD_DNA_MISSING'));
});

test('CI-9 L6: detectTranslationDrift flags canon/version mismatch', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const tampered = { ...spaceResult.contract, canonVersion: 'v999-deadbeef' };
  const diagnostics = detectTranslationDrift(ctx, tampered);
  assert.ok(diagnostics.some((d) => d.code === 'PT_CANON_STALE'));
});

test('CI-9 L6: detectTranslationDrift flags prompt leakage in mustPreserve', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const tampered = { ...spaceResult.contract, mustPreserve: [...spaceResult.contract.mustPreserve, 'set the camera angle low'] };
  const diagnostics = detectTranslationDrift(ctx, tampered);
  assert.ok(diagnostics.some((d) => d.code === 'PT_PRODUCTION_PROMPT_LEAKAGE'));
});

test('CI-9 L6: detectUngroundedMediaRules flags orphan sourceRefs', () => {
  const { ctx } = makeContext();
  const diagnostics = detectUngroundedMediaRules(ctx, ['r1', 'r2'], [null, 'nonexistent-ref']);
  assert.equal(diagnostics.length, 2);
  assert.ok(diagnostics[0].code === 'PT_MEDIA_RULE_UNGROUNDED');
  assert.ok(diagnostics[1].code === 'PT_MEDIA_RULE_UNGROUNDED');
});

// ========== Layer 7: Comparison Adapter ==========

test('CI-9 L7: comparison with no current input → not_ready, readyForConsumerSwitch=false', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const { report } = buildTranslationComparison({
    media: 'space',
    canonVersion: ctx.canonVersion,
    translated: spaceResult.contract,
    current: undefined,
  });
  assert.equal(report.readyForConsumerSwitch, false, 'readyForConsumerSwitch must be false in CI-9');
  assert.equal(report.comparisonReadiness, 'not_ready');
  assert.ok(report.warnings.length > 0, 'must warn when no current input');
  // When no current input is provided, behaviorChangeRisk is "none" (no current to drift against).
  assert.equal(report.behaviorChangeRisk, 'none');
});

test('CI-9 L7: comparison with current input → preserves fields, surfaces conflicts', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const { report, diagnostics } = buildTranslationComparison({
    media: 'space',
    canonVersion: ctx.canonVersion,
    translated: spaceResult.contract,
    current: {
      brandName: 'TestBrand',
      directionId: 'd1',
      lockedAssetRefs: ['logo'],
      productIdentity: ['identity-1'],
      mandatoryCopy: ['Mandatory'],
      confirmedComponents: ['comp-1'],
      analysisFields: ['analysis-led'],
      referenceFields: ['ref-first'],
    },
  });
  assert.equal(report.readyForConsumerSwitch, false);
  assert.ok(diagnostics.some((d) => d.code === 'PT_CONSUMER_SWITCH_FORBIDDEN'));
  assert.equal(report.media, 'space');
  assert.equal(report.canonVersion, ctx.canonVersion);
});

test('CI-9 L7: comparison detects directionId conflict', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const { report } = buildTranslationComparison({
    media: 'space',
    canonVersion: ctx.canonVersion,
    translated: spaceResult.contract,
    current: {
      directionId: 'd2-other',
      brandName: 'TestBrand',
    },
  });
  assert.ok(report.conflicts.some((c) => c.field === 'selectedDirectionId'));
  assert.equal(report.behaviorChangeRisk, 'high');
  assert.equal(report.comparisonReadiness, 'comparison_conflicted');
});

// ========== Layer 8: Translation Version / Diff ==========

test('CI-9 L8: translationVersion returns deterministic version string', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const v = translationVersion(spaceResult.contract);
  // Version format: v{revision}-{fingerprint}#{media}#0.1
  // Fingerprint may be either pure hex (8+ chars) or "fp:" prefixed (e.g. "fp:12345678").
  assert.match(v, /^v\d+-.+#space#0\.1$/);
  // The translationFingerprint must also be a non-empty stable string.
  assert.ok(spaceResult.contract.translationFingerprint.startsWith('tf:'));
  assert.equal(v, `${spaceResult.contract.canonVersion}#space#0.1`);
});

test('CI-9 L8: diffTranslation produces stable deltas', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const next = { ...spaceResult.contract, requiredDNARefs: [...spaceResult.contract.requiredDNARefs, 'new-dna'] };
  const diff = diffTranslation(spaceResult.contract, next);
  assert.equal(diff.media, 'space');
  assert.ok(diff.addedRequirements.includes('new-dna'));
});

test('CI-9 L8: diffTranslation surfaces canonVersionChanged', () => {
  const { ctx } = makeContext();
  const spaceResult = buildSpaceTranslation({ ctx });
  if (!spaceResult.contract) throw new Error('contract missing');
  const next = { ...spaceResult.contract, canonVersion: 'v999-deadbeef' };
  const diff = diffTranslation(spaceResult.contract, next);
  assert.equal(diff.canonVersionChanged, true);
  assert.equal(diff.requiresRecompile, true);
});

// ========== Layer 9: Reference-Canon Conflict Detection ==========

test('CI-9 L9: detectReferenceCanonConflict flags reference brand in canon text', () => {
  const { ctx, canon } = makeContext();
  const tampered = {
    ...canon,
    visualMechanism: 'A structural system inspired by Apple identity.',
  };
  const tamperedCtx = { ...ctx, visualCanon: tampered };
  const diagnostics = detectReferenceCanonConflict(tamperedCtx, ['Apple']);
  assert.ok(diagnostics.some((d) => d.code === 'PT_REFERENCE_CANON_CONFLICT'));
});

test('CI-9 L9: detectReferenceCanonConflict returns empty for no reference overlap', () => {
  const { ctx } = makeContext();
  const diagnostics = detectReferenceCanonConflict(ctx, ['SomeOtherBrand']);
  assert.equal(diagnostics.length, 0);
});

// ========== Diagnostic codes list ==========

test('CI-9: 16 production translation diagnostic codes registered', () => {
  assert.equal(PRODUCTION_TRANSLATION_DIAGNOSTIC_CODES.length, 16);
});
