import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {
  LockedAsset,
  VisualMigrationReferenceCandidateDeclarationV1,
  VisualMigrationReferencePackV1,
} from '@masterpiece/project-contracts/index.ts';
import { resolveImageReferenceCapability } from '@masterpiece/model-registry';
import { createMultiModelImageAdapter } from '@masterpiece/image-generation-adapter/multi-model.js';
import { createVisualMigrationReferencePackService } from '@masterpiece/runtime-core/application/visual-migration-reference-pack-service.ts';
import {
  canonicalSerializeVisualMigrationValue,
  computeVisualMigrationManifestFingerprint,
  sha256Fingerprint,
} from '@masterpiece/runtime-core/application/visual-migration-reference-pack-contract.ts';
import { buildVisualMigrationCanon } from '@masterpiece/runtime-core/application/visual-migration-canon-builder.ts';
import { buildVisualMigrationReferencePolicy } from '@masterpiece/runtime-core/application/visual-migration-reference-policy-builder.ts';
import {
  buildAllocationBoundProviderReferenceEnvelope,
  createVisualMigrationReferenceExecutionService,
} from '@masterpiece/runtime-core/application/visual-migration-reference-execution-service.ts';
import {
  PROJECT_ID,
  policyFixture,
  referenceTask,
} from './visual-migration-reference-policy-fixture.ts';

function png(seed: number): Buffer {
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    Buffer.from([seed, seed + 1, seed + 2, seed + 3]),
  ]);
}

function sha256(bytes: Buffer): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

interface FixtureOptions {
  maxReferences?: number;
  styleCount?: number;
  identityCount?: number;
  structureRequired?: boolean;
  includeLocked?: boolean;
  includeTask?: boolean;
  includeAnalysis?: boolean;
  capabilityMimeTypes?: string[];
}

