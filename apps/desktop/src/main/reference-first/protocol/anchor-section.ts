import type {
  AnchorContradictionValidation,
  ProjectGraphicAnchor,
  ReferenceFirstAnchorModel,
  ReferenceSignatureGraphic,
  SystemAnchor
} from '../../../shared/types.ts';

export interface CompiledAnchorSection {
  mode: 'reference_first' | 'legacy';
  text: string;
  systemAnchorId?: string;
  projectGraphicAnchorId?: string;
}

function renderReferenceFirstAnchor(input: ReferenceFirstAnchorModel): string {
  const { systemAnchor, projectGraphicAnchor, referenceSignatureGraphics } = input;
  const sections: string[] = [];
  sections.push('# Reference-First Anchor');
  sections.push('## System Anchor');
  sections.push([
    `色彩关系：${systemAnchor.colorRelationship}`,
    `版式语法：${systemAnchor.layoutGrammar}`,
    `字体层级：${systemAnchor.typographyHierarchy}`,
    `材质语言：${systemAnchor.materialLanguage}`,
    `跨触点一致性：${systemAnchor.crossTouchpointConsistency}`
  ].join('\n'));
  if (projectGraphicAnchor) {
    sections.push('## Project Graphic Anchor');
    sections.push([
      ...(projectGraphicAnchor.sourceElements || []),
      projectGraphicAnchor.formDescription || projectGraphicAnchor.reconstructedForm
    ].filter(Boolean).join('\n'));
  }
  if (referenceSignatureGraphics.length) {
    sections.push('## Reference Signature Graphics（仅作禁止项 / 审计）');
    for (const graphic of referenceSignatureGraphics) {
      sections.push(`- [禁止复制] ${graphic.id}: ${graphic.description}`);
    }
  }
  return sections.join('\n\n');
}

export function compileReferenceFirstAnchorSection(
  input: ReferenceFirstAnchorModel
): CompiledAnchorSection {
  return {
    mode: 'reference_first',
    text: renderReferenceFirstAnchor(input),
    systemAnchorId: 'system-anchor',
    projectGraphicAnchorId: input.projectGraphicAnchor ? 'project-graphic-anchor' : undefined
  };
}

export function compileLegacyAnchorSection(text: string): CompiledAnchorSection {
  return { mode: 'legacy', text };
}

/**
 * §4.2 Anchor 编译器路由。
 * Reference-First 模式只编译新 Anchor，绝不拼接 legacy 字段。
 */
export function compileAnchorSection(
  mode: 'reference_first' | 'legacy',
  input: { referenceFirst?: ReferenceFirstAnchorModel; legacy?: string }
): CompiledAnchorSection {
  if (mode === 'reference_first') {
    if (!input.referenceFirst) {
      throw Object.assign(new Error('Reference-First 模式缺少 ReferenceFirstAnchorModel'), {
        code: 'ANCHOR_SINGLE_SOURCE_VIOLATION'
      });
    }
    return compileReferenceFirstAnchorSection(input.referenceFirst);
  }
  return compileLegacyAnchorSection(input.legacy || '');
}

/**
 * §4.3 Anchor 冲突检测。
 * 检测新旧 Anchor 同时出现、辅助角色 vs 核心超级符号、闭合 vs 非闭合等。
 */
export function validateAnchorContradiction(input: {
  systemAnchor?: SystemAnchor;
  projectGraphicAnchor?: ProjectGraphicAnchor;
  legacyAnchorText?: string;
  signatureGraphics?: ReferenceSignatureGraphic[];
}): AnchorContradictionValidation {
  const conflictingSourceFields: string[] = [];
  const legacyPresent = Boolean(input.legacyAnchorText && input.legacyAnchorText.trim());
  const projectAnchorRoleConflict = Boolean(
    input.projectGraphicAnchor
    && input.projectGraphicAnchor.usageRole === 'primary'
    && input.projectGraphicAnchor.isBadgeLike
  );
  const closedOpenConflict = Boolean(
    input.projectGraphicAnchor
    && input.projectGraphicAnchor.isClosed === true
    && input.projectGraphicAnchor.isBadgeLike === true
  );
  const badgeConstraintConflict = Boolean(
    input.projectGraphicAnchor?.isBadgeLike
    && input.signatureGraphics?.some((item) => item.forbiddenToCopy)
  );
  const signatureSimilarityConflict = Boolean(
    input.projectGraphicAnchor?.resemblesReferenceSignatureGraphic
    && input.signatureGraphics?.some((item) => item.forbiddenToCopy)
  );
  if (legacyPresent && (input.systemAnchor || input.projectGraphicAnchor)) {
    conflictingSourceFields.push('legacy_anchor_still_active');
  }
  if (projectAnchorRoleConflict) conflictingSourceFields.push('project_anchor_role_conflict');
  if (closedOpenConflict) conflictingSourceFields.push('closed_open_conflict');
  if (badgeConstraintConflict) conflictingSourceFields.push('badge_constraint_conflict');
  if (signatureSimilarityConflict) conflictingSourceFields.push('signature_similarity_conflict');
  return {
    projectAnchorRoleConflict,
    closedOpenConflict,
    badgeConstraintConflict,
    signatureSimilarityConflict,
    conflictingSourceFields,
    passed: conflictingSourceFields.length === 0
  };
}
