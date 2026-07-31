const CHANGE_FIELDS = ['composition', 'graphicLanguage', 'hierarchy', 'material', 'photography', 'applicationStrategy'];
const hasValues = (values) => Array.isArray(values) && values.some((value) => String(value).trim());

export function validateCreativeDirectorBrief(brief, input) {
  const issues = [];
  if (!hasValues(brief?.preserve?.identity)) issues.push('PRESERVE_IDENTITY_MISSING');
  const locked = [...(input.lockedAssets?.lockedFacts ?? []), ...(input.lockedAssets?.logoAssetIds ?? [])];
  const changing = CHANGE_FIELDS.flatMap((key) => brief?.mustChange?.[key] ?? []).join('\n').toLowerCase();
  if (locked.some((value) => changing.includes(String(value).toLowerCase()))) issues.push('LOCKED_ASSET_MARKED_AS_CHANGEABLE');
  if (input.mode !== 'extend' && !CHANGE_FIELDS.some((key) => hasValues(brief?.mustChange?.[key]))) issues.push('TRANSFORMATION_CHANGE_EMPTY');
  if (input.mode !== 'extend' && !hasValues(brief?.prohibitedCarryover)) issues.push('PROHIBITED_CARRYOVER_EMPTY');
  if (!String(brief?.newDirection?.visualAnchor ?? '').trim()) issues.push('NEW_VISUAL_ANCHOR_EMPTY');
  if (!String(brief?.outputTask?.responsibility ?? '').trim()) issues.push('OUTPUT_RESPONSIBILITY_EMPTY');
  const plan = brief?.imageReferencePlan ?? {};
  if (!Object.values(plan).some(hasValues)) issues.push('REFERENCE_PLAN_EMPTY');
  const assetIds = new Set((input.assets ?? []).map((asset) => asset.assetId));
  if (assetIds.size && plan.style_reference?.length === assetIds.size) issues.push('ALL_ASSETS_MARKED_STYLE_REFERENCE');
  if (input.mode !== 'extend' && !hasValues(plan.analysis_only) && assetIds.size > 2) issues.push(`ANALYSIS_ONLY_EMPTY_FOR_${input.mode.toUpperCase()}`);
  const expected = input.mode === 'extend' ? 'low' : input.mode === 'upgrade' ? 'medium' : 'high';
  if (brief?.creativeDifferenceTarget?.level !== expected) issues.push('DIFFERENCE_TARGET_MISMATCH');
  return { valid: issues.length === 0, issues };
}
