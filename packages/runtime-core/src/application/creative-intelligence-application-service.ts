/**
 * CI-W1A: Creative Intelligence Runtime Application Service.
 *
 * Owns:
 *   - Lifecycle (pending → completed / failed / cancelled)
 *   - Persistence (run record, selection, history, intermediate artifacts)
 *   - Document intake orchestration (reuses DocumentContextService — NO copy of parser)
 *   - Fact confirmation checkpoint (human checkpoint A)
 *   - CI orchestration (CI-2 → CI-9 deterministic pipelines)
 *   - Explicit user selection (human checkpoint B) with persisted revision + history
 *   - Canon + Anchor + Translation continuation after selection
 *   - Progress events
 *   - Resume / cancel / remove
 *
 * Does NOT own:
 *   - Concept / Direction synthesis semantics (CI package)
 *   - Truth / Evidence / Need / Insight / Opportunity semantics (CI package)
 *   - Canon / Anchor / Translation semantics (CI package)
 *   - Any model call (deterministic only — uses DocumentContextService for the
 *     ONE fact-extraction call that already exists)
 *
 * Hard invariants (Spec §14):
 *   - No model call except via the existing DocumentContextService.
 *   - recommendation MUST NEVER create selection.
 *   - selection requires actor='user'.
 *   - blocked Direction cannot be selected.
 *   - selection revision increments on change.
 *   - previousSelectionIds preserved.
 *   - invalidated selection never auto-selects replacement.
 *   - no valid selection → no Canon.
 *   - no valid Canon → no Production Translation.
 *
 * Persistence root: `<defaultDataPath>/creative-intelligence-runs/<runId>/`
 *   - `runtime/run.json` — CreativeIntelligenceRun record
 *   - `runtime/selection.json` — DirectionSelectionState
 *   - `runtime/selection-history.json` — append-only history
 *   - `intermediate/document-visual-context.json` — confirmed DVC
 *   - `intermediate/truth.json` — ProjectTruthModel
 *   - `intermediate/evidence.json` — EvidenceLedgerSnapshot
 *   - `intermediate/need.json` — NeedItem[]
 *   - `intermediate/insight.json` — InsightItem[]
 *   - `intermediate/opportunity.json` — OpportunityMap
 *   - `intermediate/concept-set.json` — ConceptSet
 *   - `intermediate/direction-set.json` — DirectionSet
 *   - `intermediate/evaluation.json` — DirectionEvaluationSet
 *   - `intermediate/snapshot.json` — SelectedDirectionSnapshot
 *   - `intermediate/canon.json` — VisualCanon
 *   - `intermediate/anchor.json` — AnchorContract
 *   - `intermediate/translation-context.json` — ProductionTranslationContext
 *   - `intermediate/space-translation.json` — SpaceTranslationContract
 *   - `intermediate/packaging-translation.json` — PackagingTranslationContract
 *
 * Audit notes (Spec §33):
 *   - Owner: runtime-core
 *   - Reuses defaultDataPath authority (no new data root invented)
 *   - Reuses atomicWriteJsonWithRetry, RunWriteCoordinator, event log
 *   - Cleanup: `remove()` deletes the entire run root
 *   - Resume: scans run root, restores status, re-runs from current stage
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  type DocumentVisualContext,
} from '@masterpiece/creative-intelligence/index.ts';
import {
  type CreativeIntelligenceRun,
  type CreativeIntelligenceRunStatus,
  type CreativeIntelligenceProgress,
  type CreativeIntelligenceProgressStage,
  type StartCreativeIntelligenceInput,
  type CreativeIntelligenceFactReview,
  type CreativeIntelligenceFactItem,
  type CreativeIntelligenceWorkspaceView,
  type SelectDirectionActionInput,
  type PublicSettings,
} from '../application-contracts.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import { RunWriteCoordinator } from './runtime/run-write-coordinator.ts';
import { appendRuntimeEvent } from './runtime/event-log.ts';
import { assertInside } from './analysis-contract.ts';
import {
  countSelectableDirections,
  projectBlockerSummaries,
  CI_APP_DIRECTION_BLOCKED_ALL,
} from './blocker-projection.ts';

// ---------------------------------------------------------------------------
// CI surface import — keep tight; we only import what we need to drive the
// pipeline. The CI package MUST NOT import from this file (verified by guard).
// ---------------------------------------------------------------------------

import {
  adaptProjectRecord,
  adaptDocumentVisualContext,
  assembleProjectTruth,
  runNicePipeline,
  runConceptPipeline,
  runDirectionPipeline,
  buildVisualEvidenceContribution,
  contributionToTruthFacts,
  type ProjectTruthModel,
  evaluateDirections,
  applySelectionAction,
  makeSelectAction,
  createUnselectedState,
  buildSelectedDirectionSnapshot,
  buildVisualCanon,
  buildAnchorContract,
  buildProductionTranslationContext,
  buildSpaceTranslation,
  buildPackagingTranslation,
  validateCrossMediaConsistency,
} from '@masterpiece/creative-intelligence/index.ts';

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const CI_APP_ERROR_CODES = {
  DOCUMENT_REQUIRED: 'CI_APP_DOCUMENT_REQUIRED',
  PROFILE_REQUIRED: 'CI_APP_PROFILE_REQUIRED',
  FACT_CONFIRMATION_REQUIRED: 'CI_APP_FACT_CONFIRMATION_REQUIRED',
  TRUTH_BUILD_FAILED: 'CI_APP_TRUTH_BUILD_FAILED',
  CONCEPT_BLOCKED_ALL: 'CI_APP_CONCEPT_BLOCKED_ALL',
  DIRECTION_BLOCKED_ALL: 'CI_APP_DIRECTION_BLOCKED_ALL',
  SELECTION_REQUIRED: 'CI_APP_SELECTION_REQUIRED',
  SELECTION_INVALID: 'CI_APP_SELECTION_INVALID',
  CANON_BUILD_FAILED: 'CI_APP_CANON_BUILD_FAILED',
  TRANSLATION_BUILD_FAILED: 'CI_APP_TRANSLATION_BUILD_FAILED',
  RUN_NOT_FOUND: 'CI_APP_RUN_NOT_FOUND',
  RUN_STATE_INVALID: 'CI_APP_RUN_STATE_INVALID',
  WRITE_FAILED: 'CI_APP_WRITE_FAILED',
  CANCELLED: 'CI_APP_CANCELLED',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ciAppError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function safeRunId(runId: string): string {
  if (!/^[a-f0-9-]{36}$/i.test(runId)) throw ciAppError(CI_APP_ERROR_CODES.RUN_NOT_FOUND, `Run ID 无效: ${runId}`);
  return runId;
}

function makeRunId(): string {
  // RFC4122 v4 uuid
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isUserSelectableDirectionStatus(status: string | undefined): boolean {
  return status === 'grounded' || status === 'provisional';
}

function toProgressStage(status: CreativeIntelligenceRunStatus): CreativeIntelligenceProgressStage {
  switch (status) {
    case 'preparing_documents': return 'document_intake';
    case 'extracting_facts': return 'fact_extraction';
    case 'awaiting_fact_confirmation': return 'fact_confirmation';
    case 'building_truth': return 'truth';
    case 'building_understanding': return 'understanding';
    case 'building_concepts': return 'concept';
    case 'building_directions': return 'direction';
    case 'evaluating': return 'evaluation';
    case 'awaiting_direction_selection': return 'selection';
    case 'direction_blocked': return 'selection';
    case 'building_canon': return 'canon';
    case 'building_translation': return 'translation';
    case 'completed': return 'completed';
    case 'failed': return 'failed';
    case 'cancelled': return 'cancelled';
    default: return 'document_intake';
  }
}

// ---------------------------------------------------------------------------
// Fact review
// ---------------------------------------------------------------------------

function buildFactReview(
  runId: string,
  projectId: string | null | undefined,
  documentRunId: string,
  dvc: DocumentVisualContext,
): CreativeIntelligenceFactReview {
  const facts: CreativeIntelligenceFactItem[] = [];
  const byField: Record<string, number> = {};
  const unknownFields: string[] = [];

  if (dvc && typeof dvc === 'object') {
    const candidateFields = [
      'brandName', 'industry', 'brandRole', 'businessModel',
      'targetAudience', 'brandPersonality', 'visualPreferences',
      'pricePositioning', 'products', 'services',
    ];
    for (const field of candidateFields) {
      const value = (dvc as Record<string, unknown>)[field];
      if (value === undefined || value === null) continue;
      facts.push({
        field,
        value,
        authority: 'AUTHORITATIVE_DOCUMENT_FACT',
        evidenceRefs: [],
        userAction: 'confirm',
      });
      byField[field] = 1;
      if (Array.isArray(value) && value.length === 0) {
        unknownFields.push(field);
      }
    }
  }

  return {
    runId,
    projectId: projectId ?? null,
    documentRunId,
    sourceRunId: dvc?.sourceRunId ?? documentRunId,
    context: dvc as Record<string, unknown>,
    evidenceSummary: { total: facts.length, byField },
    unknownFields,
    facts,
    status: 'awaiting_confirmation',
    diagnostics: [],
  };
}

// ---------------------------------------------------------------------------
// Run projection → WorkspaceView
// ---------------------------------------------------------------------------

async function buildWorkspaceView(
  run: CreativeIntelligenceRun,
  runRoot: string,
  documentRunId: string | null | undefined,
  sourceRunId: string | null | undefined,
  blockers: string[],
  warnings: string[],
  diagnostics: string[],
  blockerSummaries?: unknown,
  anchorProduction?: unknown,
): Promise<CreativeIntelligenceWorkspaceView> {
  const readJson = async <T>(name: string): Promise<T | null> => {
    try {
      const raw = await fs.readFile(path.join(runRoot, 'intermediate', name), 'utf8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  const truth = await readJson<Record<string, unknown>>('truth.json');
  const evidence = await readJson<Record<string, unknown>>('evidence.json');
  const needs = await readJson<unknown[]>('need.json');
  const insights = await readJson<unknown[]>('insight.json');
  const opportunityMap = await readJson<Record<string, unknown>>('opportunity.json');
  const conceptSet = await readJson<Record<string, unknown>>('concept-set.json');
  const directionSet = await readJson<Record<string, unknown>>('direction-set.json');
  const evaluation = await readJson<Record<string, unknown>>('evaluation.json');
  const selection = (await readJson<Record<string, unknown>>('selection.json')) ?? null;
  const selectedDirectionSnapshot = await readJson<Record<string, unknown>>('snapshot.json');
  const visualCanon = await readJson<Record<string, unknown>>('canon.json');
  const anchorContract = await readJson<Record<string, unknown>>('anchor.json');
  const translationContext = await readJson<Record<string, unknown>>('translation-context.json');
  const spaceTranslation = await readJson<Record<string, unknown>>('space-translation.json');
  const packagingTranslation = await readJson<Record<string, unknown>>('packaging-translation.json');

  // Recommendation: pulled from evaluation.recommendation if present.
  let recommendation: Record<string, unknown> | null = null;
  if (evaluation) {
    const rec = (evaluation as Record<string, unknown>).recommendation;
    if (rec && typeof rec === 'object') recommendation = rec as Record<string, unknown>;
  }

  return {
    schemaVersion: 'creative-intelligence-workspace-v0.1',
    run,
    documentRunId: documentRunId ?? null,
    sourceRunId: sourceRunId ?? null,
    truth: truth ?? null,
    evidence: evidence ?? null,
    needs: needs ?? [],
    insights: insights ?? [],
    opportunityMap: opportunityMap ?? null,
    conceptSet: conceptSet ?? null,
    directionSet: directionSet ?? null,
    evaluation: evaluation ?? null,
    recommendation,
    selection,
    selectedDirectionSnapshot: selectedDirectionSnapshot ?? null,
    visualCanon: visualCanon ?? null,
    anchorContract: anchorContract ?? null,
    productionTranslation: (translationContext || spaceTranslation || packagingTranslation)
      ? {
          context: translationContext ?? null,
          space: spaceTranslation ?? null,
          packaging: packagingTranslation ?? null,
        }
      : null,
    blockers,
    warnings,
    diagnostics,
    blockerSummaries: Array.isArray(blockerSummaries) ? (blockerSummaries as never) : undefined,
    anchorProduction: anchorProduction ?? null,
  };
}

// ---------------------------------------------------------------------------
// Atomic write helpers
// ---------------------------------------------------------------------------

async function writeJson(file: string, payload: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(file, payload);
  if (!result.success) {
    throw ciAppError(CI_APP_ERROR_CODES.WRITE_FAILED, `写入文件失败: ${path.basename(file)} — ${result.errorMessage}`);
  }
}

async function readJsonFile<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Application Service
// ---------------------------------------------------------------------------

export interface CreateCreativeIntelligenceApplicationServiceInput {
  /** Reads public settings (defaultDataPath, profiles). */
  readSettings(): Promise<PublicSettings>;
  /** Reads decrypted provider credentials for a profile. */
  readCredentials(profileId: string): Promise<{ apiKey: string; model: string; provider: string; baseUrl: string }>;
  /** Resolves profile metadata. */
  resolveProfile(profileId: string): Promise<{ id: string; provider: string; modelId: string } | null>;
  /** Runs document intake. Returns a DocumentVisualContext with a real sourceRunId. */
  runDocumentIntake(input: {
    runId: string;
    paths: string[];
    profileId: string;
  }): Promise<{ documentRunId: string; sourceRunId: string; dvc: DocumentVisualContext }>;
  /**
   * Optional: returns a stable ProjectRecord-like carrier for Truth assembly.
   * If absent, the service builds a minimal synthetic record from the DVC.
   */
  loadProjectRecord?(projectId: string): Promise<Record<string, unknown> | null>;
  /**
   * CI-W1C.5 PART E (optional): returns the parsed
   * `project-visual-context.vnext.json` payload for the project, or null
   * when the project has no ready vnext. When provided, the application
   * service builds a VisualEvidenceContribution and merges its per-item
   * `visualAsset.*` facts into the in-memory ProjectTruthModel used by
   * NICE / Concept / Direction. The visual facts are NOT persisted to
   * the on-disk `truth.json`.
   */
  loadProjectVNext?(projectId: string): Promise<unknown | null>;
  /**
   * CI-W2: Anchor Production sub-run dependencies. The CI service
   * delegates Anchor Production lifecycle to the dedicated
   * orchestrator. When omitted, the CI service still validates
   * state but does NOT actually submit to the image runtime.
   */
  anchorProduction?: import('./anchor-production-service.ts').AnchorProductionService;
  /** Optional logger sink. */
  log?(level: 'info' | 'warn' | 'error', message: string): void;
}

