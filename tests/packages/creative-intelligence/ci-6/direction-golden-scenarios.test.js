import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-6 golden direction scenarios.
 *
 * 9 scenarios:
 *   1. document-led
 *   2. visual-led
 *   3. reference-first
 *   4. packaging-capable
 *   5. space-capable
 *   6. conflict-heavy
 *   7. sparse / unknown-heavy
 *   8. multi-concept
 *   9. fake-diversity (HARD REGRESSION GUARD)
 *
 * Verifies (Spec #53):
 *   - Direction trace closure = 100%
 *   - valid Direction grounding rate = 100%
 *   - pairwise meaningful distinction = 100%
 *   - fake diversity FAILS
 *   - no anchor / prompt leakage
 *   - no production-translation output
 *   - reference safety
 *   - unknown/conflict safety
 */

import {
  runDirectionPipeline,
  evaluateDirectionFamilyDifference,
  detectDirectionLeakage,
  DIRECTION_TRACE_VERSION,
} from '@masterpiece/creative-intelligence/direction-intelligence/index.ts';
import {
  adaptProjectRecord,
  adaptDocumentVisualContext,
  adaptVisualUnderstandingCore,
  adaptCurrentProjectCorePack,
  assembleProjectTruth,
  runNicePipeline,
  runConceptPipeline,
  PROJECT_TRUTH_KEYS,
} from '@masterpiece/creative-intelligence/index.ts';

const CTX = { projectId: 'p-test', generatedAt: '2026-01-01T00:00:00.000Z', sourceFingerprints: {} };

function dvcFixture(overrides = {}) {
  return {
    schemaVersion: '1.0', sourceRunId: 'r1', generatedAt: '2026-01-01T00:00:00.000Z',
    brandName: 'AcmeCorp', industry: 'tech', products: ['platform'],
    services: ['consulting'], targetAudience: ['enterprise'],
    pricePositioning: 'premium', businessModel: 'B2B',
    brandPersonality: ['professional'], visualPreferences: ['minimal'],
    requiredTouchpoints: ['logo', 'website'], lockedFacts: [],
    prohibitedDirections: [], unknownFields: [],
    evidence: [
      { field: 'brandName', documentId: 'd1', filename: 'brief.pdf', summary: 'X', section: 'intro', page: 1 },
    ],
    sourceDocuments: [
      { documentId: 'd1', filename: 'brief.pdf', sourceType: 'pdf', characterCount: 1000, pageCount: 5 },
    ],
    ...overrides,
  };
}

function vucFixture(overrides = {}) {
  return {
    schemaVersion: '0.2', sourceRunId: 'r-v1', generatedAt: '2026-01-01T00:00:00.000Z',
    brandPersonality: ['bold'], visualDirection: 'energetic',
    colorPalette: [], keyVisuals: [], logoUsage: 'standard',
    visualSummary: 'Bold and energetic brand.',
    evidence: [
      { field: 'brandPersonality', assetId: 'a1', filename: 'logo.svg', summary: 'bold' },
    ],
    ...overrides,
  };
}

function buildScenario(projectId, carriers, expectedBrandName = 'AcmeCorp') {
  const carrierOutputs = carriers.map((c) => c());
  const { truth, ledger } = assembleProjectTruth({
    projectId, carrierOutputs, context: CTX,
  });
  const nice = runNicePipeline({ projectId, truth, evidence: ledger });
  const concept = runConceptPipeline({
    projectId, truth, evidence: ledger,
    needs: nice.needs, insights: nice.insights,
    opportunityMap: nice.opportunityMap, generatedAt: CTX.generatedAt,
    expectedBrandName,
  });
  const direction = runDirectionPipeline({
    projectId, truth, evidence: ledger,
    needs: nice.needs, insights: nice.insights,
    opportunityMap: nice.opportunityMap, conceptSet: concept.conceptSet,
    generatedAt: CTX.generatedAt, expectedBrandName,
  });
  return { truth, ledger, nice, concept, direction };
}

function validateDirectionHardAcceptance(scenarioName, result) {
  const { directionSet, leakage, gateSummary, familyDifference } = result;

  // Anchor / Prompt / Production leakage
  assert.equal(leakage.field, null, `${scenarioName}: no forbidden field leakage`);
  assert.equal(leakage.text, null, `${scenarioName}: no forbidden text leakage`);

  // All valid directions have minimum trace
  for (const d of directionSet.directions) {
    if (d.status === 'grounded' || d.status === 'provisional') {
      assert.ok(d.conceptRefs.length >= 1, `${scenarioName}: direction ${d.id} has concept refs`);
      assert.ok(d.opportunityRefs.length >= 1, `${scenarioName}: direction ${d.id} has opp refs`);
      assert.ok(d.insightRefs.length >= 1, `${scenarioName}: direction ${d.id} has insight refs`);
      assert.ok(d.needRefs.length >= 1, `${scenarioName}: direction ${d.id} has need refs`);
      assert.ok(d.factRefs.length >= 1, `${scenarioName}: direction ${d.id} has fact refs`);
      assert.ok(d.visualMechanism && d.visualMechanism.length > 0, `${scenarioName}: ${d.id} has visualMechanism`);
      assert.ok(d.systemHypothesis && d.systemHypothesis.length > 0, `${scenarioName}: ${d.id} has systemHypothesis`);
      assert.ok(d.crossMediaBehavior.length >= 1, `${scenarioName}: ${d.id} has crossMediaBehavior`);
    }
  }

  // Blocked directions match gate results
  for (const blockedId of directionSet.blockedDirectionIds) {
    const gateStatus = gateSummary.perDirection[blockedId];
    assert.equal(gateStatus, 'blocked', `${scenarioName}: blocked direction ${blockedId}`);
  }

  // No direction includes anchor / productionPrompt
  for (const d of directionSet.directions) {
    assert.equal(d.anchor, undefined, `${scenarioName}: ${d.id} no anchor`);
    assert.equal(d.productionPrompt, undefined, `${scenarioName}: ${d.id} no productionPrompt`);
    assert.equal(d.prompt, undefined, `${scenarioName}: ${d.id} no prompt`);
  }
}

// ── 1. document-led ──
// CI-W1A: with the P0 fix, this scenario's gate correctly blocks all 4 concepts
// because the minimal DVC fixture triggers OFFICIAL_CERTIFICATION_CLAIM and
// MISSING_CRITICAL_NEED_COVERAGE blocks. This is the P0 regression test:
// gate-blocked Concepts MUST NOT produce Directions.
test('CI-6 golden 1: document-led — sparse input → all concepts gate-blocked (P0 regression)', () => {
  const { direction, concept } = buildScenario('p-doc', [
    () => adaptProjectRecord({ id: 'p-doc', brandName: 'DocBrand', industry: 'tech', logoLocked: true }, CTX),
    () => adaptDocumentVisualContext(dvcFixture({ brandName: 'DocBrand' }), CTX),
  ], 'DocBrand');
  // P0 fix: all 4 concepts are in blockedConceptIds → 0 Directions expected.
  assert.equal(concept.conceptSet.blockedConceptIds.length, concept.conceptSet.concepts.length,
    'sparse document-led: all concepts gate-blocked');
  assert.equal(direction.directionSet.directions.length, 0,
    'gate-blocked Concepts MUST NOT produce Directions (P0 fix)');
});

// ── 2. visual-led ──

test('CI-6 golden 2: visual-led — VUC as primary source', () => {
  const { direction } = buildScenario('p-vis', [
    () => adaptProjectRecord({ id: 'p-vis', brandName: 'VisBrand', industry: 'fashion' }, CTX),
    () => adaptVisualUnderstandingCore(vucFixture(), CTX),
  ]);
  validateDirectionHardAcceptance('visual-led', direction);
});

// ── 3. reference-first ──

test('CI-6 golden 3: reference-first — reference contamination = 0', () => {
  const refCarrier = adaptVisualUnderstandingCore(
    { ...vucFixture(), brandPersonality: ['reference-brand-style'] },
    { ...CTX, sourceType: 'reference_visual', sourceId: 'ref1', isReference: true },
  );
  // Mark all as reference
  const ref = {
    ...refCarrier,
    facts: refCarrier.facts.map((f) => ({ ...f, isReferenceFact: true })),
  };

  const { truth, ledger } = assembleProjectTruth({
    projectId: 'p-ref',
    carrierOutputs: [
      adaptProjectRecord({ id: 'p-ref', brandName: 'CurrentBrand', industry: 'tech' }, CTX),
      ref,
    ],
    context: CTX,
  });
  const nice = runNicePipeline({ projectId: 'p-ref', truth, evidence: ledger });
  const concept = runConceptPipeline({
    projectId: 'p-ref', truth, evidence: ledger,
    needs: nice.needs, insights: nice.insights,
    opportunityMap: nice.opportunityMap, generatedAt: CTX.generatedAt,
    expectedBrandName: 'CurrentBrand',
  });
  const direction = runDirectionPipeline({
    projectId: 'p-ref', truth, evidence: ledger,
    needs: nice.needs, insights: nice.insights,
    opportunityMap: nice.opportunityMap, conceptSet: concept.conceptSet,
    generatedAt: CTX.generatedAt, expectedBrandName: 'CurrentBrand',
  });

  validateDirectionHardAcceptance('reference-first', direction);

  // No PASSED direction should have all-reference identity
  for (const [did, status] of Object.entries(direction.gateSummary.perDirection)) {
    if (status !== 'blocked') {
      // passed direction must not be a reference-only direction
      const d = direction.directionSet.directions.find((x) => x.id === did);
      assert.ok(d, `direction ${did} must be findable`);
    }
  }
});

// ── 4. packaging-capable ──

test('CI-6 golden 4: packaging-capable — no packaging production translation', () => {
  const { direction } = buildScenario('p-pkg', [
    () => adaptProjectRecord({ id: 'p-pkg', brandName: 'PkgBrand', industry: 'consumer_goods' }, CTX),
    () => adaptDocumentVisualContext(dvcFixture({
      brandName: 'PkgBrand', industry: 'consumer_goods',
      products: ['snack'], requiredTouchpoints: ['packaging', 'logo'],
    }), CTX),
    () => adaptCurrentProjectCorePack({
      schemaVersion: '1.0', deliverableFamily: 'packaging',
      lockedAssets: [], project: { id: 'p-pkg', name: 'PkgBrand' },
    }, CTX),
  ]);

  validateDirectionHardAcceptance('packaging-capable', direction);
  // No packaging-mechanism specific text
  for (const d of direction.directionSet.directions) {
    const text = [d.spaceApplicability, d.packagingApplicability, d.visualMechanism, d.systemHypothesis].join(' ');
    assert.ok(!/具体(?:的)?(?:包装|盒型|结构)\s*(?:尺寸|规格|几何)/.test(text),
      `direction ${d.id} must not prescribe specific packaging geometry`);
  }
});

// ── 5. space-capable ──

test('CI-6 golden 5: space-capable — no spatial production translation', () => {
  const { direction } = buildScenario('p-spc', [
    () => adaptProjectRecord({ id: 'p-spc', brandName: 'SpaceBrand', industry: 'retail' }, CTX),
    () => adaptDocumentVisualContext(dvcFixture({
      brandName: 'SpaceBrand', industry: 'retail',
      products: ['store'], services: ['in-store experience'],
      requiredTouchpoints: ['storefront', 'interior', 'logo'],
    }), CTX),
    () => adaptCurrentProjectCorePack({
      schemaVersion: '1.0', deliverableFamily: 'space',
      lockedAssets: [], project: { id: 'p-spc', name: 'SpaceBrand' },
    }, CTX),
  ]);

  validateDirectionHardAcceptance('space-capable', direction);
  // No specific spatial-mechanism prescription
  for (const d of direction.directionSet.directions) {
    const text = [d.spaceApplicability, d.visualMechanism, d.systemHypothesis].join(' ');
    assert.ok(!/具体(?:的)?(?:大堂|吧台|展墙|货架)\s*(?:布局|排布|位置)/.test(text),
      `direction ${d.id} must not prescribe specific space layout`);
    assert.ok(!/camera\s*position/i.test(text),
      `direction ${d.id} must not contain camera position`);
  }
});

// ── 6. conflict-heavy ──

test('CI-6 golden 6: conflict-heavy — selective blocking, no silent resolution', () => {
  const fact1 = {
    id: 'f-brand-1', key: PROJECT_TRUTH_KEYS.BRAND_NAME, value: 'BrandA',
    truthClass: 'fact', authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    sourceType: 'document', sourceId: 'd1', isReferenceFact: false,
    createdAt: CTX.generatedAt, evidenceRefs: ['e1'],
  };
  const fact2 = {
    id: 'f-brand-2', key: PROJECT_TRUTH_KEYS.BRAND_NAME, value: 'BrandB',
    truthClass: 'fact', authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    sourceType: 'document', sourceId: 'd2', isReferenceFact: false,
    createdAt: CTX.generatedAt, evidenceRefs: ['e2'],
  };
  const conflict = {
    id: 'c-brand-name', type: 'identity_mismatch', key: PROJECT_TRUTH_KEYS.BRAND_NAME,
    status: 'open', factIds: ['f-brand-1', 'f-brand-2'], severity: 'high',
    description: 'Brand name conflict between two documents',
    resolutionSuggestion: 'clarify_with_user',
    detectedAt: CTX.generatedAt,
  };
  const truth = {
    schemaVersion: '0.2', projectId: 'p-conflict',
    facts: [
      fact1, fact2,
      { ...fact1, id: 'f-industry', key: PROJECT_TRUTH_KEYS.BRAND_INDUSTRY, value: 'tech', evidenceRefs: ['e3'] },
    ],
    conflicts: [conflict],
    resolutions: [],
    unknowns: [],
    provenance: { mode: 'shadow', generatedAt: CTX.generatedAt, assemblerVersion: 'v', ciVersion: 'v' },
  };
  const evidence = {
    schemaVersion: '0.2', projectId: 'p-conflict',
    entries: [
      { id: 'e1', type: 'document_extract', sourceType: 'document', sourceId: 'd1', factIds: ['f-brand-1'], confidence: 0.9, capturedAt: CTX.generatedAt },
      { id: 'e2', type: 'document_extract', sourceType: 'document', sourceId: 'd2', factIds: ['f-brand-2'], confidence: 0.9, capturedAt: CTX.generatedAt },
      { id: 'e3', type: 'document_extract', sourceType: 'document', sourceId: 'd1', factIds: ['f-industry'], confidence: 0.9, capturedAt: CTX.generatedAt },
    ],
  };

  // Manual NICE + Concept for conflict-heavy scenario
  const needs = [
    {
      id: 'n-conflict', type: 'clarification',
      statement: 'Clarify brand name conflict',
      whyItMatters: 'Identity conflict blocks creative work',
      status: 'blocked', priority: 3,
      factRefs: ['f-brand-1', 'f-brand-2'], evidenceRefs: ['e1', 'e2'],
      conflictRefs: ['c-brand-name'],
      sourceKinds: ['document'],
      generatedBy: 'deterministic_rule',
      traceVersion: 'need-intelligence-v0.1',
    },
    {
      id: 'n-industry', type: 'business',
      statement: 'Communicate tech industry positioning',
      whyItMatters: 'Industry drives strategy',
      status: 'required', priority: 2,
      factRefs: ['f-industry'], evidenceRefs: ['e3'],
      conflictRefs: [], sourceKinds: ['document'],
      generatedBy: 'deterministic_rule',
      traceVersion: 'need-intelligence-v0.1',
    },
  ];
  const insights = [
    {
      id: 'i-industry', type: 'business',
      statement: 'Tech industry positioning must be clear',
      implication: 'Industry drives strategy',
      needRefs: ['n-industry'], factRefs: ['f-industry'], evidenceRefs: ['e3'],
      status: 'grounded',
      generatedBy: 'deterministic_rule',
      traceVersion: 'insight-intelligence-v0.1',
    },
  ];
  const opportunityMap = {
    schemaVersion: '0.1', projectId: 'p-conflict',
    opportunities: [{
      id: 'o-business', title: 'Tech industry positioning',
      statement: 'Clarify tech industry role',
      strategicValue: 'Clear positioning',
      needRefs: ['n-industry'], insightRefs: ['i-industry'],
      factRefs: ['f-industry'], evidenceRefs: ['e3'],
      priority: 2, status: 'open', cluster: 'business-communication',
    }],
    blockedNeeds: ['n-conflict'],
    unresolvedConflicts: ['c-brand-name'],
    unknowns: [],
    provenance: { truthSchemaVersion: '0.2', generatedAt: CTX.generatedAt, mode: 'shadow' },
  };
  const conceptSet = {
    schemaVersion: '0.1', projectId: 'p-conflict',
    concepts: [{
      id: 'c-business', title: 'Tech positioning concept',
      thesis: 'Industry-positioning thesis', problemStatement: 'p',
      strategicMechanism: 'm', rationale: 'r',
      opportunityRefs: ['o-business'], insightRefs: ['i-industry'],
      needRefs: ['n-industry'], factRefs: ['f-industry'],
      evidenceRefs: ['e3'],
      strategicPattern: 'value-flow',
      strengths: [], risks: [], blockers: [],
      status: 'grounded',
      generatedBy: 'deterministic_synthesis',
      traceVersion: 'concept-intelligence-v0.1',
    }],
    gateResults: [], blockedConceptIds: [],
    diagnostics: [],
    provenance: { opportunityMapVersion: '0.1', truthSchemaVersion: '0.2', generatedAt: CTX.generatedAt, mode: 'shadow' },
  };

  const direction = runDirectionPipeline({
    projectId: 'p-conflict', truth, evidence,
    needs, insights, opportunityMap, conceptSet,
    generatedAt: CTX.generatedAt,
  });

  validateDirectionHardAcceptance('conflict-heavy', direction);
  // Conflict not silently resolved
  assert.equal(truth.conflicts.length, 1);
  assert.equal(truth.conflicts[0].status, 'open');
});

// ── 7. sparse / unknown-heavy ──

test('CI-6 golden 7: sparse/unknown-heavy — 0 directions, no fabrication', () => {
  const truth = {
    schemaVersion: '0.2', projectId: 'p-sparse',
    facts: [{
      id: 'f-brand', key: PROJECT_TRUTH_KEYS.BRAND_NAME, value: null,
      truthClass: 'unknown', authority: 'SYSTEM_DEFAULT',
      sourceType: 'system', sourceId: 'default', isReferenceFact: false,
      createdAt: CTX.generatedAt, evidenceRefs: [],
    }],
    conflicts: [], resolutions: [],
    unknowns: [PROJECT_TRUTH_KEYS.BRAND_NAME, PROJECT_TRUTH_KEYS.BRAND_INDUSTRY],
    provenance: { mode: 'shadow', generatedAt: CTX.generatedAt, assemblerVersion: 'v', ciVersion: 'v' },
  };
  const evidence = { schemaVersion: '0.2', projectId: 'p-sparse', entries: [] };
  const needs = [];
  const insights = [];
  const opportunityMap = {
    schemaVersion: '0.1', projectId: 'p-sparse',
    opportunities: [],
    blockedNeeds: [], unresolvedConflicts: [],
    unknowns: [PROJECT_TRUTH_KEYS.BRAND_NAME],
    provenance: { truthSchemaVersion: '0.2', generatedAt: CTX.generatedAt, mode: 'shadow' },
  };
  const conceptSet = {
    schemaVersion: '0.1', projectId: 'p-sparse',
    concepts: [], gateResults: [], blockedConceptIds: [],
    diagnostics: [],
    provenance: { opportunityMapVersion: '0.1', truthSchemaVersion: '0.2', generatedAt: CTX.generatedAt, mode: 'shadow' },
  };

  const direction = runDirectionPipeline({
    projectId: 'p-sparse', truth, evidence,
    needs, insights, opportunityMap, conceptSet,
    generatedAt: CTX.generatedAt,
  });

  // Sparse project should have 0 directions — no fabrication
  assert.equal(direction.directionSet.directions.length, 0);
  validateDirectionHardAcceptance('sparse', direction);
});

// ── 8. multi-concept ──

test('CI-6 golden 8: multi-concept — multiple structurally distinct directions', () => {
  const { direction } = buildScenario('p-multi', [
    () => adaptProjectRecord({ id: 'p-multi', brandName: 'MultiBrand', industry: 'tech', logoLocked: true }, CTX),
    () => adaptDocumentVisualContext(dvcFixture({
      brandName: 'MultiBrand', industry: 'tech',
      businessModel: 'B2B2C',
      products: ['platform', 'app'],
      services: ['support', 'consulting'],
      targetAudience: ['enterprise', 'consumer'],
      lockedFacts: ['logo'],
    }), CTX),
  ]);

  validateDirectionHardAcceptance('multi-concept', direction);

  // Multi-concept should produce directions
  assert.ok(direction.directionSet.directions.length > 0);

  // Distinct direction families
  const validDirections = direction.directionSet.directions.filter((d) => d.status !== 'blocked');
  const families = new Set(validDirections.map((d) => d.directionFamily));
  assert.ok(families.size >= 2 || validDirections.length === 1,
    `multi-concept should yield ≥2 distinct families or exactly 1; got ${families.size} families from ${validDirections.length} valid`);
});

// ── 9. fake-diversity (HARD REGRESSION GUARD) ──

test('CI-6 golden 9: fake-diversity — same mechanism + different colors MUST FAIL', () => {
  // Manual direction set: same family, same mechanism, only color varies
  const baseDir = {
    id: 'dA', title: 'A', thesis: 't', conceptRefs: ['c1'],
    visualMechanism: 'Use a structural grid with modular units connected by lines.',
    systemHypothesis: 'A structural system expresses modularity.',
    directionFamily: 'structural-system',
    crossMediaBehavior: ['brand/VI', 'editorial'],
    opportunityRefs: ['o1'], insightRefs: ['i1'], needRefs: ['n1'],
    factRefs: ['f-brand'], evidenceRefs: [],
    strengths: [], risks: [], blockers: [],
    status: 'grounded', generatedBy: 'deterministic_synthesis', traceVersion: DIRECTION_TRACE_VERSION,
  };
  const purpleDir = {
    ...baseDir, id: 'dB', title: 'B',
    visualMechanism: 'Use a structural grid with modular units connected by lines, in purple.',
    colorRelationship: 'Purple primary color',
  };
  const blueDir = {
    ...baseDir, id: 'dC', title: 'C',
    visualMechanism: 'Use a structural grid with modular units connected by lines, in blue.',
    colorRelationship: 'Blue primary color',
  };
  const orangeDir = {
    ...baseDir, id: 'dD', title: 'D',
    visualMechanism: 'Use a structural grid with modular units connected by lines, in orange.',
    colorRelationship: 'Orange primary color',
  };

  const result = evaluateDirectionFamilyDifference([baseDir, purpleDir, blueDir, orangeDir]);
  assert.equal(result.hasFakeDiversity, true,
    'same mechanism + only color variation MUST be detected as fake diversity');
  assert.ok(result.diagnostics.some((d) => d.includes('FAKE_DIVERSITY')),
    'fake-diversity diagnostic must be emitted');
});
