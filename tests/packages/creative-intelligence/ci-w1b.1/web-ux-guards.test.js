/**
 * CI-W1B.1 Web UX Guards — static analysis over the CI workspace files.
 *
 * UX scenarios (Spec §44):
 *   UX02 main 9-stage rail absent by default
 *   UX03 upload click invokes picker (single handler, click + keyboard + drop)
 *   UX04 picker error visible
 *   UX10 Advanced Analysis reveals internal pipeline data
 *
 * Plus the CI-W1B hard invariants re-guarded for the new layout:
 *   - ci.selectDirection only through the confirm flow
 *   - recommendation never auto-selects
 *   - blocked Direction not selectable
 *   - no production CTA exposed
 *   - Web never imports @masterpiece/creative-intelligence
 *   - Web never reads run files
 *   - legacy /document-context retained
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..', '..');
const webRoot = path.join(repoRoot, 'apps', 'web', 'src');

const CI_WS_FILE = path.join(webRoot, 'components', 'CreativeIntelligenceWorkspace.tsx');
const CI_HELPER_DIR = path.join(webRoot, 'ciworkspace');
const CI_WS_FILES = [
  CI_WS_FILE,
  path.join(CI_HELPER_DIR, 'controller.ts'),
  path.join(CI_HELPER_DIR, 'types.ts'),
  path.join(CI_HELPER_DIR, 'format.ts')
];

const SEND_TO_PRODUCTION = /send.*to.*production|sendToProduction/;
const GENERATE_SPACE = /generateSpace|generate_space|Generate.*Space/i;
const GENERATE_PACKAGING = /generatePackaging|generate_packaging|Generate.*Packaging/i;
const PRODUCTION_PROMPT = /buildPrompt|build_prompt|productionPrompt/i;
const CI_PACKAGE_IMPORT = /from\s+['"]@masterpiece\/creative-intelligence(?:\/[^'"]+)?['"]/;
const FS_READ = /\bfs\.(read|readFile|readdir|readFileSync|readdirSync|statSync|stat|realpath|exists)/;

function readSafe(file) {
  try { return readFileSync(file, 'utf8'); } catch { return ''; }
}

const workspace = readSafe(CI_WS_FILE);

// ---------------------------------------------------------------------------
// UX02 — the 9-stage rail is not part of the default UI
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX02: main 9-stage rail is absent from the default UI', () => {
  assert.equal(workspace.includes('ci-workspace__rail'), false, 'stage rail container must not be rendered');
  assert.equal(workspace.includes('ci-stage--'), false, 'stage rail cards must not be rendered');
  assert.equal(/data-ciw-stage=/.test(workspace), false, 'stage-level data attributes must not be rendered');
  assert.equal(workspace.includes('STAGES.map'), false, 'the internal stage list must not be rendered as navigation');
});

test('CI-W1B.1 UX02: internal stage naming is not exposed as user-facing copy', () => {
  assert.equal(workspace.includes('Checkpoint A'), false, 'user-facing copy must not mention Checkpoint A');
  assert.equal(workspace.includes('Checkpoint B'), false, 'user-facing copy must not mention Checkpoint B');
  assert.equal(/Creative Intelligence Web Workspace/.test(workspace), false, 'input page title must be "Creative Intelligence"');
});

test('CI-W1B.1 UX02: user views are rendered by data-ciw-user-view instead', () => {
  assert.equal(/data-ciw-user-view=\{userView\}/.test(workspace), true, 'root element carries the user view');
  assert.equal(workspace.includes("'Creative Intelligence'"), true, 'input heading present');
  assert.equal(workspace.includes("'确认项目事实'"), true, 'fact review heading present');
  assert.equal(workspace.includes("'正在形成创意方向'"), true, 'thinking heading present');
  assert.equal(workspace.includes("'Creative Directions'"), true, 'direction decision heading present');
  assert.equal(workspace.includes("'视觉系统'"), true, 'visual system heading present');
});

// ---------------------------------------------------------------------------
// UX03 — upload click invokes the picker through a single handler
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX03: exactly one choose-documents handler exists', () => {
  const definitions = workspace.match(/const handleChooseDocuments = useCallback/g) ?? [];
  assert.equal(definitions.length, 1, 'handleChooseDocuments must be defined exactly once');
});

test('CI-W1B.1 UX03: upload hero click routes through the single handler', () => {
  assert.equal(workspace.includes('onClick={onChooseDocuments}'), true, 'upload hero click wired');
  assert.equal(workspace.includes('aria-label="上传项目资料，选择文档"'), true, 'upload hero is the labelled primary surface');
  assert.equal(workspace.includes('event.stopPropagation(); onChooseDocuments();'), true, '选择文档 button routes to the same handler');
});

test('CI-W1B.1 UX03: keyboard Enter and Space trigger the same handler', () => {
  assert.equal(workspace.includes("event.key === 'Enter' || event.key === ' '"), true, 'Enter/Space keydown wired');
  assert.equal(workspace.includes('tabIndex={0}'), true, 'upload surface is keyboard focusable');
});

test('CI-W1B.1 UX03: drag & drop routes into the same document-paths state', () => {
  assert.equal(workspace.includes('onDrop={'), true, 'drop handler wired');
  assert.equal(workspace.includes('window.masterpiece.files.getPathForFile'), true, 'dropped files are resolved to paths');
  assert.equal(/const handleChooseDocuments[\s\S]*window\.masterpiece\.documentContext\.chooseDocuments\(\)/.test(workspace), true, 'handler calls the documentContext picker');
});

test('CI-W1B.1 UX03: documentContext.chooseDocuments is invoked from the single handler only', () => {
  const matches = workspace.match(/documentContext\.chooseDocuments\(\)/g) ?? [];
  assert.equal(matches.length, 1, 'picker RPC must be called exactly once, from handleChooseDocuments');
});

// ---------------------------------------------------------------------------
// UX04 — picker errors are visible
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX04: picker failure shows a visible error instead of failing silently', () => {
  assert.equal(workspace.includes('无法打开文件选择器，请重试。'), true, 'user-facing picker error copy present');
  assert.equal(/if \(!chosen \|\| !chosen\.length\)/.test(workspace), true, 'empty picker result is detected');
  assert.equal(workspace.includes('setPickerErrorDetail('), true, 'raw detail is retained for advanced info');
  assert.equal(workspace.includes('role="alert"'), true, 'picker error is announced via role=alert');
  assert.equal(/catch \(reason\) \{[\s\S]*?setPickerError\(PICKER_UNAVAILABLE_TEXT\)/.test(workspace), true, 'thrown picker errors are surfaced');
});

test('CI-W1B.1 UX04: Start is disabled without document paths and enabled with them', () => {
  assert.equal(workspace.includes('disabled={busy || !profileId || !inputDocumentPaths.length}'), true, 'Start gated on document paths');
});

// ---------------------------------------------------------------------------
// UX10 — advanced analysis reveals internal pipeline data
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX10: advanced analysis drawer exposes internal pipeline data on demand', () => {
  assert.equal(workspace.includes('查看分析依据'), true, 'advanced-analysis entry label present');
  for (const section of ['Project Truth', 'Need', 'Insight', 'Opportunity', 'Concept', 'Evaluation', 'Trace', 'Diagnostics', 'Selection Revision', 'Canon Version', 'Translation Version']) {
    assert.equal(workspace.includes(section), true, `drawer must include ${section}`);
  }
});

test('CI-W1B.1 UX10: diagnostics use user-facing severity labels in the drawer', () => {
  assert.equal(workspace.includes('需要处理 ('), true, 'blocking → 需要处理');
  assert.equal(workspace.includes('提醒 ('), true, 'warning → 提醒');
  assert.equal(workspace.includes('技术信息 ('), true, 'diagnostic → 技术信息');
});

// ---------------------------------------------------------------------------
// UX05 / UX06 / UX07 / UX08 / UX09 — component-level copy guards
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX05: fact review uses user copy and merged CTA', () => {
  assert.equal(workspace.includes('确认事实并继续'), true, 'CTA must read 确认事实并继续');
  assert.equal(workspace.includes('标记未知'), true, 'unknown action label present');
  assert.equal(workspace.includes('查看来源'), true, 'source action label present');
  assert.equal(/进入 Understanding/.test(workspace), false, 'internal stage navigation copy removed');
});

test('CI-W1B.1 UX06: single thinking state renders the three friendly steps', () => {
  for (const step of ['理解项目核心信息', '梳理创意机会', '生成并评估创意方向']) {
    assert.equal(workspace.includes(step), true, `thinking step ${step} must be present`);
  }
});

test('CI-W1B.1 UX07: direction decision merges evaluation + selection into one experience', () => {
  assert.equal(workspace.includes('选择创意方向'), true, 'merged decision heading present');
  assert.equal(workspace.includes('查看完整方向'), true, 'advanced detail is collapsed behind a toggle');
  assert.equal(workspace.includes('选择此方向'), true, 'selection CTA present on each card');
  assert.equal(workspace.includes('不可选择'), true, 'blocked direction CTA present');
});

test('CI-W1B.1 UX08: recommendation stays advisory in the UI', () => {
  assert.equal(workspace.includes('系统推荐不会替代你的选择。'), true, 'confirm dialog carries the advisory copy');
  assert.equal(workspace.includes('系统推荐：'), true, 'recommendation banner present');
  assert.equal(workspace.includes('为什么推荐'), true, 'recommendation rationale is optional disclosure');
});

test('CI-W1B.1 UX09: visual system view uses user-facing labels', () => {
  assert.equal(workspace.includes('核心视觉原则'), true, 'canon user label present');
  assert.equal(workspace.includes('视觉验收标准'), true, 'anchor contract user label present');
  assert.equal(workspace.includes('应用适配'), true, 'translation user label present');
  assert.equal(workspace.includes('空间适配'), true, 'space adaptation label present');
  assert.equal(workspace.includes('包装适配'), true, 'packaging adaptation label present');
  assert.equal(workspace.includes('必须保留'), true, 'must-preserve bucket label present');
  assert.equal(workspace.includes('可以调整'), true, 'may-adapt bucket label present');
  assert.equal(workspace.includes('不能引入'), true, 'must-not-introduce bucket label present');
});

// ---------------------------------------------------------------------------
// CI-W1B hard invariants — re-guarded for the new layout
// ---------------------------------------------------------------------------

test('CI-W1B.1 INVARIANT: selectDirection is ONLY called from the post-confirm handler', () => {
  const matches = workspace.match(/ci\.selectDirection\(/g) ?? [];
  assert.equal(matches.length, 1, 'ci.selectDirection must be called exactly once (post-confirm)');
});

test('CI-W1B.1 INVARIANT: recommendation primaryDirectionId is never applied as selectedDirectionId', () => {
  for (const file of CI_WS_FILES) {
    const text = readSafe(file);
    assert.equal(
      /primaryDirectionId[^\n]*selectedDirectionId|selectedDirectionId[^\n]*primaryDirectionId/.test(text),
      false,
      `Forbidden recommendation→selection assignment in ${path.relative(repoRoot, file)}`
    );
  }
});

test('CI-W1B.1 INVARIANT: no production CTA exposed anywhere in the CI workspace', () => {
  for (const file of CI_WS_FILES) {
    const text = readSafe(file);
    assert.equal(SEND_TO_PRODUCTION.test(text), false, `forbidden production CTA in ${path.relative(repoRoot, file)}`);
    assert.equal(GENERATE_SPACE.test(text), false, `forbidden space CTA in ${path.relative(repoRoot, file)}`);
    assert.equal(GENERATE_PACKAGING.test(text), false, `forbidden packaging CTA in ${path.relative(repoRoot, file)}`);
    assert.equal(PRODUCTION_PROMPT.test(text), false, `forbidden production prompt reference in ${path.relative(repoRoot, file)}`);
  }
});

test('CI-W1B.1 INVARIANT: Web never imports @masterpiece/creative-intelligence and never reads run files', () => {
  for (const file of CI_WS_FILES) {
    const text = readSafe(file);
    assert.equal(CI_PACKAGE_IMPORT.test(text), false, `forbidden CI package import in ${path.relative(repoRoot, file)}`);
    assert.equal(FS_READ.test(text), false, `forbidden fs read in ${path.relative(repoRoot, file)}`);
  }
});

test('CI-W1B.1 INVARIANT: controller + types + format stay pure (no React, no DOM, no fs)', () => {
  for (const sub of ['controller.ts', 'types.ts', 'format.ts']) {
    const text = readSafe(path.join(CI_HELPER_DIR, sub));
    assert.equal(/from\s+['"]react['"]/.test(text), false, `${sub} must not import React`);
    assert.equal(/document\.|window\./.test(text), false, `${sub} must not access DOM/window`);
    assert.equal(/\bfs\./.test(text), false, `${sub} must not use fs`);
  }
});

test('CI-W1B.1 INVARIANT: no selection → Canon and Translation stay locked in the UI', () => {
  assert.equal(workspace.includes('canonLocked = !selectedDirectionId'), true, 'canon lock derived from selection');
  assert.equal(workspace.includes('translationLocked = canonLocked || !activeView?.visualCanon'), true, 'translation lock derived from canon');
  assert.equal(workspace.includes('选择创意方向后才会生成视觉系统。'), true, 'locked canon renders user-facing explanation');
});

test('CI-W1B.1 INVARIANT: legacy /document-context is retained', () => {
  const app = readSafe(path.join(webRoot, 'App.tsx'));
  assert.equal(/DocumentContextWorkspace/.test(app), true, 'App.tsx must still import DocumentContextWorkspace');
  const tabs = readSafe(path.join(webRoot, 'components', 'AnalysisModeTabs.tsx'));
  assert.equal(/document-context/.test(tabs), true, 'document-context mode key kept for back-compat');
  assert.equal(/creative-intelligence/.test(tabs), true, 'creative-intelligence stays the primary mode');
});
