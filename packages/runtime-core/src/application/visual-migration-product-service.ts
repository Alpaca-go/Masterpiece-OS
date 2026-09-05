import path from 'node:path';
import type { ImageGenerationRun } from '../shared/types.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { ImageGenerationService, ImageGenerationPreSubmitEvidence } from './image-generation/service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { ProjectStore } from './project-store.ts';
import type { ReferenceAnchorService } from './reference-anchor-service.ts';
import type { StyleProfileService } from './style-profile-service.ts';
import type { VisualMigrationAuditService } from './visual-migration-audit-service.ts';
import type { VisualMigrationCanonService } from './visual-migration-canon-service.ts';
import type { VisualMigrationCorrectiveRetryService } from './visual-migration-corrective-retry-service.ts';
import type { VisualMigrationGenerationEvidenceService } from './visual-migration-generation-evidence-service.ts';
import type { VisualMigrationReferenceExecutionService } from './visual-migration-reference-execution-service.ts';
import type { VisualMigrationReferencePackService } from './visual-migration-reference-pack-service.ts';
import type { VisualMigrationReferencePolicyService } from './visual-migration-reference-policy-service.ts';
import type { RunStore } from './image-generation/run-store.ts';
import { canonicalSerializeVisualMigrationValue, sha256Fingerprint } from './visual-migration-reference-pack-contract.ts';
import { buildVisualMigrationProductCandidateDeclarations } from './visual-migration-product-candidate-builder.ts';
import {
  VISUAL_MIGRATION_PRODUCT_SCHEMA, safeVisualMigrationProductDto, visualMigrationProductError,
  type PrepareVisualMigrationTaskInput, type VisualMigrationProductStateV1,
} from './visual-migration-product-contract.ts';
import { compileVisualMigrationProductPrompt, VISUAL_MIGRATION_PRODUCT_PROMPT_COMPILER_VERSION } from './visual-migration-product-prompt-compiler.ts';

interface Dependencies {
  projects: ProjectStore;
  creativeSessions: CreativeSessionService;
  referenceAnchor: ReferenceAnchorService;
  styleProfiles: StyleProfileService;
  lockedAssets: LockedAssetsService;
  referencePacks: VisualMigrationReferencePackService;
  canons: VisualMigrationCanonService;
  policies: VisualMigrationReferencePolicyService;
  referenceExecution: VisualMigrationReferenceExecutionService;
  generationEvidence: VisualMigrationGenerationEvidenceService;
  audits: VisualMigrationAuditService;
  correctiveRetry: VisualMigrationCorrectiveRetryService;
  imageGeneration: ImageGenerationService;
  runStoreResolver: (projectId: string) => RunStore;
  readCredentials: (profileId?: string) => Promise<{ model?: string; protocol?: string; provider?: string }>;
  now?: () => string;
}

const ENABLED_TASKS = new Set(['brand_hero', 'vi_extension', 'poster_signage']);
const TASK_KIND_MAP = { brand_hero: 'brand_hero', vi_extension: 'vi_application', poster_signage: 'poster_graphic' } as const;
const EXECUTING = new Set(['pending', 'preparing', 'ready', 'submitting', 'running', 'polling', 'downloading']);
const FAILED = new Set(['failed', 'blocked', 'cancelled']);

function text(value: unknown, code: string, field: string): string {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result) throw visualMigrationProductError(code, `${field} is required.`);
  return result;
}

