// r2.0 §4.13 / Phase D: compile-time integrity gate (Gate A).
//
// Gate A is read-only on the FROZEN compile artifacts
// (`compilations/<taskId>/compiled-prompt.json`,
// `compilations/<taskId>/trace.json`). It validates:
//
//   - compiler mode is the canonical r8_6_golden
//   - compiler id matches the r8_6_golden-emit identifier
//   - all required block IDs are present, in the canonical order
//   - prompt character count is within the baseline budget
//     (5800 ≤ promptCharacters ≤ 7500 for r8_6_golden)
//   - architecture character count meets the minimum (≥ 2500)
//   - reference policy matches generationBasis:
//     - standard: refs=0, referenceMode=text_only
//     - reference_first: refs≥1, referenceMode=reference_assisted,
//       every source is one of
//       [user_explicit, project_asset_explicit, confirmed_output_explicit]
//     - continuation: refs=1, referenceMode=reference_assisted,
//       source=confirmed_generated_output, has continuation metadata
//   - spatial semantic report status === 'pass'
//   - aspect ratio / size match the request
//
// Gate A NEVER reads `input.editedPrompt` or any user-mutable string.
// The user can overwrite the prompt with an edited / correction prompt
// at submit time; that override is the Provider Prompt Gate (Gate B)
// territory. Keeping Gate A pure on the compile artifacts means a
// stale / corrupt / never-compiled task fails closed with
// SPACE_COMPILER_ROUTE_MISMATCH, regardless of what the user typed.
//
// The v2.0 minimum-fix at vnext-service.ts:561-568 (force
// promptCharacters to the compiled prompt length) is preserved as
// Gate A's budget fallback: the compiled prompt length is the only
// authoritative length for the compile-time budget check.
//
// Failure code is the existing SPACE_COMPILER_ROUTE_MISMATCH (and its
// related codes). The previous umbrella function is preserved as
// `assertSpaceGenerationRouteIntegrity` (a thin wrapper) for
// backward compatibility with existing tests.

import { ACTIVE_SPACE_ROUTE_BASELINE } from '../quality-baselines/active-space-route-baseline.js';

export const SPACE_COMPILE_INTEGRITY_GATE_VERSION = 'space-compile-integrity-gate@1.0.0';

function orderedSubset(actual, required) {
  let previous = -1;
  return required.every((id) => {
    const index = actual.indexOf(id);
    if (index <= previous) return false;
    previous = index;
    return true;
  });
}

function sizeMatchesAspectRatio(size, aspectRatio) {
  if (!size || !aspectRatio) return true;
  const dimensions = String(size).match(/^(\d+)[*x](\d+)$/iu);
  const ratio = String(aspectRatio).match(/^(\d+):(\d+)$/u);
  if (!dimensions || !ratio) return false;
  return Number(dimensions[1]) * Number(ratio[2])
    === Number(dimensions[2]) * Number(ratio[1]);
}

function fail(details, causeCode = 'SPACE_COMPILER_ROUTE_MISMATCH') {
  throw Object.assign(
    new Error(`${causeCode}: formal Space compile-time route failed closed.`),
    { code: causeCode, routeIntegrityCode: causeCode, details },
  );
}

/**
 * Gate A: compile-time integrity.
 *
 * Input shape is identical to the previous
 * `assertSpaceGenerationRouteIntegrity` shape. The function is
 * intentionally read-only on the compile artifacts; callers must NOT
 * pass `input.editedPrompt` (the field is ignored even if present).
 *
 * The minimum-fix semantics from vnext-service.ts:561-568 are kept:
 * if `trace.promptCharacters` is missing or NaN, fall back to the
 * literal length of the COMPILED prompt (not the user-edited one).
 * This is the only "what length to budget" decision Gate A makes.
 */
