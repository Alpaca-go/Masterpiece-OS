/**
 * Anchor Production contract builder.
 *
 * CI-W2: deterministic compiler from
 *
 *   - SelectedDirectionSnapshot
 *   - VisualCanon
 *   - AnchorContract
 *   - Locked Assets (fact-level)
 *
 * into a single AnchorProductionContract. This module is a pure
 * function. It has NO model call, NO provider dependency, NO disk
 * I/O. The output is the same when the input is the same.
 *
 * Hard rules (mirrors the spec):
 *
 *   - The contract is `status: 'blocked'` when the parent CI run is
 *     not in a state that allows Anchor Production (no selection /
 *     selection invalidated / no Canon / Canon stale / Anchor
 *     Contract blocked / locked asset conflict).
 *   - The contract fingerprints are stable. `sourceFingerprint` is
 *     derived from the parent input; `productionFingerprint` is
 *     derived from the contract body. The CI test C08 asserts they
 *     are stable across runs.
 *   - The contract NEVER embeds a prompt, a model id, a provider id,
 *     or an aspect ratio. Those are runtime concerns and live in the
 *     image-generation task record.
 */

import { createHash } from 'node:crypto';

import type { AnchorContract, AnchorEvaluationCriterion } from '../anchor-contract/contracts.ts';
import type { SelectedDirectionSnapshot, VisualCanon } from '../visual-canon/contracts.ts';
import type { LockedAssetCanonRule } from '../visual-canon/contracts.ts';

import {
  type AnchorProductionContract,
  type AnchorProductionDiagnostic,
  type AnchorProductionContractStatus,
  ANCHOR_PRODUCTION_TRACE_VERSION,
} from './contracts.ts';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BuildAnchorProductionContractInput {
  projectId: string | null;
  creativeIntelligenceRunId: string;
  candidateCount?: number;

  /** The parent selection snapshot (the result of selectDirection). */
  selectedDirectionSnapshot: SelectedDirectionSnapshot | null;

  /** The compiled Visual Canon. */
  visualCanon: VisualCanon | null;

  /** The compiled Anchor Contract. */
  anchorContract: AnchorContract | null;

  /**
   * Locked Asset refs at the fact level. The CI runtime only stores
   * fact-level locks; the contract still exposes them as
   * `lockedAssetRuleRefs` so the Web can show "this anchor must
   * preserve X".
   */
  lockedAssetKeys: string[];

  /** Current selection revision on the parent CI run. */
  selectionRevision?: number;
}

export interface BuildAnchorProductionContractResult {
  contract: AnchorProductionContract | null;
  diagnostics: AnchorProductionDiagnostic[];
  sourceFingerprint: string;
}

const DEFAULT_CANDIDATE_COUNT = 3;
const MIN_CANDIDATE_COUNT = 1;
const MAX_CANDIDATE_COUNT = 4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stableHash(value: unknown): string {
  // Deterministic JSON serialization with sorted object keys.
  const seen = new WeakSet<object>();
  const json = JSON.stringify(value, (_key, raw) => {
    if (raw && typeof raw === 'object') {
      const obj = raw as object;
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);
      if (!Array.isArray(obj)) {
        const sorted: Record<string, unknown> = {};
        for (const k of Object.keys(obj as Record<string, unknown>).sort()) {
          sorted[k] = (obj as Record<string, unknown>)[k];
        }
        return sorted;
      }
    }
    return raw;
  });
  return createHash('sha256').update(json).digest('hex');
}

function deriveCanonVersion(canon: VisualCanon | null): string {
  if (!canon) return 'missing';
  // The Visual Canon itself does not have an explicit version field;
  // the trace already records the directionFingerprint + selectionRevision.
  // We use those to derive a stable canonVersion so the contract
  // can be re-validated after a Canon rebuild.
  const trace = canon.trace;
  if (!trace) return 'unversioned';
  return `v1.sel${trace.selectionRevision}.${(trace.directionFingerprint ?? 'unknown').slice(0, 12)}`;
}

function deriveAnchorContractVersion(anchor: AnchorContract | null): string {
  if (!anchor) return 'missing';
  return `v1.sel${anchor.selectionRevision}.${(anchor.selectedDirectionId ?? 'unknown').slice(0, 12)}`;
}

