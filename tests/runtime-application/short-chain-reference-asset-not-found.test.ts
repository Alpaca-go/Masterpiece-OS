// R11.A0 / Phase A0 (r2.0 §4.11): post-analysis reference uploads must surface
// missing asset IDs immediately instead of being silently dropped by the
// previous `flatMap` → `[]` pattern. This test pins the helper contract and
// confirms the throwing shape is what downstream code (and users) will see.

import assert from 'node:assert/strict';
import test from 'node:test';
import { assertReferenceAssetsResolvable } from '@masterpiece/runtime-core/application/image-generation/short-chain-service.ts';

const sourceRefs = [
  { assetId: 'asset-A', relativePath: 'input/a.png' },
  { assetId: 'asset-B', relativePath: 'input/b.jpg' },
  { assetId: 'asset-C', relativePath: 'input/c.webp' },
];

test('A0: empty explicit IDs is a no-op', () => {
  assert.doesNotThrow(() => assertReferenceAssetsResolvable([], sourceRefs, 'project-x'));
  assert.doesNotThrow(() => assertReferenceAssetsResolvable(undefined as unknown as string[], sourceRefs, 'project-x'));
});

test('A0: every ID present does not throw', () => {
  assert.doesNotThrow(() => assertReferenceAssetsResolvable(
    ['asset-A', 'asset-B', 'asset-C'],
    sourceRefs,
    'project-x',
  ));
});

test('A0: a single missing ID throws REFERENCE_ASSET_NOT_FOUND', () => {
  let caught: (Error & { code?: string; missingAssetIds?: string[]; projectId?: string }) | undefined;
  try {
    assertReferenceAssetsResolvable(['asset-A', 'asset-MISSING'], sourceRefs, 'project-x');
  } catch (error) {
    caught = error as typeof caught;
  }
  assert.ok(caught, 'expected throw');
  assert.equal((caught as Error & { code?: string }).code, 'REFERENCE_ASSET_NOT_FOUND');
  assert.deepEqual((caught as Error & { missingAssetIds?: string[] }).missingAssetIds, ['asset-MISSING']);
  assert.equal((caught as Error & { projectId?: string }).projectId, 'project-x');
  assert.match(caught!.message, /asset-MISSING/);
  assert.match(caught!.message, /project-x/);
  assert.match(caught!.message, /Re-upload the asset/);
});

test('A0: multiple missing IDs are all reported', () => {
  let caught: (Error & { code?: string; missingAssetIds?: string[]; projectId?: string }) | undefined;
  try {
    assertReferenceAssetsResolvable(
      ['asset-MISSING-1', 'asset-B', 'asset-MISSING-2'],
      sourceRefs,
      'project-y',
    );
  } catch (error) {
    caught = error as typeof caught;
  }
  assert.ok(caught, 'expected throw');
  assert.equal((caught as Error & { code?: string }).code, 'REFERENCE_ASSET_NOT_FOUND');
  assert.deepEqual((caught as Error & { missingAssetIds?: string[] }).missingAssetIds, ['asset-MISSING-1', 'asset-MISSING-2']);
  assert.equal((caught as Error & { projectId?: string }).projectId, 'project-y');
});

test('A0: empty sourceAssetRefs with any explicit IDs throws', () => {
  let caught: (Error & { code?: string; missingAssetIds?: string[] }) | undefined;
  try {
    assertReferenceAssetsResolvable(['asset-A'], [], 'project-empty');
  } catch (error) {
    caught = error as typeof caught;
  }
  assert.ok(caught, 'expected throw');
  assert.equal((caught as Error & { code?: string }).code, 'REFERENCE_ASSET_NOT_FOUND');
  assert.deepEqual((caught as Error & { missingAssetIds?: string[] }).missingAssetIds, ['asset-A']);
});

test('A0: A0 does NOT throw for PDF assets — that is a Phase C format problem', () => {
  // The helper is intentionally format-agnostic: it only knows about
  // presence in sourceAssetRefs. The PDF filter is kept in the surrounding
  // `flatMap` in vnext-service.start; Phase C will replace it with
  // REFERENCE_ASSET_FORMAT_UNSUPPORTED via the full Asset Resolver.
  const refsWithPdf = [
    { assetId: 'asset-PDF', relativePath: 'input/brief.pdf' },
    { assetId: 'asset-IMG', relativePath: 'input/photo.png' },
  ];
  assert.doesNotThrow(() => assertReferenceAssetsResolvable(
    ['asset-PDF', 'asset-IMG'],
    refsWithPdf,
    'project-pdf',
  ));
});