export interface CreativeIntelligenceApplicationService {
  listRuns(): Promise<CreativeIntelligenceRun[]>;
  getRun(runId: string): Promise<CreativeIntelligenceRun>;
  start(input: StartCreativeIntelligenceInput): Promise<CreativeIntelligenceRun>;
  getFactReview(runId: string): Promise<CreativeIntelligenceFactReview>;
  confirmFacts(
    runId: string,
    facts: CreativeIntelligenceFactItem[]
  ): Promise<CreativeIntelligenceRun>;
  getWorkspace(runId: string): Promise<CreativeIntelligenceWorkspaceView>;
  selectDirection(
    runId: string,
    action: SelectDirectionActionInput
  ): Promise<CreativeIntelligenceWorkspaceView>;
  resume(runId: string): Promise<CreativeIntelligenceRun>;
  cancel(runId: string): Promise<boolean>;
  remove(runId: string): Promise<void>;
  onProgress(
    callback: (progress: CreativeIntelligenceProgress) => void
  ): () => void;
  // CI-W2: Anchor Production sub-run surface.
  startAnchorProduction(
    runId: string,
    options: { candidateCount?: number; apiProfileId?: string } | undefined
  ): Promise<CreativeIntelligenceWorkspaceView>;
  compileAnchorProduction(runId: string): Promise<CreativeIntelligenceWorkspaceView>;
  getAnchorProduction(runId: string): Promise<CreativeIntelligenceWorkspaceView>;
  listAnchorCandidates(runId: string): Promise<unknown[]>;
  approveAnchorCandidate(
    runId: string,
    candidateId: string,
    reason: string | undefined
  ): Promise<CreativeIntelligenceWorkspaceView>;
  rejectAnchorCandidate(
    runId: string,
    candidateId: string
  ): Promise<CreativeIntelligenceWorkspaceView>;
  retryAnchorCandidate(
    runId: string,
    candidateId: string | null
  ): Promise<CreativeIntelligenceWorkspaceView>;
  cancelAnchorProduction(runId: string): Promise<CreativeIntelligenceWorkspaceView>;
  getApprovedAnchor(runId: string): Promise<unknown>;
  getAnchorApprovalHistory(runId: string): Promise<unknown[]>;
}

