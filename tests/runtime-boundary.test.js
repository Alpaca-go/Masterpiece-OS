import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);

function sourceFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(target));
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(target);
  }
  return files;
}

function importSpecifiers(source) {
  return [...source.matchAll(/(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/gu)]
    .map((match) => match[1]);
}

test('Shared Core packages never depend on Desktop', () => {
  const violations = [];
  for (const file of sourceFiles(path.join(repoRoot, 'packages'))) {
    for (const specifier of importSpecifiers(fs.readFileSync(file, 'utf8'))) {
      if (/apps[\\/]desktop|@masterpiece\/desktop/u.test(specifier)) {
        violations.push(`${path.relative(repoRoot, file)} -> ${specifier}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test('Web renderer never imports host business services', () => {
  const rendererRoot = path.join(repoRoot, 'apps', 'web', 'src');
  const violations = [];
  for (const file of sourceFiles(rendererRoot)) {
    for (const specifier of importSpecifiers(fs.readFileSync(file, 'utf8'))) {
      if (/(?:^|\/)main(?:\/|$)|src[\\/]main/u.test(specifier)) {
        violations.push(`${path.relative(repoRoot, file)} -> ${specifier}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test('Current Runtime consumers use Core facades instead of historical generation namespaces', () => {
  const consumers = sourceFiles(path.join(repoRoot, 'packages/runtime-core/src/application'));
  const violations = [];
  for (const file of consumers) {
    const relativeFile = path.relative(repoRoot, file);
    const imports = importSpecifiers(fs.readFileSync(file, 'utf8'));
    for (const specifier of imports) {
      if (/^@masterpiece\/image-generation-runtime\/(?:vnext|space)(?:\/|$)/u.test(specifier)) {
        violations.push(`${relativeFile} -> ${specifier}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test('Visual Analysis pipeline receives host paths through an adapter', () => {
  const pipeline = fs.readFileSync(path.join(repoRoot, 'packages/runtime-core/src/application/pipeline-service.ts'), 'utf8');
  assert.doesNotMatch(pipeline, /from\s+['"]electron['"]/u);
  assert.match(pipeline, /VisualAnalysisRuntimeAdapter/u);
});

test('Reference resolver is owned by Shared Runtime', () => {
  const resolver = fs.readFileSync(path.join(repoRoot, 'packages/image-generation-runtime/src/reference-engine/reference-asset-resolver.ts'), 'utf8');
  assert.doesNotMatch(resolver, /apps[\\/]desktop|from\s+['"]electron['"]/u);
});
