import type { ReferenceAssetDecision } from '../../shared/types.ts';
import {
  CONFIDENCE_LEVELS,
  GENERATION_OUTPUT_TYPES,
  isEnumValue,
  REFERENCE_ASSET_ROLES,
  STYLE_CARRIER_CATEGORIES
} from './schema-values.ts';
import type { ParseResult, RuntimeSchema, ValidationIssue } from './validation-issues.ts';
import {
  invalidEnumIssue,
  invalidTypeIssue,
  throwForValidationIssues
} from './validation-issues.ts';

function validateEnumArray(
  value: unknown,
  path: string,
  allowed: readonly string[],
  issues: ValidationIssue[]
): string[] {
  if (!Array.isArray(value)) {
    issues.push(invalidTypeIssue(path, value, `${path} 必须是枚举数组。`, [[]]));
    return [];
  }
  return value.flatMap((item, index) => {
    if (!isEnumValue(allowed, item)) {
      issues.push(invalidEnumIssue(`${path}[${index}]`, item, allowed));
      return [];
    }
    return [item];
  });
}

export function validateReferenceAssetDecision(
  value: unknown,
  pathPrefix = 'referenceAssets[0]'
): ValidationIssue[] {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const issues: ValidationIssue[] = [];
  if (!isEnumValue(REFERENCE_ASSET_ROLES, source.role)) {
    issues.push(invalidEnumIssue(`${pathPrefix}.role`, source.role, REFERENCE_ASSET_ROLES));
  }
  const primaryRole = source.primaryRole ?? source.role;
  if (!isEnumValue(REFERENCE_ASSET_ROLES, primaryRole)) {
    issues.push(invalidEnumIssue(`${pathPrefix}.primaryRole`, primaryRole, REFERENCE_ASSET_ROLES));
  }
  validateEnumArray(source.secondaryRoles ?? [], `${pathPrefix}.secondaryRoles`, REFERENCE_ASSET_ROLES, issues);
  validateEnumArray(source.eligibleOutputTypes ?? [], `${pathPrefix}.eligibleOutputTypes`, GENERATION_OUTPUT_TYPES, issues);
  validateEnumArray(source.representedStyleCarriers ?? [], `${pathPrefix}.representedStyleCarriers`, STYLE_CARRIER_CATEGORIES, issues);
  if (!isEnumValue(CONFIDENCE_LEVELS, source.styleCarrierStrength)) {
    issues.push(invalidEnumIssue(`${pathPrefix}.styleCarrierStrength`, source.styleCarrierStrength, CONFIDENCE_LEVELS));
  }
  if (typeof source.confidence !== 'number' || source.confidence < 0 || source.confidence > 1) {
    issues.push(invalidTypeIssue(`${pathPrefix}.confidence`, source.confidence, 'confidence 必须是 0 到 1 之间的数字。', [0.8]));
  }
  if (!Array.isArray(source.styleCarrierRules)) {
    issues.push(invalidTypeIssue(`${pathPrefix}.styleCarrierRules`, source.styleCarrierRules, 'styleCarrierRules 必须是数组。', [[]]));
  } else {
    source.styleCarrierRules.forEach((rule, index) => {
      const record = rule && typeof rule === 'object' && !Array.isArray(rule)
        ? rule as Record<string, unknown>
        : {};
      if (!isEnumValue(STYLE_CARRIER_CATEGORIES, record.category)) {
        issues.push(invalidEnumIssue(
          `${pathPrefix}.styleCarrierRules[${index}].category`,
          record.category,
          STYLE_CARRIER_CATEGORIES
        ));
      }
    });
  }
  return issues;
}

function parseReferenceAssets(value: unknown): ParseResult<ReferenceAssetDecision[]> {
  if (!Array.isArray(value)) {
    const issues = [invalidTypeIssue('referenceAssets', value, 'referenceAssets 必须是数组。')];
    return { success: false, issues };
  }
  const issues = value.flatMap((item, index) =>
    validateReferenceAssetDecision(item, `referenceAssets[${index}]`));
  return {
    success: issues.length === 0,
    data: value as ReferenceAssetDecision[],
    issues
  };
}

export const ReferenceAssetSchema: RuntimeSchema<ReferenceAssetDecision> = {
  safeParse(value) {
    const issues = validateReferenceAssetDecision(value);
    return {
      success: issues.length === 0,
      data: value as ReferenceAssetDecision,
      issues
    };
  },
  summary: `ReferenceAssetRole=${REFERENCE_ASSET_ROLES.join('|')}; GenerationOutputType=${GENERATION_OUTPUT_TYPES.join('|')}; StyleCarrierCategory=${STYLE_CARRIER_CATEGORIES.join('|')}`
};

export const ReferenceAssetsSchema: RuntimeSchema<ReferenceAssetDecision[]> = {
  safeParse: parseReferenceAssets,
  summary: ReferenceAssetSchema.summary
};

export function parseReferenceAssetDecisions(value: unknown): ReferenceAssetDecision[] {
  const parsed = ReferenceAssetsSchema.safeParse(value);
  throwForValidationIssues(parsed.issues);
  return parsed.data!;
}
