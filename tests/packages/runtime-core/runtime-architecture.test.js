import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function sourceFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.(?:js|ts)$/u.test(entry.name) ? [target] : [];
  });
}

test('Shared Runtime and Operation Registry have zero Desktop and Electron imports', () => {
  const runtimeRoot = path.join(repoRoot, 'packages/runtime-core/src');
  const violations = [];
  for (const file of sourceFiles(runtimeRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    if (/from\s+['"]electron['"]|require\(['"]electron['"]\)|apps\/desktop/u.test(source)) {
      violations.push(path.relative(repoRoot, file));
    }
  }
  assert.deepEqual(violations, []);
});

test('Node Web Host owns the native operation allowlist outside Shared Registry', () => {
  const host = fs.readFileSync(path.join(repoRoot, 'apps/web-runtime/src/node-native-operations.ts'), 'utf8');
  assert.match(host, /createNodeNativeOperations/u);
  assert.match(host, /'projects:choose-files'/u);
  assert.doesNotMatch(host, /from\s+['"]electron['"]|ipcMain|BrowserWindow/u);
});
