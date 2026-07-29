import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVisualExplorationService } from '../src/main/visual-exploration-service.ts';

test('Visual Exploration service generates five isolated concept runs with no image references', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-visual-exploration-'));
  let workflowState = 'STYLE_PROFILE_CREATED';
  const transitions: string[] = [];
  const prompts: string[] = [];
  const snapshots: any[] = [];
  let runIndex = 0;
  const service = createVisualExplorationService(
    { paths: async () => ({ root }) } as never,
    {
      create: async () => ({ workflowState }),
      setActiveEntity: async (_projectId: string, entityType: string) => {
        assert.equal(entityType, 'visual_exploration');
      },
      transition: async (_projectId: string, next: string) => {
        workflowState = next;
        transitions.push(next);
      },
    } as never,
    {
      getActive: async () => ({
        id: 'direction-1',
        version: '1.0.0',
        status: 'ready',
        primaryConcept: 'A coherent visual world',
        designStrategy: 'Use one clear system',
        visualWorld: 'calm',
        colorStrategy: 'controlled color',
        materialStrategy: 'honest material',
        compositionStrategy: 'clear hierarchy',
        photographyStrategy: 'soft daylight',
      }),
    } as never,
    {
      getActive: async () => ({
        id: 'style-1',
        version: '1.0.0',
        status: 'confirmed',
        styleEssence: { summary: 'calm and precise', keywords: ['calm', 'precise'] },
        colorSystem: { primary: ['warm white'], secondary: ['charcoal'], accent: ['amber'] },
        materialAndTexture: { materials: ['paper'], surfaceRules: ['matte'] },
      }),
    } as never,
    {
      startCompiledCreativeTask: async (input: any) => {
        runIndex += 1;
        prompts.push(input.compiledPrompt);
        snapshots.push(input.snapshot);
        assert.deepEqual(input.references, []);
        return {
          runId: `run-${runIndex}`,
          status: 'succeeded',
          images: [{ relativePath: `images/concept-${runIndex}.png` }],
        };
      },
    } as never,
  );
  try {
    const exploration = await service.generate('project-1', {
      conceptCount: 5,
      apiProfileId: 'image-profile',
    });
    assert.equal(exploration.status, 'ready');
    assert.equal(exploration.concepts.length, 5);
    assert.ok(exploration.concepts.every((item) => item.status === 'generated'));
    assert.ok(prompts.every((prompt) => /无 Logo/u.test(prompt)));
    assert.ok(snapshots.every((snapshot) =>
      snapshot.anchorReferenceMode === 'visual_rules_only'
      && snapshot.providerReferences.length === 0));
    assert.deepEqual(transitions, [
      'VISUAL_EXPLORATION_GENERATING',
      'VISUAL_EXPLORATION_READY',
    ]);
    const stored = await service.list('project-1');
    assert.equal(stored[0]?.id, exploration.id);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
