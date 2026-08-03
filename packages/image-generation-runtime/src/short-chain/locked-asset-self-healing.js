export const LOCKED_ASSET_SELF_HEALING_ERROR_CODES = Object.freeze([
  'wrong_text',
  'contour_deformation',
  'duplicate_asset',
  'material_failure',
  'wrong_placement',
]);

export const LOCKED_ASSET_SELF_HEALING_POLICIES = Object.freeze([
  {
    code: 'wrong_text',
    severity: 'repairable',
    repairStrategy: 'local_asset_projection',
    fallbackStrategy: 'deterministic_composite',
  },
  {
    code: 'contour_deformation',
    severity: 'repairable',
    repairStrategy: 'local_asset_projection',
    fallbackStrategy: 'deterministic_composite',
  },
  {
    code: 'duplicate_asset',
    severity: 'repairable',
    repairStrategy: 'regenerate_scene',
    fallbackStrategy: 'fail_closed',
  },
  {
    code: 'material_failure',
    severity: 'repairable',
    repairStrategy: 'local_material_repair',
    fallbackStrategy: 'deterministic_composite',
  },
  {
    code: 'wrong_placement',
    severity: 'repairable',
    repairStrategy: 'local_asset_projection',
    fallbackStrategy: 'deterministic_composite',
  },
]);

export function validateLockedAssetSelfHealingCoverage(input = {}) {
  const requiredCodes = input.requiredCodes ?? LOCKED_ASSET_SELF_HEALING_ERROR_CODES;
  const policies = input.policies ?? LOCKED_ASSET_SELF_HEALING_POLICIES;
  return requiredCodes.flatMap((code) => {
    const policy = policies.find((candidate) => candidate.code === code);
    if (!policy) return [{ code, reason: 'missing_policy' }];
    if (policy.severity !== 'repairable') return [{ code, reason: 'non_repairable_policy' }];
    if (!['local_asset_projection', 'local_material_repair', 'regenerate_scene']
      .includes(policy.repairStrategy)) return [{ code, reason: 'non_actionable_strategy' }];
    if (!['deterministic_composite', 'fail_closed'].includes(policy.fallbackStrategy)) {
      return [{ code, reason: 'non_actionable_fallback' }];
    }
    return [];
  });
}

function inferredErrors(input) {
  const errors = new Set((input.lockedAssetQaResults ?? []).flatMap((item) => item.errors ?? []));
  const violations = (input.lockedAssetViolations ?? []).join(' ').toLowerCase();
  if (/wrong[_\s-]*text|text|letter|word|ocr|文字|字样/u.test(violations)
    || input.mismatchTypes?.includes('logo_text_error')) errors.add('wrong_text');
  if (/contour|outline|shape|deform|轮廓|变形/u.test(violations)) errors.add('contour_deformation');
  if (/duplicate|repeat|multiple|重复|多余/u.test(violations)) errors.add('duplicate_asset');
  if (/material|finish|材质/u.test(violations)) errors.add('material_failure');
  if (/placement|position|location|位置/u.test(violations)) errors.add('wrong_placement');
  return [...errors];
}

export function resolveLockedAssetSelfHealing(input) {
  const errors = inferredErrors(input);
  const coveredErrors = errors.filter((error) => LOCKED_ASSET_SELF_HEALING_ERROR_CODES.includes(error));
  const policies = coveredErrors.map((code) =>
    LOCKED_ASSET_SELF_HEALING_POLICIES.find((policy) => policy.code === code));
  const hasLockedAssetFailure = (input.lockedAssetViolations?.length ?? 0) > 0
    || input.mismatchTypes?.includes('locked_asset_violation')
    || input.mismatchTypes?.includes('logo_text_error');

  let action = 'none';
  let reason = 'no_locked_asset_failure';
  if (policies.some((policy) => policy?.repairStrategy === 'regenerate_scene')) {
    action = 'regenerate_scene';
    reason = 'scene_cleanup_required';
  } else if (policies.some((policy) => policy?.repairStrategy === 'local_material_repair')) {
    action = 'local_material_repair';
    reason = 'material_can_be_repaired_in_planned_region';
  } else if (policies.some((policy) => policy?.repairStrategy === 'local_asset_projection')) {
    action = 'local_asset_projection';
    reason = 'identity_can_be_restored_in_planned_region';
  } else if (hasLockedAssetFailure) {
    action = 'regenerate_scene';
    reason = 'unclassified_locked_asset_failure';
  }

  return {
    schemaVersion: '1.0',
    errors,
    coveredErrors,
    action,
    reason,
    maxRepairAttempts: 2,
    fallback: action === 'local_asset_projection' || action === 'local_material_repair'
      ? 'deterministic_composite'
      : action === 'regenerate_scene' ? 'fail_closed' : 'none',
  };
}
