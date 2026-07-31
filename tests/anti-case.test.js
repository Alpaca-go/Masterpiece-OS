import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('same-domain, cross-domain and cross-media anti-cases pass offline', () => {
  const result = spawnSync(process.execPath, ['./scripts/run-golden-evaluation.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'pass');
  assert.equal(report.results.length, 5);
  assert.ok(report.results.every((item) => item.crossCaseLeakage === 0));
});