export function assertSpaceGenerationRouteGateA(input, baseline = ACTIVE_SPACE_ROUTE_BASELINE) {
  if (input.taskContract?.deliverableFamily !== 'space') return null;
  const compilerMode = input.compilerMode;
  const canonicalCompilerMode = compilerMode === 'phase9b_quality'
    ? baseline.compilerMode
    : compilerMode;
  const trace = input.trace?.spaceGeneration ?? input.trace ?? {};
  const blockIds = Array.isArray(input.blockIds) ? input.blockIds : [];
  const missingBlockIds = baseline.requiredBlockIds.filter((id) => !blockIds.includes(id));
  const promptCharacters = Number(trace.promptCharacters)
    || Number(input.promptCharacters ?? 0)
    || 0;
  const architectureCharacters = Number(trace.architectureCharacters) || 0;
  const generationBasis = input.taskContract.generationBasis ?? (
    input.taskContract.referenceAssetIds?.length ? 'reference_first' : 'standard'
  );
  const referenceCount = Number(
    input.providerReferenceCount ?? input.taskContract.referenceAssetIds?.length ?? 0,
  );
  const referenceMode = input.referenceMode
    ?? (referenceCount ? 'reference_assisted' : 'text_only');
  const compilerMatched = canonicalCompilerMode === baseline.compilerMode
    && baseline.compilerIds.includes(trace.compilerId);
  const requiredBlocksPresent = missingBlockIds.length === 0;
  const blockOrderMatched = orderedSubset(blockIds, baseline.requiredBlockOrder);
  const promptBudgetMatched = promptCharacters >= baseline.promptBudget.minChars
    && promptCharacters <= baseline.promptBudget.maxChars
    && architectureCharacters >= baseline.architectureBudget.minChars;
  const referencePolicyMatched = generationBasis === 'standard'
    ? referenceCount === 0 && referenceMode === 'text_only'
    : generationBasis === 'reference_first'
      ? referenceCount >= 1
        && referenceMode === 'reference_assisted'
        && (input.referenceSources ?? []).every((source) => [
          'user_explicit', 'project_asset_explicit', 'confirmed_output_explicit',
        ].includes(source))
      : generationBasis === 'continuation'
        ? referenceCount === 1
          && referenceMode === 'reference_assisted'
          && (input.referenceSources ?? []).length === 1
          && (input.referenceSources ?? [])[0] === 'confirmed_generated_output'
          && Boolean(input.taskContract?.continuation)
          && input.taskContract?.continuation?.referenceRole === 'world_consistency'
          && Boolean(input.taskContract?.continuation?.targetFunctionalProgram)
          && Boolean(input.taskContract?.continuation?.continuationBoundary)
        : false;
  const spatialSemanticGatePassed = input.spatialSemanticReport?.status === 'pass';
  const aspectRatioMatched = input.requestedAspectRatio && input.providerAspectRatio
    ? input.requestedAspectRatio === input.providerAspectRatio
      && sizeMatchesAspectRatio(input.providerSize, input.requestedAspectRatio)
    : sizeMatchesAspectRatio(input.providerSize, input.requestedAspectRatio);
  const passed = compilerMatched
    && requiredBlocksPresent
    && blockOrderMatched
    && promptBudgetMatched
    && referencePolicyMatched
    && spatialSemanticGatePassed
    && aspectRatioMatched;
  const routeIntegrity = {
    schemaVersion: '1.0',
    version: SPACE_COMPILE_INTEGRITY_GATE_VERSION,
    status: passed ? 'pass' : 'block',
    canonicalCompilerMode,
    compilerMatched,
    requiredBlocksPresent,
    blockOrderMatched,
    promptBudgetMatched,
    referencePolicyMatched,
    spatialSemanticGatePassed,
    aspectRatioMatched,
  };
  const details = {
    ...routeIntegrity,
    compilerMode,
    compilerId: trace.compilerId ?? null,
    blockIds,
    missingBlockIds,
    promptCharacters,
    architectureCharacters,
    generationBasis,
    referenceMode,
    referenceCount,
  };
  if (!compilerMatched || !requiredBlocksPresent || !blockOrderMatched || !promptBudgetMatched) {
    fail(details, 'SPACE_COMPILER_ROUTE_MISMATCH');
  }
  if (!referencePolicyMatched) {
    fail(
      details,
      generationBasis === 'reference_first' && referenceCount === 0
        ? 'SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED'
        : generationBasis === 'continuation' && referenceCount === 0
          ? 'SPACE_CONTINUATION_REFERENCE_REQUIRED'
          : 'SPACE_GENERATION_ROUTE_INTEGRITY_FAILED',
    );
  }
  if (!spatialSemanticGatePassed) fail(details, 'ANALYSIS_SPATIAL_SEMANTICS_INVALID');
  if (!aspectRatioMatched) fail(details, 'SPACE_PROVIDER_ASPECT_RATIO_MISMATCH');
  return { ...details, routeIntegrity };
}
