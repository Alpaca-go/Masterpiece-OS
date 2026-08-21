/**
 * CI-W1C.7.5-R1 — Document Visual Context → PlanningStrategicClaim
 * projection adapter.
 *
 * Bridges the CI-3 model-assisted extraction output
 * (`DocumentVisualContext`) into the strategic-synthesis planning
 * claim schema (`PlanningStrategicClaim`).
 *
 * Architecture boundary (per spec PART C §3):
 *   - CI-3 owns the prompt / parse / validate / normalize.
 *   - CI-3 output is the `DocumentVisualContext` produced by
 *     `normalizeExtractedContext`.
 *   - The projection to `PlanningStrategicClaim[]` is a
 *     deterministic, project-agnostic mapping that lives in the
 *     strategic-synthesis namespace. It does NOT call the model.
 *   - The actual model call lives in runtime-core (orchestrator).
 *
 * Field mapping (DVC → PLANNING_CLAIM_KEYS):
 *
 *   brandName              → (no PLANNING_CLAIM_KEYS match; skip — name is
 *                             metadata, not a strategic claim)
 *   industry               → industry
 *   products / services    → product_service (one claim per item; the
 *                             two are merged because PLANNING_CLAIM_KEYS
 *                             treats product+service as a single key)
 *   targetAudience         → target_audience (one claim per item)
 *   pricePositioning       → (no PLANNING_CLAIM_KEYS match; skip)
 *   businessModel          → business_model
 *   brandPersonality       → brand_personality (one claim per item)
 *   visualPreferences      → (no PLANNING_CLAIM_KEYS match; skip —
 *                             visual, not planning)
 *   requiredTouchpoints    → touchpoint_priority (one claim per item)
 *   lockedFacts            → (no PLANNING_CLAIM_KEYS match; lockedFacts
 *                             stay in Truth, not planning. The model may
 *                             also surface them via the
 *                             planning-strategic-evidence `key: value`
 *                             fast path.)
 *   prohibitedDirections   → (no PLANNING_CLAIM_KEYS match; skip — these
 *                             are not positive planning claims)
 *   unknownFields          → UNKNOWN epistemic class on relevant keys
 *
 * Source grounding (per spec PART D §16):
 *   Every projected claim has:
 *     - `sourceDocumentId` (from the planning brief's existing
 *       `buildSourceDocumentId` projection)
 *     - `chunkRefs[]` — a section-level transitional trace derived
 *       from DVC `evidence[].section` (or the DVC field name). It is
 *       NOT exact canonical `prepareDocumentSet` chunk grounding;
 *       canonical chunk-id remapping is a later phase.
 *     - `epistemicClass` — from the existing
 *       `classifyPlanningClaimEpistemicClass` (FACT /
 *       USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN).
 *     - `confidence` — per-key default from the planning
 *       claim key registry.
 *
 * Project-agnostic invariants (spec PART D §18):
 *   - No prompt literals for project names / industry terms /
 *     competitor names.
 *   - The projection is a pure function of the DVC; no
 *     production-code reference to any specific planning doc.
 */

import { createHash } from 'node:crypto';

import {
  buildClaimId,
  type PlanningClaimKey,
  type PlanningStrategicClaim,
  PLANNING_CLAIM_KEYS,
} from './planning-strategic-evidence.ts';
import { classifyPlanningClaimEpistemicClass } from './epistemic-classifier.ts';

// Local mirror of DVC's `EvidenceEntry`. The production
// DocumentVisualContext type is in CI-3
// (`document-intelligence/contracts.ts`). The strategic-synthesis
// package does NOT import from `document-intelligence` to keep
// the dependency direction (CI-3 → strategic-synthesis is fine;
// strategic-synthesis → document-intelligence would be a
// circular dep risk in the CI monorepo). So we mirror the
// fields we actually need. The runtime-core caller passes a
// structurally-typed DVC and the structural type-checks pass.
interface DvcEvidenceEntry {
  field: string;
  documentId: string;
  filename: string;
  section: string;
  summary: string;
}

