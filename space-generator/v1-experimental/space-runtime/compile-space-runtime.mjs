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
// Phase 9C.1 (NEW): 插入 space_role_context block 在 architecture_dna 跟 brand_translation 之间
//                   §7 原则: 不修改 brand_translation / architecture_dna, 只 ADD 1 block
//                   block count: 16 -> 17
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
  SPACE_ROLE_INTELLIGENCE_PHASE,
  SPACE_RUNTIME_PHASE,
  SPACE_RUNTIME_VERSION,
  DATA_CONTRACT,
} from './data-contract.mjs';
import { buildRuntimeEvaluationRecord, EVALUATION_RECORD_SCHEMA_VERSION } from './runtime-evaluation-record.mjs';
import { compileSpaceRoleBlock, SPACE_ROLE_INTELLIGENCE_VERSION, SUPPORTED_SPACE_TYPES } from '../space-role-intelligence/compile-space-role-prompt.mjs';

/**
 * Phase 9C §3 / §4 Main Runtime Entry: 整合 4 层 + 编译完整 prompt.
 * Phase 9C.1: 在 16 块基础上 INSERT space_role_context block (17 块).
 *
 * @param brandKey  'jiuzhou-aesthetics' | 'feng-tang-tang' | 'yi-ji-liang-fang'
 * @param options   { loadDna: bool (default true), dnaOverride, spatialIntentOverride, spatialRealityOverride, architecturePreservationOverride, includeSpaceRoleContext: bool (default true), ... }
 * @returns { markdown, blocks, blockCount, characterCount, runtimePath, mode,
 *           compiledSpatialIntent, architectureLanguage, spatialRealityDna, architecturePreservation,
 *           compiledSpaceRole, moduleVersions, evaluationRecord }
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
  //    一次性 chain 4 层 (Phase 9A.2 + 9A.3 + 9B.1 + 9B.2) — 16 块 baseline
  const phase9b2Result = compileRuntimePromptWithArchitecturePreservation(
    dna, spatialIntentDna, spatialRealityDna, architecturePreservation, { brandKey },
  );

  // 3. Phase 9C.1 INSERT space_role_context block (16 -> 17 blocks)
  //    Phase 9C.1 §7: insert after architecture_dna, before brand_translation
  //    默认 includeSpaceRoleContext = true; user can opt out via options.includeSpaceRoleContext = false
  //    options.spaceTypeOverride 可强制用某个 spaceType (默认用 dna.sceneDefinition.sceneType)
  const includeSpaceRole = options.includeSpaceRoleContext !== false;
  const spaceTypeOverride = options.spaceTypeOverride ?? null;
  let compiledSpaceRole = null;
  let blocks17 = phase9b2Result.blocks;
  let characterCount17 = phase9b2Result.characterCount;
  if (includeSpaceRole) {
    const sceneType = spaceTypeOverride
      || dna.sceneDefinition?.sceneType
      || dna.sceneDefinition?.sceneSubtype
      || 'reception';
    if (!SUPPORTED_SPACE_TYPES.includes(sceneType)) {
      // Try lowercased + underscore-form
      const norm = String(sceneType).toLowerCase().replace(/-/g, '_');
      if (!SUPPORTED_SPACE_TYPES.includes(norm)) {
        throw new Error(`compileSpaceRuntime: sceneType "${sceneType}" is not in supported space types: ${SUPPORTED_SPACE_TYPES.join(', ')}`);
      }
      compiledSpaceRole = compileSpaceRoleBlock(norm);
    } else {
      compiledSpaceRole = compileSpaceRoleBlock(sceneType);
    }

    // Find insertion point: after architecture_dna, before brand_translation
    const archDnaIdx = blocks17.findIndex((b) => b.id === 'architecture_dna');
    const brandTransIdx = blocks17.findIndex((b) => b.id === 'brand_translation');
    if (archDnaIdx < 0 || brandTransIdx < 0) {
      throw new Error(`compileSpaceRuntime: expected architecture_dna and brand_translation blocks in 9B.2 result (got ${blocks17.map((b) => b.id).join(', ')})`);
    }
    const insertAt = archDnaIdx + 1;
    blocks17 = [
      ...blocks17.slice(0, insertAt),
      { id: compiledSpaceRole.blockId, text: compiledSpaceRole.content },
      ...blocks17.slice(insertAt),
    ];
    characterCount17 = blocks17.reduce((sum, b) => sum + (b.text?.length ?? 0), 0);
  }

  // 4. Re-build markdown from blocks
  const markdown17 = blocks17.map((b) => b.text).join('\n\n');

  // 5. 提取 module versions (Phase 9C §10 + 9C.1)
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
  if (includeSpaceRole) {
    moduleVersions.spaceRoleIntelligence = SPACE_ROLE_INTELLIGENCE_PHASE;
  }

  // 6. Build evaluation record (Phase 9C §10)
  //    Use the 16-block 9B.2 result so the record reflects the baseline behavior;
  //    moduleVersions are augmented with spaceRoleIntelligence.
  const evaluationRecord = buildRuntimeEvaluationRecord(phase9b2Result, {
    brandKey,
    moduleVersions,
  });
  // Augment record with 9C.1 metadata
  if (includeSpaceRole) {
    evaluationRecord.phase9c1 = {
      spaceType: compiledSpaceRole?.spaceRole?.space_type ?? null,
      blockInserted: 'space_role_context',
      blockCount: blocks17.length,
      characterCount: characterCount17,
    };
  }

  return {
    phase: SPACE_RUNTIME_PHASE,
    version: SPACE_RUNTIME_VERSION,
    brandKey,
    // §4 Final Runtime Architecture output (16 块 baseline; 17 块 with 9C.1)
    markdown: markdown17,
    blocks: blocks17,
    blockCount: blocks17.length,
    characterCount: characterCount17,
    // Phase 9C runtimePath may include space role path component when 9C.1 active
    runtimePath: includeSpaceRole
      ? `${phase9b2Result.runtimePath}_9c1_space_role`
      : phase9b2Result.runtimePath,
    mode: phase9b2Result.mode,
    // §8 output: compiledSpaceStrategy
    compiledSpatialIntent: phase9b2Result.compiledSpatialIntent,
    architectureLanguage: phase9b2Result.architectureLanguage,
    spatialRealityDna,
    architecturePreservation,
    // Phase 9C.1: compiled space role + block id
    compiledSpaceRole,
    includeSpaceRoleContext: includeSpaceRole,
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
  SPACE_ROLE_INTELLIGENCE_PHASE,
  SPACE_RUNTIME_PHASE,
  SPACE_RUNTIME_VERSION,
};;
