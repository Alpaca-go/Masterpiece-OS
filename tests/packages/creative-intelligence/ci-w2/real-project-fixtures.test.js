// CI-W2 Part Q: Generic real-project-derived Anchor Production fixtures.
//
// These are PROJECT-AGNOSTIC structural fixtures modeled on the shape
// of real CI-W2 candidate runs for the two known real projects
// ("九州美学" / "一剂良方"). They are intentionally NOT named after
// any specific brand, but their visual/structural shape — Direction
// family, locked assets, prohibited mutations — is identical to what
// the real runs produced. Each fixture pins the gate outcome so a
// future refactor that regresses CI-W2's hard acceptance fails fast.
//
// The full real-project end-to-end retest ("九州美学" / "一剂良方")
// is the user-authorized retest from PART Q; it is NOT a unit
// fixture. See
// `docs/creative-intelligence/ci-w2/anchor-production-and-visual-confirmation.md`
// for the retest report (Part Q §18).
//
// Spec mapping (Part Q §18):
//   Q01 generic B2B brand → contract ready, 3 candidates, no auto-approval
//   Q02 generic B2C brand → contract ready, 3 candidates, no auto-approval
//   Q03 explicit user approval → ApprovedVisualAnchor exists, history
//   Q04 re-approve with different candidate → approvalRevision + 1
//   Q05 retry → does NOT replace existing approval
//   Q06 selection revision change → old approval invalidated
//   Q07 canon version change → old approval invalidated
//   Q08 no auto-selection (candidate with 0 hard-fail evaluations)

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildAnchorProductionContract } from '@masterpiece/creative-intelligence/anchor-production/index.ts';
import { createAnchorProductionService } from '@masterpiece/runtime-core/application/anchor-production-service.ts';

// ---------------------------------------------------------------------------
// Shared fixture builders
// ---------------------------------------------------------------------------

function makeSnapshot(overrides = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'p-real',
    directionId: 'dir-real-001',
    selectionRevision: 1,
    selectedAt: '2026-01-01T00:00:00.000Z',
    selectedBy: 'user',
    directionFingerprint: 'sha256:direction-real-fp',
    direction: { id: 'dir-real-001', title: 'Material-led Direction' },
    traceVersion: 'visual-canon-v0.1',
    ...overrides,
  };
}

