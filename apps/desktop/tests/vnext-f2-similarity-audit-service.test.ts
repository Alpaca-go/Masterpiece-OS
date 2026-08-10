// r2.0 §6.7 / Phase F-2: Similarity Audit Service tests.
//
// The audit service is the SINGLE call site that produces a
// VNextSimilarityAuditResult. It is invoked by vnext-service.startValidated
// (Phase F-3) for `reference_first` + `cross_scene` runs only.
//
// This file pins:
//   - happy path: mock reasoner returns valid 6-dim JSON → audit passes
//   - profile missing → throws VNEXT_SIMILARITY_AUDIT_PROFILE_MISSING
//   - non-multimodal protocol → throws VNEXT_SIMILARITY_AUDIT_PROFILE_INCOMPATIBLE
//   - empty / too-many references → throws with the right code
//   - run not succeeded → throws VNEXT_SIMILARITY_AUDIT_RUN_INVALID
//   - non-first imageId → throws VNEXT_SIMILARITY_AUDIT_IMAGE_NOT_FIRST
//                          (Phase E invariant: audit always uses FIRST image)
//   - LLM returns non-integer scores → audit throws (assertVNextSimilarityAudit
//     rejects; UI never trusts silent results)
//   - LLM returns nearCopyRisk=5 → pass.nearCopyRisk=false, pass.overall=false
//   - persistence: similarity-audit.json is written to runRoot and parseable
//   - llmCallCount is 1 for the single round-trip
//   - auditId is supplied by the caller when present (otherwise generated)

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createVNextSimilarityAuditService,
  type VNextSimilarityAuditReasoner,
} from '../src/main/image-generation/vnext-similarity-audit-service.ts';

interface MockOptions {
  reportJson?: Record<string, unknown> | null;
  throwBeforeReply?: boolean;
  model?: string;
}

function mockReasoner(opts: MockOptions = {}): VNextSimilarityAuditReasoner & {
  calls: Array<{ messages: unknown[]; attachments: Array<{ assetId: string }> }>;
} {
  const calls: Array<{ messages: unknown[]; attachments: Array<{ assetId: string }> }> = [];
  const fn = (async (input) => {
    calls.push({
      messages: input.prompt.messages,
      attachments: input.prompt.attachments.map((a) => ({ assetId: a.assetId })),
    });
    if (opts.throwBeforeReply) {
      throw new Error('mock reasoner: network down');
    }
    const reportJson = opts.reportJson === null
      ? 'not valid json'
      : (opts.reportJson ?? {
          visualWorldFidelity: 4,
          sceneAccuracy: 4,
          functionalRealism: 4,
          targetSceneAuthority: 4,
          referenceAlignment: 4,
          nearCopyRisk: 2,
          rationale: 'Mock rationale',
        });
    return {
      reportMarkdown: JSON.stringify(reportJson),
      provider: 'mock-provider',
      model: opts.model ?? 'mock-audit-model',
      runId: 'mock-run-1',
    };
  }) as VNextSimilarityAuditReasoner;
  const wrapped = fn as VNextSimilarityAuditReasoner & { calls: typeof calls };
  wrapped.calls = calls;
  return wrapped;
}

function happyRun(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: '1.0' as const,
    runId: 'run-1',
    projectId: 'project-1',
    status: 'succeeded' as const,
    images: [{
      imageId: 'image-1',
      relativePath: 'images/image-1.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      sha256: 'abc',
      downloadedAt: '2026-08-10T00:00:00.000Z',
    }],
    ...overrides,
  };
}

