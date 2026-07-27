import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const fixtureUrl = new URL('./fixtures/creative-director-baseline/golden-run.json', import.meta.url);

test('legacy golden run freezes a single-anchor reference baseline', async () => {
  const fixture = JSON.parse(await readFile(fileURLToPath(fixtureUrl), 'utf8'));
  assert.equal(fixture.fixtureVersion, '1.0');
  assert.equal(fixture.mode, 'legacy');
  assert.equal(fixture.outputType, 'master_anchor_image');
  assert.equal(fixture.expectedOutputCount, 1);
  assert.deepEqual(fixture.referenceSelection.map((item) => item.role), [
    'current_project_logo',
    'current_project_product',
    'reference_style',
  ]);
});
