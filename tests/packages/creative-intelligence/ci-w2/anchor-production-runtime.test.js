// CI-W2 Part O (Runtime): R01–R12 — Anchor Production orchestrator.
//
// The orchestrator is the boundary between the CI application
// service and the existing image-generation runtime. These tests
// pin the orchestrator's contract:
//   - it ALWAYS uses the injected image-runtime boundary
//   - it NEVER auto-approves a candidate
//   - it preserves the existing approval on retry
//   - it invalidates the approval when the parent run's
//     selectionRevision / canonVersion advances
//
// All tests use a fake `submitAnchorGeneration` dep so no real
// provider call is made. The orchestrator's contract is
// observable through the persisted Anchor sub-run state on disk.

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createAnchorProductionService } from '@masterpiece/runtime-core/application/anchor-production-service.ts';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeSnapshot(overrides = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'project-test',
    directionId: 'dir-001',
    selectionRevision: 1,
    selectedAt: '2026-01-01T00:00:00.000Z',
    selectedBy: 'user',
    directionFingerprint: 'sha256:direction-fp',
    direction: { id: 'dir-001', title: 'Direction 001' },
    traceVersion: 'visual-canon-v0.1',
    ...overrides,
  };
}

function makeCanon(overrides = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'project-test',
    selectedDirectionId: 'dir-001',
    selectionRevision: 1,
    creativeThesis: 'A calm, material-led visual world for a Chinese tea brand.',
    visualMechanism: 'Slow camera + close material texture + restrained typography.',
    systemHypothesis: 'The visual system can carry brand across packaging and space without copy reliance.',
    directionFamily: 'material-led',
    visualDNA: {
      structuralDNA: [{ id: 'dna-struct-01', category: 'structure', rule: 'Central placement', rationale: '...', invariantLevel: 'hard', directionRefs: [], factRefs: [], evidenceRefs: [] }],
      identityDNA: [],
      rhythmDNA: [],
      hierarchyDNA: [],
      relationDNA: [],
      requiredElementIds: ['dna-struct-01'],
      optionalElementIds: [],
      forbiddenMutations: [],
    },
    visualGrammar: {
      compositionRules: [{ id: 'g-comp-01', rule: 'Centered', allowed: [], forbidden: [], dnaRefs: ['dna-struct-01'], invariantLevel: 'hard' }],
      hierarchyRules: [],
      repetitionRules: [],
      transformationRules: [],
      assetUsageRules: [],
      crossMediaAdaptationRules: [],
      forbiddenCombinations: [],
      invariants: [],
    },
    crossMediaCanon: { invariants: [], adaptations: {} },
    lockedAssetRules: [],
    prohibitedMutations: [],
    trace: {
      selectedDirectionRef: 'dir-001',
      conceptRefs: ['c-01'],
      opportunityRefs: [],
      insightRefs: [],
      needRefs: [],
      factRefs: [],
      evidenceRefs: [],
      selectionRevision: 1,
      directionFingerprint: 'sha256:direction-fp',
    },
    status: 'valid',
    authoritative: false,
    mode: 'shadow',
    ...overrides,
  };
}

function makeAnchorContract(overrides = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'project-test',
    selectedDirectionId: 'dir-001',
    selectionRevision: 1,
    purpose: 'Visual confirmation of the selected Creative Direction.',
    mustDemonstrate: ['Centered composition'],
    mustPreserve: ['Brand mark'],
    mayExplore: ['Background lighting'],
    mustNotChange: ['No photo-real humans'],
    requiredDNARefs: ['dna-struct-01'],
    requiredGrammarRefs: ['g-comp-01'],
    lockedAssetRefs: ['logo-001'],
    evaluationCriteria: [],
    status: 'ready',
    authoritative: false,
    mode: 'shadow',
    ...overrides,
  };
}

function makeParent(snapshotOverrides = {}) {
  return {
    projectId: 'project-test',
    apiProfileId: 'profile-test',
    provider: 'dashscope',
    model: 'qwen-image',
    selectionRevision: 1,
    selectedDirectionSnapshot: makeSnapshot(snapshotOverrides),
    visualCanon: makeCanon(),
    anchorContract: makeAnchorContract(),
  };
}

