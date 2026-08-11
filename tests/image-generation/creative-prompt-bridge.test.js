import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createImageGenerationService } from '@masterpiece/runtime-core/application/image-generation/service.ts';

test('v18.1 Provider Bridge reuses Run Store and persists the exact direction-bound prompt/reference set', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-provider-bridge-'));
  const projectId = '22222222-3333-4444-5555-777777777777';
  const projectRoot = path.join(dataPath, 'projects', 'bridge-project');
  await fs.mkdir(path.join(projectRoot, 'input'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'project.json'), JSON.stringify({ id: projectId }));
  await fs.writeFile(path.join(projectRoot, 'input', 'logo.png'), 'logo');
  const snapshot = {
    schemaVersion: '6.0',
    id: 'snapshot-1',
    projectId,
    sessionId: 'session-1',
    requestId: 'request-1',
    userRequest: '生成一张品牌海报',
    creativeDirectionId: 'direction-1',
    creativeDirectionVersion: '1.0.0',
    generationBlueprintId: 'blueprint-1',
    creativeDirectionSnapshot: {
      id: 'direction-1',
      version: '1.0.0',
      oldVisualProblems: ['旧海报依赖固定版式'],
      source: { reportPath: 'outputs/report.md' },
    },
    generationBlueprint: {
      id: 'blueprint-1',
      creativeDirectionId: 'direction-1',
      imagePurpose: 'brand_poster',
    },
    outputType: 'brand_poster',
    styleProfileId: 'style-1',
    styleProfileVersion: '1.0.0',
    visualCanonId: 'canon-1',
    visualCanonVersion: '1.0.0',
    lockedAssetIds: ['lock-logo'],
    selectedReferences: [
      { id: 'logo', role: 'identity_reference', projectRelativePath: 'input/logo.png' },
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
      referenceAssetIds: ['logo'],
      finalPrompt: 'EXACT v18.1 DIRECTION-BOUND FINAL PROMPT',
      generatedAt: '2026-07-28T00:00:00.000Z',
    },
    negativePrompt: '拼贴',
    compilerVersion: 'visual-upgrade-1.0.0',
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
    assert.equal(task.compiledPrompt, 'EXACT v18.1 DIRECTION-BOUND FINAL PROMPT');
    assert.equal(task.references.length, 1);
    assert.equal(storedSnapshot.id, 'snapshot-1');
    assert.equal(
      JSON.parse(await fs.readFile(path.join(root, 'visual-analysis.json'), 'utf8')).sourceReportPath,
      'outputs/report.md',
    );
    assert.equal(
      JSON.parse(await fs.readFile(path.join(root, 'creative-direction.json'), 'utf8')).id,
      'direction-1',
    );
    assert.equal(
      JSON.parse(await fs.readFile(path.join(root, 'generation-blueprint.json'), 'utf8')).id,
      'blueprint-1',
    );
    assert.equal(
      JSON.parse(await fs.readFile(path.join(root, 'generation-result.json'), 'utf8')).runId,
      run.runId,
    );
    assert.equal(
      await fs.readFile(path.join(root, 'compiled-prompt.md'), 'utf8'),
      'EXACT v18.1 DIRECTION-BOUND FINAL PROMPT',
    );
  } finally {
    await fs.rm(dataPath, { recursive: true, force: true });
  }
});

test('Visual Upgrade Provider bridge rejects more than two necessary brand references', async () => {
  const service = createImageGenerationService({
    dataPath: os.tmpdir(),
    loadContext: async () => { throw new Error('must not load'); },
  });
  await assert.rejects(
    service.startCompiledCreativeTask({
      projectId: 'project-1',
      compiledPrompt: 'prompt',
      promptVersion: 'visual-upgrade-1.0.0',
      snapshot: {},
      sourceMap: {},
      event: 'TEST',
      dryRun: true,
      references: [
        { id: 'logo', role: 'identity_reference', projectRelativePath: 'input/logo.png' },
        { id: 'product', role: 'structure_reference', projectRelativePath: 'input/product.png' },
        { id: 'extra', role: 'core_reference', projectRelativePath: 'input/extra.png' },
      ],
    }),
    (error) => error.code === 'GENERATION_REFERENCE_LIMIT_EXCEEDED',
  );
});

