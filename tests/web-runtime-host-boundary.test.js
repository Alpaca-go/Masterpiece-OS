import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '..');

function sourceFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.(?:[cm]?[jt]sx?|json|mjs)$/.test(entry.name) ? [target] : [];
  });
}

function assertNoRuntimeDependency(root, label) {
  for (const file of sourceFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /from\s+['"]electron['"]|require\(['"]electron['"]\)|apps[\\/]desktop/i, `${label} boundary regressed in ${path.relative(repoRoot, file)}`);
  }
}

test('Node Runtime Host has zero Electron and Desktop dependencies', () => {
  assertNoRuntimeDependency(path.join(repoRoot, 'apps', 'web-runtime', 'src'), 'Node Host');
});

test('Web Renderer has zero Electron and Desktop dependencies', () => {
  assertNoRuntimeDependency(path.join(repoRoot, 'apps', 'web'), 'Web Renderer');
});

test('primary Web entry launches the Node host and independent Web renderer only', () => {
  const rootPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.equal(rootPackage.scripts['web:dev'], 'npm --prefix apps/web-runtime run dev');
  assert.equal(rootPackage.scripts['web:smoke'], 'npm --prefix apps/web-runtime run smoke');
  const dev = fs.readFileSync(path.join(repoRoot, 'apps', 'web-runtime', 'scripts', 'run-web-dev.mjs'), 'utf8');
  assert.match(dev, /apps', 'web', 'vite\.config\.mjs/);
  assert.doesNotMatch(dev, /electron-vite|apps', 'desktop|electron\.vite\.config/i);
});
