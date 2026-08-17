import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-6 Direction Intelligence — contracts + unit tests.
 *
 * Layer 1: Direction contract tests
 * Layer 2: deterministic synthesis tests
 * Layer 3: trace closure tests
 * Layer 4: family difference tests
 * Layer 5: Direction Gate tests
 * Layer 6: Anchor/prompt leakage tests
 */

import {
  generateDirections,
  validateDirectionTrace,
  buildDirectionTransitiveTrace,
  evaluateDirectionFamilyDifference,
  dedupeDirections,
  runDirectionGates,
  runDirectionGatesForSet,
  detectDirectionLeakage,
  runDirectionPipeline,
  DIRECTION_TRACE_VERSION,
} from '@masterpiece/creative-intelligence/direction-intelligence/index.ts';
import { PROJECT_TRUTH_KEYS } from '@masterpiece/creative-intelligence/truth/key-registry.ts';

// ========== Fixtures ==========

function makeFact(id, key, value, overrides = {}) {
  return {
    id,
    key,
    value,
    truthClass: 'fact',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    sourceType: 'document',
    sourceId: 'd1',
    isReferenceFact: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    evidenceRefs: [`ev-${id}`],
    ...overrides,
  };
}

function makeEvidence(id, factIds) {
  return {
    id,
    type: 'document_extract',
    sourceType: 'document',
    sourceId: 'd1',
    factIds,
    confidence: 0.9,
    capturedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeConcept(id, overrides = {}) {
  return {
    id,
    title: `Concept ${id}`,
    thesis: 'Brand identity is central to the system',
    problemStatement: 'Brand needs clearer articulation',
    strategicMechanism: 'Identity-first creative system',
    rationale: 'Identity is the most stable creative asset',
    opportunityRefs: ['o1'],
    insightRefs: ['i1'],
    needRefs: ['n1', 'n2'],
    factRefs: ['f-brand', 'f-role'],
    evidenceRefs: ['ev-f-brand', 'ev-f-role'],
    strategicPattern: 'identity-preservation',
    strengths: ['Strong identity'],
    risks: ['May be too conservative'],
    blockers: [],
    status: 'grounded',
    generatedBy: 'deterministic_synthesis',
    traceVersion: 'concept-intelligence-v0.1',
    ...overrides,
  };
}

function makeNeed(id, type, statement, overrides = {}) {
  return {
    id,
    type,
    statement,
    whyItMatters: 'test',
    status: 'required',
    priority: 3,
    factRefs: ['f-brand'],
    evidenceRefs: ['ev-f-brand'],
    conflictRefs: [],
    sourceKinds: ['document'],
    generatedBy: 'deterministic_rule',
    traceVersion: 'need-intelligence-v0.1',
    ...overrides,
  };
}

function makeInsight(id, type, statement, overrides = {}) {
  return {
    id,
    type,
    statement,
    implication: 'test',
    needRefs: ['n1'],
    factRefs: ['f-brand'],
    evidenceRefs: ['ev-f-brand'],
    status: 'grounded',
    generatedBy: 'deterministic_rule',
    traceVersion: 'insight-intelligence-v0.1',
    ...overrides,
  };
}

function makeOpportunity(id, cluster, overrides = {}) {
  return {
    id,
    title: `Opp ${id}`,
    statement: `Statement ${id}`,
    strategicValue: `Value ${id}`,
    needRefs: ['n1', 'n2'],
    insightRefs: ['i1'],
    factRefs: ['f-brand', 'f-role'],
    evidenceRefs: ['ev-f-brand'],
    priority: 3,
    status: 'open',
    cluster,
    ...overrides,
  };
}

const BASE_FACTS = [
  makeFact('f-brand', PROJECT_TRUTH_KEYS.BRAND_NAME, 'TestBrand'),
  makeFact('f-role', PROJECT_TRUTH_KEYS.BRAND_ROLE, 'platform'),
  makeFact('f-industry', PROJECT_TRUTH_KEYS.BRAND_INDUSTRY, 'tech'),
];

const BASE_EVIDENCE = [
  makeEvidence('ev-f-brand', ['f-brand']),
  makeEvidence('ev-f-role', ['f-role']),
  makeEvidence('ev-f-industry', ['f-industry']),
];

const BASE_NEEDS = [
  makeNeed('n1', 'identity', 'Preserve brand identity'),
  makeNeed('n2', 'business', 'Communicate business value', { factRefs: ['f-role'] }),
];

const BASE_INSIGHTS = [
  makeInsight('i1', 'identity', 'Brand identity central', { needRefs: ['n1'], factRefs: ['f-brand'] }),
  makeInsight('i2', 'business', 'Platform role clear', { needRefs: ['n2'], factRefs: ['f-role'] }),
];

const BASE_OPPS = [
  makeOpportunity('o1', 'identity-preservation'),
];

function makeOpportunityMap(extra = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'p-test',
    opportunities: [...BASE_OPPS, ...((extra && extra.opportunities) || [])],
    blockedNeeds: [],
    unresolvedConflicts: [],
    unknowns: [],
    provenance: {
      truthSchemaVersion: '0.2',
      generatedAt: '2026-01-01T00:00:00.000Z',
      mode: 'shadow',
    },
  };
}

function makeConceptSet(concepts, extra = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'p-test',
    concepts,
    gateResults: [],
    blockedConceptIds: [],
    diagnostics: [],
    provenance: {
      opportunityMapVersion: '0.1',
      truthSchemaVersion: '0.2',
      generatedAt: '2026-01-01T00:00:00.000Z',
      mode: 'shadow',
    },
    ...extra,
  };
}

