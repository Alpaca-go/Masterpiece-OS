/**
 * Pure shadow report builder — builds the serializable CI shadow report bundle.
 *
 * Spec #30: every shadow artifact must include schemaVersion, projectId,
 *           generatedAt, sourceCarrierVersions, sourceFingerprints, ciVersion,
 *           authoritative=false, mode=shadow.
 * Spec #57: serializable EvidenceLedgerSnapshot.
 */

import type { ProjectTruthModel } from '../truth/contracts.ts';
import type { EvidenceLedgerSnapshot } from '../evidence/contracts.ts';
import type { TruthResolution, ProjectTruthConflict, ProjectTruthWarning } from '../truth/contracts.ts';
import type { ShadowTruthValidationReport } from './shadow-types.ts';

export const CI_VERSION = 'ci-2.0.0';
export const SHADOW_MODE = 'shadow' as const;
export const SHADOW_AUTHORITATIVE = false as const;

export interface ShadowReportBundle {
  schemaVersion: '0.1';
  projectId: string;
  generatedAt: string;
  ciVersion: string;
  mode: 'shadow';
  authoritative: false;
  sourceCarrierVersions: string[];
  sourceFingerprints: string[];
  projectTruth: ProjectTruthModel;
  evidenceLedger: EvidenceLedgerSnapshot;
  truthResolutions: TruthResolution[];
  truthConflicts: ProjectTruthConflict[];
  validationReport: ShadowTruthValidationReport;
  warnings: ProjectTruthWarning[];
}

export function buildShadowReport(input: {
  projectId: string;
  truth: ProjectTruthModel;
  ledger: EvidenceLedgerSnapshot;
  resolutions: TruthResolution[];
  conflicts: ProjectTruthConflict[];
  validationReport: ShadowTruthValidationReport;
  sourceCarrierVersions?: string[];
  warnings?: ProjectTruthWarning[];
}): ShadowReportBundle {
  return {
    schemaVersion: '0.1',
    projectId: input.projectId,
    generatedAt: input.truth.provenance.generatedAt,
    ciVersion: CI_VERSION,
    mode: SHADOW_MODE,
    authoritative: SHADOW_AUTHORITATIVE,
    sourceCarrierVersions: (input.sourceCarrierVersions ?? []).slice().sort(),
    sourceFingerprints: input.truth.provenance.sourceFingerprints.slice().sort(),
    projectTruth: input.truth,
    evidenceLedger: input.ledger,
    truthResolutions: input.resolutions,
    truthConflicts: input.conflicts,
    validationReport: input.validationReport,
    warnings: input.warnings ?? [],
  };
}
