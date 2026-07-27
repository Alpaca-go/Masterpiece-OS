import test from 'node:test';
import assert from 'node:assert/strict';
import { compileImageGenerationTask, migrateImageGenerationTaskV1 } from '../../packages/image-generation-runtime/src/task-builder.js';

const capabilities = {
  providerId: 'dashscope',
  modelId: 'wan2.7-image-pro',
  maxReferenceImages: 6,
  maxOutputCount: 1,
  supportedSizes: ['1024*1024'],
  outputMimeTypes: ['image/png'],
};
const providerConfig = { apiKey: 'test', baseUrl: 'https://example.test/api/v1' };
const parameters = { size: '1024*1024', region: 'beijing' };

function compile(preset, context, extra = {}) {
  return compileImageGenerationTask({
    runId: `run-${preset}`,
    taskId: `task-${preset}`,
    sources: {
      preset,
      purpose: preset === 'visual_extension' || preset === 'integrated_anchor' ? 'production' : 'exploration',
      ...extra,
      userIntent: {},
    },
    context,
    capabilities,
    providerConfig,
    parameters,
    createdAt: '2026-01-01T00:00:00.000Z',
  });
}

test('all four presets compile into Task V2 with preset-specific output type', () => {
  const current = { assetId: 'current', role: 'current_project_identity', localPath: '/current.png', sha256: 'x', source: 'project_visual_context', includeReason: 'current' };
  const reference = { assetId: 'reference', role: 'reference_style', localPath: '/reference.png', sha256: 'y', source: 'reference_anchor_run', includeReason: 'style' };
  const cases = [
    compile('visual_extension', { visualContext: {}, references: [current], sourceMetadata: {} }, { projectId: 'p', visual: { projectId: 'p' } }),
    compile('document_concept', { documentContext: {}, references: [], sourceMetadata: { documentRunId: 'd' } }, { document: { documentRunId: 'd' } }),
    compile('reference_preview', { referenceCapsule: {}, referenceDecision: { status: 'awaiting_decision' }, references: [reference], sourceMetadata: { referenceAnchorRunId: 'r' } }, { reference: { referenceAnchorRunId: 'r' } }),
    compile('integrated_anchor', {
      visualContext: {},
      resolvedContext: { identity: { brandName: 'Brand' }, lockedAssets: {}, conflicts: [] },
      referenceCapsule: { inheritedStyle: {}, prohibitedReferenceIdentity: {} },
      anchorBriefMarkdown: '# Brief',
      referenceDecision: { status: 'completed', decision: 'approved' },
      references: [current, reference],
      sourceMetadata: { referenceAnchorRunId: 'r' },
    }, { projectId: 'p', visual: { projectId: 'p' }, reference: { referenceAnchorRunId: 'r' } }),
  ];
  assert.deepEqual(cases.map((item) => item.task.schemaVersion), ['2.0', '2.0', '2.0', '2.0']);
  assert.deepEqual(cases.map((item) => item.task.outputType), ['concept_image', 'concept_image', 'concept_image', 'master_anchor_image']);
  assert.equal(cases[1].task.virtualProjectId, 'document-d');
  assert.equal(cases[2].gate.blocked, false);
  assert.equal(cases[3].gate.blocked, false);
});

test('V1 task migrates in memory to integrated_anchor V2', () => {
  const migrated = migrateImageGenerationTaskV1({
    schemaVersion: '1.0',
    sourceVisualRunId: 'v',
    sourceDocumentRunId: 'd',
    sourceReferenceAnchorRunId: 'r',
    outputType: 'master_anchor_image',
  });
  assert.equal(migrated.schemaVersion, '2.0');
  assert.equal(migrated.preset, 'integrated_anchor');
  assert.deepEqual(migrated.sources, { visualRunId: 'v', documentRunId: 'd', referenceAnchorRunId: 'r' });
});
