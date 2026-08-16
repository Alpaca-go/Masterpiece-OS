/**
 * In-memory implementation of EvidenceLedger.
 *
 * CI-1: deterministic, no filesystem, no persistence, no runtime-core dependency.
 * Used for testing and as a reference implementation.
 *
 * Deterministic behavior:
 * - list() returns entries in insertion order
 * - add() with duplicate ID throws (no silent overwrite)
 * - findBySource() returns entries in insertion order
 */

import type { EvidenceEntry, EvidenceLedger } from './contracts.ts';

export class InMemoryEvidenceLedger implements EvidenceLedger {
  private entries: Map<string, EvidenceEntry> = new Map();
  private insertionOrder: string[] = [];

  add(entry: EvidenceEntry): EvidenceEntry {
    if (this.entries.has(entry.id)) {
      throw new Error(
        `EvidenceLedger: entry with id "${entry.id}" already exists. No silent overwrite.`,
      );
    }
    this.entries.set(entry.id, entry);
    this.insertionOrder.push(entry.id);
    return entry;
  }

  get(id: string): EvidenceEntry | undefined {
    return this.entries.get(id);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  list(): EvidenceEntry[] {
    return this.insertionOrder.map((id) => {
      const entry = this.entries.get(id);
      if (!entry) {
        throw new Error(`EvidenceLedger invariant violation: id "${id}" in order but not in map.`);
      }
      return entry;
    });
  }

  findBySource(sourceId: string): EvidenceEntry[] {
    const result: EvidenceEntry[] = [];
    for (const id of this.insertionOrder) {
      const entry = this.entries.get(id);
      if (entry && entry.sourceId === sourceId) {
        result.push(entry);
      }
    }
    return result;
  }
}
