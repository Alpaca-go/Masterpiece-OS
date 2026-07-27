import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

test('freezes the legacy interior-scene deliverable mismatch', async () => {
  const url = new URL('./fixtures/deliverable-mismatch-baseline/interior-scene-failure.json', import.meta.url);
  const fixture = JSON.parse(await readFile(fileURLToPath(url), 'utf8'));
  assert.equal(fixture.legacyPreset, 'visual_extension');
  assert.match(fixture.userIntent, /店内装修/);
  assert.ok(fixture.legacyReferenceRoles.filter((role) => role === 'current_project_identity').length > 1);
});
