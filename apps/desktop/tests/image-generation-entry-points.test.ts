import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rendererRoot = path.resolve(import.meta.dirname, '../src/renderer/src');
const appSource = fs.readFileSync(path.join(rendererRoot, 'App.tsx'), 'utf8');
const generationSource = fs.readFileSync(path.join(rendererRoot, 'components', 'ImageGenerationWorkspace.tsx'), 'utf8');
const referenceSource = fs.readFileSync(path.join(rendererRoot, 'components', 'ReferenceAnchorWorkspace.tsx'), 'utf8');
const documentSource = fs.readFileSync(path.join(rendererRoot, 'components', 'DocumentContextWorkspace.tsx'), 'utf8');
const reportSource = fs.readFileSync(path.join(rendererRoot, 'components', 'ReportView.tsx'), 'utf8');

test('renderer exposes all four generation presets from their owning workspaces', () => {
  for (const preset of ['visual_extension', 'document_concept', 'reference_preview', 'integrated_anchor']) {
    assert.match(appSource, new RegExp(`preset: '${preset}'`));
  }
  assert.match(reportSource, /基于当前视觉继续生成/);
  assert.match(documentSource, /生成概念稿/);
  assert.match(referenceSource, /试生成参考效果/);
  assert.match(referenceSource, /生成 Master Anchor Image/);
});

test('generation workspace uses source bundles, displays source usage and only offers Wan image profiles', () => {
  assert.match(generationSource, /sourceBundle: ImageGenerationSourceBundle/);
  assert.match(generationSource, /getSourcePreview/);
  assert.match(generationSource, /sourcesNotUsed/);
  assert.match(generationSource, /profile\.protocol === 'dashscope-wan-image'/);
  assert.match(generationSource, /本次生成意图/);
});

test('rejected reference anchors never expose the preview action', () => {
  assert.match(referenceSource, /selectedRun\.status !== 'rejected'/);
  assert.match(referenceSource, /onGenerateReferencePreview/);
});
