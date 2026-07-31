import type { ProjectGraphicAnchor, SystemAnchor } from '../../shared/types.ts';
import { GRAPHIC_ANCHOR_ROLES, isEnumValue } from './schema-values.ts';
import type { RuntimeSchema } from './validation-issues.ts';
import { invalidEnumIssue, invalidTypeIssue } from './validation-issues.ts';

export const SystemAnchorSchema: RuntimeSchema<SystemAnchor> = {
  safeParse(value) {
    const valid = Boolean(value && typeof value === 'object' && !Array.isArray(value));
    const issues = valid ? [] : [invalidTypeIssue('systemAnchor', value, 'systemAnchor 必须是对象。')];
    return { success: valid, data: value as SystemAnchor, issues };
  },
  summary: 'SystemAnchor 为包含色彩、版式、字体、材质、陈列与主 Style Carrier 的对象。'
};

export const ProjectGraphicAnchorSchema: RuntimeSchema<ProjectGraphicAnchor> = {
  safeParse(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      const issues = [invalidTypeIssue('projectGraphicAnchor', value, 'projectGraphicAnchor 必须是对象。')];
      return { success: false, issues };
    }
    const source = value as Record<string, unknown>;
    const role = source.role ?? source.usageRole;
    const issues = isEnumValue(GRAPHIC_ANCHOR_ROLES, role)
      ? []
      : [invalidEnumIssue('projectGraphicAnchor.role', role, GRAPHIC_ANCHOR_ROLES)];
    return { success: issues.length === 0, data: value as ProjectGraphicAnchor, issues };
  },
  summary: `GraphicAnchorRole=${GRAPHIC_ANCHOR_ROLES.join('|')}`
};
