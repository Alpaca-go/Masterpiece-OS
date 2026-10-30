// Tolerant normalisation of the repair model's response before strict validation.
//
// The 2026-10-30 runs failed twice in this step with REPAIR_RESPONSE_INVALID:
// one model returned evidence refs that were not strings from the allowed list
// (it wrote bare numbers / wrapped text), another returned a shape whose count
// did not line up. Neither was a wrong answer, it was a formatting miss. The
// acceptance rules stay exactly as strict; this module only accepts the
// equivalent shapes the model commonly produces:
// - repairs as an array, as a {path: entry} map, or as a single entry,
//   optionally wrapped in {repair|result|data|output|response},
// - path aliases (field/target/key) and missing dotted prefixes,
// - evidenceRefs as a single value, numeric strings, or text containing an
//   allowed ref,
// - values of the wrong container type for a path (string where an array is
//   required and vice versa), split on Chinese or newline punctuation,
// - "80%" confidences and status synonyms.
//
// It never invents evidence and never fills a missing field: an unknown shape
// is returned unchanged so the runner fails with its explicit message.

import { isRecord } from './path-utils.js';

const WRAPPERS = ['repair', 'repairs_response', 'result', 'data', 'output', 'response'];
const PATH_ALIASES = ['path', 'field', 'target', 'key'];
const REF_ALIASES = ['evidenceRefs', 'evidenceRef', 'evidence', 'refs', 'sources'];
const STRING_PATHS = new Set([
  'creativeDecision.brandRoleStatement',
  'creativeDecision.uniqueUpgradeThesis',
  'mediaTranslations.spatial.spatialConcept',
]);
const STATUS_SYNONYMS = {
  inferred: 'inferred',
  proposed: 'proposed',
  confirmed: 'inferred',
  fact: 'inferred',
  factual: 'inferred',
  draft: 'proposed',
  guess: 'proposed',
  estimate: 'proposed',
};

function unwrap(value, depth = 0) {
  if (depth > 3 || !isRecord(value)) return value;
  for (const key of WRAPPERS) {
    const inner = value[key];
    const looksLikeResponse = isRecord(inner) && (Array.isArray(inner.repairs) || isRecord(inner.repairs) || PATH_ALIASES.some((alias) => typeof inner[alias] === 'string'));
    if (Array.isArray(inner) || looksLikeResponse) {
      return unwrap(inner, depth + 1);
    }
  }
  return value;
}

function normalizePath(path, fieldPaths) {
  const text = String(path ?? '').trim().replace(/^["'[]+|["'\]]+$/gu, '');
  if (!text) return text;
  if (fieldPaths.includes(text)) return text;
  const suffix = fieldPaths.find((candidate) => candidate.endsWith(`.${text}`));
  if (suffix) return suffix;
  const loose = fieldPaths.find((candidate) => candidate.split('.').pop() === text.split('.').pop() && text.includes('.'));
  return suffix || loose || text;
}

function normalizeRefs(value, allowed) {
  const list = value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
  const out = [];
  for (const ref of list) {
    if (typeof ref === 'number' && Number.isInteger(ref)) {
      out.push(ref);
      continue;
    }
    const text = String(ref ?? '').trim().replace(/^[#\s：:]+/u, '');
    if (!text) continue;
    if (/^\d+$/u.test(text)) {
      out.push(Number(text));
      continue;
    }
    if (allowed.includes(text)) {
      out.push(text);
      continue;
    }
    const embedded = allowed.find((candidate) => text.includes(candidate));
    out.push(embedded || text);
  }
  return out;
}

function firstText(value) {
  if (typeof value === 'string') return value.trim();
  const found = Object.values(value).find((item) => typeof item === 'string' && item.trim());
  return typeof found === 'string' ? found.trim() : '';
}

function normalizeValue(path, value) {
  if (typeof path !== 'string') return value;
  if (STRING_PATHS.has(path)) {
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).join('；');
    if (isRecord(value)) {
      const single = firstText(value);
      if (single) return single;
      const list = Object.values(value).find(Array.isArray);
      if (list) return list.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).join('；');
    }
    if (typeof value === 'number') return String(value);
    return value;
  }
  if (path === 'mediaTranslations.spatial.functionalNetwork') {
    const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[；;\n]+/u) : [];
    const text = items
      .map((item) => (typeof item === 'string' ? item.trim() : isRecord(item) ? firstText(item) : ''))
      .filter(Boolean);
    return text.length ? text : value;
  }
  if (path.startsWith('mediaTranslations.spatial.colorBehavior.')) {
    const role = path.split('.').pop();
    const toEntry = (item) => {
      if (typeof item === 'string' && item.trim()) return { name: item.trim(), role };
      if (isRecord(item) && typeof item.name === 'string' && item.name.trim()) {
        return { ...item, name: item.name.trim(), role: typeof item.role === 'string' && item.role.trim() ? item.role : role };
      }
      return item;
    };
    if (Array.isArray(value)) return value.map(toEntry);
    if (typeof value === 'string' || isRecord(value)) return [toEntry(value)];
  }
  return value;
}

function normalizeEntry(entry, fieldPaths, evidenceRefs) {
  if (!isRecord(entry)) return entry;
  const out = { ...entry };
  if (typeof out.path !== 'string') {
    const alias = PATH_ALIASES.find((key) => typeof out[key] === 'string');
    if (alias) out.path = out[alias];
  }
  if (typeof out.path === 'string') out.path = normalizePath(out.path, fieldPaths);
  if (typeof out.status === 'string') {
    const synonym = STATUS_SYNONYMS[out.status.trim().toLowerCase()];
    if (synonym) out.status = synonym;
  }
  if (typeof out.confidence === 'string') {
    const text = out.confidence.trim();
    const percent = text.match(/^(\d+(?:\.\d+)?)\s*%$/u);
    out.confidence = percent ? Number(percent[1]) / 100 : Number(text);
  }
  const alias = REF_ALIASES.find((key) => key !== 'evidenceRefs' && out[key] !== undefined);
  if (alias && out.evidenceRefs === undefined) out.evidenceRefs = out[alias];
  out.evidenceRefs = normalizeRefs(out.evidenceRefs, evidenceRefs);
  out.value = normalizeValue(out.path, out.value);
  return out;
}

export function normalizeRepairResponse(raw, { fieldPaths = [], evidenceRefs = [] } = {}) {
  const value = unwrap(raw);
  let repairs;
  if (Array.isArray(value)) repairs = value;
  else if (isRecord(value)) {
    if (Array.isArray(value.repairs)) repairs = value.repairs;
    else if (isRecord(value.repairs)) {
      repairs = Object.entries(value.repairs).map(([key, item]) => ({ path: key, ...(isRecord(item) ? item : { value: item }) }));
    } else if (PATH_ALIASES.some((key) => typeof value[key] === 'string')) repairs = [value];
    else {
      const entries = Object.entries(value).filter(([key, item]) => isRecord(item) && key !== 'repairs' && key !== 'schemaVersion');
      if (!entries.length) return value;
      repairs = entries.map(([key, item]) => ({ path: key, ...item }));
    }
  } else return value;
  return { repairs: repairs.map((entry) => normalizeEntry(entry, fieldPaths, evidenceRefs)) };
}
