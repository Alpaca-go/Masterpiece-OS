import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assertSpaceGenerationRouteIntegrity,
} from '@masterpiece/image-generation-runtime/space/gates/generation-route-integrity-gate.js';
import { ACTIVE_SPACE_ROUTE_BASELINE } from '@masterpiece/image-generation-runtime/space/quality-baselines/active-space-route-baseline.js';
import { resolveSpaceReferences } from '@masterpiece/image-generation-runtime/space/space-reference-policy.js';
import { resolveArchitectureAnchorBrandKey } from '@masterpiece/image-generation-runtime/space/architecture-context.js';

const requiredBlocks = [
  'task', 'spatial_intent', 'architecture_language', 'architecture_context',
  'architecture_function_bridge', 'architectural_concept', 'architecture_dna',
  'brand_translation', 'functional_requirement', 'material', 'lighting',
  'composition', 'rendering', 'negative_constraints',
];

test('architecture anchor brand key resolves from registry display name without project rules', () => {
  assert.equal(resolveArchitectureAnchorBrandKey('九州美学'), 'jiuzhou-aesthetics');
  assert.equal(resolveArchitectureAnchorBrandKey('  冯烫烫  '), 'feng-tang-tang');
  assert.equal(resolveArchitectureAnchorBrandKey('未登记品牌'), null);
});

function input(overrides = {}) {
  const generationBasis = overrides.generationBasis ?? 'standard';
  const referenceCount = overrides.referenceCount ?? (generationBasis === 'reference_first' ? 1 : 0);
  return {
    taskContract: {
      deliverableFamily: 'space',
      generationBasis,
      referenceAssetIds: referenceCount ? ['ref-1'] : [],
    },
    compilerMode: 'r8_6_golden',
    trace: { spaceGeneration: {
      compilerId: 'phase9b-quality-compiler',
      promptCharacters: 6500,
      architectureCharacters: 3000,
    } },
    blockIds: requiredBlocks,
    providerReferenceCount: referenceCount,
    referenceMode: referenceCount ? 'reference_assisted' : 'text_only',
    referenceSources: referenceCount ? ['user_explicit'] : [],
    spatialSemanticReport: { status: 'pass', findings: [] },
    requestedAspectRatio: '16:9',
    providerAspectRatio: '16:9',
    providerSize: '2560*1440',
    ...overrides,
  };
}

test('Standard refs=0 reaches r8_6_golden with all required blocks', () => {
  const result = assertSpaceGenerationRouteIntegrity(input());
  assert.equal(result.routeIntegrity.status, 'pass');
  assert.equal(result.referenceMode, 'text_only');
});

test('Reference-First refs=1 reaches r8_6_golden with explicit provenance', () => {
  const result = assertSpaceGenerationRouteIntegrity(input({ generationBasis: 'reference_first' }));
  assert.equal(result.routeIntegrity.referencePolicyMatched, true);
});

test('generic five-block prompt fails closed before Provider', () => {
  assert.throws(
    () => assertSpaceGenerationRouteIntegrity(input({ blockIds: ['task', 'brand', 'material', 'camera', 'negative'] })),
    { code: 'SPACE_COMPILER_ROUTE_MISMATCH' },
  );
});

test('Standard ignores implicit and architecture anchors as Provider references', () => {
  const resolved = resolveSpaceReferences({
    generationBasis: 'standard',
    explicitAssets: [],
    implicitAnchor: { imageId: 'implicit', projectRelativePath: 'old.png' },
    architectureAnchorImages: [{ anchorId: 'arch', imagePath: 'arch.png' }],
  });
  assert.deepEqual(resolved.references, []);
  assert.equal(resolved.trace.providerReferenceCount, 0);
});

test('Reference-First refs=0 fails with its dedicated error', () => {
  assert.throws(
    () => assertSpaceGenerationRouteIntegrity(input({
      generationBasis: 'reference_first',
      referenceCount: 0,
      referenceMode: 'reference_assisted',
    })),
    { code: 'SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED' },
  );
});

test('16:9 task fails when Provider payload is 1:1', () => {
  assert.throws(
    () => assertSpaceGenerationRouteIntegrity(input({ providerAspectRatio: '1:1' })),
    { code: 'SPACE_PROVIDER_ASPECT_RATIO_MISMATCH' },
  );
});

test('16:9 task fails when Provider size is square despite a matching label', () => {
  assert.throws(
    () => assertSpaceGenerationRouteIntegrity(input({ providerSize: '2048*2048' })),
    { code: 'SPACE_PROVIDER_ASPECT_RATIO_MISMATCH' },
  );
});

test('repository baseline fingerprint matches the runtime profile', () => {
  const stored = JSON.parse(fs.readFileSync(
    new URL('../../space-generator/quality-baselines/active-space-route-baseline.json', import.meta.url),
    'utf8',
  ));
  assert.deepEqual(stored, JSON.parse(JSON.stringify(ACTIVE_SPACE_ROUTE_BASELINE)));
});
