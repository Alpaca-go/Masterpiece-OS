// Space Role Intelligence — Compile space_role_context Block (Phase 9C.1)
// 用途: 把 SpaceRole JSON 编译成 prompt 的 space_role_context markdown block.
//       在 Phase 9C.1 §6/§7 插入到 architecture_dna 跟 brand_translation 之间.
//
// Phase 9C.1 §3 核心目标:
//   不同空间有真实功能差异, 同时保持品牌语言统一.
//   §7 原则: 不修改 brand_translation, 不修改 architecture_dna, 只 ADD 1 block.
//
// Phase 9C.1 §10 验收:
//   - Prompt Compiler 支持新 block (16 -> 17 blocks)
//   - Brand Translation byte-equal (不变)
//   - Architecture DNA byte-equal (不变)
//
// 不调真实 Provider, 不修改 Phase 9C / 9A / 9B baseline 行为.

import {
  PHASE,
  VERSION,
  MODULE_NAME,
  DATA_CONTRACT,
  loadSpaceRole,
  SUPPORTED_SPACE_TYPES,
  sceneTypeToFileName,
  listAvailableSpaceRoles,
} from './data-contract.mjs';

/**
 * Compile a SpaceRole JSON into a markdown block suitable for prompt injection.
 *
 * @param {string} sceneType - The scene type from DNA.sceneDefinition.sceneType.
 *   Must be one of SUPPORTED_SPACE_TYPES.
 * @returns {{ blockId: string, blockTitle: string, content: string,
 *            spaceRole: Object, characterCount: number }}
 */
export function compileSpaceRoleBlock(sceneType) {
  if (!sceneType || typeof sceneType !== 'string') {
    throw new TypeError(`compileSpaceRoleBlock: sceneType is required (got ${JSON.stringify(sceneType)})`);
  }
  const spaceRole = loadSpaceRole(sceneType);

  const blockId = 'space_role_context';
  const blockTitle = `# Space Role Context (Phase 9C.1: 空间角色约束, ${spaceRole.label})`;

  // Build markdown body
  const lines = [];
  lines.push('');
  lines.push('> 这一层在 architecture_dna 之后, brand_translation 之前.');
  lines.push('> 它**不**修改 brand_translation 也不**修改** architecture_dna, 只给当前空间加 role-specific 约束.');
  lines.push('> 原则: 同一品牌保持语言统一, 不同空间有真实功能差异.');
  lines.push('');

  // Role section
  lines.push(`**Role**:`);
  lines.push(`- primary: ${spaceRole.role.primary}`);
  lines.push(`- secondary: ${spaceRole.role.secondary}`);
  lines.push('');

  // Priority section (4 dimensions 0-1)
  lines.push(`**Priority** (0-1, 决定空间行为倾向):`);
  lines.push(`- privacy: ${spaceRole.priority.privacy}`);
  lines.push(`- comfort: ${spaceRole.priority.comfort}`);
  lines.push(`- brand_display: ${spaceRole.priority.brand_display}`);
  lines.push(`- circulation: ${spaceRole.priority.circulation}`);
  lines.push('');

  // Visual rules section
  lines.push(`**Visual Rules**:`);
  lines.push(`- lighting: ${spaceRole.visual_rules.lighting}`);
  lines.push(`- material: ${spaceRole.visual_rules.material}`);
  lines.push(`- density: ${spaceRole.visual_rules.density}`);
  lines.push('');

  // Functional constraints
  const fc = spaceRole.functional_constraints ?? {};
  lines.push(`**Functional Constraints**:`);
  if (fc.must_include && fc.must_include.length) {
    lines.push(`- must_include: ${fc.must_include.join(', ')}`);
  }
  if (fc.must_exclude && fc.must_exclude.length) {
    lines.push(`- must_exclude: ${fc.must_exclude.join(', ')}`);
  }
  if (fc.key_equipment && fc.key_equipment.length) {
    lines.push(`- key_equipment: ${fc.key_equipment.join(' / ')}`);
  }
  if (fc.human_traffic) {
    lines.push(`- human_traffic: ${fc.human_traffic}`);
  }
  lines.push('');

  // Narrative focus
  lines.push(`**Narrative Focus**: ${spaceRole.narrative_focus}`);
  lines.push('');
  lines.push('**Usage**: 把上面 role / priority / visual_rules / functional_constraints 当作该空间的硬约束.');
  lines.push('brand_translation 跟 architecture_dna 仍然按 Phase 9C 模式输出, 不变.');
  lines.push('模型需要在保持品牌语言统一的前提下, 表达这个空间的功能差异化 (privacy / comfort / brand_display / circulation 倾向).');

  const content = lines.join('\n');
  return {
    blockId,
    blockTitle,
    content: blockTitle + '\n' + content,
    spaceRole,
    characterCount: content.length,
  };
}

// Re-exports
export {
  PHASE,
  VERSION,
  MODULE_NAME,
  DATA_CONTRACT,
  loadSpaceRole,
  SUPPORTED_SPACE_TYPES,
  sceneTypeToFileName,
  listAvailableSpaceRoles,
};

export const SPACE_ROLE_INTELLIGENCE_VERSION = VERSION;
