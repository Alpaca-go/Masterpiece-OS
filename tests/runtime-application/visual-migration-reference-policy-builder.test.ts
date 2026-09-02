import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVisualMigrationReferencePolicy } from '@masterpiece/runtime-core/application/visual-migration-reference-policy-builder.ts';
import { policyFixture, PROJECT_ID, referenceTask } from './visual-migration-reference-policy-fixture.ts';

function base() {
  const fixture = policyFixture();
  return {
    projectId: PROJECT_ID, task: referenceTask(), canon: fixture.canon, referencePack: fixture.referencePack,
    lockedAssets: [fixture.lockedAsset],
    projectAssets: [
      { id: 'logo-source', mimeType: 'image/png', status: 'ready' as const },
      { id: 'structure-source', mimeType: 'image/webp', status: 'ready' as const },
      { id: 'task-source', mimeType: 'image/jpeg', status: 'ready' as const },
    ],
  };
}

test('VM-3 builder deterministically compiles style and required-if-available identity floors', () => {
  const input = base();
  const declarations = [
    { candidateId: 'identity-2', sourceKind: 'project_asset' as const, sourceId: 'logo-source', role: 'identity_reference' as const, sourceOrder: 1 },
    { candidateId: 'identity-1', sourceKind: 'locked_asset' as const, sourceId: 'lock-logo', imageAssetId: 'logo-source', role: 'identity_reference' as const, sourceOrder: 0 },
  ];
  const first = buildVisualMigrationReferencePolicy({ ...input, candidateDeclarations: declarations });
  const second = buildVisualMigrationReferencePolicy({ ...base(), candidateDeclarations: declarations });
  assert.equal(first.guarantees.styleFloor, 1);
  assert.equal(first.guarantees.identityFloor, 1);
  assert.equal(first.guarantees.structureFloor, 0);
  assert.equal(first.policyId, second.policyId);
  assert.equal(first.policyFingerprint, second.policyFingerprint);
});

test('VM-3 builder reserves structure only when the task explicitly names it', () => {
  const declaration = {
    candidateId: 'structure-1', sourceKind: 'project_asset' as const, sourceId: 'structure-source',
    role: 'structure_reference' as const, sourceOrder: 0,
  };
  const absent = buildVisualMigrationReferencePolicy({ ...base(), candidateDeclarations: [declaration] });
  assert.equal(absent.guarantees.structureFloor, 0);
  const explicit = buildVisualMigrationReferencePolicy({
    ...base(),
    task: referenceTask({ structureEvidence: 'required_if_explicit', explicitStructureCandidateIds: ['structure-1'] }),
    candidateDeclarations: [declaration],
  });
  assert.equal(explicit.guarantees.structureFloor, 1);
  assert.equal(explicit.candidates.find((item) => item.candidateId === 'structure-1')?.requiredGroup, 'structure_floor');
});

test('VM-3 builder requires image-backed explicit candidates and rejects duplicates', () => {
  const input = base();
  const invalid = {
    candidateId: 'identity-1', sourceKind: 'project_asset' as const, sourceId: 'missing',
    role: 'identity_reference' as const, sourceOrder: 0,
  };
  assert.throws(() => buildVisualMigrationReferencePolicy({ ...input, candidateDeclarations: [invalid] }), {
    code: 'REFERENCE_POLICY_CANDIDATE_INVALID',
  });
  const valid = { ...invalid, sourceId: 'logo-source' };
  assert.throws(() => buildVisualMigrationReferencePolicy({ ...input, candidateDeclarations: [valid, valid] }), {
    code: 'REFERENCE_POLICY_DUPLICATE_CANDIDATE',
  });
});

test('VM-3 analysis_only candidate is explicitly non-materializable', () => {
  const policy = buildVisualMigrationReferencePolicy({
    ...base(), task: referenceTask({ identityEvidence: 'semantic_only' }),
    candidateDeclarations: [{
      candidateId: 'analysis-1', sourceKind: 'locked_asset', sourceId: 'lock-logo',
      role: 'analysis_only', sourceOrder: 0,
    }],
  });
  assert.equal(policy.candidates.find((item) => item.candidateId === 'analysis-1')?.retention, 'non_materializable');
  assert.equal(policy.guarantees.identityFloor, 0);
});
