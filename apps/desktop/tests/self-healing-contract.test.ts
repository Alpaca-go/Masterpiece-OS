import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIELD_REPAIR_POLICIES,
  requiredFieldRulesForDeliverable,
  validateSelfHealingContractCoverage,
} from '@masterpiece/analysis-runtime/index.ts';
import {
  SPACE_PROMPT_PREFLIGHT_FIELD_REQUIREMENTS,
} from '@masterpiece/image-generation-runtime/gates/prompt-preflight-gate.js';

test('every formal analysis requirement has an actionable Self-Healing policy', () => {
  assert.deepEqual(validateSelfHealingContractCoverage(), []);
});

test('space generation preflight minima cannot exceed Structured Analysis readiness minima', () => {
  const analysisRules = requiredFieldRulesForDeliverable('space');
  const mismatches = SPACE_PROMPT_PREFLIGHT_FIELD_REQUIREMENTS.flatMap((preflight) => {
    const analysis = analysisRules.find((rule) => rule.path === preflight.path);
    if (!analysis) return [{ path: preflight.path, reason: 'missing_analysis_requirement' }];
    if ((analysis.minimumItems ?? 1) < preflight.minimumItems) {
      return [{
        path: preflight.path,
        reason: `analysis_minimum_${analysis.minimumItems ?? 1}_below_preflight_${preflight.minimumItems}`,
      }];
    }
    return [];
  });
  assert.deepEqual(mismatches, []);
});

test('coverage validator fails when a future required field has no repair policy', () => {
  const violations = validateSelfHealingContractCoverage({
    deliverables: ['space'],
    rulesForDeliverable: () => [{
      path: 'mediaTranslations.spatial.futureRequiredField',
      code: 'FUTURE_REQUIRED_FIELD_MISSING',
      kind: 'array',
      minimumItems: 1,
    }],
    policies: FIELD_REPAIR_POLICIES,
  });
  assert.deepEqual(violations, [{
    deliverable: 'space',
    path: 'mediaTranslations.spatial.futureRequiredField',
    code: 'FUTURE_REQUIRED_FIELD_MISSING',
    reason: 'missing_policy',
  }]);
});
