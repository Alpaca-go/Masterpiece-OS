import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildVisualMigrationReferencePolicy } from '@masterpiece/runtime-core/application/visual-migration-reference-policy-builder.ts';
import { allocateVisualMigrationReferencePolicy } from '@masterpiece/runtime-core/application/visual-migration-reference-policy-allocator.ts';
import {
  assertGenerationEvidenceSafePayload,
  computeGenerationEvidenceSnapshotFingerprint,
  validateVisualMigrationGenerationEvidenceSnapshotV1,
} from '@masterpiece/runtime-core/application/visual-migration-generation-evidence-contract.ts';
import { createVisualMigrationGenerationEvidenceService } from '@masterpiece/runtime-core/application/visual-migration-generation-evidence-service.ts';
import { createRunStore } from '@masterpiece/runtime-core/application/image-generation/run-store.ts';
import { PROJECT_ID, policyFixture, referenceTask } from './visual-migration-reference-policy-fixture.ts';

const CAPABILITY = Object.freeze({
  schema: 'image-reference-capability/v1' as const,
  registryVersion: 'test-registry',
  capabilityVersion: '1.0.0',
  capabilityFingerprint: '9'.repeat(64),
  registryModelId: 'test-image-model',
  provider: 'test-provider',
  protocol: 'test-image',
  referenceSupport: true as const,
  supportsMultipleReferences: true,
  maxReferenceImages: 2,
  supportedReferenceMimeTypes: Object.freeze(['image/png']),
});

