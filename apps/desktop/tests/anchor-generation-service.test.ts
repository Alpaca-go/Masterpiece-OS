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
          creativeDecisionId: 'direction-1',
          creativeDecisionVersion: '1.0.0',
          creativeDecisionSummary: ['建立新的品牌体验', '开放共享厨房'],
          creativeDecisionSourcePath: 'outputs/creative_decision.json',
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

test('Anchor Provider bridge reconciles a stale generating candidate from its failed image run', async () => {
  const calls: string[] = [];
  const candidate = {
    id: 'candidate-failed',
    projectId: 'project-1',
    status: 'generating',
    generationRunId: 'run-failed',
  };
  const service = createAnchorGenerationService(
    {} as never,
    {} as never,
    {
      list: async () => [candidate],
      failGeneration: async (_projectId: string, candidateId: string, failure: {
        errorCode?: string;
        errorMessage?: string;
      }) => {
        calls.push('candidate:failed');
        assert.equal(candidateId, candidate.id);
        assert.equal(failure.errorCode, 'IMAGE_DOWNLOAD_FAILED');
        assert.equal(failure.errorMessage, '下载图片失败');
        return {
          ...candidate,
          status: 'generation_failed',
          generationFailure: {
            errorCode: failure.errorCode,
            errorMessage: failure.errorMessage,
            failedAt: '2026-07-29T00:00:00.000Z',
          },
        };
      },
    } as never,
    {
      getRun: async (runId: string) => {
        calls.push('run:read');
        assert.equal(runId, 'run-failed');
        return {
          runId,
          status: 'failed',
          images: [],
          errorCode: 'IMAGE_DOWNLOAD_FAILED',
          errorMessage: '下载图片失败',
        };
      },
    } as never,
    {} as never,
    {} as never,
  );

  const result = await service.list('project-1');
  assert.equal(result[0]?.status, 'generation_failed');
  assert.deepEqual(calls, ['run:read', 'candidate:failed']);
});

test('Anchor Provider bridge generates a traceable multi-candidate set for comparison', async () => {
  const prompts: string[] = [];
  let runIndex = 0;
  const service = createAnchorGenerationService(
    {
      getActive: async () => ({
        id: 'style-1',
        version: '1.0.0',
        status: 'confirmed',
        materialAndTexture: { materials: [], surfaceRules: [] },
        promptComponents: { negative: [] },
        forbiddenVariations: [],
      }),
    } as never,
    { list: async () => [] } as never,
    {
      create: async (_projectId: string, input: {
        purpose: string;
        aspectRatio: string;
        candidateSetId: string;
        candidateIndex: number;
        candidateCount: number;
      }) => ({
        id: `candidate-${input.candidateIndex}`,
        candidateSetId: input.candidateSetId,
        candidateIndex: input.candidateIndex,
        candidateCount: input.candidateCount,
        task: { purpose: input.purpose, aspectRatio: input.aspectRatio },
      }),
      beginGeneration: async () => undefined,
      completeGeneration: async (_projectId: string, candidateId: string) => ({
        id: candidateId,
        status: 'pending_review',
      }),
    } as never,
    {
      startCompiledCreativeTask: async (input: { compiledPrompt: string }) => {
        prompts.push(input.compiledPrompt);
        runIndex += 1;
        return {
          runId: `run-${runIndex}`,
          status: 'succeeded',
          images: [{ relativePath: `images/candidate-${runIndex}.png` }],
        };
      },
    } as never,
    {
      getActive: async () => ({
        id: 'direction-1',
        version: '1.0.0',
        status: 'ready',
      }),
    } as never,
    {
      compile: async () => ({
        schemaVersion: '1.0',
        id: 'blueprint-1',
        projectId: 'project-1',
        sessionId: 'session-1',
        creativeDirectionId: 'direction-1',
        creativeDirectionVersion: '1.0.0',
        creativeDirectionSummary: ['统一方向'],
        imagePurpose: 'brand_poster',
        sceneDescription: '完整品牌主视觉',
        camera: '正面视角',
        composition: '单一焦点',
        materials: ['真实材质'],
        lighting: '柔和光线',
        colorDirection: '品牌色有序分配',
        brandAssetRules: ['品牌身份准确'],
        avoid: ['禁止拼贴'],
        compilerVersion: '1.0.0',
        generatedAt: '2026-07-29T00:00:00.000Z',
      }),
    } as never,
  );
  const result = await service.generateSet('project-1', {
    purpose: '建立新的品牌主视觉方向',
    candidateCount: 2,
    dryRun: true,
  });
  assert.equal(result.results.length, 2);
  assert.ok(result.results.every((item) => item.candidate.status === 'pending_review'));
  assert.match(result.candidateSetId, /^anchor-set-/u);
  assert.match(prompts[0]!, /Candidate 1\/2/u);
  assert.match(prompts[1]!, /Candidate 2\/2/u);
  assert.notEqual(prompts[0], prompts[1]);
});
