import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..', '..');
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
  const files = await filesUnder(path.join(repositoryRoot, 'apps', 'cli', 'src', 'analysis-engine'));
  const source = (await Promise.all(files.filter((file) => file.endsWith('.js')).map((file) => fs.readFile(file, 'utf8')))).join('\n');
  assert.doesNotMatch(source, /apps[\\/]desktop|desktop[\\/](src|out)/i);
});

test('shared pipeline calls runAnalysisPipeline directly without a host subprocess', async () => {
  const source = await fs.readFile(path.join(repositoryRoot, 'packages', 'runtime-core', 'src', 'application', 'pipeline-service.ts'), 'utf8');
  assert.match(source, /runAnalysisPipeline/);
  assert.doesNotMatch(source, /child_process|exec\s*\(|spawn\s*\(|npm run analyze/);
});

test('primary development entry starts the Node Web Host', async () => {
  const rootPackage = await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8');
  const runner = await fs.readFile(path.join(repositoryRoot, 'apps', 'web-runtime', 'scripts', 'run-web-dev.mjs'), 'utf8');
  assert.match(rootPackage, /web:dev[^\n]+apps\/web-runtime/);
  assert.match(runner, /src', 'main\.ts/);
  assert.doesNotMatch(runner, /from ['"]electron['"]|apps[\\/]desktop/i);
});

test('analysis UI contains intake actions and a free-form API Profile provider', async () => {
  const wizard = await fs.readFile(path.join(webRoot, 'components', 'ProjectWizard.tsx'), 'utf8');
  const uploader = await fs.readFile(path.join(webRoot, 'components', 'VisualAssetUploader.tsx'), 'utf8');
  const types = await fs.readFile(path.join(repositoryRoot, 'packages', 'runtime-core', 'src', 'application-contracts.ts'), 'utf8');
  const settings = await fs.readFile(path.join(webRoot, 'components', 'settings', 'ProfilesSection.tsx'), 'utf8');
  assert.doesNotMatch(wizard, /<input|<textarea/);
  assert.match(wizard, /VisualAssetUploader/);
  assert.match(wizard, /sourcePaths/);
  assert.match(uploader, /onDrop=/);
  assert.match(types, /type ProviderKind = string/);
  assert.match(settings, /provider-suggestions/);
  assert.doesNotMatch(settings, /<select value=\{editor\.provider\}/);
});

test('analysis API selection is controlled by App and survives settings navigation', async () => {
  const app = await fs.readFile(path.join(webRoot, 'App.tsx'), 'utf8');
  const createPage = await fs.readFile(path.join(webRoot, 'pages', 'CreatePage.tsx'), 'utf8');
  assert.match(app, /selectedApiProfileId=\{selectedApiProfileId\}/);
  assert.match(createPage, /onApiProfileChange=\{setSelectedApiProfileId\}/);
  assert.match(createPage, /setSettingsReturnScreen\('create'\)/);
});

test('Web exposes only the current production workspaces', async () => {
  const components = await fs.readdir(path.join(webRoot, 'components'));
  assert.ok(!components.includes('VisualTranslationWorkspace.tsx'));
  assert.ok(!components.includes('ReferenceTranslationWorkspace.tsx'));
  assert.ok(!components.includes('LegacyHistoryWorkspace.tsx'));
  const app = await fs.readFile(path.join(webRoot, 'App.tsx'), 'utf8');
  assert.doesNotMatch(app, /visualTranslation\.|referenceTranslation\.|LegacyHistoryWorkspace/);
});

test('recent project rows retain the destructive local-folder delete action', async () => {
  const app = await fs.readFile(path.join(webRoot, 'App.tsx'), 'utf8');
  const store = await fs.readFile(path.join(repositoryRoot, 'packages', 'runtime-core', 'src', 'application', 'project-store.ts'), 'utf8');
  assert.match(app, /project-delete/);
  assert.match(app, /projects\.remove\(project\.id\)/);
  assert.match(store, /fs\.rm\(root,\s*\{\s*recursive:\s*true/);
});

test('reference reconstruction prompts stay isolated from upstream Markdown reports', async () => {
  const prompts = await fs.readFile(path.join(repositoryRoot, 'packages', 'runtime-core', 'src', 'application', 'reference-reconstruction-prompts.ts'), 'utf8');
  assert.doesNotMatch(prompts, /CATEGORY_PREFIX|wrapAsStyleRule/);
});

test('Reference Anchor workspace supports uploading a current project inline', async () => {
  const workspace = await fs.readFile(path.join(webRoot, 'components', 'ReferenceAnchorWorkspace.tsx'), 'utf8');
  assert.match(workspace, /projectSourceMode/);
  assert.match(workspace, /VisualAssetUploader/);
  assert.match(workspace, /role="current_project"/);
  assert.match(workspace, /projects\.create\(\{ sourcePaths/);
  assert.match(workspace, /analysis\.start\(uploadProject\.id/);
  assert.match(workspace, /setSelectedProjectId\(finished\.id\)/);
});

test('API Key is encrypted outside project records', async () => {
  const credentials = await fs.readFile(path.join(repositoryRoot, 'apps', 'web-runtime', 'src', 'node-credential-store.ts'), 'utf8');
  const projects = await fs.readFile(path.join(repositoryRoot, 'packages', 'runtime-core', 'src', 'application', 'project-store.ts'), 'utf8');
  assert.match(credentials, /createCipheriv\('aes-256-gcm'/);
  assert.match(credentials, /master\.key/);
  assert.doesNotMatch(projects, /apiKey|encryptedApiKey/);
});
