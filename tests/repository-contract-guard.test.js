import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  checkProductionReference,
  checkPromptDigest,
  classifyGoldenChanges,
  classifyCurrentPath,
  validateCompatibilityRegistry
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

test('Golden mutation is represented by stable RC005', () => {
  assert.equal(classifyGoldenChanges(['evaluation/golden-cases/example.json'])[0]?.code, 'RC005');
});
