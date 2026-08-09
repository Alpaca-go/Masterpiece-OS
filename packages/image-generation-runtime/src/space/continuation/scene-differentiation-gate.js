// R11.1 v1.1 Scene Differentiation & Copy Risk gate.
//
// The first continuation smoke kept the world too strongly and changed the
// scene too little (it degraded into a high-fidelity same-scene variation).
// This offline gate scores a continuation task's contract + compiled prompt
// for how clearly it tells the provider to REGENERATE the target scene rather
// than preserve the source layout/composition.
//
// Scene Differentiation (1-5):
//   1 = nearly the source scene again
//   2 = a little functional change
//   3 = visible but mixed
//   4 = clearly a new scene in the same world
//   5 = fully established new scene, highly consistent
//
// Copy Risk (1-5):
//   1 = only world consistency, no layout copy
//   2 = a few similar spatial mechanisms
//   3 = notable composition/layout inheritance
//   4 = heavy layout + primary fixture copy
//   5 = near identical re-render
//
// These are offline contract-level checks (no image similarity model in
// R11.1); human acceptance remains authoritative.

export const SCENE_DIFFERENTIATION_GATE_VERSION = 'space-scene-differentiation-gate@1.0.0';

/**
 * Score a continuation contract / compiled prompt for scene differentiation
 * and copy risk. Pure / offline / deterministic.
 *
 * @param {object} input
 * @param {object} input.contract     validated continuation contract
 * @param {string} [input.compiledPromptText]  final prompt text
 * @returns {{ sceneDifferentiation:number, copyRisk:number,
 *             sceneDifferentiationPass:boolean, copyRiskPass:boolean,
 *             findings:string[] }}
 */
export function evaluateContinuationSceneGate({ contract = {}, compiledPromptText = '' } = {}) {
  const findings = [];
  const program = contract.targetFunctionalProgram ?? {};
  const boundary = contract.continuationBoundary ?? {};
  const regenerate = Array.isArray(boundary.regenerate) ? boundary.regenerate : [];
  const preserve = Array.isArray(boundary.preserve) ? boundary.preserve : [];
  const drop = Array.isArray(program.sourceProgramElementsToDrop) ? program.sourceProgramElementsToDrop : [];
  const prompt = String(compiledPromptText ?? '');

  let differentiationScore = 1;
  let copyRisk = 5;

  // A real target program with required functions / elements / drop rules
  // moves the task toward regeneration.
  const hasFunctions = (program.requiredFunctions?.length ?? 0) > 0;
  const hasElements = (program.requiredSpatialElements?.length ?? 0) > 0;
  const hasDrop = drop.length > 0;
  const hasRegenerate = regenerate.length > 0;
  const hasPreserve = preserve.length > 0;
  const roleIsWorldConsistency = contract.referenceRole === 'world_consistency';

  if (hasFunctions && hasElements) differentiationScore = Math.max(differentiationScore, 3);
  if (hasDrop) differentiationScore = Math.max(differentiationScore, 3);
  if (hasFunctions && hasElements && hasDrop && hasRegenerate) {
    differentiationScore = Math.max(differentiationScore, 4);
  }

  // Copy risk drops when the prompt explicitly tells the model to regenerate
  // program/layout and to drop source elements, and the reference is
  // world-consistency-only.
  if (roleIsWorldConsistency) copyRisk = Math.min(copyRisk, 3);
  if (/regenerate|reinterpret|do not preserve.*(layout|composition|furniture)|source layout/iu.test(prompt)) {
    copyRisk = Math.min(copyRisk, 2);
  }
  if (hasDrop && /do not carry over|do not preserve|drop from source/iu.test(prompt)) {
    copyRisk = Math.min(copyRisk, 2);
  }
  if (hasRegenerate && /regenerate/iu.test(prompt)) {
    copyRisk = Math.min(copyRisk, 2);
  }
  // A strongly regeneration-directed prompt (regenerate list + drop list +
  // world-consistency role) is the v1.1 target: Copy Risk 1-2, Differentiation >= 4.
  if (roleIsWorldConsistency && hasDrop && hasRegenerate && hasFunctions && hasElements) {
    copyRisk = Math.min(copyRisk, 1);
  }

  if (differentiationScore < 4) findings.push(`scene differentiation ${differentiationScore} < 4`);
  if (copyRisk > 2) findings.push(`copy risk ${copyRisk} > 2`);

  return {
    sceneDifferentiation: differentiationScore,
    copyRisk,
    sceneDifferentiationPass: differentiationScore >= 4,
    copyRiskPass: copyRisk <= 2,
    gatePass: differentiationScore >= 4 && copyRisk <= 2,
    findings,
  };
}
