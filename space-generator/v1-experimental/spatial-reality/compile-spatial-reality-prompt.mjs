// Spatial Reality Pipeline Compiler v1 (Phase 9B.1)
// 用途: Phase 9B.1 Spatial Reality Calibration 入口. 在 Phase 9B Mode B
//       (compileRuntimePromptWithSpatialIntelligence, 14 块) 基础上, 插入
//       spatial_reality_constraint 块, 形成 Mode B (Phase 9B.1, 15 块).
//
// 链路 (Phase 9B.1 §2):
//   Brand DNA
//     ↓
//   Spatial Intent (Phase 9A.1 / 9A.2)
//     ↓
//   Spatial Reality Constraint (本 Phase 9B.1)
//     ↓
//   Architecture Bridge (Phase 9A.3)
//     ↓
//   Architecture Anchor (Phase 8A)
//     ↓
//   Architecture Function Bridge (Phase 8B.1)
//     ↓
//   Prompt Compiler
//     ↓
//   Provider
//
// Phase 9B.1 §5 A/B:
//   Mode A = Phase 9B Mode B (14 块, 无 spatial_reality_constraint)
//   Mode B = Mode A + spatial_reality_constraint 块 (15 块)
//
// 设计原则 (Phase 9B.1 §8 冻结):
//   1. 不修改 baseline: compileFieldEnrichedPrompt / compileRuntimePrompt / compileRuntimePromptWithSpatialIntelligence 100% 不变
//   2. 在 Phase 9B Mode B 输出基础上插入 spatial_reality_constraint 块
//   3. 新块位置: 在 architecture_language 之后, architecture_context 之前
//      (跟 Phase 8A 一样的插入策略: 紧跟在 architecture context chain 之前)
//   4. 不调 Provider, deterministic 输出
//
// 不调 Provider, 不污染生产代码, 不动 v1-baseline.

import { compileRuntimePromptWithSpatialIntelligence } from '../spatial-intelligence-pipeline/compile-spatial-intelligence-prompt.mjs';
import { compileSpatialRealityBlock } from './prompt-block/compile-spatial-reality-block.mjs';

/**
 * Phase 9B.1 Mode B compiler: compile Runtime prompt with Spatial Reality layer.
 *
 * 在 Phase 9B Mode B 基础上, 插入 spatial_reality_constraint 块 (15 块).
 *
 * @param dna               Space DNA instance (v0.1 / v0.1.1 / v0.3 任意)
 * @param spatialIntentDna  Phase 9A.1 spatial intent dna (5 string 字段)
 * @param spatialRealityDna Phase 9B.1 spatial reality dna (8 字段, 上面 spatialRealityDna 字段)
 * @param options           { brandKey, autoSelectAnchors, anchorMaxCount, anchorCriteria,
 *                                  forceBaseline, weight (0-1, default 0.25) }
 * @returns runtime prompt with mode: 'B-spatial-reality'
 */
export function compileRuntimePromptWithSpatialReality(dna, spatialIntentDna, spatialRealityDna, options = {}) {
  if (!dna || typeof dna !== 'object') {
    throw new TypeError('compileRuntimePromptWithSpatialReality: dna must be a non-null object');
  }
  if (!spatialIntentDna || typeof spatialIntentDna !== 'object') {
    throw new TypeError('compileRuntimePromptWithSpatialReality: spatialIntentDna must be a non-null object');
  }
  if (!spatialRealityDna || typeof spatialRealityDna !== 'object') {
    throw new TypeError('compileRuntimePromptWithSpatialReality: spatialRealityDna must be a non-null object');
  }

  // 1. 跑 Phase 9B Mode B (compileRuntimePromptWithSpatialIntelligence) 拿 14 块 baseline
  const phase9bModeB = compileRuntimePromptWithSpatialIntelligence(dna, spatialIntentDna, options);

  // 2. 编译 spatial_reality_constraint 块
  const spatialRealityBlockText = compileSpatialRealityBlock(spatialRealityDna);

  // 3. 插入新块: 在 architecture_language 之后 (第 3 块, index 2), 在 architecture_context 之前
  //    Phase 9B 块顺序: task / spatial_intent / architecture_language / architecture_context / ...
  //    期望位置: index 3 (在 architecture_language 之后, architecture_context 之前)
  const newBlocks = [
    ...phase9bModeB.blocks.slice(0, 3), // task / spatial_intent / architecture_language
    { id: 'spatial_reality_constraint', text: spatialRealityBlockText },
    ...phase9bModeB.blocks.slice(3),
  ];

  const markdown = newBlocks.map((b) => b.text).join('\n');

  return {
    ...phase9bModeB,
    markdown,
    blocks: newBlocks,
    blockCount: newBlocks.length,
    characterCount: markdown.length,
    runtimePath: 'spatial_intelligence_9a2_9a3_9b1_8a_8b1',
    mode: 'B-spatial-reality',
    spatialRealityPath: 'spatial_intelligence_9a2_9a3_9b1_8a_8b1',
    spatialRealityDna,
  };
}

/**
 * Phase 9B.1 Mode A compiler wrapper: 显式声明 Phase 9B.1 Mode A, 跟 Mode B 对照.
 * Phase 9B.1 Mode A = Phase 9B Mode B (14 块, 仍包含 spatial_intent + architecture_language,
 * 但没有 spatial_reality_constraint 块).
 *
 * @param dna
 * @param spatialIntentDna
 * @param options
 * @returns runtime prompt with mode: 'A-spatial-reality'
 */
export function compileRuntimePromptModeASpatialReality(dna, spatialIntentDna, options = {}) {
  const phase9bModeB = compileRuntimePromptWithSpatialIntelligence(dna, spatialIntentDna, options);
  return { ...phase9bModeB, mode: 'A-spatial-reality' };
}
