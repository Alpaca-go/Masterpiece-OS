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
const mainSource = fs.readFileSync(path.join(rendererRoot, 'main.tsx'), 'utf8');
const errorBoundarySource = fs.readFileSync(path.join(rendererRoot, 'components', 'AppErrorBoundary.tsx'), 'utf8');
const settingsSource = fs.readFileSync(path.join(rendererRoot, 'components', 'SettingsPanel.tsx'), 'utf8');

test('renderer keeps specialist legacy presets but routes analysis reports into Creative Session', () => {
  for (const preset of ['document_concept', 'reference_preview', 'integrated_anchor']) {
    assert.match(appSource, new RegExp(`preset: '${preset}'`));
  }
  assert.doesNotMatch(appSource, /preset: 'visual_extension'/);
  assert.match(appSource, /setScreen\('creative-session'\)/);
  assert.match(reportSource, /根据分析继续创作/);
  assert.match(documentSource, /生成概念稿/);
  assert.match(referenceSource, /试生成参考效果/);
  assert.match(referenceSource, /生成 Master Anchor Image/);
  assert.match(referenceSource, /快速提取到生产系统/);
  assert.match(referenceSource, /quickExtractStyle/);
});


test('generation workspace uses source bundles, displays source usage and offers registered image models', () => {
  assert.match(generationSource, /sourceBundle: ImageGenerationSourceBundle/);
  assert.match(generationSource, /getSourcePreview/);
  assert.match(generationSource, /sourcesNotUsed/);
  assert.match(generationSource, /profile\.modelType === 'image_generation'/);
  assert.match(generationSource, /本次生成意图/);
});

test('model connection failures expose structured upstream diagnostics', () => {
  for (const label of [
    '上游服务',
    '请求接口类型',
    'HTTP 状态码',
    '上游错误码',
    '上游错误信息',
    'request id',
  ]) {
    assert.match(settingsSource, new RegExp(label));
  }
  assert.match(settingsSource, /connectionResult\.responseBody/);
  assert.match(settingsSource, /openai-video-generation/);
});

test('rejected reference anchors never expose the preview action', () => {
  assert.match(referenceSource, /selectedRun\.status !== 'rejected'/);
  assert.match(referenceSource, /onGenerateReferencePreview/);
});

test('renderer validates compile responses before storing them and has a global error boundary', () => {
  assert.match(generationSource, /assertCompileResult\(rawResult\)/);
  assert.match(generationSource, /生图编译结果格式无效/);
  assert.match(mainSource, /<AppErrorBoundary>/);
  assert.match(errorBoundarySource, /getDerivedStateFromError/);
  assert.match(errorBoundarySource, /页面加载失败/);
});