interface DvcLike {
  brandName?: string;
  industry?: string;
  products?: string[];
  services?: string[];
  targetAudience?: string[];
  pricePositioning?: string | null;
  businessModel?: string | null;
  brandPersonality?: string[];
  visualPreferences?: string[];
  requiredTouchpoints?: string[];
  lockedFacts?: string[];
  prohibitedDirections?: string[];
  unknownFields?: string[];
  evidence?: DvcEvidenceEntry[];
}

// Per-key default confidence. Mirrors the structured path's
// defaultConfidence in `build-planning-strategic-evidence.ts`.
const DEFAULT_CONFIDENCE: Record<PlanningClaimKey, number> = {
  industry: 0.8,
  brand_positioning: 0.7,
  brand_role: 0.7,
  business_model: 0.7,
  product_service: 0.7,
  target_audience: 0.7,
  audience_problem: 0.6,
  brand_promise: 0.6,
  competitive_context: 0.6,
  differentiation_logic: 0.6,
  communication_task: 0.6,
  strategic_objective: 0.7,
  experience_objective: 0.6,
  transformation_objective: 0.6,
  touchpoint_priority: 0.6,
  brand_personality: 0.6,
};

// Map DVC field name → list of PLANNING_CLAIM_KEYS targets.
// One DVC field can map to multiple planning claim keys
// (e.g., `products` and `services` both → `product_service`).
// Each list entry produces its own claim row.
const DVC_FIELD_TO_CLAIM_KEYS: Record<string, readonly PlanningClaimKey[]> = {
  industry: ['industry'],
  products: ['product_service'],
  services: ['product_service'],
  targetAudience: ['target_audience'],
  businessModel: ['business_model'],
  brandPersonality: ['brand_personality'],
  requiredTouchpoints: ['touchpoint_priority'],
  // Fields without a PLANNING_CLAIM_KEYS match are intentionally
  // omitted:
  //   brandName, pricePositioning, visualPreferences, lockedFacts,
  //   prohibitedDirections, unknownFields
};

const CLAIM_KEY_SET = new Set<string>(PLANNING_CLAIM_KEYS as readonly string[]);
const isClaimKey = (k: string): k is PlanningClaimKey => CLAIM_KEY_SET.has(k);

/**
 * Project a single DVC top-level field value (a string or
 * string[]) into 0..N planning claim rows. The DVC value is
 * NOT a paraphrase of the source — the value IS the source's
 * statement. Each item (for array fields) becomes its own
 * claim.
 */
function projectDvcFieldToClaims(args: {
  dvcField: string;
  values: string | string[];
  sourceDocumentId: string;
  documentRole: string;
  evidence?: DvcEvidenceEntry;
}): PlanningStrategicClaim[] {
  const { dvcField, values, sourceDocumentId, documentRole, evidence } = args;
  const claimKeys = DVC_FIELD_TO_CLAIM_KEYS[dvcField];
  if (!claimKeys || claimKeys.length === 0) return [];
  const items = Array.isArray(values) ? values : [values];
  const out: PlanningStrategicClaim[] = [];
  for (const valueRaw of items) {
    const value = typeof valueRaw === 'string' ? valueRaw.trim() : '';
    if (!value) continue;
    for (const claimKey of claimKeys) {
      if (!isClaimKey(claimKey)) continue;
      // claimId is content-hash-based. Use sha256(value + key) to
      // keep it stable across runs (same input → same claimId).
      const valueHash = sha256Sync(value + '::' + claimKey);
      const epistemicClass = classifyPlanningClaimEpistemicClass({
        value,
        lineText: `${dvcField}: ${value}`,
        documentRole
      });
      const chunkRefs = evidence?.section ? [evidence.section] : [dvcField];
      out.push({
        claimId: buildClaimId(sourceDocumentId, claimKey, valueHash),
        key: claimKey,
        value,
        epistemicClass,
        confidence: DEFAULT_CONFIDENCE[claimKey],
        sourceDocumentId,
        chunkRefs
      });
    }
  }
  return out;
}

