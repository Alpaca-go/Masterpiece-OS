/**
 * Planning Semantic Extraction contract.
 *
 * Creative Intelligence owns the Planning-specific raw schema,
 * prompt authority, validation, deterministic normalization, and
 * projection to PlanningStrategicClaim. Runtime Core owns only model
 * invocation and retry orchestration.
 */

import { createHash } from 'node:crypto';

import {
  buildClaimId,
  PLANNING_CLAIM_KEYS,
  type PlanningClaimKey,
  type PlanningEpistemicClass,
  type PlanningStrategicClaim
} from './planning-strategic-evidence.ts';

export const PLANNING_SEMANTIC_EXTRACTION_SCHEMA_VERSION = 'ci-planning-extraction-v1' as const;

const PLANNING_KEY_SET = new Set<string>(PLANNING_CLAIM_KEYS);
const EPISTEMIC_CLASS_SET = new Set<PlanningEpistemicClass>([
  'FACT',
  'USER_REQUIREMENT',
  'MODEL_INFERENCE',
  'UNKNOWN'
]);
const ROOT_KEYS = new Set(['schemaVersion', 'claims', 'conflicts', 'unknownKeys']);
const CLAIM_KEYS = new Set(['key', 'value', 'epistemicClass', 'confidence', 'evidence']);
const EVIDENCE_KEYS = new Set(['documentId', 'filename', 'section', 'summary']);
const CONFLICT_KEYS = new Set(['key', 'description', 'sourceRefs']);

export interface PlanningSemanticExtractionEvidence {
  documentId: string;
  filename: string;
  section?: string;
  summary: string;
}

export interface PlanningSemanticExtractionClaim {
  key: PlanningClaimKey;
  value: string;
  epistemicClass: PlanningEpistemicClass;
  confidence?: number;
  evidence: PlanningSemanticExtractionEvidence[];
}

export interface PlanningSemanticExtractionConflict {
  key: PlanningClaimKey;
  description: string;
  sourceRefs: string[];
}

/** Raw model-owned semantic output. Runtime metadata is intentionally absent. */
export interface PlanningSemanticExtractionResult {
  schemaVersion: typeof PLANNING_SEMANTIC_EXTRACTION_SCHEMA_VERSION;
  claims: PlanningSemanticExtractionClaim[];
  conflicts: PlanningSemanticExtractionConflict[];
  unknownKeys: PlanningClaimKey[];
}

export interface PlanningExtractionSourceDocument {
  documentId: string;
  filename: string;
  documentRole: string;
  rawText: string;
}

export interface PlanningExtractionMessage {
  role: 'system' | 'user';
  content: string;
}

const OUTPUT_SHAPE = `{
  "schemaVersion": "ci-planning-extraction-v1",
  "claims": [{
    "key": "<allowed PlanningClaimKey>",
    "value": "<source-faithful planning statement>",
    "epistemicClass": "FACT | USER_REQUIREMENT | MODEL_INFERENCE | UNKNOWN",
    "confidence": 0.0,
    "evidence": [{
      "documentId": "<document id>",
      "filename": "<filename>",
      "section": "<section heading when available>",
      "summary": "<short source-faithful evidence summary>"
    }]
  }],
  "conflicts": [{
    "key": "<allowed PlanningClaimKey>",
    "description": "<conflict description>",
    "sourceRefs": ["<document id or section ref>"]
  }],
  "unknownKeys": ["<allowed PlanningClaimKey>"]
}`;

export const PLANNING_EXTRACTION_SYSTEM_INSTRUCTION = `You are a Planning Semantic Extraction engine.

Extract only planning semantics explicitly supported by the supplied source document. Preserve source wording where possible. Do not invent, rewrite, infer missing strategy, or route planning content through visual fields.

Every claim.key MUST be one of these PlanningClaimKey values:
${PLANNING_CLAIM_KEYS.join('\n')}

For every claim, provide a non-empty value, an allowed epistemicClass, and at least one evidence item tied to the supplied document. Confidence is optional; when present it must be between 0 and 1. Use unknownKeys only for allowed PlanningClaimKey values that the source leaves unresolved. Record explicit contradictions in conflicts.

Return only one JSON object with exactly this semantic shape. Do not emit sourceRunId, generatedAt, sourceDocuments, fingerprints, or other runtime metadata:
${OUTPUT_SHAPE}`;

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildSourceBlock(source: PlanningExtractionSourceDocument): string {
  return [
    `<document id="${escapeAttribute(source.documentId)}" filename="${escapeAttribute(source.filename)}" role="${escapeAttribute(source.documentRole)}">`,
    source.rawText,
    '</document>'
  ].join('\n');
}

export function buildPlanningExtractionMessages(
  source: PlanningExtractionSourceDocument
): PlanningExtractionMessage[] {
  return [
    { role: 'system', content: PLANNING_EXTRACTION_SYSTEM_INSTRUCTION },
    {
      role: 'user',
      content: `Extract the Planning semantic claims from this source document.\n\n${buildSourceBlock(source)}`
    }
  ];
}

