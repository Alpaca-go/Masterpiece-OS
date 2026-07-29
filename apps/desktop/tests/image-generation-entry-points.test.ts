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
  assert.match(referenceSource, /快速提取到生产系统/);
  assert.match(referenceSource, /quickExtractStyle/);
});

test('Creative Session workspace separates Visual Analysis from the creative workbench', () => {
  assert.match(creativeSessionSource, /creativeSession\.getWorkspace/);
  assert.doesNotMatch(creativeSessionSource, /creativeSession\.read/);
  assert.match(creativeSessionSource, /creativeSession\.generate/);
  assert.match(creativeSessionSource, /Creative Foundation/);
  assert.match(creativeSessionSource, /Creative Command/);
  assert.match(creativeSessionSource, /Generation History/);
  assert.match(creativeSessionSource, /Visual System/);
  assert.match(creativeSessionSource, /品牌升级海报/);
  assert.match(creativeSessionSource, /包装效果图/);
  assert.match(creativeSessionSource, /店内空间效果图/);
  assert.match(creativeSessionSource, /VI 应用展示/);
  assert.match(creativeSessionSource, /outputType: selectedCommand\?\.outputType/);
  assert.match(creativeSessionSource, /Prompt Compiler/);
  assert.match(creativeSessionSource, /Image Generation Adapter/);
  assert.match(creativeSessionSource, /generateAnchorSet/);
  assert.match(creativeSessionSource, /Anchor Candidates/);
  assert.match(creativeSessionSource, /anchor-comparison-grid/);
  assert.match(creativeSessionSource, /多候选比较与人工 Primary 选择/);
  for (const ruleGroup of ['色彩', '材质', '光线', '构图', '字体', '空间', '禁止项']) {
    assert.match(creativeSessionSource, new RegExp(`label: '${ruleGroup}'`));
  }
  assert.match(creativeSessionSource, /getRunMetadata/);
  assert.match(creativeSessionSource, /Evaluation Score/);
  assert.match(creativeSessionSource, /Brand Alignment/);
  assert.match(creativeSessionSource, /Visual Consistency/);
  assert.match(creativeSessionSource, /Asset Usability/);
  assert.match(creativeSessionSource, /Deviation Detection/);
  assert.match(creativeSessionSource, /creativeSession\.evaluate/);
  assert.match(creativeSessionSource, /regenerateFromEvaluation/);
  assert.match(creativeSessionSource, /按评价重新生成/);
  assert.match(creativeSessionSource, /修改内容/);
  assert.match(creativeSessionSource, /返回 Visual Analysis/);
  assert.match(creativeSessionSource, /例如：生成一张升级后的店内装修效果图/);
  assert.match(creativeSessionSource, /开始创作/);
  assert.match(creativeSessionSource, /Creative Direction/);
  assert.match(creativeSessionSource, /当前创作方向/);
  assert.match(creativeSessionSource, /设计重点/);
  assert.doesNotMatch(creativeSessionSource, /GenerationSourcePreset|Reference Role|deliverable-card/);
});

test('V6 workspace exposes production gates instead of bypassing confirmation', () => {
  assert.match(creativeSessionSource, /建立 Style Profile 与 Locked Assets/);
  assert.match(creativeSessionSource, /确认 Style Profile/);
  assert.match(creativeSessionSource, /生成 \$\{anchorCandidateCount\} 个候选/);
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
  assert.match(creativeSessionSource, /regenerateContext/);
  assert.match(creativeSessionSource, /根据变化方向重新生成上下文/);
  assert.match(creativeSessionSource, /styleProfileVersion === workspace\?\.styleProfile\?\.version/);
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
