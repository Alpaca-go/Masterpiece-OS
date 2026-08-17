/**
 * UnderstandingContext — shared read-only input surface for Need / Insight / Opportunity.
 *
 * Spec #9: combines Project Truth, Evidence Ledger, Document Intelligence
 *         diagnostics, and Visual Intelligence diagnosis references.
 *         Does NOT create a parallel truth model.
 *
 * CI never imports runtime-core. VisualDiagnosisV2 is mirrored structurally
 * where needed; DocumentVisualContext is imported from project-contracts.
 */

import type { ProjectTruthModel, EvidenceLedgerSnapshot } from '../truth/contracts.ts';
import type { DocumentUnderstandingDiagnostic } from '../document-intelligence/diagnostics.ts';

export interface UnderstandingContextDocument {
  diagnostics: DocumentUnderstandingDiagnostic[];
  warnings: string[];
}

export interface UnderstandingContextVisual {
  /**
   * Soft references into VisualUnderstandingCore.diagnosis. Strings, not
   * full objects, so CI does not depend on the carrier type identity.
   * Production may populate this from visual diagnosis; CI treats it as
   * interpretive input (spec #23).
   */
  diagnosisRefs?: string[];
  assetRefs?: string[];
  warnings?: string[];
}

export interface UnderstandingContext {
  schemaVersion: '0.1';
  projectId: string;
  truth: ProjectTruthModel;
  evidence: EvidenceLedgerSnapshot;
  document?: UnderstandingContextDocument;
  visual?: UnderstandingContextVisual;
}