function makeCanon(overrides = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'p-real',
    selectedDirectionId: 'dir-real-001',
    selectionRevision: 1,
    creativeThesis: 'A material-led visual world.',
    visualMechanism: 'Slow camera + close material texture + restrained typography.',
    systemHypothesis: 'The visual system can carry brand across packaging and space without copy reliance.',
    directionFamily: 'material-led',
    visualDNA: {
      structuralDNA: [{ id: 'dna-struct-real-01', category: 'structure', rule: 'Central placement', rationale: '...', invariantLevel: 'hard', directionRefs: [], factRefs: [], evidenceRefs: [] }],
      identityDNA: [{ id: 'dna-id-real-01', category: 'identity', rule: 'Single emblem', rationale: '...', invariantLevel: 'hard', directionRefs: [], factRefs: [], evidenceRefs: [] }],
      rhythmDNA: [],
      hierarchyDNA: [],
      relationDNA: [],
      requiredElementIds: ['dna-struct-real-01', 'dna-id-real-01'],
      optionalElementIds: [],
      forbiddenMutations: ['No photo-real humans', 'No AI-rendered copy'],
    },
    visualGrammar: {
      compositionRules: [{ id: 'g-comp-real-01', rule: 'Centered', allowed: [], forbidden: [], dnaRefs: ['dna-struct-real-01'], invariantLevel: 'hard' }],
      hierarchyRules: [],
      repetitionRules: [],
      transformationRules: [],
      assetUsageRules: [],
      crossMediaAdaptationRules: [],
      forbiddenCombinations: [],
      invariants: ['centered composition'],
    },
    crossMediaCanon: { invariants: ['brand mark present'], adaptations: {} },
    lockedAssetRules: [
      { id: 'rule-brand-name', assetKey: 'brand-name', severity: 'hard' },
      { id: 'rule-logo', assetKey: 'logo-001', severity: 'hard' },
    ],
    prohibitedMutations: ['No photo-real humans', 'No AI-rendered copy'],
    trace: {
      selectedDirectionRef: 'dir-real-001',
      conceptRefs: ['c-real-01'],
      opportunityRefs: [],
      insightRefs: [],
      needRefs: [],
      factRefs: [],
      evidenceRefs: [],
      selectionRevision: 1,
      directionFingerprint: 'sha256:direction-real-fp',
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
    projectId: 'p-real',
    selectedDirectionId: 'dir-real-001',
    selectionRevision: 1,
    purpose: 'Visual confirmation of the selected Creative Direction.',
    mustDemonstrate: ['Centered composition', 'Single emblem', 'Material-led texture'],
    mustPreserve: ['Brand name', 'Logo mark', 'Color palette'],
    mayExplore: ['Background lighting'],
    mustNotChange: ['No photo-real humans', 'No AI-rendered copy'],
    requiredDNARefs: ['dna-struct-real-01', 'dna-id-real-01'],
    requiredGrammarRefs: ['g-comp-real-01'],
    lockedAssetRefs: ['brand-name', 'logo-001'],
    evaluationCriteria: [
      { id: 'ev-real-01', criterion: 'Composition centered', severity: 'hard', sourceRefs: ['dna-struct-real-01'] },
      { id: 'ev-real-02', criterion: 'Brand mark present', severity: 'hard', sourceRefs: ['dna-id-real-01'] },
    ],
    status: 'ready',
    authoritative: false,
    mode: 'shadow',
    ...overrides,
  };
}

// Shape: real-project (a) — B2B service platform (analog of 九州美学)
// "高端医美全链生态平台" → 旗舰品牌空间效果图 → material-led, calm tones
const B2B_SHAPE = {
  directionFamily: 'material-led',
  creativeThesis: 'A calm, material-led visual world for a high-end B2B service platform.',
  visualMechanism: 'Slow camera + close material texture + restrained typography.',
  systemHypothesis: 'The visual system can carry brand across packaging and space without copy reliance.',
  brandName: 'B2B Service Brand',
  prohibitedMutations: ['No photo-real humans', 'No AI-rendered copy', 'No English subtitle at large size'],
  mustDemonstrate: ['Centered composition', 'Material texture (porcelain, wood)', 'Calm tone'],
  mustPreserve: ['Chinese brand name', 'Logo mark', 'Color palette'],
};

// Shape: real-project (b) — B2C packaged product (analog of 一剂良方)
// 中式滋补 / 食疗品牌 → 包装视觉升级 → food-ingredient-led
const B2C_SHAPE = {
  directionFamily: 'ingredient-led',
  creativeThesis: 'An ingredient-led visual world for a B2C packaged product brand.',
  visualMechanism: 'Close-up of natural ingredients + warm light + hand-set typography.',
  systemHypothesis: 'The visual system can carry brand across packaging without copy reliance.',
  brandName: 'B2C Product Brand',
  prohibitedMutations: ['No photo-real humans', 'No AI-rendered copy'],
  mustDemonstrate: ['Ingredient close-up', 'Warm light', 'Hand-set typography'],
  mustPreserve: ['Chinese brand name', 'Logo mark', 'Color palette'],
};

function makeParentForShape(shape, overrides = {}) {
  return {
    projectId: 'p-real',
    apiProfileId: 'profile-real',
    provider: 'dashscope',
    model: 'qwen-image',
    selectionRevision: 1,
    selectedDirectionSnapshot: makeSnapshot(),
    visualCanon: makeCanon({
      directionFamily: shape.directionFamily,
      creativeThesis: shape.creativeThesis,
      visualMechanism: shape.visualMechanism,
      systemHypothesis: shape.systemHypothesis,
    }),
    anchorContract: makeAnchorContract({
      mustDemonstrate: shape.mustDemonstrate,
      mustPreserve: shape.mustPreserve,
    }),
    ...overrides,
  };
}

