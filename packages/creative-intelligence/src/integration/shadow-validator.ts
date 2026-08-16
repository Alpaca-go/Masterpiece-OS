/**
 * Pure shadow validator — compare ProjectTruthModel against current carrier
 * values. Detects MATCH / CONFLICT / MISSING / AUTHORITY_MISMATCH / etc.
 *
 * Spec #11-#13: authority / confidence / recency / source type / confirmation
 *                state are distinct.
 * Spec #40:     reference contamination = 0.
 * Spec #42-#44: validation statuses.
 *
 * Pure functions only.
 */

import type { ProjectTruthFact, ProjectTruthModel } from '../truth/contracts.ts';
import type {
  ShadowTruthValidationItem,
  ShadowTruthValidationReport,
  ShadowValidationStatus,
} from './shadow-types.ts';
import { IDENTITY_KEYS, LOCKED_KEYS, PROJECT_TRUTH_KEYS } from '../truth/key-registry.ts';

export interface ShadowValidatorInput {
  truth: ProjectTruthModel;
  currentCarriers: Record<string, Record<string, unknown>>;
  ciVersion?: string;
  generatedAt?: string;
}

export function validateShadowTruth(input: ShadowValidatorInput): ShadowTruthValidationReport {
  const projectId = input.truth.projectId;
  const generatedAt = input.generatedAt ?? input.truth.provenance.generatedAt;
  const ciVersion = input.ciVersion ?? 'ci-2';
  const items: ShadowTruthValidationItem[] = [];

  const truthByKey = groupByKey(input.truth.facts);

  // Check all canonical keys + all carrier-reported keys.
  const allKeys = new Set<string>([
    ...Object.values(PROJECT_TRUTH_KEYS),
    ...Object.keys(input.currentCarriers),
  ]);

  for (const key of Array.from(allKeys).sort()) {
    const facts = (truthByKey.get(key) ?? []).filter((f) => !f.isReferenceFact);
    const sourceValues: unknown[] = [];
    let truthValue: unknown = null;

    if (input.currentCarriers[key] !== undefined) {
      sourceValues.push(input.currentCarriers[key]);
    }

    if (facts.length > 0) {
      // Selected value = first non-unknown fact; falls back to winner.
      const selected = facts.find((f) => f.value !== null && f.truthClass !== 'unknown') ?? facts[0];
      truthValue = selected.value;
    }

    const status = classify({
      key,
      facts,
      sourceValues,
      truthValue,
    });

    items.push({
      key,
      status,
      sourceValues,
      truthValue,
      factIds: facts.map((f) => f.id),
      evidenceRefs: facts.flatMap((f) => f.evidenceRefs),
    });
  }

  const summary = summarize(items);

  return {
    schemaVersion: '0.1',
    projectId,
    generatedAt,
    mode: 'shadow',
    authoritative: false,
    ciVersion,
    summary,
    items,
  };
}

function groupByKey(facts: ProjectTruthFact[]): Map<string, ProjectTruthFact[]> {
  const m = new Map<string, ProjectTruthFact[]>();
  for (const f of facts) {
    const list = m.get(f.key) ?? [];
    list.push(f);
    m.set(f.key, list);
  }
  for (const [k, v] of m.entries()) {
    m.set(k, [...v].sort((a, b) => (a.id < b.id ? -1 : 1)));
  }
  return m;
}

function classify(input: {
  key: string;
  facts: ProjectTruthFact[];
  sourceValues: unknown[];
  truthValue: unknown;
}): ShadowValidationStatus {
  const { key, facts, sourceValues, truthValue } = input;

  // Reference contamination first (spec #40).
  const hasReferenceFact = facts.some((f) => f.isReferenceFact);
  const currentValues = facts.filter((f) => !f.isReferenceFact).map((f) => f.value);
  if (hasReferenceFact && currentValues.length > 0 && hasDistinctNonNullValues([...facts])) {
    if (isIdentityKey(key)) {
      return 'reference_contamination';
    }
  }

  // Locked value violation.
  if (isLockedKey(key)) {
    const locked = facts.find((f) => f.authority === 'LOCKED');
    if (locked) {
      const violators = facts.filter(
        (f) => f.id !== locked.id && f.value !== null && !sameValue(f.value, locked.value),
      );
      if (violators.length > 0) {
        return 'authority_mismatch';
      }
    }
  }

  // Conflict — multiple non-null distinct values.
  if (facts.length >= 2 && hasDistinctNonNullValues(facts)) {
    return 'conflict';
  }

  // Truth unknown but source provided.
  if ((facts.length === 0 || facts.every((f) => f.value === null)) && sourceValues.length > 0) {
    return 'missing_in_truth';
  }

  // Truth has value but source did not.
  if (sourceValues.length === 0 && truthValue !== null) {
    return 'missing_in_source';
  }

  // Authority mismatch — same value but different authorities (and at least one
  // high authority in disagreement).
  if (facts.length >= 2) {
    const authorities = new Set(facts.map((f) => f.authority));
    if (authorities.size > 1 && !hasDistinctNonNullValues(facts)) {
      return 'authority_mismatch';
    }
  }

  // Evidence missing — no evidence attached to a non-null fact.
  if (facts.length > 0 && truthValue !== null) {
    const allWithoutEvidence = facts.every((f) => f.evidenceRefs.length === 0);
    if (allWithoutEvidence) {
      return 'evidence_missing';
    }
  }

  // Normalized match — same value with whitespace/case normalization.
  if (sourceValues.length > 0 && truthValue !== null) {
    if (sourceValues.every((sv) => normalizedEqual(sv, truthValue))) {
      if (facts.length > 1) return 'normalized_match';
      return 'match';
    }
  }

  // Truth value is explicitly unknown (preserved).
  if (truthValue === null && facts.some((f) => f.truthClass === 'unknown' || f.status === 'unknown')) {
    return 'unknown_preserved';
  }

  // Default: match if both have the same value.
  if (sourceValues.length > 0 && sourceValues.every((sv) => sameValue(sv, truthValue))) {
    return 'match';
  }

  return 'conflict';
}

function summarize(items: ShadowTruthValidationItem[]) {
  let match = 0, conflict = 0, missing = 0, authorityMismatch = 0, referenceContamination = 0;
  for (const it of items) {
    if (it.status === 'match' || it.status === 'normalized_match') match++;
    else if (it.status === 'conflict') conflict++;
    else if (it.status === 'missing_in_truth' || it.status === 'missing_in_source') missing++;
    else if (it.status === 'authority_mismatch') authorityMismatch++;
    else if (it.status === 'reference_contamination') referenceContamination++;
  }
  return {
    totalKeys: items.length,
    match,
    conflict,
    missing,
    authorityMismatch,
    referenceContamination,
  };
}

function isIdentityKey(key: string): boolean {
  return (IDENTITY_KEYS as readonly string[]).includes(key);
}

function isLockedKey(key: string): boolean {
  return (LOCKED_KEYS as readonly string[]).includes(key);
}

function hasDistinctNonNullValues(facts: ProjectTruthFact[]): boolean {
  const seen = new Set<string>();
  for (const f of facts) {
    if (f.value === null) continue;
    const sig = stableStringify(f.value);
    if (seen.size > 0 && !seen.has(sig)) return true;
    seen.add(sig);
  }
  return false;
}

function sameValue(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function normalizedEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  return sameValue(a, b);
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}
