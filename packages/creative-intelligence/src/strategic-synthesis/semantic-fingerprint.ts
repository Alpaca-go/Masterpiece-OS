/**
 * CI-W1C.7.1A — Semantic Input Fingerprint (canonical SHA-256).
 *
 * Replaces the count-only 32-char hex fingerprint that CI-W1C.7.1
 * used. The new fingerprint is a true 64-char lowercase hex SHA-256
 * of a canonical JSON payload built from the actual Planning-First
 * semantic input (not just counts).
 *
 * Why this matters
 * ----------------
 * The CI-W1C.7.1 prompt builders' `inputFingerprint` was a stable
 * JSON of `projectId + factCount + needCount + evidenceCount + …`.
 * Two semantically different inputs with the same counts collided
 * at the qualification level (FP-02..FP-04 in CI-W1C.7.1A spec).
 *
 * The new fingerprint hashes:
 *   - promptVersion
 *   - projectId
 *   - for every authoritative fact: id / key / normalized value / authority
 *   - for every user-requirement fact: id / key / normalized value
 *   - for every locked-identity fact: id / key / normalized value
 *   - for every prohibited-direction fact: id / key / normalized value
 *   - for every Need: id / type / statement / coverage / sorted factRefs / sorted evidenceRefs
 *   - for every Evidence: id / sourceKind / summary / confidence / sorted factRefs
 *   - excluded legacy authority list
 *   - upstream StrategicSynthesisArtifact (for Concept/Direction fingerprints)
 *   - upstream ModelAssistedConceptSet (for Direction fingerprint)
 *
 * Canonicalization
 * ----------------
 *   - object keys are sorted alphabetically at every level
 *   - unordered ref arrays are sorted lexicographically
 *   - line endings are normalized to LF
 *   - null / undefined are normalized to a sentinel "<<null>>" string
 *   - generatedAt / createdAt / updatedAt are EXCLUDED (snapshot metadata
 *     must not affect the semantic hash)
 *   - random IDs are EXCLUDED unless the ID is part of the semantic
 *     trace authority (e.g. fact.id / need.id / evidence.id are
 *     included because they ARE the semantic identity)
 *
 * Determinism
 * -----------
 * `semanticSha256(canonicalize(input))` is deterministic:
 *   - same input → same hash (FP-01)
 *   - any value / statement / summary change with same count → different (FP-02..FP-04)
 *   - generatedAt / createdAt / updatedAt only change → same (FP-05)
 *   - unordered ref order change → same (FP-06)
 *   - promptVersion change → different (FP-07)
 *   - G01 vs G02 → different (FP-08)
 *
 * This module is a pure function. No IO, no model call, no
 * credentials. It is safe to import from any layer.
 */

import { createHash } from 'node:crypto';

import type { ProjectTruthFact } from '../truth/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { EvidenceItem } from '../evidence/contracts.ts';
import type { StrategicSynthesisArtifact } from './contracts.ts';
import type { ModelAssistedConceptSet } from '../model-assisted/contracts.ts';

// ---------------------------------------------------------------------------
// Canonicalization helpers
// ---------------------------------------------------------------------------

/**
 * Sentinel for null / undefined. Using a stable string keeps the
 * canonical JSON deterministic across runtimes.
 */
const NULL_SENTINEL = '<<null>>';

/**
 * Normalize a value to a stable string representation for hashing.
 *
 *  - null / undefined → NULL_SENTINEL
 *  - string          → the string (LF-normalized)
 *  - number / boolean → String(value)
 *  - object / array  → JSON.stringify (caller is expected to have
 *                       already canonicalized nested keys)
 */
function normalizeValue(v: unknown): unknown {
  if (v === null || v === undefined) return NULL_SENTINEL;
  if (typeof v === 'string') return v.replace(/\r\n/g, '\n');
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return v; // arrays / objects are passed through; the recursive caller canonicalizes them
}

/**
 * Sort object keys recursively. Arrays keep their order unless
 * `sortArray` is true.
 */
