import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const WEB_SRC = path.join(ROOT, 'apps', 'web', 'src');
const ENTRY = path.join(WEB_SRC, 'main.tsx');
const WORKSPACE_PATH = path.join(WEB_SRC, 'features', 'packaging', 'PackagingWorkspace.tsx');
const CSS_PATH = path.join(WEB_SRC, 'features', 'packaging', 'PackagingWorkspace.module.css');
const APP = readFileSync(path.join(WEB_SRC, 'App.tsx'), 'utf8');
const GLOBAL_CSS = readFileSync(path.join(WEB_SRC, 'styles', 'f7-pages.css'), 'utf8');
const WORKSPACE = readFileSync(WORKSPACE_PATH, 'utf8');
const CSS = readFileSync(CSS_PATH, 'utf8');
const BROWSER_SEAM = path.join(ROOT, 'packages', 'runtime-core', 'src', 'browser', 'packaging-contracts.js');

const SOURCE_EXTENSIONS = ['', '.js', '.ts', '.tsx', '.jsx'];
const NODE_ONLY = new Set(['node:crypto', 'node:fs', 'node:path', 'crypto', 'fs', 'path']);

function sourceFiles(root: string): string[] {
  const output = execFileSync('rg', ['--files', root], { cwd: ROOT, encoding: 'utf8' });
  return output.split(/\r?\n/u).filter((file) => /\.(?:js|jsx|ts|tsx)$/u.test(file));
}

function runtimeSpecifiers(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
  const specs: string[] = [];
  const statement = /^\s*(?:import\s+(?!type\b)(?:(?:[^'";]|\n)*?\sfrom\s+)?|export\s+(?:\*|\{[\s\S]*?\})\s+from\s+)['"]([^'"]+)['"]/gmu;
  const dynamic = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/gu;
  for (const match of withoutComments.matchAll(statement)) specs.push(match[1]);
  for (const match of withoutComments.matchAll(dynamic)) specs.push(match[1]);
  return specs;
}

function resolveFile(candidate: string): string | null {
  for (const suffix of SOURCE_EXTENSIONS) {
    const file = `${candidate}${suffix}`;
    if (existsSync(file)) return path.normalize(file);
  }
  for (const suffix of SOURCE_EXTENSIONS.slice(1)) {
    const file = path.join(candidate, `index${suffix}`);
    if (existsSync(file)) return path.normalize(file);
  }
  return null;
}

function resolveWorkspacePackage(specifier: string): string | null {
  const match = specifier.match(/^@masterpiece\/([^/]+)(?:\/(.+))?$/u);
  if (!match) return null;
  const packageRoot = path.join(ROOT, 'packages', match[1]);
  if (!existsSync(packageRoot)) return null;
  const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  const subpath = match[2];
  if (!subpath) return resolveFile(path.join(packageRoot, String(packageJson.main || 'src/index.js')));
  const exportKey = `./${subpath}`;
  const exports = packageJson.exports || {};
  let target = exports[exportKey];
  if (!target && typeof exports['./*'] === 'string') target = exports['./*'].replace('*', subpath);
  return typeof target === 'string' ? resolveFile(path.join(packageRoot, target)) : null;
}

function browserRuntimeGraph(entry: string): { files: Set<string>; builtins: Set<string> } {
  const files = new Set<string>();
  const builtins = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const file = path.normalize(pending.pop()!);
    if (files.has(file)) continue;
    files.add(file);
    for (const specifier of runtimeSpecifiers(readFileSync(file, 'utf8'))) {
      if (NODE_ONLY.has(specifier)) {
        builtins.add(specifier);
        continue;
      }
      const resolved = specifier.startsWith('.')
        ? resolveFile(path.resolve(path.dirname(file), specifier))
        : resolveWorkspacePackage(specifier);
      if (resolved) pending.push(resolved);
    }
  }
  return { files, builtins };
}

function gitDiff(base: string, target: string, end = 'HEAD'): string[] {
  const output = execFileSync('git', ['diff', '--name-only', base, end, '--', target], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return output.split(/\r?\n/u).filter(Boolean);
}

test('AE-01 apps/web has no direct Node crypto import', () => {
  const source = sourceFiles(WEB_SRC).map((file) => readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /(?:from\s+|import\s*\()['"](?:node:)?crypto['"]/u);
});

test('AE-02 browser-safe Packaging seam has no transitive Node-only runtime dependency', () => {
  const graph = browserRuntimeGraph(BROWSER_SEAM);
  assert.deepEqual([...graph.builtins], []);
  assert.equal([...graph.files].some((file) => file.endsWith(path.join('runtime-core', 'src', 'index.js'))), false);
});

test('AE-03 renderer production graph has no node:fs dependency', () => {
  assert.equal(browserRuntimeGraph(ENTRY).builtins.has('node:fs'), false);
});

test('AE-04 renderer production graph has no node:path dependency', () => {
  assert.equal(browserRuntimeGraph(ENTRY).builtins.has('node:path'), false);
});

test('AE-05 production Web build succeeds', () => {
  const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  assert.doesNotThrow(() => execFileSync(process.execPath, [vite, 'build'], {
    cwd: path.join(ROOT, 'apps', 'web'),
    stdio: 'pipe',
  }));
});

test('AE-06 Packaging route remains mounted from the production App', () => {
  assert.match(APP, /screen === 'packaging'[^\n]+<PackagingWorkspace/u);
  assert.match(APP, /setScreen\('packaging'\)/u);
});

test('AE-07 reference and preview dialogs retain accessible semantics', () => {
  assert.equal((WORKSPACE.match(/role="dialog"/gu) ?? []).length >= 2, true);
  assert.equal((WORKSPACE.match(/aria-modal="true"/gu) ?? []).length >= 2, true);
  assert.match(WORKSPACE, /event\.key === 'Escape'/u);
  assert.match(WORKSPACE, /\.focus\(\)/u);
});

test('AE-08 mobile workspace has no fixed-width shell or tile grid', () => {
  assert.doesNotMatch(CSS, /\.shell\s*\{[^}]*\bwidth:\s*\d+px/su);
  assert.doesNotMatch(CSS, /\.tiles\s*\{[^}]*\bmin-width:\s*[1-9]\d*px/su);
  assert.match(CSS, /@media \(max-width: 420px\)/u);
});

test('AE-09 responsive contract prevents horizontal content overflow', () => {
  assert.match(CSS, /minmax\(0, 1fr\)/u);
  assert.match(CSS, /overflow-wrap:\s*anywhere/u);
  assert.doesNotMatch(CSS, /\bmin-width:\s*[5-9]\d{2,}px/u);
  assert.doesNotMatch(GLOBAL_CSS, /body\s*\{[^}]*\bmin-width:\s*[1-9]\d*px/su);
});

test('AE-10 P3-A frozen Packaging application diff is zero', () => {
  assert.deepEqual(
    gitDiff('dd4570a', 'packages/runtime-core/src/application/packaging/', '92a8008'),
    [],
  );
});

test('AE-11 P2 frozen Packaging diff is zero', () => {
  assert.deepEqual(gitDiff('a593278b55e437fac59d768c5cee734d9a9fc201', 'packages/image-generation-runtime/src/packaging/'), []);
});
