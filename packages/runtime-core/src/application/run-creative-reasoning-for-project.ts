/**
 * CI-W1C.7.4-R2 — Canonical Project-Level Orchestrator.
 *
 * The single production entrypoint for running Creative Reasoning
 * for a project. It owns ALL IO + orchestration:
 *
 *   projectId
 *   ↓
 *   load Project (project.json)
 *   load Project Truth (project-context/creative-intelligence-shadow/project-truth.json)
 *   load Project Need (project-context/creative-intelligence-shadow/need-intelligence.json)
 *   load Project Evidence (project-context/creative-intelligence-shadow/evidence-ledger.json)
 *   load PlanningStrategicEvidence (project.planningBriefFiles[] → buildPlanningStrategicEvidenceArtifact)
 *   ↓
 *   CreativeReasoningService.run()
 *
 * Hard rules:
 *  - `CreativeReasoningService` MUST NOT directly read project.json
 *    or project-store. Runtime/application owns IO. The service
 *    only consumes in-memory carriers (truth, need, evidence,
 *    planningStrategicEvidence).
 *  - This orchestrator is the ONLY public surface the qualification
 *    script + the main E2E may use. Direct calls to
 *    `loadPlanningStrategicEvidenceForProject`,
 *    `compileStrategicReasoningContext`,
 *    `buildStrategicSynthesisPrompt` are NOT allowed on the
 *    production closure path. They may still be tested
 *    individually.
 *
 * This module performs NO model call. Model invocation lives in
 * `CreativeReasoningService`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  ProjectRecord
} from '../application-contracts.ts';
import type {
  CreativeReasoningInput,
  CreativeReasoningResult,
  CreativeReasoningQualificationBudget
} from './creative-reasoning-service.ts';
import type { ProviderCredentials } from '../shared/types.ts';

import { loadPlanningStrategicEvidenceForProject, loadPlanningStrategicEvidenceFromContext } from './planning-strategic-evidence-loader.ts';
import type { ProjectStore } from './project-store.ts';
import type { ProjectTruthModel } from '@masterpiece/creative-intelligence/truth/index.ts';
import type { NeedItem } from '@masterpiece/creative-intelligence/need-intelligence/index.ts';
import type { EvidenceLedgerSnapshot } from '@masterpiece/creative-intelligence/evidence/index.ts';
import type { PlanningStrategicClaim } from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';

// Lazy import to avoid hard cycle at module load time. The
// creative-reasoning-service is the only production caller of
// `compileStrategicReasoningContext` / `buildStrategicSynthesisPrompt`,
// and the orchestrator wraps the service entrypoint.
let _createService: typeof import('./creative-reasoning-service.ts').createCreativeReasoningService | undefined;

/**
 * Resolved reasoning context for a project. All four carriers are
 * loaded by the orchestrator and handed to the creative-reasoning
 * service in one go.
 */
export interface ProjectReasoningContext {
  project: ProjectRecord;
  truth: ProjectTruthModel;
  needs: NeedItem[];
  evidence: EvidenceLedgerSnapshot;
  planningStrategicEvidence: PlanningStrategicClaim[];
}

export interface RunCreativeReasoningForProjectInput {
  projectId: string;
  analysisProfileId?: string;
  useMock?: boolean;
  reasonerFactory?: (credentials: ProviderCredentials) => import('./creative-reasoning-service.ts').ModelReasoner;
  readCredentials?: (profileId?: string) => Promise<ProviderCredentials>;
  qualificationBudget?: CreativeReasoningQualificationBudget;
}

export interface RunCreativeReasoningForProjectDeps {
  projectStore: Pick<ProjectStore, 'get' | 'paths' | 'remove'>;
  /**
   * Where to persist the live-qualification output snapshots
   * (synthesis.prompt.json + intermediate artifacts). Required.
   */
  outputRoot: (projectId: string) => Promise<string>;
  /**
   * Load the per-project shadow carriers. Production wires this
   * to `<projectDir>/project-context/creative-intelligence-shadow/`.
   * Tests can inject a synthetic loader.
   */
  loadReasoningContext: (project: ProjectRecord, projectRoot: string) => Promise<{
    truth: ProjectTruthModel;
    needs: NeedItem[];
    evidence: EvidenceLedgerSnapshot;
  }>;
}

/**
 * Default production loader for the per-project shadow carriers.
 * Reads the 3 files from
 * `<projectDir>/project-context/creative-intelligence-shadow/`:
 *   - project-truth.json
 *   - need-intelligence.json
 *   - evidence-ledger.json
 *
 * If a file is missing or empty, the loader returns a default
 * empty carrier of the right shape. The orchestrator must NOT
 * fail closed on missing carriers; the project may legitimately
 * have no shadow yet (e.g., a brand-new temp project for E2E).
 */
