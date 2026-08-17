/**
 * Direction Leakage Guard (spec #15, #52).
 *
 * CI-4 contracts MUST NOT contain:
 *   concept / direction / visualMechanism / visualDNA / anchor / prompt
 *
 * Plus the spec-listed text patterns:
 *   Direction A/B/C, 方向一/二/三, 视觉方向, 核心视觉机制, 主色方案,
 *   具体构图方案, 具体材质方案
 *
 * Contract prohibition is the primary guard. This module is a defense-in-depth
 * check for tests and integration tooling.
 */

export const FORBIDDEN_FIELD_NAMES = [
  'concept',
  'direction',
  'visualMechanism',
  'visualDNA',
  'visualDna',
  'visual_dna',
  'anchor',
  'prompt',
  'directionA',
  'directionB',
  'directionC',
] as const;

const FORBIDDEN_TEXT_PATTERNS: readonly RegExp[] = [
  /Direction\s*A\s*[\/／,、]\s*B/i,
  /Direction\s*A\s*[\/／,、]\s*B\s*[\/／,、]\s*C/i,
  /方向\s*[一二三四五六七八九十]/,
  /视觉方向/,
  /核心视觉机制/,
  /主色方案/,
  /具体构图方案/,
  /具体材质方案/,
];

/** Field name check (camelCase / snake_case). */
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
    if (FORBIDDEN_FIELD_NAMES.some((name) => key === name || key.endsWith(name))) {
      return key;
    }
    const r = containsForbiddenFieldName(value);
    if (r) return r;
  }
  return null;
}

/** Text-content check (walks string values). */
export function containsForbiddenText(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'string') {
    for (const re of FORBIDDEN_TEXT_PATTERNS) {
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

export function hasDirectionLeakage(obj: unknown): { field: string | null; text: string | null } {
  return {
    field: containsForbiddenFieldName(obj),
    text: containsForbiddenText(obj),
  };
}
