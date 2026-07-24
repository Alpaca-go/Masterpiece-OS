import type { TaskReferenceSubset } from '../../shared/types.ts';
import {
  GENERATION_OUTPUT_TYPES,
  isEnumValue,
  REFERENCE_MATCH_LEVELS
} from './schema-values.ts';
import type { RuntimeSchema } from './validation-issues.ts';
import { invalidEnumIssue, invalidTypeIssue } from './validation-issues.ts';

export const TaskReferenceSelectionSchema: RuntimeSchema<TaskReferenceSubset[]> = {
  safeParse(value) {
    if (!Array.isArray(value)) {
      const issues = [invalidTypeIssue('taskReferences', value, 'taskReferences 必须是数组。')];
      return { success: false, issues };
    }
    const issues = value.flatMap((item, index) => {
      const source = item && typeof item === 'object' && !Array.isArray(item)
        ? item as Record<string, unknown>
        : {};
      return [
        ...(!isEnumValue(GENERATION_OUTPUT_TYPES, source.outputType)
          ? [invalidEnumIssue(`taskReferences[${index}].outputType`, source.outputType, GENERATION_OUTPUT_TYPES)]
          : []),
        ...(source.matchLevel !== undefined && !isEnumValue(REFERENCE_MATCH_LEVELS, source.matchLevel)
          ? [invalidEnumIssue(`taskReferences[${index}].matchLevel`, source.matchLevel, REFERENCE_MATCH_LEVELS)]
          : [])
      ];
    });
    return { success: issues.length === 0, data: value as TaskReferenceSubset[], issues };
  },
  summary: `GenerationOutputType=${GENERATION_OUTPUT_TYPES.join('|')}; ReferenceMatchLevel=${REFERENCE_MATCH_LEVELS.join('|')}`
};
