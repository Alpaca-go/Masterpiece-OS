// Space Role Intelligence Data Contract v1 (Phase 9C.1)
// 用途: Phase 9C.1 §5 Space Role Schema + §6 Prompt Pipeline 整合.
//       每种 spaceType (reception / lobby / vip-lounge / consultation /
//       treatment / corridor / product-display / exterior) 有独立的 role /
//       priority / visual_rules / functional_constraints / narrative_focus,
//       让不同空间有真实功能差异, 避免 Phase 9C 的"白色高级空间+相似膜结构+相似玻璃隔断"问题.
//
// Phase 9C.1 §7 插入位置: architectural_concept -> architecture_dna ->
//                     space_role_context (NEW) -> brand_translation
// §7 原则: 不修改 brand_translation / architecture_dna, 只 ADD space_role_context block.
//
// Phase 9C.1 §10 验收:
//   - Space Role JSON 可加载 ✓
//   - Prompt Compiler 支持新 block (16 -> 17 blocks) ✓
//   - Brand Translation 不变化 (byte-equal) ✓
//   - Architecture DNA 不变化 ✓
//   - 不同 space_type 输出 priority / visual_rules / functional_constraints 都不同 ✓
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

export const PHASE = '9C.1';
export const VERSION = '1.0.0';
export const MODULE_NAME = 'space-role-intelligence';

/**
 * All supported space types. Each maps to a JSON file in the same directory.
 * The space_type names match the Phase 9C sceneDefinition.sceneType enum
 * (with hyphen-form normalization for file names).
 */
export const SUPPORTED_SPACE_TYPES = Object.freeze([
  'reception',
  'lobby',
  'vip_lounge',
  'consultation',
  'treatment',
  'corridor',
  'product_display',
  'exterior',
]);

/**
 * Normalize sceneDefinition.sceneType (snake_case or kebab-case) to file name
 * (kebab-case). e.g. "vip_lounge" -> "vip-lounge", "vip-lounge" -> "vip-lounge".
 */
export function sceneTypeToFileName(sceneType) {
  return String(sceneType ?? '').toLowerCase().replace(/_/g, '-');
}

/**
 * Phase 9C.1 §5 Space Role Schema.
 *
 * @typedef {Object} SpaceRole
 * @property {string} schemaVersion
 * @property {string} version
 * @property {string} phase
 * @property {string} space_type
 * @property {string} label
 * @property {{ primary: string, secondary: string }} role
 * @property {Object} priority - 4 维 0-1: privacy / comfort / brand_display / circulation
 * @property {{ lighting: string, material: string, density: string }} visual_rules
 * @property {{ must_include: string[], must_exclude: string[], key_equipment: string[], human_traffic: string }} functional_constraints
 * @property {string} narrative_focus
 */

export const DATA_CONTRACT = {
  phase: PHASE,
  version: VERSION,
  module: MODULE_NAME,
  input: {
    spaceType: 'Phase 9C sceneDefinition.sceneType (e.g. "reception" / "vip_lounge" / "treatment") — required',
    dnaSceneType: 'Optional: original DNA sceneType for fallback',
  },
  output: {
    spaceRole: 'Loaded SpaceRole JSON (see schema above)',
    spaceRoleBlock: 'Markdown block string for prompt injection',
    blockId: 'space_role_context (block id matching Phase 9C compileSpaceRuntime block list)',
  },
  insertionPoint: 'between architecture_dna and brand_translation in Phase 9C block order',
  principles: [
    'Do not modify brand_translation block (byte-equal to Phase 9C)',
    'Do not modify architecture_dna block',
    'Only ADD space_role_context block (16 -> 17 blocks)',
    'space_role_context is space-type-specific, brand-agnostic (rules apply to all brands)',
  ],
};

/**
 * Load a single SpaceRole JSON by sceneType.
 * @param {string} sceneType - The scene type (e.g. "reception", "vip_lounge").
 * @returns {SpaceRole} The SpaceRole object.
 */
export function loadSpaceRole(sceneType) {
  if (!sceneType || typeof sceneType !== 'string') {
    throw new TypeError(`loadSpaceRole: sceneType is required (got ${JSON.stringify(sceneType)})`);
  }
  const fileName = sceneTypeToFileName(sceneType);
  const filePath = join(__dirname, `${fileName}.json`);
  if (!existsSync(filePath)) {
    throw new Error(`loadSpaceRole: no space role found for sceneType "${sceneType}" (looked at ${filePath}). Supported: ${SUPPORTED_SPACE_TYPES.join(', ')}`);
  }
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

/**
 * List all SpaceRole JSONs available in the module directory.
 * @returns {string[]} Array of sceneType values.
 */
export function listAvailableSpaceRoles() {
  const files = readdirSync(__dirname).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  return files.map((f) => f.replace(/\.json$/, '').replace(/-/g, '_'));
}
