import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('project-specific production rule scanner passes the repository', () => {
  const result = spawnSync(process.execPath, ['./scripts/verify-no-project-specific-production-rules.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).status, 'pass');
});
