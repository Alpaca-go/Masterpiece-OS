import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..');
const auditRoot = path.join(repositoryRoot, 'docs', 'validation', 'jiuzhou-golden-audit');
const manifest = JSON.parse(await fs.readFile(path.join(auditRoot, 'visual-fixture-manifest.json'), 'utf8'));
const fixtureRoot = path.join(repositoryRoot, ...manifest.fixtureRoot.split('/'));

async function sha256(filename) {
  return crypto.createHash('sha256').update(await fs.readFile(filename)).digest('hex');
}

const frozenGolden = path.join(auditRoot, 'golden-prompt.md');
const localGolden = path.join(fixtureRoot, 'jiuzhou-space-golden-prompt.md');
assert.equal(await sha256(frozenGolden), manifest.files.find((item) => item.role === 'golden_prompt').sha256);
assert.equal(await sha256(localGolden), await sha256(frozenGolden), 'local and frozen Golden Prompt differ');

for (const item of manifest.files) {
  const filename = path.join(fixtureRoot, ...item.path.split('/'));
  const stat = await fs.stat(filename);
  assert.equal(stat.size, item.sizeBytes, `${item.path} size changed`);
  assert.equal(await sha256(filename), item.sha256, `${item.path} hash changed`);
}

const sourceProjectRoot = path.join(fixtureRoot, manifest.sourceProject.directory);
const sourceImages = (await fs.readdir(sourceProjectRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.(?:png|jpe?g|webp)$/iu.test(entry.name));
assert.equal(sourceImages.length, manifest.sourceProject.expectedImageCount, 'source-project image count changed');

const audit = JSON.parse(await fs.readFile(path.join(auditRoot, 'audit-matrix.json'), 'utf8'));
assert.equal(audit.items.length, 22, 'audit matrix must contain the first 22 Golden atoms');
assert.deepEqual(
  audit.items.map((item) => item.id),
  Array.from({ length: 22 }, (_, index) => `JZ-${String(index + 1).padStart(2, '0')}`),
  'audit ids must be stable and ordered',
);
for (const item of audit.items) {
  assert.ok(item.goldenContent, `${item.id} goldenContent is required`);
  assert.ok(item.expectedProducer, `${item.id} expectedProducer is required`);
  assert.ok(item.firstFailureStage, `${item.id} firstFailureStage is required`);
  assert.ok(item.failureReason, `${item.id} failureReason is required`);
}

console.log(JSON.stringify({
  status: 'pass',
  goldenPromptSha256: await sha256(frozenGolden),
  sourceProjectImageCount: sourceImages.length,
  badOutputCount: manifest.files.filter((item) => item.role === 'bad_output').length,
  goldenOutputCount: manifest.files.filter((item) => item.role === 'golden_output').length,
  auditItemCount: audit.items.length,
}, null, 2));
