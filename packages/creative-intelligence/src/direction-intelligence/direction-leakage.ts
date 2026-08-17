/**
 * Anchor / Prompt / Production Translation Leakage Guard (CI-6 Step 35, 36, 37).
 *
 * CI-6 ALLOWS:
 *   direction, visualMechanism, systemHypothesis, colorRelationship,
 *   materialRelationship, compositionLogic, typographyBehavior,
 *   graphicBehavior, imageBehavior, crossMediaBehavior,
 *   spaceApplicability, packagingApplicability
 *
 * CI-6 FORBIDS:
 *   anchor, anchorImage, anchorCandidate, anchorPrompt,
 *   prompt, productionPrompt, generationPrompt, spacePrompt,
 *   packagingPrompt, imageGenerationRequest, providerRequest,
 *   finalVisualCanon, selectedDirection
 *
 * Plus production-translation patterns (rendering prompts, specific layouts).
 */

const DIRECTION_FORBIDDEN_FIELD_NAMES = [
  'anchor',
  'anchorImage',
  'anchorCandidate',
  'anchorPrompt',
  'prompt',
  'productionPrompt',
  'generationPrompt',
  'spacePrompt',
  'packagingPrompt',
  'imageGenerationRequest',
  'imageRequest',
  'providerRequest',
  'finalVisualCanon',
  'selectedDirection',
  'selectedVisual',
  'keyVisual',
  'finalKV',
  'renderPrompt',
  'shotContract',
  'imageSeed',
  'imageSpec',
] as const;

const DIRECTION_FORBIDDEN_TEXT_PATTERNS: readonly RegExp[] = [
  // Render / generation prompts
  /\bGenerate\s+(?:a|an)\s+[\d:]+\s+/i,
  /\bRender\s+(?:a|an|the)\s+/i,
  /具体(?:的)?(?:16\s*[:：]?\s*9|画幅|渲染|材质规格)/i,
  /具体(?:的)?(?:大堂|吧台|展墙|货架)\s*(?:布局|排布|位置)/i,
  /具体(?:的)?(?:包装|盒型|结构)\s*(?:尺寸|规格|几何)/,
  /拍摄\s*位置/,
  /机位\s*设置/,
  // Anchor / key visual references
  /锚定图像/,
  /锚图/,
  /主视觉图/,
  /KV\s*(?:为|是|：|:)\s*具体/,
  // Production execution language
  /即(?:可|时|刻)\s*生成/,
  /开始\s*(?:生产|执行|制作)/,
  /production[\s_-]?ready/i,
  /ready\s*for\s*production/i,
  // Selected direction
  /已选(?:定)?(?:的)?(?:方向|视觉|创意)/,
  /最终(?:选定|选择|采用)/,
];

const ALLOWED_FIELDS = new Set([
  'direction',
  'visualMechanism',
  'systemHypothesis',
  'colorRelationship',
  'materialRelationship',
  'compositionLogic',
  'typographyBehavior',
  'graphicBehavior',
  'imageBehavior',
  'crossMediaBehavior',
  'spaceApplicability',
  'packagingApplicability',
  'directionFamily',
  'crossMedia',
  'space',
  'packaging',
  'conceptRefs',
  'opportunityRefs',
  'insightRefs',
  'needRefs',
  'factRefs',
  'evidenceRefs',
  'strengths',
  'risks',
  'blockers',
  'status',
  'generatedBy',
  'traceVersion',
  'id',
  'title',
  'thesis',
]);

/** Field name check. */
export function containsDirectionForbiddenFieldName(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = containsDirectionForbiddenFieldName(item);
      if (r) return r;
    }
    return null;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (ALLOWED_FIELDS.has(key)) {
      // Even allowed fields: recurse into value to check for forbidden nested fields
      const r = containsDirectionForbiddenFieldName(value);
      if (r) return r;
      continue;
    }
    if (DIRECTION_FORBIDDEN_FIELD_NAMES.some((name) => key === name || key.endsWith(name))) {
      return key;
    }
    const r = containsDirectionForbiddenFieldName(value);
    if (r) return r;
  }
  return null;
}

/** Text-content check. */
export function containsDirectionForbiddenText(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'string') {
    for (const re of DIRECTION_FORBIDDEN_TEXT_PATTERNS) {
      if (re.test(obj)) return obj.slice(0, 80);
    }
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = containsDirectionForbiddenText(item);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const r = containsDirectionForbiddenText(value);
      if (r) return r;
    }
  }
  return null;
}

export function detectDirectionLeakage(obj: unknown): { field: string | null; text: string | null } {
  return {
    field: containsDirectionForbiddenFieldName(obj),
    text: containsDirectionForbiddenText(obj),
  };
}

export { DIRECTION_FORBIDDEN_FIELD_NAMES, DIRECTION_FORBIDDEN_TEXT_PATTERNS };