function makeFakeSubmit() {
  return async (input) => {
    const cs = input.candidateIds.map((id, i) => ({
      candidateId: id,
      imageId: `img-${i + 1}`,
      imagePath: `images/img-${i + 1}.webp`,
      imageFingerprint: `sha256:img-${i + 1}`,
      sourceFingerprint: input.contract.sourceFingerprint,
      aspectRatio: '16:9',
    }));
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
    const cs = input.candidateIds.map((id, i) => ({
      candidateId: id,
      imageId: `img-retry-${i + 1}`,
      imagePath: `images/img-retry-${i + 1}.webp`,
      imageFingerprint: `sha256:img-retry-${i + 1}`,
      sourceFingerprint: input.contract.sourceFingerprint,
      aspectRatio: '16:9',
    }));
    return {
      imageGenerationRunId: `imgrun-retry-${Date.now()}`,
      providerId: input.providerId,
      modelId: input.modelId,
      candidates: cs,
      retriedCandidateIds: input.retriedCandidateIds,
    };
  };
}

function makeService(dataDir) {
  return createAnchorProductionService({
    readDataDir: async () => dataDir,
    submitAnchorGeneration: makeFakeSubmit(),
    submitAnchorRetryGeneration: makeFakeRetrySubmit(),
    cancelAnchorGeneration: async () => undefined,
    resolveLockedAssetKeys: async () => ['brand-name', 'logo-001'],
    resolveProjectBrandIdentityRefs: async () => ['brand:brand-name'],
    log: () => undefined,
  });
}

async function newTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'ci-w2-real-'));
}

// ---------------------------------------------------------------------------
// Q01: B2B platform project → contract ready, 3 candidates, no auto-approval
// ---------------------------------------------------------------------------

