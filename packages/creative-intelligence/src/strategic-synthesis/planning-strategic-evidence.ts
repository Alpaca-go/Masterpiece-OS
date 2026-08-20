/**
 * CI-W1C.7.4 — Planning Strategic Evidence Artifact.
 *
 * Source-traced planning claims derived from human-authored planning
 * documents (briefs, brand strategy, market research, product info).
 *
 * Hard rules (spec PART F):
 *  - sourceRole is distinct from epistemicClass.
 *  - sourceRole = PLANNING_STRATEGIC_SOURCE means the claim came from a
 *    planning document. Epistemic class is FACT / USER_REQUIREMENT /
 *    MODEL_INFERENCE / UNKNOWN depending on what the brief actually says.
 *  - Every claim carries sourceDocumentId + chunkRefs + confidence.
 *  - No raw brief text in the artifact. Only normalized claims + refs.
 *
 * Allowed claim keys (per spec PART F):
 *   brand_positioning, brand_role, industry, business_model,
 *   product_service, target_audience, audience_problem,
 *   brand_promise, competitive_context, differentiation_logic,
 *   communication_task, strategic_objective, experience_objective,
 *   transformation_objective, touchpoint_priority, brand_personality
 *
 * Source role rules (per spec PART D):
 *  - creative-brief / brand-strategy / market-research / product-information
 *    → sourceRole = PLANNING_STRATEGIC_SOURCE
 *  - visual-guideline / reference → sourceRole = LEGACY_VISUAL_EVIDENCE
 *    (must NOT be treated as planning; do not include in this artifact)
 *  - unknown → sourceRole = UNKNOWN_SOURCE
 *
 * This module performs NO model call. It is a pure data-shape module.
 */

import { createHash } from 'node:crypto';

import type { ProjectId } from '../integration/contracts.ts';

export type PlanningSourceRole =
  | 'PLANNING_STRATEGIC_SOURCE'
  | 'LEGACY_VISUAL_EVIDENCE'
  | 'UNKNOWN_SOURCE';

/**
 * Allowed claim keys for a planning strategic claim.
 * Adding a new key requires updating the canonical registry.
 */
export const PLANNING_CLAIM_KEYS = Object.freeze([
  'brand_positioning',
  'brand_role',
  'industry',
  'business_model',
  'product_service',
  'target_audience',
  'audience_problem',
  'brand_promise',
  'competitive_context',
  'differentiation_logic',
  'communication_task',
  'strategic_objective',
  'experience_objective',
  'transformation_objective',
  'touchpoint_priority',
  'brand_personality'
] as const);

export type PlanningClaimKey = typeof PLANNING_CLAIM_KEYS[number];

/**
 * Epistemic class is preserved from the source.
 * - FACT: a verifiable claim (e.g., "industry = 中医健康管理与诊疗服务")
 * - USER_REQUIREMENT: a user-stated rule (e.g., "must position as 体验机构")
 * - MODEL_INFERENCE: a model-derived claim (out of scope for planning brief;
 *   planning briefs are human-authored)
 * - UNKNOWN: unresolved / cannot be classified
 */
export type PlanningEpistemicClass = 'FACT' | 'USER_REQUIREMENT' | 'MODEL_INFERENCE' | 'UNKNOWN';

export interface PlanningSourceDocumentRef {
  /** Stable id: `<projectId>:<sourceRole>:<originalFileName>:<contentHash[:16]>` */
  sourceDocumentId: string;
  /** Original filename (sanitized). */
  filename: string;
  /** Document role from classifyDocumentRole. */
  documentRole: string;
  /** Resolved source role. */
  sourceRole: PlanningSourceRole;
  /** SHA-256 of the document's full text (LF-normalized). */
  contentHash: string;
  /** Number of chunks produced from the document. */
  chunkCount: number;
  /** First 200 chars of rawText, for human-readability. NEVER raw binary. */
  excerpt: string;
}

