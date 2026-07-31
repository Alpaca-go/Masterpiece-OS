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

test('baseline proves the legacy prompt and reference list contradict an interior deliverable', async () => {
  const promptUrl = new URL('./fixtures/deliverable-mismatch-baseline/legacy-compiled-prompt.md', import.meta.url);
  const refsUrl = new URL('./fixtures/deliverable-mismatch-baseline/legacy-reference-list.json', import.meta.url);
  const prompt = await readFile(fileURLToPath(promptUrl), 'utf8');
  const refs = JSON.parse(await readFile(fileURLToPath(refsUrl), 'utf8'));
  assert.match(prompt, /延续当前视觉系统/);
  assert.doesNotMatch(prompt, /完整墙面、地面与天花/);
  assert.ok(refs.references.filter((item) => item.role === 'current_project_identity').length >= 4);
  assert.ok(refs.references.some((item) => /平铺|样机|合集|排列/.test(item.description)));
});