async function fixture() {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'vm5-evidence-'));
  const projectRoot = path.join(dataPath, 'projects', 'vm5-project');
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'project.json'), JSON.stringify({ id: PROJECT_ID }));
  const base = policyFixture();
  let policy = buildVisualMigrationReferencePolicy({
    projectId: PROJECT_ID,
    task: referenceTask(),
    canon: base.canon,
    referencePack: base.referencePack,
    projectAssets: [{ id: 'identity-image', mimeType: 'image/png', status: 'ready' }],
    candidateDeclarations: [{
      candidateId: 'identity-1',
      sourceKind: 'project_asset',
      sourceId: 'identity-image',
      role: 'identity_reference',
      sourceOrder: 0,
    }],
  });
  const store = createRunStore(dataPath, PROJECT_ID);
  const events: string[] = [];

  async function createRun(runId: string, options: {
    parentRunId?: string;
    prompt?: string;
    taskId?: string;
  } = {}) {
    const taskId = options.taskId ?? `task-${runId}`;
    await store.saveRun({
      runId,
      projectId: PROJECT_ID,
      taskId,
      createdAt: '2026-09-03T00:00:00.000Z',
      updatedAt: '2026-09-03T00:00:00.000Z',
      status: 'created',
      ...(options.parentRunId ? { parentRunId: options.parentRunId } : {}),
    } as never);
    await store.writeTask(runId, { taskId, projectId: PROJECT_ID });
    await store.writeSnapshot(runId, { projectId: PROJECT_ID, source: 'fixture' });
    await store.writeCompiledPrompt(runId, options.prompt ?? 'frozen visual migration prompt');
    await store.writePromptSourceMap(runId, { sources: ['canon', 'policy'] });
  }
  await createRun('run-1');

  const policyService = { resolve: async () => policy };
  const canonService = {
    resolve: async () => ({ canon: base.canon, referencePack: base.referencePack, references: [] }),
  };
  const packService = { resolve: async () => ({ manifest: base.referencePack, references: [] }) };
  const executionService = {
    prepare: async (input: {
      buildProviderRequest?: (input: { capability: typeof CAPABILITY; references: Array<Record<string, unknown>> }) => unknown;
    }) => {
      const allocation = allocateVisualMigrationReferencePolicy(policy, CAPABILITY.maxReferenceImages);
      const candidates = new Map(policy.candidates.map((candidate) => [candidate.candidateId, candidate]));
      const references = allocation.selectedCandidateIds.map((candidateId, index) => {
        const candidate = candidates.get(candidateId)!;
        return {
          candidateId,
          role: candidate.role,
          providerRole: candidate.role === 'identity_reference'
            ? 'current_project_identity'
            : candidate.role === 'structure_reference'
              ? 'current_project_product'
              : 'reference_style',
          sourceKind: candidate.sourceKind,
          sourceId: candidate.sourceId,
          mimeType: 'image/png',
          sha256: String(index + 1).repeat(64),
          byteSize: 8,
          runtimeLocator: { absolutePath: 'not-copied-to-snapshot' },
          bytes: Buffer.from('not-copied'),
        };
      });
      const envelopeReferences = references.map((reference) => ({
        ...reference,
        data: Buffer.from(reference.candidateId).toString('base64'),
      }));
      const providerRequest = input.buildProviderRequest
        ? await input.buildProviderRequest({ capability: CAPABILITY, references: envelopeReferences })
        : undefined;
      return {
        schema: 'visual-migration-reference-materialization/v1',
        policyId: policy.policyId,
        policyFingerprint: policy.policyFingerprint,
        canonId: policy.canon.canonId,
        capability: CAPABILITY,
        allocation,
        references,
        providerEnvelope: {
          schema: 'visual-migration-provider-reference-envelope/v1',
          policyId: policy.policyId,
          capabilityFingerprint: CAPABILITY.capabilityFingerprint,
          references: envelopeReferences,
        },
        providerRequest,
      };
    },
  };
  const makeService = (overrides: Record<string, unknown> = {}) =>
    createVisualMigrationGenerationEvidenceService({
      visualMigrationCanons: canonService as never,
      referencePacks: packService as never,
      referencePolicies: policyService as never,
      referenceExecution: executionService as never,
      imageGenerationRunStoreResolver: () => store,
      capabilityResolver: (() => CAPABILITY) as never,
      now: () => '2026-09-03T01:00:00.000Z',
      ...overrides,
    });
  const input = (runId = 'run-1') => ({
    projectId: PROJECT_ID,
    runId,
    policyId: policy.policyId,
    registryModelId: CAPABILITY.registryModelId,
    buildProviderRequest: ({ references }: { references: Array<Record<string, unknown>> }) => {
      events.push('request-built');
      return {
        providerRequest: { headers: { Authorization: 'Bearer runtime-only' }, references },
        redactedProviderRequest: {
          model: CAPABILITY.registryModelId,
          candidateIds: references.map((reference) => reference.candidateId),
        },
      };
    },
  });
  const snapshotPath = (runId = 'run-1') => path.join(
    projectRoot, 'image-generation', runId, 'generation-evidence-snapshot.json',
  );
  return {
    dataPath, projectRoot, store, events, base, input, makeService, createRun, snapshotPath,
    setPolicy(next: typeof policy) { policy = next; },
    getPolicy() { return policy; },
  };
}

test('VM-5 freezes exact authority, decision, materialization, envelope and artifact evidence before Provider', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  let persisted = false;
  const wrappedStore = {
    ...f.store,
    async writeGenerationEvidenceSnapshotCreateOnce(runId: string, snapshot: unknown) {
      const result = await f.store.writeGenerationEvidenceSnapshotCreateOnce(runId, snapshot);
      persisted = true;
      f.events.push('snapshot-persisted');
      return result;
    },
    async readGenerationEvidenceSnapshot(runId: string) {
      const result = await f.store.readGenerationEvidenceSnapshot(runId);
      if (persisted) f.events.push('snapshot-validated');
      return result;
    },
  };
  const service = f.makeService({ imageGenerationRunStoreResolver: () => wrappedStore });
  const result = await service.runPreSubmit(f.input(), async () => {
    f.events.push('provider-called');
    return { accepted: true };
  });
  assert.deepEqual(f.events.slice(-4), [
    'request-built', 'snapshot-persisted', 'snapshot-validated', 'provider-called',
  ]);
  assert.equal(result.snapshotCreated, true);
  assert.equal(result.providerResult.accepted, true);
  assert.deepEqual(
    result.snapshot.referenceDecision.selectedCandidateIds,
    result.snapshot.referenceDecision.materializedReferences.map((item) => item.candidateId),
  );
  assert.deepEqual(
    result.snapshot.referenceDecision.selectedCandidateIds,
    result.snapshot.providerEnvelope.candidateIds,
  );
  assert.equal(result.snapshot.referenceDecision.droppedCandidateIds.length, 3);
  assert.ok(result.snapshot.referenceDecision.dropReasons.every((item) => item.reason === 'capacity_surplus'));
  assert.equal('runtimeLocator' in result.snapshot.referenceDecision.materializedReferences[0]!, false);
  assert.equal('data' in result.snapshot.providerEnvelope, false);
  assert.equal(result.snapshot.artifacts.compileFingerprint, undefined);
  assert.equal(result.snapshot.artifacts.providerRequestRedacted.filename, 'provider-request.redacted.json');
});

