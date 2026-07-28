import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createGenerationBlueprintService } from '../src/main/generation-blueprint-service.ts';
import { normalizeCreativeDirection } from '../../../packages/creative-production-runtime/src/creative-direction.js';

function direction() {
  return normalizeCreativeDirection({
    projectTransformation: '从旧式陈列升级为新的品牌体验',
    oldVisualProblems: ['旧方案依赖拼贴'],
    designStrategy: '用真实情境和单一焦点建立新系统',
    primaryConcept: '可触摸的城市日常',
    visualKeywords: ['真实', '克制'],
    thingsToRemove: ['停止旧 VI 拼贴'],
    thingsToKeep: ['品牌名与 Logo'],
    colorStrategy: '暖白、深灰与少量品牌色',
    materialStrategy: '真实纸材与亚光金属',
    compositionStrategy: '单一焦点与清晰层级',
    photographyStrategy: '自然光与真实使用情境',
    packagingStrategy: '结构与信息带形成新系统',
    generationRules: ['禁止复制旧 VI 或旧包装换皮'],
  }, {
    id: 'direction-1',
    projectId: 'project-1',
    sessionId: 'session-1',
    version: '1.0.0',
    understandingGeneratedAt: '2026-07-28T00:00:00.000Z',
    reportPath: 'outputs/report.md',
  });
}

test('Generation Blueprint service persists active execution plan and lifecycle', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-blueprint-'));
  const transitions: string[] = [];
  let activeBlueprintId: string | undefined;
  let workflowState = 'GENERATION_READY';
  const service = createGenerationBlueprintService(
    {
      paths: async () => ({ root }),
    } as never,
    {
      create: async () => ({ id: 'session-1', workflowState }),
      transition: async (_projectId: string, next: string) => {
        workflowState = next;
        transitions.push(next);
        return { id: 'session-1', workflowState };
      },
      setActiveEntity: async (_projectId: string, type: string, entity: { id: string }) => {
        assert.equal(type, 'generation_blueprint');
        activeBlueprintId = entity.id;
      },
    } as never,
    {
      getActive: async () => direction(),
    } as never,
  );

  const blueprint = await service.compile('project-1', {
    userRequest: '生成一张全新的包装商业展示图',
    imagePurpose: 'packaging_render',
  });
  assert.deepEqual(transitions, ['BLUEPRINT_GENERATING', 'BLUEPRINT_READY']);
  assert.equal(activeBlueprintId, blueprint.id);
  assert.equal((await service.getActive('project-1'))?.id, blueprint.id);
  assert.equal(
    JSON.parse(await fs.readFile(path.join(root, 'creative-session', 'blueprints', `${blueprint.id}.json`), 'utf8')).imagePurpose,
    'packaging_render',
  );
});
