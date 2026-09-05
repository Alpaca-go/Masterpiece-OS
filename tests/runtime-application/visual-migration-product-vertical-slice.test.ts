import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createCreativeSessionService } from '@masterpiece/runtime-core/application/creative-session-service.ts';
import { createRunStore } from '@masterpiece/runtime-core/application/image-generation/run-store.ts';
import { createVisualMigrationCanonService } from '@masterpiece/runtime-core/application/visual-migration-canon-service.ts';
import { createVisualMigrationAuditService } from '@masterpiece/runtime-core/application/visual-migration-audit-service.ts';
import { createVisualMigrationCorrectiveRetryService } from '@masterpiece/runtime-core/application/visual-migration-corrective-retry-service.ts';
import { createVisualMigrationGenerationEvidenceService } from '@masterpiece/runtime-core/application/visual-migration-generation-evidence-service.ts';
import { createVisualMigrationProductService } from '@masterpiece/runtime-core/application/visual-migration-product-service.ts';
import { createVisualMigrationProductOperations } from '@masterpiece/runtime-core';
import { createVisualMigrationReferenceExecutionService } from '@masterpiece/runtime-core/application/visual-migration-reference-execution-service.ts';
import { createVisualMigrationReferencePackService } from '@masterpiece/runtime-core/application/visual-migration-reference-pack-service.ts';
import { createVisualMigrationReferencePolicyService } from '@masterpiece/runtime-core/application/visual-migration-reference-policy-service.ts';
import { policyFixture } from './visual-migration-reference-policy-fixture.ts';

