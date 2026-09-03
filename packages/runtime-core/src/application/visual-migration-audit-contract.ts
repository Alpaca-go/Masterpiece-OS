import {
  canonicalSerializeVisualMigrationValue,
  sha256Fingerprint,
} from './visual-migration-reference-pack-contract.ts';

export const VISUAL_MIGRATION_AUDIT_SCHEMA = 'visual-migration-audit/v1' as const;
export const VISUAL_MIGRATION_SOURCE_AUDIT_PROMPT_VERSION =
  'visual-migration-source-audit@1.0.0' as const;
export const VISUAL_MIGRATION_REFERENCE_AUDIT_PROMPT_VERSION =
  'visual-migration-reference-audit@1.0.0' as const;
export const VISUAL_MIGRATION_AUDIT_DECISION_RULE_VERSION =
  'visual-migration-audit-decision@1.0.0' as const;

export const VISUAL_MIGRATION_AUDIT_RUN_INVALID = 'VISUAL_MIGRATION_AUDIT_RUN_INVALID';
export const VISUAL_MIGRATION_AUDIT_OUTPUT_INTEGRITY_FAILED =
  'VISUAL_MIGRATION_AUDIT_OUTPUT_INTEGRITY_FAILED';
export const VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE =
  'VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE';
export const VISUAL_MIGRATION_AUDITOR_PROFILE_REQUIRED =
  'VISUAL_MIGRATION_AUDITOR_PROFILE_REQUIRED';
export const VISUAL_MIGRATION_AUDITOR_PROFILE_INCOMPATIBLE =
  'VISUAL_MIGRATION_AUDITOR_PROFILE_INCOMPATIBLE';
export const VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID =
  'VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID';
export const VISUAL_MIGRATION_AUDIT_CONFLICT = 'VISUAL_MIGRATION_AUDIT_CONFLICT';
export const VISUAL_MIGRATION_AUDIT_WRITE_FAILED = 'VISUAL_MIGRATION_AUDIT_WRITE_FAILED';

export type AuditMatch = 'matched' | 'minor_drift' | 'major_drift' | 'uncertain';

export interface SourceAuditObservationV1 {
  identityPreservation: AuditMatch;
  lockedAssetIntegrity: 'pass' | 'fail' | 'uncertain' | 'not_applicable';
  contentHierarchy: AuditMatch;
  structurePreservation: AuditMatch | 'not_applicable';
  foreignIdentityVisible: 'none' | 'suspected' | 'visible' | 'uncertain';
  visibleFindings: Array<{
    category: 'identity' | 'locked_asset' | 'content' | 'structure' | 'foreign_identity';
    observation: string;
  }>;
}

export interface ReferenceAuditObservationV1 {
  colorSystem: AuditMatch;
  layoutAndTypography: AuditMatch;
  graphicLanguage: AuditMatch;
  materialAndPhotography: AuditMatch;
  extensionMechanism: AuditMatch;
  referenceIdentityLeakage: 'none' | 'suspected' | 'visible' | 'uncertain';
  nearCopyRisk: 'low' | 'medium' | 'high' | 'uncertain';
  referenceConflict: 'none' | 'suspected' | 'confirmed' | 'uncertain';
  visibleFindings: Array<{
    category: 'color' | 'layout_typography' | 'graphic_language'
      | 'material_photography' | 'extension_mechanism' | 'reference_identity'
      | 'near_copy' | 'reference_conflict';
    observation: string;
  }>;
}

export type VisualMigrationFailureClass =
  | 'STYLE_DRIFT'
  | 'SOURCE_IDENTITY_LOSS'
  | 'TARGET_IDENTITY_LOSS'
  | 'STRUCTURE_DRIFT'
  | 'PALETTE_DRIFT'
  | 'GRAPHIC_LANGUAGE_DRIFT'
  | 'NEAR_COPY_RISK'
  | 'REFERENCE_CONFLICT';

export type AuditDisposition = 'pass' | 'pass_with_warnings'
  | 'corrective_retry_required' | 'manual_review_required'
  | 'reference_conflict_blocked';

