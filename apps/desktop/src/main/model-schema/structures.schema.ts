import type { StructurePolicy } from '../../shared/types.ts';
import {
  isEnumValue,
  STRUCTURE_DOMAINS,
  STRUCTURE_STATUSES
} from './schema-values.ts';
import type { RuntimeSchema } from './validation-issues.ts';
import { invalidEnumIssue, invalidTypeIssue } from './validation-issues.ts';

export const StructurePolicySchema: RuntimeSchema<StructurePolicy> = {
  safeParse(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      const issues = [invalidTypeIssue('structurePolicy', value, 'structurePolicy 必须是对象。')];
      return { success: false, issues };
    }
    const source = value as Record<string, unknown>;
    const issues = [
      ...(!isEnumValue(STRUCTURE_DOMAINS, source.domain)
        ? [invalidEnumIssue('structurePolicy.domain', source.domain, STRUCTURE_DOMAINS)]
        : []),
      ...(!isEnumValue(STRUCTURE_STATUSES, source.status)
        ? [invalidEnumIssue('structurePolicy.status', source.status, STRUCTURE_STATUSES)]
        : [])
    ];
    return { success: issues.length === 0, data: value as StructurePolicy, issues };
  },
  summary: `StructureDomain=${STRUCTURE_DOMAINS.join('|')}; StructureStatus=${STRUCTURE_STATUSES.join('|')}`
};
