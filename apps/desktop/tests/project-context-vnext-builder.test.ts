import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectRecord } from '../src/shared/types.ts';
import {
  buildProjectVisualContextVNext,
  validateProjectVisualContextVNext,
} from '../src/main/project-context-vnext-builder.ts';

function project(): ProjectRecord {
  return {
    id: 'project-1',
    projectName: 'Project One',
    detectedProjectName: 'Project One',
    projectNameSource: 'common-file-prefix',
    projectNameConfidence: 0.9,
    brandName: 'Brand One',
    industry: 'hospitality',
    detectedBrandName: 'Brand One',
    detectedIndustry: 'hospitality',
    factConfidence: { brandName: 0.9, industry: 0.8 },
    description: '',
    logoLocked: true,
    lockedFacts: ['Keep the approved wordmark'],
    outputLanguage: 'zh-CN',
    provider: 'test',
    model: 'test',
    apiProfileId: null,
    analysisProfile: 'fusion-enhanced',
    status: 'completed',
    createdAt: '2026-07-29T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
    lastRunAt: null,
    lastDurationMs: null,
    assetCount: 1,
    imageCount: 1,
    lastReportFilename: 'human-report.md',
    lastError: null,
    logoFiles: ['assets/logo.png'],
    briefFiles: [],
    assets: [{
      id: 'asset-logo',
      batchId: 'batch-1',
      sourceType: 'file',
      originalName: 'logo.png',
      relativePath: 'assets/logo.png',
      mimeType: 'image/png',
      sizeBytes: 10,
      sha256: 'abc',
      status: 'ready',
    }],
  };
}

test('vNext context is built from project facts and structured data without report markdown', () => {
  const context = buildProjectVisualContextVNext({
    project: project(),
    generatedAt: '2026-07-29T00:00:00.000Z',
    structuredAnalysis: {
      visualIdentity: {
        tone: ['calm and precise'],
      },
      styleBoundaries: {
        mustAvoid: ['visual clutter'],
      },
    },
  });
  assert.equal(context.schemaVersion, '2.0');
  assert.equal(context.brandCore.name, 'Brand One');
  assert.deepEqual(context.lockedAssets.logoAssetIds, ['asset-logo']);
  assert.deepEqual(context.visualIdentity.tone, ['calm and precise']);
  assert.equal(JSON.stringify(context).includes('human-report.md'), false);
  assert.deepEqual(validateProjectVisualContextVNext(context), { valid: true, errors: [] });
});

test('vNext context version increments independently of a report filename', () => {
  const first = buildProjectVisualContextVNext({ project: project() });
  const withoutReport = { ...project(), lastReportFilename: null };
  const second = buildProjectVisualContextVNext({
    project: withoutReport,
    previousContext: first,
  });
  assert.equal(second.version, 2);
  assert.equal(second.projectId, first.projectId);
});
