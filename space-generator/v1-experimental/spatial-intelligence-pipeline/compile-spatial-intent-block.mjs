// Spatial Intent Block Compiler v1 (Phase 9B)
// 用途: 把 compiledSpatialIntent (Phase 9A.2) 编译为 prompt block 文本.
//       用于 Mode B (Spatial Intelligence Pipeline) 的 spatial_intent block.
//
// Phase 9B §5 Provider Test Protocol:
//   Mode A = Previous Pipeline (compileRuntimePrompt, 11/12 块)
//   Mode B = Mode A + spatial_intent block + architecture_language block
//
// 不调 Provider, 不修改 baseline 行为, 不污染生产代码.
//
// 设计 (Phase 9B):
//   - 块结构: 标题 + experienceGoal (一句话核心目标) + spatialStrategy (3-5 个 spatial strategy 关键词)
//   - 不重复 architecture_function_bridge 的内容 (那 5 字段聚焦商业功能)
//   - 不指定具体 anchor / material / decoration (Phase 9A.2 §9 Layer Boundary)
//   - 让模型知道: 这次生成的空间要传递什么体验 / 用什么 spatial strategy

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Compile compiledSpatialIntent -> spatial_intent block text.
 *
 * @param compiledSpatialIntent  Phase 9A.2 compiled output (5 字段 + optional weight)
 * @returns block text (markdown)
 */
export function compileSpatialIntentBlock(compiledSpatialIntent) {
  if (!compiledSpatialIntent || typeof compiledSpatialIntent !== 'object') {
    throw new TypeError('compileSpatialIntentBlock: compiledSpatialIntent must be a non-null object');
  }

  const lines = [
    '# Spatial Intent (Phase 9A.2: 为什么需要这样的空间体验)',
    '',
    '> 这次生成的空间要传递的核心体验目标 + spatial strategy 关键词.',
    '> 这一层在 architecture function bridge 之前, 给整个空间先定"体验基调".',
    '> 注意: 不指定具体 anchor / material / decoration (Phase 9A.2 §9 Layer Boundary).',
    '',
    `**Experience Goal**: ${compiledSpatialIntent.experienceGoal || 'n/a'}`,
    '',
    '**Spatial Strategy** (用以下策略实现体验目标, 不要直接复制具体元素):',
  ];

  const strategy = Array.isArray(compiledSpatialIntent.spatialStrategy)
    ? compiledSpatialIntent.spatialStrategy
    : [];
  for (const s of strategy) {
    lines.push(`- ${s}`);
  }

  lines.push('');
  lines.push('**Usage**: 把上面 experienceGoal + spatialStrategy 当作这次空间生成的"先验". '
    + 'architectural_concept / architecture_dna / material / lighting 等块需要为这个体验目标服务, 不是反过来.');

  return lines.join('\n') + '\n';
}
