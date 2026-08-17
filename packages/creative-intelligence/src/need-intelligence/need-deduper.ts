/**
 * Need dedup + priority sort.
 *
 * Spec #5: merge semantic duplicates; preserve all traces; preserve strongest
 *         priority; preserve strongest status.
 * Spec #43: stable ordering — priority desc → id.
 *
 * Dedup key: a deterministic hash of (type, canonicalStatement).
 * If two needs share the dedup key, they merge into one.
 */

import type { NeedItem, NeedStatus, NeedPriority, NeedDiagnostic } from './contracts.ts';

function statementKey(statement: string): string {
  return statement
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function strongestPriority(a: NeedPriority, b: NeedPriority): NeedPriority {
  return (Math.max(a, b) as NeedPriority);
}

const STATUS_RANK: Record<NeedStatus, number> = {
  blocked: 4,
  required: 3,
  important: 2,
  conditional: 1,
};

function strongestStatus(a: NeedStatus, b: NeedStatus): NeedStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

export function dedupeAndSortNeeds(
  needs: NeedItem[],
): { needs: NeedItem[]; diagnostics: NeedDiagnostic[] } {
  const diagnostics: NeedDiagnostic[] = [];
  const grouped = new Map<string, NeedItem>();
  const order: string[] = [];

  for (const n of needs) {
    const k = `${n.type}::${statementKey(n.statement)}`;
    const existing = grouped.get(k);
    if (!existing) {
      grouped.set(k, { ...n, factRefs: [...n.factRefs], evidenceRefs: [...n.evidenceRefs], conflictRefs: [...n.conflictRefs], sourceKinds: [...n.sourceKinds] });
      order.push(k);
    } else {
      diagnostics.push({
        code: 'DUPLICATE_NEED',
        message: `Need "${n.statement}" deduplicated with existing ${existing.id}.`,
        needId: existing.id,
      });
      // Merge refs (dedup).
      const merged: NeedItem = {
        ...existing,
        priority: strongestPriority(existing.priority, n.priority),
        status: strongestStatus(existing.status, n.status),
        factRefs: Array.from(new Set([...existing.factRefs, ...n.factRefs])).sort(),
        evidenceRefs: Array.from(new Set([...existing.evidenceRefs, ...n.evidenceRefs])).sort(),
        conflictRefs: Array.from(new Set([...existing.conflictRefs, ...n.conflictRefs])).sort(),
        sourceKinds: Array.from(new Set([...existing.sourceKinds, ...n.sourceKinds])).sort(),
      };
      grouped.set(k, merged);
    }
  }

  // Stable ordering: priority desc → id.
  const sorted = order
    .map((k) => grouped.get(k)!)
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.id < b.id ? -1 : 1;
    });

  return { needs: sorted, diagnostics };
}
