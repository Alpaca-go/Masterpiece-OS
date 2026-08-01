// Spatial Intent Presets — Compile preset -> emphasis block (Phase v1.0)
// 用途: Phase (Spatial Intent Presets) §7 Prompt 层变化.
//       preset -> 4-dim intent expression -> 文字 emphasis markdown block.
//       不暴露 weight 数字, 跟 9C.1 / 9B.2 baseline 平行作为约束输入.
//
// Phase §3 原则: 不暴露 prompt 权重 / 数值比例 / 内部 compiler 参数.
// Phase §7 example: architecture_driven 文字化:
//   "Prioritize architectural composition, material hierarchy, spatial proportion,
//    lighting structure, while maintaining brand identity and functional realism."
//
// Phase §5 4 维 intent:
//   - brandExpression: low / balanced / maintain / dominant
//   - architectureExpression: low / balanced / maintain / dominant
//   - referenceInfluence: low / balanced / maintain / dominant
//   - industryConstraint: low / maintain / high (industry rules 永远不 drop, 至少 maintain)
//
// Phase §6 Compiler Integration:
//   User Select Preset -> Spatial Intent Preset -> Runtime Strategy
//                      -> Prompt Compiler -> Provider
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import {
  PHASE,
  VERSION,
  MODULE_NAME,
  DATA_CONTRACT,
  loadPreset,
  listAvailablePresets,
  SUPPORTED_PRESETS,
  PRESET_INTENTS,
} from './data-contract.mjs';

/**
 * Compile a preset into a markdown emphasis block for prompt injection.
 *
 * @param {string} preset - The preset name (e.g. "brand_driven").
 *   Must be one of SUPPORTED_PRESETS.
 * @param {Object} [options] - Optional overrides.
 *   @param {string} [options.brandKey] - Optional: brand key for context (used in emphasis text).
 *   @param {string} [options.industry] - Optional: industry name to mention in emphasis.
 * @returns {{ blockId: string, blockTitle: string, content: string,
 *            spatialIntentPreset: Object, characterCount: number }}
 */
