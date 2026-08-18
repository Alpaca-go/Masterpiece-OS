/**
 * CI-W2: Anchor Production runtime orchestrator.
 *
 * Owns:
 *   - Anchor Production sub-run lifecycle (pending -> compiling ->
 *     generating -> completed | failed | cancelled)
 *   - Contract compilation (delegated to the pure CI compiler)
 *   - Image runtime handoff (delegated to the existing image runtime
 *     via the injected `submitAnchorGeneration` dep)
 *   - Candidate persistence and deterministic post-evaluation
 *   - Approval history (re-approval increments revision; canon /
 *     selection change invalidates the previous approval)
 *   - Rejection / retry / cancel
 *   - WorkspaceView projection
 *
 * Does NOT own:
 *   - Anchor contract semantics (CI package)
 *   - Visual canon semantics (CI package)
 *   - Image generation provider calls (image-generation-runtime)
 *   - Image asset persistence (image-generation-runtime asset authority)
 *   - Web UI / RPC channels (operations layer)
 *
 * Persistence root:
 *   `<dataDir>/creative-intelligence-runs/<runId>/anchor-production/`
 *     run.json              �?AnchorProductionRun state
 *     contract.json         �?AnchorProductionContract
 *     candidates/<id>.json  �?AnchorCandidate[]
 *     approval.json         �?ApprovedVisualAnchor (current)
 *     approval-history.json �?append-only history
 *
 * Hard rules (Spec):
 *   - 0 candidates generated -> 0 approved. The default state is
 *     `approvedAnchor = null` and stays null until the user clicks
 *     "设为视觉基准" + confirm.
 *   - Direction selection revision change -> previous approval
 *     invalidated; approvalRevision resets.
 *   - Canon version change -> previous approval invalidated.
 *   - Anchor Production failure must NOT corrupt the parent CI run.
 *   - Web never imports from this file; the operations layer
 *     exposes the kebab-case RPC channels.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  type AnchorApprovalHistoryEntry,
  type CiAnchorCandidate,
  type CiAnchorCandidateEvaluation,
  type AnchorProductionContract,
  type AnchorProductionRun,
  type AnchorProductionRunStatus,
  type ApprovedVisualAnchor,
  type AnchorProductionWorkspace,
} from '../application-contracts.ts';

import {
  buildAnchorProductionContract,
  canStartAnchorProduction,
  evaluateAnchorCandidate,
  type EvaluateAnchorCandidateInput,
  type AnchorCandidate as CiSemAnchorCandidate,
  type AnchorProductionContract as CiSemAnchorProductionContract,
  ANCHOR_PRODUCTION_ERROR_CODES,
} from '@masterpiece/creative-intelligence/index.ts';

import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import { RunWriteCoordinator } from './runtime/run-write-coordinator.ts';

// ---------------------------------------------------------------------------
// Boundary seam: image generation handoff
// ---------------------------------------------------------------------------

/**
 * Result of submitting an Anchor production request to the image
 * runtime. The runtime-core service does NOT itself call the image
 * runtime �?it goes through this injected boundary so the existing
 * image-generation-runtime keeps the provider / model authority.
 */
export interface AnchorImageGenerationSubmission {
  /** Provider-side image generation run id (created by the image runtime). */
  imageGenerationRunId: string;
  /** Resolved provider id. */
  providerId: string;
  /** Resolved model id. */
  modelId: string;
  /** Per-candidate result. */
  candidates: Array<{
    candidateId: string;
    imageId: string;
    imagePath: string;
    thumbnailPath?: string | null;
    imageFingerprint: string;
    sourceFingerprint: string;
    aspectRatio: string;
  }>;
}

export interface AnchorImageGenerationRetrySubmission extends AnchorImageGenerationSubmission {
  /** Candidate ids that were re-generated. */
  retriedCandidateIds: string[];
}

export interface SubmitAnchorGenerationInput {
  /** Project id (forwarded from the parent CI run; may be null). */
  projectId: string | null;
  /** API Profile id used for the request. */
  apiProfileId: string;
  /** Resolved provider id (from the profile). */
  providerId: string;
  /** Resolved model id (from the profile). */
  modelId: string;
  /** The compiled contract �?what the image runtime is going to produce. */
  contract: AnchorProductionContract;
  /** Deterministic compiled prompt (string output of the CI compiler). */
  compiledPrompt: string;
  /** Aspect ratio (16:9 default). */
  aspectRatio: string;
  /** Candidate ids the runtime should produce (deterministic). */
  candidateIds: string[];
  /** Locked Asset keys the prompt must preserve. */
  lockedAssetKeys: string[];
  /** Optional Anchor-only override; null to let the runtime pick the image dimensions. */
  size?: string;
}

/**
 * Boundary interface for the image runtime. The runtime-core wiring
 * layer is expected to provide an implementation that delegates to
 * `imageGenerationService.start()` with `purpose: 'creative_anchor'`
 * and a synthetic `virtualProjectId` (= ci runId).
 */
export type SubmitAnchorGeneration = (input: SubmitAnchorGenerationInput) => Promise<AnchorImageGenerationSubmission>;

export type SubmitAnchorRetryGeneration = (input: SubmitAnchorGenerationInput & { retriedCandidateIds: string[] }) => Promise<AnchorImageGenerationRetrySubmission>;