async function makeService(opts: {
  root: string;
  reasoner?: VNextSimilarityAuditReasoner;
  profiles?: Array<{ id: string; isEnabled?: boolean; hasApiKey?: boolean; modelType?: string; protocol?: string }>;
  protocol?: string;
  run?: unknown;
}) {
  const reasoner = opts.reasoner ?? mockReasoner();
  const profiles = opts.profiles ?? [{
    id: 'profile-1',
    isEnabled: true,
    hasApiKey: true,
    modelType: 'analysis',
    protocol: 'openai-chat-multimodal',
  }];
  const run = opts.run ?? happyRun();
  return createVNextSimilarityAuditService({
    projects: { paths: async () => ({
      root: opts.root,
      input: path.join(opts.root, 'input'),
      prepared: path.join(opts.root, 'prepared'),
      outputs: path.join(opts.root, 'outputs'),
      runtime: path.join(opts.root, 'runtime'),
    }) } as never,
    getImageGeneration: () => ({
      getRun: async () => run,
      runRoot: async () => path.join(opts.root, 'image-generation', 'run-1'),
    }) as never,
    readSettings: async () => ({ profiles }) as never,
    readCredentials: async () => ({
      apiKey: 'k',
      baseUrl: 'https://example.com',
      model: 'mock-audit-model',
      protocol: opts.protocol ?? 'openai-chat-multimodal',
    }),
    createReasoner: () => reasoner,
    now: () => new Date('2026-08-10T12:00:00.000Z'),
  });
}

const baseInput = {
  projectId: 'project-1',
  runId: 'run-1',
  references: [{ assetId: 'ref-1', projectRelativePath: 'assets/ref-1.png' }],
  targetScene: {
    family: 'space',
    subtype: 'consultation',
    shot: 'entrance_view',
    mustInclude: ['counter'],
    mustAvoid: ['purple motif'],
  },
  referenceSceneRelation: 'cross_scene' as const,
};

test('F-2: happy path — mock reasoner returns valid 6-dim JSON, audit passes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const reasoner = mockReasoner();
  const service = await makeService({ root, reasoner });
  const result = await service.audit(baseInput);
  assert.equal(result.pass.overall, true);
  assert.equal(result.pass.visualWorldFidelity, true);
  assert.equal(result.pass.nearCopyRisk, true);
  assert.equal(result.llmCallCount, 1);
  assert.equal(result.metadata.projectId, 'project-1');
  assert.equal(result.metadata.runId, 'run-1');
  assert.equal(result.metadata.modelUsed, 'mock-audit-model');
  assert.equal(result.metadata.auditedAt, '2026-08-10T12:00:00.000Z');
  assert.match(result.metadata.auditId, /^[0-9a-f-]{36}$/);
  // The reasoner received both the reference and the generated image.
  assert.equal(reasoner.calls.length, 1);
  const attachmentIds = reasoner.calls[0]!.attachments.map((a) => a.assetId);
  assert.deepEqual(attachmentIds, ['ref-1', 'image-1'], 'reference must come before generated');
});

test('F-2: auditId is preserved when supplied by the caller', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const service = await makeService({ root });
  const result = await service.audit({ ...baseInput, auditId: 'audit-supplied-1' });
  assert.equal(result.metadata.auditId, 'audit-supplied-1');
});

test('F-2: persisted similarity-audit.json lives next to run images', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const service = await makeService({ root });
  await service.audit(baseInput);
  const persisted = JSON.parse(await fs.readFile(
    path.join(root, 'image-generation', 'run-1', 'similarity-audit.json'),
    'utf8',
  ));
  assert.equal(persisted.metadata.runId, 'run-1');
  assert.equal(persisted.metadata.projectId, 'project-1');
  assert.equal(persisted.llmCallCount, 1);
  assert.equal(persisted.pass.overall, true);
});

test('F-2: no analysis profile configured → throws VNEXT_SIMILARITY_AUDIT_PROFILE_MISSING', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const service = await makeService({ root, profiles: [] });
  await assert.rejects(
    () => service.audit(baseInput),
    (err: Error & { code?: string }) => err.code === 'VNEXT_SIMILARITY_AUDIT_PROFILE_MISSING',
  );
});

test('F-2: non-multimodal protocol → throws VNEXT_SIMILARITY_AUDIT_PROFILE_INCOMPATIBLE', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const service = await makeService({ root, protocol: 'openai-chat-text' });
  await assert.rejects(
    () => service.audit(baseInput),
    (err: Error & { code?: string }) => err.code === 'VNEXT_SIMILARITY_AUDIT_PROFILE_INCOMPATIBLE',
  );
});

