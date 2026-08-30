/**
 * CI-W1C.7.4 — Build Planning Strategic Evidence Artifact.
 *
 * Takes a list of registered planning brief records (from
 * `project.planningBriefFiles[]`), reads each from disk, calls
 * the existing `prepareDocumentSet` for chunking, then extracts
 * well-known claim keys from the chunk text.
 *
 * No model call. No raw text in the artifact. Only normalized
 * claims with source refs + confidence + chunk refs.
 *
 * CI-W1C.7.4-R1 PART F — epistemic class is no longer hardcoded
 * per pattern. Each claim is classified by
 * `classifyPlanningClaimEpistemicClass` based on the value +
 * line text, with conservative precedence:
 *   UNKNOWN > USER_REQUIREMENT > MODEL_INFERENCE > FACT.
 *
 * Claim extraction (CI-W1C.7.4 minimal heuristic):
 *  - Look for patterns like `品牌定位: ...` / `行业: ...` /
 *    `brand_positioning: ...` / `industry: ...` etc.
 *  - Only match against PLANNING_CLAIM_KEYS.
 *  - Per-claim epistemic class is classifier-driven (PART F).
 *  - Default confidence = 0.7 (planning-brief well-formed).
 *
 * For CI-W1C.7.5+ a real claim-extraction model can replace this
 * heuristic. This implementation is correct enough to demonstrate
 * the wiring.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildPlanningBriefRecord,
  planningBriefContentHash,
  readPlanningBriefFile,
  type PlanningBriefRecord
} from './planning-source-registration.ts';
import {
  type PlanningClaimKey,
  type PlanningSourceDocumentRef,
  type PlanningStrategicClaim,
  type PlanningStrategicEvidenceArtifact,
  PLANNING_CLAIM_KEYS,
  assertPlanningClaimKey,
  buildClaimId,
  buildSourceDocumentId,
  mapRoleToSourceRole,
  planningEvidenceFingerprint
} from './planning-strategic-evidence.ts';
import { classifyPlanningClaimEpistemicClass } from './epistemic-classifier.ts';
import {
  classifyDocumentRole,
  prepareDocumentSet
} from '@masterpiece/document-ingestion/document-preparation.js';

type DocumentSet = ReturnType<typeof prepareDocumentSet>;

export interface BuildPlanningStrategicEvidenceInput {
  projectId: string;
  /** Working directory (project root). Used to resolve relativePath. */
  projectRoot: string;
  /** Planning brief records from project.planningBriefFiles[]. */
  briefs: PlanningBriefRecord[];
}

interface ExtractPattern {
  key: PlanningClaimKey;
  /** Match either Chinese or English label, case-insensitive. */
  patterns: RegExp[];
  /** Default confidence. Epistemic class is classifier-driven (PART F). */
  defaultConfidence: number;
}

/**
 * Extraction patterns for the 16 PLANNING_CLAIM_KEYS.
 * Each pattern matches a label followed by a value (until end-of-line
 * or a known terminator). Order matters: more specific patterns first.
 *
 * CI-W1C.7.4-R1: epistemicClass is no longer hardcoded here. The
 * classifier (`epistemic-classifier.ts`) reads the value + line
 * text and assigns the class. Default confidence stays per-key.
 */