export interface CancelAnchorGeneration {
  (imageGenerationRunId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Public service surface
// ---------------------------------------------------------------------------

export interface AnchorProductionServiceDeps {
  readDataDir(): Promise<string>;
  log?: (level: 'info' | 'warn' | 'error', message: string) => void;
  submitAnchorGeneration: SubmitAnchorGeneration;
  submitAnchorRetryGeneration: SubmitAnchorRetryGeneration;
  cancelAnchorGeneration: CancelAnchorGeneration;
  /**
   * Resolves the locked asset keys the project actually carries. The
   * CI main run does not own locked assets; the runtime-core must
   * delegate to the existing LockedAssetsService. When the parent
   * CI run has no project binding, the resolver may return [].
   */
  resolveLockedAssetKeys(projectId: string | null, ciRunId: string): Promise<string[]>;
  /**
   * Maps the CI run's stored facts (from the `truth.json` artifact)
   * to the locked asset keys that should be threaded into the image
   * runtime as references. When the CI run is not project-bound, the
   * resolver may return [].
   */
  resolveProjectBrandIdentityRefs(projectId: string | null, ciRunId: string): Promise<string[]>;
}

export interface AnchorProductionService {
  startAnchorProduction(
    runId: string,
    options: { candidateCount?: number; apiProfileId?: string } | undefined,
    parent: AnchorProductionParentSnapshot,
  ): Promise<AnchorProductionWorkspace>;
  compileAnchorProduction(
    runId: string,
    parent: AnchorProductionParentSnapshot,
  ): Promise<AnchorProductionWorkspace>;
  getAnchorProduction(runId: string): Promise<AnchorProductionWorkspace>;
  listAnchorCandidates(runId: string): Promise<CiAnchorCandidate[]>;
  approveAnchorCandidate(
    runId: string,
    candidateId: string,
    reason: string | undefined,
  ): Promise<AnchorProductionWorkspace>;
  rejectAnchorCandidate(
    runId: string,
    candidateId: string,
  ): Promise<AnchorProductionWorkspace>;
  retryAnchorCandidate(
    runId: string,
    candidateId: string | null,
  ): Promise<AnchorProductionWorkspace>;
  cancelAnchorProduction(runId: string): Promise<AnchorProductionWorkspace>;
  getApprovedAnchor(runId: string): Promise<ApprovedVisualAnchor | null>;
  getAnchorApprovalHistory(runId: string): Promise<AnchorApprovalHistoryEntry[]>;
}

/**
 * The minimal parent state the orchestrator needs to start a run.
 * The CI application service composes this from the parent run /
 * intermediate artifacts.
 */
export interface AnchorProductionParentSnapshot {
  projectId: string | null;
  apiProfileId: string;
  provider: string;
  model: string;
  selectionRevision: number;
  selectedDirectionSnapshot: Record<string, unknown> | null;
  visualCanon: Record<string, unknown> | null;
  anchorContract: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ciAnchorError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function makeRunId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function makeCandidateId(prefix: 'cand'): string {
  return `${prefix}-${makeRunId()}`;
}

function assertCiAnchorContract(value: unknown): value is CiAnchorProductionContract {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === '0.1'
    && typeof v.creativeIntelligenceRunId === 'string'
    && typeof v.selectedDirectionId === 'string'
    && typeof v.selectionRevision === 'number'
    && typeof v.canonVersion === 'string'
    && typeof v.anchorContractVersion === 'string'
    && typeof v.candidateCount === 'number';
}

function assertCiAnchorCandidate(value: unknown): value is CiAnchorCandidate {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 'anchor-candidate-v0.1'
    && typeof v.id === 'string'
    && typeof v.imageId === 'string'
    && typeof v.imageFingerprint === 'string'
    && typeof v.sourceFingerprint === 'string'
    && (v.status === 'generated' || v.status === 'rejected' || v.status === 'superseded');
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAnchorProductionService(deps: AnchorProductionServiceDeps): AnchorProductionService {
  const writeCoordinator = new RunWriteCoordinator((metrics) => {
    deps.log?.('info', JSON.stringify({
      event: 'CI_ANCHOR_WRITE_RESULT',
      run_id: metrics.runId,
      operation: metrics.operation,
      success: metrics.success,
      duration_ms: metrics.durationMs,
    }));
  });

  async function dataRoot(): Promise<string> {
    const root = path.resolve(await deps.readDataDir());
    return path.join(root, 'creative-intelligence-runs');
  }

  async function runRootOf(ciRunId: string): Promise<string> {
    return path.join(await dataRoot(), ciRunId);
  }

  async function anchorDir(ciRunId: string): Promise<string> {
    return path.join(await runRootOf(ciRunId), 'anchor-production');
  }

  async function assertInside(parent: string, target: string): Promise<void> {
    const rp = path.resolve(parent);
    const rt = path.resolve(target);
    if (rt !== rp && !rt.startsWith(`${rp}${path.sep}`)) {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.RUN_NOT_FOUND, `Anchor 路径越界: ${target}`);
    }
  }

  async function writeJson(file: string, payload: unknown): Promise<void> {
    const result = await atomicWriteJsonWithRetry(file, payload);
    if (!result.success) {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.COMPILE_FAILED, `写入文件失败: ${path.basename(file)} �?${result.errorMessage ?? 'unknown'}`);
    }
  }

  async function readJsonFile<T>(file: string): Promise<T | null> {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8')) as T;
    } catch {
      return null;
    }
  }

  async function listJsonFiles(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile() && e.name.endsWith('.json'))
        .map((e) => e.name)
        .sort();
    } catch {
      return [];
    }
  }

  async function persistRun(ciRunId: string, run: AnchorProductionRun): Promise<void> {
    const file = path.join(await anchorDir(ciRunId), 'run.json');
    await assertInside(await runRootOf(ciRunId), file);
    await writeCoordinator.enqueue(ciRunId, 'anchor-run', async () => {
      await writeJson(file, run);
    });
  }

  async function persistContract(ciRunId: string, contract: AnchorProductionContract): Promise<void> {
    const file = path.join(await anchorDir(ciRunId), 'contract.json');
    await assertInside(await runRootOf(ciRunId), file);
    await writeCoordinator.enqueue(ciRunId, 'anchor-contract', async () => {
      await writeJson(file, contract);
    });
  }

  async function persistCandidate(ciRunId: string, candidate: CiAnchorCandidate): Promise<void> {
    const dir = path.join(await anchorDir(ciRunId), 'candidates');
    await assertInside(await runRootOf(ciRunId), dir);
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${candidate.id}.json`);
    await assertInside(await runRootOf(ciRunId), file);
    await writeCoordinator.enqueue(ciRunId, `anchor-candidate:${candidate.id}`, async () => {
      await writeJson(file, candidate);
    });
  }

  async function persistApproval(ciRunId: string, approval: ApprovedVisualAnchor | null): Promise<void> {
    const file = path.join(await anchorDir(ciRunId), 'approval.json');
    await assertInside(await runRootOf(ciRunId), file);
    await writeCoordinator.enqueue(ciRunId, 'anchor-approval', async () => {
      await writeJson(file, approval);
    });
  }

  async function persistApprovalHistory(ciRunId: string, history: AnchorApprovalHistoryEntry[]): Promise<void> {
    const file = path.join(await anchorDir(ciRunId), 'approval-history.json');
    await assertInside(await runRootOf(ciRunId), file);
    await writeCoordinator.enqueue(ciRunId, 'anchor-approval-history', async () => {
      await writeJson(file, history);
    });
  }

  async function updateAnchorRun(
    ciRunId: string,
    patch: (run: AnchorProductionRun) => AnchorProductionRun,
  ): Promise<AnchorProductionRun> {
    const file = path.join(await anchorDir(ciRunId), 'run.json');
    const current = await readJsonFile<AnchorProductionRun>(file);
    if (!current) {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.RUN_NOT_FOUND, `Anchor run 不存�? ${ciRunId}`);
    }
    const next = patch(current);
    await persistRun(ciRunId, next);
    return next;
  }

  async function readRun(ciRunId: string): Promise<AnchorProductionRun | null> {
    return readJsonFile<AnchorProductionRun>(path.join(await anchorDir(ciRunId), 'run.json'));
  }

  async function readContract(ciRunId: string): Promise<AnchorProductionContract | null> {
    return readJsonFile<AnchorProductionContract>(path.join(await anchorDir(ciRunId), 'contract.json'));
  }

  async function readCandidates(ciRunId: string): Promise<CiAnchorCandidate[]> {
    const dir = path.join(await anchorDir(ciRunId), 'candidates');
    const files = await listJsonFiles(dir);
    const out: CiAnchorCandidate[] = [];
    for (const file of files) {
      const c = await readJsonFile<CiAnchorCandidate>(path.join(dir, file));
      if (c) out.push(c);
    }
    return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async function readApproval(ciRunId: string): Promise<ApprovedVisualAnchor | null> {
    return readJsonFile<ApprovedVisualAnchor | null>(path.join(await anchorDir(ciRunId), 'approval.json'));
  }

  async function readParentRunRecord(ciRunId: string): Promise<Record<string, unknown> | null> {
    return readJsonFile<Record<string, unknown>>(path.join(await runRootOf(ciRunId), 'runtime', 'run.json'));
  }

  async function readApprovalHistory(ciRunId: string): Promise<AnchorApprovalHistoryEntry[]> {
    return (await readJsonFile<AnchorApprovalHistoryEntry[]>(path.join(await anchorDir(ciRunId), 'approval-history.json'))) ?? [];
  }

  // ---------------------------------------------------------------------------
  // Parent snapshot -> contract
  // ---------------------------------------------------------------------------

  async function compile(ciRunId: string, parent: AnchorProductionParentSnapshot, candidateCount: number) {
    const result = buildAnchorProductionContract({
      projectId: parent.projectId,
      creativeIntelligenceRunId: ciRunId,
      candidateCount,
      selectedDirectionSnapshot: parent.selectedDirectionSnapshot as never,
      visualCanon: parent.visualCanon as never,
      anchorContract: parent.anchorContract as never,
      lockedAssetKeys: await deps.resolveLockedAssetKeys(parent.projectId, ciRunId),
      selectionRevision: parent.selectionRevision,
    });
    if (!result.contract) {
      // We still persist a synthetic blocked contract so the Web
      // can render the failure surface with the structured reason
      // codes. The CI semantic API does not return one when the
      // compile hard-blocks; we synthesize one here.
      const blockedContract: AnchorProductionContract = {
        schemaVersion: '0.1',
        projectId: parent.projectId,
        creativeIntelligenceRunId: ciRunId,
        selectedDirectionId: parent.selectedDirectionSnapshot
          ? (parent.selectedDirectionSnapshot as { directionId?: string }).directionId ?? 'unknown'
          : 'unknown',
        selectionRevision: parent.selectionRevision,
        canonVersion: 'missing',
        anchorContractVersion: 'missing',
        candidateCount,
        mustDemonstrate: [],
        mustPreserve: [],
        mayExplore: [],
        mustNotChange: [],
        evaluationCriteria: [],
        requiredDNARefs: [],
        requiredGrammarRefs: [],
        lockedAssetRuleRefs: [],
        sourceFingerprint: result.sourceFingerprint,
        productionFingerprint: result.sourceFingerprint,
        status: 'blocked',
        blockedReasonCodes: result.diagnostics.map((d) => d.code),
        authoritative: false,
        mode: 'shadow',
      };
      return { contract: blockedContract, diagnostics: result.diagnostics };
    }
    return { contract: result.contract, diagnostics: result.diagnostics };
  }

  // ---------------------------------------------------------------------------
  // Sub-run lifecycle
  // ---------------------------------------------------------------------------

  async function startAnchorProduction(
    ciRunId: string,
    options: { candidateCount?: number; apiProfileId?: string } | undefined,
    parent: AnchorProductionParentSnapshot,
  ): Promise<AnchorProductionWorkspace> {
    if (!parent.selectedDirectionSnapshot || !parent.visualCanon || !parent.anchorContract) {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.SELECTION_REQUIRED, '请先完成 Direction 选择并构�?Visual Canon');
    }
    const preflight = canStartAnchorProduction(
      parent.selectedDirectionSnapshot as never,
      parent.visualCanon as never,
      parent.anchorContract as never,
      parent.selectionRevision,
    );
    if (!preflight.allowed) {
      throw ciAnchorError(preflight.reason ?? ANCHOR_PRODUCTION_ERROR_CODES.CONTRACT_BLOCKED, 'Anchor Production 启动条件未满足。');
    }
    let requestedCount: number;
    if (options && typeof options.candidateCount === 'number' && Number.isFinite(options.candidateCount)) {
      requestedCount = Math.floor(options.candidateCount);
    } else {
      requestedCount = 0;
    }
    const candidateCount = requestedCount > 0
      ? Math.max(1, Math.min(4, requestedCount))
      : 3;
    const apiProfileId = options?.apiProfileId ?? parent.apiProfileId;

    const now = new Date().toISOString();
    const runId = makeRunId();

    // Stage 1: pending + compile the contract.
    const initialRun: AnchorProductionRun = {
      schemaVersion: 'anchor-production-run-v0.1',
      id: runId,
      creativeIntelligenceRunId: ciRunId,
      projectId: parent.projectId,
      selectedDirectionId: (parent.selectedDirectionSnapshot as { directionId: string }).directionId,
      selectionRevision: parent.selectionRevision,
      canonVersion: 'pending',
      anchorContractVersion: 'pending',
      status: 'pending',
      candidateIds: [],
      imageGenerationRunId: null,
      providerId: null,
      modelId: null,
      apiProfileId,
      createdAt: now,
      startedAt: now,
    };
    await fs.mkdir(await anchorDir(ciRunId), { recursive: true });
    await persistRun(ciRunId, initialRun);

    // Stage 2: compile.
    const compilingRun: AnchorProductionRun = {
      ...initialRun,
      status: 'compiling',
    };
    await persistRun(ciRunId, compilingRun);
    const compiled = await compile(ciRunId, parent, candidateCount);
    await persistContract(ciRunId, compiled.contract);

    if (compiled.contract.status === 'blocked') {
      const failed: AnchorProductionRun = {
        ...compilingRun,
        status: 'failed',
        canonVersion: compiled.contract.canonVersion,
        anchorContractVersion: compiled.contract.anchorContractVersion,
        errorCode: ANCHOR_PRODUCTION_ERROR_CODES.CONTRACT_BLOCKED,
        lastError: compiled.contract.blockedReasonCodes.join(','),
        completedAt: new Date().toISOString(),
      };
      await persistRun(ciRunId, failed);
      return projectWorkspace(failed, compiled.contract, [], null, [], blockersFromDiagnostics(compiled.diagnostics), []);
    }

    // Stage 3: submit to image runtime. The injected boundary
    // returns the per-candidate image metadata. The orchestrator
    // owns the deterministic post-evaluation.
    const generatingRun: AnchorProductionRun = {
      ...compilingRun,
      status: 'generating',
      canonVersion: compiled.contract.canonVersion,
      anchorContractVersion: compiled.contract.anchorContractVersion,
    };
    await persistRun(ciRunId, generatingRun);

    const lockedAssetKeys = await deps.resolveLockedAssetKeys(parent.projectId, ciRunId);
    const candidateIds = Array.from({ length: candidateCount }, () => makeCandidateId('cand'));
    const compiledPrompt = compilePromptFromContract(compiled.contract);
    let submission;
    try {
      submission = await deps.submitAnchorGeneration({
        projectId: parent.projectId,
        apiProfileId,
        providerId: parent.provider,
        modelId: parent.model,
        contract: compiled.contract,
        compiledPrompt,
        aspectRatio: '16:9',
        candidateIds,
        lockedAssetKeys,
      });
    } catch (err) {
      // Mark the sub-run as failed; the parent CI main run is NOT
      // touched (Spec §45). Re-throw so the caller (and the
      // application service) can surface the error.
      const failureMessage = (err as Error)?.message ?? 'unknown error';
      const failed: AnchorProductionRun = {
        ...generatingRun,
        status: 'failed',
        errorCode: ANCHOR_PRODUCTION_ERROR_CODES.GENERATION_FAILED,
        lastError: failureMessage,
        completedAt: new Date().toISOString(),
      };
      await persistRun(ciRunId, failed);
      throw err;
    }

    const candidates: CiAnchorCandidate[] = submission.candidates.map((c, index) => {
      const evalInput: EvaluateAnchorCandidateInput = {
        candidate: {
          schemaVersion: 'anchor-candidate-v0.1',
          id: candidateIds[index]!,
          anchorRunId: runId,
          creativeIntelligenceRunId: ciRunId,
          imageId: c.imageId,
          imagePath: c.imagePath,
          thumbnailPath: c.thumbnailPath ?? null,
          imageFingerprint: c.imageFingerprint,
          sourceFingerprint: c.sourceFingerprint,
          status: 'generated',
          evaluation: {
            visualMechanism: 'pass',
            composition: 'pass',
            colorRelationship: 'pass',
            materialRelationship: 'pass',
            identitySafety: 'pass',
            lockedAssetSafety: 'pass',
            prohibitedMutation: 'pass',
            warnings: [],
            blockedReasonCodes: [],
          },
          createdAt: now,
        },
        contract: compiled.contract,
        imageMetadata: {
          imageId: c.imageId,
          imagePath: c.imagePath,
          imageFingerprint: c.imageFingerprint,
          sourceFingerprint: c.sourceFingerprint,
          providerId: submission.providerId,
          modelId: submission.modelId,
          aspectRatio: c.aspectRatio,
        },
        resolvedLockedAssetKeys: lockedAssetKeys,
      };
      const evaluation: CiAnchorCandidateEvaluation = evaluateAnchorCandidate(evalInput);
      return {
        schemaVersion: 'anchor-candidate-v0.1',
        id: candidateIds[index]!,
        anchorRunId: runId,
        creativeIntelligenceRunId: ciRunId,
        imageId: c.imageId,
        imagePath: c.imagePath,
        thumbnailPath: c.thumbnailPath ?? null,
        imageFingerprint: c.imageFingerprint,
        sourceFingerprint: c.sourceFingerprint,
        status: 'generated',
        evaluation,
        createdAt: now,
      };
    });
    for (const cand of candidates) {
      await persistCandidate(ciRunId, cand);
    }

    // Stage 4: completed.
    const completedRun: AnchorProductionRun = {
      ...generatingRun,
      status: 'completed',
      candidateIds: candidates.map((c) => c.id),
      imageGenerationRunId: submission.imageGenerationRunId,
      providerId: submission.providerId,
      modelId: submission.modelId,
      completedAt: new Date().toISOString(),
    };
    await persistRun(ciRunId, completedRun);
    return projectWorkspace(completedRun, compiled.contract, candidates, null, [], [], collectedCandidateWarnings(candidates));
  }

  async function compileAnchorProduction(
    ciRunId: string,
    parent: AnchorProductionParentSnapshot,
  ): Promise<AnchorProductionWorkspace> {
    const existing = await readRun(ciRunId);
    const candidateCount = existing?.candidateIds.length ?? 3;
    const compiled = await compile(ciRunId, parent, candidateCount);
    return projectWorkspace(existing, compiled.contract, [], null, [], blockersFromDiagnostics(compiled.diagnostics), []);
  }

  // ---------------------------------------------------------------------------
  // Approval
  // ---------------------------------------------------------------------------

  async function approveAnchorCandidate(
    ciRunId: string,
    candidateId: string,
    reason: string | undefined,
  ): Promise<AnchorProductionWorkspace> {
    const run = await readRun(ciRunId);
    if (!run) throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.RUN_NOT_FOUND, 'Anchor run 不存在。');
    if (run.status !== 'completed') {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.APPROVAL_INVALID, 'Anchor run 未完成，无法批准');
    }
    const candidates = await readCandidates(ciRunId);
    const target = candidates.find((c) => c.id === candidateId);
    if (!target) {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.CANDIDATE_NOT_FOUND, `Anchor candidate 不存�? ${candidateId}`);
    }
    if (target.status !== 'generated') {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.APPROVAL_INVALID, `Anchor candidate 当前状态不可批�? ${target.status}`);
    }
    if (target.evaluation.blockedReasonCodes.length > 0) {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.APPROVAL_INVALID, `Anchor candidate 命中阻断�? ${target.evaluation.blockedReasonCodes.join(',')}`);
    }
    // The candidate's sourceFingerprint is the contract's sourceFingerprint
    // at generation time. We compare it to the current contract's
    // sourceFingerprint to detect re-compilation under a different
    // canon / direction. We tolerate a "pending" canonVersion (sub-run
    // started before the contract was persisted) for backward compat.
    const currentContract = await readContract(ciRunId);
    if (currentContract && currentContract.sourceFingerprint !== target.sourceFingerprint) {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.APPROVAL_STALE, 'Anchor candidate 来自失效的Canon。');
    }
    const previous = await readApproval(ciRunId);
    const history = await readApprovalHistory(ciRunId);
    const now = new Date().toISOString();
    let nextRevision: number;
    if (!previous) {
      nextRevision = 1;
    } else if (previous.canonVersion !== run.canonVersion || previous.selectionRevision !== run.selectionRevision) {
      // Canon or selection changed since the previous approval �?      // reset the revision counter; the new approval is a fresh
      // authorization. (We do not migrate the previous approval �?      // the spec forbids it.)
      nextRevision = 1;
    } else {
      nextRevision = previous.approvalRevision + 1;
    }
    const approval: ApprovedVisualAnchor = {
      schemaVersion: '0.1',
      projectId: run.projectId,
      creativeIntelligenceRunId: ciRunId,
      anchorRunId: run.id,
      candidateId: target.id,
      imageId: target.imageId,
      selectedDirectionId: run.selectedDirectionId,
      selectionRevision: run.selectionRevision,
      canonVersion: run.canonVersion,
      approvedBy: 'user',
      approvedAt: now,
      approvalRevision: nextRevision,
      sourceFingerprint: target.sourceFingerprint,
      authoritative: false,
    };
    // Supersede previous history entry (preserve audit trail).
    if (previous) {
      const superseded: AnchorApprovalHistoryEntry = {
        revision: previous.approvalRevision,
        candidateId: previous.candidateId,
        imageId: previous.imageId,
        selectedDirectionId: previous.selectedDirectionId,
        selectionRevision: previous.selectionRevision,
        canonVersion: previous.canonVersion,
        approvedAt: previous.approvedAt,
        approvedBy: previous.approvedBy,
        supersededBy: previous.canonVersion !== run.canonVersion
          ? 'canon_change'
          : previous.selectionRevision !== run.selectionRevision
            ? 'direction_change'
            : 're_approval',
      };
      const nextHistory = [...history.filter((h) => h.revision !== superseded.revision), superseded];
      await persistApprovalHistory(ciRunId, nextHistory);
      const newEntry: AnchorApprovalHistoryEntry = {
        revision: approval.approvalRevision,
        candidateId: approval.candidateId,
        imageId: approval.imageId,
        selectedDirectionId: approval.selectedDirectionId,
        selectionRevision: approval.selectionRevision,
        canonVersion: approval.canonVersion,
        approvedAt: approval.approvedAt,
        approvedBy: approval.approvedBy,
        ...(reason ? { supersededBy: 'manual' as const } : {}),
      };
      await persistApprovalHistory(ciRunId, [...nextHistory, newEntry]);
    } else {
      const newEntry: AnchorApprovalHistoryEntry = {
        revision: approval.approvalRevision,
        candidateId: approval.candidateId,
        imageId: approval.imageId,
        selectedDirectionId: approval.selectedDirectionId,
        selectionRevision: approval.selectionRevision,
        canonVersion: approval.canonVersion,
        approvedAt: approval.approvedAt,
        approvedBy: approval.approvedBy,
      };
      await persistApprovalHistory(ciRunId, [...history, newEntry]);
    }
    await persistApproval(ciRunId, approval);
    deps.log?.('info', JSON.stringify({
      event: 'CI_ANCHOR_APPROVED',
      ciRunId,
      anchorRunId: run.id,
      candidateId: target.id,
      approvalRevision: nextRevision,
      reason: reason ?? null,
    }));
    return projectWorkspace(run, await readContract(ciRunId), candidates, approval, await readApprovalHistory(ciRunId), [], collectedCandidateWarnings(candidates));
  }

  async function rejectAnchorCandidate(
    ciRunId: string,
    candidateId: string,
  ): Promise<AnchorProductionWorkspace> {
    const run = await readRun(ciRunId);
    if (!run) throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.RUN_NOT_FOUND, 'Anchor run 不存在。');
    const candidates = await readCandidates(ciRunId);
    const target = candidates.find((c) => c.id === candidateId);
    if (!target) throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.CANDIDATE_NOT_FOUND, `Anchor candidate 不存�? ${candidateId}`);
    if (target.status !== 'generated') {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.APPROVAL_INVALID, `Anchor candidate 状态不可拒�? ${target.status}`);
    }
    const updated: CiAnchorCandidate = { ...target, status: 'rejected' };
    await persistCandidate(ciRunId, updated);
    const refreshed = candidates.map((c) => (c.id === target.id ? updated : c));
    const approval = await readApproval(ciRunId);
    return projectWorkspace(run, await readContract(ciRunId), refreshed, approval, await readApprovalHistory(ciRunId), [], collectedCandidateWarnings(refreshed));
  }

  async function retryAnchorCandidate(
    ciRunId: string,
    candidateId: string | null,
  ): Promise<AnchorProductionWorkspace> {
    const run = await readRun(ciRunId);
    if (!run) throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.RUN_NOT_FOUND, 'Anchor run 不存在。');
    if (run.status !== 'completed' && run.status !== 'failed' && run.status !== 'cancelled') {
      throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.GENERATION_FAILED, 'Anchor run 正在生成中，无法重试');
    }
    const candidates = await readCandidates(ciRunId);
    const contract = await readContract(ciRunId);
    if (!contract) throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.CONTRACT_BLOCKED, 'Anchor 合同不存在。');
    const lockedAssetKeys = await deps.resolveLockedAssetKeys(run.projectId, ciRunId);

    // Retry all (candidateId === null) or a single candidate.
    const targets = candidateId === null
      ? candidates.filter((c) => c.status === 'generated')
      : (() => {
          const c = candidates.find((x) => x.id === candidateId);
          return c && c.status === 'generated' ? [c] : [];
        })();
    if (targets.length === 0) {
      // No-op retry �?return the current state.
      const approval = await readApproval(ciRunId);
      return projectWorkspace(run, contract, candidates, approval, await readApprovalHistory(ciRunId), [], collectedCandidateWarnings(candidates));
    }

    const submitted = await deps.submitAnchorRetryGeneration({
      projectId: run.projectId,
      apiProfileId: run.apiProfileId ?? '',
      providerId: run.providerId ?? '',
      modelId: run.modelId ?? '',
      contract,
      compiledPrompt: compilePromptFromContract(contract),
      aspectRatio: '16:9',
      candidateIds: targets.map((t) => t.id),
      lockedAssetKeys,
      retriedCandidateIds: targets.map((t) => t.id),
    });

    const refreshed: CiAnchorCandidate[] = candidates.map((cand) => {
      const submission = submitted.candidates.find((s) => s.candidateId === cand.id);
      if (!submission) return cand;
      const evaluation = evaluateAnchorCandidate({
        candidate: {
          schemaVersion: 'anchor-candidate-v0.1',
          id: cand.id,
          anchorRunId: run.id,
          creativeIntelligenceRunId: ciRunId,
          imageId: submission.imageId,
          imagePath: submission.imagePath,
          thumbnailPath: submission.thumbnailPath ?? null,
          imageFingerprint: submission.imageFingerprint,
          sourceFingerprint: submission.sourceFingerprint,
          status: 'generated',
          evaluation: cand.evaluation,
          createdAt: new Date().toISOString(),
        },
        contract,
        imageMetadata: {
          imageId: submission.imageId,
          imagePath: submission.imagePath,
          imageFingerprint: submission.imageFingerprint,
          sourceFingerprint: submission.sourceFingerprint,
          providerId: submitted.providerId,
          modelId: submitted.modelId,
          aspectRatio: submission.aspectRatio,
        },
        resolvedLockedAssetKeys: lockedAssetKeys,
      });
      return {
        schemaVersion: 'anchor-candidate-v0.1',
        id: cand.id,
        anchorRunId: run.id,
        creativeIntelligenceRunId: ciRunId,
        imageId: submission.imageId,
        imagePath: submission.imagePath,
        thumbnailPath: submission.thumbnailPath ?? null,
        imageFingerprint: submission.imageFingerprint,
        sourceFingerprint: submission.sourceFingerprint,
        status: 'generated',
        evaluation,
        createdAt: new Date().toISOString(),
      };
    });
    for (const cand of refreshed) {
      await persistCandidate(ciRunId, cand);
    }
    // Retry does NOT replace the existing approval. The previous
    // approval is preserved (Spec §G).
    const approval = await readApproval(ciRunId);
    const updatedRun: AnchorProductionRun = {
      ...run,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    await persistRun(ciRunId, updatedRun);
    return projectWorkspace(updatedRun, contract, refreshed, approval, await readApprovalHistory(ciRunId), [], collectedCandidateWarnings(refreshed));
  }

  async function cancelAnchorProduction(ciRunId: string): Promise<AnchorProductionWorkspace> {
    const run = await readRun(ciRunId);
    if (!run) throw ciAnchorError(ANCHOR_PRODUCTION_ERROR_CODES.RUN_NOT_FOUND, 'Anchor run 不存在。');
    if (run.status === 'completed' || run.status === 'cancelled') {
      // Idempotent cancel.
      const approval = await readApproval(ciRunId);
      return projectWorkspace(run, await readContract(ciRunId), await readCandidates(ciRunId), approval, await readApprovalHistory(ciRunId), [], []);
    }
    if (run.imageGenerationRunId) {
      try {
        await deps.cancelAnchorGeneration(run.imageGenerationRunId);
      } catch (err) {
        deps.log?.('warn', JSON.stringify({
          event: 'CI_ANCHOR_CANCEL_FAILED',
          ciRunId,
          imageGenerationRunId: run.imageGenerationRunId,
          message: (err as Error).message,
        }));
      }
    }
    const updated: AnchorProductionRun = {
      ...run,
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    };
    await persistRun(ciRunId, updated);
    const approval = await readApproval(ciRunId);
    return projectWorkspace(updated, await readContract(ciRunId), await readCandidates(ciRunId), approval, await readApprovalHistory(ciRunId), [], []);
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async function getAnchorProduction(ciRunId: string): Promise<AnchorProductionWorkspace> {
    const run = await readRun(ciRunId);
    const contract = await readContract(ciRunId);
    const candidates = await readCandidates(ciRunId);
    const rawApproval = await readApproval(ciRunId);
    const history = await readApprovalHistory(ciRunId);
    const blockers: string[] = [];
    const warnings: string[] = [];
    if (run && run.status === 'failed' && run.errorCode) blockers.push(run.errorCode);
    if (contract && contract.status === 'blocked' && blockers.length === 0) {
      blockers.push(...contract.blockedReasonCodes);
    }
    // Stale-approval check: if the parent run advanced its
    // selectionRevision or the canon version changed, the previous
    // approval is no longer authoritative. We keep the history but
    // surface the approval as null and add a warning.
    let effectiveApproval: ApprovedVisualAnchor | null = rawApproval;
    if (rawApproval) {
      // The orchestrator's source of truth for selectionRevision /
      // canonVersion is the AnchorProductionRun record; when the
      // parent run advances selectionRevision (selectDirection)
      // and the orchestrator has not been told, the AnchorRun's
      // selectionRevision still matches the previous one. We
      // detect that here by comparing to the parent run's
      // selectionRevision.
      const parentRun = await readParentRunRecord(ciRunId);
      if (parentRun) {
        const parentSelectionRevision = (parentRun as { selectionRevision?: number }).selectionRevision;
        if (
          typeof parentSelectionRevision === 'number'
          && parentSelectionRevision !== rawApproval.selectionRevision
        ) {
          effectiveApproval = null;
          warnings.push('previous_approval_invalidated_direction_change');
        } else if (run && rawApproval.canonVersion !== run.canonVersion) {
          effectiveApproval = null;
          warnings.push('previous_approval_invalidated_canon_change');
        }
      } else if (run && rawApproval.canonVersion !== run.canonVersion) {
        effectiveApproval = null;
        warnings.push('previous_approval_invalidated_canon_change');
      }
    }
    const candidateWarnings = collectedCandidateWarnings(candidates);
    return projectWorkspace(run, contract, candidates, effectiveApproval, history, blockers, [...warnings, ...candidateWarnings]);
  }

  async function listAnchorCandidates(ciRunId: string): Promise<CiAnchorCandidate[]> {
    return readCandidates(ciRunId);
  }

  async function getApprovedAnchor(ciRunId: string): Promise<ApprovedVisualAnchor | null> {
    return readApproval(ciRunId);
  }

  async function getAnchorApprovalHistory(ciRunId: string): Promise<AnchorApprovalHistoryEntry[]> {
    return readApprovalHistory(ciRunId);
  }

  return {
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

// ---------------------------------------------------------------------------
// Workspace projection
// ---------------------------------------------------------------------------

function projectWorkspace(
  run: AnchorProductionRun | null,
  contract: AnchorProductionContract | null,
  candidates: CiAnchorCandidate[],
  approved: ApprovedVisualAnchor | null,
  history: AnchorApprovalHistoryEntry[],
  blockers: string[],
  warnings: string[],
): AnchorProductionWorkspace {
  return {
    run,
    contract,
    candidates,
    approvedAnchor: approved,
    approvalHistory: history,
    blockers,
    warnings,
  };
}

function blockersFromDiagnostics(diagnostics: Array<{ code: string; message: string }>): string[] {
  return diagnostics.map((d) => d.message || d.code);
}

function collectedCandidateWarnings(candidates: CiAnchorCandidate[]): string[] {
  const out: string[] = [];
  for (const c of candidates) {
    for (const w of c.evaluation.warnings) {
      out.push(`${c.id}:${w}`);
    }
  }
  return out;
}

/**
 * Compile a deterministic prompt from the contract. The image
 * runtime expects a string; this function is pure so the test
 * suite can pin its output.
 */
export function compilePromptFromContract(contract: AnchorProductionContract): string {
  const lines: string[] = [];
  lines.push('// CI-W2 Anchor Production');
  lines.push('// Visual Confirmation �?NOT a final deliverable.');
  lines.push('');
  lines.push('# Creative Direction');
  lines.push(`Selected direction: ${contract.selectedDirectionId} (selection revision ${contract.selectionRevision})`);
  lines.push('');
  lines.push('# Must Demonstrate');
  for (const item of contract.mustDemonstrate) lines.push(`- ${item}`);
  lines.push('');
  lines.push('# Must Preserve');
  for (const item of contract.mustPreserve) lines.push(`- ${item}`);
  lines.push('');
  lines.push('# May Explore');
  for (const item of contract.mayExplore) lines.push(`- ${item}`);
  lines.push('');
  lines.push('# Must Not Change');
  for (const item of contract.mustNotChange) lines.push(`- ${item}`);
  lines.push('');
  lines.push('# Evaluation Criteria');
  for (const c of contract.evaluationCriteria) lines.push(`- [${c.severity}] ${c.criterion}`);
  lines.push('');
  lines.push('# Required DNA refs');
  for (const ref of contract.requiredDNARefs) lines.push(`- ${ref}`);
  lines.push('');
  lines.push('# Required Grammar refs');
  for (const ref of contract.requiredGrammarRefs) lines.push(`- ${ref}`);
  lines.push('');
  lines.push('# Locked Asset Rules (preserve)');
  for (const ref of contract.lockedAssetRuleRefs) lines.push(`- ${ref}`);
  return lines.join('\n');
}
