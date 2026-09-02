import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  checkProductionReference,
  checkPromptDigest,
  classifyGoldenChanges,
  classifyCurrentPath,
  validateCompatibilityRegistry,
  validatePromptIntegrity
} from '../scripts/verify-repository-contract.mjs';
import { classifyProductionImport } from '../scripts/verify-production-boundaries.mjs';

const fixtures = JSON.parse(readFileSync(new URL('./repository-contract-fixtures.json', import.meta.url), 'utf8'));

for (const fixture of fixtures.pathCases) {
  test(`repository contract path: ${fixture.name}`, () => {
    assert.equal(classifyCurrentPath(fixture.path)?.code ?? null, fixture.expectedCode);
  });
}

for (const fixture of fixtures.referenceCases.filter((entry) => entry.expectedCode === 'RC002')) {
  test(`repository contract boundary: ${fixture.name}`, () => {
    const specifier = fixture.line.match(/['"]([^'"]+)['"]/)[1];
    assert.notEqual(classifyProductionImport(specifier), null);
  });
}

test('repository contract local artifact reference fails', () => {
  const fixture = fixtures.referenceCases.find((entry) => entry.expectedCode === 'RC007');
  assert.equal(checkProductionReference(fixture.file, fixture.line)?.code, 'RC007');
});

test('unregistered compatibility alias fails', () => {
  const failures = validateCompatibilityRegistry({ entries: [] }, {
    entries: [{ path: 'packages/example/src/vnext' }]
  });
  assert.equal(failures[0]?.code, 'RC006');
});

test('registered compatibility alias passes', () => {
  const failures = validateCompatibilityRegistry({
    entries: [{
      identifier: '@example/runtime/vnext',
      type: 'PACKAGE_SUBPATH_ALIAS',
      locations: ['packages/example/package.json', 'packages/example/src/vnext/index.js'],
      consumer: 'existing consumers',
      reason: 'compatibility',
      owner: 'example',
      removalCondition: 'consumer count reaches zero',
      introducedPhase: 'S7'
    }]
  }, { entries: [{ path: 'packages/example/src/vnext' }] });
  assert.deepEqual(failures, []);
});

test('frozen prompt mutation is represented by stable RC004', () => {
  const digest = 'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD';
  assert.equal(checkPromptDigest('abc', digest), null);
  assert.equal(checkPromptDigest('mutated', digest)?.code, 'RC004');
});

test('frozen prompt manifest entries exist and reproduce their authority digests', () => {
  const manifest = JSON.parse(readFileSync(new URL('../config/repository-contract/prompt-integrity.json', import.meta.url), 'utf8'));
  const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
  assert.equal(manifest.entries.length, 4);
  assert.deepEqual(validatePromptIntegrity(repositoryRoot, manifest), []);
});

test('frozen prompt entry without a SHA fails closed', () => {
  const failures = validatePromptIntegrity(process.cwd(), {
    algorithm: 'sha256',
    entries: [{ path: 'apps/cli/prompts/analysis/report-schema.md' }]
  });
  assert.equal(failures[0]?.code, 'RC004');
});

test('prompt integrity validation is byte-exact, reversible, and does not update the manifest', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'masterpiece-rc004-'));
  const promptPath = path.join(directory, 'prompt.md');
  const lfContent = Buffer.from('authority\nbytes\n');
  const manifest = {
    algorithm: 'sha256',
    entries: [{ path: 'prompt.md', sha256: createHash('sha256').update(lfContent).digest('hex').toUpperCase() }]
  };
  const before = JSON.stringify(manifest);
  try {
    writeFileSync(promptPath, lfContent);
    assert.deepEqual(validatePromptIntegrity(directory, manifest), []);
    writeFileSync(promptPath, Buffer.from('authority\r\nbytes\r\n'));
    assert.equal(validatePromptIntegrity(directory, manifest)[0]?.code, 'RC004');
    writeFileSync(promptPath, lfContent);
    assert.deepEqual(validatePromptIntegrity(directory, manifest), []);
    assert.equal(JSON.stringify(manifest), before);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('frozen prompt EOL policy is limited to the four authority paths', () => {
  const attributes = readFileSync(new URL('../.gitattributes', import.meta.url), 'utf8').trim().split(/\r?\n/);
  assert.deepEqual(attributes, [
    '/apps/cli/prompts/analysis/benchmark-instructions.md text eol=lf',
    '/apps/cli/prompts/analysis/deep-creative-director.md text eol=lf',
    '/apps/cli/prompts/analysis/execution-core-template.md text eol=lf',
    '/apps/cli/prompts/analysis/report-schema.md text eol=lf'
  ]);
});

test('Golden mutation is represented by stable RC005', () => {
  assert.equal(classifyGoldenChanges(['evaluation/golden-cases/example.json'])[0]?.code, 'RC005');
});
