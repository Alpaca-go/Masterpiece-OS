import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('Golden production boundary gate passes the repository', () => {
  const result = spawnSync(process.execPath, ['./scripts/verify-golden-production-boundary.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).status, 'pass');
});
