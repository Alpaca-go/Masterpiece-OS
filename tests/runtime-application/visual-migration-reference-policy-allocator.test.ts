import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateVisualMigrationReferencePolicy } from '@masterpiece/runtime-core/application/visual-migration-reference-policy-allocator.ts';
import { buildVisualMigrationReferencePolicy } from '@masterpiece/runtime-core/application/visual-migration-reference-policy-builder.ts';
import { policyFixture, PROJECT_ID, referenceTask } from './visual-migration-reference-policy-fixture.ts';

function policy(options: { identityCount?: number; structureRequired?: boolean; analysis?: boolean } = {}) {
  const fixture = policyFixture();
  const declarations = [];
  for (let index = 0; index < (options.identityCount ?? 0); index += 1) {
    declarations.push({
      candidateId: `identity-${index + 1}`, sourceKind: 'project_asset' as const,
      sourceId: `identity-source-${index + 1}`, role: 'identity_reference' as const, sourceOrder: index,
    });
  }
  if (options.structureRequired) declarations.push({
    candidateId: 'structure-1', sourceKind: 'project_asset' as const,
    sourceId: 'structure-source', role: 'structure_reference' as const, sourceOrder: 0,
  });
  if (options.analysis) declarations.push({
    candidateId: 'analysis-1', sourceKind: 'project_asset' as const,
    sourceId: 'analysis-source', role: 'analysis_only' as const, sourceOrder: 0,
  });
  return buildVisualMigrationReferencePolicy({
    projectId: PROJECT_ID,
    task: referenceTask(options.structureRequired ? {
      structureEvidence: 'required_if_explicit', explicitStructureCandidateIds: ['structure-1'],
    } : {}),
    canon: fixture.canon, referencePack: fixture.referencePack,
    projectAssets: [
      ...Array.from({ length: options.identityCount ?? 0 }, (_, index) => ({
        id: `identity-source-${index + 1}`, mimeType: 'image/png', status: 'ready' as const,
      })),
      { id: 'structure-source', mimeType: 'image/png', status: 'ready' as const },
    ],
    candidateDeclarations: declarations,
  });
}

test('VM-3 capacity matrix preserves style and required identity floors', () => {
  const styleOnly = policy();
  assert.equal(allocateVisualMigrationReferencePolicy(styleOnly, 1).selectedCandidateIds.length, 1);
  assert.match(allocateVisualMigrationReferencePolicy(styleOnly, 1).selectedCandidateIds[0]!, /^vrpc-/u);

  const identityStyle = policy({ identityCount: 2 });
  assert.throws(() => allocateVisualMigrationReferencePolicy(identityStyle, 1), {
    code: 'REFERENCE_POLICY_CAPACITY_UNSATISFIABLE',
  });
  const cap2 = allocateVisualMigrationReferencePolicy(identityStyle, 2);
  assert.equal(cap2.reserved.identity, 'identity-1');
  assert.ok(cap2.reserved.style);
  assert.deepEqual(cap2.selectedCandidateIds.slice(0, 1), ['identity-1']);
  const cap3 = allocateVisualMigrationReferencePolicy(identityStyle, 3);
  assert.deepEqual(cap3.selectedCandidateIds.slice(0, 2), ['identity-1', 'identity-2']);
  assert.equal(cap3.selectedCandidateIds[2], cap3.reserved.style);
});

test('VM-3 explicit structure floor fails closed at cap2 and survives at cap3', () => {
  const identityStructureStyle = policy({ identityCount: 1, structureRequired: true });
  assert.throws(() => allocateVisualMigrationReferencePolicy(identityStructureStyle, 2), {
    code: 'REFERENCE_POLICY_CAPACITY_UNSATISFIABLE',
  });
  const cap3 = allocateVisualMigrationReferencePolicy(identityStructureStyle, 3);
  assert.equal(cap3.reserved.identity, 'identity-1');
  assert.equal(cap3.reserved.structure, 'structure-1');
  assert.ok(cap3.reserved.style);
});

test('VM-3 non-required structure does not displace identity or style at cap2', () => {
  const fixture = policyFixture();
  const built = buildVisualMigrationReferencePolicy({
    projectId: PROJECT_ID,
    task: referenceTask({ structureEvidence: 'not_required' }),
    canon: fixture.canon,
    referencePack: fixture.referencePack,
    projectAssets: [
      { id: 'identity-source', mimeType: 'image/png', status: 'ready' },
      { id: 'structure-source', mimeType: 'image/png', status: 'ready' },
    ],
    candidateDeclarations: [
      { candidateId: 'identity-1', sourceKind: 'project_asset', sourceId: 'identity-source', role: 'identity_reference', sourceOrder: 0 },
      { candidateId: 'structure-1', sourceKind: 'project_asset', sourceId: 'structure-source', role: 'structure_reference', sourceOrder: 0 },
    ],
  });
  const cap2 = allocateVisualMigrationReferencePolicy(built, 2);
  assert.equal(cap2.reserved.identity, 'identity-1');
  assert.ok(cap2.reserved.style);
  assert.deepEqual(cap2.selectedCandidateIds, ['identity-1', cap2.reserved.style]);
  assert.ok(cap2.droppedCandidateIds.includes('structure-1'));
});

test('VM-3 non-required structure follows legacy surplus order and analysis_only is never selected', () => {
  const fixture = policyFixture();
  const built = buildVisualMigrationReferencePolicy({
    projectId: PROJECT_ID, task: referenceTask({ identityEvidence: 'semantic_only' }),
    canon: fixture.canon, referencePack: fixture.referencePack,
    projectAssets: [{ id: 'structure-source', mimeType: 'image/png', status: 'ready' }],
    candidateDeclarations: [
      { candidateId: 'structure-1', sourceKind: 'project_asset', sourceId: 'structure-source', role: 'structure_reference', sourceOrder: 0 },
      { candidateId: 'analysis-1', sourceKind: 'project_asset', sourceId: 'analysis-source', role: 'analysis_only', sourceOrder: 0 },
    ],
  });
  const allocation = allocateVisualMigrationReferencePolicy(built, 2);
  assert.equal(allocation.selectedCandidateIds[0], 'structure-1');
  assert.ok(allocation.reserved.style);
  assert.ok(!allocation.selectedCandidateIds.includes('analysis-1'));
  assert.deepEqual(allocation.dropReasons.find((item) => item.candidateId === 'analysis-1'), {
    candidateId: 'analysis-1', reason: 'non_materializable',
  });
});