// ========== Layer 1: Contract ==========

test('CI-6 L1: CreativeDirectionCandidate has required fields', () => {
  const { directions } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c1')],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
  });
  assert.ok(directions.length > 0, 'should generate at least 1 direction');
  const d = directions[0];
  for (const field of ['id', 'title', 'thesis', 'visualMechanism', 'systemHypothesis',
    'directionFamily', 'crossMediaBehavior', 'conceptRefs', 'opportunityRefs',
    'insightRefs', 'needRefs', 'factRefs', 'evidenceRefs', 'strengths', 'risks',
    'blockers', 'status', 'generatedBy', 'traceVersion']) {
    assert.ok(d[field] !== undefined, `Direction must have field: ${field}`);
  }
  assert.equal(d.traceVersion, DIRECTION_TRACE_VERSION);
  assert.ok(['grounded', 'provisional', 'blocked'].includes(d.status));
});

test('CI-6 L1: DirectionFamily is one of 8 system-logic families', () => {
  const { directions } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c1')],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
  });
  const validFamilies = [
    'structural-system', 'relational-network', 'narrative-sequence',
    'symbolic-abstraction', 'material-expression', 'editorial-system',
    'modular-identity', 'spatial-extension',
  ];
  for (const d of directions) {
    assert.ok(validFamilies.includes(d.directionFamily),
      `directionFamily must be one of 8 system families, got ${d.directionFamily}`);
  }
});

test('CI-6 L1: no anchor / productionPrompt field exists in output', () => {
  const { directions } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c1')],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
  });
  for (const d of directions) {
    assert.equal(d.anchor, undefined);
    assert.equal(d.anchorImage, undefined);
    assert.equal(d.anchorCandidate, undefined);
    assert.equal(d.anchorPrompt, undefined);
    assert.equal(d.prompt, undefined);
    assert.equal(d.productionPrompt, undefined);
    assert.equal(d.generationPrompt, undefined);
    assert.equal(d.selectedDirection, undefined);
  }
});

// ========== Layer 2: Deterministic synthesis ==========

test('CI-6 L2: Concept-led generation (no raw document bypass)', () => {
  const { directions, diagnostics } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c1')],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
  });
  assert.ok(directions.length > 0);
  for (const d of directions) {
    assert.ok(d.conceptRefs.length >= 1, 'every direction must reference a concept');
  }
  assert.equal(diagnostics.length, 0);
});

test('CI-6 L2: status propagation — blocked Concept produces no Direction', () => {
  const { directions, diagnostics } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c-blocked', { status: 'blocked' })],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
  });
  assert.equal(directions.length, 0);
  assert.ok(diagnostics.some((d) => d.includes('NO_ELIGIBLE_CONCEPTS')));
});

