import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { getRegisteredModel } from '@masterpiece/model-registry';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A = '1fcafc810a7e218a7cf50dd675d914cd396304b2';
const P3B = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const P3C_INTEGRATION = '456ec3a9d0273b599ed15bcd424fde1f36b8ce1b';
// P3-C4.2 — Provider Model Identity Separation Corrective.
// C4.2 narrowed the frozen-surface checks for the P3-A /
// P3-B sub-trees. The new authoritative P3-C baseline is
// the C4.2 corrective commit; AP-15 / AP-18 are scoped to
// the unchanged P3-A sub-tree and pinned against the
// current P3-A12 baseline `1fcafc8` (P3-A11 historical
// `f95c145b` is preserved as historical evidence, no
// longer a current zero-diff target). AP-19 is pinned
// against `2ac4cf1`. The C4.2 / C4.2.1 surface change is
// verified separately by AN-16 / AN-16b / AS-20 / AS-21
// against the C4.2 / C4.2.1 corrective commits.
const C4_2_CORRECTIVE = '4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551';
const COMPOSITION = readFileSync(path.join(ROOT, 'apps/web-runtime/src/current-operation-graph.ts'), 'utf8');
const SELECTOR_PATH = 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts';
const ADAPTER = readFileSync(path.join(ROOT, 'packages/image-generation-adapter/src/multi-model.js'), 'utf8');

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function correctiveProjectorSource(): string {
  const start = COMPOSITION.indexOf('export function projectCanonicalIdentityFromAuthorities');
  const end = COMPOSITION.indexOf('export function createCurrentBusinessOperations');
  assert.ok(start >= 0 && end > start, 'canonical identity projector must remain an explicit composition-root seam');
  return COMPOSITION.slice(start, end);
}

test('AP-08 identity is not derived from Reference authority', () => {
  assert.doesNotMatch(correctiveProjectorSource(), /Reference|activeReference|generationMode/u);
});

test('AP-09 identity is not derived from PackagingTranslationV2', () => {
  assert.doesNotMatch(correctiveProjectorSource(), /PackagingTranslation|packagingConcept|translation/u);
});

test('AP-10 no filename or project-name-to-brand heuristic exists', () => {
  const source = correctiveProjectorSource();
  assert.doesNotMatch(source, /filename|originalName|projectName\s*(?:\|\||\?\?)\s*.*brand/u);
  assert.match(source, /brandName:\s*input\.project\?\.brandName\s*\|\|\s*''/u);
});

test('AP-15 P3-A12 current baseline direct frozen diff is zero (no exclusion)', () => {
  // P3-A12 (`1fcafc8`) is the current accepted P3-A
  // production-tree baseline. The C4.2.1 / P3-A12
  // corrective absorbed the read-only `checkStale` seam
  // in `workspace-service.js` as part of the P3-A frozen
  // surface. A direct `1fcafc8 -> HEAD` diff against the
  // P3-A gate therefore requires NO exclusion.
  assert.equal(
    git(['diff', '--name-only', P3A, 'HEAD',
      '--', 'packages/runtime-core/src/application/packaging']),
    '',
  );
});

test('AP-16 P3-C selector authority remains unchanged', () => {
  assert.equal(git(['diff', '--name-only', P3C_INTEGRATION, 'HEAD', '--', SELECTOR_PATH]), '');
});

test('AP-17 P2 frozen production diff remains zero', () => {
  assert.equal(git(['diff', '--name-only', P2, 'HEAD', '--', 'packages/image-generation-runtime/src/packaging']), '');
});

test('AP-18 P3-A12 current baseline direct frozen diff is zero (no exclusion)', () => {
  // P3-A12 (`1fcafc8`) is the current accepted P3-A
  // production-tree baseline. The C4.2.1 / P3-A12
  // corrective absorbed the read-only `checkStale` seam
  // in `workspace-service.js` as part of the P3-A frozen
  // surface. A direct `1fcafc8 -> HEAD` diff against the
  // P3-A gate therefore requires NO exclusion.
  assert.equal(
    git(['diff', '--name-only', P3A, 'HEAD',
      '--', 'packages/runtime-core/src/application/packaging']),
    '',
  );
});

test('AP-19 P3-B accepted UI and Workspace semantics remain unchanged (P3-A12 absorbed)', () => {
  // P3-A12 absorbed the C4.2.1 + comment-only P3-A12
  // delta to `workspace-service.js`. The P3-B sub-tree
  // (UI + Workspace semantic) is therefore unchanged from
  // `2ac4cf1` to HEAD without any exclusion.
  assert.equal(
    git(['diff', '--name-only', P3B, 'HEAD',
      '--', 'apps/web/src/features/packaging', 'packages/runtime-core/src/application/packaging']),
    '',
  );
});

test('AP-20 D-PROVIDER-01 effective cap remains 10 in Registry and Seedream adapter', () => {
  assert.equal(getRegisteredModel('seedream-5.0-pro')?.maxReferenceImages, 10);
  assert.match(ADAPTER, /'seedream-5\.0-pro':[\s\S]{0,180}maxReferences:\s*10/u);
});
