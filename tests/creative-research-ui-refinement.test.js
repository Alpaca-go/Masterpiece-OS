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
  assert.match(workspace, /Promise\.all\(projects\.map\(\(project\) => api\.listSessions\(project\.id\)\)\)/u);
});

test('recent Creative Research sessions retain destructive deletion controls', () => {
  const workspace = read('apps', 'web', 'src', 'features', 'creative-research', 'CreativeResearchWorkspace.tsx');
  assert.match(workspace, /const approved = await confirm\(\{/u);
  assert.match(workspace, /tone: 'destructive'/u);
  assert.match(workspace, /api\.deleteSession\(target\.id\)/u);
  assert.match(workspace, /setSessions\(\(current\) => current\.filter\(\(item\) => item\.id !== target\.id\)\)/u);
  assert.match(workspace, /className="cr-recent__delete"/u);
  assert.match(workspace, />删除<\/button>/u);
});

test('formal Creative Research UI is disconnected from legacy search credentials', () => {
  const workspace = read('apps', 'web', 'src', 'features', 'creative-research', 'CreativeResearchWorkspace.tsx');
  const settings = read('apps', 'web', 'src', 'components', 'SettingsPanel.tsx');
  const service = read('apps', 'web', 'src', 'components', 'settings', 'ResearchServicesSection.tsx');
  assert.doesNotMatch(workspace, /credentialValue|placeholder="百度搜索 API Key"|保存凭据/u);
  assert.doesNotMatch(workspace, /onOpenResearchSettings/u);
  assert.doesNotMatch(settings, /section-research-services/u);
  assert.doesNotMatch(settings, /<ResearchServicesSection/u);
  assert.match(service, /getSearchCredentialStatus/u);
  assert.match(service, /saveSearchCredential/u);
  assert.match(service, /deleteSearchCredential/u);
  assert.match(service, /type="password"/u);
});

test('normal UI exposes Creative Direction and Visual Transfer while preserving hidden standalone routes', () => {
  const app = read('apps', 'web', 'src', 'App.tsx');
  const createPage = read('apps', 'web', 'src', 'pages', 'CreatePage.tsx');
  const visibility = read('apps', 'web', 'src', 'config', 'ui-visibility.ts');
  assert.match(visibility, /creativeDirection: true/u);
  assert.match(visibility, /creativeIntelligenceStandalone: false/u);
  assert.match(visibility, /creativeResearchStandalone: false/u);
  assert.match(visibility, /referenceStyle: true/u);
  assert.match(app, /UI_VISIBILITY\.creativeDirection/u);
  assert.match(app, /创意策划 →/u);
  assert.doesNotMatch(app, /智能创意 →|创意研究 →/u);
  assert.match(app, /screen === 'creative-intelligence'/u);
  assert.match(app, /screen === 'creative-research'/u);
  assert.match(app, /UI_VISIBILITY\.referenceStyle/u);
  assert.match(app, /视觉迁移 →/u);
  assert.doesNotMatch(app, /TopBarSegment/u);
  assert.doesNotMatch(createPage, /<AnalysisModeTabs\b/u);
});

test('Creative Direction intake uploads documents and recent records can be deleted', () => {
  const workspace = read('apps', 'web', 'src', 'features', 'creative-direction', 'CreativeDirectionWorkspace.tsx');
  assert.match(workspace, /accept="\.pdf,\.docx,\.md,\.markdown,\.txt"/u);
  assert.match(workspace, /documentContext\.importDocuments/u);
  assert.match(workspace, /sourceDocumentIds, sourceDocumentLabels/u);
  assert.match(workspace, /props\.onNavigate\(`\/creative-direction\/\$\{value\.session\.id\}`\);[\s\S]*finally \{ setBusy\(false\); \}/u);
  assert.match(workspace, /creativeDirection\.deleteSession\(target\.id\)/u);
  assert.match(workspace, /tone: 'destructive'/u);
  assert.match(workspace, /className="cd-list__delete"/u);
  assert.match(workspace, />删除<\/button>/u);
});

test('research execution panel derives stages from persisted state and real counts', () => {
  const panel = read('apps', 'web', 'src', 'features', 'creative-research', 'ResearchExecutionPanel.tsx');
  assert.match(panel, /input\.guideReady/u);
  assert.match(panel, /input\.session\.status === 'RESEARCH'/u);
  assert.match(panel, /input\.judgedCount/u);
  assert.match(panel, /input\.referenceCount/u);
  assert.match(panel, /input\.preferenceCount/u);
  assert.doesNotMatch(panel, /query\.status/u);
  assert.match(panel, /ResearchExecutionStageState = 'completed' \| 'active' \| 'waiting' \| 'failed'/u);
  assert.doesNotMatch(panel, /Chain of Thought|正在思考|\bpercent(?:age)?\b/iu);
});
