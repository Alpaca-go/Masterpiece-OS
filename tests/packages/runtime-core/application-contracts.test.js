import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('application contracts are owned by Shared Runtime and Desktop is compatibility-only', () => {
  const shared = path.resolve('packages/runtime-core/src/application-contracts.ts');
  const desktop = path.resolve('apps/desktop/src/shared/types.ts');

  assert.equal(fs.existsSync(shared), true);
  assert.match(fs.readFileSync(desktop, 'utf8'), /COMPATIBILITY_ONLY/u);
  assert.match(fs.readFileSync(desktop, 'utf8'), /@masterpiece\/runtime-core\/application-contracts\.ts/u);
});
