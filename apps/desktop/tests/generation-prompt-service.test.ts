import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createGenerationPromptService } from '../src/main/generation-prompt-service.ts';

test('Generation Prompt service persists finalPrompt outside Session and records only request/run reference', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'generation-prompt-service-'));
  const projectId = 'project-1';
  const messages: Array<Record<string, unknown>> = [];
  const transitions: string[] = [];
  const session = { id: 'session-1', workflowState: 'VISUAL_CANON_CONFIRMED' };
  const projects = { paths: async () => ({ root: path.join(temp, 'project') }) };
  const sessions = {
    create: async () => session,
    appendMessage: async (_projectId: string, message: Record<string, unknown>) => { messages.push(message); },
    transition: async (_projectId: string, state: string) => { transitions.push(state); },
  };
  const styles = { getActive: async () => ({
    id: 'style-1', version: '1.0.0', status: 'confirmed',
    promptComponents: { required: ['统一'], negative: [] }, forbiddenVariations: [],
    compositionSystem: { hierarchy: [], focalPointRules: [] },
    materialAndTexture: { materials: [] },
    lightingSystem: {},
    typographyCompatibility: [],
    graphicLanguage: { coreMotifs: [] },
  }) };
  const canons = { getActive: async () => ({
    id: 'canon-1', version: '1.0.0', status: 'confirmed',
    primaryCanonImageId: 'image-1', sharedRules: [],
    canonImages: [{ id: 'image-1', type: 'brand_hero', priority: 'primary', role: '基准', imagePath: 'canon/a.webp' }],
  }) };
  const locks = { list: async () => [] };
  const directions = { getActive: async () => ({
    id: 'direction-1',
    version: '1.0.0',
    status: 'ready',
    projectTransformation: '建立新的品牌体验',
    designStrategy: '用单一叙事焦点建立跨触点系统',
    primaryConcept: '真实品牌时刻',
    visualKeywords: ['真实'],
    thingsToRemove: ['停止旧 VI 拼贴'],
    thingsToKeep: ['保留品牌名和 Logo'],
    colorStrategy: '重建身份色比例',
    materialStrategy: '真实材质',
    compositionStrategy: '单一焦点',
    photographyStrategy: '自然光真实情境',
    generationRules: ['禁止复制旧 VI 和旧包装换皮'],
  }) };
  const blueprints = { compile: async () => ({
    schemaVersion: '1.0',
    id: 'blueprint-1',
    projectId,
    sessionId: 'session-1',
    creativeDirectionId: 'direction-1',
    creativeDirectionVersion: '1.0.0',
    creativeDirectionSummary: ['建立新的品牌体验', '用单一叙事焦点建立跨触点系统'],
    creativeDecisionId: 'direction-1',
    creativeDecisionVersion: '1.0.0',
    creativeDecisionSummary: ['建立新的品牌体验', '真实品牌时刻'],
    creativeDecisionSourcePath: 'outputs/creative_decision.json',
    imagePurpose: 'brand_poster',
    sceneDescription: '生成一张具有单一叙事焦点的新品牌海报',
    camera: '商业摄影主视角',
    composition: '单一焦点与清晰层级',
    materials: ['真实纸材'],
    lighting: '自然光',
    colorDirection: '重建身份色比例',
    brandAssetRules: ['保留品牌名和 Logo'],
    avoid: ['旧海报换内容'],
    compilerVersion: '1.0.0',
    generatedAt: '2026-07-28T00:00:00.000Z',
  }) };
  try {
    const service = createGenerationPromptService(
      projects as never, sessions as never, styles as never, locks as never, canons as never,
      directions as never, blueprints as never,
    );
    const snapshot = await service.compile(projectId, {
      userRequest: '生成一张品牌海报',
      outputType: 'brand_poster',
    });
    assert.ok((await service.get(projectId, snapshot.id))?.instruction.finalPrompt);
    assert.equal(snapshot.creativeDirectionId, 'direction-1');
    assert.equal(snapshot.generationBlueprintId, 'blueprint-1');
    assert.match(snapshot.instruction.finalPrompt, /Approved Generation Blueprint/);
    assert.equal(messages[0]?.content, '生成一张品牌海报');
    assert.ok(!JSON.stringify(messages).includes('finalPrompt'));
    await service.recordRun(projectId, snapshot.id, 'run-1', '生成完成');
    assert.equal(messages[1]?.generationRunId, 'run-1');
    assert.deepEqual(transitions, ['GENERATION_READY']);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
