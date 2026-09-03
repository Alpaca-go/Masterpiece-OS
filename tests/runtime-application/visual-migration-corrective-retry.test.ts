import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import test from 'node:test';
import { buildVisualMigrationCorrectiveRetryPlan } from '@masterpiece/runtime-core/application/visual-migration-corrective-retry-contract.ts';
import { createVisualMigrationCorrectiveRetryService } from '@masterpiece/runtime-core/application/visual-migration-corrective-retry-service.ts';
import { createRunStore } from '@masterpiece/runtime-core/application/image-generation/run-store.ts';
import { executeWithOptionalPreSubmitGuard } from '@masterpiece/runtime-core/application/image-generation/service.ts';

const fp = (c: string) => `sha256:${c.repeat(64)}`;
function canon() { const r = (dimension: string, statement: string) => ({ dimension, statement }); return { canonId: 'vmc-' + '1'.repeat(32), canonFingerprint: fp('c'), projectIdentity: { requiredIdentityRules: [r('identity', 'keep own logo')], lockedFacts: ['own name'], lockedAssetIds: ['logo'] }, transferSystem: { color: [r('color', 'warm palette')], layoutAndTypography: [r('layout_typography', 'clear grid')], graphicLanguage: [r('graphic_language', 'line rhythm')], materialAndPhotography: [r('material_photography', 'paper texture')], extensionMechanism: [r('extension_mechanism', 'repeat rhythm')] }, prohibitedTransfer: { userAvoidance: [], referenceBrandNames: ['foreign brand'], referenceLogos: ['foreign logo'], referenceSlogans: [], referenceSignatureGraphics: ['signature motif'], referenceProprietaryPatterns: [], prohibitedMutations: [] } } as never; }

test('VM-6 correction plan maps failures deterministically without an LLM', () => {
  const plan = buildVisualMigrationCorrectiveRetryPlan({ projectId: 'p', sourceRunId: 'r', sourceAuditId: 'a', parentSnapshotId: 's', parentSnapshotFingerprint: fp('1'), policyId: 'policy', canon: canon(), capabilityFingerprint: fp('2'), selectedCandidateIds: ['identity', 'style'], failureClasses: ['SOURCE_IDENTITY_LOSS', 'PALETTE_DRIFT', 'STYLE_DRIFT', 'NEAR_COPY_RISK'], createdAt: '2026-09-03T00:00:00Z' });
  assert.deepEqual(plan.correctionActions, ['strengthen_source_identity', 'strengthen_palette_alignment', 'strengthen_transfer_system', 'suppress_reference_identity', 'increase_variation_distance']);
  assert.match(plan.promptOverlay, /keep own logo/u); assert.match(plan.promptOverlay, /foreign logo/u);
  assert.equal(plan.retryConstraints.maximumAutomaticRetryDepth, 1);
  assert.throws(() => buildVisualMigrationCorrectiveRetryPlan({ projectId: 'p', sourceRunId: 'r', sourceAuditId: 'a', parentSnapshotId: 's', parentSnapshotFingerprint: fp('1'), policyId: 'policy', canon: canon(), capabilityFingerprint: fp('2'), selectedCandidateIds: [], failureClasses: ['REFERENCE_CONFLICT'], createdAt: '2026-09-03T00:00:00Z' }), { code: 'VISUAL_MIGRATION_CORRECTIVE_NOT_ELIGIBLE' });
});

test('VM-6 shared pre-submit seam is no-op compatible and blocks submit on guard failure', async () => {
  const evidence = { run: { runId: 'run' }, protocol: 'fixture', providerRequest: { stable: true }, redactedProviderRequest: { stable: true }, references: [] } as never;
  let submits = 0;
  assert.equal(await executeWithOptionalPreSubmitGuard(evidence, undefined, async () => { submits += 1; return 'legacy'; }), 'legacy');
  assert.equal(submits, 1);
  await assert.rejects(() => executeWithOptionalPreSubmitGuard(evidence, async () => { throw Object.assign(new Error('blocked'), { code: 'VISUAL_MIGRATION_CORRECTIVE_PRE_SUBMIT_FAILED' }); }, async () => { submits += 1; return 'forbidden'; }), { code: 'VISUAL_MIGRATION_CORRECTIVE_PRE_SUBMIT_FAILED' });
  assert.equal(submits, 1);
});

