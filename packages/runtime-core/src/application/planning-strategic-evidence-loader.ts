/**
 * CI-W1C.7.4-R1 — Production Planning Strategic Evidence Loader.
 *
 * Thin runtime wrapper around the Creative Intelligence artifact
 * builder. This is the PRODUCTION PATH (PART D):
 *
 *   project.planningBriefFiles[]
 *   → buildPlanningStrategicEvidenceArtifact()
 *   → PlanningStrategicEvidenceArtifact
 *
 * Hard rules (spec PART D / PART H):
 *  - FAIL CLOSED on missing files.
 *  - FAIL CLOSED on content-hash mismatch.
 *  - FAIL CLOSED on parse failure.
 *  - If no briefs registered, return null (no artifact, no
 *    fabrication).
 *  - NEVER re-derive the canonical claim payload; the artifact
 *    builder is the single source of truth.
 *
 * The loader is in runtime-core (NOT in creative-intelligence)
 * because:
 *  - Runtime owns the project mutation lifecycle.
 *  - Creative Intelligence is the policy layer (semantic
 *    contracts, epistemic routing). It must not depend on
 *    runtime-core / project-store.
 *
 * This module performs NO model call. (CI-W1C.7.5-R1 extended:
 * the model call lives in `narrative-planning-extraction-runner.ts`,
 * invoked by the orchestrator. The orchestrator passes the
 * pre-built `narrativeClaims` here for the hybrid merge.)
 */

import {
  buildPlanningStrategicEvidenceArtifact,
  buildPlanningStrategicEvidenceArtifactHybrid,
  type PlanningStrategicClaim,
  type PlanningStrategicEvidenceArtifact
} from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';

import type { ProjectRecord } from '../application-contracts.ts';
import type { ProjectStore } from './project-store.ts';

/**
 * Project root + record pair. Either a real project loaded from
 * the project store, or a synthetic one (used by tests).
 */
export interface ProjectContext {
  project: ProjectRecord;
  /** Absolute path to the project root (where planning-briefs/ lives). */
  projectRoot: string;
}

/**
 * Load the planning strategic evidence artifact for a project.
 *
 * Returns null when the project has no planning briefs (normal
 * state for projects without planning documents).
 *
 * CI-W1C.7.5-R1 PART D — accepts an optional `narrativeClaims`
 * list (model-assisted path). When provided, the hybrid builder
 * merges them into the artifact.
 *
 * Throws when:
 *  - A registered file is missing on disk (PLANNING-BRIEF-MISSING)
 *  - A registered file's content hash does not match the record
 *    (PLANNING-BRIEF-CONTENT-HASH-MISMATCH)
 *  - A registered file cannot be parsed
 *    (PLANNING-BRIEF-PARSE-FAILED, PLANNING-PARSER-UNAVAILABLE)
 *
 * The error codes are propagated from the artifact builder /
 * underlying readPlanningBriefFile; they are stable across
 * versions and intended to be inspectable by callers.
 */
export async function loadPlanningStrategicEvidenceForProject(
  store: Pick<ProjectStore, 'get' | 'paths'>,
  projectId: string,
  options?: { narrativeClaims?: readonly PlanningStrategicClaim[] }
): Promise<PlanningStrategicEvidenceArtifact | null> {
  if (!projectId) {
    throw new Error('PLANNING-LOADER-NO-PROJECT: projectId is required');
  }
  const project = await store.get(projectId);
  const { root } = await store.paths(projectId);
  return loadPlanningStrategicEvidenceFromContext(
    { project, projectRoot: root },
    options
  );
}

/**
 * Load the planning strategic evidence artifact from an explicit
 * project context. Useful for tests that construct a synthetic
 * project record + a temp directory.
 *
 * The artifact builder is the single source of truth for claim
 * extraction. The loader's only job is to:
 *  1. Resolve the project root.
 *  2. Read project.planningBriefFiles.
 *  3. Hand the briefs to the artifact builder (hybrid if
 *     narrativeClaims is provided).
 *  4. Return the artifact.
 */
export async function loadPlanningStrategicEvidenceFromContext(
  ctx: ProjectContext,
  options?: { narrativeClaims?: readonly PlanningStrategicClaim[] }
): Promise<PlanningStrategicEvidenceArtifact | null> {
  const { project, projectRoot } = ctx;
  if (!projectRoot) {
    throw new Error('PLANNING-LOADER-NO-ROOT: projectRoot is required');
  }
  const briefs = project.planningBriefFiles ?? [];
  if (briefs.length === 0) return null;
  if (options?.narrativeClaims && options.narrativeClaims.length > 0) {
    return buildPlanningStrategicEvidenceArtifactHybrid({
      projectId: project.id,
      projectRoot,
      briefs,
      narrativeClaims: options.narrativeClaims
    });
  }
  return buildPlanningStrategicEvidenceArtifact({
    projectId: project.id,
    projectRoot,
    briefs
  });
}