test('VM-5 create-once reuses identical bytes without touching mtime and rejects changed evidence', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  const service = f.makeService();
  const first = await service.prepareAndPersist(f.input());
  const beforeBytes = await fs.readFile(f.snapshotPath());
  const beforeStat = await fs.stat(f.snapshotPath());
  const second = await service.prepareAndPersist(f.input());
  const afterBytes = await fs.readFile(f.snapshotPath());
  const afterStat = await fs.stat(f.snapshotPath());
  assert.equal(first.snapshotCreated, true);
  assert.equal(second.snapshotCreated, false);
  assert.deepEqual(afterBytes, beforeBytes);
  assert.equal(afterStat.mtimeMs, beforeStat.mtimeMs);

  await f.store.writeCompiledPrompt('run-1', 'changed prompt evidence');
  let providerCalls = 0;
  await assert.rejects(
    () => service.runPreSubmit(f.input(), () => { providerCalls += 1; }),
    { code: 'GENERATION_EVIDENCE_CONFLICT' },
  );
  assert.equal(providerCalls, 0);
});

test('VM-5 survives restart, isolates retry snapshots and compares reproducibility inputs', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  const parentService = f.makeService();
  const parent = await parentService.prepareAndPersist(f.input());
  const parentBytes = await fs.readFile(f.snapshotPath());
  const freshService = f.makeService();
  const restored = await freshService.getGenerationEvidenceSnapshot({
    projectId: PROJECT_ID, runId: 'run-1', verifyArtifacts: true,
  });
  assert.equal(restored.snapshotFingerprint, parent.snapshot.snapshotFingerprint);

  await f.createRun('run-retry-same', { parentRunId: 'run-1', taskId: 'task-run-1' });
  const same = await freshService.prepareAndPersist(f.input('run-retry-same'));
  assert.notEqual(same.snapshot.snapshotId, parent.snapshot.snapshotId);
  assert.equal(same.snapshot.reproducibilityFingerprint, parent.snapshot.reproducibilityFingerprint);
  assert.equal(same.snapshot.runBinding.parentRunId, 'run-1');
  assert.deepEqual(await fs.readFile(f.snapshotPath()), parentBytes);

  await f.createRun('run-retry-changed', {
    parentRunId: 'run-1', taskId: 'task-run-1', prompt: 'changed retry prompt',
  });
  const changed = await freshService.prepareAndPersist(f.input('run-retry-changed'));
  assert.notEqual(changed.snapshot.reproducibilityFingerprint, parent.snapshot.reproducibilityFingerprint);
});

