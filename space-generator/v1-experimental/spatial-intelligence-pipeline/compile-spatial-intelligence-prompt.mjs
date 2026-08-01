// Spatial Intelligence Pipeline Compiler v1 (Phase 9B)
// 用途: Phase 9B Real Provider Validation 入口. 把 Phase 9A.1 spatialIntentDna + Phase 9A.2
//       Spatial Intent Compiler + Phase 9A.3 Architecture Bridge 集成到 runtime prompt,
//       形成 Mode B (Spatial Intelligence Pipeline) compiled prompt.
//
//   Brand DNA
//     ↓
//   Spatial Intent
//     ↓
//   Spatial Intent Compiler
//     ↓
//   Architecture Bridge
//     ↓
//   Architecture Language
//     ↓
//   Architecture Anchor (Phase 8A)
//     ↓
//   Architecture Function Bridge (Phase 8B.1)
//     ↓
//   Prompt Compiler
//     ↓
//   Provider
//
// Phase 9B §2 Core Goal:
//   Mode A (Previous Pipeline) = compileRuntimePrompt(dna) [Phase 8C]
//   Mode B (Spatial Intelligence Pipeline) = compileRuntimePromptWithSpatialIntelligence(dna, spatialIntentDna)
//
// 设计原则 (Phase 9B):
//   1. 不修改 baseline 行为 (compileFieldEnrichedPrompt 100% 不变, 跟 Phase 8A/8B.1/8C 一致)
//   2. 在 compileRuntimePrompt 输出基础上, 插入 spatial_intent + architecture_language 两个新块
//   3. 新块位置: 在 task 之后, 在 architecture_function_bridge / architecture_context 之前
//      (跟 Phase 8A 一样的插入策略: 在最前面第二个位置)
//   4. 不调 Provider, deterministic 输出
//
// 不调 Provider, 不污染生产代码, 不动 v1-baseline.

import { compileFieldEnrichedPrompt } from '../prompt-compiler/field-enriched/compile-prompt.mjs';
import { compileFieldEnrichedPromptWithAnchorContext } from '../prompt-compiler/anchor-aware/compile-with-anchor.mjs';
import { compileRuntimePrompt } from '../prompt-compiler/runtime/compile-runtime.mjs';
import { selectAnchors } from '../architecture-anchors/loader/load-anchors.mjs';
import { compileSpatialIntent } from '../spatial-intent-compiler/compile-spatial-intent.mjs';
import { compileArchitectureBridge } from '../architecture-bridge/compile-architecture-bridge.mjs';
import { compileSpatialIntentBlock } from './compile-spatial-intent-block.mjs';
import { compileArchitectureLanguageBlock } from './compile-architecture-language-block.mjs';

/**
 * Phase 9B Mode B compiler: compile Runtime prompt with Spatial Intelligence layer.
 *
 * 在 compileRuntimePrompt 基础上, 插入 spatial_intent + architecture_language 块.
 * 这两个块放在 task 之后, 第二个和第三个位置 (在 architecture_function_bridge 之前).
 *
 * @param dna               Space DNA instance (v0.1 / v0.1.1 / v0.3 任意)
 * @param spatialIntentDna  Phase 9A.1 spatial intent dna (5 string 字段)
 * @param options           { brandKey, autoSelectAnchors, anchorMaxCount, anchorCriteria,
 *                                  forceBaseline, weight (0-1, default 0.25) }
 * @returns { markdown, blockCount, characterCount, blocks, runtimePath, mode,
 *           compiledSpatialIntent, architectureLanguage, anchorSelection, anchorIds,
 *           spatialIntelligencePath }
 */