async function fixture() {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'vm6-retry-')); const projectId = crypto.randomUUID();
  const root = path.join(dataPath, 'projects', `p-${projectId.slice(0, 8)}`); await fs.mkdir(root, { recursive: true }); await fs.writeFile(path.join(root, 'project.json'), JSON.stringify({ id: projectId }));
  const store = createRunStore(dataPath, projectId); const now = '2026-09-03T00:00:00Z';
  await store.saveRun({ schemaVersion: '3.0', runId: 'parent', projectId, taskId: 'task-parent', status: 'succeeded', outputType: 'brand_poster', providerId: 'seedream', modelId: 'seedream', region: 'global', createdAt: now, updatedAt: now, gate: { blocked: false, errors: [], warnings: [] }, images: [] } as never);
  await store.writeCompiledPrompt('parent', 'original prompt'); await store.writeTask('parent', { userIntent: { normalized: 'keep headline' } });
  return { dataPath, projectId, store, now };
}

function snapshot(runId: string, child = false) { return { snapshotId: `vmges-${(child ? '2' : '1').repeat(32)}`, snapshotFingerprint: fp(child ? '4' : '1'), reproducibilityFingerprint: fp(child ? '5' : '2'), projectId: 'p', runId, authority: { canon: { canonId: 'vmc-' + '1'.repeat(32), canonFingerprint: fp('c') }, policy: { policyId: 'policy' }, referencePack: { referencePackId: 'pack' } }, capability: { capabilityFingerprint: fp('3'), registryModelId: 'seedream', provider: 'volcengine', protocol: 'volcengine-seedream' }, referenceDecision: { selectedCandidateIds: ['identity', 'style'], materializedReferences: [{ candidateId: 'identity', sourceKind: 'project_asset', sourceId: 'asset-1', sha256: 'a'.repeat(64) }, { candidateId: 'style', sourceKind: 'visual_migration_reference_pack', sourceId: 'ref-1', sha256: 'b'.repeat(64) }] }, providerEnvelope: { evidenceSha256s: ['a'.repeat(64), 'b'.repeat(64)] }, artifacts: { compiledPrompt: { filename: 'compiled-prompt.md' }, task: { filename: 'task.json' } } }; }

test('VM-6 corrective retry preserves authority/reference set and persists child bindings before Provider', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.dataPath, { recursive: true, force: true })); let providerCalls = 0; const parent = snapshot('parent');
  const generationEvidence = { getGenerationEvidenceSnapshot: async ({ runId }: any) => runId === 'parent' ? parent : snapshot(runId, true), prepareAndPersist: async (input: any) => { const refs = [{ candidateId: 'identity', sha256: 'a'.repeat(64) }, { candidateId: 'style', sha256: 'b'.repeat(64) }]; await input.buildProviderRequest({ references: refs }); return { snapshot: snapshot('child', true) }; } };
  const imageGeneration = { retryWithPreSubmitGuard: async (options: any, guard: any) => { assert.match(options.editedPrompt, /original prompt[\s\S]*CORRECTIVE OVERLAY/u); const run = { ...(await f.store.readRun('parent')), runId: 'child', taskId: 'task-child', parentRunId: 'parent', images: [], status: 'ready' }; await f.store.saveRun(run as never); await f.store.writeTask('child', { references: [] }); await f.store.writeSnapshot('child', {}); await f.store.writeCompiledPrompt('child', options.editedPrompt); await f.store.writePromptSourceMap('child', {}); await guard({ run, protocol: 'volcengine-seedream', providerRequest: { body: 'raw' }, redactedProviderRequest: { body: 'safe' }, references: [{ assetId: 'asset-1', role: 'identity', sha256: 'a'.repeat(64) }, { assetId: 'ref-1', role: 'style', sha256: 'b'.repeat(64) }] }); providerCalls += 1; return { ...run, status: 'succeeded' }; } };
  const service = createVisualMigrationCorrectiveRetryService({ imageGeneration: imageGeneration as never,
    audits: { get: async () => ({ runId: 'parent', generationEvidence: { snapshotFingerprint: fp('1') }, decision: { disposition: 'corrective_retry_required', retryEligibility: true, failureClasses: ['PALETTE_DRIFT'] } }) } as never,
    generationEvidence: generationEvidence as never, visualMigrationCanons: { resolve: async () => ({ canon: canon() }) } as never, runStoreResolver: () => f.store, now: () => f.now });
  const result = await service.execute({ projectId: f.projectId, sourceRunId: 'parent', sourceAuditId: 'vma-' + '1'.repeat(32) });
  assert.equal(providerCalls, 1); assert.equal(result.run.status, 'succeeded');
  const child = await f.store.readRun('child'); assert.equal(child?.automaticCorrectiveRetryDepth, 1); assert.equal(child?.sourceAuditId, 'vma-' + '1'.repeat(32)); assert.equal(child?.correctionPlanId, result.plan.correctionPlanId);
  assert.equal((await f.store.readRun('parent'))?.automaticCorrectiveRetryDepth, undefined);
  assert.ok(await f.store.readVisualMigrationCorrectionPlan('parent', result.plan.correctionPlanId));
});