test('CI-6 L2: status propagation — provisional Concept produces provisional Direction', () => {
  const { directions } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c-provisional', { status: 'provisional' })],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
  });
  for (const d of directions) {
    assert.equal(d.status, 'provisional', 'provisional concept must produce provisional direction');
  }
});

test('CI-6 L2: respects maxPerConcept bound', () => {
  const { directions } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c1')],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
    maxDirections: 10,
    maxPerConcept: 1,
  });
  const fromC1 = directions.filter((d) => d.conceptRefs.includes('c1'));
  assert.ok(fromC1.length <= 1, `expected ≤1 direction per concept, got ${fromC1.length}`);
});

test('CI-6 L2: 8 families all covered through different concepts', () => {
  const conceptsByFamily = [
    ['c1', 'identity-preservation'],
    ['c2', 'system-reframing'],
    ['c3', 'value-flow'],
    ['c4', 'asset-activation'],
    ['c5', 'risk-inversion'],
    ['c6', 'clarity-through-structure'],
    ['c7', 'relationship-as-value'],
    ['c8', 'cross-media-unification'],
  ].map(([id, pattern]) => makeConcept(id, { strategicPattern: pattern }));

  const familiesSeen = new Set();
  for (const c of conceptsByFamily) {
    const { directions } = generateDirections({
      projectId: 'p1',
      concepts: [c],
      opportunityMap: makeOpportunityMap(),
      insights: BASE_INSIGHTS,
      needs: BASE_NEEDS,
      facts: BASE_FACTS,
      evidence: BASE_EVIDENCE,
      maxDirections: 2,
    });
    for (const d of directions) familiesSeen.add(d.directionFamily);
  }
  assert.ok(familiesSeen.size >= 6, `expected ≥6 distinct families, got ${familiesSeen.size}`);
});

// ========== Layer 3: Trace validation ==========

test('CI-6 L3: valid direction passes trace validation', () => {
  const { directions } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c1')],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
  });
  const result = validateDirectionTrace({
    directions,
    concepts: [makeConcept('c1')],
    opportunities: BASE_OPPS,
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
  });
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.equal(result.fullyGrounded, directions.length);
});

test('CI-6 L3: dangling concept ref detected', () => {
  const badDir = {
    id: 'd-bad', title: 'Bad', thesis: 't', conceptRefs: ['c-nonexistent'],
    visualMechanism: 'm', systemHypothesis: 's', directionFamily: 'structural-system',
    crossMediaBehavior: ['brand/VI'],
    opportunityRefs: ['o1'], insightRefs: ['i1'], needRefs: ['n1'],
    factRefs: ['f-brand'], evidenceRefs: [],
    strengths: [], risks: [], blockers: [],
    status: 'grounded', generatedBy: 'deterministic_synthesis', traceVersion: DIRECTION_TRACE_VERSION,
  };
  const result = validateDirectionTrace({
    directions: [badDir],
    concepts: [makeConcept('c1')],
    opportunities: BASE_OPPS,
    insights: BASE_INSIGHTS, needs: BASE_NEEDS, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.code === 'DIRECTION_DANGLING_REF'));
});

test('CI-6 L3: transitive trace includes downstream objects', () => {
  const { directions } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c1')],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
    maxDirections: 1,
  });
  const trace = buildDirectionTransitiveTrace(directions[0], {
    directions,
    concepts: [makeConcept('c1')],
    opportunities: BASE_OPPS,
    insights: BASE_INSIGHTS, needs: BASE_NEEDS, facts: BASE_FACTS, evidence: BASE_EVIDENCE,
  });
  assert.ok(trace.conceptIds.size > 0);
  assert.ok(trace.factIds.size > 0);
  assert.ok(trace.needIds.size > 0);
});

// ========== Layer 4: Family difference ==========

test('CI-6 L4: fake-diversity fixture (same mechanism + different colors) FAILS', () => {
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
  const fakeColor = {
    ...baseDir,
    id: 'dB', title: 'B',
    visualMechanism: 'Use a structural grid with modular units connected by lines, in purple.',
    colorRelationship: 'Purple as primary color',
  };
  const fakeColor2 = {
    ...baseDir,
    id: 'dC', title: 'C',
    visualMechanism: 'Use a structural grid with modular units connected by lines, in blue.',
    colorRelationship: 'Blue as primary color',
  };
  const result = evaluateDirectionFamilyDifference([baseDir, fakeColor, fakeColor2]);
  assert.equal(result.hasFakeDiversity, true, 'fake-diversity should be detected');
  assert.ok(result.diagnostics.some((d) => d.includes('FAKE_DIVERSITY')));
});

