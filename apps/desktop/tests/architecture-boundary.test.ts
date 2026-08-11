import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..', '..', '..');
const webRoot = path.join(repositoryRoot, 'apps', 'web', 'src');

async function filesUnder(root: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(target));
    else result.push(target);
  }
  return result;
}

test('core v5 never depends on Desktop', async () => {
  const files = await filesUnder(path.join(repositoryRoot, 'apps', 'cli', 'src', 'v5'));
  const source = (await Promise.all(files.filter((file) => file.endsWith('.js')).map((file) => fs.readFile(file, 'utf8')))).join('\n');
  assert.doesNotMatch(source, /apps[\\/]desktop|desktop[\\/](src|out)/i);
});

test('Shared pipeline calls runV5Pipeline directly and Desktop only keeps a compatibility export', async () => {
  const source = await fs.readFile(path.join(repositoryRoot, 'packages', 'runtime-core', 'src', 'application', 'pipeline-service.ts'), 'utf8');
  const compatibility = await fs.readFile(path.join(repositoryRoot, 'apps', 'desktop', 'src', 'main', 'pipeline-service.ts'), 'utf8');
  assert.match(source, /runV5Pipeline/);
  assert.doesNotMatch(source, /child_process|exec\s*\(|spawn\s*\(|npm run analyze/);
  assert.match(compatibility, /@masterpiece\/runtime-core/);
});

test('sandboxed renderer loads the bundled CommonJS preload artifact', async () => {
  const source = await fs.readFile(path.join(repositoryRoot, 'apps', 'desktop', 'src', 'main', 'index.ts'), 'utf8');
  const config = await fs.readFile(path.join(repositoryRoot, 'apps', 'desktop', 'electron.vite.config.ts'), 'utf8');
  assert.match(source, /preload\/index\.cjs/);
  assert.doesNotMatch(source, /preload\/index\.js/);
  assert.match(config, /format:\s*'cjs'/);
  assert.match(config, /entryFileNames:\s*'\[name\]\.cjs'/);
});

test('default Windows artifact is portable and does not create an installer', async () => {
  const config = await fs.readFile(path.join(repositoryRoot, 'apps', 'desktop', 'electron-builder.yml'), 'utf8');
  const rootPackage = await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8');
  assert.match(config, /target:\s*\r?\n\s*- portable/);
  assert.match(config, /Desktop-Portable/);
  assert.doesNotMatch(config, /\bnsis\b/i);
  assert.match(rootPackage, /desktop:package[^\n]+package:portable/);
});

test('new analysis UI contains intake actions and API Profile choice without metadata form', async () => {
  const source = await fs.readFile(path.join(webRoot, 'components', 'ProjectWizard.tsx'), 'utf8');
  const uploader = await fs.readFile(path.join(webRoot, 'components', 'VisualAssetUploader.tsx'), 'utf8');
  assert.doesNotMatch(source, /<input|<textarea/);
  assert.match(source, /分析模型/);
  assert.doesNotMatch(source, /choose\('logo'\)|choose\('brief'\)/);
  assert.match(source, /VisualAssetUploader/);
  assert.match(uploader, /选择文件夹/);
  assert.match(uploader, /onDrop=/);
  assert.match(source, /开始分析/);
  assert.match(source, /sourcePaths/);
});

test('API Profile provider is free-form and not restricted to Qwen choices', async () => {
  const types = await fs.readFile(path.join(repositoryRoot, 'packages', 'runtime-core', 'src', 'application-contracts.ts'), 'utf8');
  const settings = await fs.readFile(path.join(webRoot, 'components', 'SettingsPanel.tsx'), 'utf8');
  assert.match(types, /type ProviderKind = string/);
  assert.match(settings, /Provider 标识/);
  assert.match(settings, /provider-suggestions/);
  assert.doesNotMatch(settings, /<select value=\{editor\.provider\}/);
});

test('analysis API selection is controlled by App and survives settings navigation', async () => {
  const app = await fs.readFile(path.join(webRoot, 'App.tsx'), 'utf8');
  assert.match(app, /selectedApiProfileId=\{selectedApiProfileId\}/);
  assert.match(app, /onApiProfileChange=\{setSelectedApiProfileId\}/);
  assert.match(app, /setSettingsReturnScreen\('create'\)/);
});

test('Desktop no longer wires the experimental visual-translation / reference-translation flows', async () => {
  const componentsRoot = path.join(webRoot, 'components');
  const componentFiles = await fs.readdir(componentsRoot);
  assert.ok(!componentFiles.includes('VisualTranslationWorkspace.tsx'), 'VisualTranslationWorkspace.tsx 应已删除');
  assert.ok(!componentFiles.includes('ReferenceTranslationWorkspace.tsx'), 'ReferenceTranslationWorkspace.tsx 应已删除');
  assert.ok(!componentFiles.includes('LegacyHistoryWorkspace.tsx'), 'LegacyHistoryWorkspace.tsx 应已删除');
  const mainFiles = await fs.readdir(path.join(repositoryRoot, 'apps', 'desktop', 'src', 'main'));
  assert.ok(!mainFiles.includes('visual-translation-service.ts'), 'visual-translation-service.ts 应已删除');
  assert.ok(!mainFiles.includes('reference-translation-service.ts'), 'reference-translation-service.ts 应已删除');
  const mainIndex = await fs.readFile(path.join(repositoryRoot, 'apps', 'desktop', 'src', 'main', 'index.ts'), 'utf8');
  const preload = await fs.readFile(path.join(repositoryRoot, 'apps', 'desktop', 'src', 'preload', 'index.ts'), 'utf8');
  const app = await fs.readFile(path.join(webRoot, 'App.tsx'), 'utf8');
  assert.doesNotMatch(mainIndex, /visual-translation:|reference-translation:/);
  assert.doesNotMatch(preload, /visualTranslation|referenceTranslation/);
  assert.doesNotMatch(app, /visualTranslation\.|referenceTranslation\.|LegacyHistoryWorkspace/);
});

test('analysis intake shares tabs and home distinguishes the three production record types', async () => {
  const app = await fs.readFile(path.join(webRoot, 'App.tsx'), 'utf8');
  const tabs = await fs.readFile(path.join(webRoot, 'components', 'AnalysisModeTabs.tsx'), 'utf8');
  assert.match(app, /<AnalysisModeTabs/);
  assert.match(tabs, /视觉分析/);
  assert.match(tabs, /文档上下文提取/);
  assert.match(tabs, /参考锚定（Anchor）/);
  assert.doesNotMatch(tabs, /文档视觉转译/);
  assert.doesNotMatch(tabs, /参考风格重构/);
  assert.match(app, /record-type visual-analysis/);
  assert.match(app, /record-type document-context/);
  assert.match(app, /record-type reference-anchor/);
  assert.doesNotMatch(app, /initialRunId=\{requestedReconstructionRunId\}/);
});

test('recent project rows expose a destructive local-folder delete action', async () => {
  const app = await fs.readFile(path.join(webRoot, 'App.tsx'), 'utf8');
  const store = await fs.readFile(path.join(repositoryRoot, 'packages', 'runtime-core', 'src', 'application', 'project-store.ts'), 'utf8');
  assert.match(app, /project-delete/);
  assert.match(app, /永久删除该项目对应的本地文件夹/);
  assert.match(app, /projects\.remove\(project\.id\)/);
  assert.match(store, /fs\.rm\(root,\s*\{\s*recursive:\s*true/);
});

test('reference reconstruction prompts stay isolated from upstream Markdown reports', async () => {
  const prompts = await fs.readFile(path.join(repositoryRoot, 'packages', 'runtime-core', 'src', 'application', 'reference-reconstruction-prompts.ts'), 'utf8');
  assert.match(prompts, /只能使用下面两个干净 JSON/);
  assert.match(prompts, /不得假设或引用任何上游 Markdown 报告/);
  assert.doesNotMatch(prompts, /CATEGORY_PREFIX|wrapAsStyleRule/);
});

test('Reference Anchor workspace supports uploading a new current project inline', async () => {
  const workspace = await fs.readFile(path.join(webRoot, 'components', 'ReferenceAnchorWorkspace.tsx'), 'utf8');
  // 当前项目来源切换：选择已有项目 / 上传新项目。
  assert.match(workspace, /projectSourceMode/);
  assert.match(workspace, /上传新项目/);
  assert.match(workspace, /选择已有项目/);
  // 上传模式复用通用拖拽上传组件，并驱动建项目 + 视觉分析。
  assert.match(workspace, /VisualAssetUploader/);
  assert.match(workspace, /role="current_project"/);
  assert.match(workspace, /projects\.create\(\{ sourcePaths/);
  assert.match(workspace, /analysis\.start\(uploadProject\.id/);
  // 分析完成后自动设为当前项目。
  assert.match(workspace, /setSelectedProjectId\(finished\.id\)/);
});

test('API Key is encrypted outside project records', async () => {
  const credentials = await fs.readFile(path.join(repositoryRoot, 'apps', 'desktop', 'src', 'main', 'settings-store.ts'), 'utf8');
  const projects = await fs.readFile(path.join(repositoryRoot, 'apps', 'desktop', 'src', 'main', 'project-store.ts'), 'utf8');
  assert.match(credentials, /safeStorage\.encryptStringAsync/);
  assert.match(credentials, /encryptedApiKey/);
  assert.doesNotMatch(projects, /apiKey|encryptedApiKey/);
});