async function fixture(options: FixtureOptions = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-vm4-'));
  const projectRoot = path.join(root, 'project');
  const packId = `vmrp-${'a'.repeat(32)}`;
  const packRoot = path.join(projectRoot, 'visual-migration', 'reference-packs', packId);
  await fs.mkdir(path.join(packRoot, 'assets'), { recursive: true });
  await fs.mkdir(path.join(projectRoot, 'input', 'assets'), { recursive: true });

  const references = [];
  for (let index = 0; index < (options.styleCount ?? 4); index += 1) {
    const bytes = png(index + 1);
    const referenceId = `style-${index + 1}`;
    const storagePath = `visual-migration/reference-packs/${packId}/assets/${referenceId}.png`;
    await fs.writeFile(path.join(projectRoot, storagePath), bytes);
    references.push({
      referenceId,
      storagePath,
      originalFileName: `${referenceId}.png`,
      mimeType: 'image/png',
      byteSize: bytes.byteLength,
      sha256: sha256(bytes),
      role: 'style_reference' as const,
    });
  }
  const source = policyFixture();
  const packWithoutFingerprint = {
    schemaVersion: 'visual-migration-reference-pack/v1' as const,
    referencePackId: packId,
    projectId: PROJECT_ID,
    sourceReferenceAnchorRunId: 'run-1',
    createdAt: '2026-09-03T00:00:00.000Z',
    sourceFingerprint: sha256Fingerprint('vm4-source'),
    references,
    semanticEvidence: {
      capsuleFingerprint: sha256Fingerprint(
        canonicalSerializeVisualMigrationValue(source.capsule),
      ),
      briefFingerprint: sha256Fingerprint('brief'),
      creativeDecisionId: 'creative-decision-quick-run-1',
      styleProfileId: 'style-1',
    },
  };
  const referencePack: VisualMigrationReferencePackV1 = {
    ...packWithoutFingerprint,
    manifestFingerprint: computeVisualMigrationManifestFingerprint(packWithoutFingerprint),
  };
  await fs.writeFile(path.join(packRoot, 'manifest.json'), `${JSON.stringify(referencePack, null, 2)}\n`);

  const canon = buildVisualMigrationCanon({
    projectId: PROJECT_ID,
    referenceAnchorRunId: 'run-1',
    referencePack,
    capsule: source.capsule,
    styleProfile: source.styleProfile,
    lockedAssets: [source.lockedAsset],
    project: {
      id: PROJECT_ID,
      brandName: '当前品牌',
      industry: '零售',
      logoLocked: true,
      lockedFacts: ['Logo 必须原样保留'],
    },
    now: '2026-09-03T00:00:00.000Z',
  });

  const projectAssets: Array<Record<string, unknown>> = [];
  async function addAsset(id: string, bytes = png(projectAssets.length + 20)) {
    const relativePath = `assets/${id}.png`;
    await fs.writeFile(path.join(projectRoot, 'input', relativePath), bytes);
    projectAssets.push({
      id,
      status: 'ready',
      usage: 'analysis_source',
      relativePath,
      mimeType: 'image/png',
      sha256: sha256(bytes),
      sizeBytes: bytes.byteLength,
    });
  }
  const declarations: VisualMigrationReferenceCandidateDeclarationV1[] = [];
  for (let index = 0; index < (options.identityCount ?? 0); index += 1) {
    const sourceId = `identity-source-${index + 1}`;
    await addAsset(sourceId);
    declarations.push({
      candidateId: `identity-${index + 1}`,
      sourceKind: 'project_asset',
      sourceId,
      role: 'identity_reference',
      sourceOrder: index,
    });
  }
  await addAsset('structure-source');
  if (options.structureRequired) {
    declarations.push({
      candidateId: 'structure-1',
      sourceKind: 'project_asset',
      sourceId: 'structure-source',
      role: 'structure_reference',
      sourceOrder: 0,
    });
  }
  await addAsset('locked-source');
  if (options.includeLocked) {
    declarations.push({
      candidateId: 'locked-identity',
      sourceKind: 'locked_asset',
      sourceId: 'lock-logo',
      imageAssetId: 'locked-source',
      role: 'identity_reference',
      sourceOrder: 20,
    });
  }
  await addAsset('task-image');
  if (options.includeTask) {
    declarations.push({
      candidateId: 'task-identity',
      sourceKind: 'task_reference',
      sourceId: 'task-reference-1',
      imageAssetId: 'task-image',
      role: 'identity_reference',
      sourceOrder: 30,
    });
  }
  if (options.includeAnalysis) {
    await addAsset('analysis-source');
    declarations.push({
      candidateId: 'analysis-only',
      sourceKind: 'project_asset',
      sourceId: 'analysis-source',
      role: 'analysis_only',
      sourceOrder: 0,
    });
  }

  const task = referenceTask({
    structureEvidence: options.structureRequired ? 'required_if_explicit' : 'not_required',
    explicitStructureCandidateIds: options.structureRequired ? ['structure-1'] : [],
    taskReferenceIds: options.includeTask ? ['task-reference-1'] : [],
  });
  const lockedAsset: LockedAsset = {
    ...source.lockedAsset,
    sourceAssetId: 'locked-source',
  };
  const policy = buildVisualMigrationReferencePolicy({
    projectId: PROJECT_ID,
    task,
    canon,
    referencePack,
    projectAssets: projectAssets.map((asset) => ({
      id: String(asset.id),
      mimeType: String(asset.mimeType),
      status: asset.status as 'ready',
    })),
    lockedAssets: [lockedAsset],
    candidateDeclarations: declarations,
  });

  const project = { id: PROJECT_ID, assets: projectAssets };
  const projects = {
    get: async () => project,
    paths: async () => ({ root: projectRoot }),
  };
  const referencePacks = createVisualMigrationReferencePackService(
    projects as never,
    {} as never,
  );
  const baseCapability = resolveImageReferenceCapability({
    registryModelId: 'seedream-5.0-pro',
  });
  const maxReferences = options.maxReferences ?? baseCapability.maxReferenceImages;
  const capability = Object.freeze({
    ...baseCapability,
    maxReferenceImages: maxReferences,
    supportedReferenceMimeTypes: Object.freeze(
      options.capabilityMimeTypes ?? [...baseCapability.supportedReferenceMimeTypes],
    ),
    capabilityFingerprint: `synthetic-vm4-cap-${maxReferences}-${
      (options.capabilityMimeTypes ?? baseCapability.supportedReferenceMimeTypes).join('-')}`,
  });
  let providerCalls = 0;
  const service = createVisualMigrationReferenceExecutionService({
    projects: projects as never,
    referencePolicies: { resolve: async () => policy } as never,
    referencePacks,
    lockedAssets: { get: async () => lockedAsset },
    capabilityResolver: () => capability,
  });
  const prepare = () => service.prepare({
    projectId: PROJECT_ID,
    policyId: policy.policyId,
    registryModelId: 'seedream-5.0-pro',
    locators: { taskReferences: { 'task-identity': 'task-image' } },
    buildProviderRequest: ({ references: envelopeReferences }) => {
      providerCalls += 1;
      return { candidateIds: envelopeReferences.map((item) => item.candidateId) };
    },
  });
  return {
    root,
    projectRoot,
    packRoot,
    referencePack,
    policy,
    project,
    projectAssets,
    lockedAsset,
    service,
    prepare,
    providerCalls: () => providerCalls,
  };
}