const EXTRACT_PATTERNS: ExtractPattern[] = [
  { key: 'brand_positioning', patterns: [/^\s*(?:品牌定位|brand\s*positioning|positioning)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.7 },
  { key: 'brand_role', patterns: [/^\s*(?:品牌角色|品牌业务角色|brand\s*role)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.7 },
  { key: 'industry', patterns: [/^\s*(?:行业|industry)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.8 },
  { key: 'business_model', patterns: [/^\s*(?:业务模式|商业模式|business\s*model)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.7 },
  { key: 'product_service', patterns: [/^\s*(?:产品|服务|product\s*(?:or|and|&)\s*service|product|service)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.7 },
  { key: 'target_audience', patterns: [/^\s*(?:目标客群|目标用户|受众|target\s*audience|audience)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.7 },
  { key: 'audience_problem', patterns: [/^\s*(?:客群痛点|受众痛点|audience\s*problem|user\s*problem)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.6 },
  { key: 'brand_promise', patterns: [/^\s*(?:品牌承诺|价值主张|brand\s*promise|value\s*proposition)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.6 },
  { key: 'competitive_context', patterns: [/^\s*(?:竞争框架|竞争环境|竞品|competitive\s*context|competition)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.6 },
  { key: 'differentiation_logic', patterns: [/^\s*(?:差异化逻辑|差异化|differentiation\s*logic|differentiation)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.6 },
  { key: 'communication_task', patterns: [/^\s*(?:传播任务|沟通任务|communication\s*task)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.6 },
  { key: 'strategic_objective', patterns: [/^\s*(?:战略目标|商业目标|strategic\s*objective|business\s*objective)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.7 },
  { key: 'experience_objective', patterns: [/^\s*(?:体验目标|experience\s*objective)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.6 },
  { key: 'transformation_objective', patterns: [/^\s*(?:转型目标|变革目标|transformation\s*objective)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.6 },
  { key: 'touchpoint_priority', patterns: [/^\s*(?:触点优先级|触点|touchpoint\s*priority|touchpoints?)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.6 },
  { key: 'brand_personality', patterns: [/^\s*(?:品牌个性|品牌人格|brand\s*personality|personality)\s*[:：]\s*(.+?)\s*$/imu], defaultConfidence: 0.6 }
];

/**
 * Hash helper (used for claim value fingerprinting).
 */
async function sha256(value: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Extract every claim from a chunk's text.
 * Returns all claims whose line matches a recognized pattern.
 * Order of iteration: lines (top-down) × patterns (declared order).
 * First-seen wins for dedupe at the artifact level.
 *
 * CI-W1C.7.4-R1 PART F: epistemic class is now derived by the
 * classifier (value + line text). Hardcoded per-pattern FACT is gone.
 */
async function extractClaimsFromChunk(
  text: string,
  sourceDocumentId: string,
  chunkId: string,
  documentRole: string
): Promise<PlanningStrategicClaim[]> {
  const claims: PlanningStrategicClaim[] = [];
  for (const line of text.split(/\r?\n/)) {
    for (const { key, patterns, defaultConfidence } of EXTRACT_PATTERNS) {
      for (const pattern of patterns) {
        const match = pattern.exec(line);
        if (match && match[1]) {
          const value = String(match[1]).trim();
          if (!value) continue;
          const valueHash = await sha256(value);
          // PART F: classifier-driven epistemic class.
          const epistemicClass = classifyPlanningClaimEpistemicClass({
            value,
            lineText: line,
            documentRole
          });
          claims.push({
            claimId: buildClaimId(sourceDocumentId, key, valueHash),
            key,
            value,
            epistemicClass,
            confidence: defaultConfidence,
            sourceDocumentId,
            chunkRefs: [chunkId]
          });
          // A line is claimed by the first matching pattern; do not try other patterns for the same line.
          break;
        }
      }
    }
  }
  return claims;
}

/**
 * Build the PlanningStrategicEvidenceArtifact from the input briefs.
 * Reads each brief from disk (or accepts pre-loaded rawText).
 */
export async function buildPlanningStrategicEvidenceArtifact(
  input: BuildPlanningStrategicEvidenceInput
): Promise<PlanningStrategicEvidenceArtifact> {
  const sourceDocuments: PlanningSourceDocumentRef[] = [];
  const claims: PlanningStrategicClaim[] = [];
  const documentSetHashes: string[] = [];
  const claimByKey = new Map<string, PlanningStrategicClaim>();

  for (const brief of input.briefs) {
    // Defensive: skip LEGACY_VISUAL_EVIDENCE / UNKNOWN_SOURCE briefs.
    // They should not reach this builder (registration contract enforces).
    // But the planning evidence builder is robust if any slip through.
    const absolutePath = path.join(input.projectRoot, brief.relativePath);
    let rawText: string;
    try {
      const result = await readPlanningBriefFile(absolutePath);
      rawText = result.rawText;
    } catch (err) {
      // If the file is missing/corrupt, skip with a defensive throw.
      // We do NOT silently fabricate a claim.
      throw new Error(
        `PLANNING-BRIEF-READ-FAILED: ${brief.sourceId} (${brief.filename}): ${(err as Error).message}`
      );
    }

    // 1) Re-derive the content hash. If it does not match the record,
    //    abort (the file on disk is out of sync with project.json).
    const recomputedHash = planningBriefContentHash(rawText);
    if (recomputedHash !== brief.contentHash) {
      throw new Error(
        `PLANNING-BRIEF-CONTENT-HASH-MISMATCH: ${brief.sourceId} (${brief.filename})`
      );
    }

    // 2) Classify document role.
    const classification = classifyDocumentRole({
      id: brief.sourceId,
      filename: brief.filename,
      rawText
    });
    const sourceRole = mapRoleToSourceRole(classification.role);

    // 3) Defensive: refuse to include LEGACY_VISUAL_EVIDENCE /
    //    UNKNOWN_SOURCE briefs in the planning artifact.
    if (sourceRole !== 'PLANNING_STRATEGIC_SOURCE') {
      continue;
    }

    // 4) Use existing prepareDocumentSet to chunk the text.
    const documentSet: DocumentSet = prepareDocumentSet({
      projectId: input.projectId,
      corpus: {
        documents: [
          {
            id: brief.sourceId,
            filename: brief.filename,
            sourceType: 'planning_document',
            rawText,
            characterCount: brief.characterCount,
            documentRole: classification.role,
            sections: [{ heading: '全文', content: rawText }]
          }
        ]
      }
    });
    documentSetHashes.push(documentSet.documentSetHash);

    // 5) Build the source document ref.
    const sourceDocumentId = buildSourceDocumentId(
      input.projectId,
      sourceRole,
      brief.filename,
      brief.contentHash
    );
    const excerpt = rawText.slice(0, 200);
    sourceDocuments.push({
      sourceDocumentId,
      filename: brief.filename,
      documentRole: classification.role,
      sourceRole,
      contentHash: brief.contentHash,
      chunkCount: documentSet.chunks.length,
      excerpt
    });

    // 6) Extract claims from each chunk.
    for (const chunk of documentSet.chunks) {
      // Only process chunks from this document.
      if (chunk.sourceId !== brief.sourceId) continue;
      const chunkClaims = await extractClaimsFromChunk(chunk.text, sourceDocumentId, chunk.chunkId, classification.role);
      for (const claim of chunkClaims) {
        // Dedupe by (key + value + sourceDocumentId). First-seen wins.
        const dedupeKey = `${claim.key}::${claim.value}::${claim.sourceDocumentId}`;
        const existing = claimByKey.get(dedupeKey);
        if (existing) {
          existing.chunkRefs.push(chunk.chunkId);
          existing.chunkRefs.sort();
        } else {
          claimByKey.set(dedupeKey, claim);
        }
      }
    }
  }

  // 7) Materialize claims array (sorted by claimId for determinism).
  for (const claim of claimByKey.values()) {
    claims.push(claim);
  }
  claims.sort((a, b) => a.claimId.localeCompare(b.claimId));

  // 8) Compute artifact-level fingerprint.
  const baseArtifact = {
    projectId: input.projectId,
    sourceDocuments,
    claims
  };
  const artifactFingerprint = planningEvidenceFingerprint(baseArtifact);

  // 9) Document set hash: combine all per-brief documentSetHashes
  //    in sourceId order (deterministic).
  documentSetHashes.sort();
  const documentSetHash = await sha256(documentSetHashes.join('|'));

  return {
    schemaVersion: 'ci-w1c.7.4',
    projectId: input.projectId,
    sourceDocuments,
    claims,
    planningEvidenceFingerprint: artifactFingerprint,
    documentSetHash,
    generatedAt: new Date().toISOString()
  };
}

/**
 * CI-W1C.7.5-R1 — Hybrid planning evidence builder (PART C §10 +
 * §22). Runs the structured (regex) path AND merges in any
 * pre-computed narrative (model-assisted) claims.
 *
 * The narrative path is NOT executed here. The caller (runtime
 * orchestrator) provides the narrative claims as a pre-built
 * list. The hybrid builder's only job is:
 *   1. Run the existing structured path (per `buildPlanningStrategicEvidenceArtifact`).
 *   2. Merge the narrative claims into the claim set.
 *   3. Apply dedupe with a clear precedence rule (see below).
 *   4. Recompute the artifact fingerprint.
 *
 * Dedupe policy (spec PART F §23):
 *   - Exact `claimId` collision: structured wins.
 *   - Same `(claimKey, normalizedValue, sourceDocumentId)`:
 *     higher confidence wins; equal confidence: structured wins.
 *   - Different normalized content is preserved.
 *   - Normalization is conservative: trim + Unicode NFC only;
 *     no case folding, fuzzy matching, or semantic similarity.
 *
 * The narrative path's model output is NOT inspected here. The
 * caller is responsible for the model's prompt / parse /
 * validate / normalize (per the spec PART C §3 boundary:
 * "Model-assisted narrative extraction belongs to CI Document
 * Intelligence, not to `buildPlanningStrategicEvidenceArtifact()`
 * as an ad-hoc second reasoning engine.").
 */
export async function buildPlanningStrategicEvidenceArtifactHybrid(input: {
  projectId: string;
  projectRoot: string;
  briefs: Parameters<typeof buildPlanningStrategicEvidenceArtifact>[0]['briefs'];
  /**
   * Pre-built narrative claims from the model-assisted path.
   * Each claim MUST have a valid `sourceDocumentId` that matches
   * one of the source documents in the structured artifact.
   * Claims with unknown `sourceDocumentId` are dropped (the
   * caller is responsible for keeping this list project-scoped).
   */
  narrativeClaims?: readonly import('./planning-strategic-evidence.ts').PlanningStrategicClaim[];
}): Promise<PlanningStrategicEvidenceArtifact> {
  // 1. Run the structured path.
  const structured = await buildPlanningStrategicEvidenceArtifact({
    projectId: input.projectId,
    projectRoot: input.projectRoot,
    briefs: input.briefs
  });

  if (!input.narrativeClaims || input.narrativeClaims.length === 0) {
    return structured;
  }

  // 2. Build the set of valid sourceDocumentIds from the
  //    structured artifact (so narrative claims with an unknown
  //    source are dropped).
  const validSourceIds = new Set<string>(
    structured.sourceDocuments.map((d) => d.sourceDocumentId)
  );
  const validNarrativeClaims = input.narrativeClaims.filter(
    (c) => typeof c?.claimId === 'string'
      && typeof c?.key === 'string'
      && typeof c?.value === 'string'
      && typeof c?.sourceDocumentId === 'string'
      && validSourceIds.has(c.sourceDocumentId)
  );

  // 3. Merge under the R1.1 contract. Exact claimId collisions
  //    are resolved before semantic-content dedupe, so a
  //    narrative row can never displace a structured row with
  //    the same claimId.
  const structuredClaimIds = new Set(structured.claims.map((c) => c.claimId));
  const normalizeValue = (value: string): string => value.trim().normalize('NFC');
  const contentKey = (c: PlanningStrategicClaim): string =>
    `${c.key}::${normalizeValue(c.value)}::${c.sourceDocumentId}`;
  const confidence = (c: PlanningStrategicClaim): number =>
    typeof c.confidence === 'number' && Number.isFinite(c.confidence)
      ? c.confidence
      : Number.NEGATIVE_INFINITY;
  const byContent = new Map<string, PlanningStrategicClaim>();

  for (const claim of structured.claims) {
    byContent.set(contentKey(claim), claim);
  }
  for (const claim of validNarrativeClaims) {
    if (structuredClaimIds.has(claim.claimId)) continue;
    const key = contentKey(claim);
    const existing = byContent.get(key);
    if (!existing || confidence(claim) > confidence(existing)) {
      byContent.set(key, claim);
    }
    // Equal confidence keeps the existing row. Structured rows
    // are inserted first, so structured wins the specified tie.
  }

  const mergedClaims = Array.from(byContent.values())
    .sort((a, b) => a.claimId.localeCompare(b.claimId));

  // 4. Recompute the artifact fingerprint.
  const baseArtifact = {
    projectId: input.projectId,
    sourceDocuments: structured.sourceDocuments,
    claims: mergedClaims
  };
  const artifactFingerprint = planningEvidenceFingerprint(baseArtifact);
  return {
    schemaVersion: 'ci-w1c.7.4',
    projectId: input.projectId,
    sourceDocuments: structured.sourceDocuments,
    claims: mergedClaims,
    planningEvidenceFingerprint: artifactFingerprint,
    documentSetHash: structured.documentSetHash,
    generatedAt: structured.generatedAt
  };
}