test('VM-5 detects snapshot, prompt, Provider request, authority and capability tamper', async (t) => {
  const scenarios = ['snapshot', 'prompt', 'request', 'authority', 'capability'] as const;
  for (const scenario of scenarios) {
    const f = await fixture();
    t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
    const service = f.makeService();
    const prepared = await service.prepareAndPersist(f.input());
    if (scenario === 'snapshot') {
      const raw = JSON.parse(await fs.readFile(f.snapshotPath(), 'utf8'));
      raw.taskId = 'tampered-task';
      await fs.writeFile(f.snapshotPath(), JSON.stringify(raw, null, 2));
      await assert.rejects(
        () => service.getGenerationEvidenceSnapshot({ projectId: PROJECT_ID, runId: 'run-1' }),
        { code: 'GENERATION_EVIDENCE_FINGERPRINT_MISMATCH' },
      );
    } else if (scenario === 'prompt') {
      await f.store.writeCompiledPrompt('run-1', 'tampered');
      await assert.rejects(
        () => service.getGenerationEvidenceSnapshot({ projectId: PROJECT_ID, runId: 'run-1', verifyArtifacts: true }),
        { code: 'GENERATION_EVIDENCE_ARTIFACT_TAMPERED' },
      );
    } else if (scenario === 'request') {
      await f.store.writeProviderRequest('run-1', { changed: true });
      await assert.rejects(
        () => service.getGenerationEvidenceSnapshot({ projectId: PROJECT_ID, runId: 'run-1', verifyArtifacts: true }),
        { code: 'GENERATION_EVIDENCE_ARTIFACT_TAMPERED' },
      );
    } else if (scenario === 'authority') {
      f.setPolicy({ ...f.getPolicy(), policyFingerprint: `sha256:${'7'.repeat(64)}` });
      await assert.rejects(
        () => service.getGenerationEvidenceSnapshot({ projectId: PROJECT_ID, runId: 'run-1' }),
        { code: 'GENERATION_EVIDENCE_AUTHORITY_MISMATCH' },
      );
    } else {
      const changedCapability = { ...CAPABILITY, capabilityFingerprint: '8'.repeat(64) };
      const changedService = f.makeService({ capabilityResolver: () => changedCapability });
      await assert.rejects(
        () => changedService.getGenerationEvidenceSnapshot({ projectId: PROJECT_ID, runId: 'run-1' }),
        { code: 'GENERATION_EVIDENCE_CAPABILITY_MISMATCH' },
      );
    }
  }
});

test('VM-5 rejects unsafe payload shapes and strings recursively', () => {
  for (const unsafe of [
    { apiKey: 'sk-secret' },
    { headers: { Authorization: 'redacted' } },
    { nested: { bytes: Buffer.from('x') } },
    { path: 'C:\\private\\image.png' },
    { path: '/private/image.png' },
    { image: 'data:image/png;base64,AAAA' },
    { value: 'Bearer abc.def.ghi' },
  ]) {
    assert.throws(() => assertGenerationEvidenceSafePayload(unsafe), {
      code: 'GENERATION_EVIDENCE_UNSAFE_PAYLOAD',
    });
  }
});

test('VM-5 persistence and read-back failures keep Provider calls at zero', async (t) => {
  for (const failure of ['write', 'read-back'] as const) {
    const f = await fixture();
    t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
    let written = false;
    const wrappedStore = {
      ...f.store,
      async writeGenerationEvidenceSnapshotCreateOnce(runId: string, snapshot: unknown) {
        if (failure === 'write') {
          throw Object.assign(new Error('injected failure'), { code: 'GENERATION_EVIDENCE_WRITE_FAILED' });
        }
        const result = await f.store.writeGenerationEvidenceSnapshotCreateOnce(runId, snapshot);
        written = true;
        return result;
      },
      async readGenerationEvidenceSnapshot(runId: string) {
        const value = await f.store.readGenerationEvidenceSnapshot<Record<string, unknown>>(runId);
        return failure === 'read-back' && written && value ? { ...value, taskId: 'tampered' } : value;
      },
    };
    const service = f.makeService({ imageGenerationRunStoreResolver: () => wrappedStore });
    let providerCalls = 0;
    await assert.rejects(
      () => service.runPreSubmit(f.input(), () => { providerCalls += 1; }),
      { code: failure === 'write'
        ? 'GENERATION_EVIDENCE_WRITE_FAILED'
        : 'GENERATION_EVIDENCE_FINGERPRINT_MISMATCH' },
    );
    assert.equal(providerCalls, 0);
  }
});

