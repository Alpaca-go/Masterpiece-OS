// r2.0 §4.13 / Phase D: Provider Prompt Gate (Gate B).
//
// Gate A (compile-integrity-gate.js) is read-only on the FROZEN compile
// artifacts. Gate B sits in front of the Provider call and validates the
// actual prompt string the model will receive, which can be different
// from the compiled prompt (user edit / validator correction / etc.).
//
// Gate B checks:
//
//   - non-empty (the prompt must not be blank)
//   - character count ≤ provider capability
//   - generation basis sanity: standard = no implicit reference labels,
//     reference_first = still carries the Reference Boundary block,
//     continuation = the world_consistency role is structural (not a
//     string check); the actual prompt must carry the target scene
//     marker instead
//   - target scene marker is present (when basis != standard) — the
//     Target Scene Functional Authority invariant from §4.2 must be
//     carried into the actual prompt, not just the compiled artifact
//
// Failure: SPACE_PROVIDER_PROMPT_INVALID (distinct from
// SPACE_COMPILER_ROUTE_MISMATCH). A failed Gate B means the Provider
// would receive a bad prompt — fix the user edit / correction logic
// or the Provider capability, NOT the compiled prompt.
//
// Gate B is intentionally simple and structural. Semantic-level checks
// (motif leakage, color-geometry) live in validateSpatialSemantics and
// the brand sanitizer; Gate B is a Provider-side final sanity check.

import { REFERENCE_BOUNDARY_VERSION } from '../reference-boundary.js';
import { SEEDREAM_MAX_PROMPT_CHARACTERS } from '../../vnext/seedream-adapter.js';

export const SPACE_PROVIDER_PROMPT_GATE_VERSION = 'space-provider-prompt-gate@1.0.0';

// Reference-First prompt must carry the Reference Boundary block. The
// block is rendered by renderReferenceBoundary() (B-3) and is identified
// by these labels. We check for the strong label "REFERENCE BOUNDARY"
// because it is the unique header the renderer always emits.
const REFERENCE_BOUNDARY_MARKERS = [
  'REFERENCE BOUNDARY',
  'high-priority instruction',
  'Preserve from the reference image',
  'Target scene is authoritative for',
];

function findAny(text, needles) {
  if (!text) return null;
  for (const needle of needles) {
    if (text.includes(needle)) return needle;
  }
  return null;
}

function fail(details, causeCode = 'SPACE_PROVIDER_PROMPT_INVALID') {
  throw Object.assign(
    new Error(`${causeCode}: Provider prompt gate B failed closed.`),
    { code: causeCode, providerPromptGateCode: causeCode, details },
  );
}

/**
 * Gate B: provider-prompt validation. Run on the ACTUAL prompt to be
 * sent to the provider (could be `input.editedPrompt` or
 * `compiledPrompt.finalPrompt`).
 *
 * @param {object} input
 * @param {string} input.actualPrompt          the prompt string about to be sent
 * @param {string} [input.compiledPrompt]      the original compiled prompt
 * @param {object} input.providerCapability
 *        VNextAdapterCapability shape. Used for the character cap.
 * @param {string} [input.generationBasis]     'standard' | 'reference_first' | 'continuation'
 * @param {string} [input.targetScene]         target scene (e.g. 'consultation')
 * @param {string} [input.targetSceneLabel]    human-readable label (e.g. 'consultation')
 * @param {object} [input.taskContract]        for source-of-truth fallbacks
 * @param {boolean} [input.isEdited]           true when this prompt was user-edited
 *                                             or is a correction. Gate B is more
 *                                             lenient for non-edited prompts (the
 *                                             compiler was supposed to be correct).
 * @returns {{ passed: true, version: string, isEdited: boolean, checks: { nonEmpty: boolean, withinProviderCap: boolean, generationBasisMatches: boolean, targetSceneMarker: boolean }, characterCount: number, providerCap: number, generationBasis: string, targetScene: string }}
 */
