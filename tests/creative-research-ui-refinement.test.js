import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...segments) => readFileSync(path.join(root, ...segments), 'utf8');

test('Creative Research intake requires explicit project and document selection', () => {
  const workspace = read('apps', 'web', 'src', 'features', 'creative-research', 'CreativeResearchWorkspace.tsx');
  assert.match(workspace, /const \[projectId, setProjectId\] = useState\(''\)/u);
  assert.match(workspace, /<option value="" disabled>请选择项目<\/option>/u);
  assert.match(workspace, /const createReady = Boolean\(projectId && documents\.length && profileId && !busy\)/u);
  assert.match(workspace, /disabled=\{!createReady\}/u);
  assert.match(workspace, /Promise\.all\(projects\.map\(\(item\) => api\.listSessions\(item\.id\)\)\)/u);
});

test('search credential editing lives in Research Services settings only', () => {
  const workspace = read('apps', 'web', 'src', 'features', 'creative-research', 'CreativeResearchWorkspace.tsx');
  const settings = read('apps', 'web', 'src', 'components', 'SettingsPanel.tsx');
  const service = read('apps', 'web', 'src', 'components', 'settings', 'ResearchServicesSection.tsx');
  assert.doesNotMatch(workspace, /credentialValue|placeholder="百度搜索 API Key"|保存凭据/u);
  assert.match(workspace, /onOpenResearchSettings/u);
  assert.match(settings, /section-research-services/u);
  assert.match(settings, /<ResearchServicesSection/u);
  assert.match(service, /getSearchCredentialStatus/u);
  assert.match(service, /saveSearchCredential/u);
  assert.match(service, /deleteSearchCredential/u);
  assert.match(service, /type="password"/u);
});

test('normal UI hides deferred capabilities and removes duplicate navigation tabs', () => {
  const app = read('apps', 'web', 'src', 'App.tsx');
  const createPage = read('apps', 'web', 'src', 'pages', 'CreatePage.tsx');
  const visibility = read('apps', 'web', 'src', 'config', 'ui-visibility.ts');
  assert.match(visibility, /smartCreative: false/u);
  assert.match(visibility, /referenceStyle: false/u);
  assert.match(app, /UI_VISIBILITY\.smartCreative/u);
  assert.match(app, /UI_VISIBILITY\.referenceStyle/u);
  assert.doesNotMatch(app, /TopBarSegment/u);
  assert.doesNotMatch(createPage, /<AnalysisModeTabs\b/u);
});

test('research execution panel derives stages from persisted state and real counts', () => {
  const panel = read('apps', 'web', 'src', 'features', 'creative-research', 'ResearchExecutionPanel.tsx');
  assert.match(panel, /query\.status === 'COMPLETED'/u);
  assert.match(panel, /query\.status === 'FAILED'/u);
  assert.match(panel, /query\.status === 'PENDING'/u);
  assert.match(panel, /input\.referenceCount/u);
  assert.match(panel, /input\.preferenceCount/u);
  assert.match(panel, /ResearchExecutionStageState = 'completed' \| 'active' \| 'waiting' \| 'failed'/u);
  assert.doesNotMatch(panel, /Chain of Thought|正在思考|\bpercent(?:age)?\b/iu);
});