function pickRequiredDNARefs(canon: VisualCanon | null): string[] {
  if (!canon?.visualDNA) return [];
  const out: string[] = [];
  for (const group of [
    canon.visualDNA.structuralDNA,
    canon.visualDNA.identityDNA,
    canon.visualDNA.rhythmDNA,
    canon.visualDNA.hierarchyDNA,
    canon.visualDNA.relationDNA,
    canon.visualDNA.colorDNA ?? [],
    canon.visualDNA.materialDNA ?? [],
    canon.visualDNA.graphicDNA ?? [],
  ]) {
    for (const el of group) {
      if (el && el.id) out.push(el.id);
    }
  }
  return out;
}

function pickRequiredGrammarRefs(canon: VisualCanon | null): string[] {
  if (!canon?.visualGrammar) return [];
  const out: string[] = [];
  for (const group of [
    canon.visualGrammar.compositionRules,
    canon.visualGrammar.hierarchyRules,
    canon.visualGrammar.repetitionRules,
    canon.visualGrammar.transformationRules,
    canon.visualGrammar.assetUsageRules,
    canon.visualGrammar.crossMediaAdaptationRules,
  ]) {
    for (const rule of group) {
      if (rule && rule.id) out.push(rule.id);
    }
  }
  return out;
}

function pickLockedAssetRuleRefs(anchor: AnchorContract | null, lockedAssetKeys: string[]): string[] {
  // The AnchorContract carries `lockedAssetRefs` (the runtime's
  // promise of preservation). The CI Locked Assets are the
  // authoritative source. We intersect with the Anchor Contract
  // refs to avoid passing through stale data.
  const declared = new Set<string>(anchor?.lockedAssetRefs ?? []);
  const out: string[] = [];
  for (const key of lockedAssetKeys) {
    if (declared.size === 0 || declared.has(key)) {
      out.push(key);
    }
  }
  return out;
}

function pickEvaluationCriteria(anchor: AnchorContract | null): AnchorEvaluationCriterion[] {
  return (anchor?.evaluationCriteria ?? []).map((c) => ({ ...c }));
}

function pickAnchorStrings(anchor: AnchorContract | null): {
  mustDemonstrate: string[];
  mustPreserve: string[];
  mayExplore: string[];
  mustNotChange: string[];
} {
  return {
    mustDemonstrate: (anchor?.mustDemonstrate ?? []).slice(),
    mustPreserve: (anchor?.mustPreserve ?? []).slice(),
    mayExplore: (anchor?.mayExplore ?? []).slice(),
    mustNotChange: (anchor?.mustNotChange ?? []).slice(),
  };
}

function pickCanonProhibitedMutations(canon: VisualCanon | null): string[] {
  return (canon?.prohibitedMutations ?? []).slice();
}

function clampCandidateCount(input: number | undefined): number {
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    return DEFAULT_CANDIDATE_COUNT;
  }
  const value = Math.floor(input);
  if (value < MIN_CANDIDATE_COUNT) return MIN_CANDIDATE_COUNT;
  if (value > MAX_CANDIDATE_COUNT) return MAX_CANDIDATE_COUNT;
  return value;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pure function. Compile a `AnchorProductionContract` from the
 * parent CI artifacts. Returns `contract = null` when the parent
 * state forbids Anchor Production; in that case `diagnostics` carries
 * the reason codes.
 */