test('VM-5 validator detects recomputed outer fingerprint with stale reproducibility evidence', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  const prepared = await f.makeService().prepareAndPersist(f.input());
  const tampered = structuredClone(prepared.snapshot);
  tampered.artifacts.compiledPrompt.sha256 = '7'.repeat(64);
  tampered.snapshotFingerprint = computeGenerationEvidenceSnapshotFingerprint(tampered);
  assert.throws(() => validateVisualMigrationGenerationEvidenceSnapshotV1(tampered), {
    code: 'GENERATION_EVIDENCE_FINGERPRINT_MISMATCH',
  });
});

test('VM-5 records optional compile fingerprint and enforces the artifact allowlist', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  await f.store.writeDeliverableArtifacts('run-1', {
    deliverablePolicy: {}, userIntentResolution: {}, referencePlan: {},
    compileFingerprint: { fingerprint: `sha256:${'1'.repeat(64)}` },
  });
  const prepared = await f.makeService().prepareAndPersist(f.input());
  assert.equal(prepared.snapshot.artifacts.compileFingerprint?.filename, 'compile-fingerprint.json');
  const unsafe = structuredClone(prepared.snapshot);
  unsafe.artifacts.compiledPrompt.filename = '../compiled-prompt.md';
  unsafe.snapshotFingerprint = computeGenerationEvidenceSnapshotFingerprint(unsafe);
  assert.throws(() => validateVisualMigrationGenerationEvidenceSnapshotV1(unsafe), {
    code: 'GENERATION_EVIDENCE_INVALID',
  });
});

test('VM-5 creates no executable Snapshot when VM-3 allocation is unsatisfiable', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  const failingExecution = {
    prepare: async () => {
      throw Object.assign(new Error('capacity is unsatisfiable'), {
        code: 'REFERENCE_POLICY_CAPACITY_UNSATISFIABLE',
      });
    },
  };
  const service = f.makeService({ referenceExecution: failingExecution });
  let providerCalls = 0;
  await assert.rejects(
    () => service.runPreSubmit(f.input(), () => { providerCalls += 1; }),
    { code: 'REFERENCE_POLICY_CAPACITY_UNSATISFIABLE' },
  );
  assert.equal(providerCalls, 0);
  await assert.rejects(() => fs.access(f.snapshotPath()));
});

test('VM-5 detects materialized/envelope SHA replacement and Pack authority tamper', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  const prepared = await f.makeService().prepareAndPersist(f.input());
  const replaced = structuredClone(prepared.snapshot);
  replaced.providerEnvelope.evidenceSha256s[0] = '6'.repeat(64);
  replaced.reproducibilityFingerprint = prepared.snapshot.reproducibilityFingerprint;
  replaced.snapshotFingerprint = computeGenerationEvidenceSnapshotFingerprint(replaced);
  assert.throws(() => validateVisualMigrationGenerationEvidenceSnapshotV1(replaced), {
    code: 'GENERATION_EVIDENCE_REFERENCE_SET_MISMATCH',
  });

  const tamperedPackService = {
    resolve: async () => {
      throw Object.assign(new Error('pack image SHA changed'), {
        code: 'VISUAL_MIGRATION_REFERENCE_PACK_INTEGRITY_FAILED',
      });
    },
  };
  const restarted = f.makeService({ referencePacks: tamperedPackService });
  await assert.rejects(
    () => restarted.getGenerationEvidenceSnapshot({ projectId: PROJECT_ID, runId: 'run-1' }),
    (error: unknown) => (error as { code?: string; causeCode?: string }).code
      === 'GENERATION_EVIDENCE_AUTHORITY_MISMATCH'
      && (error as { causeCode?: string }).causeCode
      === 'VISUAL_MIGRATION_REFERENCE_PACK_INTEGRITY_FAILED',
  );
});
