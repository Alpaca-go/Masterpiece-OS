// Space Runtime v1 (Phase 9C) — Main Runtime Entry
// 用途: Phase 9C §4 Final Runtime Architecture. 把 Phase 9A / 9B 4 层
//       (Spatial Intent + Architecture Bridge + Reality Constraint +
//       Architecture Preservation) 整合成单一 Space Runtime 入口.
//
// Phase 9C §4 Final Runtime Architecture:
//   Project Input -> Brand Analysis -> Space DNA
//   -> Spatial Intent Layer (Phase 9A.2) -> Architecture Intelligence Layer (Phase 9A.3)
//   -> Reality Constraint Layer (Phase 9B.1) -> Architecture Preservation (Phase 9B.2)
//   -> Prompt Compiler -> Provider -> Evaluation
//
// Phase 9C §5 Runtime Modules (3 of 5, prompt + evaluation are wrappers):
//   - Spatial Intent Runtime: spatialIntentDna -> Experience Goal / Spatial Strategy / Design Logic
//   - Architecture Intelligence Runtime: architectureDna / anchors / language
//     -> Spatial Principles / Architectural Characteristics / Material / Lighting
//   - Reality Constraint Runtime: spatialRealityDna -> 8-field constraint
//
// Phase 9C §6 Runtime Directory Structure:
//   space-runtime/ (本目录)
//   ├── spatial-intent-runtime/ (复用 spatial-intent-compiler)
//   ├── architecture-runtime/ (复用 architecture-bridge + spatial-intelligence-pipeline)
//   ├── reality-runtime/ (复用 spatial-reality + architecture-preservation)
//   ├── prompt-runtime/ (compileSpaceRuntime, 本文件)
//   └── evaluation-runtime/ (runtime-evaluation-record, 输出 record)
//
// Phase 9C §9 Baseline Protection:
//   - 不修改 frozen DNA / baseline compiler / existing evaluation
//   - 新能力先进入 experimental runtime, 验证完成后再合并
//   - 当前本模块在 v1-experimental/space-runtime/, 后续合并到 production runtime
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import { compileRuntimePromptWithArchitecturePreservation } from '../architecture-preservation/compile-architecture-preservation-prompt.mjs';
import {
  loadBrandDna,
  getBrandDnaPaths,
  SPATIAL_INTENT_COMPILER_PHASE,
  ARCHITECTURE_BRIDGE_PHASE,
  SPATIAL_REALITY_PHASE,
  ARCHITECTURE_PRESERVATION_PHASE,
  SPACE_RUNTIME_PHASE,
  SPACE_RUNTIME_VERSION,
  DATA_CONTRACT,
} from './data-contract.mjs';
import { buildRuntimeEvaluationRecord, EVALUATION_RECORD_SCHEMA_VERSION } from './runtime-evaluation-record.mjs';

/**
 * Phase 9C §3 / §4 Main Runtime Entry: 整合 4 层 + 编译完整 prompt.
 *
 * @param brandKey  'jiuzhou-aesthetics' | 'feng-tang-tang' | 'yi-ji-liang-fang'
 * @param options   { loadDna: bool (default true), dnaOverride, spatialIntentOverride, spatialRealityOverride, architecturePreservationOverride, ... }
 * @returns { markdown, blocks, blockCount, characterCount, runtimePath, mode,
 *           compiledSpatialIntent, architectureLanguage, spatialRealityDna, architecturePreservation,
 *           moduleVersions, evaluationRecord }
 */
export function compileSpaceRuntime(brandKey, options = {}) {
  if (!brandKey || typeof brandKey !== 'string') {
    throw new TypeError('compileSpaceRuntime: brandKey must be a non-empty string');
  }

  // 1. 加载 4 (or 5) DNA inputs (Phase 9C §8)
  let dna, spatialIntentDna, spatialRealityDna, architecturePreservation;
  if (options.loadDna !== false) {
    const loaded = loadBrandDna(brandKey);
    dna = loaded.dna;
    spatialIntentDna = loaded.spatialIntentDna;
    spatialRealityDna = loaded.spatialRealityDna;
    architecturePreservation = loaded.architecturePreservation;
  } else {
    if (!options.dnaOverride) throw new TypeError('compileSpaceRuntime: dnaOverride required when loadDna=false');
    if (!options.spatialIntentOverride) throw new TypeError('compileSpaceRuntime: spatialIntentOverride required when loadDna=false');
    if (!options.spatialRealityOverride) throw new TypeError('compileSpaceRuntime: spatialRealityOverride required when loadDna=false');
    dna = options.dnaOverride;
    spatialIntentDna = options.spatialIntentOverride;
    spatialRealityDna = options.spatialRealityOverride;
    architecturePreservation = options.architecturePreservationOverride;
  }

  // 2. 跑 Phase 9B.2 Mode B (compileRuntimePromptWithArchitecturePreservation)
  //    一次性 chain 4 层 (Phase 9A.2 + 9A.3 + 9B.1 + 9B.2)
  const phase9b2Result = compileRuntimePromptWithArchitecturePreservation(
    dna, spatialIntentDna, spatialRealityDna, architecturePreservation, { brandKey },
  );

  // 3. 提取 module versions (Phase 9C §10)
  const moduleVersions = {
    brandDna: dna.dnaVersion || 'unknown',
    spatialIntent: SPATIAL_INTENT_COMPILER_PHASE,
    architectureBridge: ARCHITECTURE_BRIDGE_PHASE,
    architectureAnchor: '8A',
    architectureFunctionBridge: '8B.1',
    spatialReality: SPATIAL_REALITY_PHASE,
    architecturePreservation: ARCHITECTURE_PRESERVATION_PHASE,
    promptCompiler: SPACE_RUNTIME_VERSION,
  };

  // 4. Build evaluation record (Phase 9C §10)
  const evaluationRecord = buildRuntimeEvaluationRecord(phase9b2Result, {
    brandKey,
    moduleVersions,
  });

  return {
    phase: SPACE_RUNTIME_PHASE,
    version: SPACE_RUNTIME_VERSION,
    brandKey,
    // §4 Final Runtime Architecture output
    markdown: phase9b2Result.markdown,
    blocks: phase9b2Result.blocks,
    blockCount: phase9b2Result.blockCount,
    characterCount: phase9b2Result.characterCount,
    runtimePath: phase9b2Result.runtimePath,
    mode: phase9b2Result.mode,
    // §8 output: compiledSpaceStrategy
    compiledSpatialIntent: phase9b2Result.compiledSpatialIntent,
    architectureLanguage: phase9b2Result.architectureLanguage,
    spatialRealityDna,
    architecturePreservation,
    // §10 module versions + evaluation record
    moduleVersions,
    evaluationRecord,
  };
}

// Re-export public API
export {
  loadBrandDna,
  getBrandDnaPaths,
  buildRuntimeEvaluationRecord,
  DATA_CONTRACT,
  EVALUATION_RECORD_SCHEMA_VERSION,
  SPATIAL_INTENT_COMPILER_PHASE,
  ARCHITECTURE_BRIDGE_PHASE,
  SPATIAL_REALITY_PHASE,
  ARCHITECTURE_PRESERVATION_PHASE,
  SPACE_RUNTIME_PHASE,
  SPACE_RUNTIME_VERSION,
};
