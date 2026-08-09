import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
// R11.1 confirmed generated output persistence on the vNext service.
process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
import { createVNextImageGenerationService } from '../src/main/image-generation/vnext-service.ts';

const projectId = 'project-r11-confirm';

function runRecord(overrides = {}) {
  return {
    schemaVersion: '1.0',
    runId: 'run-confirm-1',
    projectId,
    taskId: 'task-confirm-1',
    status: 'succeeded',
    deliverable: 'interior_scene',
    images: [{ imageId: 'img-1', relativePath: 'images/image-01.png', mimeType: 'image/png', sizeBytes: 1, sha256: 'abc123', downloadedAt: '2026-08-09T10:00:00.000Z' }],
    ...overrides,
  };
}

async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-r11-confirm-'));
  const runs = new Map<string, ReturnType<typeof runRecord>>();
  const imageGeneration = {
    async getRun(runId: string) {
      return runs.get(runId) ?? null;
    },
  };
  const projectContext = {
    getVNext: async () => ({ projectId }),
    rebuildVNext: async () => ({ projectId }),
  };
  const service = createVNextImageGenerationService(
    { paths: async () => ({ root, input: path.join(root, 'input'), prepared: path.join(root, 'prepared'), outputs: path.join(root, 'outputs'), runtime: path.join(root, 'runtime') }) } as never,
    projectContext as never,
    () => imageGeneration as never,
    undefined,
  );
  // Simulate a completed space generation (vnext start() writes a "generated"
  // history entry that confirm uses to verify the run is a space output).
  const sessionDir = path.join(root, 'image-generation-vnext');
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(
    path.join(sessionDir, 'creative-session.json'),
    JSON.stringify({
      schemaVersion: '1.0',
      projectId,
      currentTask: null,
      history: [{
        id: 'h-confirm',
        type: 'generated',
        taskId: 'task-confirm-1',
        deliverableFamily: 'space',
        subtype: 'reception',
        shot: 'entrance_view',
        promptFingerprint: 'fp',
        runId: 'run-confirm-1',
        imageId: 'img-1',
        createdAt: '2026-08-09T10:00:00.000Z',
      }],
      implicitAnchors: {},
      projectPromptAssets: {},
      confirmedGeneratedOutputs: {},
      createdAt: '2026-08-09T10:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
    }),
    'utf8',
  );
  return { root, runs, service };
}

test('R11.1 confirm generated output persists, is idempotent, and revoke blocks reuse', async () => {
  const { root, runs, service } = await setup();
  runs.set('run-confirm-1', runRecord());

  // Confirm: only a succeeded interior_scene run is acceptable.
  const confirmed = await service.confirmGeneratedOutput(projectId, 'run-confirm-1', 'img-1');
  assert.equal(confirmed.confirmationState, 'confirmed');
  assert.equal(confirmed.confirmationSource, 'user_explicit');
  assert.equal(confirmed.sourceRunId, 'run-confirm-1');
  assert.equal(confirmed.projectId, projectId);
  assert.equal(confirmed.assetId, 'asset-run-confirm-1-img-1');
  // R11.2.1 Test A: generated output asset identity + provenance.
  assert.equal(confirmed.assetOrigin, 'generated_output');
  assert.equal(confirmed.deliverableFamily, 'space');
  assert.equal(confirmed.generationRole, 'continuation_source');

  // Persisted: survives a fresh session read.
  const persisted = await service.getConfirmedGeneratedOutputs(projectId);
  assert.ok(persisted['asset-run-confirm-1-img-1'], 'persisted');
  assert.equal(persisted['asset-run-confirm-1-img-1']!.confirmationState, 'confirmed');

  // Idempotent re-confirm keeps confirmedAt stable.
  const again = await service.confirmGeneratedOutput(projectId, 'run-confirm-1', 'img-1');
  assert.equal(again.confirmedAt, confirmed.confirmedAt, 'idempotent');

  // Revoke: state -> revoked; a revoked source must not be usable.
  const revoked = await service.revokeGeneratedOutput(projectId, 'asset-run-confirm-1-img-1');
  assert.equal(revoked.confirmationState, 'revoked');
  const after = await service.getConfirmedGeneratedOutputs(projectId);
  assert.equal(after['asset-run-confirm-1-img-1']!.confirmationState, 'revoked');

  // Non-space run must not be confirmable.
  runs.set('run-pkg', runRecord({ runId: 'run-pkg', deliverable: 'packaging_render' }));
  await assert.rejects(
    () => service.confirmGeneratedOutput(projectId, 'run-pkg', 'img-1'),
    (err: unknown) => (err as { code?: string }).code === 'SPACE_CONTINUATION_SOURCE_INVALID',
  );

  // Missing run must fail.
  await assert.rejects(
    () => service.confirmGeneratedOutput(projectId, 'run-missing', 'img-1'),
    (err: unknown) => (err as { code?: string }).code === 'SPACE_CONTINUATION_SOURCE_INVALID',
  );
});
