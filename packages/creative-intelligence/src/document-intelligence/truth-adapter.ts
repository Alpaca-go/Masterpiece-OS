/**
 * Document Intelligence → Project Truth contribution.
 *
 * Spec #5: reuses CI-2's document-visual-context-adapter (the canonical path).
 *         No second parallel adapter.
 * Spec #13: this function returns ProjectTruthFact[] + EvidenceEntry[] + warnings.
 * Spec #14-#17: truthClass / authority / user_requirement / locked mapping.
 *
 * The CI-2 adapter already implements AUTHORITATIVE_DOCUMENT_FACT + LOCKED +
 * unknown + evidence normalization. This wrapper layers on the
 * DocumentIntelligenceResult metadata (warnings tagged with diagnostic codes)
 * and exposes a small semantic-surface for the shadow orchestrator.
 */

import { adaptDocumentVisualContext } from '../truth/adapters/document-visual-context-adapter.ts';
import type { AdapterContext, AdapterOutput } from '../truth/adapters/adapter-types.ts';
import type { DocumentIntelligenceResult } from './contracts.ts';

/**
 * Run CI-2's document-visual-context-adapter against the DVC embedded in
 * the DocumentIntelligenceResult. Returns the canonical AdapterOutput.
 *
 * Spec #5: one canonical path. We do not duplicate the field-by-field mapping
 * that already lives in `truth/adapters/document-visual-context-adapter.ts`.
 */
export function contributeToTruth(
  result: DocumentIntelligenceResult,
  ctx: AdapterContext,
): AdapterOutput {
  return adaptDocumentVisualContext(result.context, ctx);
}

/**
 * Promote Document Intelligence diagnostics to AdapterOutput warnings so the
 * CI-2 shadow validator and any downstream consumer can see them.
 */
export function diagnosticsToWarnings(
  result: DocumentIntelligenceResult,
): import('../truth/contracts.ts').ProjectTruthWarning[] {
  // Diagnostics are produced by interpret(); we don't have direct access here,
  // but if the orchestrator attached them via the result (future), we forward.
  // For now this is a no-op — the orchestrator passes warnings through
  // runShadowProjectTruth directly.
  return [];
}
