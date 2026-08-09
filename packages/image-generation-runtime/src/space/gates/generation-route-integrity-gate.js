import { ACTIVE_SPACE_ROUTE_BASELINE } from '../quality-baselines/active-space-route-baseline.js';

export const SPACE_ROUTE_INTEGRITY_GATE_VERSION = 'space-route-integrity-gate@1.0.0';
export const CANONICAL_SPACE_COMPILER_MODE = 'r8_6_golden';

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

function fail(details, causeCode = 'SPACE_GENERATION_ROUTE_INTEGRITY_FAILED') {
  throw Object.assign(new Error(`${causeCode}: formal Space generation route failed closed.`), {
    code: causeCode,
    routeIntegrityCode: 'SPACE_GENERATION_ROUTE_INTEGRITY_FAILED',
    details,
  });
}

export function assertSpaceGenerationRouteIntegrity(input, baseline = ACTIVE_SPACE_ROUTE_BASELINE) {
  if (input.taskContract?.deliverableFamily !== 'space') return null;
  const compilerMode = input.compilerMode;
  const canonicalCompilerMode = compilerMode === 'phase9b_quality'
    ? CANONICAL_SPACE_COMPILER_MODE
    : compilerMode;
  const trace = input.trace?.spaceGeneration ?? input.trace ?? {};
  const blockIds = Array.isArray(input.blockIds) ? input.blockIds : [];
  const missingBlockIds = baseline.requiredBlockIds.filter((id) => !blockIds.includes(id));
  const promptCharacters = Number(trace.promptCharacters ?? input.promptCharacters ?? 0);
  const architectureCharacters = Number(trace.architectureCharacters ?? 0);
  const generationBasis = input.taskContract.generationBasis ?? (
    input.taskContract.referenceAssetIds?.length ? 'reference_first' : 'standard'
  );
  const referenceCount = Number(input.providerReferenceCount ?? input.taskContract.referenceAssetIds?.length ?? 0);
  const referenceMode = input.referenceMode ?? (referenceCount ? 'reference_assisted' : 'text_only');
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
    version: SPACE_ROUTE_INTEGRITY_GATE_VERSION,
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
    fail(details, generationBasis === 'reference_first' && referenceCount === 0
      ? 'SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED'
      : generationBasis === 'continuation' && referenceCount === 0
        ? 'SPACE_CONTINUATION_REFERENCE_REQUIRED'
        : 'SPACE_GENERATION_ROUTE_INTEGRITY_FAILED');
  }
  if (!spatialSemanticGatePassed) fail(details, 'ANALYSIS_SPATIAL_SEMANTICS_INVALID');
  if (!aspectRatioMatched) fail(details, 'SPACE_PROVIDER_ASPECT_RATIO_MISMATCH');
  return { ...details, routeIntegrity };
}
