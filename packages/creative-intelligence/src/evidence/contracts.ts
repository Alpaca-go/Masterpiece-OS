/**
 * Evidence type definitions — CI-2 contract (schemaVersion 0.2).
 *
 * CI-1 defined the skeleton. CI-2 adds:
 * - project_metadata type (real-world need: ProjectRecord adapter)
 * - source index methods (findByDocument, findByAsset, findByReference)
 * - stable id helpers via id conventions
 *
 * Determinism, dedup, snapshot, no-confidence-fabrication rules apply.
 */

export type EvidenceType =
  | 'document_section'
  | 'visual_asset'
  | 'user_input'
  | 'locked_asset'
  | 'model_inference'
  | 'project_metadata'
  | 'system_default'
  | 'external_reference';

export interface EvidenceEntry {
  /** Stable id. Recommended form: `<type>:<id>` (e.g. `doc:abc:section:intro`). */
  id: string;
  type: EvidenceType;
  /** Source carrier kind, e.g. `document_visual_context`, `project_record`. */
  sourceType: string;
  /** Source-specific id, may be empty. */
  sourceId?: string;
  /** Optional short content snippet — DO NOT log raw sensitive content. */
  content?: string;
  documentId?: string;
  filename?: string;
  section?: string;
  page?: number;
  assetId?: string;
  /** Confidence only if the upstream source provided it. Never invented. */
  confidence?: number;
  sourceFingerprint?: string;
  createdAt?: string;
  /** True iff this evidence came from a reference (not current) project. */
  isReferenceEvidence: boolean;
}

export interface EvidenceLedger {
  add(entry: EvidenceEntry): EvidenceEntry;
  get(id: string): EvidenceEntry | undefined;
  has(id: string): boolean;
  list(): EvidenceEntry[];
  findBySource(sourceId: string): EvidenceEntry[];
  findByDocument(documentId: string): EvidenceEntry[];
  findByAsset(assetId: string): EvidenceEntry[];
  findByReference(): EvidenceEntry[];
  toSnapshot(): EvidenceLedgerSnapshot;
}

export interface EvidenceLedgerSnapshot {
  schemaVersion: '0.1';
  projectId: string;
  generatedAt: string;
  entries: EvidenceEntry[];
}
