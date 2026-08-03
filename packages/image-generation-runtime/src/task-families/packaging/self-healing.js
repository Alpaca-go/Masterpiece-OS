export const PACKAGING_REPAIR_REQUIRED_CODES = Object.freeze([
  'PACKAGING_LOGO_FIDELITY_FAILED',
  'PACKAGING_STRUCTURE_FAILED',
  'PACKAGING_MATERIAL_FAILED',
  'PACKAGING_CRAFT_FAILED',
  'PACKAGING_ASSET_OWNERSHIP_FAILED',
  'PACKAGING_COMMERCIAL_PHOTOGRAPHY_FAILED',
  'PACKAGING_PRODUCT_HIERARCHY_FAILED',
  'PACKAGING_GROUP_RELATIONSHIP_FAILED',
  'PACKAGING_SERIES_CONSISTENCY_FAILED',
  'PACKAGING_BOX_STRUCTURE_FAILED',
  'PACKAGING_INSERT_STRUCTURE_FAILED',
  'PACKAGING_PRODUCT_ARRANGEMENT_FAILED',
  'PACKAGING_STRUCTURAL_REALISM_FAILED',
  'PACKAGING_STRUCTURE_EVIDENCE_MISSING',
  'PACKAGING_PRODUCT_ROLE_MISSING',
  'PACKAGING_ASSET_OWNERSHIP_LEAK',
]);

export const PACKAGING_REPAIR_POLICIES = Object.freeze([
  ['PACKAGING_LOGO_FIDELITY_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_STRUCTURE_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_MATERIAL_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_CRAFT_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_ASSET_OWNERSHIP_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_COMMERCIAL_PHOTOGRAPHY_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_PRODUCT_HIERARCHY_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_GROUP_RELATIONSHIP_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_SERIES_CONSISTENCY_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_BOX_STRUCTURE_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_INSERT_STRUCTURE_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_PRODUCT_ARRANGEMENT_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_STRUCTURAL_REALISM_FAILED', 'regenerate_with_correction_prompt'],
  ['PACKAGING_STRUCTURE_EVIDENCE_MISSING', 'ask_user'],
  ['PACKAGING_PRODUCT_ROLE_MISSING', 'ask_user'],
  ['PACKAGING_ASSET_OWNERSHIP_LEAK', 'fail_closed'],
]);

const DIRECTIVES = Object.freeze({
  PACKAGING_LOGO_FIDELITY_FAILED: 'Restore the selected Logo exactly; preserve contour, proportions, internal geometry and supplied lettering.',
  PACKAGING_STRUCTURE_FAILED: 'Restore the confirmed package structure, silhouette, wall thickness and closure logic.',
  PACKAGING_MATERIAL_FAILED: 'Restore the specified packaging substrate and its physically credible surface response.',
  PACKAGING_CRAFT_FAILED: 'Restore each specified finishing process only on its intended packaging area and at credible production scale.',
  PACKAGING_ASSET_OWNERSHIP_FAILED: 'Keep package artwork on package surfaces; remove it from background sets, props, floor and scenery.',
  PACKAGING_COMMERCIAL_PHOTOGRAPHY_FAILED: 'Rebuild as one finished commercial product photograph with credible contact shadow, lens and edge detail.',
  PACKAGING_PRODUCT_HIERARCHY_FAILED: 'Re-establish a clear primary-to-secondary product hierarchy without hiding any package.',
  PACKAGING_GROUP_RELATIONSHIP_FAILED: 'Arrange all products as one coherent packaging family, not unrelated props or a comparison board.',
  PACKAGING_SERIES_CONSISTENCY_FAILED: 'Keep Logo, grid, structure, material family and camera language consistent across every series member.',
  PACKAGING_BOX_STRUCTURE_FAILED: 'Restore the confirmed outer box and physically correct opening relationship.',
  PACKAGING_INSERT_STRUCTURE_FAILED: 'Restore a manufacturable insert with credible thickness, cavities and product clearances.',
  PACKAGING_PRODUCT_ARRANGEMENT_FAILED: 'Restore the confirmed product count, order, scale and placement relationship.',
  PACKAGING_STRUCTURAL_REALISM_FAILED: 'Remove impossible intersections, floating parts and disconnected opening geometry.',
});

export function validatePackagingRepairPolicyCoverage(codes = PACKAGING_REPAIR_REQUIRED_CODES) {
  return codes.flatMap((code) => PACKAGING_REPAIR_POLICIES.some(([candidate]) => candidate === code)
    ? [] : [{ code, reason: 'missing_policy' }]);
}

export function resolvePackagingSelfHealing(input = {}) {
  const failures = [...new Set([
    ...(input.packagingEvaluation?.failures ?? []),
    ...(input.analysisValidation?.errors ?? []),
  ])];
  const policies = failures.map((code) => ({
    code,
    strategy: PACKAGING_REPAIR_POLICIES.find(([candidate]) => candidate === code)?.[1] ?? 'fail_closed',
  }));
  const action = policies.some((item) => item.strategy === 'fail_closed') ? 'fail_closed'
    : policies.some((item) => item.strategy === 'ask_user') ? 'ask_user'
      : policies.some((item) => item.strategy === 'regenerate_with_correction_prompt')
        ? 'regenerate_with_correction_prompt' : 'none';
  return {
    schemaVersion: '1.0',
    action,
    failures,
    policies,
    correctionDirectives: failures.map((code) => DIRECTIVES[code]).filter(Boolean),
    maxAutomaticRetries: action === 'regenerate_with_correction_prompt' ? 1 : 0,
  };
}