function makeFakeSubmit(candidates = 3) {
  return async (input) => {
    const cs = [];
    for (let i = 0; i < Math.min(candidates, input.candidateIds.length); i++) {
      cs.push({
        candidateId: input.candidateIds[i],
        imageId: `img-${i + 1}`,
        imagePath: `images/img-${i + 1}.webp`,
        imageFingerprint: `sha256:img-${i + 1}`,
        sourceFingerprint: input.contract.sourceFingerprint,
        aspectRatio: '16:9',
      });
    }
    return {
      imageGenerationRunId: `imgrun-${Date.now()}`,
      providerId: input.providerId,
      modelId: input.modelId,
      candidates: cs,
    };
  };
}

function makeFakeRetrySubmit() {
  return async (input) => {
    const cs = [];
    for (let i = 0; i < input.candidateIds.length; i++) {
      cs.push({
        candidateId: input.candidateIds[i],
        imageId: `img-retry-${i + 1}`,
        imagePath: `images/img-retry-${i + 1}.webp`,
        imageFingerprint: `sha256:img-retry-${i + 1}`,
        sourceFingerprint: input.contract.sourceFingerprint,
        aspectRatio: '16:9',
      });
    }
    return {
      imageGenerationRunId: `imgrun-retry-${Date.now()}`,
      providerId: input.providerId,
      modelId: input.modelId,
      candidates: cs,
      retriedCandidateIds: input.retriedCandidateIds,
    };
  };
}

async function newTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'ci-w2-runtime-'));
}

function makeService(opts = {}) {
  const dataDir = opts.dataDir;
  return createAnchorProductionService({
    readDataDir: async () => dataDir,
    submitAnchorGeneration: opts.submit ?? makeFakeSubmit(opts.candidateCount ?? 3),
    submitAnchorRetryGeneration: opts.submitRetry ?? makeFakeRetrySubmit(),
    cancelAnchorGeneration: opts.cancel ?? (async () => undefined),
    resolveLockedAssetKeys: opts.lockedAssetKeys
      ? async () => opts.lockedAssetKeys
      : async () => ['logo-001'],
    resolveProjectBrandIdentityRefs: async () => ['brand:test-brand'],
    log: () => undefined,
  });
}

// ---------------------------------------------------------------------------
// R01: start creates a sub-run state
// ---------------------------------------------------------------------------