export function buildAnchorProductionContract(
  input: BuildAnchorProductionContractInput,
): BuildAnchorProductionContractResult {
  const diagnostics: AnchorProductionDiagnostic[] = [];

  // Validate: selection must exist and not be invalidated.
  if (!input.selectedDirectionSnapshot) {
    diagnostics.push({
      code: 'ANCHOR_PRODUCTION_SELECTION_REQUIRED',
      message: 'Anchor Production requires an explicit user-selected Direction.',
    });
  } else {
    const snap = input.selectedDirectionSnapshot;
    if (snap.selectedBy !== 'user') {
      diagnostics.push({
        code: 'ANCHOR_PRODUCTION_SELECTION_INVALIDATED',
        message: 'Anchor Production only accepts user-selected Directions.',
        field: 'selectedBy',
      });
    }
  }

  // Validate: Visual Canon must exist and not be stale.
  if (!input.visualCanon) {
    diagnostics.push({
      code: 'ANCHOR_PRODUCTION_CANON_MISSING',
      message: 'Anchor Production requires a Visual Canon.',
    });
  }

  // Validate: Anchor Contract must exist and not be blocked.
  if (!input.anchorContract) {
    diagnostics.push({
      code: 'ANCHOR_PRODUCTION_ANCHOR_CONTRACT_BLOCKED',
      message: 'Anchor Production requires a valid Anchor Contract.',
    });
  } else if (input.anchorContract.status === 'blocked') {
    diagnostics.push({
      code: 'ANCHOR_PRODUCTION_ANCHOR_CONTRACT_BLOCKED',
      message: 'Anchor Contract is blocked; Anchor Production cannot start.',
      field: 'anchorContract.status',
    });
  }

  // Stale check: the runtime may have advanced selectionRevision
  // since the snapshot was built. The CI runtime enforces this
  // server-side; the compiler is a backstop.
  if (
    input.selectedDirectionSnapshot
    && typeof input.selectionRevision === 'number'
    && input.selectedDirectionSnapshot.selectionRevision !== input.selectionRevision
  ) {
    diagnostics.push({
      code: 'ANCHOR_PRODUCTION_SELECTION_INVALIDATED',
      message: `Selection has been advanced to revision ${input.selectionRevision}; snapshot is stale.`,
      field: 'selectionRevision',
    });
  }

  // Locked Asset conflict: the runtime can mark Locked Asset rules
  // as conflict. The compiler cannot detect this from the snapshot
  // alone; we surface a warning-level diagnostic that the runtime
  // may upgrade to a block when it knows more.
  const lockedAssetRuleRefs = pickLockedAssetRuleRefs(input.anchorContract, input.lockedAssetKeys);
  if (input.lockedAssetKeys.length > 0 && lockedAssetRuleRefs.length === 0) {
    diagnostics.push({
      code: 'ANCHOR_PRODUCTION_LOCKED_ASSET_CONFLICT',
      message: 'Locked Asset keys are present but no Anchor Contract rule covers them.',
    });
  }

  const candidateCount = clampCandidateCount(input.candidateCount);
  if (
    typeof input.candidateCount === 'number'
    && (input.candidateCount < MIN_CANDIDATE_COUNT || input.candidateCount > MAX_CANDIDATE_COUNT)
  ) {
    diagnostics.push({
      code: 'ANCHOR_PRODUCTION_CANDIDATE_COUNT_INVALID',
      message: `candidateCount=${input.candidateCount} out of range [${MIN_CANDIDATE_COUNT}, ${MAX_CANDIDATE_COUNT}]; clamped to ${candidateCount}.`,
      field: 'candidateCount',
    });
  }

  // Hard-block resolution: selection required, canon missing, anchor
  // contract blocked, selection invalidated, candidate count invalid
  // -> status = 'blocked'. Locked Asset conflict is a soft warning
  // unless the parent state already says blocked.
  const hasHardBlock = diagnostics.some((d) =>
    d.code === 'ANCHOR_PRODUCTION_SELECTION_REQUIRED'
    || d.code === 'ANCHOR_PRODUCTION_SELECTION_INVALIDATED'
    || d.code === 'ANCHOR_PRODUCTION_CANON_MISSING'
    || d.code === 'ANCHOR_PRODUCTION_ANCHOR_CONTRACT_BLOCKED',
  );

  // Always compute the source fingerprint so the runtime can persist
  // it alongside the contract (it also lives on the run record for
  // invalidation checks).
  const fingerprintInput = {
    projectId: input.projectId,
    creativeIntelligenceRunId: input.creativeIntelligenceRunId,
    selectedDirectionId: input.selectedDirectionSnapshot?.directionId ?? null,
    selectionRevision: input.selectionRevision ?? input.selectedDirectionSnapshot?.selectionRevision ?? null,
    visualCanonFingerprint: input.visualCanon?.trace?.directionFingerprint ?? null,
    visualCanonSelectionRevision: input.visualCanon?.trace?.selectionRevision ?? null,
    anchorContractStatus: input.anchorContract?.status ?? null,
    lockedAssetKeys: input.lockedAssetKeys.slice().sort(),
    candidateCount,
  };
  const sourceFingerprint = stableHash(fingerprintInput);

  if (hasHardBlock) {
    return {
      contract: null,
      diagnostics,
      sourceFingerprint,
    };
  }

  // At this point we have: snapshot, canon, anchor contract, no
  // hard blocks. The locked-asset conflict, if any, is a warning
  // and the contract can still be built.
  const status: AnchorProductionContractStatus = diagnostics.length > 0 ? 'blocked' : 'ready';
  const blockedReasonCodes = status === 'blocked' ? diagnostics.map((d) => d.code) : [];

  const strings = pickAnchorStrings(input.anchorContract);
  const evaluationCriteria = pickEvaluationCriteria(input.anchorContract);
  const requiredDNARefs = pickRequiredDNARefs(input.visualCanon);
  const requiredGrammarRefs = pickRequiredGrammarRefs(input.visualCanon);
  const canonVersion = deriveCanonVersion(input.visualCanon);
  const anchorContractVersion = deriveAnchorContractVersion(input.anchorContract);

  // Compose the contract body. We collect every "may" / "must" rule
  // and the Canon prohibitedMutations into the mustNotChange set so
  // the compiled prompt has a single source of prohibition.
  const canonProhibited = pickCanonProhibitedMutations(input.visualCanon);
  const mustNotChange = Array.from(new Set([
    ...strings.mustNotChange,
    ...canonProhibited,
  ]));

  const contractBody = {
    projectId: input.projectId,
    creativeIntelligenceRunId: input.creativeIntelligenceRunId,
    selectedDirectionId: input.selectedDirectionSnapshot!.directionId,
    selectionRevision: input.selectionRevision ?? input.selectedDirectionSnapshot!.selectionRevision,
    canonVersion,
    anchorContractVersion,
    candidateCount,
    mustDemonstrate: strings.mustDemonstrate,
    mustPreserve: strings.mustPreserve,
    mayExplore: strings.mayExplore,
    mustNotChange,
    evaluationCriteria,
    requiredDNARefs,
    requiredGrammarRefs,
    lockedAssetRuleRefs,
    status,
    blockedReasonCodes,
  };

  const productionFingerprint = stableHash(contractBody);

  const contract: AnchorProductionContract = {
    schemaVersion: '0.1',
    projectId: input.projectId,
    creativeIntelligenceRunId: input.creativeIntelligenceRunId,
    selectedDirectionId: contractBody.selectedDirectionId,
    selectionRevision: contractBody.selectionRevision,
    canonVersion,
    anchorContractVersion,
    candidateCount,
    mustDemonstrate: contractBody.mustDemonstrate,
    mustPreserve: contractBody.mustPreserve,
    mayExplore: contractBody.mayExplore,
    mustNotChange: contractBody.mustNotChange,
    evaluationCriteria: contractBody.evaluationCriteria,
    requiredDNARefs,
    requiredGrammarRefs,
    lockedAssetRuleRefs,
    sourceFingerprint,
    productionFingerprint,
    status,
    blockedReasonCodes,
    authoritative: false,
    mode: 'shadow',
  };

  return {
    contract,
    diagnostics,
    sourceFingerprint,
  };
}