/**
 * Project a DVC `evidence[]` entry into 0..1 planning claim
 * rows. The entry's `field` name is mapped to the appropriate
 * PLANNING_CLAIM_KEYS. This handles the case where the
 * evidence references a planning-relevant field (e.g.,
 * `field: "brand_personality"`, `field: "target_audience"`)
 * that was not in the DVC top-level fields. The model may
 * also surface planning claims as evidence items with
 * custom field names; we conservatively pass through
 * planning-key matches.
 */
function projectDvcEvidenceToClaims(args: {
  entry: DvcEvidenceEntry;
  sourceDocumentId: string;
  documentRole: string;
}): PlanningStrategicClaim[] {
  const { entry, sourceDocumentId, documentRole } = args;
  // The evidence's `field` is the DVC field name. Map it to
  // PLANNING_CLAIM_KEYS via the same DVC_FIELD_TO_CLAIM_KEYS table.
  const claimKeys = DVC_FIELD_TO_CLAIM_KEYS[entry.field];
  if (!claimKeys || claimKeys.length === 0) return [];
  // The `summary` is the model's paraphrase of the source. We
  // use it as the claim value (the source-traceable fact).
  const value = entry.summary.trim();
  if (!value) return [];
  const out: PlanningStrategicClaim[] = [];
  for (const claimKey of claimKeys) {
    if (!isClaimKey(claimKey)) continue;
    const valueHash = sha256Sync(value + '::' + claimKey);
    const epistemicClass = classifyPlanningClaimEpistemicClass({
      value,
      lineText: `${entry.field}: ${value}`,
      documentRole
    });
    out.push({
      claimId: buildClaimId(sourceDocumentId, claimKey, valueHash),
      key: claimKey,
      value,
      epistemicClass,
      confidence: DEFAULT_CONFIDENCE[claimKey],
      sourceDocumentId,
      chunkRefs: [entry.section || entry.field]
    });
  }
  return out;
}

function sha256Sync(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Public projection entry point.
 *
 * @param dvc            The validated DocumentVisualContext
 *                        (structurally-typed; CI-3 type allowed).
 * @param sourceDocumentId The planning-brief's `sourceDocumentId`
 *                        (from `buildSourceDocumentId`).
 * @param documentRole   The DVC's `documentRole` (used by the
 *                        epistemic classifier; project-agnostic).
 * @returns A list of `PlanningStrategicClaim[]`. Deduped by
 *          `(key, value, sourceDocumentId)` — first-seen wins.
 *          Order: DVC top-level fields first (in declaration
 *          order), then `evidence[]` entries (in array order).
 */
export function projectDocumentContextToPlanningClaims(args: {
  dvc: DvcLike;
  sourceDocumentId: string;
  documentRole: string;
}): PlanningStrategicClaim[] {
  const { dvc, sourceDocumentId, documentRole } = args;
  const out: PlanningStrategicClaim[] = [];
  const seen = new Set<string>();
  const push = (c: PlanningStrategicClaim): void => {
    const k = `${c.key}::${c.value}::${c.sourceDocumentId}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };

  // 1. Project top-level DVC fields (deterministic order).
  for (const dvcField of Object.keys(DVC_FIELD_TO_CLAIM_KEYS)) {
    const v = (dvc as unknown as Record<string, unknown>)[dvcField];
    if (v == null) continue;
    if (typeof v === 'string') {
      for (const c of projectDvcFieldToClaims({
        dvcField,
        values: v,
        sourceDocumentId,
        documentRole
      })) push(c);
    } else if (Array.isArray(v)) {
      for (const c of projectDvcFieldToClaims({
        dvcField,
        values: v as string[],
        sourceDocumentId,
        documentRole
      })) push(c);
    }
  }

  // 2. Project DVC `evidence[]` entries. These carry per-field
  //    source grounding and may overlap with the top-level
  //    fields. The dedupe above handles overlap.
  for (const entry of dvc.evidence ?? []) {
    if (!entry || typeof entry !== 'object') continue;
    for (const c of projectDvcEvidenceToClaims({
      entry,
      sourceDocumentId,
      documentRole
    })) push(c);
  }

  return out;
}