function sortKeysDeep<T>(value: T, sortArray: boolean): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    const mapped = value.map((v) => sortKeysDeep(v, sortArray));
    return (sortArray ? mapped.slice().sort(compareForSort) : mapped) as unknown as T;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      sorted[k] = sortKeysDeep(obj[k], sortArray);
    }
    return sorted as unknown as T;
  }
  return value;
}

function compareForSort(a: unknown, b: unknown): number {
  const sa = typeof a === 'string' ? a : JSON.stringify(a);
  const sb = typeof b === 'string' ? b : JSON.stringify(b);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

/**
 * Drop metadata timestamps that must NOT affect the semantic
 * fingerprint (FP-05).
 */
const TIMESTAMP_KEYS = new Set([
  'generatedAt',
  'createdAt',
  'updatedAt',
  'lastEditedAt',
  'snapshotAt',
  'now',
  'timestamp',
]);

function stripTimestamps<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripTimestamps(v)) as unknown as T;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) {
      if (TIMESTAMP_KEYS.has(k)) continue;
      out[k] = stripTimestamps(obj[k]);
    }
    return out as unknown as T;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Canonical semantic payload for the Strategic Synthesis prompt.
 * Every field below is hashed into the SHA-256.
 */
export interface StrategicSemanticPayload {
  promptVersion: string;
  projectId: string;
  authoritativeFacts: Array<{
    id: string;
    key: string;
    value: unknown;
    authority: string;
  }>;
  userRequirements: Array<{
    id: string;
    key: string;
    value: unknown;
  }>;
  lockedIdentity: Array<{
    id: string;
    key: string;
    value: unknown;
  }>;
  prohibitedDirections: Array<{
    id: string;
    key: string;
    value: unknown;
  }>;
  needs: Array<{
    id: string;
    type: string;
    statement: string;
    coverage: string;
    factRefs: string[];
    evidenceRefs: string[];
  }>;
  evidence: Array<{
    id: string;
    sourceKind: string;
    summary: string;
    confidence: string;
    factRefs: string[];
  }>;
  legacyVisualEvidenceExcluded: string[];
}

export interface ConceptSemanticPayload extends StrategicSemanticPayload {
  /** The canonical hash of the upstream StrategicSynthesisArtifact. */
  upstreamSynthesisFingerprint: string;
}

export interface DirectionSemanticPayload extends ConceptSemanticPayload {
  /** The canonical hash of the upstream ModelAssistedConceptSet. */
  upstreamConceptSetFingerprint: string;
}

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------

function buildFactsBlock(
  facts: ProjectTruthFact[],
  includeAuthority: boolean,
): Array<Record<string, unknown>> {
  return facts.map((f) => {
    const base: Record<string, unknown> = {
      id: f.id,
      key: typeof f.key === 'string' ? f.key : '',
      value: normalizeValue(f.value),
    };
    if (includeAuthority) base.authority = f.authority;
    return base;
  });
}

function buildNeedsBlock(needs: NeedItem[]): Array<Record<string, unknown>> {
  return needs.map((n) => ({
    id: n.id,
    type: n.type,
    statement: typeof n.statement === 'string' ? n.statement : '',
    coverage: n.coverageRequirement ?? 'unspecified',
    factRefs: Array.isArray(n.factRefs) ? n.factRefs.slice().sort() : [],
    evidenceRefs: Array.isArray(n.evidenceRefs) ? n.evidenceRefs.slice().sort() : [],
  }));
}

function buildEvidenceBlock(evidence: EvidenceItem[]): Array<Record<string, unknown>> {
  return evidence.map((e) => {
    const summary = typeof (e as { content?: unknown }).content === 'string'
      ? ((e as { content?: string }).content as string)
      : (typeof (e as { summary?: unknown }).summary === 'string'
          ? ((e as { summary?: string }).summary as string)
          : '');
    const factRefs = Array.isArray((e as { factRefs?: unknown }).factRefs)
      ? ((e as { factRefs: string[] }).factRefs.slice().sort() as string[])
      : [];
    return {
      id: e.id,
      sourceKind: typeof e.sourceType === 'string' ? e.sourceType : 'unknown',
      summary,
      confidence: typeof e.confidence === 'number' ? e.confidence.toFixed(2) : 'unspecified',
      factRefs,
    };
  });
}