const CAPACITY_CASES = [
  { name: 'A', identityCount: 0, structureRequired: false, maxReferences: 1,
    expectedRoles: ['style_reference'] },
  { name: 'B', identityCount: 2, structureRequired: false, maxReferences: 1,
    error: 'REFERENCE_POLICY_CAPACITY_UNSATISFIABLE' },
  { name: 'C', identityCount: 2, structureRequired: false, maxReferences: 2,
    expectedRoles: ['identity_reference', 'style_reference'] },
  { name: 'D', identityCount: 2, structureRequired: false, maxReferences: 3,
    expectedRoles: ['identity_reference', 'identity_reference', 'style_reference'] },
  { name: 'E', identityCount: 1, structureRequired: true, maxReferences: 2,
    error: 'REFERENCE_POLICY_CAPACITY_UNSATISFIABLE' },
  { name: 'F', identityCount: 1, structureRequired: true, maxReferences: 3,
    expectedRoles: ['identity_reference', 'structure_reference', 'style_reference'] },
] as const;

for (const capacityCase of CAPACITY_CASES) {
  test(`VM-4 capacity matrix ${capacityCase.name} reaches the exact Provider envelope`, async (t) => {
    const f = await fixture(capacityCase);
    t.after(() => fs.rm(f.root, { recursive: true, force: true }));
    if ('error' in capacityCase) {
      await assert.rejects(f.prepare, { code: capacityCase.error });
      assert.equal(f.providerCalls(), 0);
      return;
    }
    const result = await f.prepare();
    const allocationIds = result.allocation.selectedCandidateIds;
    const materializationIds = result.references.map((item) => item.candidateId);
    const envelopeIds = result.providerEnvelope.references.map((item) => item.candidateId);
    assert.deepEqual(materializationIds, allocationIds);
    assert.deepEqual(envelopeIds, allocationIds);
    assert.deepEqual(result.providerRequest, { candidateIds: allocationIds });
    assert.deepEqual(
      result.providerEnvelope.references.map((item) => item.role),
      capacityCase.expectedRoles,
    );
    assert.equal(f.providerCalls(), 1);
  });
}

test('VM-4 materializes pack, locked, project and task evidence; analysis_only never enters', async (t) => {
  const f = await fixture({
    styleCount: 1,
    identityCount: 1,
    structureRequired: true,
    includeLocked: true,
    includeTask: true,
    includeAnalysis: true,
  });
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const result = await f.prepare();
  assert.deepEqual(new Set(result.references.map((item) => item.sourceKind)), new Set([
    'visual_migration_reference_pack', 'locked_asset', 'project_asset', 'task_reference',
  ]));
  assert.equal(result.references.some((item) => item.candidateId === 'analysis-only'), false);
  assert.ok(result.references.every((item) => item.bytes.length === item.byteSize));
  assert.ok(result.providerEnvelope.references.every((item) => item.data.length > 0));
});

