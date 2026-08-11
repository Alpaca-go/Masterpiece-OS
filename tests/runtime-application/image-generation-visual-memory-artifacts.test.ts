import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRunStore } from '@masterpiece/runtime-core/application/image-generation/run-store.ts';

test('image Run Store freezes Visual Memory and Reference Pack beside the generation artifacts', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'visual-memory-run-store-'));
  const projectId = 'document-visual-memory-test';
  const runId = 'run-1';
  const runRoot = path.join(temp, 'standalone-image-generation', projectId, runId);
  const store = createRunStore(temp, projectId);
  try {
    await store.saveRun({
      schemaVersion: '1.0',
      runId,
      projectId,
      taskId: 'task-1',
      status: 'ready',
      outputType: 'concept_image',
      providerId: 'dashscope',
      modelId: 'wan2.7-image-pro',
      region: 'beijing',
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
      gate: { blocked: false, errors: [], warnings: [] },
      images: [],
    });
    await store.writeVisualUpgradeArtifacts(runId, {
      visualAnalysis: { id: 'analysis-1' },
      creativeDirection: { id: 'direction-1' },
      generationBlueprint: { id: 'blueprint-1' },
      visualMemory: { id: 'memory-1' },
      referencePack: { id: 'pack-1' },
      generationResult: { runId },
    });
    const [memory, pack] = await Promise.all([
      fs.readFile(path.join(runRoot, 'visual-memory.json'), 'utf8').then(JSON.parse),
      fs.readFile(path.join(runRoot, 'reference-pack.json'), 'utf8').then(JSON.parse),
    ]);
    assert.equal(memory.id, 'memory-1');
    assert.equal(pack.id, 'pack-1');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