/**
 * Build the canonical Strategic semantic payload.
 *
 * @param input.projectId                     — project id (real)
 * @param input.promptVersion                 — prompt builder version
 * @param input.authoritativeFacts            — Project Truth facts with
 *                                             planning-positive authority
 * @param input.userRequirements              — explicit USER_REQUIREMENT facts
 * @param input.lockedIdentity                — LOCKED facts
 * @param input.prohibitedDirections          — prohibited.* / style.prohibited facts
 * @param input.needs                         — NeedItem[]
 * @param input.evidence                      — EvidenceItem[]
 * @param input.legacyVisualEvidenceExcluded  — excluded authority list
 */
export function buildStrategicSemanticPayload(input: {
  projectId: string;
  promptVersion: string;
  authoritativeFacts: ProjectTruthFact[];
  userRequirements: ProjectTruthFact[];
  lockedIdentity: ProjectTruthFact[];
  prohibitedDirections: ProjectTruthFact[];
  needs: NeedItem[];
  evidence: EvidenceItem[];
  legacyVisualEvidenceExcluded: readonly string[];
}): StrategicSemanticPayload {
  return {
    promptVersion: input.promptVersion,
    projectId: input.projectId,
    authoritativeFacts: buildFactsBlock(input.authoritativeFacts, true) as StrategicSemanticPayload['authoritativeFacts'],
    userRequirements: buildFactsBlock(input.userRequirements, false) as StrategicSemanticPayload['userRequirements'],
    lockedIdentity: buildFactsBlock(input.lockedIdentity, false) as StrategicSemanticPayload['lockedIdentity'],
    prohibitedDirections: buildFactsBlock(input.prohibitedDirections, false) as StrategicSemanticPayload['prohibitedDirections'],
    needs: buildNeedsBlock(input.needs) as StrategicSemanticPayload['needs'],
    evidence: buildEvidenceBlock(input.evidence) as StrategicSemanticPayload['evidence'],
    legacyVisualEvidenceExcluded: Array.from(input.legacyVisualEvidenceExcluded).slice().sort(),
  };
}

/**
 * Build the canonical Concept semantic payload. Includes the
 * upstream StrategicSynthesisArtifact hash so that a different
 * upstream synthesis changes the fingerprint.
 */
export function buildConceptSemanticPayload(input: {
  projectId: string;
  promptVersion: string;
  strategic: StrategicSemanticPayload;
  synthesis: StrategicSynthesisArtifact;
  lockedIdentity: ProjectTruthFact[];
  prohibitedDirections: ProjectTruthFact[];
  sourceFactIds: readonly string[];
}): ConceptSemanticPayload {
  return {
    ...input.strategic,
    promptVersion: input.promptVersion,
    projectId: input.projectId,
    lockedIdentity: buildFactsBlock(input.lockedIdentity, false),
    prohibitedDirections: buildFactsBlock(input.prohibitedDirections, false),
    upstreamSynthesisFingerprint: semanticSha256(
      sortKeysDeep(stripTimestamps(input.synthesis), true),
    ),
  };
}

/**
 * Build the canonical Direction semantic payload. Includes the
 * upstream synthesis + ConceptSet hashes so a different upstream
 * changes the fingerprint.
 */