test('VM-6 corrective fail-closed scenarios make zero Provider calls and depth 1 blocks a second retry', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  await f.store.saveRun({ ...(await f.store.readRun('parent'))!, automaticCorrectiveRetryDepth: 1 } as never);
  const service = createVisualMigrationCorrectiveRetryService({ imageGeneration: {} as never, audits: { get: async () => ({ runId: 'parent', generationEvidence: { snapshotFingerprint: fp('1') }, decision: { disposition: 'corrective_retry_required', retryEligibility: true, failureClasses: ['PALETTE_DRIFT'] } }) } as never, generationEvidence: { getGenerationEvidenceSnapshot: async () => snapshot('parent') } as never, visualMigrationCanons: { resolve: async () => ({ canon: canon() }) } as never, runStoreResolver: () => f.store });
  await assert.rejects(() => service.execute({ projectId: f.projectId, sourceRunId: 'parent', sourceAuditId: 'vma-' + '1'.repeat(32) }), { code: 'VISUAL_MIGRATION_CORRECTIVE_RETRY_LIMIT_REACHED' });
});

test('VM-6 reference, capability, and authority drift all block before Provider', async () => {
  for (const scenario of ['reference', 'capability', 'authority'] as const) {
    const f = await fixture(); let providerCalls = 0; const parent = snapshot('parent');
    const generationEvidence = { getGenerationEvidenceSnapshot: async () => parent, prepareAndPersist: async (input: any) => {
      await input.buildProviderRequest({ references: [{ candidateId: 'identity', sha256: 'a'.repeat(64) }, { candidateId: 'style', sha256: 'b'.repeat(64) }] });
      const child: any = snapshot('child', true);
      if (scenario === 'capability') child.capability.capabilityFingerprint = fp('9');
      if (scenario === 'authority') child.authority.policy.policyId = 'changed';
      return { snapshot: child };
    } };
    const imageGeneration = { retryWithPreSubmitGuard: async (options: any, guard: any) => {
      const run = { ...(await f.store.readRun('parent')), runId: 'child', taskId: 'child-task', parentRunId: 'parent', status: 'ready' }; await f.store.saveRun(run as never);
      await f.store.writeTask('child', {}); await f.store.writeSnapshot('child', {}); await f.store.writeCompiledPrompt('child', options.editedPrompt); await f.store.writePromptSourceMap('child', {});
      const hashes = scenario === 'reference' ? ['a'.repeat(64), '9'.repeat(64)] : ['a'.repeat(64), 'b'.repeat(64)];
      try { await guard({ run, protocol: 'fixture', providerRequest: {}, redactedProviderRequest: {}, references: hashes.map((sha256, index) => ({ assetId: index ? 'ref-1' : 'asset-1', role: index ? 'style' : 'identity', sha256 })) }); providerCalls += 1; }
      catch (error) { return { ...run, status: 'failed', errorCode: (error as any).code }; }
      return { ...run, status: 'succeeded' };
    } };
    const service = createVisualMigrationCorrectiveRetryService({ imageGeneration: imageGeneration as never, audits: { get: async () => ({ runId: 'parent', generationEvidence: { snapshotFingerprint: fp('1') }, decision: { disposition: 'corrective_retry_required', retryEligibility: true, failureClasses: ['PALETTE_DRIFT'] } }) } as never, generationEvidence: generationEvidence as never, visualMigrationCanons: { resolve: async () => ({ canon: canon() }) } as never, runStoreResolver: () => f.store, now: () => f.now });
    const result = await service.execute({ projectId: f.projectId, sourceRunId: 'parent', sourceAuditId: 'vma-' + '1'.repeat(32) });
    assert.equal(providerCalls, 0); assert.equal(result.run.status, 'failed');
    const expected = scenario === 'reference' ? 'VISUAL_MIGRATION_CORRECTIVE_REFERENCE_SET_CHANGED' : scenario === 'capability' ? 'VISUAL_MIGRATION_CORRECTIVE_CAPABILITY_CHANGED' : 'VISUAL_MIGRATION_CORRECTIVE_AUTHORITY_CHANGED';
    assert.equal(result.run.errorCode, expected); await fs.rm(f.dataPath, { recursive: true, force: true });
  }
});
