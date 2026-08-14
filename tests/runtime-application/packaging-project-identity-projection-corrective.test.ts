import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { getRegisteredModel } from '@masterpiece/model-registry';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A = 'f95c145b9b1e37430ac68315c9e039f1f3262ae4';
const P3B = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const P3C_INTEGRATION = '456ec3a9d0273b599ed15bcd424fde1f36b8ce1b';
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

test('AP-15 existing P3-A stale authority remains unchanged', () => {
  assert.equal(git(['diff', '--name-only', P3A, 'HEAD', '--', 'packages/runtime-core/src/application/packaging']), '');
});

test('AP-16 P3-C selector authority remains unchanged', () => {
  assert.equal(git(['diff', '--name-only', P3C_INTEGRATION, 'HEAD', '--', SELECTOR_PATH]), '');
});

test('AP-17 P2 frozen production diff remains zero', () => {
  assert.equal(git(['diff', '--name-only', P2, 'HEAD', '--', 'packages/image-generation-runtime/src/packaging']), '');
});

test('AP-18 P3-A frozen production diff remains zero', () => {
  assert.equal(git(['diff', '--name-only', P3A, 'HEAD', '--', 'packages/runtime-core/src/application/packaging']), '');
});

test('AP-19 P3-B accepted UI and Workspace semantics remain unchanged', () => {
  assert.equal(git(['diff', '--name-only', P3B, 'HEAD', '--', 'apps/web/src/features/packaging', 'packages/runtime-core/src/application/packaging']), '');
});

test('AP-20 D-PROVIDER-01 effective cap remains 10 in Registry and Seedream adapter', () => {
  assert.equal(getRegisteredModel('seedream-5.0-pro')?.maxReferenceImages, 10);
  assert.match(ADAPTER, /'seedream-5\.0-pro':[\s\S]{0,180}maxReferences:\s*10/u);
});
