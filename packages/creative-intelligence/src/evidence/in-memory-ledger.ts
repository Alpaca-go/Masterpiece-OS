/**
 * In-memory implementation of EvidenceLedger.
 *
 * CI-1: deterministic, no filesystem, no persistence, no runtime-core dependency.
 * CI-2: extended with findByDocument, findByAsset, findByReference, toSnapshot.
 *
 * Determinism:
 * - list() / find*() return entries in insertion order
 * - add() with duplicate id throws (no silent overwrite)
 */

import type { EvidenceEntry, EvidenceLedger, EvidenceLedgerSnapshot } from './contracts.ts';

export class InMemoryEvidenceLedger implements EvidenceLedger {
  private entries: Map<string, EvidenceEntry> = new Map();
  private insertionOrder: string[] = [];
  private projectId: string;
  private generatedAt: string;

  constructor(opts: { projectId: string; generatedAt?: string } = { projectId: 'unknown' }) {
    this.projectId = opts.projectId;
    this.generatedAt = opts.generatedAt ?? new Date().toISOString();
  }

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
    return this.list().filter((e) => e.sourceId === sourceId);
  }

  findByDocument(documentId: string): EvidenceEntry[] {
    return this.list().filter((e) => e.documentId === documentId);
  }

  findByAsset(assetId: string): EvidenceEntry[] {
    return this.list().filter((e) => e.assetId === assetId);
  }

  findByReference(): EvidenceEntry[] {
    return this.list().filter((e) => e.isReferenceEvidence);
  }

  toSnapshot(): EvidenceLedgerSnapshot {
    return {
      schemaVersion: '0.1',
      projectId: this.projectId,
      generatedAt: this.generatedAt,
      entries: this.list(),
    };
  }
}
