import type {
  GenerationOutputType,
  ReferenceAssetDecision,
  ReferenceSignatureGraphic,
  StyleCarrier,
  StyleCarrierCategory,
  TaskScopedStyleCarrierSet,
  TaskStyleCarrierValidation
} from '../../../shared/types.ts';

export const PRIMARY_STYLE_CARRIER_MIN = 3;
export const PRIMARY_STYLE_CARRIER_MAX = 6;

const PLACEHOLDER_PATTERN = /(?:跨参考视觉规律|cross[- ]reference visual rule|placeholder)/iu;

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
  }>>();
  for (const decision of decisions) {
    if (banned.has(decision.assetId)) continue;
    for (const rule of decision.styleCarrierRules || []) {
      if (!rule.readableRule.trim() || PLACEHOLDER_PATTERN.test(rule.readableRule)) continue;
      const values = byCategory.get(rule.category) || [];
      values.push({
        assetId: decision.assetId,
        readableRule: rule.readableRule.trim(),
        confidence: Math.max(0, Math.min(1, rule.confidence)),
        compatibleOutputTypes: [...decision.eligibleOutputTypes],
        referencesSignatureGraphicIds: []
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
 * §5 P0：Style Carriers 必须按当前任务编译。
 * 全局 Ranking 不得原样复制给每个任务；仅保留与 outputType 兼容的载体。
 */
export function compileTaskScopedStyleCarriers(
  globalRanking: StyleCarrier[],
  outputType: GenerationOutputType
): TaskScopedStyleCarrierSet {
  const all = globalRanking;
  const compatible = all.filter((carrier) =>
    (carrier.compatibleOutputTypes || []).includes(outputType)
  );
  return {
    outputType,
    requiredPrimary: selectDominantCarriers(compatible),
    supportingSecondary: selectSupportingCarriers(compatible),
    excludedForTask: all
      .filter((item) => !compatible.includes(item))
      .map((item) => ({ carrierId: item.id, reason: 'not_compatible_with_output_type' }))
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
    if (carrier.containsReferenceIdentity || (carrier.referencesSignatureGraphicIds || []).length > 0) {
      errors.push(`REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIERS:${carrier.id}`);
    }
  }
  return errors;
}
