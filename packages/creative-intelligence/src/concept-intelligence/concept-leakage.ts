/**
 * Direction + Visual Mechanism Leakage Guard for Concepts (Spec #14, #39-#40).
 *
 * CI-5 ALLOWS:
 *   ConceptCandidate
 *   strategicMechanism
 *
 * CI-5 FORBIDS:
 *   direction, visualMechanism, visualDNA, visualGrammar, anchor, keyVisual,
 *   prompt, palette, colorSystem, materialSystem, compositionSystem,
 *   spatialMechanism, packagingMechanism
 *
 * Plus text equivalent patterns.
 *
 * This is CI-5's version — extends the CI-4 guard by removing 'concept' from
 * the forbidden list and adding more forbidden field names.
 */

const CONCEPT_FORBIDDEN_FIELD_NAMES = [
  'direction',
  'visualMechanism',
  'visualDNA',
  'visualDna',
  'visual_dna',
  'visualGrammar',
  'anchor',
  'keyVisual',
  'prompt',
  'directionA',
  'directionB',
  'directionC',
  'palette',
  'colorSystem',
  'materialSystem',
  'compositionSystem',
  'spatialMechanism',
  'packagingMechanism',
  'styleProfile',
  'typographyDirection',
] as const;

const CONCEPT_FORBIDDEN_TEXT_PATTERNS: readonly RegExp[] = [
  /Direction\s*A\s*[\/／,、]\s*B/i,
  /Direction\s*A\s*[\/／,、]\s*B\s*[\/／,、]\s*C/i,
  /方向\s*[一二三四五六七八九十]/,
  /视觉方向/,
  /核心视觉机制/,
  /主视觉/,
  /\bKV\b/,
  /主色方案/,
  /配色方案/,
  /构图方案/,
  /材质方案/,
  /空间形式/,
  /包装形式/,
  /使用.{0,6}色(?:系|调|方案)?/,
  /采用.{0,6}构图/,
  /采用.{0,6}材质/,
];

/** Field name check. Allowed: 'strategicMechanism' is explicitly permitted. */
export function containsForbiddenFieldName(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = containsForbiddenFieldName(item);
      if (r) return r;
    }
    return null;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Allow strategicMechanism explicitly (CI-5 new allowed field)
    if (key === 'strategicMechanism') {
      const r = containsForbiddenFieldName(value);
      if (r) return r;
      continue;
    }
    if (CONCEPT_FORBIDDEN_FIELD_NAMES.some((name) => key === name || key.endsWith(name))) {
      return key;
    }
    const r = containsForbiddenFieldName(value);
    if (r) return r;
  }
  return null;
}

/** Text-content check. Walks all string values recursively. */
export function containsForbiddenText(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'string') {
    for (const re of CONCEPT_FORBIDDEN_TEXT_PATTERNS) {
      if (re.test(obj)) return obj.slice(0, 80);
    }
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = containsForbiddenText(item);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const r = containsForbiddenText(value);
      if (r) return r;
    }
  }
  return null;
}

export function detectConceptLeakage(obj: unknown): { field: string | null; text: string | null } {
  return {
    field: containsForbiddenFieldName(obj),
    text: containsForbiddenText(obj),
  };
}

export { CONCEPT_FORBIDDEN_FIELD_NAMES, CONCEPT_FORBIDDEN_TEXT_PATTERNS };
