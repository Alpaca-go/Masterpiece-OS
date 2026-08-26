/**
 * CI-W1C.7.4-R2 — Runtime Guard (RTG-01..03).
 *
 * Verifies the SG-01 / SG-10 / SG-11 grounding-gate changes:
 *   - RTG-01 valid planningClaimRef passes SG-01
 *   - RTG-02 unknown planningClaimRef fails SG-01
 *   - RTG-03 foreign planning claim fails SG-10
 *   - (also covers: model sourceMap cannot self-authorize fake IDs;
 *    SG-11 minimum usage when planning input is present.)
 *
 * Zero-network. Pure deterministic validator.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const csIndexUrl = pathToFileURL(
  path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')
).href;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseArtifact(over = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'rtg-proj',
    promptVersion: 'ci-w1c.7-strategic-synthesis-v0.1',
    generatedAt: '2026-08-20T00:00:00.000Z',
    sourceMap: {
      planningTruth: ['f-1'],
      userRequirements: [],
      lockedIdentity: [],
      prohibitedDirections: [],
      needs: ['n-1'],
      evidence: [],
      planningClaims: ['p-c1'],
      legacyVisualEvidenceExcluded: [
        'visualAsset.*', 'old_visual_style', 'old_VI', 'old_poster', 'old_packaging',
        'old_spatial', 'style_reference', 'structure_reference', 'spatial_reference',
      ]
    },
    projectUnderstanding: {
      summary: 's', coreChallenge: 'c', transformationGoal: 't',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['f-1'], needRefs: ['n-1'], evidenceRefs: [],
      planningClaimRefs: ['p-c1']
    },
    tensions: [
      { id: 't-1', statement: 'A', poleA: 'a', poleB: 'b', whyItMatters: 'w',
        epistemicClass: 'MODEL_INFERENCE', factRefs: ['f-1'], needRefs: ['n-1'], evidenceRefs: [],
        planningClaimRefs: ['p-c1'] }
    ],
    insights: [
      { id: 'i-1', statement: 's', implication: 'i', whyThisProject: 'w',
        epistemicClass: 'MODEL_INFERENCE', factRefs: ['f-1'], needRefs: ['n-1'], evidenceRefs: [],
        planningClaimRefs: ['p-c1'] }
    ],
    opportunities: [
      { id: 'o-1', title: 'T', thesis: 'th', strategicMechanism: 'sm', whyThisProject: 'w',
        risk: [], insightRefs: ['i-1'], factRefs: [],
        planningClaimRefs: ['p-c1'] }
    ],
    diagnostics: [],
    meta: { attempt: 1, provider: null, model: null, modelCallCount: 1 },
    ...over
  };
}

const baseTruth = {
  projectId: 'rtg-proj',
  facts: [
    { id: 'f-1', key: 'industry', value: 'test', authority: 'CONFIRMED', sourceRefs: [] }
  ],
  conflicts: [],
  sourceRefs: [],
  schemaVersion: 'project-truth-v0.1',
  generatedAt: '2026-08-20T00:00:00.000Z'
};
const baseNeeds = [{ id: 'n-1', type: 'brand', statement: 's', factRefs: [], needRefs: [], coverageRequirement: 'must' }];
const baseEvidence = { projectId: 'rtg-proj', entries: [], generatedAt: '2026-08-20T00:00:00.000Z' };
const basePlanning = [{
  claimId: 'p-c1', key: 'industry', value: 'test',
  epistemicClass: 'FACT', sourceDocumentId: 's', chunkRefs: ['c-1']
}];

// ---------------------------------------------------------------------------
// RTG-01 — valid planningClaimRef passes
// ---------------------------------------------------------------------------

test('RTG-01: valid planningClaimRef passes SG-01', async () => {
  const { runStrategicGroundingGate } = await import(csIndexUrl);
  const report = runStrategicGroundingGate({
    artifact: baseArtifact(),
    truth: baseTruth,
    needs: baseNeeds,
    evidence: baseEvidence,
    planningClaims: basePlanning
  });
  // No SG-01 / SG-11 block codes for the valid case.
  for (const code of report.blockedCodes) {
    assert.notEqual(code, 'SG-01');
    assert.notEqual(code, 'SG-11');
  }
});

// ---------------------------------------------------------------------------
// RTG-02 — unknown planningClaimRef fails SG-01
// ---------------------------------------------------------------------------

test('RTG-02: unknown planningClaimRef fails SG-01', async () => {
  const { runStrategicGroundingGate } = await import(csIndexUrl);
  const fakeArtifact = baseArtifact({
    projectUnderstanding: {
      summary: 's', coreChallenge: 'c', transformationGoal: 't',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['f-1'], needRefs: ['n-1'], evidenceRefs: [],
      planningClaimRefs: ['p-c-NONEXISTENT']
    }
  });
  // The model-emitted sourceMap also must NOT include the fake ID.
  fakeArtifact.sourceMap.planningClaims = ['p-c1'];
  const report = runStrategicGroundingGate({
    artifact: fakeArtifact,
    truth: baseTruth,
    needs: baseNeeds,
    evidence: baseEvidence,
    planningClaims: basePlanning
  });
  assert.ok(report.blockedCodes.includes('SG-01'), `expected SG-01 in blocked codes: ${report.blockedCodes.join(',')}`);
});

// ---------------------------------------------------------------------------
// RTG-02b — model sourceMap cannot self-authorize fake IDs
// ---------------------------------------------------------------------------

test('RTG-02b: model sourceMap.planningClaims alone is NOT authority; the gate requires the runtime input', async () => {
  const { runStrategicGroundingGate } = await import(csIndexUrl);
  // The model claims a planningClaimRef exists, AND the model
  // echoes that ID in sourceMap. But the runtime input has a
  // DIFFERENT planning claim set. The gate must block.
  const fakeArtifact = baseArtifact({
    projectUnderstanding: {
      summary: 's', coreChallenge: 'c', transformationGoal: 't',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['f-1'], needRefs: ['n-1'], evidenceRefs: [],
      planningClaimRefs: ['p-c-FAKE']
    }
  });
  fakeArtifact.sourceMap.planningClaims = ['p-c-FAKE'];
  const report = runStrategicGroundingGate({
    artifact: fakeArtifact,
    truth: baseTruth,
    needs: baseNeeds,
    evidence: baseEvidence,
    // The runtime input has 'p-c1' but not 'p-c-FAKE'.
    planningClaims: basePlanning
  });
  assert.ok(report.blockedCodes.includes('SG-01'), 'SG-01 must block self-authorized IDs');
});

// ---------------------------------------------------------------------------
// RTG-03 — foreign planning claim fails SG-10
// ---------------------------------------------------------------------------

test('RTG-03: foreign planningClaimRef fails SG-10', async () => {
  const { runStrategicGroundingGate } = await import(csIndexUrl);
  // The artifact cites 'p-other-project' (a foreign ID). The
  // foreignIds set declares it. The gate must block.
  const foreignArtifact = baseArtifact({
    projectUnderstanding: {
      summary: 's', coreChallenge: 'c', transformationGoal: 't',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['f-1'], needRefs: ['n-1'], evidenceRefs: [],
      planningClaimRefs: ['p-c1', 'p-foreign']
    }
  });
  // The runtime input has BOTH ids (otherwise SG-01 would block first).
  const planning = [
    ...basePlanning,
    {
      claimId: 'p-foreign', key: 'industry', value: 'foreign',
      epistemicClass: 'FACT', sourceDocumentId: 'foreign-s', chunkRefs: ['fc-1']
    }
  ];
  foreignArtifact.sourceMap.planningClaims = ['p-c1', 'p-foreign'];
  const report = runStrategicGroundingGate({
    artifact: foreignArtifact,
    truth: baseTruth,
    needs: baseNeeds,
    evidence: baseEvidence,
    planningClaims: planning,
    foreignIds: {
      factIds: new Set(),
      needIds: new Set(),
      evidenceIds: new Set(),
      planningClaimIds: new Set(['p-foreign'])
    }
  });
  assert.ok(report.blockedCodes.includes('SG-10'), `expected SG-10 in blocked codes: ${report.blockedCodes.join(',')}`);
});

// ---------------------------------------------------------------------------
// RTG-04 — SG-11 minimum usage
// ---------------------------------------------------------------------------

test('RTG-04 (SG-11): when planning input is present, projectUnderstanding MUST cite >=1 planningClaimRef', async () => {
  const { runStrategicGroundingGate } = await import(csIndexUrl);
  // Force a violation: planning input is present, but
  // projectUnderstanding has empty planningClaimRefs.
  // To bypass SG-01 we make tensions[0] and insights[0] use p-c1.
  const a = baseArtifact({
    projectUnderstanding: {
      summary: 's', coreChallenge: 'c', transformationGoal: 't',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['f-1'], needRefs: ['n-1'], evidenceRefs: [],
      planningClaimRefs: [] // <- empty, SG-11 should block
    }
  });
  const report = runStrategicGroundingGate({
    artifact: a,
    truth: baseTruth,
    needs: baseNeeds,
    evidence: baseEvidence,
    planningClaims: basePlanning
  });
  assert.ok(report.blockedCodes.includes('SG-11'), `expected SG-11 in blocked codes: ${report.blockedCodes.join(',')}`);
});

test('RTG-05 (SG-11): when planning input is present, at least 1 tension or insight MUST cite a planningClaimRef', async () => {
  const { runStrategicGroundingGate } = await import(csIndexUrl);
  // projectUnderstanding cites 1, but no tension/insight does.
  // We need to bypass the "empty planningClaimRefs on PU" branch.
  const a = baseArtifact();
  // Strip the planningClaimRefs from tensions/insights/opportunities.
  for (const t of a.tensions) t.planningClaimRefs = [];
  for (const i of a.insights) i.planningClaimRefs = [];
  for (const o of a.opportunities) o.planningClaimRefs = [];
  // PU still has it (so the "PU must cite" branch is satisfied).
  a.projectUnderstanding.planningClaimRefs = ['p-c1'];
  const report = runStrategicGroundingGate({
    artifact: a,
    truth: baseTruth,
    needs: baseNeeds,
    evidence: baseEvidence,
    planningClaims: basePlanning
  });
  assert.ok(report.blockedCodes.includes('SG-11'), `expected SG-11 in blocked codes: ${report.blockedCodes.join(',')}`);
});

test('RTG-06 (SG-11): when planning input is ABSENT, the minimum-usage gate is not triggered', async () => {
  const { runStrategicGroundingGate } = await import(csIndexUrl);
  const a = baseArtifact();
  // No planningClaims input.
  const report = runStrategicGroundingGate({
    artifact: a,
    truth: baseTruth,
    needs: baseNeeds,
    evidence: baseEvidence
    // planningClaims: undefined
  });
  // SG-11 must not be in blocked codes.
  assert.ok(!report.blockedCodes.includes('SG-11'), 'SG-11 must not trigger without planning input');
});