export function compileRuntimePromptWithSpatialIntelligence(dna, spatialIntentDna, options = {}) {
  if (!dna || typeof dna !== 'object') {
    throw new TypeError('compileRuntimePromptWithSpatialIntelligence: dna must be a non-null object');
  }
  if (!spatialIntentDna || typeof spatialIntentDna !== 'object') {
    throw new TypeError('compileRuntimePromptWithSpatialIntelligence: spatialIntentDna must be a non-null object');
  }

  const brandKey = options.brandKey ?? inferBrandKey(dna);
  if (!brandKey) {
    throw new TypeError('compileRuntimePromptWithSpatialIntelligence: brandKey required');
  }

  const autoSelect = options.autoSelectAnchors !== false;
  const maxCount = options.anchorMaxCount ?? 3;
  const forceBaseline = options.forceBaseline === true;

  // 1. 选 anchors (Phase 8C 同样的逻辑)
  let anchorSelection = null;
  let anchors = [];
  if (autoSelect && !forceBaseline) {
    const criteria = options.anchorCriteria ?? buildDefaultCriteria(dna);
    const selected = selectAnchors(brandKey, criteria, maxCount);
    anchorSelection = {
      brandKey,
      criteria,
      candidates: selected.map((s) => ({
        anchorId: s.anchor.id,
        score: s.score,
        breakdown: s.breakdown,
      })),
    };
    anchors = selected.map((s) => s.anchor);
  }

  // 2. 编译 baseline prompt (compileRuntimePrompt 等价路径)
  let baseline;
  if (anchors.length > 0) {
    baseline = compileFieldEnrichedPromptWithAnchorContext(dna, anchors);
  } else {
    baseline = compileFieldEnrichedPrompt(dna);
  }

  // 3. Spatial Intelligence 编译 (Phase 9A.2 + 9A.3)
  const compiledSpatialIntent = compileSpatialIntent(spatialIntentDna, { weight: options.weight });
  const architectureLanguage = compileArchitectureBridge(compiledSpatialIntent, { weight: options.weight });

  // 4. 编译新块
  const spatialIntentBlockText = compileSpatialIntentBlock(compiledSpatialIntent);
  const architectureLanguageBlockText = compileArchitectureLanguageBlock(architectureLanguage);

  // 5. 插入新块: 在 task 之后 (Phase 8A 同样的策略)
  //    块顺序: task / spatial_intent (新) / architecture_language (新) / ...rest
  //    Mode B runtime path = spatial_intelligence_9a2_9a3
  const newBlocks = [
    baseline.blocks[0], // task
    { id: 'spatial_intent', text: spatialIntentBlockText },
    { id: 'architecture_language', text: architectureLanguageBlockText },
    ...baseline.blocks.slice(1),
  ];

  const markdown = newBlocks.map((b) => b.text).join('\n');
  const runtimePath = anchors.length > 0 ? 'spatial_intelligence_9a2_9a3_8a_8b1' : 'spatial_intelligence_9a2_9a3_8b1';

  return {
    ...baseline,
    markdown,
    blocks: newBlocks,
    blockCount: newBlocks.length,
    characterCount: markdown.length,
    runtimePath,
    mode: 'B',
    spatialIntelligencePath: runtimePath,
    compiledSpatialIntent,
    architectureLanguage,
    anchorSelection,
    anchorIds: anchors.map((a) => a.id),
  };
}

/**
 * Phase 9B Mode A compiler wrapper: 显式声明 Mode A, 跟 Mode B 对照.
 * Mode A = compileRuntimePrompt(dna) (Phase 8C Runtime Integration).
 *
 * @param dna
 * @param options
 * @returns runtime prompt with mode: 'A'
 */
export function compileRuntimePromptModeA(dna, options = {}) {
  const prompt = compileRuntimePrompt(dna, options);
  return { ...prompt, mode: 'A' };
}

function inferBrandKey(dna) {
  if (dna.metadata?.brandKey && typeof dna.metadata.brandKey === 'string') {
    return dna.metadata.brandKey;
  }
  if (dna.project?.brandName) {
    const name = dna.project.brandName;
    if (name === '九州美学') return 'jiuzhou-aesthetics';
    if (name === '一剂良方') return 'yi-ji-liang-fang';
    if (name === '冯烫烫') return 'feng-tang-tang';
    if (name === '蛙耶') return 'wa-ye';
  }
  return null;
}

function buildDefaultCriteria(dna) {
  return {
    industry: dna.project?.category,
    sceneType: dna.sceneDefinition?.sceneType,
    commercialContext: dna.sceneDefinition?.commercialContext,
    operationalRealism: dna.functionalDna?.operationalRealism,
    requireFunctionStrength: dna.functionalDna?.operationalRealism === 'high' ? 0.75 : 0,
  };
}