test('CI-6 L4: structurally distinct directions are NOT fake diversity', () => {
  const dirA = {
    id: 'dA', title: 'A', thesis: 't', conceptRefs: ['c1'],
    visualMechanism: 'Use a distributed relationship grammar where independent units remain autonomous but connected.',
    systemHypothesis: 'Brand is expressed through how units connect.',
    directionFamily: 'relational-network',
    crossMediaBehavior: ['brand/VI', 'digital/UI'],
    opportunityRefs: ['o1'], insightRefs: ['i1'], needRefs: ['n1'],
    factRefs: ['f-brand'], evidenceRefs: [],
    strengths: [], risks: [], blockers: [],
    status: 'grounded', generatedBy: 'deterministic_synthesis', traceVersion: DIRECTION_TRACE_VERSION,
  };
  const dirB = {
    id: 'dB', title: 'B', thesis: 't', conceptRefs: ['c1'],
    visualMechanism: 'Value is expressed as a visible progression from participant to participant.',
    systemHypothesis: 'Brand is experienced as the organizer of a sequence.',
    directionFamily: 'narrative-sequence',
    crossMediaBehavior: ['editorial', 'campaign/poster'],
    opportunityRefs: ['o1'], insightRefs: ['i1'], needRefs: ['n1'],
    factRefs: ['f-brand'], evidenceRefs: [],
    strengths: [], risks: [], blockers: [],
    status: 'grounded', generatedBy: 'deterministic_synthesis', traceVersion: DIRECTION_TRACE_VERSION,
  };
  const result = evaluateDirectionFamilyDifference([dirA, dirB]);
  assert.equal(result.hasFakeDiversity, false);
  assert.equal(result.allMeaningfullyDistinct, true);
});

test('CI-6 L4: 0 or 1 direction trivially allMeaningfullyDistinct', () => {
  const single = {
    id: 'dA', title: 'A', thesis: 't', conceptRefs: ['c1'],
    visualMechanism: 'm', systemHypothesis: 's', directionFamily: 'structural-system',
    crossMediaBehavior: ['brand/VI'],
    opportunityRefs: ['o1'], insightRefs: ['i1'], needRefs: ['n1'],
    factRefs: ['f-brand'], evidenceRefs: [],
    strengths: [], risks: [], blockers: [],
    status: 'grounded', generatedBy: 'deterministic_synthesis', traceVersion: DIRECTION_TRACE_VERSION,
  };
  const r1 = evaluateDirectionFamilyDifference([]);
  assert.equal(r1.allMeaningfullyDistinct, true);
  const r2 = evaluateDirectionFamilyDifference([single]);
  assert.equal(r2.allMeaningfullyDistinct, true);
});

// ========== Layer 5: Direction Gates ==========

test('CI-6 L5: all 11 gates run on a valid direction', () => {
  const { directions } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c1')],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
    maxDirections: 1,
  });
  const gates = runDirectionGates(directions[0], {
    concepts: [makeConcept('c1')],
    opportunities: BASE_OPPS,
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
    conflicts: [],
    siblingDirections: directions,
    expectedBrandName: 'TestBrand',
  });
  const gateNames = gates.map((g) => g.gate);
  assert.deepEqual(gateNames, [
    'trace', 'brand-identity', 'asset-authorization', 'business-coverage',
    'consumer-coverage', 'group-visual-authorization', 'family-difference',
    'spatial-drift', 'aesthetic', 'execution-readiness', 'anchor-prompt-leakage',
  ]);
});

