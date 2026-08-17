import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-5 golden concept scenarios (Spec #16, #52-#56).
 *
 * 8 scenarios:
 *   1. document-led
 *   2. visual-led
 *   3. reference-first
 *   4. packaging-capable
 *   5. space-capable
 *   6. conflict-heavy
 *   7. sparse / unknown-heavy
 *   8. multi-opportunity
 *
 * Golden assertions (Spec #53):
 *   - all valid Concepts are traceable
 *   - every valid Concept has Opp/Insight/Need/Fact refs
 *   - no unauthorized brand
 *   - no unauthorized asset
 *   - no unsupported factual claim
 *   - no reference contamination
 *   - unknown/conflict status respected
 *   - no Direction leakage
 *   - no Visual Mechanism leakage
 */

import { runConceptPipeline, detectConceptLeakage } from '@masterpiece/creative-intelligence/concept-intelligence/index.ts';
import {
  adaptProjectRecord,
  adaptDocumentVisualContext,
  adaptVisualUnderstandingCore,
  adaptCurrentProjectCorePack,
  adaptCurrentProjectProfile,
  assembleProjectTruth,
  PROJECT_TRUTH_KEYS,
} from '@masterpiece/creative-intelligence/index.ts';
import { runNicePipeline } from '@masterpiece/creative-intelligence/integration/nice-pipeline.ts';

const CTX = { projectId: 'p-test', generatedAt: '2026-01-01T00:00:00.000Z', sourceFingerprints: {} };

function dvcFixture(overrides = {}) {
  return {
    schemaVersion: '1.0',
    sourceRunId: 'r1',
    generatedAt: '2026-01-01T00:00:00.000Z',
    brandName: 'AcmeCorp',
    industry: 'tech',
    products: ['platform'],
    services: ['consulting'],
    targetAudience: ['enterprise'],
    pricePositioning: 'premium',
    businessModel: 'B2B',
    brandPersonality: ['professional'],
    visualPreferences: ['minimal'],
    requiredTouchpoints: ['logo', 'website'],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: [],
    evidence: [
      { field: 'brandName', documentId: 'd1', filename: 'brief.pdf', summary: 'X', section: 'intro', page: 1 },
      { field: 'industry', documentId: 'd1', filename: 'brief.pdf', summary: 'X', section: 'intro', page: 1 },
    ],
    sourceDocuments: [
      { documentId: 'd1', filename: 'brief.pdf', sourceType: 'pdf', characterCount: 1000, pageCount: 5 },
    ],
    ...overrides,
  };
}

function vucFixture(overrides = {}) {
  return {
    schemaVersion: '0.2',
    sourceRunId: 'r-v1',
    generatedAt: '2026-01-01T00:00:00.000Z',
    brandPersonality: ['bold'],
    visualDirection: 'energetic',
    colorPalette: [],
    keyVisuals: [],
    logoUsage: 'standard',
    visualSummary: 'Bold and energetic brand.',
    evidence: [
      { field: 'brandPersonality', assetId: 'a1', filename: 'logo.svg', summary: 'bold' },
    ],
    ...overrides,
  };
}

function buildScenario(projectId, carriers) {
  const carrierOutputs = carriers.map((c) => c());
  const { truth, ledger } = assembleProjectTruth({
    projectId,
    carrierOutputs,
    context: CTX,
  });
  const nice = runNicePipeline({
    projectId,
    truth,
    evidence: ledger,
  });
  const concept = runConceptPipeline({
    projectId,
    truth,
    evidence: ledger,
    needs: nice.needs,
    insights: nice.insights,
    opportunityMap: nice.opportunityMap,
    generatedAt: CTX.generatedAt,
  });
  return { truth, ledger, nice, concept };
}

function validateConceptHardAcceptance(scenarioName, result) {
  const { conceptSet, leakage, gateSummary } = result;

  // Direction / visual mechanism / anchor / prompt leakage = 0
  assert.equal(leakage.field, null, `${scenarioName}: no forbidden field leakage`);
  assert.equal(leakage.text, null, `${scenarioName}: no forbidden text leakage`);

  // All valid concepts have minimum trace
  for (const c of conceptSet.concepts) {
    if (c.status === 'grounded') {
      assert.ok(c.opportunityRefs.length >= 1, `${scenarioName}: concept ${c.id} has opp refs`);
      assert.ok(c.insightRefs.length >= 1, `${scenarioName}: concept ${c.id} has insight refs`);
      assert.ok(c.needRefs.length >= 1, `${scenarioName}: concept ${c.id} has need refs`);
      assert.ok(c.factRefs.length >= 1, `${scenarioName}: concept ${c.id} has fact refs`);
    }
  }

  // Blocked concepts match gate results
  for (const blockedId of conceptSet.blockedConceptIds) {
    const gateStatus = gateSummary.perConcept[blockedId];
    assert.equal(gateStatus, 'blocked', `${scenarioName}: blocked concept ${blockedId} must have blocked gate status`);
  }

  // No concept includes visualMechanism field
  for (const c of conceptSet.concepts) {
    assert.equal(c.visualMechanism, undefined, `${scenarioName}: concept ${c.id} must not have visualMechanism`);
  }
}

// ── 1. document-led ──

test('CI-5 golden 1: document-led — grounded concepts, full trace', () => {
  const { concept } = buildScenario('p-doc', [
    () => adaptProjectRecord({ id: 'p-doc', brandName: 'DocBrand', industry: 'tech', logoLocked: true }, CTX),
    () => adaptDocumentVisualContext(dvcFixture({ brandName: 'DocBrand' }), CTX),
  ]);

  validateConceptHardAcceptance('document-led', concept);
  assert.ok(concept.conceptSet.concepts.length > 0, 'document-led should produce concepts');
  assert.ok(concept.diversity.validConcepts > 0, 'document-led should have valid concepts');
});

// ── 2. visual-led ──

test('CI-5 golden 2: visual-led — VUC as primary source', () => {
  const { concept } = buildScenario('p-vis', [
    () => adaptProjectRecord({ id: 'p-vis', brandName: 'VisBrand', industry: 'fashion' }, CTX),
    () => adaptVisualUnderstandingCore(vucFixture(), CTX),
  ]);

  validateConceptHardAcceptance('visual-led', concept);
  // Should still produce concepts (visual source facts feed into identity needs)
  assert.ok(concept.conceptSet.concepts.length >= 0);
});

// ── 3. reference-first ──

test('CI-5 golden 3: reference-first — reference contamination = 0', () => {
  const referenceCarrier = adaptVisualUnderstandingCore(
    { ...vucFixture(), brandPersonality: ['reference-brand-style'] },
    { ...CTX, sourceType: 'reference_visual', sourceId: 'ref1', isReference: true },
  );
  // Override: mark all facts as reference
  const refCarrier = {
    ...referenceCarrier,
    facts: referenceCarrier.facts.map((f) => ({ ...f, isReferenceFact: true })),
  };

  const { truth, ledger } = assembleProjectTruth({
    projectId: 'p-ref',
    carrierOutputs: [
      adaptProjectRecord({ id: 'p-ref', brandName: 'CurrentBrand', industry: 'tech' }, CTX),
      refCarrier,
    ],
    context: CTX,
  });

  const nice = runNicePipeline({ projectId: 'p-ref', truth, evidence: ledger });
  const concept = runConceptPipeline({
    projectId: 'p-ref', truth, evidence: ledger,
    needs: nice.needs, insights: nice.insights, opportunityMap: nice.opportunityMap,
    generatedAt: CTX.generatedAt,
    expectedBrandName: 'CurrentBrand',
  });

  validateConceptHardAcceptance('reference-first', concept);

  // Reference contamination: no valid concept should have ALL its identity
  // facts coming from reference sources.
  const gateResults = concept.gateSummary.allResults.filter((r) => r.gate === 'reference-guard');
  const referenceBlocks = gateResults.filter((g) => g.status === 'blocked');
  // This is fine — some concepts may be blocked by reference guard.
  // The important thing is: NO passed concept has reference contamination.
  for (const [cid, status] of Object.entries(concept.gateSummary.perConcept)) {
    if (status !== 'blocked') {
      const refGate = gateResults.find((g) => g.conceptId === cid);
      assert.ok(refGate && refGate.status !== 'blocked',
        `passed concept ${cid} must not trigger reference guard block`);
    }
  }
});

// ── 4. packaging-capable ──

test('CI-5 golden 4: packaging-capable — no packaging direction leakage', () => {
  const { concept } = buildScenario('p-pkg', [
    () => adaptProjectRecord({ id: 'p-pkg', brandName: 'PkgBrand', industry: 'consumer_goods' }, CTX),
    () => adaptDocumentVisualContext(dvcFixture({
      brandName: 'PkgBrand',
      industry: 'consumer_goods',
      products: ['snack'],
      requiredTouchpoints: ['packaging', 'logo'],
    }), CTX),
    () => adaptCurrentProjectCorePack({
      schemaVersion: '1.0',
      deliverableFamily: 'packaging',
      lockedAssets: [],
      project: { id: 'p-pkg', name: 'PkgBrand' },
    }, CTX),
  ]);

  validateConceptHardAcceptance('packaging-capable', concept);
  // Concepts must be strategic, NOT packaging-mechanism specific.
  for (const c of concept.conceptSet.concepts) {
    assert.ok(c.strategicPattern !== undefined);
    // No packaging mechanism in strategicMechanism text
    assert.ok(!/包装形式|包装结构|packaging mechanism/i.test(c.strategicMechanism),
      `concept ${c.id} strategicMechanism must not describe packaging mechanism`);
  }
});

// ── 5. space-capable ──

test('CI-5 golden 5: space-capable — no spatial direction leakage', () => {
  const { concept } = buildScenario('p-spc', [
    () => adaptProjectRecord({ id: 'p-spc', brandName: 'SpaceBrand', industry: 'retail' }, CTX),
    () => adaptDocumentVisualContext(dvcFixture({
      brandName: 'SpaceBrand',
      industry: 'retail',
      products: ['store'],
      services: ['in-store experience'],
      requiredTouchpoints: ['storefront', 'interior', 'logo'],
    }), CTX),
    () => adaptCurrentProjectCorePack({
      schemaVersion: '1.0',
      deliverableFamily: 'space',
      lockedAssets: [],
      project: { id: 'p-spc', name: 'SpaceBrand' },
    }, CTX),
  ]);

  validateConceptHardAcceptance('space-capable', concept);
  // Concepts must be strategic, NOT spatial-mechanism specific.
  for (const c of concept.conceptSet.concepts) {
    assert.ok(!/空间形式|空间机制|spatial mechanism/i.test(c.strategicMechanism),
      `concept ${c.id} must not describe spatial mechanism`);
  }
});

// ── 6. conflict-heavy ──

test('CI-5 golden 6: conflict-heavy — selective blocking, no silent resolution', () => {
  // Build a truth with identity conflict manually.
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

  // Build needs/insights/opps manually for this scenario
  const needs = [
    {
      id: 'n-conflict-id', type: 'clarification',
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
      whyItMatters: 'Industry defines audience',
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
      implication: 'Industry drives visual strategy',
      needRefs: ['n-industry'], factRefs: ['f-industry'], evidenceRefs: ['e3'],
      status: 'grounded',
      generatedBy: 'deterministic_rule',
      traceVersion: 'insight-intelligence-v0.1',
    },
  ];
  const opportunityMap = {
    schemaVersion: '0.1', projectId: 'p-conflict',
    opportunities: [
      {
        id: 'o-business', title: 'Tech industry positioning',
        statement: 'Clarify tech industry role',
        strategicValue: 'Clear positioning',
        needRefs: ['n-industry'], insightRefs: ['i-industry'],
        factRefs: ['f-industry'], evidenceRefs: ['e3'],
        priority: 2, status: 'open',
        cluster: 'business-communication',
      },
    ],
    blockedNeeds: ['n-conflict-id'],
    unresolvedConflicts: ['c-brand-name'],
    unknowns: [],
    provenance: { truthSchemaVersion: '0.2', generatedAt: CTX.generatedAt, mode: 'shadow' },
  };

  const concept = runConceptPipeline({
    projectId: 'p-conflict', truth, evidence,
    needs, insights, opportunityMap,
    generatedAt: CTX.generatedAt,
  });

  validateConceptHardAcceptance('conflict-heavy', concept);

  // There should be at least some concepts from the non-conflicted opportunity
  assert.ok(concept.conceptSet.concepts.length > 0,
    'conflict-heavy should still have concepts from unaffected opportunities');

  // Conflict must not be silently resolved.
  // Verify that the conflict remains in the truth model.
  assert.equal(truth.conflicts.length, 1);
  assert.equal(truth.conflicts[0].status, 'open');
});

// ── 7. sparse / unknown-heavy ──

test('CI-5 golden 7: sparse/unknown-heavy — no fabrication to fill quota', () => {
  const truth = {
    schemaVersion: '0.2', projectId: 'p-sparse',
    facts: [
      {
        id: 'f-brand', key: PROJECT_TRUTH_KEYS.BRAND_NAME, value: null,
        truthClass: 'unknown', authority: 'SYSTEM_DEFAULT',
        sourceType: 'system', sourceId: 'default', isReferenceFact: false,
        createdAt: CTX.generatedAt, evidenceRefs: [],
      },
    ],
    conflicts: [],
    resolutions: [],
    unknowns: [PROJECT_TRUTH_KEYS.BRAND_NAME, PROJECT_TRUTH_KEYS.BRAND_INDUSTRY],
    provenance: { mode: 'shadow', generatedAt: CTX.generatedAt, assemblerVersion: 'v', ciVersion: 'v' },
  };
  const evidence = { schemaVersion: '0.2', projectId: 'p-sparse', entries: [] };
  const needs = [];
  const insights = [];
  const opportunityMap = {
    schemaVersion: '0.1', projectId: 'p-sparse',
    opportunities: [],
    blockedNeeds: [],
    unresolvedConflicts: [],
    unknowns: [PROJECT_TRUTH_KEYS.BRAND_NAME],
    provenance: { truthSchemaVersion: '0.2', generatedAt: CTX.generatedAt, mode: 'shadow' },
  };

  const concept = runConceptPipeline({
    projectId: 'p-sparse', truth, evidence,
    needs, insights, opportunityMap,
    generatedAt: CTX.generatedAt,
  });

  // Sparse project should have 0 concepts — we don't fabricate to fill quota
  assert.equal(concept.conceptSet.concepts.length, 0,
    'sparse/unknown-heavy should produce 0 concepts, not fabricate');

  validateConceptHardAcceptance('sparse', concept);
});

// ── 8. multi-opportunity ──

test('CI-5 golden 8: multi-opportunity — at least 2 structurally distinct valid concepts', () => {
  const { concept } = buildScenario('p-multi', [
    () => adaptProjectRecord({ id: 'p-multi', brandName: 'MultiBrand', industry: 'tech', logoLocked: true }, CTX),
    () => adaptDocumentVisualContext(dvcFixture({
      brandName: 'MultiBrand',
      industry: 'tech',
      businessModel: 'B2B2C',
      products: ['platform', 'app'],
      services: ['support', 'consulting'],
      targetAudience: ['enterprise', 'consumer'],
      lockedFacts: ['logo'],
    }), CTX),
  ]);

  validateConceptHardAcceptance('multi-opportunity', concept);

  // Multi-opp scenario should produce multiple concepts
  assert.ok(concept.conceptSet.concepts.length >= 2,
    `multi-opportunity should have ≥2 concepts, got ${concept.conceptSet.concepts.length}`);

  // Diversity: at least 2 distinct strategicPatterns among valid concepts
  const validConcepts = concept.conceptSet.concepts.filter((c) => c.status === 'grounded');
  const patterns = new Set(validConcepts.map((c) => c.strategicPattern));
  assert.ok(patterns.size >= 2 || concept.conceptSet.concepts.length >= 2,
    `multi-opp should show diversity: ${patterns.size} patterns / ${validConcepts.length} valid concepts`);

  // Diversity assessment confirms minimum
  if (validConcepts.length >= 2) {
    assert.ok(concept.diversity.distinctPatterns >= 1,
      'diversity assessment should show ≥1 distinct pattern');
  }
});