export async function defaultLoadReasoningContext(
  _project: ProjectRecord,
  projectRoot: string,
): Promise<{
  truth: ProjectTruthModel;
  needs: NeedItem[];
  evidence: EvidenceLedgerSnapshot;
}> {
  const shadowDir = path.join(projectRoot, 'project-context', 'creative-intelligence-shadow');
  const readJson = async <T,>(name: string, fallback: T): Promise<T> => {
    try {
      const text = await fs.readFile(path.join(shadowDir, name), 'utf8');
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  };
  const truth = await readJson<ProjectTruthModel>('project-truth.json', {
    projectId: '',
    facts: [],
    sourceRefs: [],
    schemaVersion: 'project-truth-v0.1',
    generatedAt: '1970-01-01T00:00:00.000Z'
  });
  const needsDoc = await readJson<{ needs?: NeedItem[] }>('need-intelligence.json', { needs: [] });
  const needs = Array.isArray(needsDoc.needs) ? needsDoc.needs : [];
  const evidence = await readJson<EvidenceLedgerSnapshot>('evidence-ledger.json', {
    projectId: '',
    entries: [],
    generatedAt: '1970-01-01T00:00:00.000Z'
  });
  return { truth, needs, evidence };
}

/**
 * Canonical orchestrator. Loads Project + Truth + Need + Evidence
 * + PlanningStrategicEvidence, then calls
 * `CreativeReasoningService.run`.
 *
 * Returns the `CreativeReasoningResult` from the service. The
 * caller (qualification script / main E2E) does NOT need to
 * touch any planning or prompt primitives.
 */
export async function runCreativeReasoningForProject(
  input: RunCreativeReasoningForProjectInput,
  deps: RunCreativeReasoningForProjectDeps
): Promise<CreativeReasoningResult> {
  if (!input.projectId) {
    throw new Error('RUN-CREATIVE-REASONING-NO-PROJECT: projectId is required');
  }
  // 1. Load project.
  const project = await deps.projectStore.get(input.projectId);
  const { root: projectRoot } = await deps.projectStore.paths(input.projectId);

  // 2. Load Truth / Need / Evidence via the injected loader.
  const { truth, needs, evidence } = await deps.loadReasoningContext(project, projectRoot);

  // 3. Load PlanningStrategicEvidence via the R1 production loader.
  //    Returns null if no planning briefs are registered; the
  //    service then receives `planningStrategicEvidence: []`.
  const planningArtifact = await loadPlanningStrategicEvidenceForProject(deps.projectStore, input.projectId);
  const planningStrategicEvidence = planningArtifact?.claims ?? [];

  // 4. Hand everything to the service.
  if (!_createService) {
    _createService = (await import('./creative-reasoning-service.ts')).createCreativeReasoningService;
  }
  const service = _createService({
    outputRoot: deps.outputRoot
  });

  const serviceInput: CreativeReasoningInput = {
    projectId: input.projectId,
    truth,
    needs,
    evidence,
    // CI-W1C.7.4-R2 PART E — planningStrategicEvidence is now an
    // orchestrator-derived carrier, not a hand-constructed
    // argument. The service still accepts it as input, but the
    // production path never asks the test/user to build it.
    planningStrategicEvidence,
    ...(input.analysisProfileId ? { analysisProfileId: input.analysisProfileId } : {}),
    useMock: input.useMock ?? true,
    ...(input.reasonerFactory ? { reasonerFactory: input.reasonerFactory } : {}),
    ...(input.readCredentials ? { readCredentials: input.readCredentials } : {}),
    ...(input.qualificationBudget ? { qualificationBudget: input.qualificationBudget } : {})
  };
  return service.run(serviceInput);
}

/**
 * Convenience factory that wires up the default shadow-carrier
 * loader. Production callers (qualification script, web runtime
 * bridge, etc.) can import this and skip the manual deps wiring.
 */
export function createRunCreativeReasoningForProject(deps: {
  projectStore: Pick<ProjectStore, 'get' | 'paths' | 'remove'>;
  outputRoot: (projectId: string) => Promise<string>;
  loadReasoningContext?: RunCreativeReasoningForProjectDeps['loadReasoningContext'];
}) {
  return (input: RunCreativeReasoningForProjectInput): Promise<CreativeReasoningResult> =>
    runCreativeReasoningForProject(input, {
      projectStore: deps.projectStore,
      outputRoot: deps.outputRoot,
      loadReasoningContext: deps.loadReasoningContext ?? defaultLoadReasoningContext
    });
}

// Re-export the planning-strategic-evidence loaders as the
// canonical public surface. Production code that needs lower-level
// access (tests, custom orchestrators) can use them directly. The
// main E2E + qualification script must NOT bypass the orchestrator.
export { loadPlanningStrategicEvidenceForProject, loadPlanningStrategicEvidenceFromContext };
