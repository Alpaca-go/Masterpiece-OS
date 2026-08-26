import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const assetRoot = path.join(
  repoRoot,
  'packages',
  'image-generation-runtime',
  'assets',
  'architecture-anchors',
);

test('architecture anchor registry covers every supported brand', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(assetRoot, 'registry.json'), 'utf8'));
  for (const brand of ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang']) {
    const entry = registry.brands?.[brand];
    assert.ok(entry, `registry missing brand: ${brand}`);
    assert.ok(Array.isArray(entry.anchors) && entry.anchors.length > 0);
    for (const anchor of entry.anchors) {
      assert.ok(anchor.id, `${brand} anchor missing id`);
      assert.ok(anchor.primaryMechanism, `${brand}/${anchor.id} missing primaryMechanism`);
      if (anchor.imagePath) {
        const resolved = path.resolve(assetRoot, anchor.imagePath);
        assert.ok(resolved.startsWith(`${assetRoot}${path.sep}`));
        assert.ok(fs.statSync(resolved).size > 0, `missing image: ${anchor.imagePath}`);
      }
    }
  }
});

test('architecture anchor registry uses package-relative semantic asset paths', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(assetRoot, 'registry.json'), 'utf8'));
  for (const entry of Object.values(registry.brands ?? {})) {
    assert.doesNotMatch(entry.anchorsDir, /vnext|phase|experimental|r\d/iu);
    for (const anchor of entry.anchors ?? []) {
      if (anchor.imagePath) {
        assert.doesNotMatch(anchor.imagePath, /vnext|phase|experimental|r\d/iu);
      }
    }
  }
});