export interface VisualMigrationAuditDecisionV1 {
  failureClasses: VisualMigrationFailureClass[];
  severity: 'none' | 'warning' | 'blocking';
  disposition: AuditDisposition;
  retryEligibility: boolean;
  exactCopyDetected: boolean;
}

export interface VisualMigrationAuditV1 {
  schemaVersion: typeof VISUAL_MIGRATION_AUDIT_SCHEMA;
  auditId: string;
  auditInputFingerprint: string;
  auditFingerprint: string;
  projectId: string;
  runId: string;
  generationEvidence: {
    snapshotId: string;
    snapshotFingerprint: string;
    reproducibilityFingerprint: string;
  };
  outputEvidence: { imageId: string; mimeType: string; sha256: string; byteSize: number };
  auditor: {
    sourcePromptVersion: string;
    referencePromptVersion: string;
    decisionRuleVersion: string;
    provider: string;
    model: string;
    sourceObservationRunId?: string;
    referenceObservationRunId?: string;
  };
  auditEvidence: {
    sourceCandidateIds: string[];
    referenceCandidateIds: string[];
    evidenceSha256s: string[];
  };
  observations: { source: SourceAuditObservationV1; reference: ReferenceAuditObservationV1 };
  decision: VisualMigrationAuditDecisionV1;
  createdAt: string;
}

const MATCHES = new Set(['matched', 'minor_drift', 'major_drift', 'uncertain']);
const HASH = /^[a-f0-9]{64}$/u;
const FINGERPRINT = /^sha256:[a-f0-9]{64}$/u;
const AUDIT_ID = /^vma-[a-f0-9]{32}$/u;
const FORBIDDEN_KEYS = /^(?:absolutePath|localPath|runtimeLocator|bytes|buffer|base64|dataUri|apiKey|authorization|token|cookie|providerRequest|providerResponse|reasoning|chainOfThought)$/iu;

