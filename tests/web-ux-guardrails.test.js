import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('analysis workflows only offer analysis-compatible profiles', () => {
  for (const file of [
    'ProjectWizard.tsx',
    'CreativeIntelligenceWorkspace.tsx',
    'ReferenceAnchorWorkspace.tsx',
    'DocumentContextWorkspace.tsx',
  ]) {
    const source = read('apps', 'web', 'src', 'components', file);
    assert.match(source, /profile\.modelType === 'analysis'/, `${file} must filter model responsibility`);
    assert.match(source, /profile\.protocol === 'openai-chat-multimodal'/, `${file} must filter analysis protocol`);
  }
});

test('visual system defaults to readable summaries instead of raw JSON', () => {
  const source = read('apps', 'web', 'src', 'components', 'CreativeIntelligenceWorkspace.tsx');
  assert.match(source, /summarizeVisualDna\(visualCanon\.visualDNA\)/);
  assert.match(source, /summarizeVisualGrammar\(grammar\)/);
  assert.match(source, /summarizeCrossMediaCanon\(visualCanon\.crossMediaCanon\)/);
  assert.doesNotMatch(source, /title="视觉 DNA" value=\{plainText\(visualCanon\.visualDNA\)\}/);
  assert.match(source, /parentSelectionRevision=\{activeView\?\.run\.selectionRevision \?\? 0\}/);
});

test('create shell removes cross-function tabs while preserving hidden anchor wiring', () => {
  const createPage = read('apps', 'web', 'src', 'pages', 'CreatePage.tsx');
  const tabs = read('apps', 'web', 'src', 'components', 'AnalysisModeTabs.tsx');
  assert.match(createPage, /<ReferenceAnchorWorkspace[\s\S]*?hideChrome/);
  assert.match(tabs, /需已分析项目与 4–8 张参考图/);
  assert.doesNotMatch(createPage, /<AnalysisModeTabs\b/);
});

test('home record cards avoid nested interactive controls and preserve approved CTA behavior', () => {
  const app = read('apps', 'web', 'src', 'App.tsx');
  assert.match(app, /<article key=\{recordKey\} className="record-card">/);
  assert.match(app, /className="record-card__open"/);
  assert.match(app, /setAnalysisMode\('visual-analysis'\); setScreen\('create'\)/);
});

test('theme automatic mode is named explicitly', () => {
  const source = read('apps', 'web', 'src', 'theme', 'ThemeToggle.tsx');
  assert.match(source, /value: 'system', label: '自动'/);
});

test('visual analysis upload surface opens the file picker', () => {
  const source = read('apps', 'web', 'src', 'components', 'VisualAssetUploader.tsx');
  assert.match(source, /className="intake-drop-zone__picker"/);
  assert.match(source, /onClick=\{\(\) => void chooseAndAdd\(onChooseFiles, 'files'\)\}/);
  assert.match(source, /aria-label="选择要上传的视觉素材"/);
  assert.match(source, /ref=\{fileInputRef\} hidden type="file" multiple/);
  assert.match(source, /onAddBrowserFiles\(entries\)/);
  const runtime = read('apps', 'web-runtime', 'src', 'current-operation-graph.ts');
  assert.match(runtime, /'projects:create-from-browser-files'/);
  assert.match(runtime, /'projects:import-browser-files'/);
});

test('production UX hides diagnostics and unfinished milestones by default', () => {
  const decisions = read('apps', 'web', 'src', 'features', 'short-chain', 'DecisionStream.tsx');
  const briefCss = read('apps', 'web', 'src', 'features', 'short-chain', 'brief-editor.css');
  const report = read('apps', 'web', 'src', 'components', 'ReportView.tsx');
  const project = read('apps', 'web', 'src', 'components', 'ProjectDetail.tsx');
  const creative = read('apps', 'web', 'src', 'components', 'CreativeIntelligenceWorkspace.tsx');
  assert.doesNotMatch(decisions, /P1\.1|session\.history|compile → run/);
  assert.match(briefCss, /\.sc-advanced__content\[hidden\] \{ display: none; \}/);
  assert.match(report, /<details className="ux-advanced report-v2__advanced">/);
  assert.match(project, /高级：文档关联与上下文冲突处理/);
  assert.doesNotMatch(creative, /CI-10 启动/);
});