export function compileSpatialIntentPresetBlock(preset, options = {}) {
  if (!preset || typeof preset !== 'string') {
    throw new TypeError(`compileSpatialIntentPresetBlock: preset is required (got ${JSON.stringify(preset)})`);
  }
  if (!SUPPORTED_PRESETS.includes(preset)) {
    throw new Error(`compileSpatialIntentPresetBlock: preset "${preset}" is not in supported presets: ${SUPPORTED_PRESETS.join(', ')}`);
  }

  const spatialIntentPreset = loadPreset(preset);
  const brandKey = options.brandKey ?? null;
  const industry = options.industry ?? null;

  const blockId = 'spatial_intent_preset';
  const blockTitle = `# Spatial Intent Preset (Phase v1.0: 用户选择的设计意图, ${spatialIntentPreset.label})`;

  // Build markdown body — text-based emphasis (no weight numbers, per doc §3 / §7)
  const lines = [];
  lines.push('');
  lines.push('> 这一层在 architecture_dna 之后, space_role_context 之前.');
  lines.push(`> 用户选择的设计意图 preset = **${preset}**, 转换成 4 维 intent expression:`);
  const intent = spatialIntentPreset.intent;
  lines.push(`> - brandExpression: **${intent.brandExpression}**`);
  lines.push(`> - architectureExpression: **${intent.architectureExpression}**`);
  lines.push(`> - referenceInfluence: **${intent.referenceInfluence}**`);
  lines.push(`> - industryConstraint: **${intent.industryConstraint}**`);
  lines.push('');
  lines.push(`> 原则 (Phase v1.0 §3): 不暴露 weight 数字, 用文字 emphasis 表达用户设计意图.`);
  lines.push(`> preset 单选 (§8), 不允许组合. Masterpiece OS 负责理解并执行.`);
  lines.push('');

  // === Runtime Tendency ===
  const tend = spatialIntentPreset.runtimeTendency;
  if (tend.enhance) {
    lines.push('**Runtime Tendency — Enhance (强化)**:');
    for (const e of tend.enhance) lines.push(`- ${e}`);
    lines.push('');
  }
  if (tend.maintain) {
    lines.push('**Runtime Tendency — Maintain (保持)**:');
    for (const m of tend.maintain) lines.push(`- ${m}`);
    lines.push('');
  }
  if (tend.balance) {
    lines.push('**Runtime Tendency — Balance (均衡)**:');
    for (const b of tend.balance) lines.push(`- ${b}`);
    lines.push('');
  }
  if (tend.learn) {
    lines.push('**Runtime Tendency — Learn (从参考学)**:');
    for (const l of tend.learn) lines.push(`- ${l}`);
    lines.push('');
  }
  if (tend.forbiddenCopy) {
    lines.push('**Runtime Tendency — Forbidden Copy (禁止复刻)**:');
    for (const f of tend.forbiddenCopy) lines.push(`- ${f}`);
    lines.push('');
  }

  // === Prompt-level emphasis (per doc §7 example) ===
  lines.push('**Prompt Emphasis (per §7, text-based, no weight numbers)**:');
  lines.push('');
  lines.push(buildPromptEmphasis(preset, brandKey, industry));
  lines.push('');

  // === Usage ===
  lines.push('**Usage**:');
  lines.push('- 把上面 4 维 intent 当作 prompt 编译时的硬约束.');
  lines.push('- brand_translation / architecture_dna / space_role_context 仍然按各自 phase 输出, 不变.');
  lines.push('- 当 brandExpression=dominant 时, 强化 brand identity 字段 (logo / IP / brandLight hue / literalAssetUsage).');
  lines.push('- 当 architectureExpression=dominant 时, 强化 architecture_dna 字段 (spatial structure / material hierarchy / lighting behavior).');
  lines.push('- 当 referenceInfluence=dominant 时, 强化 reference image 提供的 composition / spatial grammar / lighting / material 4 维机制.');
  lines.push('- industryConstraint=maintain 永远保持 industry rules (Phase 9C.0.5 brand identity validation gate 通过).');

  const content = lines.join('\n');
  return {
    blockId,
    blockTitle,
    content: blockTitle + '\n' + content,
    spatialIntentPreset,
    characterCount: content.length,
  };
}

/**
 * Build the per-preset prompt emphasis text (per doc §7).
 * Text-based, no weight numbers — only directional language.
 */
function buildPromptEmphasis(preset, brandKey, industry) {
  const brandMention = brandKey ? ` (当前 brand: ${brandKey})` : '';
  const industryMention = industry ? ` (当前 industry: ${industry})` : '';

  switch (preset) {
    case 'brand_driven':
      return `> Prioritize brand identity, visual signature, and brand story translation${brandMention}${industryMention}.
> Strengthen logo / IP / brand color / signature motifs / visual recognition.
> Maintain industry logic, spatial reality, and basic architecture quality.
> Avoid generic / templated outputs that ignore brand specificity.`;

    case 'architecture_driven':
      // Doc §7 verbatim example
      return `> Prioritize architectural composition, material hierarchy, spatial proportion, lighting structure${brandMention}${industryMention}.
> While maintaining brand identity and functional realism.
> Strengthen spatial structure, material expression, lighting behavior, architecture language.
> Avoid over-decorating or diluting architectural integrity with surface-level brand elements.`;

    case 'reference_driven':
      return `> Learn composition, spatial grammar, lighting language, and material language from the reference image as DESIGN MECHANISM${brandMention}${industryMention}.
> DO NOT copy logo, text, original brand assets, or industry-specific attributes.
> Translate the reference's underlying spatial language to the current brand context.
> Treat Reference = Design Mechanism, not Reference = Object Copy.`;

    case 'balanced':
      return `> Balance brand identity, industry logic, architecture quality, and material expression equally${brandMention}${industryMention}.
> Maintain all 4 dimensions; no single axis dominates.
> Suitable for most commercial space projects without strong directional preference.`;

    default:
      return `> (unknown preset: ${preset})`;
  }
}

// Re-exports
export {
  PHASE,
  VERSION,
  MODULE_NAME,
  DATA_CONTRACT,
  loadPreset,
  listAvailablePresets,
  SUPPORTED_PRESETS,
  PRESET_INTENTS,
};