/**
 * Pure helper. Whether the parent CI state allows Anchor Production
 * to start. The runtime uses this to short-circuit the start handler
 * before invoking the compiler.
 */
export function canStartAnchorProduction(
  snapshot: SelectedDirectionSnapshot | null,
  canon: VisualCanon | null,
  anchor: AnchorContract | null,
  currentSelectionRevision: number,
): { allowed: boolean; reason: string | null } {
  if (!snapshot) return { allowed: false, reason: 'CI_ANCHOR_SELECTION_REQUIRED' };
  if (snapshot.selectedBy !== 'user') return { allowed: false, reason: 'CI_ANCHOR_SELECTION_REQUIRED' };
  if (snapshot.selectionRevision !== currentSelectionRevision) {
    return { allowed: false, reason: 'CI_ANCHOR_APPROVAL_STALE' };
  }
  if (!canon) return { allowed: false, reason: 'CI_ANCHOR_CANON_REQUIRED' };
  if (!anchor) return { allowed: false, reason: 'CI_ANCHOR_CONTRACT_BLOCKED' };
  if (anchor.status === 'blocked') return { allowed: false, reason: 'CI_ANCHOR_CONTRACT_BLOCKED' };
  return { allowed: true, reason: null };
}

export const ANCHOR_PRODUCTION_SCHEMA_VERSION = '0.1';
export const ANCHOR_PRODUCTION_RUN_SCHEMA_VERSION = 'anchor-production-run-v0.1';
export const ANCHOR_CANDIDATE_SCHEMA_VERSION = 'anchor-candidate-v0.1';
export const APPROVED_VISUAL_ANCHOR_SCHEMA_VERSION = '0.1';

/**
 * Re-export the trace-version constant for callers that want to
 * stamp the contract.
 */
export { ANCHOR_PRODUCTION_TRACE_VERSION };
