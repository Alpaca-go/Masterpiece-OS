/**
 * Document Intelligence Core — top-level pure facade.
 *
 * Spec #30: `interpretDocumentContext` is the public entry point.
 *           No async, no model execution. Pure semantic normalization.
 *
 * Spec #9: output is the DocumentIntelligenceResult (spec-defined shape).
 * Spec #10: diagnostics are deterministic and explanatory.
 * Spec #14-#17: truth class / authority / user_requirement / locked mapping.
 *
 * This file does NOT call the CI-2 truth-adapter directly. The shadow
 * orchestrator (runtime-core) calls both the CI-2 adapter (for facts/evidence)
 * and this function (for the DocumentIntelligenceResult + diagnostics).
 * That keeps "no parallel fact model" (spec #13) — diagnostics are
 * non-overlapping with Project Truth.
 */

import {
  isContextEmpty,
  validateDocumentVisualContext,
  compileContextBrief,
  DOCUMENT_CONTEXT_SCHEMA_VERSION,
} from './document-context-core.ts';
import type {
  DocumentIntelligenceInput,
  DocumentIntelligenceResult,
} from './contracts.ts';
import {
  diagnose,
  type DocumentUnderstandingDiagnostic,
} from './diagnose.ts';

export function interpretDocumentContext(
  input: DocumentIntelligenceInput,
): DocumentIntelligenceResult {
  if (!input || !input.context) {
    throw Object.assign(new Error('interpretDocumentContext: missing context'), {
      code: 'CI_DOCUMENT_INPUT_INVALID',
    });
  }

  const ctx = input.context;
  const validation = validateDocumentVisualContext(ctx);
  if (!validation.valid) {
    throw Object.assign(
      new Error(`DocumentVisualContext failed validation: ${validation.errors.join('; ')}`),
      { code: 'CI_DOCUMENT_CONTEXT_INVALID', errors: validation.errors },
    );
  }

  const diagnostics = diagnose(ctx);
  const isEmpty = isContextEmpty(ctx);
  const brief = compileContextBrief(ctx);

  return {
    schemaVersion: '0.1',
    projectId: input.projectId,
    context: ctx,
    sourceRunId: ctx.sourceRunId,
    generatedAt: ctx.generatedAt,
    warnings: [],
    isEmpty,
    brief,
  };
}

/**
 * Return value of `interpretDocumentContext` always satisfies:
 *  - schemaVersion === '0.1'
 *  - context.schemaVersion === DOCUMENT_CONTEXT_SCHEMA_VERSION
 *
 * Re-exported for test introspection.
 */
export { DOCUMENT_CONTEXT_SCHEMA_VERSION, type DocumentUnderstandingDiagnostic };
