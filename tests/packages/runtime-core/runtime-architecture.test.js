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

test('Desktop main registers only an explicit native allowlist outside Shared Registry', () => {
  const index = fs.readFileSync(path.join(repoRoot, 'apps/desktop/src/main/index.ts'), 'utf8');
  const channels = [...index.matchAll(/registerHandler\(['"]([^'"]+)['"]/gu)].map((match) => match[1]);
  assert.deepEqual(channels.sort(), [
    'document-context:choose-documents',
    'document-context:export',
    'document-context:open-folder',
    'image-generation:open-folder',
    'projects:choose-files',
    'projects:choose-folder',
    'reference-anchor:choose-reference-assets',
    'reference-anchor:export',
    'reference-anchor:open-folder',
    'report:export',
    'report:open-folder',
  ]);
  assert.doesNotMatch(index, /from\s+['"]\.\/(?:pipeline|project-store|.*-service|image-generation\/service)/u);
});
