import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rendererRoot = path.resolve(import.meta.dirname, '../../apps/web/src');
const appSource = fs.readFileSync(path.join(rendererRoot, 'App.tsx'), 'utf8');
const generationSource = fs.readFileSync(path.join(rendererRoot, 'components', 'ImageGenerationWorkspace.tsx'), 'utf8');
const referenceSource = fs.readFileSync(path.join(rendererRoot, 'components', 'ReferenceAnchorWorkspace.tsx'), 'utf8');
const documentSource = fs.readFileSync(path.join(rendererRoot, 'components', 'DocumentContextWorkspace.tsx'), 'utf8');
const reportSource = fs.readFileSync(path.join(rendererRoot, 'components', 'ReportView.tsx'), 'utf8');
const mainSource = fs.readFileSync(path.join(rendererRoot, 'main.tsx'), 'utf8');
const errorBoundarySource = fs.readFileSync(path.join(rendererRoot, 'components', 'AppErrorBoundary.tsx'), 'utf8');
const settingsSource = fs.readFileSync(path.join(rendererRoot, 'components', 'SettingsPanel.tsx'), 'utf8');

test('renderer routes supported entry points into the current generation workspaces', () => {
  for (const preset of ['document_concept', 'reference_preview', 'integrated_anchor']) {
    assert.match(appSource, new RegExp(`preset: '${preset}'`));
  }
  assert.doesNotMatch(appSource, /preset: 'visual_extension'/);
  assert.match(appSource, /setScreen\('creative-session'\)/);
  assert.match(appSource, /<VNextGenerationWorkspace/u);
  assert.doesNotMatch(appSource, /CreativeSessionWorkspace/u);
  assert.match(reportSource, /onGenerateVisual/);
  assert.match(documentSource, /onGenerateConcept/);
  assert.match(referenceSource, /onGenerateReferencePreview/);
  assert.match(referenceSource, /quickExtractStyle/);
});

test('generation workspace uses source bundles and registered image models', () => {
  assert.match(generationSource, /sourceBundle: ImageGenerationSourceBundle/);
  assert.match(generationSource, /getSourcePreview/);
  assert.match(generationSource, /sourcesNotUsed/);
  assert.match(generationSource, /profile\.modelType === 'image_generation'/);
});

test('model connection failures expose structured upstream diagnostics', () => {
  assert.match(settingsSource, /connectionResult\.responseBody/);
  assert.match(settingsSource, /connectionResult\.requestId/);
  assert.match(settingsSource, /openai-video-generation/);
});

test('rejected reference anchors never expose the preview action', () => {
  assert.match(referenceSource, /selectedRun\.status !== 'rejected'/);
  assert.match(referenceSource, /onGenerateReferencePreview/);
});

test('renderer validates compile responses and has a global error boundary', () => {
  assert.match(generationSource, /assertCompileResult\(rawResult\)/);
  assert.match(mainSource, /<AppErrorBoundary>/);
  assert.match(errorBoundarySource, /getDerivedStateFromError/);
});