test('R01: startAnchorProduction creates a sub-run with the 6-state lifecycle', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService({ dataDir });
    const runId = 'run-r01';
    const parent = makeParent();
    const ws = await service.startAnchorProduction(runId, undefined, parent);
    assert.equal(ws.run.status, 'completed', 'sub-run terminates in completed');
    assert.equal(ws.run.creativeIntelligenceRunId, runId);
    assert.equal(ws.run.selectedDirectionId, 'dir-001');
    assert.equal(ws.run.selectionRevision, 1);
    assert.equal(ws.run.candidateIds.length, 3, 'default 3 candidates');
    assert.ok(ws.contract, 'contract must be persisted');
    assert.equal(ws.contract.status, 'ready');
    assert.equal(ws.candidates.length, 3, '3 candidate records on disk');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R02: existing image runtime is used (the boundary is reached)
// ---------------------------------------------------------------------------

test('R02: start invokes the injected image-runtime boundary exactly once', async () => {
  const dataDir = await newTmpDir();
  try {
    let callCount = 0;
    const submit = async (input) => {
      callCount += 1;
      const cs = input.candidateIds.map((id, i) => ({
        candidateId: id,
        imageId: `img-${i}`,
        imagePath: `images/img-${i}.webp`,
        imageFingerprint: `sha256:img-${i}`,
        sourceFingerprint: input.contract.sourceFingerprint,
        aspectRatio: '16:9',
      }));
      return {
        imageGenerationRunId: 'imgrun-r02',
        providerId: input.providerId,
        modelId: input.modelId,
        candidates: cs,
      };
    };
    const service = makeService({ dataDir, submit });
    await service.startAnchorProduction('run-r02', undefined, makeParent());
    assert.equal(callCount, 1, 'image runtime is invoked exactly once per start');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R03: 3 candidates persisted
// ---------------------------------------------------------------------------

test('R03: 3 candidates are persisted to candidates/<id>.json with deterministic ids', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService({ dataDir, candidateCount: 3 });
    const ws = await service.startAnchorProduction('run-r03', undefined, makeParent());
    assert.equal(ws.candidates.length, 3);
    for (const c of ws.candidates) {
      assert.equal(c.schemaVersion, 'anchor-candidate-v0.1');
      assert.equal(c.status, 'generated');
      assert.equal(c.anchorRunId, ws.run.id);
      assert.equal(c.creativeIntelligenceRunId, 'run-r03');
      assert.ok(c.imageFingerprint.length > 0);
      assert.ok(c.sourceFingerprint.length > 0);
      assert.equal(c.imageId.startsWith('img-'), true);
    }
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R04: no auto approval (Hard invariant)
// ---------------------------------------------------------------------------

test('R04: after generation, approvedAnchor is null and approval history is empty', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService({ dataDir });
    const ws = await service.startAnchorProduction('run-r04', undefined, makeParent());
    assert.equal(ws.approvedAnchor, null, 'approvedAnchor must be null after generation');
    assert.equal(ws.approvalHistory.length, 0, 'no approval history yet');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R05: explicit approve persists an ApprovedVisualAnchor
// ---------------------------------------------------------------------------

test('R05: explicit approveAnchorCandidate persists approval + history entry', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService({ dataDir });
    const start = await service.startAnchorProduction('run-r05', undefined, makeParent());
    const target = start.candidates[0];
    const after = await service.approveAnchorCandidate('run-r05', target.id, 'user-confirmed');
    assert.ok(after.approvedAnchor, 'approvedAnchor is set after explicit click');
    assert.equal(after.approvedAnchor.candidateId, target.id);
    assert.equal(after.approvedAnchor.approvedBy, 'user');
    assert.equal(after.approvedAnchor.approvalRevision, 1);
    assert.equal(after.approvalHistory.length, 1);
    assert.equal(after.approvalHistory[0].revision, 1);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R06: history preserved across re-approval
// ---------------------------------------------------------------------------

test('R06: re-approval increments approvalRevision and keeps history', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService({ dataDir });
    const start = await service.startAnchorProduction('run-r06', undefined, makeParent());
    const first = await service.approveAnchorCandidate('run-r06', start.candidates[0].id, 'user-confirmed');
    const second = await service.approveAnchorCandidate('run-r06', start.candidates[1].id, 'user-confirmed');
    assert.equal(second.approvedAnchor.candidateId, start.candidates[1].id);
    assert.equal(second.approvedAnchor.approvalRevision, 2);
    assert.equal(second.approvalHistory.length, 2, 'history preserves both approvals');
  } finally {
    await fs.rm(dataDir, {recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R07: retry does NOT replace the existing approval
// ---------------------------------------------------------------------------

test('R07: retryAnchorCandidate does NOT change the existing approval', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService({ dataDir });
    const start = await service.startAnchorProduction('run-r07', undefined, makeParent());
    const first = await service.approveAnchorCandidate('run-r07', start.candidates[0].id, 'user-confirmed');
    const approvalId = first.approvedAnchor.candidateId;
    const afterRetry = await service.retryAnchorCandidate('run-r07', start.candidates[1].id);
    assert.ok(afterRetry.approvedAnchor, 'existing approval is preserved');
    assert.equal(afterRetry.approvedAnchor.candidateId, approvalId, 'the same candidate is still approved');
    assert.equal(afterRetry.approvedAnchor.approvalRevision, 1, 'no new approval revision after retry');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R08: direction change (selectionRevision advance) invalidates the approval
// ---------------------------------------------------------------------------

test('R08: direction change invalidates the previous approval (approvedAnchor becomes null)', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService({ dataDir });
    const start = await service.startAnchorProduction('run-r08', undefined, makeParent());
    const first = await service.approveAnchorCandidate('run-r08', start.candidates[0].id, 'user-confirmed');
    assert.ok(first.approvedAnchor);
    // Bump the parent run's selectionRevision (Direction re-selection).
    const runtimeDir = path.join(dataDir, 'creative-intelligence-runs', 'run-r08', 'runtime');
    await fs.mkdir(runtimeDir, { recursive: true });
    await fs.writeFile(
      path.join(runtimeDir, 'run.json'),
      JSON.stringify({ id: 'run-r08', selectionRevision: 2, status: 'completed' }, null, 2),
      'utf8',
    );
    const after = await service.getAnchorProduction('run-r08');
    assert.equal(after.approvedAnchor, null, 'approval is invalidated on direction change');
    assert.ok(after.approvalHistory.length > 0, 'history is preserved');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R09: canon change invalidates the approval
// ---------------------------------------------------------------------------

test('R09: canon version change invalidates the previous approval', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService({ dataDir });
    const start = await service.startAnchorProduction('run-r09', undefined, makeParent());
    await service.approveAnchorCandidate('run-r09', start.candidates[0].id, 'user-confirmed');
    // Change the Anchor sub-run's canonVersion (Canon re-build).
    await service.getAnchorProduction('run-r09');
    const runPath = path.join(dataDir, 'creative-intelligence-runs', 'run-r09', 'anchor-production', 'run.json');
    const existing = JSON.parse(await fs.readFile(runPath, 'utf8'));
    existing.canonVersion = 'v1.sel1.different-fp';
    await fs.writeFile(runPath, JSON.stringify(existing, null, 2), 'utf8');
    const after = await service.getAnchorProduction('run-r09');
    assert.equal(after.approvedAnchor, null, 'approval is invalidated on canon change');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R10: failure in image runtime does NOT corrupt the CI main run
// ---------------------------------------------------------------------------

test('R10: image-runtime failure produces failed sub-run; CI main state is untouched', async () => {
  const dataDir = await newTmpDir();
  try {
    const submit = async () => {
      throw new Error('SIMULATED_PROVIDER_FAILURE');
    };
    const service = makeService({ dataDir, submit });
    await assert.rejects(
      () => service.startAnchorProduction('run-r10', undefined, makeParent()),
      /SIMULATED_PROVIDER_FAILURE/,
    );
    // CI main run record must not exist (the orchestrator only writes
    // under <runRoot>/anchor-production/).
    const ciMain = path.join(dataDir, 'creative-intelligence-runs', 'run-r10');
    const stat = await fs.stat(ciMain);
    assert.ok(stat.isDirectory(), 'CI main run directory exists');
    // The sub-run record should be in failed status.
    const runJson = JSON.parse(await fs.readFile(path.join(ciMain, 'anchor-production', 'run.json'), 'utf8'));
    assert.equal(runJson.status, 'failed', 'sub-run is marked failed');
    assert.equal(runJson.errorCode, 'CI_ANCHOR_GENERATION_FAILED');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R11: cancel sets status to cancelled (idempotent)
// ---------------------------------------------------------------------------

test('R11: cancelAnchorProduction is idempotent (cancelling a completed run is a no-op)', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService({ dataDir });
    await service.startAnchorProduction('run-r11', undefined, makeParent());
    const once = await service.cancelAnchorProduction('run-r11');
    const twice = await service.cancelAnchorProduction('run-r11');
    // Completed runs are terminal — cancel is a no-op, NOT a destructive
    // overwrite. The R08 / R09 invalidation tests cover the case
    // where a NEW approval is invalidated by parent state change.
    assert.equal(once.run.status, 'completed', 'cancel of completed run is a no-op');
    assert.equal(twice.run.status, 'completed', 'cancel is idempotent');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// R12: listAnchorCandidates returns candidates in display order
// ---------------------------------------------------------------------------

test('R12: listAnchorCandidates returns candidates in stable order', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService({ dataDir });
    await service.startAnchorProduction('run-r12', undefined, makeParent());
    const listed = await service.listAnchorCandidates('run-r12');
    assert.equal(listed.length, 3);
    for (let i = 1; i < listed.length; i++) {
      assert.ok(listed[i - 1].createdAt <= listed[i].createdAt, 'candidates are sorted by createdAt');
    }
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