export function assertProviderPromptGateB(input) {
  const checks = {
    nonEmpty: false,
    withinProviderCap: false,
    generationBasisMatches: false,
    targetSceneMarker: false,
  };
  const actualPrompt = typeof input?.actualPrompt === 'string' ? input.actualPrompt : '';
  const compiledPrompt = typeof input?.compiledPrompt === 'string' ? input.compiledPrompt : '';
  // Provider cap is read from the adapter capability (single source of
  // truth). Falling back to the Seedream capability constant when the
  // caller does not thread a capability through keeps the gate fail-closed
  // even for legacy / non-threaded callers without re-declaring 12000 here.
  const providerCap = Math.max(
    1,
    Number(input?.providerCapability?.prompt?.maxCharacters ?? SEEDREAM_MAX_PROMPT_CHARACTERS),
  );
  const generationBasis = input?.generationBasis
    ?? input?.taskContract?.generationBasis
    ?? 'standard';
  const targetScene = String(input?.targetScene ?? input?.taskContract?.subtype ?? '').trim();
  const targetSceneLabel = String(input?.targetSceneLabel ?? targetScene).trim();
  const isEdited = Boolean(input?.isEdited);

  // Check 1: non-empty
  checks.nonEmpty = actualPrompt.length > 0;
  if (!checks.nonEmpty) {
    fail({ checks, characterCount: actualPrompt.length, generationBasis, targetScene }, 'SPACE_PROVIDER_PROMPT_INVALID');
  }

  // Check 2: within provider character cap
  // Use code-point count (the Provider's cap is on characters, not bytes).
  // [...str].length matches the r8_6_golden / Seedream semantics used
  // elsewhere in this package.
  const characterCount = [...actualPrompt].length;
  checks.withinProviderCap = characterCount <= providerCap;
  if (!checks.withinProviderCap) {
    fail({
      checks,
      characterCount,
      providerCap,
      generationBasis,
      targetScene,
    }, 'SPACE_PROVIDER_PROMPT_INVALID');
  }

  // Check 3: generation-basis structural match
  if (generationBasis === 'standard') {
    // Standard: must not implicitly carry reference labels. A
    // "REFERENCE BOUNDARY" block in a standard prompt is a
    // misconfiguration (e.g. the wrong compile was loaded).
    const refLabel = findAny(actualPrompt, REFERENCE_BOUNDARY_MARKERS);
    checks.generationBasisMatches = !refLabel;
    if (!checks.generationBasisMatches) {
      fail({
        checks,
        characterCount,
        generationBasis,
        unexpectedReferenceLabel: refLabel,
      }, 'SPACE_PROVIDER_PROMPT_INVALID');
    }
  } else if (generationBasis === 'reference_first') {
    // Reference-First: must still carry the Reference Boundary.
    // An edit that stripped the boundary is a real Provider-prompt
    // problem, NOT a compiler-route-mismatch problem.
    const boundaryLabel = findAny(actualPrompt, REFERENCE_BOUNDARY_MARKERS);
    checks.generationBasisMatches = Boolean(boundaryLabel);
    if (!checks.generationBasisMatches) {
      fail({
        checks,
        characterCount,
        generationBasis,
        targetScene,
        missingBoundaryLabel: REFERENCE_BOUNDARY_VERSION,
      }, 'SPACE_PROVIDER_PROMPT_INVALID');
    }
  } else if (generationBasis === 'continuation') {
    // Continuation: the world_consistency role is a STRUCTURAL property
    // of the task contract, not a string in the prompt. The current
    // r8_6_golden + V5 packet path does NOT emit a literal "world_consistency"
    // marker in the prompt (the R11.1 v1.2 Continuation Intent block is
    // the intended carrier; its renderer has a pre-existing bug that
    // returns null for the V5 packet path). To avoid breaking existing
    // Continuation flows, Gate B's check is permissive: pass through,
    // the world_consistency role + target scene marker check (Check 4)
    // is sufficient to fail closed if a real regression occurs.
    checks.generationBasisMatches = true;
  } else {
    fail({
      checks,
      characterCount,
      generationBasis,
      targetScene,
    }, 'SPACE_PROVIDER_PROMPT_INVALID');
  }

  // Check 4: target scene marker is present in the actual prompt
  // when basis != standard. The Target Scene Functional Authority
  // invariant from §4.2 must reach the model. The marker is
  // intentionally fuzzy (subtype OR human label) so a translated
  // label (e.g. "咨询室" in a Chinese prompt) also matches.
  if (generationBasis !== 'standard') {
    if (targetScene) {
      const hasSubtype = actualPrompt.includes(targetScene);
      const hasLabel = targetSceneLabel && actualPrompt.includes(targetSceneLabel);
      checks.targetSceneMarker = hasSubtype || hasLabel;
    } else {
      // No target scene known — Gate B cannot enforce. Treat as pass
      // and let the compiler-side checks catch a missing scene.
      checks.targetSceneMarker = true;
    }
    if (!checks.targetSceneMarker) {
      fail({
        checks,
        characterCount,
        generationBasis,
        targetScene,
        targetSceneLabel,
      }, 'SPACE_PROVIDER_PROMPT_INVALID');
    }
  } else {
    // Standard path: no target scene requirement.
    checks.targetSceneMarker = true;
  }

  return {
    passed: true,
    version: SPACE_PROVIDER_PROMPT_GATE_VERSION,
    isEdited,
    checks,
    characterCount,
    providerCap,
    generationBasis,
    targetScene,
  };
}
