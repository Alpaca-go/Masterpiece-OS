import type {
  ReferenceAssetDecision,
  StyleCarrier,
  StyleCarrierCategory
} from '../../../shared/types.ts';

export const PRIMARY_STYLE_CARRIER_MIN = 3;
export const PRIMARY_STYLE_CARRIER_MAX = 6;

const PLACEHOLDER_PATTERN = /(?:跨参考视觉规律|cross[- ]reference visual rule|placeholder)/iu;

export function rankStyleCarriers(decisions: ReferenceAssetDecision[]): StyleCarrier[] {
  const byCategory = new Map<StyleCarrierCategory, Array<{
    assetId: string;
    readableRule: string;
    confidence: number;
  }>>();
  for (const decision of decisions) {
    for (const rule of decision.styleCarrierRules || []) {
      if (!rule.readableRule.trim() || PLACEHOLDER_PATTERN.test(rule.readableRule)) continue;
      const values = byCategory.get(rule.category) || [];
      values.push({
        assetId: decision.assetId,
        readableRule: rule.readableRule.trim(),
        confidence: Math.max(0, Math.min(1, rule.confidence))
      });
      byCategory.set(rule.category, values);
    }
  }

  const ranked = [...byCategory.entries()].map<StyleCarrier>(([category, rules]) => {
    const readableRule = rules
      .sort((a, b) => b.confidence - a.confidence)[0]!.readableRule;
    const confidence = rules.reduce((sum, rule) => sum + rule.confidence, 0) / rules.length;
    return {
      id: `style-carrier-${category}`,
      category,
      internalLabel: category,
      readableRule,
      description: readableRule,
      priority: 'secondary',
      supportingAssetIds: [...new Set(rules.map((rule) => rule.assetId))],
      mustBeVisibleInOutput: false,
      confidence
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
  }
  return errors;
}
