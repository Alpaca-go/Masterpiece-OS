// Document Intelligence namespace.
// Spec #2-#5: pure semantic owner of document understanding.
// CI never imports runtime-core; structural types are mirrored in contracts.ts.

export * from './contracts.ts';
export * from './diagnostics.ts';
export * from './diagnose.ts';
export * from './interpret.ts';
export * from './truth-adapter.ts';

// Re-export document-context-core for callers that want the underlying
// pure primitives (validate / parseModelJson / normalize / compile / adapt).
// These are the functions previously exported from
// runtime-core/src/application/document-context-core.ts.
export {
  DOCUMENT_CONTEXT_SCHEMA_VERSION,
  validateDocumentVisualContext,
  parseModelJson,
  buildExtractionMessages,
  buildRepairMessages,
  normalizeExtractedContext,
  isContextEmpty,
  compileContextBrief,
  adaptLegacyVisualTranslationResult,
  type NormalizedExtraction,
} from './document-context-core.ts';
