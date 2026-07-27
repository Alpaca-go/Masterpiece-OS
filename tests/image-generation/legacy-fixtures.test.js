import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const fixtureRoot = path.resolve(import.meta.dirname, '..', 'fixtures', 'image-generation-v1');

test('V1 task and run fixtures freeze the legacy persistence contract', async () => {
  const task = JSON.parse(await fs.readFile(path.join(fixtureRoot, 'task.json'), 'utf8'));
  const run = JSON.parse(await fs.readFile(path.join(fixtureRoot, 'run.json'), 'utf8'));
  assert.equal(task.schemaVersion, '1.0');
  assert.equal(task.sourceReferenceAnchorRunId, 'reference-legacy');
  assert.equal(run.schemaVersion, '1.0');
  assert.equal(run.outputType, 'master_anchor_image');
});
