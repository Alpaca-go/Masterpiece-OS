import { adaptDocumentContext } from './adapters/document-adapter.js';
import { adaptVisualScheme } from './adapters/visual-scheme-adapter.js';
import { CreativeIntelligenceValidationError } from './contracts.js';
import { buildEvidenceLedger, stableFingerprint } from './evidence-ledger.js';
import { buildProjectTruthModel } from './project-truth-model.js';

/**
 * @param {{
 *   projectId: string,
 *   documentContext?: Record<string, any> | null,
 *   documentConfirmed?: boolean,
 *   visualContext?: Record<string, any> | null,
 *   generatedAt?: string
 * }} input
 */
export function buildCreativeIntelligenceShadow(input) {
  const {
    projectId,
    documentContext = null,
    documentConfirmed = false,
    visualContext = null,
    generatedAt = new Date().toISOString()
  } = input;
  if (!documentContext && !visualContext) {
    throw new CreativeIntelligenceValidationError(
      'SHADOW_SOURCE_REQUIRED',
      'Shadow Mode requires a document context, a visual context, or both'
    );
  }
  if (visualContext?.projectId && visualContext.projectId !== projectId) {
    throw new CreativeIntelligenceValidationError(
      'SHADOW_PROJECT_MISMATCH',
      `Visual context projectId ${visualContext.projectId} does not match ${projectId}`
    );
  }
  const candidates = [
    ...(documentContext ? adaptDocumentContext(documentContext, { confirmed: documentConfirmed }) : []),
    ...(visualContext ? adaptVisualScheme(visualContext) : [])
  ];
  const initialLedger = buildEvidenceLedger({ projectId, candidates, generatedAt });
  const { ledger, truthModel } = buildProjectTruthModel(initialLedger, { generatedAt });
  const mode = documentContext && visualContext ? 'joint' : documentContext ? 'document' : 'visual';
  return {
    schemaVersion: '1.0',
    mode,
    status: 'shadow_only',
    projectId,
    generatedAt,
    sourceFingerprint: stableFingerprint({
      document: documentContext ? { sourceRunId: documentContext.sourceRunId, generatedAt: documentContext.generatedAt } : null,
      visual: visualContext ? { projectId: visualContext.projectId, generatedAt: visualContext.generatedAt } : null
    }),
    artifacts: { evidenceLedger: ledger, projectTruthModel: truthModel },
    downstreamWritePolicy: 'disabled'
  };
}