export function createVisualMigrationProductService(deps: Dependencies) {
  const now = deps.now ?? (() => new Date().toISOString());

  async function sessionFor(projectId: string, creativeSessionId?: string) {
    await deps.projects.get(projectId).catch((cause) => {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_PROJECT_REQUIRED', 'Project is unavailable.', cause);
    });
    const session = await deps.creativeSessions.get(projectId);
    if (!session) throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_SESSION_REQUIRED', 'Creative Session is required.');
    if (creativeSessionId && (session.id !== creativeSessionId || session.projectId !== projectId || session.status !== 'active')) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_SESSION_INVALID', 'Creative Session binding is invalid.');
    }
    return session;
  }

  function auditProjection(audit: Awaited<ReturnType<VisualMigrationAuditService['audit']>>) {
    const visibleFindings = [
      ...audit.observations.source.visibleFindings.map((item) => ({ side: 'source' as const, ...item })),
      ...audit.observations.reference.visibleFindings.map((item) => ({ side: 'reference' as const, ...item })),
    ];
    return {
      auditId: audit.auditId,
      disposition: audit.decision.disposition,
      failureClasses: [...audit.decision.failureClasses],
      warnings: audit.decision.severity === 'warning' ? [...audit.decision.failureClasses] : [],
      visibleFindings,
      retryAvailable: audit.decision.retryEligibility,
    };
  }

  async function getState(input: { projectId: string; creativeSessionId?: string; runId?: string }): Promise<VisualMigrationProductStateV1> {
    const projectId = text(input?.projectId, 'VISUAL_MIGRATION_PRODUCT_PROJECT_REQUIRED', 'projectId');
    const session = await sessionFor(projectId, input.creativeSessionId);
    const state: VisualMigrationProductStateV1 = {
      schemaVersion: VISUAL_MIGRATION_PRODUCT_SCHEMA, projectId, creativeSessionId: session.id,
      status: 'reference_required', updatedAt: session.updatedAt,
    };
    if (session.sourceReferenceAnchorRunId) {
      state.reference = {
        referenceAnchorRunId: session.sourceReferenceAnchorRunId,
        ...(session.referencePackId ? { referencePackId: session.referencePackId } : {}),
        ...(session.referencePackSourceFingerprint ? { referencePackFingerprint: session.referencePackSourceFingerprint } : {}),
      };
      state.status = session.referencePackId ? 'core_prepared' : 'reference_ready';
    }
    if (session.visualMigrationCanonId && session.visualMigrationCanonFingerprint) {
      state.canon = { canonId: session.visualMigrationCanonId, canonFingerprint: session.visualMigrationCanonFingerprint };
      state.status = 'task_required';
    }
    const task = session.visualMigrationProductTask;
    if (task) {
      state.task = { taskId: task.taskId, taskKind: task.taskKind, policyId: task.policyId, policyFingerprint: task.policyFingerprint };
      state.status = 'task_ready';
    }
    const runId = input.runId || (task ? session.generationRunIds.at(-1) : undefined);
    if (runId) {
      const run = await deps.imageGeneration.getRun(runId, projectId);
      if (run?.projectId === projectId
        && (!run.visualMigrationCreativeSessionId || run.visualMigrationCreativeSessionId === session.id)
        && (!task || !run.visualMigrationPolicyId || run.visualMigrationPolicyId === task.policyId)) {
        state.generation = { runId: run.runId, status: run.status, imageIds: run.images.map((image) => image.imageId), ...(run.parentRunId ? { parentRunId: run.parentRunId } : {}) };
        state.updatedAt = run.updatedAt;
        if (EXECUTING.has(run.status)) state.status = 'generating';
        else if (FAILED.has(run.status)) state.status = 'generation_failed';
        else if (run.visualMigrationAuditSummary) {
          state.audit = { ...run.visualMigrationAuditSummary };
          state.status = run.visualMigrationAuditSummary.disposition === 'pass' ? 'passed'
            : run.visualMigrationAuditSummary.disposition === 'pass_with_warnings' ? 'passed_with_warnings'
              : run.visualMigrationAuditSummary.disposition === 'corrective_retry_required' ? 'retry_available'
                : run.visualMigrationAuditSummary.disposition === 'reference_conflict_blocked' ? 'reference_conflict'
                  : 'manual_review_required';
        } else if (run.status === 'succeeded') state.status = 'audit_required';
        else state.status = 'audit_unavailable';
      }
    }
    return safeVisualMigrationProductDto(state);
  }

  async function prepareReference(input: { projectId: string; creativeSessionId: string; referenceAnchorRunId: string }) {
    const projectId = text(input?.projectId, 'VISUAL_MIGRATION_PRODUCT_PROJECT_REQUIRED', 'projectId');
    const session = await sessionFor(projectId, text(input?.creativeSessionId, 'VISUAL_MIGRATION_PRODUCT_SESSION_REQUIRED', 'creativeSessionId'));
    const anchorRunId = text(input?.referenceAnchorRunId, 'VISUAL_MIGRATION_PRODUCT_REFERENCE_NOT_APPROVED', 'referenceAnchorRunId');
    const run = await deps.referenceAnchor.getRun(anchorRunId).catch((cause) => {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_REFERENCE_NOT_APPROVED', 'Reference Anchor is unavailable.', cause);
    });
    if (run.projectId !== projectId || run.decision !== 'approved' || ['failed', 'rejected', 'cancelled'].includes(run.status)) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_REFERENCE_NOT_APPROVED', 'Reference Anchor must be approved for this project.');
    }
    const [capsule, profile, locks] = await Promise.all([
      deps.referenceAnchor.getCapsule(anchorRunId), deps.styleProfiles.getActive(projectId), deps.lockedAssets.list(projectId),
    ]);
    if (!profile || profile.status !== 'confirmed' || session.activeStyleProfileId !== profile.id) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_STYLE_PROFILE_REQUIRED', 'The session authoritative confirmed Style Profile is required.');
    }
    const pack = await deps.referencePacks.createOrGet(projectId, anchorRunId);
    await deps.creativeSessions.setVisualMigrationReference(projectId, {
      referencePackId: pack.manifest.referencePackId, sourceReferenceAnchorRunId: anchorRunId,
      sourceFingerprint: pack.manifest.sourceFingerprint,
    });
    const canon = await deps.canons.createOrGet({ projectId, referenceAnchorRunId: anchorRunId,
      referencePackId: pack.manifest.referencePackId, capsule, styleProfile: profile, lockedAssets: locks });
    await deps.creativeSessions.setVisualMigrationCanon(projectId, { canonId: canon.canon.canonId,
      canonFingerprint: canon.canon.canonFingerprint, sourceFingerprint: canon.canon.sourceFingerprint,
      referencePackId: pack.manifest.referencePackId });
    return getState({ projectId, creativeSessionId: session.id });
  }

  async function prepareTask(input: PrepareVisualMigrationTaskInput) {
    const projectId = text(input?.projectId, 'VISUAL_MIGRATION_PRODUCT_PROJECT_REQUIRED', 'projectId');
    const session = await sessionFor(projectId, text(input?.creativeSessionId, 'VISUAL_MIGRATION_PRODUCT_SESSION_REQUIRED', 'creativeSessionId'));
    if (!ENABLED_TASKS.has(input.taskKind)) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_TASK_KIND_NOT_ENABLED', `Task kind ${String(input.taskKind)} is not enabled in PI-1.`);
    }
    const userIntent = text(input.userIntent, 'VISUAL_MIGRATION_PRODUCT_GENERATION_NOT_READY', 'userIntent');
    if (!session.visualMigrationCanonId || !session.referencePackId) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_CANON_REQUIRED', 'Prepare the Reference Pack and Canon first.');
    }
    const locks = await deps.lockedAssets.list(projectId);
    const declarations = buildVisualMigrationProductCandidateDeclarations(locks);
    const structureRequirement = input.structureRequirement ?? 'none';
    const explicitStructureCandidateIds = structureRequirement === 'required'
      ? declarations.filter((item) => item.role === 'structure_reference').map((item) => item.candidateId) : [];
    if (structureRequirement === 'required' && !explicitStructureCandidateIds.length) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_GENERATION_NOT_READY', 'Required structure evidence is unavailable.');
    }
    const result = await deps.policies.createOrGet({ projectId, task: {
      schemaVersion: 'visual-migration-reference-task/v1', projectId,
      taskKind: TASK_KIND_MAP[input.taskKind as keyof typeof TASK_KIND_MAP], preset: 'visual_transfer',
      identityEvidence: input.requiresCurrentProjectIdentity === false ? 'semantic_only' : 'required_if_available',
      structureEvidence: structureRequirement === 'required' ? 'required_if_explicit' : 'not_required',
      explicitStructureCandidateIds, taskReferenceIds: [],
    }, candidateDeclarations: declarations });
    const taskId = `vmpt-${sha256Fingerprint(canonicalSerializeVisualMigrationValue({
      projectId, taskKind: input.taskKind, userIntent, structureRequirement,
      requiresCurrentProjectIdentity: input.requiresCurrentProjectIdentity !== false, policyId: result.policy.policyId,
    })).slice('sha256:'.length, 'sha256:'.length + 32)}`;
    await deps.creativeSessions.setVisualMigrationProductTask(projectId, {
      taskId, taskKind: input.taskKind as 'brand_hero' | 'vi_extension' | 'poster_signage', userIntent,
      structureRequirement, requiresCurrentProjectIdentity: input.requiresCurrentProjectIdentity !== false,
      policyId: result.policy.policyId, policyFingerprint: result.policy.policyFingerprint,
    });
    return getState({ projectId, creativeSessionId: session.id });
  }

  async function startGeneration(input: { projectId: string; creativeSessionId: string; policyId: string; apiProfileId?: string }) {
    const projectId = text(input?.projectId, 'VISUAL_MIGRATION_PRODUCT_PROJECT_REQUIRED', 'projectId');
    const session = await sessionFor(projectId, text(input?.creativeSessionId, 'VISUAL_MIGRATION_PRODUCT_SESSION_REQUIRED', 'creativeSessionId'));
    const task = session.visualMigrationProductTask;
    if (!task || task.policyId !== input.policyId || !session.visualMigrationCanonId) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_POLICY_REQUIRED', 'Active Product Task/Policy binding is required.');
    }
    const policy = await deps.policies.resolve(projectId, task.policyId);
    if (policy.policyFingerprint !== task.policyFingerprint || policy.canon.canonId !== session.visualMigrationCanonId) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_GENERATION_NOT_READY', 'Product authority binding changed.');
    }
    const credentials = await deps.readCredentials(input.apiProfileId);
    const registryModelId = text(credentials.model, 'VISUAL_MIGRATION_PRODUCT_GENERATION_NOT_READY', 'image profile model');
    const execution = await deps.referenceExecution.prepare({ projectId, policyId: policy.policyId,
      registryModelId, provider: credentials.provider, protocol: credentials.protocol, locators: { taskReferences: {} } });
    const canon = (await deps.canons.resolve(projectId, policy.canon.canonId)).canon;
    const compiled = compileVisualMigrationProductPrompt({ task: { projectId, creativeSessionId: session.id,
      taskKind: task.taskKind, userIntent: task.userIntent, structureRequirement: task.structureRequirement,
      requiresCurrentProjectIdentity: task.requiresCurrentProjectIdentity }, taskId: task.taskId, policyId: policy.policyId, canon });
    const projectRoot = (await deps.projects.paths(projectId)).root;
    const references = execution.references.map((reference) => ({
      id: reference.candidateId,
      role: reference.role === 'identity_reference' ? 'identity_reference' as const
        : reference.role === 'structure_reference' ? 'structure_reference' as const : 'core_reference' as const,
      projectRelativePath: path.relative(projectRoot, reference.runtimeLocator.absolutePath),
    }));
    const beforeProviderSubmit = async (evidence: ImageGenerationPreSubmitEvidence) => {
      const expected = execution.references.map((item) => item.sha256);
      const actual = evidence.references.map((item) => item.sha256);
      if (expected.length !== actual.length || expected.some((hash, index) => hash !== actual[index])) {
        throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_GENERATION_FAILED', 'Provider reference evidence differs from VM-4 allocation.');
      }
      await deps.runStoreResolver(projectId).saveRun({ ...evidence.run,
        visualMigrationCreativeSessionId: session.id, visualMigrationPolicyId: policy.policyId,
        visualMigrationCanonId: canon.canonId });
      await deps.generationEvidence.prepareAndPersist({ projectId, runId: evidence.run.runId,
        policyId: policy.policyId, registryModelId, provider: credentials.provider, protocol: credentials.protocol,
        taskReferenceLocators: {}, buildProviderRequest: ({ references: vmReferences }) => {
          const ids = vmReferences.map((item) => String(item.candidateId));
          if (ids.some((id, index) => id !== execution.allocation.selectedCandidateIds[index])) {
            throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_GENERATION_FAILED', 'VM-5 candidate order differs from VM-3/VM-4.');
          }
          return { providerRequest: evidence.providerRequest, redactedProviderRequest: evidence.redactedProviderRequest };
        } });
    };
    const run = await deps.imageGeneration.startCompiledCreativeTask({ projectId, compiledPrompt: compiled.markdown,
      promptVersion: VISUAL_MIGRATION_PRODUCT_PROMPT_COMPILER_VERSION,
      snapshot: { schemaVersion: VISUAL_MIGRATION_PRODUCT_SCHEMA, taskId: task.taskId, policyId: policy.policyId,
        canonId: canon.canonId, capturedAt: now() }, sourceMap: compiled.sourceMap, references,
      event: 'VISUAL_MIGRATION_PRODUCT_RUN_CREATED', apiProfileId: input.apiProfileId,
      maxReferences: execution.references.length, beforeProviderSubmit });
    const boundRun: ImageGenerationRun = { ...run, visualMigrationCreativeSessionId: session.id,
      visualMigrationPolicyId: policy.policyId, visualMigrationCanonId: canon.canonId };
    await deps.runStoreResolver(projectId).saveRun(boundRun);
    await deps.creativeSessions.appendMessage(projectId, { role: 'assistant', type: 'generation_result',
      content: `Visual Migration generation ${boundRun.runId} created.`, generationRunId: boundRun.runId });
    return getState({ projectId, creativeSessionId: session.id, runId: boundRun.runId });
  }

  async function auditGeneration(input: { projectId: string; runId: string; auditProfileId?: string }) {
    const projectId = text(input?.projectId, 'VISUAL_MIGRATION_PRODUCT_PROJECT_REQUIRED', 'projectId');
    const runId = text(input?.runId, 'VISUAL_MIGRATION_PRODUCT_AUDIT_NOT_READY', 'runId');
    const session = await sessionFor(projectId);
    const run = await deps.imageGeneration.getRun(runId, projectId);
    if (!run || run.status !== 'succeeded' || run.visualMigrationCreativeSessionId !== session.id) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_AUDIT_NOT_READY', 'A succeeded Product generation run is required.');
    }
    const audit = await deps.audits.audit(input);
    const summary = auditProjection(audit);
    await deps.runStoreResolver(projectId).saveRun({ ...run, visualMigrationAuditSummary: summary, updatedAt: now() });
    return getState({ projectId, creativeSessionId: session.id, runId });
  }

  async function executeCorrection(input: { projectId: string; runId: string; auditId: string; apiProfileId?: string }) {
    const projectId = text(input?.projectId, 'VISUAL_MIGRATION_PRODUCT_PROJECT_REQUIRED', 'projectId');
    const session = await sessionFor(projectId);
    const sourceRunId = text(input?.runId, 'VISUAL_MIGRATION_PRODUCT_RETRY_NOT_AVAILABLE', 'runId');
    const sourceAuditId = text(input?.auditId, 'VISUAL_MIGRATION_PRODUCT_RETRY_NOT_AVAILABLE', 'auditId');
    const parent = await deps.imageGeneration.getRun(sourceRunId, projectId);
    if (!parent?.visualMigrationAuditSummary?.retryAvailable || parent.visualMigrationAuditSummary.auditId !== sourceAuditId) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_RETRY_NOT_AVAILABLE', 'Corrective retry is unavailable.');
    }
    const result = await deps.correctiveRetry.execute({ projectId, sourceRunId, sourceAuditId, apiProfileId: input.apiProfileId });
    const child = { ...result.run, visualMigrationCreativeSessionId: session.id,
      visualMigrationPolicyId: parent.visualMigrationPolicyId, visualMigrationCanonId: parent.visualMigrationCanonId,
      sourceAuditId, correctionPlanId: result.plan.correctionPlanId, automaticCorrectiveRetryDepth: 1 };
    await deps.runStoreResolver(projectId).saveRun(child);
    await deps.creativeSessions.appendMessage(projectId, { role: 'assistant', type: 'generation_result',
      content: `Visual Migration corrective generation ${child.runId} created.`, generationRunId: child.runId });
    const state = await getState({ projectId, creativeSessionId: session.id, runId: child.runId });
    state.audit = { ...parent.visualMigrationAuditSummary, retryAvailable: false,
      correctionPlanId: result.plan.correctionPlanId, childRunId: child.runId };
    return safeVisualMigrationProductDto(state);
  }

  return { getState, prepareReference, prepareTask, startGeneration, auditGeneration, executeCorrection };
}

export type VisualMigrationProductService = ReturnType<typeof createVisualMigrationProductService>;
