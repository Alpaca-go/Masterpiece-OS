// P1-7 — Packaging Golden Manifest Integrity
//
// The Jiuzhou Golden is frozen at P1. The integrity of the
// freeze is checked by re-computing the SHA-256 digests of
// every file listed in `tests/fixtures/packaging/jiuzhou/manifest.json`
// and comparing them to the recorded digests. Any drift is a
// P1.x re-evaluation event (the freeze is not silently
// mutable).
//
// This test is the integrity gate; `manifest.json` itself is
// NOT included in the digest table (the manifest IS the table).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

const manifest = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'tests/fixtures/packaging/jiuzhou/manifest.json'),
    'utf8',
  ),
);

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex').toLowerCase();
}

test('P1 manifest.json schemaVersion + manifestVersion + goldenProjectId', () => {
  assert.equal(manifest.schemaVersion, '1.0');
  assert.equal(manifest.manifestVersion, '1.0.0');
  assert.equal(manifest.goldenProjectId, 'golden-jiuzhou');
});

test('P1 manifest.json has exactly 10 frozen files', () => {
  assert.equal(Object.keys(manifest.files).length, 10);
});

test('P1 every manifest file exists on disk', () => {
  for (const rel of Object.keys(manifest.files)) {
    const abs = path.join(repoRoot, rel);
    // assert that the file is reachable; we re-read it to
    // compute the digest below.
    readFileSync(abs);
  }
});

test('P1 every manifest file SHA-256 matches the recorded digest', () => {
  for (const [rel, expected] of Object.entries(manifest.files)) {
    const abs = path.join(repoRoot, rel);
    const actual = sha256(readFileSync(abs));
    assert.equal(actual, expected, `drift on ${rel}`);
  }
});

test('P1 manifest.json itself is not in the file table (the manifest IS the table)', () => {
  const manifestKey = Object.keys(manifest.files).find(
    (k) => k.endsWith('/manifest.json'),
  );
  assert.equal(manifestKey, undefined, 'manifest.json should not be in its own file table');
});

test('P1 Golden vs Production boundary doc exists and lists Jiuzhou literals as forbidden', () => {
  const boundaryDoc = readFileSync(
    path.join(repoRoot, 'docs/packaging/golden-vs-production-boundary.md'),
    'utf8',
  );
  // The boundary doc must name the forbidden literals. We
  // check the canonical ones; the full list is in
  // golden-vs-production-boundary.md §3.
  for (const literal of [
    '65 – 70 %',  // base color range
    '20 – 25 %',  // identity color range
    '5 – 10 %',   // structural color range
    '大面积浓紫',
    '大面积写实羽毛',
    '夜店式虹彩',
  ]) {
    assert.ok(boundaryDoc.includes(literal), `literal ${literal} missing from boundary doc`);
  }
});

test('P1 production code does NOT hard-code Jiuzhou Golden literals (boundary guard, offline)', () => {
  // Soft check: scan apps/, packages/, runtime-core/.../image-generation/
  // for forbidden literals. The full guard is deferred to P3 / P4
  // (`scripts/verify-packaging-golden-boundary.mjs`); this test
  // pins the offline half today.
  const SCAN_ROOTS = [
    'apps/cli/src',
    'apps/web/src',
    'apps/web-runtime/src',
    'packages/image-generation-runtime/src',
    'packages/image-generation-contracts/src',
    'packages/runtime-core/src/application/image-generation',
    'packages/runtime-core/src/application/packaging',
  ];
  const LITERALS = [
    '大面积浓紫',
    '大面积写实羽毛',
    '夜店式虹彩',
    '羽眼椭圆',
    '九瓣放射',
    '羽毛流线',
  ];
  for (const root of SCAN_ROOTS) {
    const abs = path.join(repoRoot, root);
    if (!existsSync(abs)) continue;
    walk(abs, LITERALS);
  }
  function walk(dir, literals) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
        walk(child, literals);
      } else if (/\.(?:js|mjs|ts|tsx)$/.test(entry.name)) {
        const text = readFileSync(child, 'utf8');
        for (const literal of literals) {
          assert.ok(
            !text.includes(literal),
            `forbidden Golden literal "${literal}" found in production file ${child}`,
          );
        }
      }
    }
  }
});
