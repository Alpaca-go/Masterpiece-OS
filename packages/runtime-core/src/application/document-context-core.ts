/**
 * Compatibility facade for runtime-core's document-context-core.
 *
 * CI-3 transferred ownership of the pure semantic core to
 * `@masterpiece/creative-intelligence/document-intelligence/document-context-core.ts`.
 *
 * This file re-exports from the new owner so existing production callers
 * (document-context-service.ts) continue to work without any change.
 *
 * Spec #8: copy → parity → compatibility → selected consumer switch.
 *         The consumer switch is deferred; facade keeps old path valid.
 */

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
} from '@masterpiece/creative-intelligence/document-intelligence/document-context-core.ts';
