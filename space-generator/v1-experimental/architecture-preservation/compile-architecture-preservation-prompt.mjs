// Architecture Preservation Pipeline Compiler v1 (Phase 9B.2)
// 用途: Phase 9B.2 Architecture-Preservation Calibration 入口. 在 Phase 9B.1 Mode B
//       (compileRuntimePromptWithSpatialReality, 15 块) 基础上, 插入
//       architecture_preservation 块, 形成 Mode B (Phase 9B.2, 16 块).
//
// 链路 (Phase 9B.2 §2):
//   Architecture Anchor
//     ↓
//   Architecture Preservation Layer (本 Phase 9B.2)
//     ↓
//   Reality Constraint (Phase 9B.1)
//     ↓
//   Prompt Compiler
//     ↓
//   Image Generation
//
// Phase 9B.2 §7 A/B:
//   Mode A = Phase 9B.1 Mode B (15 块, Reality Constraint only, baseline)
//   Mode B = Mode A + architecture_preservation 块 (16 块, Reality Constraint + Architecture Preservation)
//
// 设计原则 (Phase 9B.2 §6):
//   1. 不修改 baseline: compileFieldEnrichedPrompt / compileRuntimePrompt /
//      compileRuntimePromptWithSpatialIntelligence / compileRuntimePromptWithSpatialReality 100% 不变
//   2. 在 Phase 9B.1 Mode B 输出基础上插入 architecture_preservation 块
//   3. 新块位置: 在 architecture_context (Phase 8A) 之后, architecture_function_bridge 之前
//      (跟 Phase 8A 一样的插入策略: 紧跟在 architecture context 之后)
//   4. mechanism not object: 只保护机制, 不添加具体物体
//   5. 不调 Provider, deterministic 输出
//
// 不调 Provider, 不污染生产代码, 不动 v1-baseline.

import { compileRuntimePromptWithSpatialReality } from '../spatial-reality/compile-spatial-reality-prompt.mjs';
import { compileArchitecturePreservationBlock } from './prompt-block/compile-architecture-preservation-block.mjs';

/**
 * Phase 9B.2 Mode B compiler: compile Runtime prompt with Architecture Preservation layer.
 *
 * 在 Phase 9B.1 Mode B 基础上, 插入 architecture_preservation 块 (16 块).
 *
 * @param dna                          Space DNA instance (v0.1 / v0.1.1 / v0.3 任意)
 * @param spatialIntentDna             Phase 9A.1 spatial intent dna (5 string 字段)
 * @param spatialRealityDna            Phase 9B.1 spatial reality dna (8 字段)
 * @param architecturePreservation     Phase 9B.2 architecture preservation dna
 *                                      { enabled: bool, weight: 0-1, protectedElements: array }
 * @param options                      { brandKey, autoSelectAnchors, anchorMaxCount, anchorCriteria,
 *                                           forceBaseline, weight (0-1, default 0.25) }
 * @returns runtime prompt with mode: 'B-architecture-preservation'
 */
export function compileRuntimePromptWithArchitecturePreservation(dna, spatialIntentDna, spatialRealityDna, architecturePreservation, options = {}) {
  if (!dna || typeof dna !== 'object') {
    throw new TypeError('compileRuntimePromptWithArchitecturePreservation: dna must be a non-null object');
  }
  if (!spatialIntentDna || typeof spatialIntentDna !== 'object') {
    throw new TypeError('compileRuntimePromptWithArchitecturePreservation: spatialIntentDna must be a non-null object');
  }
  if (!spatialRealityDna || typeof spatialRealityDna !== 'object') {
    throw new TypeError('compileRuntimePromptWithArchitecturePreservation: spatialRealityDna must be a non-null object');
  }
  if (!architecturePreservation || typeof architecturePreservation !== 'object') {
    throw new TypeError('compileRuntimePromptWithArchitecturePreservation: architecturePreservation must be a non-null object');
  }

  // 1. 跑 Phase 9B.1 Mode B (compileRuntimePromptWithSpatialReality) 拿 15 块 baseline
  const phase9b1ModeB = compileRuntimePromptWithSpatialReality(dna, spatialIntentDna, spatialRealityDna, options);

  // 2. 编译 architecture_preservation 块
  const architecturePreservationBlockText = compileArchitecturePreservationBlock(architecturePreservation);

  // 3. 插入新块: 在 architecture_context (Phase 8A) 之后 (第 5 块, index 4), 在 architecture_function_bridge 之前
  //    Phase 9B.1 块顺序:
  //      task / spatial_intent / architecture_language / spatial_reality_constraint / architecture_context /
  //      architecture_function_bridge / ...
  //    Phase 9B.2 块顺序:
  //      task / spatial_intent / architecture_language / spatial_reality_constraint / architecture_context /
  //      architecture_preservation (新) / architecture_function_bridge / ...
  const newBlocks = [
    ...phase9b1ModeB.blocks.slice(0, 5), // task / spatial_intent / architecture_language / spatial_reality_constraint / architecture_context
    { id: 'architecture_preservation', text: architecturePreservationBlockText },
    ...phase9b1ModeB.blocks.slice(5),
  ];

  const markdown = newBlocks.map((b) => b.text).join('\n');

  return {
    ...phase9b1ModeB,
    markdown,
    blocks: newBlocks,
    blockCount: newBlocks.length,
    characterCount: markdown.length,
    runtimePath: 'spatial_intelligence_9a2_9a3_9b1_9b2_8a_8b1',
    mode: 'B-architecture-preservation',
    architecturePreservationPath: 'spatial_intelligence_9a2_9a3_9b1_9b2_8a_8b1',
    architecturePreservation,
  };
}

/**
 * Phase 9B.2 Mode A compiler wrapper: 显式声明 Phase 9B.2 Mode A, 跟 Mode B 对照.
 * Phase 9B.2 Mode A = Phase 9B.1 Mode B (15 块, 仍包含 spatial_intent + architecture_language +
 * spatial_reality_constraint, 但没有 architecture_preservation 块).
 *
 * @param dna
 * @param spatialIntentDna
 * @param spatialRealityDna
 * @param options
 * @returns runtime prompt with mode: 'A-architecture-preservation'
 */
export function compileRuntimePromptModeAArchitecturePreservation(dna, spatialIntentDna, spatialRealityDna, options = {}) {
  const phase9b1ModeB = compileRuntimePromptWithSpatialReality(dna, spatialIntentDna, spatialRealityDna, options);
  return { ...phase9b1ModeB, mode: 'A-architecture-preservation' };
}
