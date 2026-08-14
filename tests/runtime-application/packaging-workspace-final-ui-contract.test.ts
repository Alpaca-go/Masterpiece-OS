import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const FEATURE = path.join(ROOT, 'apps', 'web', 'src', 'features', 'packaging');
const WORKSPACE = readFileSync(path.join(FEATURE, 'PackagingWorkspace.tsx'), 'utf8');
const SERVICE = readFileSync(path.join(FEATURE, 'service.ts'), 'utf8');
const CSS = readFileSync(path.join(FEATURE, 'PackagingWorkspace.module.css'), 'utf8');
const SOURCE = `${WORKSPACE}\n${SERVICE}`;

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
}

function gitDiff(base: string, target: string): string[] {
  const output = execFileSync('git', ['diff', '--name-only', base, 'HEAD', '--', target], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return output.split(/\r?\n/u).filter(Boolean);
}

test('AD-01 Packaging UI has no backend implementation import', () => {
  assert.doesNotMatch(SOURCE, /packages\/runtime-core\/src|apps\/web-runtime|packaging-operations/u);
});

test('AD-02 Packaging UI performs no Provider network request', () => {
  assert.doesNotMatch(stripComments(SOURCE), /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/u);
});

test('AD-03 Packaging UI has no credential or environment access', () => {
  assert.doesNotMatch(stripComments(SOURCE), /process\.env|import\.meta\.env|\bapiKey\b|credentialStore/u);
});

test('AD-04 Packaging UI does not implement a lifecycle transition table', () => {
  const source = stripComments(WORKSPACE);
  assert.doesNotMatch(source, /switch\s*\(\s*view\.status|transitionTable|allowedTransitions/u);
});

test('AD-05 Reference precedence is not presented by the UI', () => {
  assert.doesNotMatch(stripComments(WORKSPACE), />\s*(?:precedence|priority|winsOver)\s*</iu);
});

test('AD-06 Locked Assets presentation remains read-only', () => {
  const tile = WORKSPACE.slice(WORKSPACE.indexOf('function LockedAssetsTile'), WORKSPACE.indexOf('function ReadinessStaleTile'));
  assert.doesNotMatch(tile, />\s*(?:Edit|Unlock|Replace|Delete|Upload|Save|编辑|解锁|替换|删除|上传|保存)\s*</u);
  assert.match(tile, /仅供当前工作台读取/u);
});

test('AD-07 UI has no fake numeric progress percentage', () => {
  assert.doesNotMatch(stripComments(WORKSPACE), /\b\d{1,3}\s*%/u);
});

test('AD-08 Result Gallery uses the safe Packaging preview bridge', () => {
  assert.match(WORKSPACE, /getPackagingArtifactPreview\s*\(/u);
  assert.match(WORKSPACE, /src=\{state\.dataUrl\}/u);
  assert.doesNotMatch(WORKSPACE, /src=\{artifact\.(?:relativePath|thumbnailRelativePath)\}/u);
});

test('AD-09 UI contains no absolute or file URL presentation path', () => {
  assert.doesNotMatch(stripComments(SOURCE), /file:\/\/|[A-Za-z]:\\\\/u);
});

test('AD-10 UI introduces no run history contract', () => {
  assert.doesNotMatch(stripComments(SOURCE), /recentRuns|listRuns|runHistory|execution\.history/u);
});

test('AD-11 UI introduces no browser persistence', () => {
  assert.doesNotMatch(stripComments(SOURCE), /localStorage|sessionStorage|indexedDB|caches\.open/u);
});

test('AD-12 both modals expose accessible dialog semantics', () => {
  assert.equal((WORKSPACE.match(/role="dialog"/gu) ?? []).length >= 2, true);
  assert.equal((WORKSPACE.match(/aria-modal="true"/gu) ?? []).length >= 2, true);
  assert.match(WORKSPACE, /event\.key === 'Escape'/u);
});

test('AD-13 primary actions expose accessible labels', () => {
  for (const label of ['准备生成', '执行生成', '重置准备']) {
    assert.match(WORKSPACE, new RegExp(`aria-label="${label}"`, 'u'));
  }
});

test('AD-14 lifecycle status is expressed with text, not color alone', () => {
  for (const label of ['待准备', '已就绪', '配置已变化', '正在生成', '生成完成', '生成失败']) {
    assert.match(WORKSPACE, new RegExp(label, 'u'));
  }
  assert.match(WORKSPACE, /当前配置已变化，需要重新准备/u);
});

test('AD-15 responsive breakpoint coverage exists', () => {
  assert.match(CSS, /@media \(min-width: 1440px\)/u);
  assert.match(CSS, /@media \(max-width: 1023px\)/u);
  assert.match(CSS, /@media \(max-width: 767px\)/u);
  assert.match(CSS, /@media \(max-width: 420px\)/u);
});

test('AD-16 mobile layout has no forced fixed workspace width', () => {
  assert.match(CSS, /grid-template-columns: minmax\(0, 1fr\)/u);
  assert.doesNotMatch(CSS, /\.shell\s*\{[^}]*width:\s*\d+px/su);
  assert.doesNotMatch(CSS, /\.tiles\s*\{[^}]*min-width:\s*[1-9]\d*px/su);
});

test('AD-17 P3-A frozen application diff is zero', () => {
  assert.deepEqual(gitDiff('dd4570a', 'packages/runtime-core/src/application/packaging/'), []);
});

test('AD-18 P2 frozen Packaging diff is zero', () => {
  assert.deepEqual(
    gitDiff('335405342951fedae5d4d6816444c2b4d2402787', 'packages/image-generation-runtime/src/packaging/'),
    [],
  );
});
