/**
 * Evidence normalizer — turn raw evidence refs into canonical EvidenceEntry
 * records with stable ids.
 *
 * Spec #18: deterministic ids when possible.
 * Spec #19: dedup by stable id.
 * Spec #21: confidence is preserved iff the source provided it; never invented.
 *
 * Pure functions only.
 */

import type { EvidenceEntry, EvidenceType } from './contracts.ts';
import { evidenceId } from '../truth/normalization.ts';

export function normalizeDocumentEvidence(input: {
  documentId: string;
  filename?: string;
  section?: string;
  page?: number;
  excerpt?: string;
  confidence?: number;
  sourceType: string;
  sourceId: string;
  createdAt: string;
}): EvidenceEntry {
  return {
    id: evidenceId('doc', input.documentId, input.section ?? 'general'),
    type: 'document_section' as EvidenceType,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    content: input.excerpt?.slice(0, 200),
    documentId: input.documentId,
    filename: input.filename,
    section: input.section,
    page: input.page,
    confidence: input.confidence,
    createdAt: input.createdAt,
    isReferenceEvidence: false,
  };
}

export function normalizeVisualEvidence(input: {
  assetId: string;
  filename?: string;
  confidence?: number;
  sourceType: string;
  sourceId: string;
  sourceFingerprint?: string;
  createdAt: string;
}): EvidenceEntry {
  return {
    id: evidenceId('asset', input.assetId),
    type: 'visual_asset' as EvidenceType,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    assetId: input.assetId,
    content: input.filename,
    confidence: input.confidence,
    sourceFingerprint: input.sourceFingerprint,
    createdAt: input.createdAt,
    isReferenceEvidence: false,
  };
}

export function normalizeLockedAssetEvidence(input: {
  assetId: string;
  sourceType: string;
  sourceId: string;
  createdAt: string;
}): EvidenceEntry {
  return {
    id: evidenceId('locked', input.assetId),
    type: 'locked_asset' as EvidenceType,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    assetId: input.assetId,
    createdAt: input.createdAt,
    isReferenceEvidence: false,
  };
}

export function normalizeUserEvidence(input: {
  sourceId: string;
  content?: string;
  createdAt: string;
}): EvidenceEntry {
  return {
    id: evidenceId('user', input.sourceId),
    type: 'user_input' as EvidenceType,
    sourceType: 'user_input',
    sourceId: input.sourceId,
    content: input.content?.slice(0, 200),
    createdAt: input.createdAt,
    isReferenceEvidence: false,
  };
}

export function normalizeModelEvidence(input: {
  runId: string;
  fieldPath: string;
  sourceType: string;
  sourceId: string;
  confidence?: number;
  sourceFingerprint?: string;
  createdAt: string;
}): EvidenceEntry {
  return {
    id: evidenceId('model', input.runId, input.fieldPath),
    type: 'model_inference' as EvidenceType,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    content: input.fieldPath,
    confidence: input.confidence,
    sourceFingerprint: input.sourceFingerprint,
    createdAt: input.createdAt,
    isReferenceEvidence: false,
  };
}
