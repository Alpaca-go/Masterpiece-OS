/**
 * Source index — reverse lookups over an existing EvidenceLedger.
 *
 * Spec #20: findBySource, findByDocument, findByAsset, findByReference.
 *           All lookups are stable, deterministic, return insertion-order.
 *
 * Pure functions over a passed-in ledger (no hidden state).
 */

import type { EvidenceLedger, EvidenceEntry } from './contracts.ts';

export function findEvidenceBySource(
  ledger: EvidenceLedger,
  sourceId: string,
): EvidenceEntry[] {
  return ledger.findBySource(sourceId);
}

export function findEvidenceByDocument(
  ledger: EvidenceLedger,
  documentId: string,
): EvidenceEntry[] {
  return ledger.findByDocument(documentId);
}

export function findEvidenceByAsset(
  ledger: EvidenceLedger,
  assetId: string,
): EvidenceEntry[] {
  return ledger.findByAsset(assetId);
}

export function findReferenceEvidence(ledger: EvidenceLedger): EvidenceEntry[] {
  return ledger.findByReference();
}

/**
 * Build a snapshot from the current ledger state.
 * Pure read — does not mutate the ledger.
 */
export function snapshotLedger(ledger: EvidenceLedger) {
  return ledger.toSnapshot();
}
