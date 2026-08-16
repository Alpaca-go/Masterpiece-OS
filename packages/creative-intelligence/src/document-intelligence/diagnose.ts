/**
 * Document Understanding Diagnostics emitter.
 *
 * Spec #10 / #22: deterministic codes; explanatory only; no scores.
 *
 * All codes are derived from the DocumentVisualContext itself. The function
 * is pure: same input → same output, with stable ordering.
 */

import type { DocumentVisualContext, DocumentVisualContextEvidence } from './contracts.ts';
import type { DocumentUnderstandingDiagnostic, DocumentUnderstandingDiagnosticCode } from './diagnostics.ts';

const LIST_FIELDS = [
  'products',
  'services',
  'targetAudience',
  'brandPersonality',
  'visualPreferences',
  'requiredTouchpoints',
  'lockedFacts',
  'prohibitedDirections',
] as const;

const SUPPORTED_FIELDS = new Set<string>([
  'brandName',
  'industry',
  'pricePositioning',
  'businessModel',
  ...LIST_FIELDS,
]);

export function diagnose(context: DocumentVisualContext): DocumentUnderstandingDiagnostic[] {
  const out: DocumentUnderstandingDiagnostic[] = [];

  // Identity fields.
  if (!context.brandName) {
    out.push({ code: 'MISSING_BRAND_NAME', message: 'brandName is missing from DocumentVisualContext.' });
  }
  if (!context.industry) {
    out.push({ code: 'MISSING_INDUSTRY', message: 'industry is missing from DocumentVisualContext.' });
  }
  if (context.pricePositioning == null) {
    out.push({ code: 'MISSING_BUSINESS_MODEL', message: 'pricePositioning is missing.', field: 'pricePositioning' });
  }
  if (context.businessModel == null) {
    out.push({ code: 'MISSING_BUSINESS_MODEL', message: 'businessModel is missing.', field: 'businessModel' });
  }
  if (context.targetAudience.length === 0) {
    out.push({ code: 'MISSING_TARGET_AUDIENCE', message: 'targetAudience is empty.' });
  }

  // Evidence coverage: each populated non-evidenced field emits MISSING_EVIDENCE.
  const evidenceByField = new Map<string, DocumentVisualContextEvidence[]>();
  for (const ev of context.evidence) {
    const list = evidenceByField.get(ev.field) ?? [];
    list.push(ev);
    evidenceByField.set(ev.field, list);
  }
  const populatedFields: string[] = [];
  if (context.brandName) populatedFields.push('brandName');
  if (context.industry) populatedFields.push('industry');
  for (const f of LIST_FIELDS) {
    if (context[f].length > 0) populatedFields.push(f);
  }
  if (context.pricePositioning) populatedFields.push('pricePositioning');
  if (context.businessModel) populatedFields.push('businessModel');
  for (const field of populatedFields) {
    if (!evidenceByField.has(field)) {
      out.push({
        code: 'MISSING_EVIDENCE',
        message: `Field "${field}" is populated but has no evidence entry.`,
        field,
      });
    }
  }

  // Locked facts without evidence → LOCKED_FACT_WITHOUT_EVIDENCE.
  for (const locked of context.lockedFacts) {
    if (!evidenceByField.has('lockedFacts') || !evidenceByField.get('lockedFacts')!.length) {
      out.push({
        code: 'LOCKED_FACT_WITHOUT_EVIDENCE',
        message: `Locked fact "${locked}" has no evidence entry.`,
        field: 'lockedFacts',
      });
    }
  }

  // Conflicts: evidence pairs that mention different fields → CONFLICTING_DOCUMENT_FACT.
  const fieldsWithMultipleSources = new Set<string>();
  for (const [field, list] of evidenceByField.entries()) {
    const docIds = new Set(list.map((e) => e.documentId));
    if (docIds.size > 1) fieldsWithMultipleSources.add(field);
  }
  for (const field of fieldsWithMultipleSources) {
    out.push({
      code: 'CONFLICTING_DOCUMENT_FACT',
      message: `Field "${field}" has evidence from multiple documents — possible conflict.`,
      field,
    });
  }

  // unknownFields surfaced by DVC → UNKNOWN_REQUIRED_FIELD for identity keys.
  for (const field of context.unknownFields) {
    if (field === 'brandName' || field === 'industry' || field === 'businessModel' || field === 'targetAudience') {
      out.push({
        code: 'UNKNOWN_REQUIRED_FIELD',
        message: `Required field "${field}" is in unknownFields.`,
        field,
      });
    }
  }

  // UNSUPPORTED_SEMANTIC_FIELD: evidence entries that reference fields outside
  // the supported list — indicates the upstream carrier surfaced a field the
  // CI cannot normalize.
  for (const ev of context.evidence) {
    if (!SUPPORTED_FIELDS.has(ev.field)) {
      out.push({
        code: 'UNSUPPORTED_SEMANTIC_FIELD',
        message: `Evidence entry for field "${ev.field}" is not supported by Document Intelligence.`,
        field: ev.field,
        documentId: ev.documentId,
        evidenceId: `doc:${ev.documentId}:${ev.field}`,
      });
    }
  }

  // Stable ordering: by code, then by field (when present).
  return out.sort((a, b) => {
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    const af = a.field ?? '';
    const bf = b.field ?? '';
    if (af !== bf) return af < bf ? -1 : 1;
    return (a.evidenceId ?? '') < (b.evidenceId ?? '') ? -1 : 1;
  });
}

export type { DocumentUnderstandingDiagnostic, DocumentUnderstandingDiagnosticCode };
