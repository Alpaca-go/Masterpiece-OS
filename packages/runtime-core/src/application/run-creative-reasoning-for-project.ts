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
  CreativeReasoningQualificationBudget,
  CreativeReasoningStopAfter
} from './creative-reasoning-service.ts';
import type { ProviderCredentials } from '../shared/types.ts';

import { loadPlanningStrategicEvidenceForProject, loadPlanningStrategicEvidenceFromContext } from './planning-strategic-evidence-loader.ts';
import type { ProjectStore } from './project-store.ts';
import type { ProjectTruthModel } from '@masterpiece/creative-intelligence/truth/index.ts';
import type { NeedItem } from '@masterpiece/creative-intelligence/need-intelligence/index.ts';
import type { EvidenceLedgerSnapshot } from '@masterpiece/creative-intelligence/evidence/index.ts';
import {
  buildSourceDocumentId,
  computeStructuredExtractionCoverage,
  mapRoleToSourceRole,
  type PlanningStrategicClaim
} from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';
import { runNarrativePlanningExtraction } from './narrative-planning-extraction-runner.ts';
import { readPlanningBriefFile } from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';
import { prepareDocumentSet } from '@masterpiece/document-ingestion/document-preparation.js';

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
  stopAfter?: CreativeReasoningStopAfter;
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

  // 3. Load structured planning artifact (regex fast path).
  const structuredArtifact = await loadPlanningStrategicEvidenceForProject(deps.projectStore, input.projectId);
  let planningArtifact = structuredArtifact;

  // 4. CI-W1C.7.5-R1.1 — canonical structured coverage decides
  //    whether narrative extraction is required. Current live
  //    qualification intentionally supports one narrative planning
  //    brief; multi-document narrative extraction remains a later
  //    phase. The registered brief path is read directly and its
  //    parent directory is never scanned.
  const brief = (project.planningBriefFiles ?? [])[0];
  if (structuredArtifact && brief) {
    const absPath = path.join(projectRoot, brief.relativePath);
    const briefContent = await readPlanningBriefFile(absPath);
    const sourceDocument = structuredArtifact.sourceDocuments.find(
      (document) => document.filename === brief.filename
    );
    const documentRole = sourceDocument?.documentRole ?? brief.documentRole;
    const sourceRole = mapRoleToSourceRole(documentRole);
    const sourceDocumentId = buildSourceDocumentId(
      input.projectId,
      sourceRole,
      brief.filename,
      brief.contentHash
    );
    const documentSet = prepareDocumentSet({
      projectId: input.projectId,
      corpus: {
        documents: [{
          id: brief.sourceId,
          filename: brief.filename,
          sourceType: 'planning_document',
          rawText: briefContent.rawText,
          characterCount: briefContent.rawText.length,
          documentRole,
          sections: [{ heading: '全文', content: briefContent.rawText }]
        }]
      }
    });
    const coverage = computeStructuredExtractionCoverage({
      claims: structuredArtifact.claims.filter(
        (claim) => claim.sourceDocumentId === sourceDocumentId
      ),
      chunks: documentSet.chunks,
      rawText: briefContent.rawText
    });

    if (!coverage.sufficient) {
      if (!input.reasonerFactory || !input.readCredentials) {
        throw new Error(
          `PLANNING_NARRATIVE_EXTRACTION_REQUIRED: structured coverage=${coverage.reason}; Strategic=NOT_RUN`
        );
      }
      try {
        const credentials = await input.readCredentials(input.analysisProfileId);
        const reasoner = input.reasonerFactory(credentials);
        const narrativeOutput = await runNarrativePlanningExtraction({
          projectId: input.projectId,
          sourceDocumentId,
          rawText: briefContent.rawText,
          documentRole,
          filename: brief.filename,
          reasoner
        });
        const hybrid = await loadPlanningStrategicEvidenceForProject(
          deps.projectStore,
          input.projectId,
          { narrativeClaims: narrativeOutput.claims }
        );
        if (!hybrid) {
          throw new Error('PLANNING_NARRATIVE_HYBRID_ARTIFACT_MISSING');
        }
        planningArtifact = hybrid;
      } catch (error) {
        throw new Error(
          `PLANNING_NARRATIVE_EXTRACTION_FAILED: ${(error as Error).message}; Strategic=NOT_RUN`
        );
      }
    }
  }
  const planningStrategicEvidence = planningArtifact?.claims ?? [];

  // 5. Hand everything to the service.
  if (!_createService) {
    _createService = (await import('./creative-reasoning-service.ts')).createCreativeReasoningService;
  }
  // CI-W1C.7.4-R2.1 PART G — when the caller supplies a custom
  // reasonerFactory + readCredentials (e.g. the planning-aware
  // test reasoner), we MUST forward them as service `deps` so
  // the service's `runStage` enters the live reasoner path
  // (it checks `deps.reasonerFactory` / `deps.readCredentials`,
  // not the run input).
  const service = _createService({
    outputRoot: deps.outputRoot,
    ...(input.reasonerFactory ? { reasonerFactory: input.reasonerFactory } : {}),
    ...(input.readCredentials ? { readCredentials: input.readCredentials } : {})
  });

  const serviceInput: CreativeReasoningInput = {
    projectId: input.projectId,
    ...(input.stopAfter ? { stopAfter: input.stopAfter } : {}),
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
