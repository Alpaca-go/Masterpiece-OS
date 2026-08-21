/**
 * CI-W1C.7.5-R1 — Runtime Grounding Authority Tests (RGA-01..06).
 *
 * Per spec PART L §50:
 *   RGA-01 fake needRef not authorized by model sourceMap
 *   RGA-02 fake evidenceRef not authorized by model sourceMap
 *   RGA-03 fake factRef not authorized by model sourceMap
 *   RGA-04 fake planningClaimRef not authorized
 *   RGA-05 real runtime refs pass
 *   RGA-06 sourceMap mismatch triggers deterministic block
 *
 * These tests cover Goal D of the R1 spec — the gate derives
 * grounding authority from RUNTIME carriers, not from the
 * model-emitted sourceMap. SG-13/14/15 are the sourceMap
 * consistency gates (mirror check).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const csIndexUrl = pathToFileURL(
  path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')
).href;

async function loadGate() {
  return import(csIndexUrl);
}

function buildArtifact(args) {
  return {
    schemaVersion: '0.1',
    projectId: 'rga-proj',
    promptVersion: 'ci-w1c.7.4-strategic-synthesis-v0.3',
    generatedAt: '2026-08-21T00:00:00.000Z',
    sourceMap: {
      planningTruth: args.planningTruth ?? [],
      userRequirements: args.userRequirements ?? [],
      lockedIdentity: args.lockedIdentity ?? [],
      prohibitedDirections: args.prohibitedDirections ?? [],
      needs: args.needs ?? [],
      evidence: args.evidence ?? [],
      planningClaims: args.planningClaims ?? [],
      legacyVisualEvidenceExcluded: ['visualAsset.*', 'old_visual_style', 'old_VI', 'old_poster', 'old_packaging', 'old_spatial', 'style_reference', 'structure_reference', 'spatial_reference']
    },
    projectUnderstanding: args.projectUnderstanding ?? {
      summary: 'sum', coreChallenge: 'cc', transformationGoal: 'tg',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: [], needRefs: [], evidenceRefs: [], planningClaimRefs: []
    },
    tensions: args.tensions ?? [],
    insights: args.insights ?? [],
    opportunities: args.opportunities ?? [],
    diagnostics: [],
    meta: { attempt: 1, provider: null, model: null, modelCallCount: 1 }
  };
}

const RUNTIME = {
  truth: {
    projectId: 'rga-proj',
    facts: [
      { id: 'fact-1', key: 'brand.name', value: 'X', authority: 'USER_CONFIRMED', sourceRefs: [], truthClass: 'fact' },
      { id: 'fact-2', key: 'business.industry', value: 'Y', authority: 'USER_CONFIRMED', sourceRefs: [], truthClass: 'fact' }
    ],
    conflicts: [],
    sourceRefs: [],
    schemaVersion: 'project-truth-v0.1',
    generatedAt: '2026-08-21T00:00:00.000Z'
  },
  needs: [
    { id: 'need-1', type: 'identity', status: 'required', priority: 3, statement: 'preserve', createdAt: '2026-08-21T00:00:00.000Z' }
  ],
  evidence: {
    schemaVersion: '0.1',
    projectId: 'rga-proj',
    generatedAt: '2026-08-21T00:00:00.000Z',
    entries: [
      { id: 'ev-1', type: 'document_section', sourceType: 'doc', isReferenceEvidence: false },
      { id: 'ev-2', type: 'project_metadata', sourceType: 'project', isReferenceEvidence: false }
    ]
  }
};

test('RGA-01: fake needRef in artifact is NOT authorized by model sourceMap (SG-01 fires)', async () => {
  const m = await loadGate();
  // Model emits needRef 'need-fake-zzz' in artifact but does NOT
  // list it in sourceMap.needs. The gate must block on SG-01
  // because the runtime carrier (needs=[need-1]) does not
  // contain it. The model sourceMap cannot self-authorize.
  const artifact = buildArtifact({
    projectUnderstanding: {
      summary: 'sum', coreChallenge: 'cc', transformationGoal: 'tg',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-1'], needRefs: ['need-fake-zzz'], evidenceRefs: [], planningClaimRefs: []
    },
    needs: [], // runtime = empty; artifact ref is fake
    evidence: ['ev-1'],
    planningTruth: ['fact-1']
  });
  const report = m.runStrategicGroundingGate({ artifact, truth: RUNTIME.truth, needs: RUNTIME.needs, evidence: RUNTIME.evidence });
  assert.ok(report.blockedCodes.includes('SG-01'),
    `expected SG-01; got ${JSON.stringify(report.blockedCodes)}`);
});

test('RGA-02: fake evidenceRef is NOT authorized by model sourceMap (SG-01 fires)', async () => {
  const m = await loadGate();
  const artifact = buildArtifact({
    insights: [{
      id: 'i0', statement: 'x', implication: 'x', whyThisProject: 'x',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-1'], needRefs: [], evidenceRefs: ['ev-fake-zzz'], planningClaimRefs: []
    }],
    evidence: [] // runtime = empty; ref is fake
  });
  const report = m.runStrategicGroundingGate({ artifact, truth: RUNTIME.truth, needs: RUNTIME.needs, evidence: RUNTIME.evidence });
  assert.ok(report.blockedCodes.includes('SG-01'),
    `expected SG-01; got ${JSON.stringify(report.blockedCodes)}`);
});

test('RGA-03: fake factRef is NOT authorized by model sourceMap (SG-01 fires)', async () => {
  const m = await loadGate();
  const artifact = buildArtifact({
    projectUnderstanding: {
      summary: 'sum', coreChallenge: 'cc', transformationGoal: 'tg',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-fake-zzz'], needRefs: [], evidenceRefs: [], planningClaimRefs: []
    },
    planningTruth: [] // runtime sourceMap = empty; ref is fake
  });
  const report = m.runStrategicGroundingGate({ artifact, truth: RUNTIME.truth, needs: RUNTIME.needs, evidence: RUNTIME.evidence });
  assert.ok(report.blockedCodes.includes('SG-01'),
    `expected SG-01; got ${JSON.stringify(report.blockedCodes)}`);
});

test('RGA-04: fake planningClaimRef is NOT authorized (SG-01 + SG-12 fire)', async () => {
  const m = await loadGate();
  // Planning input has 1 real claim; artifact cites a fake
  // planningClaimRef AND a real factRef/needRef/evidenceRef so
  // SG-06 (PU has trace) and SG-11 minimum-usage do not fire.
  // The model sourceMap PLANNING CLAIMS field mirrors the
  // runtime (so SG-12 does not fire on that); the FAKE ref is
  // detected by SG-01.
  const planningClaims = [
    { claimId: 'plc-real-1', key: 'industry', value: 'medical_aesthetic',
      epistemicClass: 'FACT', sourceDocumentId: 'd1', chunkRefs: ['c1'],
      confidence: 0.8 }
  ];
  const artifact = buildArtifact({
    projectUnderstanding: {
      summary: 'sum', coreChallenge: 'cc', transformationGoal: 'tg',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-1'], needRefs: ['need-1'], evidenceRefs: ['ev-1'],
      planningClaimRefs: ['plc-real-1', 'plc-fake-zzz']
    },
    tensions: [{
      id: 't0', statement: 'x', poleA: 'x', poleB: 'y', whyItMatters: 'x',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-1'], needRefs: ['need-1'],
      planningClaimRefs: ['plc-real-1']
    }],
    insights: [{
      id: 'i0', statement: 'x', implication: 'x', whyThisProject: 'x',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-1'], needRefs: ['need-1'], evidenceRefs: ['ev-1'],
      planningClaimRefs: ['plc-real-1']
    }],
    opportunities: [{
      id: 'o0', title: 'x', thesis: 'x', strategicMechanism: 'x', whyThisProject: 'x',
      risk: [], insightRefs: ['i0'], factRefs: ['fact-1'],
      planningClaimRefs: ['plc-real-1']
    }],
    // sourceMap mirrors runtime so SG-13/14/15 do not fire.
    planningTruth: ['fact-1', 'fact-2'], needs: ['need-1'], evidence: ['ev-1', 'ev-2'],
    planningClaims: ['plc-real-1'] // audit copy of the 1 real claim
  });
  const report = m.runStrategicGroundingGate({
    artifact, truth: RUNTIME.truth, needs: RUNTIME.needs, evidence: RUNTIME.evidence,
    planningClaims
  });
  assert.ok(report.blockedCodes.includes('SG-01'),
    `expected SG-01 (fake plc-fake-zzz); got ${JSON.stringify(report.blockedCodes)}`);
  assert.ok(!report.blockedCodes.includes('SG-12'),
    `SG-12 should NOT fire (sourceMap mirrors runtime); got ${JSON.stringify(report.blockedCodes)}`);
  assert.ok(!report.blockedCodes.includes('SG-13'),
    `SG-13 should NOT fire (planningTruth mirrored); got ${JSON.stringify(report.blockedCodes)}`);
  assert.ok(!report.blockedCodes.includes('SG-14'),
    `SG-14 should NOT fire (needs mirrored); got ${JSON.stringify(report.blockedCodes)}`);
  assert.ok(!report.blockedCodes.includes('SG-15'),
    `SG-15 should NOT fire (evidence mirrored); got ${JSON.stringify(report.blockedCodes)}`);
});

test('RGA-05: real runtime refs pass (SG-01 / SG-12 / SG-13/14/15 all PASS)', async () => {
  const m = await loadGate();
  // All refs come from runtime carriers; sourceMap mirrors
  // runtime exactly. Expect 0 blocks.
  const planningClaims = [
    { claimId: 'plc-real-1', key: 'industry', value: 'medical_aesthetic',
      epistemicClass: 'FACT', sourceDocumentId: 'd1', chunkRefs: ['c1'],
      confidence: 0.8 }
  ];
  const artifact = buildArtifact({
    projectUnderstanding: {
      summary: 'sum', coreChallenge: 'cc', transformationGoal: 'tg',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-1', 'fact-2'], needRefs: ['need-1'],
      evidenceRefs: ['ev-1', 'ev-2'],
      planningClaimRefs: ['plc-real-1']
    },
    tensions: [{
      id: 't0', statement: 'x', poleA: 'x', poleB: 'y', whyItMatters: 'x',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-1', 'fact-2'], needRefs: ['need-1'],
      planningClaimRefs: ['plc-real-1']
    }],
    insights: [{
      id: 'i0', statement: 'x', implication: 'x', whyThisProject: 'x',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-1', 'fact-2'], needRefs: ['need-1'],
      evidenceRefs: ['ev-1', 'ev-2'],
      planningClaimRefs: ['plc-real-1']
    }],
    opportunities: [{
      id: 'o0', title: 'x', thesis: 'x', strategicMechanism: 'x', whyThisProject: 'x',
      risk: [], insightRefs: ['i0'], factRefs: ['fact-1', 'fact-2'],
      planningClaimRefs: ['plc-real-1']
    }],
    // sourceMap EXACTLY mirrors runtime carriers.
    planningTruth: ['fact-1', 'fact-2'], needs: ['need-1'],
    evidence: ['ev-1', 'ev-2'],
    planningClaims: ['plc-real-1']
  });
  const report = m.runStrategicGroundingGate({
    artifact, truth: RUNTIME.truth, needs: RUNTIME.needs, evidence: RUNTIME.evidence,
    planningClaims
  });
  assert.equal(report.blockedCodes.length, 0,
    `expected no blocks; got ${JSON.stringify(report.blockedCodes)}`);
});

test('RGA-06: sourceMap mismatch (runtime != model sourceMap) triggers SG-13/14/15', async () => {
  const m = await loadGate();
  // Runtime has 2 facts; model sourceMap has 1.
  // Runtime has 1 need; model sourceMap has 0.
  // Runtime has 2 evidence; model sourceMap has 1.
  const artifact = buildArtifact({
    projectUnderstanding: {
      summary: 'sum', coreChallenge: 'cc', transformationGoal: 'tg',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-1', 'fact-2'], needRefs: ['need-1'], evidenceRefs: ['ev-1', 'ev-2'],
      planningClaimRefs: []
    },
    planningTruth: ['fact-1'],   // missing fact-2
    needs: [],                   // missing need-1
    evidence: ['ev-1']          // missing ev-2
  });
  const report = m.runStrategicGroundingGate({
    artifact, truth: RUNTIME.truth, needs: RUNTIME.needs, evidence: RUNTIME.evidence
  });
  assert.ok(report.blockedCodes.includes('SG-13'),
    `expected SG-13 (planningTruth mismatch); got ${JSON.stringify(report.blockedCodes)}`);
  assert.ok(report.blockedCodes.includes('SG-14'),
    `expected SG-14 (needs mismatch); got ${JSON.stringify(report.blockedCodes)}`);
  assert.ok(report.blockedCodes.includes('SG-15'),
    `expected SG-15 (evidence mismatch); got ${JSON.stringify(report.blockedCodes)}`);
});
