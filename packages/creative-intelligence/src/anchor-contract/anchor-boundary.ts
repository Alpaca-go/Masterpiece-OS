/**
 * Anchor Boundary / Prompt Leakage Guard.
 *
 * CI-8 Step 43-44: forbid any field/pattern that would turn Anchor
 * Contract into a prompt or image generation request.
 *
 * Forbidden:
 *   prompt, negativePrompt, provider, model, seed, aspectRatio,
 *   camera, render, generate, imageRequest
 *
 * Plus production-translation patterns (Spec #37):
 *   "Generate a 16:9..."
 *   "specific lobby layout"
 *   "specific box geometry"
 *   "camera angle"
 *   "render prompt"
 */

const ANCHOR_FORBIDDEN_FIELDS = [
  'prompt',
  'negativePrompt',
  'provider',
  'model',
  'seed',
  'aspectRatio',
  'camera',
  'render',
  'generate',
  'imageRequest',
  'imageGenerationRequest',
  'spacePrompt',
  'packagingPrompt',
  'shotContract',
  'renderPrompt',
  'imageSeed',
  'imageSpec',
] as const;

const ANCHOR_FORBIDDEN_TEXT_PATTERNS: readonly RegExp[] = [
  /\bGenerate\s+(?:a|an)\s+\d+:\d+/i,
  /具体\s*(?:布局|尺寸|规格)/,
  /specific\s+(?:lobby|box)\s+(?:layout|geometry)/i,
  /camera\s+angle/i,
  /render\s+prompt/i,
  /use\s+(?:midjourney|dalle|qwen|stablediffusion|sora)/i,
  /\bseed\s*[:=]\s*\d+/i,
  /\baspect\s*ratio\s*[:=]\s*\d+:\d+/i,
  /negative\s*prompt\s*[:=]/i,
];

const ALLOWED_ANCHOR_FIELDS = new Set([
  'schemaVersion', 'projectId', 'selectedDirectionId', 'selectionRevision',
  'purpose', 'mustDemonstrate', 'mustPreserve', 'mayExplore', 'mustNotChange',
  'requiredDNARefs', 'requiredGrammarRefs', 'lockedAssetRefs',
  'crossMediaProof', 'evaluationCriteria', 'status', 'authoritative', 'mode',
  // criterion sub-fields
  'id', 'criterion', 'sourceRefs', 'severity',
]);

export function containsAnchorForbiddenField(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = containsAnchorForbiddenField(item);
      if (r) return r;
    }
    return null;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (ALLOWED_ANCHOR_FIELDS.has(key)) {
      const r = containsAnchorForbiddenField(value);
      if (r) return r;
      continue;
    }
    if (ANCHOR_FORBIDDEN_FIELDS.some((f) => key === f || key.endsWith(f))) {
      return key;
    }
    const r = containsAnchorForbiddenField(value);
    if (r) return r;
  }
  return null;
}

export function containsAnchorForbiddenText(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'string') {
    for (const re of ANCHOR_FORBIDDEN_TEXT_PATTERNS) {
      if (re.test(obj)) return obj.slice(0, 80);
    }
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = containsAnchorForbiddenText(item);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const r = containsAnchorForbiddenText(value);
      if (r) return r;
    }
  }
  return null;
}

export function detectAnchorLeakage(obj: unknown): { field: string | null; text: string | null } {
  return {
    field: containsAnchorForbiddenField(obj),
    text: containsAnchorForbiddenText(obj),
  };
}

export { ANCHOR_FORBIDDEN_FIELDS, ANCHOR_FORBIDDEN_TEXT_PATTERNS };