test('VM-4 task reference requires an execution-local locator before Provider build', async (t) => {
  const f = await fixture({ styleCount: 1, includeTask: true });
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  await assert.rejects(
    () => f.service.prepare({
      projectId: PROJECT_ID,
      policyId: f.policy.policyId,
      registryModelId: 'seedream-5.0-pro',
      locators: { taskReferences: {} },
      buildProviderRequest: () => { throw new Error('must not run'); },
    }),
    { code: 'TASK_REFERENCE_LOCATOR_MISSING' },
  );
  assert.equal(f.providerCalls(), 0);
});

test('VM-4 rejects locked evidence from another project before Provider build', async (t) => {
  const f = await fixture({ styleCount: 1, includeLocked: true });
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const service = createVisualMigrationReferenceExecutionService({
    projects: { get: async () => f.project, paths: async () => ({ root: f.projectRoot }) } as never,
    referencePolicies: { resolve: async () => f.policy } as never,
    referencePacks: createVisualMigrationReferencePackService(
      { paths: async () => ({ root: f.projectRoot }) } as never,
      {} as never,
    ),
    lockedAssets: { get: async () => ({ ...f.lockedAsset, projectId: 'project-other' }) },
  });
  let calls = 0;
  await assert.rejects(
    () => service.prepare({
      projectId: PROJECT_ID,
      policyId: f.policy.policyId,
      registryModelId: 'seedream-5.0-pro',
      buildProviderRequest: () => { calls += 1; },
    }),
    { code: 'REFERENCE_MATERIALIZATION_PROJECT_MISMATCH' },
  );
  assert.equal(calls, 0);
});

