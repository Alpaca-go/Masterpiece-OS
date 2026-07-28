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
    type: 'logo',
    priority: 'critical',
    rule: 'Logo 不变',
    forbiddenChanges: ['不得重绘 Logo'],
  }];
  const service = createAnchorGenerationService(
    { getActive: async () => style } as never,
    { list: async () => locks } as never,
    {
      create: async () => {
        calls.push('candidate:create');
        return { id: 'candidate-1' };
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
        assert.deepEqual(input.references, [{
          id: 'asset-logo',
          role: 'identity_reference',
          projectRelativePath: 'input/assets/logo.png',
        }]);
        assert.match(input.compiledPrompt, /Primary Anchor Candidate/);
        calls.push('provider');
        return {
          runId: 'run-1',
          status: 'succeeded',
          images: [{ relativePath: 'images/image-01.png' }],
        };
      },
    } as never,
  );
  const result = await service.generate('project-1', { purpose: '建立品牌主视觉', apiProfileId: 'image-profile' });
  assert.equal(result.candidate.status, 'pending_review');
  assert.deepEqual(calls, ['candidate:create', 'provider', 'candidate:generating', 'candidate:pending-review']);
});
