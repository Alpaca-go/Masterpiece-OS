/**
 * Evidence type definitions — CI-1 foundation skeleton.
 *
 * These types define the future Evidence Ledger contract.
 * They are NOT yet integrated with existing evidenceRefs patterns.
 * Integration is CI-2 scope.
 */

export type EvidenceType =
  | 'document_section'
  | 'visual_asset'
  | 'user_input'
  | 'locked_asset'
  | 'model_inference'
  | 'external_reference';

export interface EvidenceEntry {
  id: string;
  type: EvidenceType;
  sourceId: string;
  content?: string;
  documentId?: string;
  filename?: string;
  section?: string;
  page?: number;
  assetId?: string;
  confidence?: number;
  sourceFingerprint?: string;
  createdAt?: string;
}

export interface EvidenceLedger {
  add(entry: EvidenceEntry): EvidenceEntry;
  get(id: string): EvidenceEntry | undefined;
  has(id: string): boolean;
  list(): EvidenceEntry[];
  findBySource(sourceId: string): EvidenceEntry[];
}
