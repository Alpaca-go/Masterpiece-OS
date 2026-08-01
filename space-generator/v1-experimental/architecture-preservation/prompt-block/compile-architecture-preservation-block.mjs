// Architecture Preservation Block Compiler v1 (Phase 9B.2)
// 用途: 把 architecturePreservation (Phase 9B.2) 编译为 prompt block 文本.
//       用于 Mode B (Phase 9B.2 Reality Constraint + Architecture Preservation Pipeline) 的
//       architecture_preservation block.
//
// Phase 9B.2 §5 Prompt Compiler:
//   Phase 9B.2 块顺序: task / spatial_intent / architecture_language /
//                      spatial_reality_constraint / architecture_context /
//                      architecture_preservation (本 block) / architecture_function_bridge /
//                      architectural_concept / ... / negative_constraints
//
// Phase 9B.2 §6 设计原则 (mechanism not object):
//   - 只保护机制, 不添加具体物体
//   - 禁止: 增加额外装饰 / 强行加入雕塑 / 堆叠视觉符号
//   - 允许: 保留空间结构 / 保留材质关系 / 保留光线逻辑
//
// Phase 9B.2 §9 验收:
//   1. Architecture Quality >= Phase 9B.1
//   2. Functional Realism 不下降超过 5%
//   3. Brand Translation 保持稳定
//   4. 空间仍具备商业运营真实性 (Phase 9B.1 不下降)
//
// 不调 Provider, 不修改 baseline 行为, 不污染生产代码.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROTECTED_ELEMENT_DESCRIPTIONS = {
  ceiling_language: '保护顶部空间语言、吊顶结构、光环境. 膜天花 / 边缘光带 / 顶底发光缝 / 实木吊顶 / 纸灯 等机制必须保留.',
  spatial_signature: '保护空间识别度和核心建筑特征. 接待台 + 沙发 + 走廊 / open_kitchen + dining / tea_corner + herbal cabinet 等空间节奏必须保留.',
  material_expression: '保护材质关系和表面表达. 微水泥 + 木材 + 半透膜 / 暖木 + 真实厨房设备 / 天然木 + 宣纸 + 陶瓷 等材质组合必须保留.',
  lighting_behavior: '保护品牌光环境. 主光 + 边缘光 + ambient 4 层 / 自然光 + 暖光 / 纸灯软光 + 茶艺区暖光 等光环境逻辑必须保留.',
};

/**
 * Compile architecturePreservation -> architecture_preservation block text.
 *
 * @param architecturePreservation  Phase 9B.2 architecture preservation object
 *                                   { enabled, weight, protectedElements }
 * @returns block text (markdown)
 */
export function compileArchitecturePreservationBlock(architecturePreservation) {
  if (!architecturePreservation || typeof architecturePreservation !== 'object') {
    throw new TypeError('compileArchitecturePreservationBlock: architecturePreservation must be a non-null object');
  }

  const enabled = architecturePreservation.enabled !== false; // default true
  if (!enabled) {
    // disabled — return minimal block noting preservation is off
    return [
      '# Architecture Preservation (Phase 9B.2: DISABLED)',
      '',
      '> 建筑保护层被关闭. Phase 9B.2 §4 enabled=false, 不保护 Architecture Anchor 提供的空间机制.',
      '> 这是明确选择, 不是默认状态. 关闭保护层意味着模型可以自由演化建筑机制, 不受 anchor 约束.',
      '',
    ].join('\n') + '\n';
  }

  const weight = typeof architecturePreservation.weight === 'number'
    ? architecturePreservation.weight
    : 0.5;
  const protectedElements = Array.isArray(architecturePreservation.protectedElements)
    ? architecturePreservation.protectedElements
    : [];

  const lines = [
    '# Architecture Preservation (Phase 9B.2: 什么建筑机制必须被保护)',
    '',
    '> Phase 9B 给了 Architecture Anchor 提供的建筑美感, Phase 9B.1 通过 Reality Constraint 提升了',
    '> 商业真实性, 但可能削弱了 anchor 的空间记忆点. 这一层在 architecture_context (Phase 8A) 之后,',
    '> 在 architecture_function_bridge 之前, 显式保护 anchor 提供的关键建筑机制.',
    '> 设计原则: **mechanism not object** (Phase 9B.2 §6).',
    '',
    `**Weight** (保护强度): ${weight.toFixed(2)} (0.3 弱保护 / 0.5 平衡 / 0.7 强保护 / 0.9 概念优先)`,
    '',
    '**Protected Elements** (保护元素, 只保护机制, 不添加具体装饰物):',
  ];

  if (protectedElements.length === 0) {
    lines.push('- (无 — 保护层启用但未指定元素, 默认不提供任何保护)');
  } else {
    for (const elem of protectedElements) {
      const desc = PROTECTED_ELEMENT_DESCRIPTIONS[elem];
      if (desc) {
        lines.push(`- **${elem}** — ${desc}`);
      } else {
        lines.push(`- ${elem} (未知元素, 跳过)`);
      }
    }
  }

  lines.push('');
  lines.push('**Usage** (Phase 9B.2 §6 mechanism not object):');
  lines.push('- ✓ 允许: 保留空间结构 / 保留材质关系 / 保留光线逻辑');
  lines.push('- ✗ 禁止: 增加额外装饰 / 强行加入雕塑 / 堆叠视觉符号');
  lines.push('- ✗ 禁止: 引入未在 anchor 中存在的具体装饰元素 (花瓣 / 羽翼 / 雕塑 / 装置)');
  lines.push('- 上面列出的 protected elements 必须被生成图遵守, 强度按 weight 调整');
  lines.push('- weight=0.7 意味着 70% 保留 anchor 机制 + 30% 自由演化, weight=0.9 几乎完全保留 anchor');

  return lines.join('\n') + '\n';
}
