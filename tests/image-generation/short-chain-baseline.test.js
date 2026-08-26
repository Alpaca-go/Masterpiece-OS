import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  IMAGE_GENERATION_PIPELINE_MODES,
  resolveImageGenerationPipelineMode,
} from '@masterpiece/image-generation-runtime/pipeline-mode.js';

const fixture = (name) => fileURLToPath(
  new URL(`./fixtures/short-chain-baseline/${name}`, import.meta.url),
);

test('short-chain mode keeps an explicit legacy rollback after becoming the default', () => {
  assert.equal(resolveImageGenerationPipelineMode(), IMAGE_GENERATION_PIPELINE_MODES.VNEXT);
  assert.equal(
    resolveImageGenerationPipelineMode(undefined, IMAGE_GENERATION_PIPELINE_MODES.LEGACY),
    IMAGE_GENERATION_PIPELINE_MODES.LEGACY,
  );
  assert.equal(resolveImageGenerationPipelineMode('vnext'), IMAGE_GENERATION_PIPELINE_MODES.VNEXT);
  assert.throws(
    () => resolveImageGenerationPipelineMode('implicit-anchor-chain'),
    (error) => error.code === 'IMAGE_GENERATION_PIPELINE_MODE_UNSUPPORTED',
  );
});

test('short-chain baseline freezes four mismatch cases and four distinct project archetypes', async () => {
  const problems = JSON.parse(await readFile(fixture('legacy-problems.json'), 'utf8'));
  const matrix = JSON.parse(await readFile(fixture('project-matrix.json'), 'utf8'));
  assert.equal(problems.pipelineMode, 'legacy');
  assert.equal(problems.cases.length, 4);
  assert.equal(matrix.projects.length, 4);
  assert.equal(new Set(matrix.projects.map((item) => item.archetype)).size, 4);
  assert.equal(new Set(matrix.projects.map((item) => item.task.family)).size >= 3, true);
});

test('reception prompt baseline is a real space and rejects VI-board drift', async () => {
  const prompt = await readFile(fixture('aesthetic-space-prompt.md'), 'utf8');
  assert.match(prompt, /real, enterable interior/u);
  assert.match(prompt, /floor, walls, ceiling/u);
  assert.match(prompt, /Entrance three-quarter wide view/u);
  assert.match(prompt, /No VI application collection/u);
  assert.doesNotMatch(prompt, /deep purple|feather matrix|ceramic red/iu);
});
