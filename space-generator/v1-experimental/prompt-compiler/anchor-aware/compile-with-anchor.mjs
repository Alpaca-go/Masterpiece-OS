// Anchor-Aware Field-Enriched Prompt Compiler v1 (Phase 8A)
// 用途: 在 v1.1 10 块编译基础上, 注入 Architecture Anchor 作为 in-context reference,
//       形成 11 块编译 (含 architecture_context). Architecture Context 块放在最前面
//       (在 task 之后, 在 architectural_concept 之前), 让 anchor 提供的建筑机制
//       优先于 DNA 抽提的 architectural_concept, 强化建筑美学.
//
// Baseline 行为: 走 ../field-enriched/compile-prompt.mjs::compileFieldEnrichedPrompt (10 块).
// 这里是 parallel 函数, 不动 baseline.
//
// v1.1 §6 末尾 "空间概念必须优先于品牌表达" — architecture_context 比
// architectural_concept 更早出现, 等于把 anchor 提供的建筑机制作为
// "先验", DNA 的 architectural_concept 是 anchor 先验 + DNA 字段的整合.

import { compileFieldEnrichedPrompt } from '../field-enriched/compile-prompt.mjs';

/**
 * Compile prompt with architecture anchor in-context reference.
 * @param dna      Space DNA instance (v0.1 or v1.1)
 * @param anchors  array of {id, role, primaryMechanism, secondaryMechanism, imagePath, weight}
 *                 from getAnchorsAsInContextReference(brandKey)
 * @returns        { markdown, blockCount, characterCount, blocks, anchorContextIncluded }
 */
export function compileFieldEnrichedPromptWithAnchorContext(dna, anchors) {
  if (!dna || typeof dna !== 'object') {
    throw new TypeError('compileFieldEnrichedPromptWithAnchorContext: dna must be a non-null object');
  }
  if (!Array.isArray(anchors)) {
    throw new TypeError('compileFieldEnrichedPromptWithAnchorContext: anchors must be an array');
  }

  const baseline = compileFieldEnrichedPrompt(dna);

  if (anchors.length === 0) {
    // No anchor provided — degrade to baseline (10 blocks, no architecture_context)
    return {
      ...baseline,
      anchorContextIncluded: false,
    };
  }

  const architectureContextBlock = compileArchitectureContext(anchors);

  // Insert architecture_context as the SECOND block (after task, before architectural_concept).
  // v1.1 §6: 空间概念优先于品牌表达; Phase 8A: anchor 提供的建筑机制作为先验,
  // 进一步先于 DNA 的 architectural_concept.
  const taskBlock = baseline.blocks[0];
  const tailBlocks = baseline.blocks.slice(1);

  const newBlocks = [taskBlock, { id: 'architecture_context', text: architectureContextBlock }, ...tailBlocks];

  const markdown = newBlocks.map((b) => b.text).join('\n');

  return {
    markdown,
    blockCount: newBlocks.length,
    characterCount: markdown.length,
    blocks: newBlocks,
    anchorContextIncluded: true,
    anchorIds: anchors.map((a) => a.id),
  };
}

function compileArchitectureContext(anchors) {
  // anchor 块: 列每个 anchor 的 primary/secondary mechanism, 强调 "建筑机制先验"
  // 不直接列具体物 (v1.0 §34 规则一/五), 只列机制
  const lines = [
    '# Architecture Context (in-context reference, Phase 8A)',
    '',
    '> 建筑机制先验 (anchor 先于 DNA 的 architectural_concept, 强化建筑美学).',
    '> 以下机制是当前品牌已通过 S 级验收的建筑语言样本, 不得直接复刻其具体物 (v1.0 §34 规则一/五).',
    '',
  ];
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    lines.push(`## Anchor ${i + 1}: ${a.id} (role=${a.role})`);
    lines.push('');
    if (a.primaryMechanism) {
      lines.push(`- **Primary Mechanism**: ${a.primaryMechanism}`);
    }
    if (a.secondaryMechanism) {
      lines.push(`- **Secondary Mechanism**: ${a.secondaryMechanism}`);
    }
    lines.push('');
  }
  lines.push('## Usage in this prompt');
  lines.push('');
  lines.push('把上述 anchor 提供的建筑机制作为 **先验** (priority), 在 architectural_concept 块之前.');
  lines.push('DNA 字段描述的空间概念必须与 anchor 的建筑机制 **一致**, 不冲突.');
  lines.push('禁止把 anchor 中的具体物 (具体天花曲线 / 具体玻璃分格 / 具体膜形态) 复刻到生成图里.');
  return lines.join('\n');
}