export interface PlanningStrategicClaim {
  /** Stable id: `<sourceDocumentId>:<claimKey>:<contentHash[:16]>` */
  claimId: string;
  /** Canonical claim key (must be in PLANNING_CLAIM_KEYS). */
  key: PlanningClaimKey;
  /** Claim value as a stable string. */
  value: string;
  /** Epistemic class — preserved from source. */
  epistemicClass: PlanningEpistemicClass;
  /** Confidence only if the upstream source provided it. Never invented. */
  confidence?: number;
  /** Back-reference to the source document. */
  sourceDocumentId: string;
  /** Chunk IDs within the source document that contain this claim. */
  chunkRefs: string[];
}

export interface PlanningStrategicEvidenceArtifact {
  schemaVersion: 'ci-w1c.7.4';
  projectId: ProjectId;
  sourceDocuments: PlanningSourceDocumentRef[];
  claims: PlanningStrategicClaim[];
  /** SHA-256 of the canonical claim payload. */
  planningEvidenceFingerprint: string;
  /** SHA-256 of the document set (from prepareDocumentSet). */
  documentSetHash: string;
  generatedAt: string;
}

/**
 * Map document role (from classifyDocumentRole) to planning source role.
 * Per spec PART D.
 */
export function mapRoleToSourceRole(documentRole: string): PlanningSourceRole {
  switch (documentRole) {
    case 'creative-brief':
    case 'brand-strategy':
    case 'market-research':
    case 'product-information':
      return 'PLANNING_STRATEGIC_SOURCE';
    case 'visual-guideline':
    case 'reference':
      return 'LEGACY_VISUAL_EVIDENCE';
    case 'unknown':
    default:
      return 'UNKNOWN_SOURCE';
  }
}

/**
 * Build a stable source document id.
 */
export function buildSourceDocumentId(
  projectId: string,
  sourceRole: PlanningSourceRole,
  filename: string,
  contentHash: string
): string {
  return `${projectId}:${sourceRole}:${filename}:${contentHash.slice(0, 16)}`;
}

/**
 * Build a stable claim id.
 */
export function buildClaimId(
  sourceDocumentId: string,
  claimKey: PlanningClaimKey,
  valueHash: string
): string {
  return `${sourceDocumentId}:${claimKey}:${valueHash.slice(0, 16)}`;
}

/**
 * Canonical SHA-256 of the planning evidence payload.
 * Generated timestamp is excluded from the hash (snapshot metadata must
 * not affect the semantic identity).
 */
export function planningEvidenceFingerprint(
  artifact: Pick<PlanningStrategicEvidenceArtifact, 'projectId' | 'sourceDocuments' | 'claims'>
): string {
  const canonical = {
    projectId: artifact.projectId,
    sourceDocuments: [...artifact.sourceDocuments]
      .map((d) => ({
        sourceDocumentId: d.sourceDocumentId,
        filename: d.filename,
        documentRole: d.documentRole,
        sourceRole: d.sourceRole,
        contentHash: d.contentHash,
        chunkCount: d.chunkCount
      }))
      .sort((a, b) => a.sourceDocumentId.localeCompare(b.sourceDocumentId)),
    claims: [...artifact.claims]
      .map((c) => ({
        claimId: c.claimId,
        key: c.key,
        value: c.value,
        epistemicClass: c.epistemicClass,
        sourceDocumentId: c.sourceDocumentId,
        chunkRefs: [...c.chunkRefs].sort()
      }))
      .sort((a, b) => a.claimId.localeCompare(b.claimId))
  };
  // ESM-only: import crypto statically at module load.
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/**
 * Assert the claim key is in the canonical registry.
 * Throws if an unknown key is used.
 */
export function assertPlanningClaimKey(key: string): asserts key is PlanningClaimKey {
  if (!(PLANNING_CLAIM_KEYS as readonly string[]).includes(key)) {
    throw new Error(`PLANNING-CLAIM-KEY-NOT-REGISTERED: ${key}`);
  }
}

/**
 * Assert the source role is one of the three allowed values.
 */
export function assertPlanningSourceRole(
  role: string
): asserts role is PlanningSourceRole {
  if (
    role !== 'PLANNING_STRATEGIC_SOURCE' &&
    role !== 'LEGACY_VISUAL_EVIDENCE' &&
    role !== 'UNKNOWN_SOURCE'
  ) {
    throw new Error(`PLANNING-SOURCE-ROLE-INVALID: ${role}`);
  }
}
