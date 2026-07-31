export function validateReferencePlan(plan, { mode, assetCount = plan?.length ?? 0 } = {}) {
  const issues = [];
  const roles = new Map((plan ?? []).map((item) => [item.assetId, item.role]));
  if (!plan?.length) issues.push('REFERENCE_PLAN_EMPTY');
  if (assetCount > 0 && [...roles.values()].every((role) => role === 'style_reference')) issues.push('ALL_ASSETS_MARKED_STYLE_REFERENCE');
  if (mode !== 'extend' && assetCount > 2 && ![...roles.values()].includes('analysis_only')) issues.push(`ANALYSIS_ONLY_EMPTY_FOR_${mode.toUpperCase()}`);
  return { valid: issues.length === 0, issues };
}