export function buildPlanningRepairMessages(args: {
  sourceDocument: PlanningExtractionSourceDocument;
  previousText: string;
  errors: readonly string[];
}): PlanningExtractionMessage[] {
  return [
    { role: 'system', content: PLANNING_EXTRACTION_SYSTEM_INSTRUCTION },
    {
      role: 'user',
      content: [
        'Repair the previous Planning extraction. Return only the complete corrected JSON object.',
        '',
        'Original planning source document:',
        buildSourceBlock(args.sourceDocument),
        '',
        'Validation errors:',
        ...(args.errors.length ? args.errors.map((error) => `- ${error}`) : ['- unknown validation error']),
        '',
        'Previous output:',
        String(args.previousText || '')
      ].join('\n')
    }
  ];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function unknownKeys(value: Record<string, unknown>, allowed: Set<string>): string[] {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validatePlanningSemanticExtractionResult(
  input: unknown
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(input)) return { valid: false, errors: ['planning extraction root must be an object'] };

  for (const key of unknownKeys(input, ROOT_KEYS)) errors.push(`unknown root key: ${key}`);
  if (input.schemaVersion !== PLANNING_SEMANTIC_EXTRACTION_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PLANNING_SEMANTIC_EXTRACTION_SCHEMA_VERSION}`);
  }

  if (!Array.isArray(input.claims)) {
    errors.push('claims must be an array');
  } else {
    input.claims.forEach((claim, claimIndex) => {
      if (!isObject(claim)) {
        errors.push(`claims[${claimIndex}] must be an object`);
        return;
      }
      for (const key of unknownKeys(claim, CLAIM_KEYS)) {
        errors.push(`claims[${claimIndex}] unknown key: ${key}`);
      }
      if (!PLANNING_KEY_SET.has(String(claim.key))) {
        errors.push(`claims[${claimIndex}].key is not an allowed PlanningClaimKey`);
      }
      if (!nonEmptyString(claim.value)) errors.push(`claims[${claimIndex}].value must be non-empty`);
      if (!EPISTEMIC_CLASS_SET.has(claim.epistemicClass as PlanningEpistemicClass)) {
        errors.push(`claims[${claimIndex}].epistemicClass is invalid`);
      }
      if (claim.confidence !== undefined && (
        typeof claim.confidence !== 'number'
        || !Number.isFinite(claim.confidence)
        || claim.confidence < 0
        || claim.confidence > 1
      )) {
        errors.push(`claims[${claimIndex}].confidence must be finite and between 0 and 1`);
      }
      if (!Array.isArray(claim.evidence) || claim.evidence.length === 0) {
        errors.push(`claims[${claimIndex}].evidence must be a non-empty array`);
      } else {
        claim.evidence.forEach((entry, evidenceIndex) => {
          if (!isObject(entry)) {
            errors.push(`claims[${claimIndex}].evidence[${evidenceIndex}] must be an object`);
            return;
          }
          for (const key of unknownKeys(entry, EVIDENCE_KEYS)) {
            errors.push(`claims[${claimIndex}].evidence[${evidenceIndex}] unknown key: ${key}`);
          }
          if (!nonEmptyString(entry.documentId)) errors.push(`claims[${claimIndex}].evidence[${evidenceIndex}].documentId must be non-empty`);
          if (!nonEmptyString(entry.filename)) errors.push(`claims[${claimIndex}].evidence[${evidenceIndex}].filename must be non-empty`);
          if (entry.section !== undefined && typeof entry.section !== 'string') errors.push(`claims[${claimIndex}].evidence[${evidenceIndex}].section must be a string`);
          if (!nonEmptyString(entry.summary)) errors.push(`claims[${claimIndex}].evidence[${evidenceIndex}].summary must be non-empty`);
        });
      }
    });
  }

  if (!Array.isArray(input.unknownKeys)) {
    errors.push('unknownKeys must be an array');
  } else {
    input.unknownKeys.forEach((key, index) => {
      if (!PLANNING_KEY_SET.has(String(key))) errors.push(`unknownKeys[${index}] is not an allowed PlanningClaimKey`);
    });
  }

  if (!Array.isArray(input.conflicts)) {
    errors.push('conflicts must be an array');
  } else {
    input.conflicts.forEach((conflict, conflictIndex) => {
      if (!isObject(conflict)) {
        errors.push(`conflicts[${conflictIndex}] must be an object`);
        return;
      }
      for (const key of unknownKeys(conflict, CONFLICT_KEYS)) {
        errors.push(`conflicts[${conflictIndex}] unknown key: ${key}`);
      }
      if (!PLANNING_KEY_SET.has(String(conflict.key))) errors.push(`conflicts[${conflictIndex}].key is not an allowed PlanningClaimKey`);
      if (!nonEmptyString(conflict.description)) errors.push(`conflicts[${conflictIndex}].description must be non-empty`);
      if (!Array.isArray(conflict.sourceRefs) || conflict.sourceRefs.some((ref) => !nonEmptyString(ref))) {
        errors.push(`conflicts[${conflictIndex}].sourceRefs must be a string array`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

function normalizeText(value: string): string {
  return value.trim().normalize('NFC');
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function normalizePlanningSemanticExtractionResult(
  input: PlanningSemanticExtractionResult
): PlanningSemanticExtractionResult {
  const keyOrder = new Map(PLANNING_CLAIM_KEYS.map((key, index) => [key, index]));
  const normalizedClaims = new Map<string, PlanningSemanticExtractionClaim>();

  for (const claim of input.claims) {
    const value = normalizeText(claim.value);
    if (!value) continue;
    const evidenceByKey = new Map<string, PlanningSemanticExtractionEvidence>();
    for (const entry of claim.evidence) {
      const normalized: PlanningSemanticExtractionEvidence = {
        documentId: normalizeText(entry.documentId),
        filename: normalizeText(entry.filename),
        ...(normalizeText(entry.section ?? '') ? { section: normalizeText(entry.section ?? '') } : {}),
        summary: normalizeText(entry.summary)
      };
      const evidenceKey = `${normalized.documentId}\u0000${normalized.filename}\u0000${normalized.section ?? ''}\u0000${normalized.summary}`;
      evidenceByKey.set(evidenceKey, normalized);
    }
    const evidence = Array.from(evidenceByKey.entries())
      .sort(([a], [b]) => compareText(a, b))
      .map(([, entry]) => entry);
    const claimKey = `${claim.key}\u0000${value}\u0000${claim.epistemicClass}\u0000${claim.confidence ?? ''}`;
    const existing = normalizedClaims.get(claimKey);
    if (existing) {
      const merged = new Map(existing.evidence.map((entry) => [
        `${entry.documentId}\u0000${entry.filename}\u0000${entry.section ?? ''}\u0000${entry.summary}`,
        entry
      ]));
      for (const entry of evidence) {
        merged.set(`${entry.documentId}\u0000${entry.filename}\u0000${entry.section ?? ''}\u0000${entry.summary}`, entry);
      }
      existing.evidence = Array.from(merged.entries()).sort(([a], [b]) => compareText(a, b)).map(([, entry]) => entry);
    } else {
      normalizedClaims.set(claimKey, {
        key: claim.key,
        value,
        epistemicClass: claim.epistemicClass,
        ...(claim.confidence !== undefined ? { confidence: claim.confidence } : {}),
        evidence
      });
    }
  }

  const claims = Array.from(normalizedClaims.values()).sort((a, b) =>
    (keyOrder.get(a.key) ?? 999) - (keyOrder.get(b.key) ?? 999)
    || compareText(a.value, b.value)
    || compareText(a.epistemicClass, b.epistemicClass)
  );

  const unknownKeys = Array.from(new Set(input.unknownKeys))
    .sort((a, b) => (keyOrder.get(a) ?? 999) - (keyOrder.get(b) ?? 999));
  const conflictsByKey = new Map<string, PlanningSemanticExtractionConflict>();
  for (const conflict of input.conflicts) {
    const description = normalizeText(conflict.description);
    if (!description) continue;
    const sourceRefs = Array.from(new Set(conflict.sourceRefs.map(normalizeText).filter(Boolean))).sort(compareText);
    const dedupeKey = `${conflict.key}\u0000${description}\u0000${sourceRefs.join('\u0000')}`;
    conflictsByKey.set(dedupeKey, { key: conflict.key, description, sourceRefs });
  }
  const conflicts = Array.from(conflictsByKey.entries())
    .sort(([a], [b]) => compareText(a, b))
    .map(([, conflict]) => conflict);

  return {
    schemaVersion: PLANNING_SEMANTIC_EXTRACTION_SCHEMA_VERSION,
    claims,
    conflicts,
    unknownKeys
  };
}

/**
 * Project normalized Planning semantics into the canonical claim carrier.
 * chunkRefs remain section-level transitional trace, not canonical
 * prepareDocumentSet chunk grounding.
 */
export function projectPlanningExtractionToClaims(args: {
  extraction: PlanningSemanticExtractionResult;
  sourceDocumentId: string;
}): PlanningStrategicClaim[] {
  const claims: PlanningStrategicClaim[] = [];
  for (const extracted of args.extraction.claims) {
    const matchingEvidence = extracted.evidence.filter(
      (entry) => entry.documentId === args.sourceDocumentId
    );
    if (matchingEvidence.length === 0) {
      throw new Error(`PLANNING_EXTRACTION_SOURCE_TRACE_INVALID: ${extracted.key}`);
    }
    const valueHash = createHash('sha256').update(extracted.value).digest('hex');
    const chunkRefs = Array.from(new Set(
      matchingEvidence.map((entry) => entry.section || 'planning-semantic-extraction')
    )).sort(compareText);
    claims.push({
      claimId: buildClaimId(args.sourceDocumentId, extracted.key, valueHash),
      key: extracted.key,
      value: extracted.value,
      epistemicClass: extracted.epistemicClass,
      ...(extracted.confidence !== undefined ? { confidence: extracted.confidence } : {}),
      sourceDocumentId: args.sourceDocumentId,
      chunkRefs
    });
  }
  return claims.sort((a, b) => compareText(a.claimId, b.claimId));
}
