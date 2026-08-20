/**
 * CI-W1C.7.4 — Planning Strategic Carrier (PSC-01..08).
 *
 * Verifies that `compileStrategicReasoningContext` +
 * `buildStrategicSynthesisPrompt` correctly carry the new
 * `planningStrategicEvidence` field as a positive authority.
 *
 * Also verifies the input fingerprint includes the planning
 * evidence, so a planning-brief change invalidates the snapshot.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  compileStrategicReasoningContext,
  buildStrategicSynthesisPrompt,
  strategicInputFingerprint,
  semanticSha256
} from '../../../../packages/creative-intelligence/src/strategic-synthesis/index.ts';

function makeFact(over) {
  return {
    truthClass: 'fact',
    status: 'observed',
    sourceType: 'project_record',
    sourceId: 'src-1',
    evidenceRefs: [],
    isReferenceFact: false,
    ...over
  };
}

function makeTruth() {
  return {
    schemaVersion: '0.2',
    projectId: 'proj-A',
    facts: [
      makeFact({ id: 'f1', key: 'brand.name', value: 'Acme', authority: 'LOCKED' }),
      makeFact({ id: 'f2', key: 'brand.role', value: 'foo', authority: 'LOCKED' })
    ],
    assumptions: [],
    unknowns: [],
    conflicts: [],
    resolutions: [],
    warnings: [],
    provenance: { carrierIds: ['src-1'], sourceFingerprints: ['fp-1'], generatedAt: '2026-08-20T00:00:00.000Z', mode: 'shadow' }
  };
}

function makePlanningClaim(over) {
  return {
    claimId: 'claim-1',
    key: 'industry',
    value: 'organic grocery',
    epistemicClass: 'FACT',
    sourceDocumentId: 'src:planning-brief-A',
    chunkRefs: ['chunk-1'],
    confidence: 0.8,
    ...over
  };
}

function makeEvidence() {
  return {
    schemaVersion: '0.1',
    projectId: 'proj-A',
    generatedAt: '2026-08-20T00:00:00.000Z',
    entries: []
  };
}

// ---------------------------------------------------------------------------
// PSC-01..03 — compileStrategicReasoningContext
// ---------------------------------------------------------------------------

test('PSC-01: compileStrategicReasoningContext accepts and exposes planningStrategicEvidence', () => {
  const claims = [makePlanningClaim()];
  const ctx = compileStrategicReasoningContext({
    projectId: 'proj-A',
    truth: makeTruth(),
    needs: [],
    evidence: makeEvidence(),
    planningStrategicEvidence: claims
  });
  assert.deepEqual(ctx.planningStrategicEvidence, claims);
  assert.ok(ctx.sourceIds.planningClaims.includes('claim-1'));
});

test('PSC-02: compileStrategicReasoningContext with no planning evidence → empty array', () => {
  const ctx = compileStrategicReasoningContext({
    projectId: 'proj-A',
    truth: makeTruth(),
    needs: [],
    evidence: makeEvidence()
  });
  assert.deepEqual(ctx.planningStrategicEvidence, []);
  assert.deepEqual(ctx.sourceIds.planningClaims, []);
});

test('PSC-03: planningStrategicEvidence claims preserve epistemic class', () => {
  const claims = [
    makePlanningClaim({ claimId: 'c1', epistemicClass: 'FACT' }),
    makePlanningClaim({ claimId: 'c2', key: 'audience_problem', epistemicClass: 'USER_REQUIREMENT' }),
    makePlanningClaim({ claimId: 'c3', key: 'brand_promise', epistemicClass: 'MODEL_INFERENCE' }),
    makePlanningClaim({ claimId: 'c4', key: 'touchpoint_priority', epistemicClass: 'UNKNOWN' })
  ];
  const ctx = compileStrategicReasoningContext({
    projectId: 'proj-A',
    truth: makeTruth(),
    needs: [],
    evidence: makeEvidence(),
    planningStrategicEvidence: claims
  });
  const byId = new Map(ctx.planningStrategicEvidence.map((c) => [c.claimId, c]));
  assert.equal(byId.get('c1').epistemicClass, 'FACT');
  assert.equal(byId.get('c2').epistemicClass, 'USER_REQUIREMENT');
  assert.equal(byId.get('c3').epistemicClass, 'MODEL_INFERENCE');
  assert.equal(byId.get('c4').epistemicClass, 'UNKNOWN');
});

// ---------------------------------------------------------------------------
// PSC-04..06 — buildStrategicSynthesisPrompt
// ---------------------------------------------------------------------------

test('PSC-04: prompt includes a PLANNING STRATEGIC EVIDENCE section', () => {
  const ctx = compileStrategicReasoningContext({
    projectId: 'proj-A',
    truth: makeTruth(),
    needs: [],
    evidence: makeEvidence(),
    planningStrategicEvidence: [makePlanningClaim()]
  });
  const prompt = buildStrategicSynthesisPrompt({ projectId: 'proj-A', ctx });
  assert.match(prompt.userMessage, /# PLANNING STRATEGIC EVIDENCE/);
  assert.match(prompt.userMessage, /claim-1/);
  assert.match(prompt.userMessage, /epistemicClass=FACT/);
});

test('PSC-05: prompt without planning evidence shows the placeholder line', () => {
  const ctx = compileStrategicReasoningContext({
    projectId: 'proj-A',
    truth: makeTruth(),
    needs: [],
    evidence: makeEvidence()
  });
  const prompt = buildStrategicSynthesisPrompt({ projectId: 'proj-A', ctx });
  assert.match(prompt.userMessage, /no human-authored planning brief registered/);
  assert.equal(prompt.size.planningClaimCount, 0);
});

test('PSC-06: prompt sourceIds include planningClaims', () => {
  const ctx = compileStrategicReasoningContext({
    projectId: 'proj-A',
    truth: makeTruth(),
    needs: [],
    evidence: makeEvidence(),
    planningStrategicEvidence: [makePlanningClaim({ claimId: 'pc-1' }), makePlanningClaim({ claimId: 'pc-2' })]
  });
  const prompt = buildStrategicSynthesisPrompt({ projectId: 'proj-A', ctx });
  assert.match(prompt.userMessage, /planningClaims: \[pc-1, pc-2\]/);
  assert.equal(prompt.size.planningClaimCount, 2);
});

// ---------------------------------------------------------------------------
// PSC-07..08 — fingerprint invalidation
// ---------------------------------------------------------------------------

test('PSC-07: planningEvidence change invalidates the strategic input fingerprint', () => {
  const ctxNoClaims = compileStrategicReasoningContext({
    projectId: 'proj-A',
    truth: makeTruth(),
    needs: [],
    evidence: makeEvidence()
  });
  const ctxWithClaims = compileStrategicReasoningContext({
    projectId: 'proj-A',
    truth: makeTruth(),
    needs: [],
    evidence: makeEvidence(),
    planningStrategicEvidence: [makePlanningClaim()]
  });
  const promptNoClaims = buildStrategicSynthesisPrompt({ projectId: 'proj-A', ctx: ctxNoClaims });
  const promptWithClaims = buildStrategicSynthesisPrompt({ projectId: 'proj-A', ctx: ctxWithClaims });
  assert.notEqual(promptNoClaims.inputFingerprint, promptWithClaims.inputFingerprint);
});

test('PSC-08: two different planning claim values → different fingerprints', () => {
  const ctxA = compileStrategicReasoningContext({
    projectId: 'proj-A',
    truth: makeTruth(),
    needs: [],
    evidence: makeEvidence(),
    planningStrategicEvidence: [makePlanningClaim({ value: 'organic grocery' })]
  });
  const ctxB = compileStrategicReasoningContext({
    projectId: 'proj-A',
    truth: makeTruth(),
    needs: [],
    evidence: makeEvidence(),
    planningStrategicEvidence: [makePlanningClaim({ value: 'audience intelligence' })]
  });
  const fpA = strategicInputFingerprint({
    projectId: 'proj-A',
    promptVersion: 'ci-w1c.7.1-test-v0.1',
    authoritativeFacts: ctxA.authoritativeFacts,
    userRequirements: ctxA.userRequirements,
    lockedIdentity: ctxA.lockedIdentity,
    prohibitedDirections: ctxA.prohibitedDirections,
    needs: ctxA.needs,
    evidence: ctxA.evidence,
    planningStrategicEvidence: ctxA.planningStrategicEvidence,
    legacyVisualEvidenceExcluded: ctxA.legacyVisualEvidenceExcluded
  });
  const fpB = strategicInputFingerprint({
    projectId: 'proj-A',
    promptVersion: 'ci-w1c.7.1-test-v0.1',
    authoritativeFacts: ctxB.authoritativeFacts,
    userRequirements: ctxB.userRequirements,
    lockedIdentity: ctxB.lockedIdentity,
    prohibitedDirections: ctxB.prohibitedDirections,
    needs: ctxB.needs,
    evidence: ctxB.evidence,
    planningStrategicEvidence: ctxB.planningStrategicEvidence,
    legacyVisualEvidenceExcluded: ctxB.legacyVisualEvidenceExcluded
  });
  assert.notEqual(fpA, fpB);
  // Both must be 64-char SHA-256 hex.
  assert.equal(fpA.length, 64);
  assert.equal(fpB.length, 64);
});
