import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCreativeDirectionService } from '../src/main/creative-direction-service.ts';

function modelDirection(overrides: Record<string, unknown> = {}) {
  return {
    projectTransformation: '从旧 VI 陈列升级为社区共享餐桌体验',
    oldVisualProblems: ['旧海报和 Logo 墙主导'],
    designStrategy: '使用开放后厨、共享餐桌与晨间光线建立跨触点系统',
    primaryConcept: '晨间共享厨房',
    visualKeywords: ['开放', '温暖'],
    thingsToRemove: ['停止旧 VI 拼贴'],
    thingsToKeep: ['保留品牌名和 Logo'],
    colorStrategy: '暖白与原木为主，品牌红只作强调',
    materialStrategy: '真实木材与亚光金属',
    compositionStrategy: '单一焦点与大面积留白',
    photographyStrategy: '自然晨光下的真实使用情境',
    spaceStrategy: '以共享餐桌组织空间',
    packagingStrategy: '建立新的信息带与材质层级',
    posterStrategy: '用单一事件叙事替代产品陈列',
    generationRules: ['禁止复制旧 VI、旧海报换内容、旧包装换皮和旧空间重新排列'],
    ...overrides,
  };
}

test('Creative Director service calls a text-only model, retries invalid JSON and persists a versioned direction', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-direction-service-'));
  const projectRoot = path.join(temp, 'project');
  await fs.mkdir(path.join(projectRoot, 'outputs'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'outputs', 'report.md'), '# 升级报告\n旧视觉过度依赖 Logo 墙。');
  let workflowState = 'SESSION_CREATED';
  let activeDirectionId = '';
  const transitions: string[] = [];
  const decisions: unknown[] = [];
  const understanding = {
    schemaVersion: '1.0',
    generatedAt: '2026-07-28T00:00:00.000Z',
    identityLocks: ['Logo 不变'],
  };
  const projects = {
    get: async () => ({
      id: 'project-1',
      apiProfileId: 'profile-1',
      lastReportFilename: 'report.md',
    }),
    paths: async () => ({
      root: projectRoot,
      outputs: path.join(projectRoot, 'outputs'),
    }),
  };
  const sessions = {
    create: async () => ({
      id: 'session-1',
      workflowState,
      understanding,
      activeCreativeDirectionId: activeDirectionId || undefined,
    }),
    transition: async (_projectId: string, next: string) => {
      transitions.push(next);
      workflowState = next;
      return { id: 'session-1', workflowState, understanding };
    },
    setActiveEntity: async (_projectId: string, type: string, entity: { id: string }) => {
      assert.equal(type, 'creative_direction');
      activeDirectionId = entity.id;
    },
    recordDecision: async (_projectId: string, decision: unknown) => { decisions.push(decision); },
  };
  let calls = 0;
  const reasonerFactory = () => async (request: {
    prompt: { messages: Array<{ content: string }>; attachments: unknown[] };
  }) => {
    calls += 1;
    assert.deepEqual(request.prompt.attachments, []);
    assert.ok(request.prompt.messages[1]);
    assert.doesNotMatch(request.prompt.messages[1]!.content, /logo\.png|input\/assets/);
    return {
      reportMarkdown: calls === 1 ? '{"invalid":true}' : JSON.stringify(modelDirection()),
    };
  };
  try {
    const service = createCreativeDirectionService(
      projects as never,
      sessions as never,
      async () => ({
        profileId: 'profile-1',
        provider: 'qwen',
        protocol: 'openai-chat-multimodal',
        baseUrl: 'https://example.invalid/v1',
        model: 'mock-reasoner',
        apiKey: 'secret',
      }),
      reasonerFactory as never,
    );
    const result = await service.generate('project-1');
    assert.equal(result.modelCallCount, 2);
    assert.equal(result.direction.version, '1.0.0');
    assert.deepEqual(transitions, ['DIRECTION_GENERATING', 'DIRECTION_READY']);
    assert.equal(decisions.length, 1);
    assert.equal(activeDirectionId, result.direction.id);
    assert.equal((await service.getActive('project-1'))?.id, result.direction.id);
    for (const filename of [
      'direction-input-v1.0.0.json',
      'direction-response-v1.0.0.raw.txt',
      'creative-direction-v1.0.0.json',
      'creative-direction-v1.0.0.md',
      'creative-decision-v1.0.0.json',
      'creative-decision-v1.0.0.md',
      'active-direction.json',
    ]) await fs.access(path.join(result.outputRoot, filename));
    for (const filename of ['creative_decision.json', '05-Creative-Decision.md']) {
      await fs.access(path.join(projectRoot, 'outputs', filename));
    }
    assert.equal((await service.getCreativeDecision('project-1'))?.direction_id, result.direction.id);
    const input = JSON.parse(await fs.readFile(path.join(result.outputRoot, 'direction-input-v1.0.0.json'), 'utf8'));
    assert.deepEqual(input.imageAttachments, []);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('Creative Director service reads persisted v18.1 directions through an in-memory v1 migration', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-direction-legacy-'));
  const root = path.join(temp, 'project');
  const directionRoot = path.join(root, 'creative-session', 'direction');
  await fs.mkdir(directionRoot, { recursive: true });
  const legacy = {
    schemaVersion: '1.0',
    id: 'direction-legacy',
    projectId: 'project-1',
    sessionId: 'session-1',
    version: '1.0.0',
    status: 'ready',
    ...modelDirection(),
    source: {
      understandingGeneratedAt: '2026-07-28T00:00:00.000Z',
      reportPath: 'outputs/report.md',
      runtimeVersion: '18.1.0',
    },
    generatedAt: '2026-07-28T01:00:00.000Z',
  };
  await fs.writeFile(
    path.join(directionRoot, 'creative-direction-v1.0.0.json'),
    JSON.stringify(legacy),
  );
  await fs.writeFile(
    path.join(directionRoot, 'active-direction.json'),
    JSON.stringify({ filename: 'creative-direction-v1.0.0.json' }),
  );
  try {
    const service = createCreativeDirectionService(
      { paths: async () => ({ root }) } as never,
      {} as never,
      async () => { throw new Error('must not read credentials'); },
    );
    const migrated = await service.getActive('project-1');
    assert.equal(migrated?.brandReposition, legacy.projectTransformation);
    assert.equal(migrated?.creativeConcept, legacy.primaryConcept);
    assert.ok(migrated?.transformAssets.length);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
