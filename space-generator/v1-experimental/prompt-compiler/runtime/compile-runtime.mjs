// Runtime Prompt Compiler v1 (Phase 8C)
// 用途: Phase 8C Runtime Integration 入口. 把 Phase 8A anchor + Phase 8B.1 bridge 整合到
//       runtime 架构, 不需要调用方手动指定 anchors.
//       Runtime 通过 dna.project.category / dna.sceneDefinition / dna.functionalDna 自动选 anchors.
//
// 集成链路 (Phase 8C §1):
//   Project Analysis (运行时 metadata, 不在本模块)
//     ↓
//   Space DNA Extraction (dna, v0.1 / v0.1.1 / v0.3 任意)
//     ↓
//   Architecture Anchor Selection (selectAnchors, 自动)
//     ↓
//   Architecture Function Bridge Generation (compileFieldEnrichedPrompt bridge 块, Phase 8B.1)
//     ↓
//   Prompt Compilation (compileFieldEnrichedPrompt + 条件 anchor-aware)
//     ↓
//   Provider Generation (runtime, 不在本模块)
//     ↓
//   Evaluation (evaluateSpace + phase8B1Bonus + Phase 8C 4 summary metrics)
//
// 设计原则 (Phase 8C §2):
//   1. locked components: brand_translation / functional_requirement / negative_constraints 不动
//   2. 不修改 baseline 行为 (compileFieldEnrichedPrompt 100% 不变)
//   3. auto-inject 路径只在调用 compileRuntimePrompt 时生效, 默认 baseline 行为
//
// 不调 Provider, 不污染生产代码.

import { compileFieldEnrichedPrompt } from '../field-enriched/compile-prompt.mjs';
import { compileFieldEnrichedPromptWithAnchorContext } from '../anchor-aware/compile-with-anchor.mjs';
import { selectAnchors } from '../../architecture-anchors/loader/load-anchors.mjs';

/**
 * Phase 8C Runtime Integration: 编译 runtime prompt.
 *
 * 自动检测 dna 字段, 选 anchors, 编译完整 prompt.
 * 默认走 baseline 11 块 (Phase 8B.1), 如果选到 anchors 则升级到 12 块 (Phase 8A + 8B.1 复合).
 *
 * @param dna      Space DNA instance (v0.1 / v0.1.1 / v0.3 任意)
 * @param options  { brandKey, autoSelectAnchors, anchorMaxCount, anchorCriteria }
 *                 - brandKey: required, 决定从哪个 brand 的 registry 选 anchor
 *                 - autoSelectAnchors: default true, Phase 8C 默认行为
 *                 - anchorMaxCount: default 3
 *                 - anchorCriteria: 覆盖默认 criteria (industry / sceneType / commercialContext / operationalRealism)
 *                 - forceBaseline: 强制走 baseline 11 块 (不选 anchor), Phase 8A 默认兼容
 * @returns { markdown, blockCount, characterCount, blocks, runtimePath, anchorSelection }
 */
export function compileRuntimePrompt(dna, options = {}) {
  if (!dna || typeof dna !== 'object') {
    throw new TypeError('compileRuntimePrompt: dna must be a non-null object');
  }
  const brandKey = options.brandKey ?? inferBrandKey(dna);
  if (!brandKey) {
    throw new TypeError('compileRuntimePrompt: brandKey required (or dna.metadata must have a brand identifier)');
  }
  const autoSelect = options.autoSelectAnchors !== false; // default true
  const maxCount = options.anchorMaxCount ?? 3;
  const forceBaseline = options.forceBaseline === true;

  // 1. 选 anchors (Phase 8C §4 自动选择)
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

  // 2. 编译 prompt
  let prompt;
  if (anchors.length > 0) {
    // Phase 8A + 8B.1 复合路径: 12 块
    prompt = compileFieldEnrichedPromptWithAnchorContext(dna, anchors);
  } else {
    // Phase 8B.1 baseline 路径: 11 块
    prompt = compileFieldEnrichedPrompt(dna);
  }

  return {
    ...prompt,
    runtimePath: anchors.length > 0 ? 'anchor_aware_8a_8b1' : 'baseline_8b1',
    anchorSelection,
    anchorIds: anchors.map((a) => a.id),
  };
}

/**
 * 从 dna 字段推断 brandKey.
 * Phase 8C 集成时, dna.metadata.brandKey (或 dna.project.brandName slug) 是 brandKey.
 * 如果都没, 返回 null, 调用方必须显式提供.
 */
function inferBrandKey(dna) {
  // 1. 显式 metadata.brandKey
  if (dna.metadata?.brandKey && typeof dna.metadata.brandKey === 'string') {
    return dna.metadata.brandKey;
  }
  // 2. brandName slug fallback (e.g. '九州美学' -> 'jiuzhou-aesthetics')
  if (dna.project?.brandName) {
    const name = dna.project.brandName;
    if (name === '九州美学') return 'jiuzhou-aesthetics';
    if (name === '一剂良方') return 'yi-ji-liang-fang';
    if (name === '冯烫烫') return 'feng-tang-tang';
    if (name === '蛙耶') return 'wa-ye';
  }
  return null;
}

/**
 * 从 dna 字段构建默认 selection criteria.
 * Phase 8C §4: input = brand DNA + industry + space type + functional requirements.
 */
function buildDefaultCriteria(dna) {
  return {
    industry: dna.project?.category,
    sceneType: dna.sceneDefinition?.sceneType,
    commercialContext: dna.sceneDefinition?.commercialContext,
    operationalRealism: dna.functionalDna?.operationalRealism,
    requireFunctionStrength: dna.functionalDna?.operationalRealism === 'high' ? 0.75 : 0,
  };
}