test('Q01: B2B platform shape (analog of 九州美学) → contract ready, 3 candidates, no auto-approval', async () => {
  const dataDir = await newTmpDir();
  try {
    // Compile the contract first
    const compileResult = buildAnchorProductionContract({
      projectId: 'p-real',
      creativeIntelligenceRunId: 'run-q01',
      candidateCount: 3,
      selectedDirectionSnapshot: makeSnapshot(),
      visualCanon: makeCanon({
        directionFamily: B2B_SHAPE.directionFamily,
        creativeThesis: B2B_SHAPE.creativeThesis,
        visualMechanism: B2B_SHAPE.visualMechanism,
        systemHypothesis: B2B_SHAPE.systemHypothesis,
      }),
      anchorContract: makeAnchorContract({
        mustDemonstrate: B2B_SHAPE.mustDemonstrate,
        mustPreserve: B2B_SHAPE.mustPreserve,
      }),
      lockedAssetKeys: ['brand-name', 'logo-001'],
      selectionRevision: 1,
    });
    assert.equal(compileResult.contract.status, 'ready', 'B2B project contract must be ready');
    assert.equal(compileResult.contract.candidateCount, 3, 'candidateCount = 3');
    assert.equal(compileResult.contract.authoritative, false, 'CI-W2 is shadow-only');
    assert.equal(compileResult.contract.mode, 'shadow');

    // Then run the orchestrator
    const service = makeService(dataDir);
    const ws = await service.startAnchorProduction('run-q01', undefined, makeParentForShape(B2B_SHAPE));
    assert.equal(ws.run.status, 'completed');
    assert.equal(ws.candidates.length, 3, '3 candidates persisted for B2B project');
    assert.equal(ws.approvedAnchor, null, 'NO auto-approval (hard invariant)');
    assert.equal(ws.approvalHistory.length, 0, 'NO approval history before explicit click');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Q02: B2C packaged product project → contract ready, 3 candidates, no auto-approval
// ---------------------------------------------------------------------------

test('Q02: B2C packaged product shape (analog of 一剂良方) → contract ready, 3 candidates, no auto-approval', async () => {
  const dataDir = await newTmpDir();
  try {
    const compileResult = buildAnchorProductionContract({
      projectId: 'p-real',
      creativeIntelligenceRunId: 'run-q02',
      candidateCount: 3,
      selectedDirectionSnapshot: makeSnapshot(),
      visualCanon: makeCanon({
        directionFamily: B2C_SHAPE.directionFamily,
        creativeThesis: B2C_SHAPE.creativeThesis,
        visualMechanism: B2C_SHAPE.visualMechanism,
        systemHypothesis: B2C_SHAPE.systemHypothesis,
      }),
      anchorContract: makeAnchorContract({
        mustDemonstrate: B2C_SHAPE.mustDemonstrate,
        mustPreserve: B2C_SHAPE.mustPreserve,
      }),
      lockedAssetKeys: ['brand-name', 'logo-001'],
      selectionRevision: 1,
    });
    assert.equal(compileResult.contract.status, 'ready', 'B2C project contract must be ready');
    assert.equal(compileResult.contract.candidateCount, 3);

    const service = makeService(dataDir);
    const ws = await service.startAnchorProduction('run-q02', undefined, makeParentForShape(B2C_SHAPE));
    assert.equal(ws.run.status, 'completed');
    assert.equal(ws.candidates.length, 3, '3 candidates persisted for B2C project');
    assert.equal(ws.approvedAnchor, null, 'NO auto-approval (hard invariant)');
    assert.equal(ws.approvalHistory.length, 0);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Q03: explicit user approval → ApprovedVisualAnchor exists, history preserved
// ---------------------------------------------------------------------------

test('Q03: explicit user approval creates ApprovedVisualAnchor and history entry', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService(dataDir);
    const ws = await service.startAnchorProduction('run-q03', undefined, makeParentForShape(B2B_SHAPE));
    // Before approval: null
    assert.equal(ws.approvedAnchor, null);
    assert.equal(ws.approvalHistory.length, 0);

    // User explicitly approves candidate 02
    const after = await service.approveAnchorCandidate('run-q03', ws.candidates[1].id, 'Manually picked for brand alignment');
    assert.ok(after.approvedAnchor, 'approvedAnchor must be set after explicit click');
    assert.equal(after.approvedAnchor.candidateId, ws.candidates[1].id);
    assert.equal(after.approvedAnchor.approvedBy, 'user');
    assert.equal(after.approvedAnchor.approvalRevision, 1);
    assert.equal(after.approvedAnchor.selectionRevision, 1);
    assert.equal(after.approvedAnchor.canonVersion, ws.run.canonVersion);
    assert.equal(after.approvedAnchor.sourceFingerprint, ws.contract.sourceFingerprint);
    assert.equal(after.approvalHistory.length, 1, 'one history entry per approval');
    assert.equal(after.approvalHistory[0].candidateId, ws.candidates[1].id);
    assert.equal(after.approvalHistory[0].revision, 1);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Q04: re-approve with different candidate → approvalRevision + 1, history preserved
// ---------------------------------------------------------------------------

test('Q04: re-approve with different candidate advances approvalRevision and preserves history', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService(dataDir);
    const ws = await service.startAnchorProduction('run-q04', undefined, makeParentForShape(B2C_SHAPE));
    const first = await service.approveAnchorCandidate('run-q04', ws.candidates[0].id, 'First pick');
    assert.equal(first.approvedAnchor.approvalRevision, 1);

    const second = await service.approveAnchorCandidate('run-q04', ws.candidates[2].id, 'Second pick — better ingredient close-up');
    assert.equal(second.approvedAnchor.approvalRevision, 2, 'approvalRevision must advance');
    assert.equal(second.approvedAnchor.candidateId, ws.candidates[2].id);
    assert.equal(second.approvalHistory.length, 2, 'history must preserve both approvals');
    assert.equal(second.approvalHistory[0].revision, 1);
    assert.equal(second.approvalHistory[1].revision, 2);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Q05: retry → does NOT replace existing approval
// ---------------------------------------------------------------------------

test('Q05: retrying image generation does NOT replace an existing approval', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService(dataDir);
    const ws = await service.startAnchorProduction('run-q05', undefined, makeParentForShape(B2B_SHAPE));
    const approved = await service.approveAnchorCandidate('run-q05', ws.candidates[0].id, 'Picked for centering');
    const approvedAnchorId = approved.approvedAnchor.candidateId;
    const approvedAt = approved.approvedAnchor.approvedAt;

    // User retries the same candidate (regenerates image bytes)
    const retried = await service.retryAnchorCandidate('run-q05', ws.candidates[0].id);
    assert.equal(retried.approvedAnchor.candidateId, approvedAnchorId, 'candidate id preserved');
    assert.equal(retried.approvedAnchor.approvedAt, approvedAt, 'approvedAt preserved');
    assert.equal(retried.approvedAnchor.approvalRevision, 1, 'approvalRevision NOT advanced by retry');
    const retriedCandidate = retried.candidates.find((c) => c.id === ws.candidates[0].id);
    assert.equal(retriedCandidate.imageId.startsWith('img-retry-'), true, 'image bytes changed');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Q06: parent selection revision change → old approval invalidated
// ---------------------------------------------------------------------------

test('Q06: parent selection revision change invalidates the previous approval', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService(dataDir);
    // The service reads the parent run from
    // <dataDir>/creative-intelligence-runs/<runId>/runtime/run.json.
    // We need to seed it with selectionRevision=1, approve, then
    // advance it to selectionRevision=2 and assert the approval is
    // invalidated.
    const runId = 'run-q06';
    const parentDir = path.join(dataDir, 'creative-intelligence-runs', runId, 'runtime');
    await fs.mkdir(parentDir, { recursive: true });
    await fs.writeFile(
      path.join(parentDir, 'run.json'),
      JSON.stringify({ selectionRevision: 1 }),
      'utf8',
    );

    const ws = await service.startAnchorProduction(runId, undefined, makeParentForShape(B2B_SHAPE));
    await service.approveAnchorCandidate(runId, ws.candidates[0].id, 'First approval');

    // Parent run's selection revision advances (e.g. user re-selected direction)
    await fs.writeFile(
      path.join(parentDir, 'run.json'),
      JSON.stringify({ selectionRevision: 2 }),
      'utf8',
    );

    const after = await service.getAnchorProduction(runId);
    assert.equal(after.approvedAnchor, null, 'approval must be invalidated on selection revision change (warnings=' + JSON.stringify(after.warnings) + ')');
    assert.ok(after.warnings.some((w) => /selection|invalidat|invalidation/i.test(String(w))),
      'must include a stale/invalidation warning (warnings=' + JSON.stringify(after.warnings) + ')');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Q07: canon version change → old approval invalidated
// ---------------------------------------------------------------------------

test('Q07: parent canon version change invalidates the previous approval', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService(dataDir);
    const runId = 'run-q07';
    // Seed the Anchor sub-run with a parent run whose canonVersion
    // matches the initial approval. Then change the Anchor sub-run's
    // canonVersion on disk (simulating Visual Canon re-issue) and
    // assert the approval is invalidated.
    const ws = await service.startAnchorProduction(runId, undefined, makeParentForShape(B2C_SHAPE));
    await service.approveAnchorCandidate(runId, ws.candidates[1].id, 'First approval');

    // Advance the Anchor sub-run's canonVersion on disk to a newer value.
    const runFile = path.join(dataDir, 'creative-intelligence-runs', runId, 'anchor-production', 'run.json');
    const runRecord = JSON.parse(await fs.readFile(runFile, 'utf8'));
    runRecord.canonVersion = 'v2.sel1.<advanced-fp>';
    await fs.writeFile(runFile, JSON.stringify(runRecord), 'utf8');

    const after = await service.getAnchorProduction(runId);
    assert.equal(after.approvedAnchor, null, 'approval must be invalidated on canon version change');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Q08: no auto-selection — generated candidate is never pre-marked "approve"
// ---------------------------------------------------------------------------

test('Q08: generated candidates are not pre-marked approveable — verdict gates are user-decided', async () => {
  // The CI package NEVER pre-decides which candidate to approve.
  // The orchestrator emits candidates with status='generated' and
  // hard verdicts in the candidate evaluation. The user MUST click
  // to advance. This test pins that the candidate record has no
  // "preApproved" / "isRecommended" / similar flag.
  const dataDir = await newTmpDir();
  try {
    const service = makeService(dataDir);
    const ws = await service.startAnchorProduction('run-q08', undefined, makeParentForShape(B2B_SHAPE));
    for (const c of ws.candidates) {
      assert.equal(c.status, 'generated', 'candidate status is generated, not approved');
      assert.equal(c.approved, undefined, 'no approved flag on generated candidate');
      assert.equal(c.preSelected, undefined, 'no preSelected flag on generated candidate');
    }
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Q09: contract carries locked asset refs for B2B and B2C shapes
// ---------------------------------------------------------------------------

test('Q09: locked asset refs surface on the contract for both project shapes', () => {
  for (const shape of [B2B_SHAPE, B2C_SHAPE]) {
    const result = buildAnchorProductionContract({
      projectId: 'p-real',
      creativeIntelligenceRunId: `run-q09-${shape.directionFamily}`,
      candidateCount: 3,
      selectedDirectionSnapshot: makeSnapshot(),
      visualCanon: makeCanon({
        directionFamily: shape.directionFamily,
        creativeThesis: shape.creativeThesis,
        visualMechanism: shape.visualMechanism,
        systemHypothesis: shape.systemHypothesis,
      }),
      anchorContract: makeAnchorContract({
        mustDemonstrate: shape.mustDemonstrate,
        mustPreserve: shape.mustPreserve,
      }),
      lockedAssetKeys: ['brand-name', 'logo-001'],
      selectionRevision: 1,
    });
    assert.equal(result.contract.status, 'ready');
    assert.ok(result.contract.lockedAssetRuleRefs.includes('brand-name'),
      `brand-name locked for ${shape.directionFamily}`);
    assert.ok(result.contract.lockedAssetRuleRefs.includes('logo-001'),
      `logo-001 locked for ${shape.directionFamily}`);
  }
});

// ---------------------------------------------------------------------------
// Q10: candidate evaluations are emitted for all 3 candidates
// ---------------------------------------------------------------------------

test('Q10: 3 candidates × evaluations — one evaluation record per candidate with structured verdicts', async () => {
  const dataDir = await newTmpDir();
  try {
    const service = makeService(dataDir);
    const ws = await service.startAnchorProduction('run-q10', undefined, makeParentForShape(B2B_SHAPE));
    assert.equal(ws.candidates.length, 3);
    for (const c of ws.candidates) {
      assert.ok(c.evaluation, `candidate ${c.id} has an evaluation record`);
      // The evaluation emits 7 structured fields, all pass|warning|fail.
      assert.ok(['pass', 'warning', 'fail'].includes(c.evaluation.visualMechanism),
        `visualMechanism verdict on ${c.id}`);
      assert.ok(['pass', 'warning', 'fail'].includes(c.evaluation.composition),
        `composition verdict on ${c.id}`);
      assert.ok(['pass', 'warning', 'fail'].includes(c.evaluation.identitySafety),
        `identitySafety verdict on ${c.id}`);
      assert.ok(['pass', 'warning', 'fail'].includes(c.evaluation.lockedAssetSafety),
        `lockedAssetSafety verdict on ${c.id}`);
      assert.ok(Array.isArray(c.evaluation.warnings), 'warnings is an array');
      assert.ok(Array.isArray(c.evaluation.blockedReasonCodes), 'blockedReasonCodes is an array');
    }
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