export function visualMigrationAuditError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID, `${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function oneOf(value: unknown, values: Set<string>, field: string): string {
  if (typeof value !== 'string' || !values.has(value)) {
    throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID, `${field} is invalid.`);
  }
  return value;
}

function findings(value: unknown, categories: Set<string>, field: string) {
  if (!Array.isArray(value) || value.length > 50) {
    throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID, `${field} must be a bounded array.`);
  }
  return value.map((item, index) => {
    const entry = object(item, `${field}[${index}]`);
    const category = oneOf(entry.category, categories, `${field}[${index}].category`);
    if (typeof entry.observation !== 'string' || !entry.observation.trim() || entry.observation.length > 2000) {
      throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID, `${field}[${index}].observation is invalid.`);
    }
    return { category, observation: entry.observation.trim() };
  });
}

export function validateSourceAuditObservationV1(value: unknown): SourceAuditObservationV1 {
  const item = object(value, 'sourceObservation');
  return {
    identityPreservation: oneOf(item.identityPreservation, MATCHES, 'identityPreservation') as AuditMatch,
    lockedAssetIntegrity: oneOf(item.lockedAssetIntegrity, new Set(['pass', 'fail', 'uncertain', 'not_applicable']), 'lockedAssetIntegrity') as SourceAuditObservationV1['lockedAssetIntegrity'],
    contentHierarchy: oneOf(item.contentHierarchy, MATCHES, 'contentHierarchy') as AuditMatch,
    structurePreservation: oneOf(item.structurePreservation, new Set([...MATCHES, 'not_applicable']), 'structurePreservation') as SourceAuditObservationV1['structurePreservation'],
    foreignIdentityVisible: oneOf(item.foreignIdentityVisible, new Set(['none', 'suspected', 'visible', 'uncertain']), 'foreignIdentityVisible') as SourceAuditObservationV1['foreignIdentityVisible'],
    visibleFindings: findings(item.visibleFindings, new Set(['identity', 'locked_asset', 'content', 'structure', 'foreign_identity']), 'visibleFindings') as SourceAuditObservationV1['visibleFindings'],
  };
}

export function validateReferenceAuditObservationV1(value: unknown): ReferenceAuditObservationV1 {
  const item = object(value, 'referenceObservation');
  return {
    colorSystem: oneOf(item.colorSystem, MATCHES, 'colorSystem') as AuditMatch,
    layoutAndTypography: oneOf(item.layoutAndTypography, MATCHES, 'layoutAndTypography') as AuditMatch,
    graphicLanguage: oneOf(item.graphicLanguage, MATCHES, 'graphicLanguage') as AuditMatch,
    materialAndPhotography: oneOf(item.materialAndPhotography, MATCHES, 'materialAndPhotography') as AuditMatch,
    extensionMechanism: oneOf(item.extensionMechanism, MATCHES, 'extensionMechanism') as AuditMatch,
    referenceIdentityLeakage: oneOf(item.referenceIdentityLeakage, new Set(['none', 'suspected', 'visible', 'uncertain']), 'referenceIdentityLeakage') as ReferenceAuditObservationV1['referenceIdentityLeakage'],
    nearCopyRisk: oneOf(item.nearCopyRisk, new Set(['low', 'medium', 'high', 'uncertain']), 'nearCopyRisk') as ReferenceAuditObservationV1['nearCopyRisk'],
    referenceConflict: oneOf(item.referenceConflict, new Set(['none', 'suspected', 'confirmed', 'uncertain']), 'referenceConflict') as ReferenceAuditObservationV1['referenceConflict'],
    visibleFindings: findings(item.visibleFindings, new Set(['color', 'layout_typography', 'graphic_language', 'material_photography', 'extension_mechanism', 'reference_identity', 'near_copy', 'reference_conflict']), 'visibleFindings') as ReferenceAuditObservationV1['visibleFindings'],
  };
}

export function assertVisualMigrationAuditSafePayload(value: unknown, trail = '$'): void {
  if (typeof value === 'string') {
    if (/^[a-z]:[\\/]/iu.test(value) || /^\\\\/u.test(value) || /^\//u.test(value) || /^file:\/\//iu.test(value)
      || /^data:/iu.test(value) || /(?:^|[\\/])\.\.(?:[\\/]|$)/u.test(value)) {
      throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID, `${trail} contains unsafe data.`);
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) return value.forEach((entry, index) => assertVisualMigrationAuditSafePayload(entry, `${trail}[${index}]`));
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.test(key)) throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID, `${trail}.${key} is forbidden.`);
    assertVisualMigrationAuditSafePayload(entry, `${trail}.${key}`);
  }
}

export function computeVisualMigrationAuditInputFingerprint(value: unknown): string {
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(value));
}

export function buildVisualMigrationAuditId(inputFingerprint: string): string {
  if (!FINGERPRINT.test(inputFingerprint)) throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID, 'auditInputFingerprint is invalid.');
  return `vma-${inputFingerprint.slice('sha256:'.length, 'sha256:'.length + 32)}`;
}

export function computeVisualMigrationAuditFingerprint(value: Omit<VisualMigrationAuditV1, 'auditFingerprint'> | VisualMigrationAuditV1): string {
  const { auditFingerprint: _ignored, ...payload } = value as VisualMigrationAuditV1;
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(payload));
}

export function validateVisualMigrationAuditV1(value: unknown): VisualMigrationAuditV1 {
  assertVisualMigrationAuditSafePayload(value);
  const audit = object(value, 'audit') as unknown as VisualMigrationAuditV1;
  if (audit.schemaVersion !== VISUAL_MIGRATION_AUDIT_SCHEMA || !AUDIT_ID.test(audit.auditId)
    || !FINGERPRINT.test(audit.auditInputFingerprint) || !FINGERPRINT.test(audit.auditFingerprint)
    || buildVisualMigrationAuditId(audit.auditInputFingerprint) !== audit.auditId
    || computeVisualMigrationAuditFingerprint(audit) !== audit.auditFingerprint
    || !audit.projectId || !audit.runId || !HASH.test(audit.outputEvidence?.sha256 ?? '')
    || !Number.isSafeInteger(audit.outputEvidence?.byteSize) || audit.outputEvidence.byteSize < 1
    || !Number.isFinite(Date.parse(audit.createdAt))) {
    throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID, 'Visual Migration Audit integrity validation failed.');
  }
  audit.observations.source = validateSourceAuditObservationV1(audit.observations.source);
  audit.observations.reference = validateReferenceAuditObservationV1(audit.observations.reference);
  return audit;
}
