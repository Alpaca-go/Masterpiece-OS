/**
 * Document Understanding Diagnostics (spec #22).
 *
 * Deterministic codes. NO quality score yet.
 * Explanatory only — not generative.
 */

export type DocumentUnderstandingDiagnosticCode =
  | 'MISSING_BRAND_NAME'
  | 'MISSING_INDUSTRY'
  | 'MISSING_BUSINESS_MODEL'
  | 'MISSING_TARGET_AUDIENCE'
  | 'MISSING_EVIDENCE'
  | 'CONFLICTING_DOCUMENT_FACT'
  | 'UNKNOWN_REQUIRED_FIELD'
  | 'LOCKED_FACT_WITHOUT_EVIDENCE'
  | 'UNSUPPORTED_SEMANTIC_FIELD';

export interface DocumentUnderstandingDiagnostic {
  code: DocumentUnderstandingDiagnosticCode;
  message: string;
  field?: string;
  documentId?: string;
  evidenceId?: string;
}

export const DIAGNOSTIC_CODES: readonly DocumentUnderstandingDiagnosticCode[] = [
  'MISSING_BRAND_NAME',
  'MISSING_INDUSTRY',
  'MISSING_BUSINESS_MODEL',
  'MISSING_TARGET_AUDIENCE',
  'MISSING_EVIDENCE',
  'CONFLICTING_DOCUMENT_FACT',
  'UNKNOWN_REQUIRED_FIELD',
  'LOCKED_FACT_WITHOUT_EVIDENCE',
  'UNSUPPORTED_SEMANTIC_FIELD',
] as const;