test('multi-model Provider bridge executes GPT Image and persists normalized Run Store artifacts', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-gpt-provider-'));
  const projectId = '22222222-3333-4444-5555-888888888888';
  const projectRoot = path.join(dataPath, 'projects', 'gpt-project');
  const png = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 124, g: 88, b: 255, alpha: 1 },
    },
  }).png().toBuffer();
  await fs.mkdir(path.join(projectRoot, 'input'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'project.json'), JSON.stringify({ id: projectId }));
  await fs.writeFile(path.join(projectRoot, 'input', 'logo.png'), png);
  const snapshot = {
    schemaVersion: '6.0',
    id: 'snapshot-gpt-1',
    projectId,
    sessionId: 'session-gpt-1',
    requestId: 'request-gpt-1',
    userRequest: 'Generate a brand poster',
    creativeDirectionId: 'direction-gpt-1',
    creativeDirectionVersion: '1.0.0',
    generationBlueprintId: 'blueprint-gpt-1',
    creativeDirectionSnapshot: {
      id: 'direction-gpt-1',
      version: '1.0.0',
      oldVisualProblems: [],
      source: { reportPath: 'outputs/report.md' },
    },
    generationBlueprint: {
      id: 'blueprint-gpt-1',
      creativeDirectionId: 'direction-gpt-1',
      imagePurpose: 'brand_poster',
    },
    outputType: 'brand_poster',
    styleProfileId: 'style-gpt-1',
    styleProfileVersion: '1.0.0',
    visualCanonId: 'canon-gpt-1',
    visualCanonVersion: '1.0.0',
    lockedAssetIds: ['logo'],
    selectedReferences: [
      { id: 'logo', role: 'identity_reference', projectRelativePath: 'input/logo.png' },
    ],
    instruction: {
      schemaVersion: '1.0',
      task: 'Generate a brand poster',
      outputResponsibility: 'One finished poster',
      preserve: ['Logo'],
      avoid: ['Unapproved brand marks'],
      sceneDescription: 'Single poster',
      composition: 'Single focal point',
      materialAndLighting: '',
      typographyAndGraphicUse: '',
      referenceAssetIds: ['logo'],
      finalPrompt: 'EXACT MULTI MODEL PROMPT',
      generatedAt: '2026-07-29T00:00:00.000Z',
    },
    negativePrompt: 'Unapproved brand marks',
    compilerVersion: 'visual-upgrade-1.0.0',
    createdAt: '2026-07-29T00:00:00.000Z',
  };
  const calls = [];
  try {
    const service = createImageGenerationService({
      dataPath,
      loadContext: async () => { throw new Error('legacy loader must not run'); },
      readCredentials: async () => ({
        apiKey: 'test-gpt-key',
        protocol: 'openai-image-generation',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-image-2',
        profileId: 'gpt-profile',
      }),
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), method: options?.method });
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            id: 'gpt-request-1',
            model: 'gpt-image-2',
            data: [{ b64_json: png.toString('base64'), mime_type: 'image/png' }],
          }),
        };
      },
    });
    const run = await service.startPromptSnapshot({ snapshot, apiProfileId: 'gpt-profile' });
    assert.equal(run.status, 'succeeded');
    assert.equal(run.providerId, 'openai');
    assert.equal(run.modelId, 'gpt-image-2');
    assert.equal(run.providerTaskId, 'gpt-request-1');
    assert.equal(run.images.length, 1);
    assert.match(calls[0].url, /\/images\/edits$/);

    const runRoot = path.join(projectRoot, 'image-generation', run.runId);
    const task = JSON.parse(await fs.readFile(path.join(runRoot, 'task.json'), 'utf8'));
    const request = JSON.parse(await fs.readFile(
      path.join(runRoot, 'provider-request.redacted.json'),
      'utf8',
    ));
    assert.equal(task.providerId, 'openai');
    assert.equal(task.compiledPrompt, 'EXACT MULTI MODEL PROMPT');
    assert.equal(request.adapterId, 'gpt-image-2');
    assert.equal(request.referenceCount, 1);
    assert.equal((await fs.stat(path.join(runRoot, run.images[0].relativePath))).size > 0, true);
  } finally {
    await fs.rm(dataPath, { recursive: true, force: true });
  }
});