test('VM-4 rejects unsupported Registry MIME, path escape and hash mutation before Provider', async (t) => {
  const mime = await fixture({ styleCount: 1, capabilityMimeTypes: ['image/jpeg'] });
  t.after(() => fs.rm(mime.root, { recursive: true, force: true }));
  await assert.rejects(mime.prepare, { code: 'REFERENCE_MATERIALIZATION_MIME_UNSUPPORTED' });
  assert.equal(mime.providerCalls(), 0);

  const unsafe = await fixture({ styleCount: 1, identityCount: 1 });
  t.after(() => fs.rm(unsafe.root, { recursive: true, force: true }));
  const identity = unsafe.projectAssets.find((asset) => asset.id === 'identity-source-1')!;
  identity.relativePath = '../../outside.png';
  await assert.rejects(unsafe.prepare, { code: 'REFERENCE_MATERIALIZATION_PATH_UNSAFE' });
  assert.equal(unsafe.providerCalls(), 0);

  const tampered = await fixture({ styleCount: 1, identityCount: 1 });
  t.after(() => fs.rm(tampered.root, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(tampered.projectRoot, 'input', 'assets', 'identity-source-1.png'),
    png(99),
  );
  await assert.rejects(tampered.prepare, { code: 'REFERENCE_EVIDENCE_INTEGRITY_FAILED' });
  assert.equal(tampered.providerCalls(), 0);
});

test('VM-4 maps missing and tampered production Pack evidence to fail-closed errors', async (t) => {
  const missing = await fixture({ styleCount: 1 });
  t.after(() => fs.rm(missing.root, { recursive: true, force: true }));
  await fs.rm(path.join(missing.packRoot, 'assets', 'style-1.png'));
  await assert.rejects(missing.prepare, { code: 'REFERENCE_MATERIALIZATION_PATH_UNSAFE' });
  assert.equal(missing.providerCalls(), 0);

  const tampered = await fixture({ styleCount: 1 });
  t.after(() => fs.rm(tampered.root, { recursive: true, force: true }));
  await fs.writeFile(path.join(tampered.packRoot, 'assets', 'style-1.png'), png(88));
  await assert.rejects(tampered.prepare, { code: 'REFERENCE_EVIDENCE_INTEGRITY_FAILED' });
  assert.equal(tampered.providerCalls(), 0);
});

test('VM-4 Provider envelope rejects any downstream reorder or substitution', async (t) => {
  const f = await fixture({ styleCount: 1, identityCount: 2, maxReferences: 3 });
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const result = await f.prepare();
  assert.throws(
    () => buildAllocationBoundProviderReferenceEnvelope(
      result.capability,
      result.allocation,
      [...result.references].reverse(),
    ),
    { code: 'REFERENCE_MATERIALIZATION_SET_MISMATCH' },
  );
});

test('VM-4 Project Store missing, not-ready and non-image evidence fail before Provider', async (t) => {
  for (const mode of ['missing', 'not-ready', 'non-image'] as const) {
    const f = await fixture({ styleCount: 1, identityCount: 1 });
    t.after(() => fs.rm(f.root, { recursive: true, force: true }));
    const index = f.projectAssets.findIndex((asset) => asset.id === 'identity-source-1');
    if (mode === 'missing') f.projectAssets.splice(index, 1);
    if (mode === 'not-ready') f.projectAssets[index]!.status = 'ignored';
    if (mode === 'non-image') {
      const filename = path.join(f.projectRoot, 'input', 'assets', 'identity-source-1.png');
      const bytes = Buffer.from('%PDF-1.7 not an image');
      await fs.writeFile(filename, bytes);
      f.projectAssets[index]!.sha256 = sha256(bytes);
    }
    await assert.rejects(
      f.prepare,
      { code: mode === 'non-image'
        ? 'REFERENCE_MATERIALIZATION_MIME_UNSUPPORTED'
        : 'REFERENCE_MATERIALIZATION_SOURCE_NOT_FOUND' },
    );
    assert.equal(f.providerCalls(), 0);
  }
});

test('production composition resolves Registry capability and dry-runs the shared adapter', async (t) => {
  const f = await fixture({ styleCount: 1 });
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const service = createVisualMigrationReferenceExecutionService({
    projects: { get: async () => f.project, paths: async () => ({ root: f.projectRoot }) } as never,
    referencePolicies: { resolve: async () => f.policy } as never,
    referencePacks: createVisualMigrationReferencePackService(
      { paths: async () => ({ root: f.projectRoot }) } as never,
      {} as never,
    ),
    lockedAssets: { get: async () => f.lockedAsset },
  });
  let calls = 0;
  const result = await service.prepare({
    projectId: PROJECT_ID,
    policyId: f.policy.policyId,
    registryModelId: 'seedream-5.0-pro',
    provider: 'volcengine',
    protocol: 'seedream-image',
    buildProviderRequest: ({ capability, references }) => {
      calls += 1;
      assert.equal(capability.maxReferenceImages, 10);
      const referenceIds = references.map((item) => item.candidateId);
      const adapter = createMultiModelImageAdapter({
        adapterId: 'seedream-5.0-pro',
        apiKey: 'dry-run-only',
        capabilitySnapshot: capability,
      });
      const request = adapter.compileRequest({
        prompt: 'VM-4 allocation-bound visual transfer.',
        negativeRules: [],
        aspectRatio: '1:1',
        imageSize: '2K',
        outputCount: 1,
        references,
      });
      return { referenceIds, request };
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result.providerRequest.referenceIds, result.allocation.selectedCandidateIds);
  assert.equal(result.providerRequest.request.body.image.length, 1);
  assert.equal(result.providerRequest.request.headers.Authorization, 'Bearer dry-run-only');
});

test('unknown and incomplete Registry capabilities fail before any Provider callback', async (t) => {
  const f = await fixture({ styleCount: 1 });
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const service = createVisualMigrationReferenceExecutionService({
    projects: { get: async () => f.project, paths: async () => ({ root: f.projectRoot }) } as never,
    referencePolicies: { resolve: async () => f.policy } as never,
    referencePacks: createVisualMigrationReferencePackService(
      { paths: async () => ({ root: f.projectRoot }) } as never,
      {} as never,
    ),
    lockedAssets: { get: async () => f.lockedAsset },
  });
  let calls = 0;
  for (const registryModelId of ['unknown-image-model', 'gpt-image-2']) {
    await assert.rejects(
      () => service.prepare({
        projectId: PROJECT_ID,
        policyId: f.policy.policyId,
        registryModelId,
        buildProviderRequest: () => { calls += 1; },
      }),
      (error: unknown) => ['PROVIDER_CAPABILITY_NOT_FOUND', 'PROVIDER_CAPABILITY_INCOMPLETE']
        .includes(String((error as { code?: unknown }).code)),
    );
  }
  assert.equal(calls, 0);
});