export function createCreativeIntelligenceApplicationService(
  deps: CreateCreativeIntelligenceApplicationServiceInput,
): CreativeIntelligenceApplicationService {
  const writeCoordinator = new RunWriteCoordinator((metrics) => {
    deps.log?.('info', JSON.stringify({
      event: 'CI_APP_WRITE_RESULT',
      run_id: metrics.runId,
      operation: metrics.operation,
      success: metrics.success,
      duration_ms: metrics.durationMs,
    }));
  });

  const progressListeners = new Set<(progress: CreativeIntelligenceProgress) => void>();
  const activeControllers = new Map<string, AbortController>();
  const cancelledRuns = new Set<string>();

  function emitProgress(progress: CreativeIntelligenceProgress) {
    for (const listener of progressListeners) {
      try {
        listener(progress);
      } catch (err) {
        deps.log?.('warn', `progress listener error: ${(err as Error).message}`);
      }
    }
  }

  async function dataRoot(): Promise<string> {
    const settings = await deps.readSettings();
    return path.join(path.resolve(settings.defaultDataPath), 'creative-intelligence-runs');
  }

  async function runRootOf(runId: string): Promise<string> {
    return path.join(await dataRoot(), safeRunId(runId));
  }

  async function runRecordPathOf(runId: string): Promise<string> {
    return path.join(await runRootOf(runId), 'runtime', 'run.json');
  }

  async function listRuns(): Promise<CreativeIntelligenceRun[]> {
    const root = await dataRoot();
    let entries: string[] = [];
    try {
      entries = await fs.readdir(root);
    } catch {
      return [];
    }
    const out: CreativeIntelligenceRun[] = [];
    for (const entry of entries) {
      const runPath = path.join(root, entry, 'runtime', 'run.json');
      const run = await readJsonFile<CreativeIntelligenceRun>(runPath);
      if (run) out.push(run);
    }
    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return out;
  }

  async function getRun(runId: string): Promise<CreativeIntelligenceRun> {
    const file = await runRecordPathOf(runId);
    const run = await readJsonFile<CreativeIntelligenceRun>(file);
    if (!run) throw ciAppError(CI_APP_ERROR_CODES.RUN_NOT_FOUND, `Run 不存在: ${runId}`);
    return run;
  }

  async function persistRun(run: CreativeIntelligenceRun): Promise<void> {
    const file = await runRecordPathOf(run.id);
    await assertInside(await runRootOf(run.id), file);
    await writeCoordinator.enqueue(run.id, 'run-record', async () => {
      await writeJson(file, run);
    });
  }

  async function updateRun(
    runId: string,
    patch: (run: CreativeIntelligenceRun) => CreativeIntelligenceRun,
  ): Promise<CreativeIntelligenceRun> {
    const current = await getRun(runId);
    const next = patch(current);
    await persistRun(next);
    return next;
  }

  async function persistSelection(
    runId: string,
    selection: Record<string, unknown> | null,
  ): Promise<void> {
    const runRoot = await runRootOf(runId);
    await assertInside(runRoot, path.join(runRoot, 'runtime', 'selection.json'));
    await writeCoordinator.enqueue(runId, 'selection', async () => {
      await writeJson(path.join(runRoot, 'runtime', 'selection.json'), selection);
    });
  }

  async function persistSelectionHistory(
    runId: string,
    history: Array<Record<string, unknown>>,
  ): Promise<void> {
    const runRoot = await runRootOf(runId);
    await assertInside(runRoot, path.join(runRoot, 'runtime', 'selection-history.json'));
    await writeCoordinator.enqueue(runId, 'selection-history', async () => {
      await writeJson(path.join(runRoot, 'runtime', 'selection-history.json'), history);
    });
  }

  async function persistIntermediate(
    runId: string,
    fileName: string,
    payload: unknown,
  ): Promise<void> {
    const runRoot = await runRootOf(runId);
    const target = path.join(runRoot, 'intermediate', fileName);
    await assertInside(runRoot, target);
    await writeCoordinator.enqueue(runId, `intermediate:${fileName}`, async () => {
      await writeJson(target, payload);
    });
  }

  async function readSelection(
    runId: string,
  ): Promise<Record<string, unknown> | null> {
    const runRoot = await runRootOf(runId);
    return readJsonFile<Record<string, unknown>>(path.join(runRoot, 'runtime', 'selection.json'));
  }

  async function readSelectionHistory(
    runId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const runRoot = await runRootOf(runId);
    return (
      (await readJsonFile<Array<Record<string, unknown>>>(
        path.join(runRoot, 'runtime', 'selection-history.json'),
      )) ?? []
    );
  }

  async function readIntermediate<T>(runId: string, fileName: string): Promise<T | null> {
    const runRoot = await runRootOf(runId);
    return readJsonFile<T>(path.join(runRoot, 'intermediate', fileName));
  }

  function ensureNotCancelled(runId: string) {
    if (cancelledRuns.has(runId)) {
      throw ciAppError(CI_APP_ERROR_CODES.CANCELLED, `Run 已被取消: ${runId}`);
    }
  }

  // ------------------------ start ------------------------

  async function start(
    input: StartCreativeIntelligenceInput,
  ): Promise<CreativeIntelligenceRun> {
    if (!input.documentPaths || input.documentPaths.length === 0) {
      throw ciAppError(CI_APP_ERROR_CODES.DOCUMENT_REQUIRED, 'documentPaths 不能为空');
    }
    if (!input.apiProfileId) {
      throw ciAppError(CI_APP_ERROR_CODES.PROFILE_REQUIRED, 'apiProfileId 不能为空');
    }
    const profile = await deps.resolveProfile(input.apiProfileId);
    if (!profile) {
      throw ciAppError(CI_APP_ERROR_CODES.PROFILE_REQUIRED, `API Profile 不存在: ${input.apiProfileId}`);
    }

    const runId = makeRunId();
    const now = new Date().toISOString();
    const run: CreativeIntelligenceRun = {
      schemaVersion: 'creative-intelligence-run-v0.1',
      id: runId,
      projectId: input.projectId ?? null,
      projectName: input.projectName ?? (input.projectId ?? `CI-Run-${runId.slice(0, 8)}`),
      status: 'pending',
      documentRunId: null,
      apiProfileId: input.apiProfileId,
      provider: profile.provider,
      model: profile.modelId,
      createdAt: now,
      startedAt: now,
      currentStage: 'document_intake',
      selectionRevision: 0,
      selectedDirectionId: null,
      warnings: [],
      diagnostics: [],
      errorCode: null,
      lastError: null,
      blockerCode: null,
    };
    // Persist before any long-running work so resume can find it.
    const runRoot = await runRootOf(runId);
    await fs.mkdir(path.join(runRoot, 'runtime'), { recursive: true });
    await fs.mkdir(path.join(runRoot, 'intermediate'), { recursive: true });
    await persistRun(run);
    await appendRuntimeEvent(path.join(runRoot, 'runtime'), runId, 'RUN_CREATED', {
      documentCount: input.documentPaths.length,
      profile: input.apiProfileId,
    });

    const controller = new AbortController();
    activeControllers.set(runId, controller);
    try {
      // Stage 1 — document intake
      await transition(runId, 'preparing_documents', 'document_intake', '解析与归一化策略文档', run);
      const intake = await deps.runDocumentIntake({
        runId,
        paths: input.documentPaths,
        profileId: input.apiProfileId,
      });
      ensureNotCancelled(runId);
      await transition(runId, 'extracting_facts', 'fact_extraction', '提取与视觉设计相关的项目事实', {
        ...run,
        documentRunId: intake.documentRunId,
      });
      await persistIntermediate(runId, 'document-visual-context.json', intake.dvc);

      // Stage 2 — awaiting fact confirmation
      // Persist documentRunId on the run record before transitioning.
      await updateRun(runId, (current) => ({ ...current, documentRunId: intake.documentRunId }));
      await transition(runId, 'awaiting_fact_confirmation', 'fact_confirmation', '等待人工确认提取结果', {
        ...run,
        documentRunId: intake.documentRunId,
      });
    } catch (err) {
      await failRun(runId, err as Error);
      throw err;
    } finally {
      activeControllers.delete(runId);
    }
    return getRun(runId);
  }

  async function transition(
    runId: string,
    nextStatus: CreativeIntelligenceRunStatus,
    stage: CreativeIntelligenceProgressStage,
    message: string,
    baseRun: CreativeIntelligenceRun,
  ): Promise<CreativeIntelligenceRun> {
    const startedAt = new Date().toISOString();
    const updated = await updateRun(runId, (current) => ({
      ...current,
      status: nextStatus,
      currentStage: stage,
      startedAt: current.startedAt ?? startedAt,
      completedAt: nextStatus === 'completed' || nextStatus === 'failed' || nextStatus === 'cancelled'
        ? startedAt
        : current.completedAt,
      errorCode: nextStatus === 'failed' ? (current.errorCode ?? CI_APP_ERROR_CODES.RUN_STATE_INVALID) : null,
      lastError: nextStatus === 'failed' ? (current.lastError ?? 'unknown') : null,
    }));
    emitProgress({
      runId,
      stage,
      message,
      startedAt,
      elapsedMs: updated.startedAt
        ? Date.parse(startedAt) - Date.parse(updated.startedAt)
        : 0,
    });
    return updated;
  }

  async function failRun(runId: string, err: Error): Promise<void> {
    const code = (err as { code?: string }).code ?? 'CI_APP_RUN_STATE_INVALID';
    const message = err.message ?? 'unknown error';
    await updateRun(runId, (current) => ({
      ...current,
      status: 'failed',
      errorCode: code,
      lastError: message,
      completedAt: new Date().toISOString(),
    }));
    const runRoot = await runRootOf(runId);
    await appendRuntimeEvent(path.join(runRoot, 'runtime'), runId, 'RUN_FAILED', { code, message }).catch(() => undefined);
    deps.log?.('error', JSON.stringify({ event: 'CI_APP_RUN_FAILED', runId, code, message }));
  }

  // ------------------------ getFactReview ------------------------

  async function getFactReview(runId: string): Promise<CreativeIntelligenceFactReview> {
    const run = await getRun(runId);
    if (!run.documentRunId) {
      throw ciAppError(CI_APP_ERROR_CODES.FACT_CONFIRMATION_REQUIRED, 'Run 尚未完成文档提取');
    }
    const dvc = await readIntermediate<DocumentVisualContext>(runId, 'document-visual-context.json');
    if (!dvc) {
      throw ciAppError(CI_APP_ERROR_CODES.FACT_CONFIRMATION_REQUIRED, '文档上下文不存在，请重新启动 Run');
    }
    return buildFactReview(runId, run.projectId, run.documentRunId, dvc);
  }

  // ------------------------ confirmFacts ------------------------

  async function confirmFacts(
    runId: string,
    userFacts: CreativeIntelligenceFactItem[],
  ): Promise<CreativeIntelligenceRun> {
    const run = await getRun(runId);
    if (run.status !== 'awaiting_fact_confirmation' && run.status !== 'pending') {
      // Allow re-confirmation of awaiting_fact_confirmation only.
      throw ciAppError(CI_APP_ERROR_CODES.RUN_STATE_INVALID, `当前状态无法确认事实: ${run.status}`);
    }
    const dvc = await readIntermediate<DocumentVisualContext>(runId, 'document-visual-context.json');
    if (!dvc) {
      throw ciAppError(CI_APP_ERROR_CODES.DOCUMENT_REQUIRED, '文档上下文不存在，请重新启动 Run');
    }

    // Apply user actions to DVC (destructive on copy).
    const mergedDvc = applyUserFactActions(dvc, userFacts);
    await persistIntermediate(runId, 'document-visual-context.json', mergedDvc);

    // Continue with Truth + downstream.
    const runRoot = await runRootOf(runId);
    const controller = new AbortController();
    activeControllers.set(runId, controller);
    try {
      await runDownstream(runId, run, mergedDvc, controller.signal);
    } catch (err) {
      await failRun(runId, err as Error);
      throw err;
    } finally {
      activeControllers.delete(runId);
    }
    return getRun(runId);
  }

  function applyUserFactActions(
    dvc: DocumentVisualContext,
    userFacts: CreativeIntelligenceFactItem[],
  ): DocumentVisualContext {
    if (!userFacts || userFacts.length === 0) return dvc;
    const next: Record<string, unknown> = { ...(dvc as Record<string, unknown>) };
    for (const fact of userFacts) {
      if (fact.userAction === 'remove') {
        delete next[fact.field];
      } else if (fact.userAction === 'edit') {
        next[fact.field] = fact.editedValue ?? fact.value;
      } else if (fact.userAction === 'unknown') {
        // Mark as unknown in the evidence / facts map
        next[fact.field] = fact.value;
        next[`__unknown_${fact.field}`] = true;
      }
      // 'confirm' = no-op
    }
    return next as DocumentVisualContext;
  }

  async function runDownstream(
    runId: string,
    run: CreativeIntelligenceRun,
    dvc: DocumentVisualContext,
    signal: AbortSignal,
  ): Promise<void> {
    // Stage 3 — Truth + Evidence
    await transition(runId, 'building_truth', 'truth', '装配项目主真相与证据账本', run);
    const projectRecord = deps.loadProjectRecord
      ? await deps.loadProjectRecord(run.projectId ?? '')
      : null;
    const projectCarrier = projectRecord
      ? adaptProjectRecord(projectRecord, { projectId: runId, generatedAt: new Date().toISOString(), sourceFingerprints: {} })
      : adaptProjectRecord(synthesizeProjectRecord(run, dvc), { projectId: runId, generatedAt: new Date().toISOString(), sourceFingerprints: {} });
    const dvcOut = adaptDocumentVisualContext(dvc, {
      projectId: runId, generatedAt: new Date().toISOString(), sourceFingerprints: {},
    });
    let assembled: ReturnType<typeof assembleProjectTruth>;
    try {
      assembled = assembleProjectTruth({
        projectId: runId,
        carrierOutputs: [projectCarrier, dvcOut],
        context: { projectId: runId, generatedAt: new Date().toISOString(), sourceFingerprints: {} },
      });
    } catch (err) {
      throw ciAppError(CI_APP_ERROR_CODES.TRUTH_BUILD_FAILED, `Truth 装配失败: ${(err as Error).message}`);
    }
    if (signal.aborted) throw ciAppError(CI_APP_ERROR_CODES.CANCELLED, 'Run 已被取消');
    await persistIntermediate(runId, 'truth.json', assembled.truth);
    await persistIntermediate(runId, 'evidence.json', assembled.ledger);

    // CI-W1C.5 PART E: read vnext and build visual evidence contribution.
    // The visual facts are merged into an IN-MEMORY copy of the truth
    // model used by NICE / Concept / Direction. The on-disk
    // `truth.json` is NOT modified (visual facts are not persisted).
    let inMemoryTruth: ProjectTruthModel = assembled.truth;
    if (deps.loadProjectVNext) {
      try {
        const vnext = await deps.loadProjectVNext(run.projectId ?? '');
        if (vnext) {
          const contribution = buildVisualEvidenceContribution(runId, vnext as Parameters<typeof buildVisualEvidenceContribution>[1]);
          const visualFacts = contributionToTruthFacts(contribution);
          if (visualFacts.length > 0) {
            inMemoryTruth = {
              ...assembled.truth,
              facts: [...assembled.truth.facts, ...visualFacts],
            };
          }
        }
      } catch {
        // VNext read is best-effort; absence must not break the run.
      }
    }

    // Stage 4 — Understanding (NICE N+I+O)
    await transition(runId, 'building_understanding', 'understanding', '装配需求 / 洞察 / 机会图', run);
    const nice = runNicePipeline({
      projectId: runId,
      truth: inMemoryTruth,
      evidence: assembled.ledger,
      generatedAt: new Date().toISOString(),
    });
    if (signal.aborted) throw ciAppError(CI_APP_ERROR_CODES.CANCELLED, 'Run 已被取消');
    await persistIntermediate(runId, 'need.json', nice.needs);
    await persistIntermediate(runId, 'insight.json', nice.insights);
    await persistIntermediate(runId, 'opportunity.json', nice.opportunityMap);

    // Stage 5 — Concept
    await transition(runId, 'building_concepts', 'concept', '生成概念候选 + 8 闸门', run);
    const concept = runConceptPipeline({
      projectId: runId,
      truth: inMemoryTruth,
      evidence: assembled.ledger,
      needs: nice.needs,
      insights: nice.insights,
      opportunityMap: nice.opportunityMap,
      generatedAt: new Date().toISOString(),
    });
    if (signal.aborted) throw ciAppError(CI_APP_ERROR_CODES.CANCELLED, 'Run 已被取消');
    await persistIntermediate(runId, 'concept-set.json', concept.conceptSet);

    // Stage 6 — Direction
    await transition(runId, 'building_directions', 'direction', '生成方向候选 + 11 闸门', run);
    const direction = runDirectionPipeline({
      projectId: runId,
      truth: inMemoryTruth,
      evidence: assembled.ledger,
      needs: nice.needs,
      insights: nice.insights,
      opportunityMap: nice.opportunityMap,
      conceptSet: concept.conceptSet,
      generatedAt: new Date().toISOString(),
    });
    if (signal.aborted) throw ciAppError(CI_APP_ERROR_CODES.CANCELLED, 'Run 已被取消');
    await persistIntermediate(runId, 'direction-set.json', direction.directionSet);

    // Stage 7 — Evaluation
    await transition(runId, 'evaluating', 'evaluation', '10 维评估 + 排名 + 推荐', run);
    const evaluation = evaluateDirections({
      projectId: runId,
      directionSet: direction.directionSet,
      familyDifference: direction.familyDifference,
      generatedAt: new Date().toISOString(),
    });
    if (signal.aborted) throw ciAppError(CI_APP_ERROR_CODES.CANCELLED, 'Run 已被取消');
    await persistIntermediate(runId, 'evaluation.json', evaluation);

    // CI-W1B.2: Decide between awaiting_direction_selection and
    // direction_blocked based on the count of selectable Directions.
    // `selectable` requires the Direction to be grounded/provisional,
    // not in the blockedDirectionIds list, and not blocked by the
    // Direction-evaluation pass. We compute it here, NOT in the Web
    // side, so the Application owns the semantic answer.
    const directionSetRecord = direction.directionSet as unknown as Record<string, unknown>;
    const selectableCount = countSelectableDirections(directionSetRecord as never);

    if (selectableCount === 0) {
      // Zero selectable Directions. This is a valid application
      // outcome (NOT a crash): the Concept gate produced no Direction
      // candidates the user can actually pick. Persist blocker code
      // on the run record so callers can detect the outcome without
      // parsing the error text. Do NOT initialize the selection
      // state — there is nothing to select.
      await updateRun(runId, (current) => ({
        ...current,
        status: 'direction_blocked',
        currentStage: 'selection',
        blockerCode: CI_APP_DIRECTION_BLOCKED_ALL,
        completedAt: undefined,
        errorCode: null,
        lastError: null,
      }));
      // Persist blocker summaries as a derived artifact so future
      // getWorkspace() does not have to re-parse the gateResults
      // (it still does, but the persisted form is the source of
      // truth for downstream audits).
      const summaries = projectBlockerSummaries(
        concept.conceptSet as unknown as Record<string, unknown>,
        directionSetRecord,
        { includeAllBlockedFallback: true },
      );
      await persistIntermediate(runId, 'blocker-summaries.json', summaries);
      const runRoot = await runRootOf(runId);
      await appendRuntimeEvent(path.join(runRoot, 'runtime'), runId, 'DIRECTION_BLOCKED', {
        blockerCode: CI_APP_DIRECTION_BLOCKED_ALL,
        summaryCount: summaries.length,
      }).catch(() => undefined);
      deps.log?.('info', JSON.stringify({
        event: 'CI_APP_DIRECTION_BLOCKED',
        runId,
        summaryCount: summaries.length,
      }));
      return;
    }

    // Stage 8 — Awaiting direction selection
    await transition(runId, 'awaiting_direction_selection', 'selection', '等待用户选择方向', run);

    // Initialize unselected selection state. Persist it.
    const initialSelection = createUnselectedState(runId, new Date().toISOString());
    await persistSelection(runId, initialSelection as unknown as Record<string, unknown>);
    await persistSelectionHistory(runId, []);
  }

  function synthesizeProjectRecord(
    run: CreativeIntelligenceRun,
    dvc: DocumentVisualContext,
  ): Record<string, unknown> {
    return {
      id: run.projectId ?? run.id,
      projectName: run.projectName,
      brandName: (dvc as { brandName?: string }).brandName ?? run.projectName,
      industry: (dvc as { industry?: string }).industry ?? 'pending',
      logoLocked: false,
    };
  }

  // ------------------------ getWorkspace ------------------------

  async function getWorkspace(runId: string): Promise<CreativeIntelligenceWorkspaceView> {
    const run = await getRun(runId);
    const runRoot = await runRootOf(runId);
    const blockers: string[] = [];
    const warnings: string[] = run.warnings ?? [];
    const diagnostics: string[] = run.diagnostics ?? [];

    const selection = await readSelection(runId);
    const dvc = await readIntermediate<DocumentVisualContext>(runId, 'document-visual-context.json');
    const sourceRunId = (dvc as { sourceRunId?: string } | null)?.sourceRunId ?? null;
    if (selection) {
      const sel = selection as { status?: string; selectedBy?: string; selectedDirectionId?: string | null };
      if (sel.status === 'selection_invalidated') {
        blockers.push('当前选择已失效，请重新选择方向');
      }
      if (sel.status === 'selected' && sel.selectedBy !== 'user') {
        blockers.push('当前选择不是由 user 完成的');
      }
    }

    // CI-W1B.2: project blocker summaries. The persisted
    // `blocker-summaries.json` is the source of truth; we re-project
    // from gateResults when the run is in `direction_blocked` AND
    // the persisted file is missing (forward-compat for runs
    // created before this commit).
    const persisted = await readIntermediate<unknown>(runId, 'blocker-summaries.json');
    let blockerSummaries: unknown[] | null = null;
    if (run.status === 'direction_blocked') {
      if (Array.isArray(persisted) && persisted.length > 0) {
        blockerSummaries = persisted;
      } else {
        const conceptSet = await readIntermediate<Record<string, unknown>>(runId, 'concept-set.json');
        const directionSet = await readIntermediate<Record<string, unknown>>(runId, 'direction-set.json');
        blockerSummaries = projectBlockerSummaries(conceptSet, directionSet, { includeAllBlockedFallback: true });
      }
      if (Array.isArray(blockerSummaries) && blockerSummaries.length > 0) {
        // Single human-readable line for the run's blocker slot.
        const codes = (blockerSummaries as Array<{ code: string; count: number }>)
          .map((s) => s.code)
          .join(', ');
        blockers.push(`当前没有可选择的创意方向: ${codes}`);
      }
    }

    const baseView = await buildWorkspaceView(
      run,
      runRoot,
      run.documentRunId,
      sourceRunId,
      blockers,
      warnings,
      diagnostics,
      blockerSummaries as never,
    );
    // CI-W2: project the Anchor Production sub-run state when
    // the run is past selection. The orchestrator handles the
    // approval staleness check internally; we just project the
    // latest persisted state.
    const anchorProductionProjection = await projectAnchorProduction(deps, runId);
    return Object.assign({}, baseView, { anchorProduction: anchorProductionProjection });
  }

  // ------------------------ selectDirection ------------------------

  async function selectDirection(
    runId: string,
    action: SelectDirectionActionInput,
  ): Promise<CreativeIntelligenceWorkspaceView> {
    if (!action || !action.directionId) {
      throw ciAppError(CI_APP_ERROR_CODES.SELECTION_REQUIRED, 'directionId 必填');
    }
    const run = await getRun(runId);
    if (run.status !== 'awaiting_direction_selection') {
      // CI-W1B.2: `direction_blocked` is a valid, non-crash
      // application state. Surface it as a distinct error code so the
      // Web layer can map it to the All-Blocked recovery view
      // instead of treating it as a generic state error.
      if (run.status === 'direction_blocked') {
        throw ciAppError(
          CI_APP_ERROR_CODES.DIRECTION_BLOCKED_ALL,
          `Run 处于 direction_blocked 状态: ${run.blockerCode ?? CI_APP_DIRECTION_BLOCKED_ALL}`,
        );
      }
      throw ciAppError(CI_APP_ERROR_CODES.SELECTION_INVALID, `当前状态无法选择方向: ${run.status}`);
    }
    const directionSet = await readIntermediate<Record<string, unknown>>(runId, 'direction-set.json');
    if (!directionSet) {
      throw ciAppError(CI_APP_ERROR_CODES.SELECTION_INVALID, '方向集合不存在');
    }
    const directions = ((directionSet as { directions?: unknown[] }).directions ?? []) as Array<Record<string, unknown>>;
    const target = directions.find((d) => d.id === action.directionId);
    if (!target) {
      throw ciAppError(CI_APP_ERROR_CODES.SELECTION_INVALID, `方向不存在: ${action.directionId}`);
    }
    if (target.status === 'blocked') {
      throw ciAppError(CI_APP_ERROR_CODES.SELECTION_INVALID, `被阻断的方向不能被选择: ${action.directionId}`);
    }
    if (!isUserSelectableDirectionStatus(target.status as string)) {
      throw ciAppError(CI_APP_ERROR_CODES.SELECTION_INVALID, `方向状态不允许选择: ${target.status}`);
    }

    // Build the explicit-user action.
    const occurredAt = action.occurredAt ?? new Date().toISOString();
    const selectAction = makeSelectAction(runId, action.directionId, {
      occurredAt,
      reason: action.reason,
    });

    const currentSelection = await readSelection(runId);
    let nextState;
    if (currentSelection && (currentSelection as { status?: string }).status && (currentSelection as { status?: string }).status !== 'unselected') {
      // Resume case: existing selection state. Re-apply the action.
      const existing = currentSelection as unknown as Parameters<typeof applySelectionAction>[0];
      const result = applySelectionAction(existing, selectAction, {
        directionExists: (id) => directions.some((d) => d.id === id),
        isDirectionBlocked: (id) => {
          const d = directions.find((x) => x.id === id);
          return d?.status === 'blocked';
        },
      });
      nextState = result.state;
    } else {
      const initial = createUnselectedState(runId, new Date().toISOString());
      const result = applySelectionAction(initial, selectAction, {
        directionExists: (id) => directions.some((d) => d.id === id),
        isDirectionBlocked: (id) => {
          const d = directions.find((x) => x.id === id);
          return d?.status === 'blocked';
        },
      });
      nextState = result.state;
    }

    // Persist selection + history.
    const prevHistory = await readSelectionHistory(runId);
    const previousSelectionIds = (currentSelection as { previousSelectionIds?: string[] } | null)?.previousSelectionIds ?? [];
    const historyEntry = {
      runId,
      occurredAt,
      selectedDirectionId: action.directionId,
      actor: 'user',
      reason: action.reason,
      selectionRevision: (nextState as { revision?: number }).revision ?? 0,
      previousSelectionIds,
    };
    const newHistory = [...prevHistory, historyEntry];
    await persistSelection(runId, nextState as unknown as Record<string, unknown>);
    await persistSelectionHistory(runId, newHistory);

    // Update run record: increment selection revision, set selected direction.
    const newRevision = (nextState as { revision?: number }).revision ?? 0;
    await updateRun(runId, (current) => ({
      ...current,
      selectionRevision: newRevision,
      selectedDirectionId: action.directionId,
    }));

    // Stage 9 — Build Canon
    await transition(runId, 'building_canon', 'canon', '构建 Visual Canon + Anchor Contract', run);

    const truth = await readIntermediate<Record<string, unknown>>(runId, 'truth.json');
    const evidence = await readIntermediate<Record<string, unknown>>(runId, 'evidence.json');
    const conceptSet = await readIntermediate<Record<string, unknown>>(runId, 'concept-set.json');
    if (!truth || !evidence || !conceptSet) {
      throw ciAppError(CI_APP_ERROR_CODES.CANON_BUILD_FAILED, 'Canon 构建缺少前置产物');
    }

    // Use the pure CI functions to build snapshot + canon + anchor.
    // The shape expected by these functions is a structural type mirror; we
    // pass our persisted state as-is.
    const snapshot = buildSelectedDirectionSnapshot({
      projectId: runId,
      selection: nextState as never,
      direction: target as never,
    } as never);
    if (!snapshot.snapshot) {
      throw ciAppError(CI_APP_ERROR_CODES.CANON_BUILD_FAILED,
        `Snapshot 构建失败: ${snapshot.diagnostics.map((d) => d.message).join('; ')}`);
    }
    await persistIntermediate(runId, 'snapshot.json', snapshot.snapshot);

    const canonResult = buildVisualCanon({
      projectId: runId,
      snapshot: snapshot.snapshot,
      facts: ((truth as { facts?: unknown[] }).facts ?? []) as never,
      evidence: ((evidence as { entries?: unknown[] }).entries ?? []) as never,
      lockedAssetKeys: [],
    });
    if (!canonResult.canon) {
      throw ciAppError(CI_APP_ERROR_CODES.CANON_BUILD_FAILED, 'Canon 构建失败');
    }
    await persistIntermediate(runId, 'canon.json', canonResult.canon);

    const anchorResult = buildAnchorContract({
      projectId: runId,
      snapshot: snapshot.snapshot,
      canon: canonResult.canon,
    });
    if (!anchorResult.anchor) {
      throw ciAppError(CI_APP_ERROR_CODES.CANON_BUILD_FAILED, 'Anchor Contract 构建失败');
    }
    await persistIntermediate(runId, 'anchor.json', anchorResult.anchor);

    // Stage 10 — Build Production Translation
    await transition(runId, 'building_translation', 'translation', '构建 Space + Packaging 翻译契约', run);
    const ctxResult = buildProductionTranslationContext({
      projectId: runId,
      snapshot: snapshot.snapshot,
      canon: canonResult.canon,
      anchor: anchorResult.anchor,
      targetMedia: 'space',
    });
    if (!ctxResult.context) {
      throw ciAppError(CI_APP_ERROR_CODES.TRANSLATION_BUILD_FAILED,
        `Translation Context 构建失败: ${ctxResult.diagnostics.map((d) => d.message).join('; ')}`);
    }
    await persistIntermediate(runId, 'translation-context.json', ctxResult.context);

    const spaceResult = buildSpaceTranslation({ ctx: ctxResult.context });
    if (!spaceResult.contract) {
      throw ciAppError(CI_APP_ERROR_CODES.TRANSLATION_BUILD_FAILED, 'Space Translation 构建失败');
    }
    await persistIntermediate(runId, 'space-translation.json', spaceResult.contract);

    const packagingResult = buildPackagingTranslation({ ctx: ctxResult.context });
    if (!packagingResult.contract) {
      throw ciAppError(CI_APP_ERROR_CODES.TRANSLATION_BUILD_FAILED, 'Packaging Translation 构建失败');
    }
    await persistIntermediate(runId, 'packaging-translation.json', packagingResult.contract);

    // Validate cross-media consistency (Spec §35).
    const crossMedia = validateCrossMediaConsistency(spaceResult.contract, packagingResult.contract);
    if (crossMedia.length > 0) {
      deps.log?.('warn', JSON.stringify({
        event: 'CI_APP_CROSS_MEDIA_DIAGNOSTICS',
        runId,
        count: crossMedia.length,
        codes: crossMedia.map((d) => d.code),
      }));
    }

    // Stage 11 — completed
    await transition(runId, 'completed', 'completed', 'Creative Intelligence run 已完成', run);

    return getWorkspace(runId);
  }

  // ------------------------ resume ------------------------

  async function resume(runId: string): Promise<CreativeIntelligenceRun> {
    const run = await getRun(runId);
    // Re-apply user actions to selection is not allowed. Resume simply resets
    // the run status if it was previously in a recoverable state.
    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
      throw ciAppError(CI_APP_ERROR_CODES.RUN_STATE_INVALID, `Run 不可恢复: ${run.status}`);
    }
    // CI-W1B.2: `direction_blocked` is a terminal state for the
    // selection pipeline — there is no downstream work to re-apply,
    // and there is no revision capability yet (Spec §29). The user
    // has only two recovery actions: "重新创建任务" or "删除此任务".
    if (run.status === 'direction_blocked') {
      throw ciAppError(
        CI_APP_ERROR_CODES.RUN_STATE_INVALID,
        `Run 处于 direction_blocked 状态，无下游工作可恢复: ${run.blockerCode ?? CI_APP_DIRECTION_BLOCKED_ALL}`,
      );
    }
    return run;
  }

  // ------------------------ cancel ------------------------

  async function cancel(runId: string): Promise<boolean> {
    const run = await getRun(runId);
    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
      return false;
    }
    cancelledRuns.add(runId);
    const controller = activeControllers.get(runId);
    if (controller) controller.abort();
    await updateRun(runId, (current) => ({
      ...current,
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    }));
    return true;
  }

  // ------------------------ remove ------------------------

  async function remove(runId: string): Promise<void> {
    const runRoot = await runRootOf(runId);
    await assertInside(await dataRoot(), runRoot);
    await fs.rm(runRoot, { recursive: true, force: true });
    cancelledRuns.delete(runId);
  }

  // ------------------------ CI-W2: Anchor Production sub-run ------------------------

  async function projectAnchorProduction(
    deps_: CreateCreativeIntelligenceApplicationServiceInput,
    runId: string,
  ): Promise<AnchorProductionWorkspace | null> {
    if (!deps_.anchorProduction) return null;
    return await deps_.anchorProduction.getAnchorProduction(runId);
  }

  function requireAnchorProductionService() {
    if (!deps.anchorProduction) {
      throw ciAppError('CI_APP_ANCHOR_PRODUCTION_DISABLED',
        'Anchor Production is not wired into this runtime. Provide anchorProduction in deps.');
    }
    return deps.anchorProduction;
  }

  async function buildAnchorParentSnapshot(ciRunId: string) {
    const run = await getRun(ciRunId);
    const runRoot = await runRootOf(ciRunId);
    const snapshot = await readJsonFile<Record<string, unknown>>(path.join(runRoot, 'intermediate', 'snapshot.json'));
    const canon = await readJsonFile<Record<string, unknown>>(path.join(runRoot, 'intermediate', 'canon.json'));
    const anchor = await readJsonFile<Record<string, unknown>>(path.join(runRoot, 'intermediate', 'anchor.json'));
    return {
      projectId: run.projectId ?? null,
      apiProfileId: run.apiProfileId,
      provider: run.provider,
      model: run.model,
      selectionRevision: run.selectionRevision,
      selectedDirectionSnapshot: snapshot,
      visualCanon: canon,
      anchorContract: anchor,
    };
  }

  function workspaceFromAnchor(workspace: CreativeIntelligenceWorkspaceView, anchor: unknown) {
    return { ...workspace, anchorProduction: anchor } as CreativeIntelligenceWorkspaceView;
  }

  async function startAnchorProduction(
    runId: string,
    options: { candidateCount?: number; apiProfileId?: string } | undefined,
  ): Promise<CreativeIntelligenceWorkspaceView> {
    const anchor = requireAnchorProductionService();
    // CI main run must be `completed` (or a terminal state with valid
    // Canon + Anchor). We accept `completed` only — `failed` /
    // `cancelled` cannot start Anchor Production.
    const run = await getRun(runId);
    if (run.status !== 'completed') {
      throw ciAppError(CI_APP_ERROR_CODES.RUN_STATE_INVALID, `CI run 状态不允许 Anchor Production: ${run.status}`);
    }
    const parent = await buildAnchorParentSnapshot(runId);
    const result = await anchor.startAnchorProduction(runId, options, parent);
    return workspaceFromAnchor(await getWorkspace(runId), result);
  }

  async function compileAnchorProduction(runId: string): Promise<CreativeIntelligenceWorkspaceView> {
    const anchor = requireAnchorProductionService();
    const parent = await buildAnchorParentSnapshot(runId);
    const result = await anchor.compileAnchorProduction(runId, parent);
    return workspaceFromAnchor(await getWorkspace(runId), result);
  }

  async function getAnchorProduction(runId: string): Promise<CreativeIntelligenceWorkspaceView> {
    const anchor = requireAnchorProductionService();
    const result = await anchor.getAnchorProduction(runId);
    return workspaceFromAnchor(await getWorkspace(runId), result);
  }

  async function listAnchorCandidates(runId: string) {
    const anchor = requireAnchorProductionService();
    return anchor.listAnchorCandidates(runId);
  }

  async function approveAnchorCandidate(
    runId: string,
    candidateId: string,
    reason: string | undefined,
  ): Promise<CreativeIntelligenceWorkspaceView> {
    const anchor = requireAnchorProductionService();
    const result = await anchor.approveAnchorCandidate(runId, candidateId, reason);
    return workspaceFromAnchor(await getWorkspace(runId), result);
  }

  async function rejectAnchorCandidate(
    runId: string,
    candidateId: string,
  ): Promise<CreativeIntelligenceWorkspaceView> {
    const anchor = requireAnchorProductionService();
    const result = await anchor.rejectAnchorCandidate(runId, candidateId);
    return workspaceFromAnchor(await getWorkspace(runId), result);
  }

  async function retryAnchorCandidate(
    runId: string,
    candidateId: string | null,
  ): Promise<CreativeIntelligenceWorkspaceView> {
    const anchor = requireAnchorProductionService();
    const result = await anchor.retryAnchorCandidate(runId, candidateId);
    return workspaceFromAnchor(await getWorkspace(runId), result);
  }

  async function cancelAnchorProduction(runId: string): Promise<CreativeIntelligenceWorkspaceView> {
    const anchor = requireAnchorProductionService();
    const result = await anchor.cancelAnchorProduction(runId);
    return workspaceFromAnchor(await getWorkspace(runId), result);
  }

  async function getApprovedAnchor(runId: string) {
    const anchor = requireAnchorProductionService();
    return anchor.getApprovedAnchor(runId);
  }

  async function getAnchorApprovalHistory(runId: string) {
    const anchor = requireAnchorProductionService();
    return anchor.getAnchorApprovalHistory(runId);
  }

  function onProgress(callback: (progress: CreativeIntelligenceProgress) => void): () => void {
    progressListeners.add(callback);
    return () => progressListeners.delete(callback);
  }

  return {
    listRuns,
    getRun,
    start,
    getFactReview,
    confirmFacts,
    getWorkspace,
    selectDirection,
    resume,
    cancel,
    remove,
    onProgress,
    startAnchorProduction,
    compileAnchorProduction,
    getAnchorProduction,
    listAnchorCandidates,
    approveAnchorCandidate,
    rejectAnchorCandidate,
    retryAnchorCandidate,
    cancelAnchorProduction,
    getApprovedAnchor,
    getAnchorApprovalHistory,
  };
}