test('PI-1 headless Product operations run Reference → Canon → Policy → Generation → VM-5 before fixture Provider', async (t) => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'vm-product-slice-'));
  t.after(() => fs.rm(dataPath, { recursive: true, force: true }));
  const projectRoot = path.join(dataPath, 'projects', 'vm-product-project');
  const anchorRoot = path.join(dataPath, 'reference-run');
  await fs.mkdir(path.join(anchorRoot, 'input', 'reference-assets'), { recursive: true });
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'project.json'), JSON.stringify({ id: 'project-1' }));
  for (let index = 1; index <= 4; index += 1) {
    await fs.writeFile(path.join(anchorRoot, 'input', 'reference-assets', `0${index}-reference.png`),
      Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from(`reference-${index}`)]));
  }
  const base = policyFixture();
  const confirmedProfile = { ...base.styleProfile, status: 'confirmed' as const };
  const project = { id: 'project-1', projectName: 'Project', brandName: '当前品牌', industry: '零售',
    description: 'Visual migration', lockedFacts: ['保留当前身份'], assets: [] };
  const projects = { paths: async () => ({ root: projectRoot }), get: async () => project };
  const anchor = {
    getRun: async () => ({ id: 'run-1', projectId: 'project-1', decision: 'approved', status: 'completed',
      referenceAssetNames: ['a.png', 'b.png', 'c.png', 'd.png'] }),
    getCapsule: async () => base.capsule,
    getBrief: async () => '# Authoritative brief evidence',
    runRoot: async () => anchorRoot,
  };
  const sessions = createCreativeSessionService(projects as never);
  await sessions.create('project-1');
  await sessions.setActiveEntity('project-1', 'style_profile', confirmedProfile);
  const session = (await sessions.get('project-1'))!;
  const locks = { list: async () => [], get: async () => null };
  const packs = createVisualMigrationReferencePackService(projects as never, anchor as never);
  const canons = createVisualMigrationCanonService(projects as never, packs);
  const policies = createVisualMigrationReferencePolicyService(projects as never, sessions, canons, locks as never);
  const execution = createVisualMigrationReferenceExecutionService({ projects: projects as never,
    referencePolicies: policies, referencePacks: packs, lockedAssets: locks as never });
  const store = createRunStore(dataPath, 'project-1');
  const generationEvidence = createVisualMigrationGenerationEvidenceService({ visualMigrationCanons: canons,
    referencePacks: packs, referencePolicies: policies, referenceExecution: execution,
    imageGenerationRunStoreResolver: () => store });
  const events: string[] = [];
  let providerCalls = 0;
  const providerReferences = async (references: any[]) => Promise.all(references.map(async (reference: any) => {
    const bytes = await fs.readFile(path.join(projectRoot, reference.projectRelativePath));
    return { assetId: reference.id, role: 'reference_style', sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  }));
  const imageGeneration = {
    getRun: (runId: string) => store.readRun(runId),
    async startCompiledCreativeTask(options: any) {
      const runId = crypto.randomUUID();
      const createdAt = '2026-09-03T00:00:00.000Z';
      let run: any = { schemaVersion: '1.0', runId, projectId: options.projectId, taskId: `igt-${runId}`,
        status: 'ready', outputType: 'concept_image', providerId: 'volcengine', modelId: 'seedream-5.0-pro',
        region: 'beijing', createdAt, updatedAt: createdAt, gate: { blocked: false, errors: [], warnings: [] }, images: [] };
      await store.writeTask(runId, { taskId: run.taskId, projectId: options.projectId, references: options.references });
      await store.writeSnapshot(runId, options.snapshot);
      await store.writeCompiledPrompt(runId, options.compiledPrompt);
      await store.writePromptSourceMap(runId, options.sourceMap);
      await store.saveRun(run);
      const references = await providerReferences(options.references);
      await options.beforeProviderSubmit({ run: { ...run, status: 'submitting' }, protocol: 'seedream-image',
        providerRequest: { runtimeSecret: 'not-persisted' }, redactedProviderRequest: { adapterId: 'seedream-5.0-pro', referenceCount: references.length }, references });
      assert.ok(await store.readGenerationEvidenceSnapshot(runId));
      events.push('vm5-validated');
      providerCalls += 1;
      events.push('provider-called');
      run = { ...run, status: 'succeeded', updatedAt: '2026-09-03T00:01:00.000Z', completedAt: '2026-09-03T00:01:00.000Z' };
      await store.saveRun(run);
      return run;
    },
    async retryWithPreSubmitGuard(options: any, beforeProviderSubmit: any) {
      const parent = (await store.readRun(options.runId))!;
      const parentTask = JSON.parse((await store.readRunArtifact(options.runId, 'task.json'))!.toString('utf8'));
      const runId = crypto.randomUUID();
      const createdAt = '2026-09-03T00:02:00.000Z';
      let run: any = { ...parent, runId, taskId: `igt-${runId}`, parentRunId: parent.runId,
        retryMode: 'edited_prompt', status: 'ready', providerTaskId: undefined, providerRequestId: undefined,
        createdAt, updatedAt: createdAt, completedAt: undefined, images: [] };
      await store.writeTask(runId, { ...parentTask, taskId: run.taskId, runId, compiledPrompt: options.editedPrompt });
      await store.writeSnapshot(runId, { source: 'corrective-child' });
      await store.writeCompiledPrompt(runId, options.editedPrompt);
      await store.writePromptSourceMap(runId, { sourceRunId: parent.runId });
      await store.saveRun(run);
      const references = await providerReferences(parentTask.references);
      await beforeProviderSubmit({ run: { ...run, status: 'submitting' }, protocol: 'seedream-image',
        providerRequest: { runtimeSecret: 'not-persisted' }, redactedProviderRequest: { adapterId: 'seedream-5.0-pro', referenceCount: references.length }, references });
      assert.ok(await store.readGenerationEvidenceSnapshot(runId));
      events.push('child-vm5-validated');
      providerCalls += 1;
      events.push('child-provider-called');
      run = { ...run, status: 'succeeded', automaticCorrectiveRetryDepth: 1,
        updatedAt: '2026-09-03T00:03:00.000Z', completedAt: '2026-09-03T00:03:00.000Z' };
      await store.saveRun(run);
      return run;
    },
  };
  const auditResults: Array<'pass' | 'palette' | 'pass'> = ['pass', 'palette', 'pass'];
  let auditModelCalls = 0;
  const audits = createVisualMigrationAuditService({
    evidenceResolver: { resolve: async ({ runId }: { runId: string }) => {
      const snapshot = await generationEvidence.getGenerationEvidenceSnapshot({ projectId: 'project-1', runId, verifyArtifacts: true });
      return { snapshot, canon: (await canons.resolve('project-1', snapshot.authority.canon.canonId)).canon,
        output: { candidateId: 'fixture-output', mimeType: 'image/png', sha256: 'f'.repeat(64), byteSize: 8 },
        source: [], reference: [], selected: [], exactCopyDetected: false } as never;
    } } as never,
    observer: {
      resolveAuditor: async () => ({ profileId: 'audit', provider: 'fixture', model: 'audit-model' }),
      observe: async () => {
        auditModelCalls += 2;
        const outcome = auditResults.shift() ?? 'pass';
        return { source: { identityPreservation: 'matched', lockedAssetIntegrity: 'pass', contentHierarchy: 'matched',
          structurePreservation: 'matched', foreignIdentityVisible: 'none', visibleFindings: [] },
        reference: { colorSystem: outcome === 'palette' ? 'major_drift' : 'matched', layoutAndTypography: 'matched',
          graphicLanguage: 'matched', materialAndPhotography: 'matched', extensionMechanism: 'matched',
          referenceIdentityLeakage: 'none', nearCopyRisk: 'low', referenceConflict: 'none', visibleFindings: [] },
        provider: 'fixture', model: 'audit-model', sourceObservationRunId: `source-${auditModelCalls}`,
        referenceObservationRunId: `reference-${auditModelCalls}`,
        sourcePromptVersion: 'visual-migration-source-audit@1.0.0',
        referencePromptVersion: 'visual-migration-reference-audit@1.0.0', modelCallCount: 2 } as never;
      },
    } as never,
    runStoreResolver: () => store,
  });
  const correctiveRetry = createVisualMigrationCorrectiveRetryService({ imageGeneration: imageGeneration as never,
    audits, generationEvidence, visualMigrationCanons: canons, runStoreResolver: () => store });
  const product = createVisualMigrationProductService({ projects: projects as never, creativeSessions: sessions,
    referenceAnchor: anchor as never, styleProfiles: { getActive: async () => confirmedProfile } as never,
    lockedAssets: locks as never, referencePacks: packs, canons, policies, referenceExecution: execution,
    generationEvidence, audits, correctiveRetry, imageGeneration: imageGeneration as never,
    runStoreResolver: () => store,
    readCredentials: async () => ({ model: 'seedream-5.0-pro', provider: 'volcengine', protocol: 'seedream-image' }),
  });

  const operations = createVisualMigrationProductOperations({ service: product });
  const prepared = await operations['visual-migration-product:prepare-reference'](null,
    { projectId: 'project-1', creativeSessionId: session.id, referenceAnchorRunId: 'run-1' });
  assert.equal(prepared.status, 'task_required');
  const taskReady = await operations['visual-migration-product:prepare-task'](null, { projectId: 'project-1', creativeSessionId: session.id,
    taskKind: 'brand_hero', userIntent: 'Create the new brand hero.', requiresCurrentProjectIdentity: false });
  assert.equal(taskReady.status, 'task_ready');
  const generated = await operations['visual-migration-product:start-generation'](null, { projectId: 'project-1', creativeSessionId: session.id,
    policyId: taskReady.task!.policyId! });
  assert.equal(generated.status, 'audit_required');
  assert.equal(providerCalls, 1);
  assert.deepEqual(events, ['vm5-validated', 'provider-called']);
  const snapshot = await generationEvidence.getGenerationEvidenceSnapshot({ projectId: 'project-1',
    runId: generated.generation!.runId, verifyArtifacts: true });
  assert.deepEqual(snapshot.referenceDecision.selectedCandidateIds, snapshot.providerEnvelope.candidateIds);
  const passed = await operations['visual-migration-product:audit-generation'](null,
    { projectId: 'project-1', runId: generated.generation!.runId, auditProfileId: 'audit' });
  assert.equal(passed.status, 'passed');

  const retryParent = await operations['visual-migration-product:start-generation'](null,
    { projectId: 'project-1', creativeSessionId: session.id, policyId: taskReady.task!.policyId! });
  const retryAvailable = await operations['visual-migration-product:audit-generation'](null,
    { projectId: 'project-1', runId: retryParent.generation!.runId, auditProfileId: 'audit' });
  assert.equal(retryAvailable.status, 'retry_available');
  assert.deepEqual(retryAvailable.audit!.failureClasses, ['PALETTE_DRIFT']);
  const corrected = await operations['visual-migration-product:execute-correction'](null,
    { projectId: 'project-1', runId: retryParent.generation!.runId, auditId: retryAvailable.audit!.auditId });
  assert.equal(corrected.generation!.parentRunId, retryParent.generation!.runId);
  assert.equal(corrected.audit!.retryAvailable, false);
  const childPassed = await operations['visual-migration-product:audit-generation'](null,
    { projectId: 'project-1', runId: corrected.generation!.runId, auditProfileId: 'audit' });
  assert.equal(childPassed.status, 'passed');
  assert.equal(providerCalls, 3);
  assert.equal(auditModelCalls, 6);
  await assert.rejects(() => operations['visual-migration-product:execute-correction'](null,
    { projectId: 'project-1', runId: corrected.generation!.runId, auditId: childPassed.audit!.auditId }),
  /unavailable/i);

  const restarted = createVisualMigrationProductService({ projects: projects as never, creativeSessions: sessions,
    referenceAnchor: anchor as never, styleProfiles: { getActive: async () => confirmedProfile } as never,
    lockedAssets: locks as never, referencePacks: packs, canons, policies, referenceExecution: execution,
    generationEvidence, audits, correctiveRetry, imageGeneration: imageGeneration as never,
    runStoreResolver: () => store,
    readCredentials: async () => ({ model: 'seedream-5.0-pro', provider: 'volcengine', protocol: 'seedream-image' }),
  });
  assert.equal((await restarted.getState({ projectId: 'project-1', creativeSessionId: session.id,
    runId: generated.generation!.runId })).status, 'passed');
});
