import type { CurrentProjectAssetDecision } from '../../shared/types.ts';
import {
  ASSET_AUTHENTICITIES,
  CURRENT_PROJECT_ASSET_ROLES,
  GENERATION_USAGES,
  isEnumValue
} from './schema-values.ts';
import type { RuntimeSchema, ValidationIssue } from './validation-issues.ts';
import { invalidEnumIssue, invalidTypeIssue, throwForValidationIssues } from './validation-issues.ts';

export function validateCurrentProjectAssetDecision(
  value: unknown,
  pathPrefix = 'currentProjectAssets[0]'
): ValidationIssue[] {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const issues: ValidationIssue[] = [];
  if (!isEnumValue(CURRENT_PROJECT_ASSET_ROLES, source.role)) {
    issues.push(invalidEnumIssue(`${pathPrefix}.role`, source.role, CURRENT_PROJECT_ASSET_ROLES));
  }
  if (!Array.isArray(source.roles)) {
    issues.push(invalidTypeIssue(`${pathPrefix}.roles`, source.roles, 'roles 必须是当前项目资产角色数组。'));
  } else {
    source.roles.forEach((role, index) => {
      if (!isEnumValue(CURRENT_PROJECT_ASSET_ROLES, role)) {
        issues.push(invalidEnumIssue(`${pathPrefix}.roles[${index}]`, role, CURRENT_PROJECT_ASSET_ROLES));
      }
    });
  }
  if (!isEnumValue(ASSET_AUTHENTICITIES, source.authenticity)) {
    issues.push(invalidEnumIssue(`${pathPrefix}.authenticity`, source.authenticity, ASSET_AUTHENTICITIES));
  }
  if (!isEnumValue(GENERATION_USAGES, source.generationUsage)) {
    issues.push(invalidEnumIssue(`${pathPrefix}.generationUsage`, source.generationUsage, GENERATION_USAGES));
  }
  return issues;
}

export const AssetAuthenticitySchema: RuntimeSchema<CurrentProjectAssetDecision[]> = {
  safeParse(value) {
    if (!Array.isArray(value)) {
      const issues = [invalidTypeIssue('currentProjectAssets', value, 'currentProjectAssets 必须是数组。')];
      return { success: false, issues };
    }
    const issues = value.flatMap((item, index) =>
      validateCurrentProjectAssetDecision(item, `currentProjectAssets[${index}]`));
    return { success: issues.length === 0, data: value as CurrentProjectAssetDecision[], issues };
  },
  summary: `CurrentProjectAssetRole=${CURRENT_PROJECT_ASSET_ROLES.join('|')}; AssetAuthenticity=${ASSET_AUTHENTICITIES.join('|')}; GenerationUsage=${GENERATION_USAGES.join('|')}`
};

export function parseCurrentProjectAssetDecisions(value: unknown): CurrentProjectAssetDecision[] {
  const parsed = AssetAuthenticitySchema.safeParse(value);
  throwForValidationIssues(parsed.issues);
  return parsed.data!;
}
