import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCreativeReadingService } from '@masterpiece/runtime-core/application/creative-reading-service.ts';

test('Creative Reading performs multimodal understanding only and persists all four V18 artifacts', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-reading-'));
  const projectRoot = path.join(temp, 'project');
  await fs.mkdir(path.join(projectRoot, 'outputs'), { recursive: true });
  await fs.mkdir(path.join(projectRoot, 'input', 'assets'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'outputs', 'report.md'), '# 升级报告\n建立清晰层级');
  await fs.writeFile(path.join(projectRoot, 'outputs', 'project-visual-context.json'), JSON.stringify({
    projectId: 'project-1',
    identity: { brandName: '测试品牌', industry: '餐饮' },
  }));
  await fs.writeFile(path.join(projectRoot, 'input', 'assets', 'logo.png'), 'image');
  await fs.writeFile(path.join(projectRoot, 'input', 'assets', 'poster.png'), 'image');
  const messages: unknown[] = [];
  const saved: unknown[] = [];
  const project = {
    id: 'project-1',
    apiProfileId: 'profile-1',
    lastReportFilename: 'report.md',
    assets: [
      { id: 'logo', originalName: 'logo.png', relativePath: 'assets/logo.png', mimeType: 'image/png', status: 'ready' },
      { id: 'poster', originalName: 'poster.png', relativePath: 'assets/poster.png', mimeType: 'image/png', status: 'ready' },
    ],
  };
  const projects = {
    get: async () => project,
    paths: async () => ({
      root: projectRoot,
      input: path.join(projectRoot, 'input'),
      outputs: path.join(projectRoot, 'outputs'),
      prepared: path.join(projectRoot, 'prepared'),
      runtime: path.join(projectRoot, 'runtime'),
    }),
  };
  const sessions = {
    create: async () => ({ id: 'session-1' }),
    appendMessage: async (_projectId: string, message: unknown) => { messages.push(message); },
    saveUnderstanding: async (_projectId: string, value: unknown) => { saved.push(value); },
  };
  const locks = { list: async () => [{ id: 'lock-logo', type: 'logo' }] };
  let calls = 0;
  const reasonerFactory = () => async (context: { prompt: { attachments: unknown[] } }) => {
    calls += 1;
    assert.equal(context.prompt.attachments.length, 2);
    return {
      model: 'mock-vision',
      reportMarkdown: JSON.stringify({
        projectIdentity: { brandName: '测试品牌', industry: '餐饮', products: [] },
        identityLocks: ['品牌名称与 Logo 原样保留'],
        valuableAssets: ['暖色识别'],
        currentProblems: ['旧海报层级混乱'],
        upgradePrinciples: ['建立单一焦点'],
        oldPatternsToAvoid: ['禁止旧 VI 拼贴'],
        creativeFreedom: ['可重构构图'],
        assetReadingSummary: [
          { assetId: 'logo', summary: '身份证据', recommendedUsage: 'identity_reference' },
          { assetId: 'poster', summary: '只用于理解旧问题', recommendedUsage: 'reading_only' },
        ],
      }),
    };
  };
  try {
    const service = createCreativeReadingService(
      projects as never,
      sessions as never,
      locks as never,
      async () => ({
        profileId: 'profile-1',
        provider: 'qwen',
        protocol: 'openai-chat-multimodal',
        baseUrl: 'https://example.invalid/v1',
        model: 'mock-vision',
        apiKey: 'secret',
      }),
      {
        generate: async () => ({
          direction: { id: 'direction-1', version: '1.0.0' },
          modelCallCount: 1,
        }),
      } as never,
      reasonerFactory as never,
    );
    const result = await service.run('project-1');
    assert.equal(result.modelCallCount, 2);
    assert.equal(result.readingModelCallCount, 1);
    assert.equal(result.directionModelCallCount, 1);
    assert.equal(result.direction.id, 'direction-1');
    assert.equal(calls, 1);
    assert.equal(messages.length, 1);
    assert.equal(saved.length, 1);
    for (const filename of [
      'creative-understanding.json',
      'creative-understanding.md',
      'reading-input-snapshot.json',
      'reading-response.raw.txt',
    ]) await fs.access(path.join(result.outputRoot, filename));
    const snapshot = JSON.parse(await fs.readFile(
      path.join(result.outputRoot, 'reading-input-snapshot.json'),
      'utf8',
    ));
    assert.deepEqual(snapshot.analysisPool, {
      inputCount: 2,
      selectedCount: 2,
      targetMin: 6,
      targetMax: 20,
      status: 'insufficient_assets',
      selectedAssetIds: ['logo', 'poster'],
      excludedAssetIds: [],
    });
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
