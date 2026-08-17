/**
 * CI-W1A P0 regression: Concept Gate → Direction state propagation.
 *
 * Hard fixture: a Concept whose candidate status is 'grounded' but whose
 * gate status is 'blocked' (or whose id is in blockedConceptIds) MUST NOT
 * produce a Direction.
 *
 * This file lives under `ci-w1a/` because it is the regression test for
 * the CI-W1A P0 fix; it is grouped with the CI-W1A scenarios but it also
 * covers the `resolveEffectiveConceptStatus` pure function and the
 * `filterValidConceptsForDirection` helper.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveEffectiveConceptStatus,
  filterValidConceptsForDirection,
  computeEffectiveConceptStatusMap,
  maxDirectionStatusFromConcept,
} from '@masterpiece/creative-intelligence/concept-intelligence/index.ts';
import {
  runConceptPipeline,
  runDirectionPipeline,
} from '@masterpiece/creative-intelligence/index.ts';

function makeConcept(id, status = 'grounded', overrides = {}) {
  return {
    id,
    title: `Title ${id}`,
    thesis: 'A short thesis that avoids all banned terms like "render" or "image prompt".',
    problemStatement: 'A problem statement.',
    strategicMechanism: 'A non-visual mechanism that is a system-level reframe.',
    rationale: 'Why this is the right approach.',
    opportunityRefs: ['opp-1'],
    insightRefs: ['i-1'],
    needRefs: ['n-1'],
    factRefs: ['f-1'],
    evidenceRefs: ['ev-1'],
    strategicPattern: 'clarity-through-structure',
    strengths: ['s1'],
    risks: ['r1'],
    blockers: [],
    status,
    generatedBy: 'deterministic_synthesis',
    traceVersion: 'concept-intelligence-v0.1',
    ...overrides,
  };
}

function makeFact(id, key, value) {
  return {
    id, key, value, truthClass: 'fact', authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    sourceType: 'document', sourceId: 'd1', isReferenceFact: false,
    createdAt: '2026-01-01T00:00:00.000Z', evidenceRefs: [`ev-${id}`],
  };
}

function makeEvidence(id, factIds) {
  return {
    id, type: 'document_extract', sourceType: 'document', sourceId: 'd1',
    factIds, confidence: 0.9, capturedAt: '2026-01-01T00:00:00.000Z',
  };
}

const BASE_FACTS = [
  makeFact('f-brand', 'brandName', 'TestBrand'),
  makeFact('f-role', 'brandRole', 'platform'),
];
const BASE_EVIDENCE = [
  makeEvidence('ev-f-brand', ['f-brand']),
  makeEvidence('ev-f-role', ['f-role']),
];

// ========== Layer 1: resolveEffectiveConceptStatus — pure function ==========

test('CI-W1A P0 L1: gate blocked → effective blocked (id wins)', () => {
  const concept = makeConcept('c1', 'grounded');
  const conceptSet = { blockedConceptIds: ['c1'] };
  assert.equal(resolveEffectiveConceptStatus(concept, conceptSet), 'blocked');
});

test('CI-W1A P0 L1: candidate blocked → effective blocked', () => {
  const concept = makeConcept('c2', 'blocked');
  const conceptSet = { blockedConceptIds: [] };
  assert.equal(resolveEffectiveConceptStatus(concept, conceptSet), 'blocked');
});

test('CI-W1A P0 L1: candidate grounded + gate pass → effective grounded', () => {
  const concept = makeConcept('c3', 'grounded');
  const conceptSet = { blockedConceptIds: [] };
  assert.equal(resolveEffectiveConceptStatus(concept, conceptSet), 'grounded');
});

test('CI-W1A P0 L1: candidate provisional → effective provisional', () => {
  const concept = makeConcept('c4', 'provisional');
  const conceptSet = { blockedConceptIds: [] };
  assert.equal(resolveEffectiveConceptStatus(concept, conceptSet), 'provisional');
});

test('CI-W1A P0 L1: candidate grounded + gate pass_with_warnings → effective provisional', () => {
  const concept = makeConcept('c5', 'grounded');
  const conceptSet = { blockedConceptIds: [] };
  const gateStatusByConceptId = { c5: 'pass_with_warnings' };
  assert.equal(resolveEffectiveConceptStatus(concept, conceptSet, gateStatusByConceptId), 'provisional');
});

test('CI-W1A P0 L1: gateStatusByConceptId blocked → effective blocked (even if candidate grounded)', () => {
  const concept = makeConcept('c6', 'grounded');
  const conceptSet = { blockedConceptIds: [] };
  const gateStatusByConceptId = { c6: 'blocked' };
  assert.equal(resolveEffectiveConceptStatus(concept, conceptSet, gateStatusByConceptId), 'blocked');
});

// ========== Layer 2: filterValidConceptsForDirection ==========

test('CI-W1A P0 L2: filterValidConceptsForDirection excludes gate-blocked concepts', () => {
  const conceptSet = {
    blockedConceptIds: ['c1'],
    concepts: [
      makeConcept('c1', 'grounded'),
      makeConcept('c2', 'grounded'),
      makeConcept('c3', 'blocked'),
    ],
  };
  const valid = filterValidConceptsForDirection(conceptSet);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].id, 'c2');
});

test('CI-W1A P0 L2: filterValidConceptsForDirection excludes candidate-blocked concepts', () => {
  const conceptSet = {
    blockedConceptIds: [],
    concepts: [
      makeConcept('c1', 'grounded'),
      makeConcept('c2', 'provisional'),
      makeConcept('c3', 'blocked'),
    ],
  };
  const valid = filterValidConceptsForDirection(conceptSet);
  assert.equal(valid.length, 2);
  assert.deepEqual(valid.map((c) => c.id).sort(), ['c1', 'c2']);
});

test('CI-W1A P0 L2: filterValidConceptsForDirection excludes gate-blocked (via gateStatusByConceptId)', () => {
  const conceptSet = {
    blockedConceptIds: [],
    concepts: [
      makeConcept('c1', 'grounded'),
      makeConcept('c2', 'grounded'),
    ],
  };
  const gateStatusByConceptId = { c2: 'blocked' };
  const valid = filterValidConceptsForDirection(conceptSet, gateStatusByConceptId);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].id, 'c1');
});

// ========== Layer 3: maxDirectionStatusFromConcept ==========

test('CI-W1A P0 L3: maxDirectionStatusFromConcept maps blocked → none', () => {
  assert.equal(maxDirectionStatusFromConcept('blocked'), 'none');
});
test('CI-W1A P0 L3: maxDirectionStatusFromConcept maps provisional → provisional', () => {
  assert.equal(maxDirectionStatusFromConcept('provisional'), 'provisional');
});
test('CI-W1A P0 L3: maxDirectionStatusFromConcept maps grounded → grounded', () => {
  assert.equal(maxDirectionStatusFromConcept('grounded'), 'grounded');
});

// ========== Layer 4: HARD REGRESSION (Spec §4.3) ==========
// ConceptCandidate.status = 'grounded'
// conceptSet.blockedConceptIds includes the id
// → Direction count from this Concept MUST be 0

test('CI-W1A P0 L4 HARD REGRESSION: grounded Concept in blockedConceptIds → Direction count = 0', () => {
  const concept = makeConcept('c-blocked-but-grounded', 'grounded');
  const conceptSet = {
    blockedConceptIds: ['c-blocked-but-grounded'],
    concepts: [concept],
  };
  const valid = filterValidConceptsForDirection(conceptSet);
  assert.equal(valid.length, 0, 'gate-blocked Concept MUST NOT pass to Direction generation');
});

// ========== Layer 5: pipeline-level regression ==========
// Use the actual runDirectionPipeline with a pre-populated ConceptSet that
// has a grounded Concept in blockedConceptIds. The pipeline MUST produce 0
// Directions from this Concept.

import {
  adaptProjectRecord,
  adaptDocumentVisualContext,
  assembleProjectTruth,
  runNicePipeline,
} from '@masterpiece/creative-intelligence/index.ts';

const CTX = { projectId: 'p-w1a', generatedAt: '2026-01-01T00:00:00.000Z', sourceFingerprints: {} };

function dvcFixture(overrides = {}) {
  return {
    schemaVersion: '1.0', sourceRunId: 'r1', generatedAt: '2026-01-01T00:00:00.000Z',
    brandName: 'TestBrand', industry: 'tech', products: ['platform'],
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

test('CI-W1A P0 L5 END-TO-END: runDirectionPipeline never produces Directions for gate-blocked Concepts', () => {
  const projectRecord = adaptProjectRecord(
    { id: 'p-w1a', brandName: 'TestBrand', industry: 'tech', logoLocked: true }, CTX,
  );
  const dvcOut = adaptDocumentVisualContext(dvcFixture(), CTX);
  const { truth, ledger } = assembleProjectTruth({
    projectId: 'p-w1a', carrierOutputs: [projectRecord, dvcOut], context: CTX,
  });
  const nice = runNicePipeline({ projectId: 'p-w1a', truth, evidence: ledger });
  const conceptResult = runConceptPipeline({
    projectId: 'p-w1a', truth, evidence: ledger,
    needs: nice.needs, insights: nice.insights,
    opportunityMap: nice.opportunityMap, generatedAt: CTX.generatedAt,
    expectedBrandName: 'TestBrand',
  });
  // After running, every Concept that the gate blocks MUST be in
  // blockedConceptIds, and the resulting directionSet must not have any
  // direction whose conceptRefs include a blocked concept.
  const blockedIds = new Set(conceptResult.conceptSet.blockedConceptIds);
  const validConcepts = filterValidConceptsForDirection(conceptResult.conceptSet);
  for (const validConcept of validConcepts) {
    assert.ok(!blockedIds.has(validConcept.id), `${validConcept.id} passed filter but is blocked`);
  }
  const directionResult = runDirectionPipeline({
    projectId: 'p-w1a', truth, evidence: ledger,
    needs: nice.needs, insights: nice.insights,
    opportunityMap: nice.opportunityMap,
    conceptSet: conceptResult.conceptSet,
    generatedAt: CTX.generatedAt, expectedBrandName: 'TestBrand',
  });
  for (const d of directionResult.directionSet.directions) {
    for (const ref of d.conceptRefs) {
      assert.ok(!blockedIds.has(ref),
        `Direction ${d.id} references blocked Concept ${ref} (P0 regression)`);
    }
  }
});

// ========== Layer 6: provisional Concept → Direction max provisional ==========

test('CI-W1A P0 L6: provisional Concept → Direction status max provisional', () => {
  const projectRecord = adaptProjectRecord(
    { id: 'p-w1a-2', brandName: 'TestBrand', industry: 'tech', logoLocked: true }, CTX,
  );
  const dvcOut = adaptDocumentVisualContext(dvcFixture(), CTX);
  const { truth, ledger } = assembleProjectTruth({
    projectId: 'p-w1a-2', carrierOutputs: [projectRecord, dvcOut], context: CTX,
  });
  const nice = runNicePipeline({ projectId: 'p-w1a-2', truth, evidence: ledger });
  const conceptResult = runConceptPipeline({
    projectId: 'p-w1a-2', truth, evidence: ledger,
    needs: nice.needs, insights: nice.insights,
    opportunityMap: nice.opportunityMap, generatedAt: CTX.generatedAt,
    expectedBrandName: 'TestBrand',
  });
  // Force every concept to be provisional for this test.
  const provisionalSet = {
    ...conceptResult.conceptSet,
    concepts: conceptResult.conceptSet.concepts.map((c) => ({ ...c, status: 'provisional' })),
    blockedConceptIds: [],
  };
  const valid = filterValidConceptsForDirection(provisionalSet);
  if (valid.length === 0) {
    // No valid concepts at all — Direction set is empty, this case is trivially true.
    return;
  }
  const directionResult = runDirectionPipeline({
    projectId: 'p-w1a-2', truth, evidence: ledger,
    needs: nice.needs, insights: nice.insights,
    opportunityMap: nice.opportunityMap,
    conceptSet: provisionalSet,
    generatedAt: CTX.generatedAt, expectedBrandName: 'TestBrand',
  });
  for (const d of directionResult.directionSet.directions) {
    assert.notEqual(d.status, 'grounded',
      `provisional Concept MUST NOT produce grounded Direction (got ${d.status} for ${d.id})`);
  }
});

// ========== Layer 7: computeEffectiveConceptStatusMap ==========

test('CI-W1A P0 L7: computeEffectiveConceptStatusMap returns map keyed by concept id', () => {
  const conceptSet = {
    blockedConceptIds: ['c1'],
    concepts: [makeConcept('c1', 'grounded'), makeConcept('c2', 'provisional')],
  };
  const map = computeEffectiveConceptStatusMap(conceptSet);
  assert.equal(map.c1, 'blocked');
  assert.equal(map.c2, 'provisional');
});
