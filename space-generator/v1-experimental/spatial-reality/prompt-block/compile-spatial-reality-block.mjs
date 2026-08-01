// Spatial Reality Constraint Block Compiler v1 (Phase 9B.1)
// 用途: 把 spatialRealityDna (Phase 9B.1) 编译为 prompt block 文本.
//       用于 Mode B (Spatial Intelligence + Spatial Reality Pipeline) 的
//       spatial_reality_constraint block.
//
// Phase 9B.1 §4 Prompt Compiler:
//   Mode B 块顺序: task / spatial_intent / architecture_language /
//                   spatial_reality_constraint (本 block) / architecture_context /
//                   architecture_function_bridge / architectural_concept / ...
//                   material / lighting / composition / rendering / negative_constraints
//
// Phase 9B.1 §2 目的: 同时获得建筑美学 + 品牌气质 + 商业空间真实性.
// Phase 9B.1 §8 冻结: Spatial Intent / Architecture Anchor / architecture_context 都不动.
//
// 不调 Provider, 不修改 baseline 行为, 不污染生产代码.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Compile spatialRealityDna -> spatial_reality_constraint block text.
 *
 * @param spatialRealityDna  Phase 9B.1 spatial reality dna (8 字段)
 * @returns block text (markdown)
 */
export function compileSpatialRealityBlock(spatialRealityDna) {
  if (!spatialRealityDna || typeof spatialRealityDna !== 'object') {
    throw new TypeError('compileSpatialRealityBlock: spatialRealityDna must be a non-null object');
  }

  const lines = [
    '# Spatial Reality Constraint (Phase 9B.1: 什么商业现实约束这个空间)',
    '',
    '> 商业空间真实性是硬约束. 这次生成的空间必须在以下商业现实里站住脚, 不能偏向',
    '> exhibition / installation / concept architecture / pure art space.',
    '> 这一层在 spatial_intent + architecture_language 之后, 在 architecture_context',
    '> 之前, 给建筑语言加商业现实护栏.',
    '> 注意: 不指定具体 anchor / 装饰元素 (Phase 9A.3 §9 Layer Boundary).',
    '',
    `**Space Type** (空间类型): ${spatialRealityDna.spaceType || 'n/a'}`,
    '',
    `**Commercial Scale** (商业规模): ${spatialRealityDna.commercialScale || 'n/a'}`,
    '',
    '**Required Zones** (必备功能区, 必须全部出现, staff 可见):',
  ];

  const requiredZones = Array.isArray(spatialRealityDna.requiredZones)
    ? spatialRealityDna.requiredZones
    : [];
  for (const z of requiredZones) {
    lines.push(`- ${z}`);
  }

  lines.push('');
  lines.push(`**Operation Logic** (运营逻辑): ${spatialRealityDna.operationLogic || 'n/a'}`);

  lines.push('');
  lines.push(`**User Flow** (用户动线): ${spatialRealityDna.userFlow || 'n/a'}`);

  lines.push('');
  lines.push(`**Privacy Requirement** (隐私要求): ${spatialRealityDna.privacyRequirement || 'n/a'}`);

  lines.push('');
  lines.push(`**Material Reality** (材料现实, 真实材料而非概念): ${spatialRealityDna.materialReality || 'n/a'}`);

  lines.push('');
  lines.push('**Forbidden Spatial Types** (反漂移, 以下空间类型**绝对不能**出现, 出现任何一个视为失败):');

  const forbidden = Array.isArray(spatialRealityDna.forbiddenSpatialTypes)
    ? spatialRealityDna.forbiddenSpatialTypes
    : [];
  for (const f of forbidden) {
    lines.push(`- ❌ ${f}`);
  }

  lines.push('');
  lines.push('**Usage**:');
  lines.push('- 上面 8 字段是这次空间的硬约束, architecture / material / lighting / composition 块必须为这些约束服务, 不是反过来.');
  lines.push('- 必备功能区 (requiredZones) 必须在图里全部出现, staff 必须可见 (非 0 staff 纯展示).');
  lines.push('- forbidden spatial types 是**反漂移**硬护栏, 出现任何一个视为该 mode 失败.');
  lines.push('- 商业真实性优先于建筑美学: 真实材料 > 概念材料, 真实功能 > 概念空间, 真实 staff > 纯展示.');

  return lines.join('\n') + '\n';
}
