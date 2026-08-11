import type {
  GenerationOutputType,
  ReferenceAssetDecision,
  ReferenceContaminationType,
  ReferenceSignatureGraphic,
  StyleCarrier,
  StyleCarrierCategory,
  TaskDefinitionSeed,
  TaskScopedStyleCarrierSet,
  TaskStyleCarrierValidation
} from '../../../shared/types.ts';
import {
  collectStyleCarrierContaminationErrors,
  isContaminatedCandidate
} from './reference-identity-filter.ts';

export const PRIMARY_STYLE_CARRIER_MIN = 3;
export const PRIMARY_STYLE_CARRIER_MAX = 6;

const PLACEHOLDER_PATTERN = /(?:跨参考视觉规律|cross[- ]reference visual rule|placeholder)/iu;

/** §3 载体类别到能力要求的项目无关默认映射（可被显式 requires* 字段覆盖）。 */
function carrierRequiresPhotography(carrier: StyleCarrier): boolean {
  return carrier.requiresPhotography ?? carrier.category === 'photography';
}
function carrierRequiresSpace(carrier: StyleCarrier): boolean {
  return carrier.requiresSpace ?? carrier.category === 'spatial';
}
function carrierRequiresMotion(carrier: StyleCarrier): boolean {
  return carrier.requiresMotion ?? false;
}

export interface RankStyleCarriersOptions {
  /** 禁止复制的参考专属图形（用于隔离）。 */
  signatureGraphics?: ReferenceSignatureGraphic[];
}

function forbiddenAssetIds(signatureGraphics: ReferenceSignatureGraphic[] = []): Set<string> {
  const ids = new Set<string>();
  for (const graphic of signatureGraphics) {
    if (graphic.forbiddenToCopy) for (const assetId of graphic.evidenceAssetIds) ids.add(assetId);
  }
  return ids;
}

/**
 * §3 P0：Reference Signature Graphic 与 Style Carrier 彻底分离。
 * 被标记为 forbiddenToCopy 的资产所贡献的 Style Carrier 不得进入 Ranking；
 * 仅允许继承其抽象结构规律，不得进入 Primary / Secondary / System Anchor / Brief。
 */
export function rankStyleCarriers(
  decisions: ReferenceAssetDecision[],
  options: RankStyleCarriersOptions = {}
): StyleCarrier[] {
  const banned = forbiddenAssetIds(options.signatureGraphics);
  const byCategory = new Map<StyleCarrierCategory, Array<{
    assetId: string;
    readableRule: string;
    confidence: number;
    compatibleOutputTypes: GenerationOutputType[];
    referencesSignatureGraphicIds: string[];
    contaminationTypes: ReferenceContaminationType[];
  }>>();
  for (const decision of decisions) {
    if (banned.has(decision.assetId)) continue;
    for (const rule of decision.styleCarrierRules || []) {
      if (!rule.readableRule.trim() || PLACEHOLDER_PATTERN.test(rule.readableRule)) continue;
      // §2 参考身份污染必须在 Ranking 前过滤：携带品牌名 / Logo / 文案 / 专属图形的候选
      // 直接剔除，不得进入 Ranking 再靠 Forbidden Items 抵消。
      if (isContaminatedCandidate(rule)) continue;
      const values = byCategory.get(rule.category) || [];
      values.push({
        assetId: decision.assetId,
        readableRule: rule.readableRule.trim(),
        confidence: Math.max(0, Math.min(1, rule.confidence)),
        compatibleOutputTypes: [...decision.eligibleOutputTypes],
        referencesSignatureGraphicIds: [],
        contaminationTypes: []
      });
      byCategory.set(rule.category, values);
    }
  }

  const ranked = [...byCategory.entries()].map<StyleCarrier>(([category, rules]) => {
    const readableRule = rules
      .sort((a, b) => b.confidence - a.confidence)[0]!.readableRule;
    const confidence = rules.reduce((sum, rule) => sum + rule.confidence, 0) / rules.length;
    const compatibleOutputTypes = [...new Set(rules.flatMap((rule) => rule.compatibleOutputTypes))];
    const referencesSignatureGraphicIds = [...new Set(rules.flatMap((rule) => rule.referencesSignatureGraphicIds))];
    return {
      id: `style-carrier-${category}`,
      category,
      internalLabel: category,
      readableRule,
      description: readableRule,
      priority: 'secondary',
      supportingAssetIds: [...new Set(rules.map((rule) => rule.assetId))],
      mustBeVisibleInOutput: false,
      confidence,
      containsReferenceIdentity: referencesSignatureGraphicIds.length > 0,
      referencesSignatureGraphicIds,
      contaminationTypes: [],
      compatibleOutputTypes
    };
  }).sort((a, b) =>
    b.supportingAssetIds.length - a.supportingAssetIds.length || b.confidence - a.confidence
  );

  const primaryCount = Math.min(
    PRIMARY_STYLE_CARRIER_MAX,
    Math.max(Math.min(PRIMARY_STYLE_CARRIER_MIN, ranked.length), Math.ceil(ranked.length / 2))
  );
  ranked.forEach((carrier, index) => {
    if (index < primaryCount) {
      carrier.priority = 'primary';
      carrier.mustBeVisibleInOutput = true;
    }
  });
  return ranked;
}

