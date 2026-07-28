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
const creativeSessionSource = fs.readFileSync(path.join(rendererRoot, 'components', 'CreativeSessionWorkspace.tsx'), 'utf8');

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
});

test('Creative Session workspace keeps a single natural-language creation input', () => {
  assert.match(creativeSessionSource, /creativeSession\.getWorkspace/);
  assert.match(creativeSessionSource, /creativeSession\.read/);
  assert.match(creativeSessionSource, /creativeSession\.generate/);
  assert.match(creativeSessionSource, /例如：生成一张升级后的店内装修效果图/);
  assert.match(creativeSessionSource, /开始创作/);
  assert.doesNotMatch(creativeSessionSource, /GenerationSourcePreset|Reference Role|deliverable-card/);
});

test('V6 workspace exposes production gates instead of bypassing confirmation', () => {
  assert.match(creativeSessionSource, /建立 Style Profile 与 Locked Assets/);
  assert.match(creativeSessionSource, /确认 Style Profile/);
  assert.match(creativeSessionSource, /生成 Anchor Candidate/);
  assert.match(creativeSessionSource, /接受为 Primary Canon/);
  assert.match(creativeSessionSource, /从 Primary Anchor 建立 Visual Canon/);
  assert.match(creativeSessionSource, /确认 Visual Canon/);
  assert.match(creativeSessionSource, /conflicts\.some\(\(item\) => item\.severity === 'blocking'\)/);
  assert.match(appSource, /imageApiProfileId=/);
  assert.match(creativeSessionSource, /apiProfileId: imageApiProfileId/);
});

test('V6 generation workspace exposes Series controls, output versions and Prompt drawer', () => {
  assert.match(creativeSessionSource, /创建基础系列/);
  assert.match(creativeSessionSource, /执行未完成任务/);
  assert.match(creativeSessionSource, /pauseSeries/);
  assert.match(creativeSessionSource, /resumeSeries/);
  assert.match(creativeSessionSource, /确认为正式资产/);
  assert.match(creativeSessionSource, /提升 Supporting Canon/);
  assert.match(creativeSessionSource, /getRunPrompt/);
  assert.match(creativeSessionSource, /Prompt Snapshot/);
  assert.match(creativeSessionSource, /createRevision/);
  assert.match(creativeSessionSource, /创建修正版或变体/);
  assert.match(creativeSessionSource, /version-compare-grid/);
  assert.match(creativeSessionSource, /retryAnchor/);
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

test('renderer validates compile responses before storing them and has a global error boundary', () => {
  assert.match(generationSource, /assertCompileResult\(rawResult\)/);
  assert.match(generationSource, /生图编译结果格式无效/);
  assert.match(mainSource, /<AppErrorBoundary>/);
  assert.match(errorBoundarySource, /getDerivedStateFromError/);
  assert.match(errorBoundarySource, /页面加载失败/);
});
