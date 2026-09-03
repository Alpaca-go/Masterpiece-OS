// r2.0 §4.10 / B-2: Seedream adapter MUST honestly declare its reference-image
// capability, and the effective max reference count MUST be the min of
// Product Policy and Adapter Capability. The hardcoded "maxReferences: 2"
// in vnext-service is gone; this test pins the new seam.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const productPolicyUrl = pathToFileURL(
  path.join(repoRoot, 'packages/image-generation-runtime/src/space/product-policy.js'),
).href;
const seedreamAdapterUrl = pathToFileURL(
  path.join(repoRoot, 'packages/image-generation-runtime/src/generation/seedream-adapter.js'),
).href;

const { resolveEffectiveMaxReferences, resolveProductPolicyMaxReferences, PRODUCT_POLICY_VERSION }
  = await import(productPolicyUrl);
const { createSeedreamShortChainAdapter, SEEDREAM_SHORT_CHAIN_ADAPTER_ID, SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION }
  = await import(seedreamAdapterUrl);

test('r2.0 B-2: Product Policy module exposes a version constant', () => {
  assert.match(PRODUCT_POLICY_VERSION, /^space-product-policy@/);
});

test('r2.0 B-2: Product Policy per-basis upper bound matches the documented baseline', () => {
  assert.equal(resolveProductPolicyMaxReferences('standard'), 0);
  assert.equal(resolveProductPolicyMaxReferences('reference_first'), 2);
  assert.equal(resolveProductPolicyMaxReferences('continuation'), 1);
  assert.equal(resolveProductPolicyMaxReferences('unknown_basis'), 0);
});

test('r2.0 B-2: Seedream adapter declares a non-null capability with the documented id / version', () => {
  const adapter = createSeedreamShortChainAdapter();
  assert.ok(adapter.capability, 'adapter must declare capability');
  assert.equal(adapter.capability.adapterId, SEEDREAM_SHORT_CHAIN_ADAPTER_ID);
  assert.equal(adapter.capability.adapterVersion, SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION);
});

test('VM-4.1: Seedream reports Registry Provider max=10, not the Space ceiling', () => {
  const adapter = createSeedreamShortChainAdapter();
  assert.equal(adapter.capability.reference.maxReferenceImages, 10);
  assert.equal(adapter.capability.reference.supportedReferenceMimeTypes.includes('image/png'), true);
  assert.equal(adapter.capability.reference.capabilityFingerprint.length, 64);
});

test('r2.0 B-2: Seedream reports referenceStrengthControl as UNSUPPORTED with an honest note', () => {
  const adapter = createSeedreamShortChainAdapter();
  const ctl = adapter.capability.reference.referenceStrengthControl;
  assert.equal(ctl.supported, false);
  assert.equal(ctl.controlParameter, null);
  assert.ok(ctl.note && ctl.note.length > 10, 'note must be present and meaningful');
  // Honest: the note must say something about not having been verified.
  assert.match(ctl.note, /verif|not.*been.*check|capability.*not|Path A.*fallback/i);
});

test('r2.0 B-2: Seedream reports referenceRoleControl as UNSUPPORTED with an honest note', () => {
  const adapter = createSeedreamShortChainAdapter();
  const ctl = adapter.capability.reference.referenceRoleControl;
  assert.equal(ctl.supported, false);
  assert.equal(ctl.controlParameter, null);
  assert.ok(ctl.note && ctl.note.length > 10);
});

test('VM-4.1: effective max for reference_first is min(product 2, Provider 10) = 2', () => {
  const adapter = createSeedreamShortChainAdapter();
  const out = resolveEffectiveMaxReferences({
    generationBasis: 'reference_first',
    adapterCapability: adapter.capability,
  });
  assert.equal(out.effectiveMax, 2);
  assert.equal(out.productPolicyMax, 2);
  assert.equal(out.adapterCapabilityMax, 10);
  assert.equal(out.adapterStrengthControlSupported, false);
  assert.equal(out.adapterRoleControlSupported, false);
  assert.equal(out.source, 'product_policy');
});

test('r2.0 B-2: effective max for standard is 0 (no references)', () => {
  const adapter = createSeedreamShortChainAdapter();
  const out = resolveEffectiveMaxReferences({
    generationBasis: 'standard',
    adapterCapability: adapter.capability,
  });
  assert.equal(out.effectiveMax, 0);
});

test('r2.0 B-2: effective max for continuation is 1', () => {
  const adapter = createSeedreamShortChainAdapter();
  const out = resolveEffectiveMaxReferences({
    generationBasis: 'continuation',
    adapterCapability: adapter.capability,
  });
  assert.equal(out.effectiveMax, 1);
  // Product policy (1) is tighter than Seedream capability (2), so the
  // policy is the binding side.
  assert.equal(out.source, 'product_policy');
});

test('r2.0 B-2: when adapter capability is missing, the effective max is 0 (fail closed)', () => {
  const out = resolveEffectiveMaxReferences({
    generationBasis: 'reference_first',
    adapterCapability: null,
  });
  assert.equal(out.effectiveMax, 0);
  assert.equal(out.adapterCapabilityMax, 0);
  assert.equal(out.productPolicyMax, 2);
  // The product policy is higher, so the adapter side is the bottleneck.
  assert.equal(out.source, 'adapter_capability');
});

test('r2.0 B-2: when policy is tighter than capability, policy wins', () => {
  const fakeCapability = {
    adapterId: 'mock',
    adapterVersion: 'mock@1.0.0',
    reference: {
      maxReferenceImages: 5,
      referenceStrengthControl: { supported: false, controlParameter: null, note: 'mock' },
      referenceRoleControl: { supported: false, controlParameter: null, note: 'mock' },
    },
  };
  const out = resolveEffectiveMaxReferences({
    generationBasis: 'reference_first',
    adapterCapability: fakeCapability,
  });
  assert.equal(out.effectiveMax, 2);
  assert.equal(out.productPolicyMax, 2);
  assert.equal(out.adapterCapabilityMax, 5);
  assert.equal(out.source, 'product_policy');
});

test('r2.0 B-2: when capability is tighter than policy, capability wins', () => {
  const fakeCapability = {
    adapterId: 'mock',
    adapterVersion: 'mock@1.0.0',
    reference: {
      maxReferenceImages: 1,
      referenceStrengthControl: { supported: true, controlParameter: 'ref_strength', note: 'mock' },
      referenceRoleControl: { supported: false, controlParameter: null, note: 'mock' },
    },
  };
  const out = resolveEffectiveMaxReferences({
    generationBasis: 'reference_first',
    adapterCapability: fakeCapability,
  });
  assert.equal(out.effectiveMax, 1);
  assert.equal(out.adapterStrengthControlSupported, true);
  assert.equal(out.source, 'adapter_capability');
});

test('r2.0 B-2: the seedream adapter object is frozen and its capability is frozen', () => {
  const adapter = createSeedreamShortChainAdapter();
  assert.ok(Object.isFrozen(adapter));
  assert.ok(Object.isFrozen(adapter.capability));
  assert.ok(Object.isFrozen(adapter.capability.reference));
  assert.ok(Object.isFrozen(adapter.capability.reference.referenceStrengthControl));
  assert.ok(Object.isFrozen(adapter.capability.reference.referenceRoleControl));
});
