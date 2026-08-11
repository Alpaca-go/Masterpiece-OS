import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('application contracts are owned by Shared Runtime', () => {
  const shared = path.resolve('packages/runtime-core/src/application-contracts.ts');

  assert.equal(fs.existsSync(shared), true);
  assert.doesNotMatch(fs.readFileSync(shared, 'utf8'), /apps[\\/]desktop|from\s+['"]electron['"]/u);
});