test('CI-6 L5: family-difference gate blocks fake-diversity direction', () => {
  const d1 = {
    id: 'd1', title: 't', thesis: 'th', conceptRefs: ['c1'],
    visualMechanism: 'Use a structural grid with modular units connected by lines.',
    systemHypothesis: 'A structural system expresses modularity.',
    directionFamily: 'structural-system',
    crossMediaBehavior: ['brand/VI'],
    opportunityRefs: ['o1'], insightRefs: ['i1'], needRefs: ['n1'],
    factRefs: ['f-brand'], evidenceRefs: [],
    strengths: [], risks: [], blockers: [],
    status: 'grounded', generatedBy: 'deterministic_synthesis', traceVersion: DIRECTION_TRACE_VERSION,
  };
  const d2 = {
    ...d1, id: 'd2',
    visualMechanism: 'Use a structural grid with modular units connected by lines, in purple.',
    colorRelationship: 'Purple primary',
  };
  const summary = runDirectionGatesForSet([d1, d2], {
    concepts: [makeConcept('c1')],
    opportunities: BASE_OPPS,
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
    conflicts: [],
    siblingDirections: [d1, d2],
  });
  // Both directions should be blocked by family-difference gate
  for (const [id, status] of Object.entries(summary.perDirection)) {
    assert.equal(status, 'blocked', `${id} should be blocked by family-difference gate`);
  }
});

test('CI-6 L5: runDirectionGatesForSet aggregates correctly', () => {
  const { directions } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c1'), makeConcept('c2', { strategicPattern: 'system-reframing' })],
    opportunityMap: makeOpportunityMap({ opportunities: [
      makeOpportunity('o1', 'identity-preservation'),
      makeOpportunity('o2', 'system-coherence'),
    ] }),
    insights: [...BASE_INSIGHTS, makeInsight('i2-b', 'business', 'Platform role clear', {
      needRefs: ['n2'], factRefs: ['f-role'],
    })],
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
    maxDirections: 3,
  });
  const summary = runDirectionGatesForSet(directions, {
    concepts: [makeConcept('c1'), makeConcept('c2', { strategicPattern: 'system-reframing' })],
    opportunities: [makeOpportunity('o1', 'identity-preservation'), makeOpportunity('o2', 'system-coherence')],
    insights: [...BASE_INSIGHTS, makeInsight('i2-b', 'business', 'Platform role clear', { needRefs: ['n2'], factRefs: ['f-role'] })],
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
    conflicts: [],
    siblingDirections: directions,
  });
  assert.ok(['pass', 'pass_with_warnings', 'blocked'].includes(summary.overallStatus));
  assert.equal(summary.passedCount + summary.warningCount + summary.blockedCount, directions.length);
});

// ========== Layer 6: Anchor/Prompt leakage ==========

test('CI-6 L6: deterministic directions have zero anchor/prompt leakage', () => {
  const { directions } = generateDirections({
    projectId: 'p1',
    concepts: [makeConcept('c1'), makeConcept('c2', { strategicPattern: 'system-reframing' })],
    opportunityMap: makeOpportunityMap(),
    insights: BASE_INSIGHTS,
    needs: BASE_NEEDS,
    facts: BASE_FACTS,
    evidence: BASE_EVIDENCE,
    maxDirections: 4,
    maxPerConcept: 2,
  });
  for (const d of directions) {
    const leak = detectDirectionLeakage(d);
    assert.equal(leak.field, null, `${d.id} field: ${leak.field}`);
    assert.equal(leak.text, null, `${d.id} text: ${leak.text}`);
  }
});

test('CI-6 L6: anchor field is forbidden', () => {
  const bad = { anchor: 'something' };
  const leak = detectDirectionLeakage(bad);
  assert.equal(leak.field, 'anchor');
});

test('CI-6 L6: productionPrompt field is forbidden', () => {
  const bad = { productionPrompt: 'Generate a 16:9 image of...' };
  const leak = detectDirectionLeakage(bad);
  assert.equal(leak.field, 'productionPrompt');
});

test('CI-6 L6: text with "Generate a 16:9" is detected', () => {
  const bad = { text: 'Generate a 16:9 reception hall with logo' };
  const leak = detectDirectionLeakage(bad);
  assert.ok(leak.text, 'should detect Generate pattern');
});

test('CI-6 L6: "selectedDirection" field is forbidden', () => {
  const bad = { selectedDirection: 'A' };
  const leak = detectDirectionLeakage(bad);
  assert.equal(leak.field, 'selectedDirection');
});

