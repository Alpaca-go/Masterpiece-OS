// Spatial Intent Presets — Design Intent Controller v1.0
// 用途: Phase (Spatial Intent Presets) §5 Runtime 数据结构 + §3 设计原则.
//       4 个 user-facing preset (brand_driven / architecture_driven / reference_driven /
//       balanced) -> 4 维 intent expression (brandExpression / architectureExpression /
//       referenceInfluence / industryConstraint).
//
// §3 核心设计原则:
//   - 不暴露 prompt 权重 / 数值比例 / 内部 compiler 参数
//   - 不开放全部开关 (all-ON 会导致方向冲突)
//   - preset 单选 (不让用户组合产生冲突)
//
// §5 Runtime 数据结构:
//   spatialIntentPreset = { preset, intent: { brandExpression, architectureExpression,
//                                             referenceInfluence, industryConstraint } }
//
// §6 Compiler Integration:
//   User Select Preset -> Spatial Intent Preset -> Runtime Strategy
//                      -> Prompt Compiler -> Provider
//
// §7 Prompt 层变化:
//   不加入 "weight 80%", 而是文字 emphasis block:
//   "Prioritize architectural composition, material hierarchy, spatial proportion,
//    lighting structure, while maintaining brand identity and functional realism."
//
// §11 测试策略: 4 Preset × 4 代表 brand (不测试大量组合).
//   Brand Driven × 蛙耶 / Architecture Driven × 九州美学 /
//   Balanced × 冯烫烫 / Reference Driven × (任意强参考图项目, 现在 brand 没强参考)
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PHASE = 'spatial-intent-presets';
export const VERSION = '1.0.0';
export const MODULE_NAME = 'spatial-intent-presets';

/**
 * All supported spatial intent presets.
 * Per doc §4 第一版提供 4 个模式. §8 只能单选.
 */
export const SUPPORTED_PRESETS = Object.freeze([
  'brand_driven',
  'architecture_driven',
  'reference_driven',
  'balanced',
]);

/**
 * Expression levels per §5 (4 dim).
 * Each preset assigns a level for each dim.
 */
export const EXPRESSION_LEVELS = Object.freeze([
  'low',
  'balanced',
  'maintain',
  'dominant',
]);

/**
 * Phase (Spatial Intent Presets) §5 Runtime Data Contract.
 */
export const DATA_CONTRACT = {
  phase: PHASE,
  version: VERSION,
  module: MODULE_NAME,
  input: {
    preset: 'Phase (Spatial Intent Presets) §4 4 个 mode: brand_driven / architecture_driven / reference_driven / balanced — required',
    brandKey: 'Optional: brand key for context (used in emphasis block to reference brand identity)',
  },
  output: {
    spatialIntentPreset: '{ preset, intent: { brandExpression, architectureExpression, referenceInfluence, industryConstraint } }',
    emphasisBlock: 'Markdown block string for prompt injection (text-based, no weight numbers)',
    blockId: 'spatial_intent_preset (block id matching compileSpaceRuntime block list)',
  },
  insertionPoint: 'between architecture_dna and space_role_context in Phase 9C.1 block order (and 9B.2 baseline)',
  principles: [
    'Do not modify brand_translation block (byte-equal to 9C.1)',
    'Do not modify architecture_dna block (byte-equal to 9C.1)',
    'Do not modify space_role_context block (byte-equal to 9C.1)',
    'Only ADD spatial_intent_preset block (16 -> 17 baseline; 17 -> 18 with 9C.1)',
    'Preset single-select (no combination to avoid direction conflict per §8)',
    'No weight numbers in user-facing layer (§3 / §7)',
  ],
};

/**
 * Per-preset intent mapping (doc §4 4 modes).
 * Maps preset -> 4-dim expression levels.
 *
 * 4 dimensions:
 *   - brandExpression: how much brand identity / visual signature is emphasized
 *   - architectureExpression: how much architecture language / material hierarchy is emphasized
 *   - referenceInfluence: how much reference image drives the output
 *   - industryConstraint: how strictly industry rules apply
 */
export const PRESET_INTENTS = Object.freeze({
  brand_driven: {
    preset: 'brand_driven',
    label: '品牌驱动 / Brand Driven',
    description: '让空间成为品牌体验的一部分. 适用: 潮流餐饮 / 零售品牌 / IP空间 / 快闪店.',
    runtimeTendency: {
      enhance: ['Brand Identity', 'Visual Signature', 'Brand Story Translation'],
      maintain: ['Industry Logic', 'Spatial Reality', 'Basic Architecture Quality'],
    },
    intent: {
      brandExpression: 'dominant',
      architectureExpression: 'balanced',
      referenceInfluence: 'low',
      industryConstraint: 'maintain',
    },
  },
  architecture_driven: {
    preset: 'architecture_driven',
    label: '建筑驱动 / Architecture Driven',
    description: '让空间设计本身成为核心. 适用: 医美 / 酒店 / 高端商业 / 展厅.',
    runtimeTendency: {
      enhance: ['Architecture Language', 'Spatial Structure', 'Material Expression', 'Lighting Behavior'],
      maintain: ['Brand Identity', 'Functional Reality'],
    },
    intent: {
      brandExpression: 'balanced',
      architectureExpression: 'dominant',
      referenceInfluence: 'low',
      industryConstraint: 'maintain',
    },
  },
  reference_driven: {
    preset: 'reference_driven',
    label: '参考驱动 / Reference Driven',
    description: '将参考图中的空间语言转译到当前品牌. Reference = Design Mechanism, 不是 Object Copy. 适用: 用户拥有明确空间参考.',
    runtimeTendency: {
      learn: ['Composition', 'Spatial Grammar', 'Lighting Language', 'Material Language'],
      forbidden: ['Logo', '文案', '原品牌资产', '行业属性'],
    },
    intent: {
      brandExpression: 'balanced',
      architectureExpression: 'balanced',
      referenceInfluence: 'dominant',
      industryConstraint: 'maintain',
    },
  },
  balanced: {
    preset: 'balanced',
    label: '均衡模式 / Balanced',
    description: '默认模式. 平衡 Brand / Industry / Architecture / Material. 适用: 大部分商业空间项目.',
    runtimeTendency: {
      balance: ['Brand', 'Industry', 'Architecture', 'Material'],
    },
    intent: {
      brandExpression: 'balanced',
      architectureExpression: 'balanced',
      referenceInfluence: 'balanced',
      industryConstraint: 'maintain',
    },
  },
});

/**
 * Load a single preset JSON by preset name.
 * @param {string} preset - The preset name (e.g. "brand_driven").
 * @returns {Object} The preset object.
 */
export function loadPreset(preset) {
  if (!preset || typeof preset !== 'string') {
    throw new TypeError(`loadPreset: preset is required (got ${JSON.stringify(preset)})`);
  }
  if (!SUPPORTED_PRESETS.includes(preset)) {
    throw new Error(`loadPreset: preset "${preset}" is not in supported presets: ${SUPPORTED_PRESETS.join(', ')}`);
  }
  // preset is a valid built-in; use PRESET_INTENTS as the source of truth
  return PRESET_INTENTS[preset];
}

/**
 * List all available presets.
 * @returns {string[]} Array of preset names.
 */
export function listAvailablePresets() {
  return Array.from(SUPPORTED_PRESETS);
}
