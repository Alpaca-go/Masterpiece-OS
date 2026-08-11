import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
// This test freezes the legacy vNext space routing/prompt shape; pin it because
// R7 made phase9b_quality the default.
process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'vnext_legacy';
import {
  IMAGE_GENERATION_PIPELINE_MODES,
  compileVNextImageGeneration,
  resolveImageGenerationPipelineMode,
} from '@masterpiece/image-generation-runtime/index.js';

const fixture = (name) => new URL(`./fixtures/vnext-baseline/${name}`, import.meta.url);

function context(item) {
  return {
    schemaVersion: '2.0',
    projectId: item.id,
    version: 1,
    generatedAt: '2026-07-29T00:00:00.000Z',
    brandCore: { name: item.id, industry: item.archetype, brandRole: null, audience: [] },
    lockedAssets: {
      logoAssetIds: [],
      brandNameLocked: true,
      confirmedColors: [],
      packageStructures: [],
      productAssetIds: [],
      lockedAssetIds: [],
      mustPreserve: [],
    },
    visualIdentity: {
      tone: item.identitySignals,
      colorBehavior: [],
      graphicBehavior: [],
      materialBehavior: [],
      compositionBehavior: [],
      lightingBehavior: [],
    },
    styleBoundaries: { mustAvoid: [], uncertainItems: [] },
    confirmedDecisions: [],
    sourceAssetRefs: [],
    provenance: {
      builderId: 'regression',
      builderVersion: '1',
      sourceKinds: ['project_record'],
      sourceFingerprint: `${item.id}-fingerprint`,
    },
  };
}

test('Phase 5 makes vNext default while retaining an explicit legacy rollback', () => {
  assert.equal(resolveImageGenerationPipelineMode(), IMAGE_GENERATION_PIPELINE_MODES.VNEXT);
  assert.equal(resolveImageGenerationPipelineMode('legacy'), IMAGE_GENERATION_PIPELINE_MODES.LEGACY);
});

test('Phase 5 fixed-project regression keeps exact routing, project identity, prompt budget, and compile latency', async () => {
  const matrix = JSON.parse(await readFile(fixture('project-matrix.json'), 'utf8'));
  const reports = matrix.projects.map((item) => {
    const result = compileVNextImageGeneration({
      projectContext: context(item),
      task: {
        projectId: item.id,
        deliverableFamily: item.task.family,
        subtype: item.task.subtype,
        shot: item.task.shot,
        count: 1,
        aspectRatio: item.task.family === 'space' ? '16:9' : '3:4',
        currentInstruction: `Generate one formal ${item.task.family} result.`,
      },
    });
    assert.equal(result.compiledPrompt.route.familyTemplateId, `family.${item.task.family}`);
    for (const signal of item.identitySignals) {
      assert.match(result.compiledPrompt.finalPrompt, new RegExp(signal, 'u'));
    }
    assert.equal(result.compiledPrompt.trace.promptCharacters <= 7_500, true);
    assert.equal(result.compiledPrompt.trace.compileDurationMs < 100, true);
    return {
      projectId: item.id,
      family: item.task.family,
      promptCharacters: result.compiledPrompt.trace.promptCharacters,
      compileDurationMs: result.compiledPrompt.trace.compileDurationMs,
    };
  });
  assert.equal(reports.length, 4);
  assert.equal(new Set(reports.map((item) => item.family)).size, 3);
});

test('Phase 5 vNext implementation has no analysis-report or execution-document dependency', async () => {
  // The vnext runtime source files are read directly for the
  // "no analysis-report / execution-document" regression check.
  // `import.meta.resolve` maps the package specifier to the real
  // installed package root under `node_modules/@masterpiece/...`,
  // which is a symlink to `packages/image-generation-runtime/`.
  const { fileURLToPath } = await import('node:url');
  const pkgRoot = fileURLToPath(import.meta.resolve('@masterpiece/image-generation-runtime'));
  const sources = await Promise.all([
    readFile(new URL('./vnext/compile.js', `file:///${pkgRoot.replace(/\\/g, '/')}`), 'utf8'),
    readFile(new URL('./vnext/prompt-compiler.js', `file:///${pkgRoot.replace(/\\/g, '/')}`), 'utf8'),
    readFile(new URL('./vnext/template-router.js', `file:///${pkgRoot.replace(/\\/g, '/')}`), 'utf8'),
    readFile(new URL('../../packages/runtime-core/src/application/image-generation/vnext-service.ts', import.meta.url), 'utf8'),
  ]);
  const joined = sources.join('\n');
  assert.doesNotMatch(joined, /reportMarkdown|lastReportFilename|execution document|执行文档/iu);
});