test('F-2: empty references → throws VNEXT_SIMILARITY_AUDIT_REFERENCES_EMPTY', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const service = await makeService({ root });
  await assert.rejects(
    () => service.audit({ ...baseInput, references: [] }),
    (err: Error & { code?: string }) => err.code === 'VNEXT_SIMILARITY_AUDIT_REFERENCES_EMPTY',
  );
});

test('F-2: too many references → throws VNEXT_SIMILARITY_AUDIT_REFERENCES_TOO_MANY', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const service = await makeService({ root });
  await assert.rejects(
    () => service.audit({
      ...baseInput,
      references: Array.from({ length: 5 }, (_, i) => ({
        assetId: `ref-${i}`,
        projectRelativePath: `assets/ref-${i}.png`,
      })),
    }),
    (err: Error & { code?: string }) => err.code === 'VNEXT_SIMILARITY_AUDIT_REFERENCES_TOO_MANY',
  );
});

test('F-2: run not succeeded → throws VNEXT_SIMILARITY_AUDIT_RUN_INVALID', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const service = await makeService({
    root,
    run: happyRun({ status: 'failed' }),
  });
  await assert.rejects(
    () => service.audit(baseInput),
    (err: Error & { code?: string }) => err.code === 'VNEXT_SIMILARITY_AUDIT_RUN_INVALID',
  );
});

test('F-2: run with no images → throws VNEXT_SIMILARITY_AUDIT_RUN_INVALID', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const service = await makeService({
    root,
    run: happyRun({ images: [] }),
  });
  await assert.rejects(
    () => service.audit(baseInput),
    (err: Error & { code?: string }) => err.code === 'VNEXT_SIMILARITY_AUDIT_RUN_INVALID',
  );
});

test('F-2: non-first imageId → throws VNEXT_SIMILARITY_AUDIT_IMAGE_NOT_FIRST (Phase E invariant)', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const service = await makeService({
    root,
    run: happyRun({ images: [
      { imageId: 'image-1', relativePath: 'images/image-1.png', mimeType: 'image/png', sizeBytes: 1, sha256: 'a' },
      { imageId: 'image-2', relativePath: 'images/image-2.png', mimeType: 'image/png', sizeBytes: 1, sha256: 'b' },
    ] }),
  });
  await assert.rejects(
    () => service.audit({ ...baseInput, imageId: 'image-2' }),
    (err: Error & { code?: string }) => err.code === 'VNEXT_SIMILARITY_AUDIT_IMAGE_NOT_FIRST',
  );
});

test('F-2: LLM returns non-integer scores → audit throws (assertVNextSimilarityAudit rejects)', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const reasoner = mockReasoner({
    reportJson: {
      visualWorldFidelity: 4.5, // non-integer → helper throws
      sceneAccuracy: 4,
      functionalRealism: 4,
      targetSceneAuthority: 4,
      referenceAlignment: 4,
      nearCopyRisk: 2,
      rationale: 'should not reach here',
    },
  });
  const service = await makeService({ root, reasoner });
  await assert.rejects(
    () => service.audit(baseInput),
    /visualWorldFidelity/,
  );
});

test('F-2: LLM returns nearCopyRisk=5 (essentially 1:1) → pass.overall=false, nearCopyRisk=false', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const reasoner = mockReasoner({
    reportJson: {
      visualWorldFidelity: 5,
      sceneAccuracy: 5,
      functionalRealism: 5,
      targetSceneAuthority: 5,
      referenceAlignment: 5,
      nearCopyRisk: 5, // bad — near 1:1 copy
      rationale: 'detected as essentially 1:1',
    },
  });
  const service = await makeService({ root, reasoner });
  const result = await service.audit(baseInput);
  assert.equal(result.pass.nearCopyRisk, false);
  assert.equal(result.pass.overall, false);
});

test('F-2: reasoner network error → audit rejects (no silent pass)', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const reasoner = mockReasoner({ throwBeforeReply: true });
  const service = await makeService({ root, reasoner });
  await assert.rejects(
    () => service.audit(baseInput),
    /mock reasoner/,
  );
});

test('F-2: llmCallCount is 1 for the single round-trip (no retries)', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-f2-'));
  const service = await makeService({ root });
  const result = await service.audit(baseInput);
  assert.equal(result.llmCallCount, 1);
});
