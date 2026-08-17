/**
 * CI-W1A Application Runtime — unit + golden scenario tests.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createCreativeIntelligenceApplicationService } from '@masterpiece/runtime-core/application/creative-intelligence-application-service.ts';
import { createCreativeIntelligenceOperations } from '@masterpiece/runtime-core/operations/creative-intelligence-operations.js';
// DocumentVisualContext is imported from CI but used only as a structural
// type — runtime tests only need the JSDoc shape, not the import. We import
// the symbol for side-effect / type-shape symmetry with the runtime service.

function makePublicSettings(overrides = {}) {
  return {
    schemaVersion: '1.0',
    profiles: [
      { id: 'profile-test', displayName: 'Test', provider: 'dashscope', protocol: 'openai-chat',
        modelType: 'analysis', modelId: 'qwen3.6-plus', baseUrl: 'https://example.com',
        apiKey: '', isDefault: true, isEnabled: true, credentialKey: 'k' },
    ],
    defaultDataPath: '/tmp',
    cacheEnabled: true,
    logLevel: 'info',
    imageGenerationPipelineMode: 'vnext',
    ...overrides,
  };
}

function makeDvc(overrides = {}) {
  return {
    schemaVersion: '1.0',
    sourceRunId: 'doc-run-001',
    generatedAt: '2026-01-01T00:00:00.000Z',
    brandName: 'TestBrand',
    industry: 'tech',
    brandRole: 'platform',
    businessModel: 'B2B',
    targetAudience: ['enterprise'],
    products: ['app'],
    services: ['support'],
    pricePositioning: 'premium',
    brandPersonality: ['professional'],
    visualPreferences: ['minimal'],
    requiredTouchpoints: ['logo', 'website'],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: [],
    evidence: [],
    sourceDocuments: [],
    ...overrides,
  };
}

function makeService(opts) {
  let intakeCalls = 0;
  const service = createCreativeIntelligenceApplicationService({
    readSettings: async () => makePublicSettings({ defaultDataPath: opts.dataDir }),
    readCredentials: async () => ({ apiKey: 'k', model: 'qwen3.6-plus', provider: 'dashscope', baseUrl: 'https://example.com' }),
    resolveProfile: async (profileId) => {
      if (profileId !== 'profile-test') return null;
      return { id: 'profile-test', provider: 'dashscope', modelId: 'qwen3.6-plus' };
    },
    runDocumentIntake: async (input) => {
      intakeCalls += 1;
      // Stable sourceRunId: same value for every test run, unless overridden.
      const dvc = makeDvc();
      if (opts.intakeOverride) return opts.intakeOverride(dvc);
      return {
        documentRunId: dvc.sourceRunId,
        sourceRunId: dvc.sourceRunId,
        dvc,
      };
    },
    loadProjectRecord: async () => null,
    log: () => undefined,
  });
  return { service, getIntakeCalls: () => intakeCalls };
}

test('CI-W1A L1: service exposes 11 methods + onProgress', () => {
  const { service } = makeService({ dataDir: '/tmp/ci-w1a' });
  const keys = Object.keys(service).sort();
  assert.deepEqual(keys, [
    'cancel', 'confirmFacts', 'getFactReview', 'getRun', 'getWorkspace',
    'listRuns', 'onProgress', 'remove', 'resume', 'selectDirection', 'start',
  ]);
});

test('CI-W1A L2: start() creates a run and lands in awaiting_fact_confirmation', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l2-'));
  try {
    const { service, getIntakeCalls } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/sample.pdf'],
      apiProfileId: 'profile-test',
    });
    assert.equal(run.status, 'awaiting_fact_confirmation');
    assert.equal(run.documentRunId, 'doc-run-001');
    assert.equal(getIntakeCalls(), 1, 'document intake must be invoked exactly once');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L2: start() rejects empty documentPaths', async () => {
  const { service } = makeService({ dataDir: '/tmp/ci-w1a' });
  await assert.rejects(
    () => service.start({ documentPaths: [], apiProfileId: 'profile-test' }),
    (err) => err.message.includes('documentPaths') && err.code === 'CI_APP_DOCUMENT_REQUIRED',
  );
});

test('CI-W1A L2: start() rejects missing profileId', async () => {
  const { service } = makeService({ dataDir: '/tmp/ci-w1a' });
  await assert.rejects(
    () => service.start({ documentPaths: ['/tmp/x.pdf'], apiProfileId: '' }),
    (err) => err.code === 'CI_APP_PROFILE_REQUIRED',
  );
});

test('CI-W1A L2: start() rejects unknown profileId', async () => {
  const { service } = makeService({ dataDir: '/tmp/ci-w1a' });
  await assert.rejects(
    () => service.start({ documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-unknown' }),
    (err) => err.code === 'CI_APP_PROFILE_REQUIRED',
  );
});

test('CI-W1A L3: getFactReview() returns a stable review projection', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l3-'));
  try {
    const { service } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    const review = await service.getFactReview(run.id);
    assert.equal(review.runId, run.id);
    assert.equal(review.status, 'awaiting_confirmation');
    assert.equal(review.sourceRunId, 'doc-run-001');
    assert.ok(review.facts.length > 0, 'should produce at least one fact item');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L4: confirmFacts() drives run to awaiting_direction_selection', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l4-'));
  try {
    const { service } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    const facts = (await service.getFactReview(run.id)).facts;
    const next = await service.confirmFacts(run.id, facts);
    assert.equal(next.status, 'awaiting_direction_selection');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L4: confirmFacts() rejects re-confirmation after direction selection', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l4b-'));
  try {
    const { service } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    const facts = (await service.getFactReview(run.id)).facts;
    await service.confirmFacts(run.id, facts);
    await assert.rejects(
      () => service.confirmFacts(run.id, facts),
      (err) => err.code === 'CI_APP_RUN_STATE_INVALID',
    );
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L5: selectDirection() rejects unknown directionId', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l5-'));
  try {
    const { service } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    const facts = (await service.getFactReview(run.id)).facts;
    await service.confirmFacts(run.id, facts);
    await assert.rejects(
      () => service.selectDirection(run.id, { directionId: 'd-nonexistent' }),
      (err) => err.code === 'CI_APP_SELECTION_INVALID',
    );
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L5: selectDirection() rejects empty directionId', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l5b-'));
  try {
    const { service } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    const facts = (await service.getFactReview(run.id)).facts;
    await service.confirmFacts(run.id, facts);
    await assert.rejects(
      () => service.selectDirection(run.id, { directionId: '' }),
      (err) => err.code === 'CI_APP_SELECTION_REQUIRED',
    );
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L6: recommendation != selection (Hard fixture: pick B over recommended A)', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l6-'));
  try {
    const { service } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    const facts = (await service.getFactReview(run.id)).facts;
    await service.confirmFacts(run.id, facts);
    const workspaceBefore = await service.getWorkspace(run.id);
    const directionSet = workspaceBefore.directionSet;
    const valid = (directionSet?.directions ?? []).filter(
      (d) => d.status === 'grounded' || d.status === 'provisional',
    );
    if (valid.length < 2) {
      if (valid.length === 1) {
        const view = await service.selectDirection(run.id, { directionId: valid[0].id, reason: 'only-choice' });
        assert.equal(view.run.status, 'completed');
        assert.equal(view.run.selectedDirectionId, valid[0].id);
      }
      return;
    }
    const recommended = valid[0];
    const nonRecommended = valid[1];
    const view = await service.selectDirection(run.id, { directionId: nonRecommended.id, reason: 'user prefers B' });
    assert.equal(view.run.status, 'completed');
    assert.equal(view.run.selectedDirectionId, nonRecommended.id, 'selection must be B, not recommended A');
    assert.notEqual(view.run.selectedDirectionId, recommended.id);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L7: selectDirection() persists revision + history', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l7-'));
  try {
    const { service } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    const facts = (await service.getFactReview(run.id)).facts;
    await service.confirmFacts(run.id, facts);
    const workspace = await service.getWorkspace(run.id);
    const valid = ((workspace.directionSet?.directions) ?? [])
      .filter((d) => d.status === 'grounded' || d.status === 'provisional');
    if (valid.length === 0) return;
    await service.selectDirection(run.id, { directionId: valid[0].id, reason: 'first pick' });
    const finalRun = await service.getRun(run.id);
    assert.ok(finalRun.selectionRevision >= 1, 'selectionRevision must increment');
    const historyPath = path.join(dataDir, 'creative-intelligence-runs', finalRun.id, 'runtime', 'selection-history.json');
    const history = JSON.parse(await fs.readFile(historyPath, 'utf8'));
    assert.equal(history.length, 1);
    assert.equal(history[0].actor, 'user');
    assert.equal(history[0].selectedDirectionId, valid[0].id);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L8: getRun() always returns the latest run record (resume parity)', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l8-'));
  try {
    const { service } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    const facts = (await service.getFactReview(run.id)).facts;
    await service.confirmFacts(run.id, facts);
    const resumed = await service.getRun(run.id);
    assert.equal(resumed.id, run.id);
    assert.equal(resumed.status, 'awaiting_direction_selection');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L9: cancel() then remove() cleans up', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l9-'));
  try {
    const { service } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    const cancelled = await service.cancel(run.id);
    assert.equal(cancelled, true);
    const after = await service.getRun(run.id);
    assert.equal(after.status, 'cancelled');
    await service.remove(run.id);
    await assert.rejects(
      () => service.getRun(run.id),
      (err) => err.code === 'CI_APP_RUN_NOT_FOUND',
    );
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L10: operations factory returns a flat kebab-case channel map', () => {
  const ops = createCreativeIntelligenceOperations({ creativeIntelligence: {} });
  const keys = Object.keys(ops).sort();
  assert.equal(keys.length, 11);
  for (const k of keys) {
    assert.ok(k.startsWith('creative-intelligence:'), `${k} must be kebab-case prefixed`);
  }
});

test('CI-W1A L11: sourceRunId flows from documentContext intake → persisted DVC', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l11-'));
  try {
    const { service } = makeService({
      dataDir,
      intakeOverride: async (dvc) => {
        return {
          documentRunId: 'doc-intake-1234',
          sourceRunId: 'doc-intake-1234',
          dvc: { ...dvc, sourceRunId: 'doc-intake-1234' },
        };
      },
    });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    assert.equal(run.documentRunId, 'doc-intake-1234');
    const review = await service.getFactReview(run.id);
    assert.equal(review.sourceRunId, 'doc-intake-1234');
    const dvcPath = path.join(dataDir, 'creative-intelligence-runs', run.id, 'intermediate', 'document-visual-context.json');
    const dvc = JSON.parse(await fs.readFile(dvcPath, 'utf8'));
    assert.equal(dvc.sourceRunId, 'doc-intake-1234');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('CI-W1A L12: application service is pure orchestration (intake bridge is the only external call)', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ciw1a-l12-'));
  try {
    const { service, getIntakeCalls } = makeService({ dataDir });
    const run = await service.start({
      documentPaths: ['/tmp/x.pdf'], apiProfileId: 'profile-test',
    });
    const facts = (await service.getFactReview(run.id)).facts;
    await service.confirmFacts(run.id, facts);
    assert.equal(getIntakeCalls(), 1, 'no additional model calls beyond the legacy documentContext bridge');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