export function buildDirectionSemanticPayload(input: {
  projectId: string;
  promptVersion: string;
  strategic: StrategicSemanticPayload;
  synthesis: StrategicSynthesisArtifact;
  conceptSet: ModelAssistedConceptSet;
  lockedIdentity: ProjectTruthFact[];
  prohibitedDirections: ProjectTruthFact[];
  sourceFactIds: readonly string[];
}): DirectionSemanticPayload {
  return {
    ...input.strategic,
    promptVersion: input.promptVersion,
    projectId: input.projectId,
    lockedIdentity: buildFactsBlock(input.lockedIdentity, false),
    prohibitedDirections: buildFactsBlock(input.prohibitedDirections, false),
    upstreamSynthesisFingerprint: semanticSha256(
      sortKeysDeep(stripTimestamps(input.synthesis), true),
    ),
    upstreamConceptSetFingerprint: semanticSha256(
      sortKeysDeep(stripTimestamps(input.conceptSet), true),
    ),
  };
}

// ---------------------------------------------------------------------------
// SHA-256 + canonical JSON
// ---------------------------------------------------------------------------

/**
 * Canonicalize + hash. Always returns a 64-char lowercase hex string.
 *
 * Implementation notes:
 *  - We use Node's `crypto.createHash('sha256')` to honor the
 *    spec's "use crypto / SHA-256" requirement. No external
 *    dependency is introduced (Node 20+ ships `crypto` in stdlib).
 *  - The canonical JSON is built from the SORTED-KEYS deep-clone
 *    of the payload with timestamps stripped, using a deterministic
 *    JSON.stringify (no whitespace, UTF-8).
 */
export function semanticSha256(payload: unknown): string {
  const canonical = sortKeysDeep(stripTimestamps(payload), true);
  const canonicalJson = JSON.stringify(canonical);
  return createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

/**
 * Public helper: build a Strategic semantic fingerprint directly
 * from raw inputs. Used by the prompt builders.
 */
export function strategicInputFingerprint(input: {
  projectId: string;
  promptVersion: string;
  authoritativeFacts: ProjectTruthFact[];
  userRequirements: ProjectTruthFact[];
  lockedIdentity: ProjectTruthFact[];
  prohibitedDirections: ProjectTruthFact[];
  needs: NeedItem[];
  evidence: EvidenceItem[];
  legacyVisualEvidenceExcluded: readonly string[];
}): string {
  return semanticSha256(buildStrategicSemanticPayload(input));
}

export function conceptInputFingerprint(input: {
  projectId: string;
  promptVersion: string;
  authoritativeFacts: ProjectTruthFact[];
  userRequirements: ProjectTruthFact[];
  lockedIdentity: ProjectTruthFact[];
  prohibitedDirections: ProjectTruthFact[];
  needs: NeedItem[];
  evidence: EvidenceItem[];
  legacyVisualEvidenceExcluded: readonly string[];
  synthesis: StrategicSynthesisArtifact;
}): string {
  const strategic = buildStrategicSemanticPayload(input);
  return semanticSha256(
    buildConceptSemanticPayload({
      projectId: input.projectId,
      promptVersion: input.promptVersion,
      strategic,
      synthesis: input.synthesis,
      lockedIdentity: input.lockedIdentity,
      prohibitedDirections: input.prohibitedDirections,
      sourceFactIds: [],
    }),
  );
}

export function directionInputFingerprint(input: {
  projectId: string;
  promptVersion: string;
  authoritativeFacts: ProjectTruthFact[];
  userRequirements: ProjectTruthFact[];
  lockedIdentity: ProjectTruthFact[];
  prohibitedDirections: ProjectTruthFact[];
  needs: NeedItem[];
  evidence: EvidenceItem[];
  legacyVisualEvidenceExcluded: readonly string[];
  synthesis: StrategicSynthesisArtifact;
  conceptSet: ModelAssistedConceptSet;
}): string {
  const strategic = buildStrategicSemanticPayload(input);
  return semanticSha256(
    buildDirectionSemanticPayload({
      projectId: input.projectId,
      promptVersion: input.promptVersion,
      strategic,
      synthesis: input.synthesis,
      conceptSet: input.conceptSet,
      lockedIdentity: input.lockedIdentity,
      prohibitedDirections: input.prohibitedDirections,
      sourceFactIds: [],
    }),
  );
}
