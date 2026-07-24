import type { StyleCarrier } from '../../shared/types.ts';
import {
  isEnumValue,
  STYLE_CARRIER_CATEGORIES,
  STYLE_CARRIER_PRIORITIES
} from './schema-values.ts';
import type { RuntimeSchema } from './validation-issues.ts';
import { invalidEnumIssue, invalidTypeIssue } from './validation-issues.ts';

export const StyleCarrierSchema: RuntimeSchema<StyleCarrier[]> = {
  safeParse(value) {
    if (!Array.isArray(value)) {
      const issues = [invalidTypeIssue('styleCarriers', value, 'styleCarriers 必须是数组。')];
      return { success: false, issues };
    }
    const issues = value.flatMap((item, index) => {
      const source = item && typeof item === 'object' && !Array.isArray(item)
        ? item as Record<string, unknown>
        : {};
      return [
        ...(!isEnumValue(STYLE_CARRIER_CATEGORIES, source.category)
          ? [invalidEnumIssue(`styleCarriers[${index}].category`, source.category, STYLE_CARRIER_CATEGORIES)]
          : []),
        ...(!isEnumValue(STYLE_CARRIER_PRIORITIES, source.priority)
          ? [invalidEnumIssue(`styleCarriers[${index}].priority`, source.priority, STYLE_CARRIER_PRIORITIES)]
          : [])
      ];
    });
    return { success: issues.length === 0, data: value as StyleCarrier[], issues };
  },
  summary: `StyleCarrierCategory=${STYLE_CARRIER_CATEGORIES.join('|')}; StyleCarrierPriority=${STYLE_CARRIER_PRIORITIES.join('|')}`
};