test('CI-6 L6: production-ready language is detected', () => {
  const bad = { text: 'This direction is production-ready.' };
  const leak = detectDirectionLeakage(bad);
  assert.ok(leak.text, 'should detect production-ready');
});

test('CI-6 L6: visualMechanism field is ALLOWED in direction output', () => {
  const allowed = {
    visualMechanism: 'A structural system organizes information.',
    systemHypothesis: 'The system expresses identity.',
    directionFamily: 'structural-system',
    crossMediaBehavior: ['brand/VI'],
  };
  const leak = detectDirectionLeakage(allowed);
  assert.equal(leak.field, null);
});

// ========== Full pipeline ==========

test('CI-6 full: runDirectionPipeline produces DirectionSet with all required fields', () => {
  const result = runDirectionPipeline({
    projectId: 'p1',
    truth: {
      schemaVersion: '0.2', projectId: 'p1', facts: BASE_FACTS, conflicts: [],
      resolutions: [], unknowns: [],
      provenance: { mode: 'shadow', generatedAt: 't', assemblerVersion: 'v', ciVersion: 'v' },
    },
    evidence: { schemaVersion: '0.2', entries: BASE_EVIDENCE, projectId: 'p1' },
    needs: BASE_NEEDS,
    insights: BASE_INSIGHTS,
    opportunityMap: makeOpportunityMap(),
    conceptSet: makeConceptSet([makeConcept('c1')]),
    generatedAt: '2026-01-01T00:00:00.000Z',
    expectedBrandName: 'TestBrand',
  });
  // DirectionSet structure
  assert.equal(result.directionSet.schemaVersion, '0.1');
  assert.equal(result.directionSet.projectId, 'p1');
  assert.ok(Array.isArray(result.directionSet.directions));
  assert.ok(Array.isArray(result.directionSet.evaluations));
  assert.ok(Array.isArray(result.directionSet.blockedDirectionIds));
  assert.ok(Array.isArray(result.directionSet.diagnostics));
  assert.equal(result.directionSet.provenance.mode, 'shadow');
  // Family difference
  assert.ok(result.familyDifference);
  // Leakage
  assert.equal(result.leakage.field, null);
  assert.equal(result.leakage.text, null);
  // Gate summary
  assert.ok(['pass', 'pass_with_warnings', 'blocked'].includes(result.gateSummary.overallStatus));
});

test('CI-6 full: zero directions when all concepts are blocked', () => {
  const result = runDirectionPipeline({
    projectId: 'p1',
    truth: {
      schemaVersion: '0.2', projectId: 'p1', facts: BASE_FACTS, conflicts: [],
      resolutions: [], unknowns: [],
      provenance: { mode: 'shadow', generatedAt: 't', assemblerVersion: 'v', ciVersion: 'v' },
    },
    evidence: { schemaVersion: '0.2', entries: BASE_EVIDENCE, projectId: 'p1' },
    needs: BASE_NEEDS,
    insights: BASE_INSIGHTS,
    opportunityMap: makeOpportunityMap(),
    conceptSet: makeConceptSet([makeConcept('c-blocked', { status: 'blocked' })]),
    generatedAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(result.directionSet.directions.length, 0);
});

// ========== Dedupe ==========

test('CI-6 dedupe: same family + same concept set + high mechanism overlap is removed', () => {
  const d1 = {
    id: 'd1', title: 't', thesis: 'th', conceptRefs: ['c1'],
    visualMechanism: 'Use a structural grid with modular units connected by lines.',
    systemHypothesis: 'A structural system.',
    directionFamily: 'structural-system',
    crossMediaBehavior: ['brand/VI'],
    opportunityRefs: ['o1'], insightRefs: ['i1'], needRefs: ['n1'],
    factRefs: ['f-brand'], evidenceRefs: [],
    strengths: [], risks: [], blockers: [],
    status: 'grounded', generatedBy: 'deterministic_synthesis', traceVersion: DIRECTION_TRACE_VERSION,
  };
  const d2 = {
    ...d1, id: 'd2',
    visualMechanism: 'Use a structural grid with modular units connected by lines.',
  };
  const result = dedupeDirections([d1, d2]);
  assert.equal(result.directions.length, 1);
  assert.equal(result.duplicates.length, 1);
});
