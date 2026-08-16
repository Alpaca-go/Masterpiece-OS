/**
 * Project Truth conflict detector.
 *
 * Spec #14: ProjectTruthConflict with key, fact A, fact B, evidence A/B, status: open.
 *            Do NOT silently select one and discard the other.
 * Spec #49: detect brand name / brand role / industry / locked / reference vs current.
 * Spec #6:  no UI; unresolved conflicts remain open.
 *
 * Conflict categories produced:
 *   - identity_mismatch       (brand.name / brand.role / business.industry)
 *   - value_mismatch          (any other key with two distinct non-null values)
 *   - locked_value_violation  (any candidate conflicts with a LOCKED-typed fact)
 *   - reference_contamination (reference fact disagrees with current fact)
 *   - stale_source            (fact carries stale status)
 *
 * Output: ProjectTruthConflict[] with stable ids `<type>:<key>:<factIdA>:<factIdB>`.
 */

import type {
  ProjectTruthConflict,
  ProjectTruthFact,
} from './contracts.ts';
import {
  IDENTITY_KEYS,
  LOCKED_KEYS,
  PROJECT_TRUTH_KEYS,
} from './key-registry.ts';
import { isMeaningful } from './normalization.ts';

export interface ConflictDetectionInput {
  facts: ProjectTruthFact[];
}

export function detectConflicts(input: ConflictDetectionInput): ProjectTruthConflict[] {
  const grouped = groupByKey(input.facts);
  const conflicts: ProjectTruthConflict[] = [];

  for (const [key, facts] of grouped.entries()) {
    if (facts.length < 2) {
      // No possible conflict, but check single-fact lock violations.
      const lock = facts.find((f) => f.authority === 'LOCKED');
      if (lock && lock.status === 'stale') {
        conflicts.push(buildConflict('stale_source', key, [lock.id], ['LOCKED fact marked stale']));
      }
      continue;
    }

    // Identity keys: any non-null value mismatch → identity_mismatch.
    if (isIdentityKey(key) && hasDistinctNonNullValues(facts)) {
      const factIds = facts.map((f) => f.id);
      conflicts.push(buildConflict('identity_mismatch', key, factIds, [
        `Identity key "${key}" has multiple distinct non-null values across carriers.`,
      ]));
      // Do not continue — also check reference contamination and lock violations below.
    }

    // Locked value violation: any non-LOCKED candidate with a different value.
    if (isLockedKey(key)) {
      const locked = facts.find((f) => f.authority === 'LOCKED');
      const violators = locked
        ? facts.filter((f) => f.id !== locked.id && f.value !== null && !sameValue(f.value, locked.value))
        : [];
      if (locked && violators.length > 0) {
        conflicts.push(buildConflict('locked_value_violation', key, [locked.id, ...violators.map((v) => v.id)], [
          `LOCKED value for "${key}" contradicted by ${violators.length} other fact(s).`,
        ]));
      }
    }

    // Reference contamination: reference fact disagrees with current fact on identity keys.
    if (isIdentityKey(key)) {
      const refs = facts.filter((f) => f.isReferenceFact);
      const currents = facts.filter((f) => !f.isReferenceFact);
      if (refs.length > 0 && currents.length > 0 && hasDistinctNonNullValues(facts)) {
        const allIds = [...refs, ...currents].map((f) => f.id);
        conflicts.push(buildConflict('reference_contamination', key, allIds, [
          `Reference-derived fact for "${key}" disagrees with current-project fact.`,
        ]));
      }
    }

    // Generic value mismatch for non-identity keys.
    if (!isIdentityKey(key) && hasDistinctNonNullValues(facts)) {
      const factIds = facts.map((f) => f.id);
      conflicts.push(buildConflict('value_mismatch', key, factIds, [
        `Key "${key}" has multiple distinct non-null values.`,
      ]));
    }

    // Authority mismatch: same value but different authorities — informational.
    if (facts.length >= 2) {
      const authorities = new Set(facts.map((f) => f.authority));
      if (authorities.size > 1 && !hasDistinctNonNullValues(facts)) {
        // Same value, different authority — log as scope/authority_mismatch for visibility.
        conflicts.push(buildConflict('source_authority_mismatch', key, facts.map((f) => f.id), [
          `Same value for "${key}" reported by ${authorities.size} different authorities.`,
        ]));
      }
    }
  }

  // Stable sort: by key then by stable conflict id.
  return conflicts.sort((a, b) => {
    if (a.key !== b.key) return a.key < b.key ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}

function groupByKey(facts: ProjectTruthFact[]): Map<string, ProjectTruthFact[]> {
  const m = new Map<string, ProjectTruthFact[]>();
  for (const f of facts) {
    const list = m.get(f.key) ?? [];
    list.push(f);
    m.set(f.key, list);
  }
  // Stable insertion order: by fact id within each key.
  for (const [k, v] of m.entries()) {
    m.set(k, [...v].sort((a, b) => (a.id < b.id ? -1 : 1)));
  }
  return m;
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
    if (!isMeaningful(f.value)) continue;
    const sig = stableStringify(f.value);
    if (seen.size > 0 && !seen.has(sig)) return true;
    seen.add(sig);
  }
  return false;
}

function sameValue(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function buildConflict(
  type: ProjectTruthConflict['type'],
  key: string,
  factIds: string[],
  notes: string[],
): ProjectTruthConflict {
  const sorted = [...factIds].sort();
  const id = `${type}:${key}:${sorted.join(':')}`;
  return {
    id,
    key,
    type,
    factIds: sorted,
    status: 'open',
    notes,
  };
}

// Unused but kept for spec symmetry / future expansion.
export const CONFLICT_CATEGORIES = [
  'value_mismatch',
  'scope_mismatch',
  'source_authority_mismatch',
  'stale_source',
  'locked_value_violation',
  'identity_mismatch',
  'reference_contamination',
] as const;

export const __test_only_use = { PROJECT_TRUTH_KEYS };
