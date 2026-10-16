const SCENE_DIFFERENTIATION_GATE_VERSION = "space-scene-differentiation-gate@1.0.0";
function evaluateContinuationSceneGate({ contract = {}, compiledPromptText = "" } = {}) {
  const findings = [];
  const program = contract.targetFunctionalProgram ?? {};
  const boundary = contract.continuationBoundary ?? {};
  const regenerate = Array.isArray(boundary.regenerate) ? boundary.regenerate : [];
  const preserve = Array.isArray(boundary.preserve) ? boundary.preserve : [];
  const drop = Array.isArray(program.sourceProgramElementsToDrop) ? program.sourceProgramElementsToDrop : [];
  const prompt = String(compiledPromptText ?? "");
  let differentiationScore = 1;
  let copyRisk = 5;
  const hasFunctions = (program.requiredFunctions?.length ?? 0) > 0;
  const hasElements = (program.requiredSpatialElements?.length ?? 0) > 0;
  const hasDrop = drop.length > 0;
  const hasRegenerate = regenerate.length > 0;
  const hasPreserve = preserve.length > 0;
  const roleIsWorldConsistency = contract.referenceRole === "world_consistency";
  if (hasFunctions && hasElements) differentiationScore = Math.max(differentiationScore, 3);
  if (hasDrop) differentiationScore = Math.max(differentiationScore, 3);
  if (hasFunctions && hasElements && hasDrop && hasRegenerate) {
    differentiationScore = Math.max(differentiationScore, 4);
  }
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
    findings
  };
}
export {
  SCENE_DIFFERENTIATION_GATE_VERSION,
  evaluateContinuationSceneGate
};