/** §5.3 选择主导 Primary 载体（数量约束 3..6）。 */
export function selectDominantCarriers(
  compatible: StyleCarrier[],
  min = PRIMARY_STYLE_CARRIER_MIN,
  max = PRIMARY_STYLE_CARRIER_MAX
): StyleCarrier[] {
  const dominant = compatible
    .filter((item) => item.priority === 'primary')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, max);
  if (dominant.length >= min) return dominant;
  const filler = compatible
    .filter((item) => item.priority !== 'primary' && !dominant.includes(item))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, max - dominant.length);
  return [...dominant, ...filler].slice(0, max);
}

/** §5.3 选择辅助 Secondary 载体。 */
export function selectSupportingCarriers(compatible: StyleCarrier[]): StyleCarrier[] {
  return compatible
    .filter((item) => item.priority === 'secondary' || item.priority === 'optional')
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * §3 P0：Task-Scoped Style Carriers 必须按当前任务生效。
 * 全局 Ranking 不得原样复制给每个任务；仅保留与 outputType 兼容、且不违反当前任务
 * 摄影 / 空间 / 动效约束的载体。被排除的载体带上明确原因（用于审计）。
 *
 * `seed` 为可选的任务约束种子（photographyAllowed / spatialSceneAllowed / motionAllowed 等）。
 * 未提供 seed 时退化为仅按 outputType 兼容性过滤，保持向后兼容。
 */
export function compileTaskScopedStyleCarriers(
  globalRanking: StyleCarrier[],
  outputType: GenerationOutputType,
  seed: TaskDefinitionSeed = {}
): TaskScopedStyleCarrierSet {
  const all = globalRanking;
  const excludedForTask: TaskScopedStyleCarrierSet['excludedForTask'] = [];
  const compatible = all.filter((carrier) => {
    if (!(carrier.compatibleOutputTypes || []).includes(outputType)) {
      excludedForTask.push({ carrierId: carrier.id, reason: 'incompatible_output_type' });
      return false;
    }
    if (carrier.containsReferenceIdentity
      || (carrier.referencesSignatureGraphicIds || []).length > 0
      || (carrier.contaminationTypes || []).some((type) => type !== 'none')) {
      excludedForTask.push({ carrierId: carrier.id, reason: 'reference_identity_contamination' });
      return false;
    }
    if (carrierRequiresPhotography(carrier) && seed.photographyAllowed === false) {
      excludedForTask.push({ carrierId: carrier.id, reason: 'requires_photography' });
      return false;
    }
    if (carrierRequiresSpace(carrier) && seed.spatialSceneAllowed === false) {
      excludedForTask.push({ carrierId: carrier.id, reason: 'requires_space' });
      return false;
    }
    if (carrierRequiresMotion(carrier) && seed.motionAllowed === false) {
      excludedForTask.push({ carrierId: carrier.id, reason: 'requires_motion' });
      return false;
    }
    return true;
  });
  return {
    outputType,
    requiredPrimary: selectDominantCarriers(compatible),
    supportingSecondary: selectSupportingCarriers(compatible),
    excludedForTask
  };
}

/** §5.5 任务级 Style Carrier 校验。 */
export function validateTaskStyleCarriers(set: TaskScopedStyleCarrierSet): TaskStyleCarrierValidation {
  const incompatibleCarrierIds = set.requiredPrimary
    .filter((item) => !(item.compatibleOutputTypes || []).includes(set.outputType))
    .map((item) => item.id);
  const primaryCountValid = set.requiredPrimary.length >= PRIMARY_STYLE_CARRIER_MIN
    && set.requiredPrimary.length <= PRIMARY_STYLE_CARRIER_MAX;
  return {
    outputType: set.outputType,
    incompatibleCarrierIds,
    missingDominantCategories: [],
    primaryCountValid,
    passed: incompatibleCarrierIds.length === 0 && primaryCountValid
  };
}

export function validateStyleCarriers(carriers: StyleCarrier[]): string[] {
  const errors: string[] = [];
  const primaryCount = carriers.filter((item) => item.priority === 'primary').length;
  if (carriers.length >= PRIMARY_STYLE_CARRIER_MIN
    && (primaryCount < PRIMARY_STYLE_CARRIER_MIN || primaryCount > PRIMARY_STYLE_CARRIER_MAX)) {
    errors.push('STYLE_CARRIER_PRIORITY_INVALID');
  }
  for (const carrier of carriers) {
    const readable = carrier.readableRule || carrier.description;
    if (!readable.trim() || PLACEHOLDER_PATTERN.test(readable)) {
      errors.push(`STYLE_CARRIER_PLACEHOLDER_LEAK:${carrier.id}`);
    }
    if (carrier.containsReferenceIdentity && (carrier.referencesSignatureGraphicIds || []).length === 0
      && (carrier.contaminationTypes || []).length === 0) {
      // 兼容旧数据：仅标记 containsReferenceIdentity 而未细分污染类型时归为参考身份污染。
      errors.push(`REFERENCE_IDENTITY_IN_STYLE_CARRIER:${carrier.id}`);
    }
  }
  // §2 细分污染码（品牌身份 / 专属图形 / 文案），全部为 blocking。
  errors.push(...collectStyleCarrierContaminationErrors(carriers));
  return [...new Set(errors)];
}
