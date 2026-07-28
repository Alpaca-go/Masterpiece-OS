import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnchorGenerationService } from '../src/main/anchor-generation-service.ts';

test('Anchor Provider bridge compiles one candidate, reuses image Run Store and attaches the downloaded output', async () => {
  const calls: string[] = [];
  const style = {
    id: 'style-1',
    version: '1.0.0',
    status: 'confirmed',
    styleEssence: { summary: '大胆、克制的新方向', keywords: ['大胆'], mood: [], visualPositioning: '升级' },
    promptComponents: { required: ['保留品牌身份'], positive: [], negative: ['旧版式'] },
    forbiddenVariations: ['旧版式'],
    compositionSystem: { hierarchy: ['单一焦点'], focalPointRules: [], negativeSpace: '留白' },
    materialAndTexture: { materials: ['真实材质'], surfaceRules: [] },
    lightingSystem: { type: '柔和主光', contrast: '中等', shadow: '自然' },
  };
  const locks = [{
    id: 'lock-logo',
    sourceAssetId: 'asset-logo',
    sourceFile: 'assets/logo.png',
    thumbnail: 'locked-assets/thumbnails/logo.webp',
    type: 'logo',
    priority: 'critical',
    rule: 'Logo 不变',
    forbiddenChanges: ['不得重绘 Logo'],
  }];
  const service = createAnchorGenerationService(
    { getActive: async () => style } as never,
    { list: async () => locks } as never,
    {
      create: async (_projectId: string, input: { aspectRatio: string }) => {
        assert.equal(input.aspectRatio, '16:9');
        calls.push('candidate:create');
        return {
          id: 'candidate-1',
          task: {
            purpose: '建立新的品牌店内空间体验',
            aspectRatio: '4:5',
          },
        };
      },
      beginGeneration: async (_projectId: string, candidateId: string, runId: string) => {
        assert.equal(candidateId, 'candidate-1');
        assert.equal(runId, 'run-1');
        calls.push('candidate:generating');
        return { id: candidateId, status: 'generating' };
      },
      completeGeneration: async (_projectId: string, candidateId: string, imagePath: string) => {
        assert.equal(imagePath, 'image-generation/run-1/images/image-01.png');
        calls.push('candidate:pending-review');
        return { id: candidateId, status: 'pending_review' };
      },
    } as never,
    {
      startCompiledCreativeTask: async (input: {
        references: Array<{ role: string; projectRelativePath: string }>;
        compiledPrompt: string;
      }) => {
        assert.deepEqual(input.references, []);
        assert.match(input.compiledPrompt, /approved Generation Blueprint/);
        assert.match(input.compiledPrompt, /地面、墙面、顶面、纵深、动线/);
        assert.match(input.compiledPrompt, /VI 展示板/);
        assert.match(input.compiledPrompt, /Camera:/);
        calls.push('provider');
        return {
          runId: 'run-1',
          status: 'succeeded',
          images: [{ relativePath: 'images/image-01.png' }],
        };
      },
    } as never,
    {
      getActive: async () => ({
        id: 'direction-1',
        version: '1.0.0',
        status: 'ready',
        projectTransformation: '建立新的品牌体验',
        designStrategy: '用单一叙事焦点建立跨触点系统',
        primaryConcept: '真实品牌时刻',
        visualKeywords: ['真实'],
        thingsToRemove: ['停止旧 VI 拼贴'],
        spaceStrategy: '以开放后厨和共享餐桌建立新的空间动线',
        generationRules: ['禁止复制旧 VI 和旧包装换皮'],
      }),
    } as never,
    {
      compile: async (_projectId: string, input: { imagePurpose: string }) => {
        assert.equal(input.imagePurpose, 'interior_scene');
        return {
          schemaVersion: '1.0',
          id: 'blueprint-1',
          projectId: 'project-1',
          sessionId: 'session-1',
          creativeDirectionId: 'direction-1',
          creativeDirectionVersion: '1.0.0',
          creativeDirectionSummary: ['建立新的品牌体验', '以开放后厨和共享餐桌建立新的空间动线'],
          imagePurpose: 'interior_scene',
          sceneDescription: '完整空间，包含地面、墙面、顶面、纵深、动线',
          camera: '单一人眼视角',
          composition: '真实前中后景',
          materials: ['真实材质'],
          lighting: '自然光',
          colorDirection: '克制品牌色',
          brandAssetRules: ['Logo 不变'],
          avoid: ['VI 展示板'],
          compilerVersion: '1.0.0',
          generatedAt: '2026-07-28T00:00:00.000Z',
        };
      },
    } as never,
  );
  const result = await service.generate('project-1', {
    purpose: '建立新的品牌店内空间体验',
    apiProfileId: 'image-profile',
  });
  assert.equal(result.candidate.status, 'pending_review');
  assert.deepEqual(calls, ['candidate:create', 'provider', 'candidate:generating', 'candidate:pending-review']);
});
