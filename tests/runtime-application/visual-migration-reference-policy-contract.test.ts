import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVisualMigrationReferencePolicy } from '@masterpiece/runtime-core/application/visual-migration-reference-policy-builder.ts';
import {
  validateTaskAwareReferencePolicyV1,
  validateVisualMigrationReferenceTaskV1,
  VISUAL_MIGRATION_REFERENCE_POLICY_COMPILER_VERSION,
} from '@masterpiece/runtime-core/application/visual-migration-reference-policy-contract.ts';
import { policyFixture, PROJECT_ID, referenceTask } from './visual-migration-reference-policy-fixture.ts';

function build() {
  const fixture = policyFixture();
  return buildVisualMigrationReferencePolicy({
    projectId: PROJECT_ID, task: referenceTask(), canon: fixture.canon,
    referencePack: fixture.referencePack, lockedAssets: [fixture.lockedAsset],
    projectAssets: [{ id: 'logo-source', mimeType: 'image/png', status: 'ready' }],
    candidateDeclarations: [{
      candidateId: 'identity-1', sourceKind: 'locked_asset', sourceId: 'lock-logo',
      imageAssetId: 'logo-source', role: 'identity_reference', sourceOrder: 0,
    }],
  });
}

test('VM-3 contract activates only visual_transfer and requires project context', () => {
  assert.throws(() => validateVisualMigrationReferenceTaskV1(referenceTask({ projectId: '' })), {
    code: 'REFERENCE_POLICY_PROJECT_REQUIRED',
  });
  assert.throws(() => validateVisualMigrationReferenceTaskV1(referenceTask({ preset: 'analysis_led' })), {
    code: 'REFERENCE_POLICY_PRESET_NOT_ACTIVATED',
  });
  assert.throws(() => validateVisualMigrationReferenceTaskV1({ ...referenceTask(), preset: 'unknown' }), {
    code: 'REFERENCE_POLICY_PRESET_UNSUPPORTED',
  });
});

test('VM-3 policy identity includes compiler version and rejects tampering', () => {
  const policy = build();
  assert.equal(policy.compilerVersion, VISUAL_MIGRATION_REFERENCE_POLICY_COMPILER_VERSION);
  assert.match(policy.policyId, /^vrp-[a-f0-9]{32}$/u);
  assert.throws(() => validateTaskAwareReferencePolicyV1({ ...policy, compilerVersion: '9.9.9' }), {
    code: 'REFERENCE_POLICY_INTEGRITY_FAILED',
  });
  assert.throws(() => validateTaskAwareReferencePolicyV1({ ...policy, policyFingerprint: `sha256:${'f'.repeat(64)}` }), {
    code: 'REFERENCE_POLICY_FINGERPRINT_MISMATCH',
  });
});

test('VM-3 policy contains no Provider, capacity, local path or image bytes', () => {
  const policy = build();
  const serialized = JSON.stringify(policy);
  assert.doesNotMatch(serialized, /provider|modelId|maxReferenceImages|maxReferences|absolutePath|localPath|base64|imageBytes/iu);
  assert.throws(() => validateTaskAwareReferencePolicyV1({ ...policy, provider: 'x' }), {
    code: 'REFERENCE_POLICY_INTEGRITY_FAILED',
  });
  assert.throws(() => validateTaskAwareReferencePolicyV1({ ...policy, payload: { localPath: 'C:\\secret.png' } }), {
    code: 'REFERENCE_POLICY_INTEGRITY_FAILED',
  });
});
