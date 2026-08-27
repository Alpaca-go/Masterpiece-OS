import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  scanCurrentVersionNaming,
  scanVersionNamingSource,
} from '../scripts/verify-version-naming.mjs';

test('version naming guard detects known current product-copy blind spots', () => {
  for (const value of [
    'Web / v5',
    'Desktop / v5',
    'Project Visual Context vNext',
    'Reference-First（R11.2.2）',
    'v5 Logo Locked',
    'v5 Pipeline',
  ]) {
    const [violation] = scanVersionNamingSource(`const label = ${JSON.stringify(value)};`, 'apps/web/src/fixture.tsx');
    assert.equal(violation?.category, 'current-product-copy', value);
    assert.equal(violation?.line, 1);
  }
});

test('version naming guard detects new historical-stage runtime IDs and targeted symbols', () => {
  const source = [
    'const taskId = `r11-cont-${Date.now()}`;',
    'class V5ConfigError extends Error {}',
    "const providerId = 'deep-creative-director-provider-v5';",
    "throw new Error('Desktop 极简模式要求原始 Logo 默认锁定');",
    'const desktopProjectId = projectId;',
  ].join('\n');
  assert.deepEqual(
    scanVersionNamingSource(source, 'apps/web/src/fixture.ts').map(({ line, category }) => ({ line, category })),
    [
      { line: 1, category: 'new-runtime-id' },
      { line: 2, category: 'current-internal-symbol' },
      { line: 3, category: 'historical-stage-provider-id' },
      { line: 4, category: 'misleading-desktop-semantics' },
      { line: 5, category: 'current-internal-symbol' },
    ],
  );
});

test('version naming guard allows explicit compatibility and version-domain examples', () => {
  const source = [
    "const config = 'masterpiece-os-v5.json';",
    "const context = 'project-visual-context.vnext.json';",
    "const runRoot = 'image-generation-vnext';",
    "const schemaVersion = 'vnext-1.0';",
    "const pipelineMode = 'vnext';",
    "const compilerMode = 'r8_6_golden';",
    "const historicalId = 'r11-cont-existing-record';",
  ].join('\n');
  assert.deepEqual(scanVersionNamingSource(source, 'docs/archive/history.md'), [
    {
      file: 'docs/archive/history.md',
      line: 7,
      token: 'r11-cont-',
      category: 'new-runtime-id',
    },
  ]);
  assert.deepEqual(scanVersionNamingSource(source.split('\n').slice(0, 6).join('\n'), 'current-compatibility.ts'), []);
});

test('version naming guard scans current generation, space, prompt-contract, and model-registry roots', () => {
  const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'masterpiece-version-naming-'));
  const fixtures = [
    'packages/image-generation-runtime/src/generation/fixture.js',
    'packages/image-generation-runtime/src/space/fixture.js',
    'packages/image-generation-runtime/src/prompt-contracts/fixture.js',
    'packages/model-registry/src/fixture.js',
  ];

  try {
    for (const fixture of fixtures) {
      const absolute = path.join(repositoryRoot, fixture);
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, "const providerId = 'deep-creative-director-provider-v5';\n");
    }

    assert.deepEqual(
      scanCurrentVersionNaming(repositoryRoot).map(({ file, category }) => ({ file, category })),
      fixtures.map((file) => ({ file, category: 'historical-stage-provider-id' })),
    );
  } finally {
    fs.rmSync(repositoryRoot, { recursive: true, force: true });
  }
});
