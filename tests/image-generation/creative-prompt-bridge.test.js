import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createImageGenerationService } from '../../apps/desktop/src/main/image-generation/service.ts';

test('V18 Provider Bridge reuses existing Run Store and persists the exact finalPrompt/reference set', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-provider-bridge-'));
  const projectId = '22222222-3333-4444-5555-777777777777';
  const projectRoot = path.join(dataPath, 'projects', 'bridge-project');
  await fs.mkdir(path.join(projectRoot, 'input'), { recursive: true });
  await fs.mkdir(path.join(projectRoot, 'canon'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'project.json'), JSON.stringify({ id: projectId }));
  await fs.writeFile(path.join(projectRoot, 'input', 'logo.png'), 'logo');
  await fs.writeFile(path.join(projectRoot, 'canon', 'primary.webp'), 'canon');
  const snapshot = {
    schemaVersion: '6.0',
    id: 'snapshot-1',
    projectId,
    sessionId: 'session-1',
    requestId: 'request-1',
    userRequest: '生成一张品牌海报',
    outputType: 'brand_poster',
    styleProfileId: 'style-1',
    styleProfileVersion: '1.0.0',
    visualCanonId: 'canon-1',
    visualCanonVersion: '1.0.0',
    lockedAssetIds: ['lock-logo'],
    selectedReferences: [
      { id: 'logo', role: 'identity_reference', projectRelativePath: 'input/logo.png' },
      { id: 'primary', role: 'core_reference', projectRelativePath: 'canon/primary.webp' },
    ],
    instruction: {
      schemaVersion: '1.0',
      task: '生成一张品牌海报',
      outputResponsibility: '单一海报',
      preserve: ['Logo'],
      avoid: ['拼贴'],
      sceneDescription: '单一主画面',
      composition: '单一焦点',
      materialAndLighting: '',
      typographyAndGraphicUse: '',
      referenceAssetIds: ['logo', 'primary'],
      finalPrompt: 'EXACT V18 FINAL PROMPT',
      generatedAt: '2026-07-28T00:00:00.000Z',
    },
    negativePrompt: '拼贴',
    compilerVersion: '1.0.0',
    createdAt: '2026-07-28T00:00:00.000Z',
  };
  try {
    const service = createImageGenerationService({
      dataPath,
      loadContext: async () => { throw new Error('legacy loader must not run'); },
      readCredentials: async () => ({
        apiKey: 'test',
        protocol: 'dashscope-wan-image',
        model: 'wan2.7-image-pro',
        profileId: 'image-profile',
      }),
    });
    const run = await service.startPromptSnapshot({ snapshot, dryRun: true });
    assert.equal(run.status, 'ready');
    const root = path.join(projectRoot, 'image-generation', run.runId);
    const task = JSON.parse(await fs.readFile(path.join(root, 'task.json'), 'utf8'));
    const storedSnapshot = JSON.parse(await fs.readFile(path.join(root, 'source-context-snapshot.json'), 'utf8'));
    assert.equal(task.compiledPrompt, 'EXACT V18 FINAL PROMPT');
    assert.equal(task.references.length, 2);
    assert.equal(storedSnapshot.id, 'snapshot-1');
    assert.equal(await fs.readFile(path.join(root, 'compiled-prompt.md'), 'utf8'), 'EXACT V18 FINAL PROMPT');
  } finally {
    await fs.rm(dataPath, { recursive: true, force: true });
  }
});
