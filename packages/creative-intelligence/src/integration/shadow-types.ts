/**
 * Shadow validation report types (spec #42-#44).
 */

export type ShadowValidationStatus =
  | 'match'
  | 'normalized_match'
  | 'conflict'
  | 'missing_in_truth'
  | 'missing_in_source'
  | 'authority_mismatch'
  | 'evidence_missing'
  | 'unknown_preserved'
  | 'reference_contamination';

export interface ShadowTruthValidationItem {
  key: string;
  status: ShadowValidationStatus;
  sourceValues: unknown[];
  truthValue: unknown;
  factIds: string[];
  evidenceRefs: string[];
  notes?: string[];
}

export interface ShadowTruthValidationReport {
  schemaVersion: '0.1';
  projectId: string;
  generatedAt: string;
  mode: 'shadow';
  authoritative: false;
  ciVersion: string;
  summary: {
    totalKeys: number;
    match: number;
    conflict: number;
    missing: number;
    authorityMismatch: number;
    referenceContamination: number;
  };
  items: ShadowTruthValidationItem[];
}
