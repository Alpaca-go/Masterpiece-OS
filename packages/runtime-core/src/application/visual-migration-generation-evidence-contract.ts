import type {
  ReferencePolicyCandidateSourceKind,
  ReferencePolicyRetention,
  ReferencePolicyRole,
} from '@masterpiece/project-contracts/index.ts';
import {
  canonicalSerializeVisualMigrationValue,
  sha256Fingerprint,
} from './visual-migration-reference-pack-contract.ts';

export const VISUAL_MIGRATION_GENERATION_EVIDENCE_SCHEMA =
  'visual-migration-generation-evidence-snapshot/v1' as const;

export const GENERATION_EVIDENCE_INVALID = 'GENERATION_EVIDENCE_INVALID';
export const GENERATION_EVIDENCE_FINGERPRINT_MISMATCH =
  'GENERATION_EVIDENCE_FINGERPRINT_MISMATCH';
export const GENERATION_EVIDENCE_CONFLICT = 'GENERATION_EVIDENCE_CONFLICT';
export const GENERATION_EVIDENCE_REFERENCE_SET_MISMATCH =
  'GENERATION_EVIDENCE_REFERENCE_SET_MISMATCH';
export const GENERATION_EVIDENCE_AUTHORITY_MISMATCH =
  'GENERATION_EVIDENCE_AUTHORITY_MISMATCH';
export const GENERATION_EVIDENCE_CAPABILITY_MISMATCH =
  'GENERATION_EVIDENCE_CAPABILITY_MISMATCH';
export const GENERATION_EVIDENCE_ARTIFACT_TAMPERED =
  'GENERATION_EVIDENCE_ARTIFACT_TAMPERED';
export const GENERATION_EVIDENCE_UNSAFE_PAYLOAD =
  'GENERATION_EVIDENCE_UNSAFE_PAYLOAD';
export const GENERATION_EVIDENCE_WRITE_FAILED = 'GENERATION_EVIDENCE_WRITE_FAILED';

export const GENERATION_EVIDENCE_ARTIFACT_FILENAMES = Object.freeze({
  task: 'task.json',
  sourceContextSnapshot: 'source-context-snapshot.json',
  compiledPrompt: 'compiled-prompt.md',
  promptSourceMap: 'prompt-source-map.json',
  compileFingerprint: 'compile-fingerprint.json',
  providerRequestRedacted: 'provider-request.redacted.json',
} as const);

const FINGERPRINT = /^sha256:[a-f0-9]{64}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const SNAPSHOT_ID = /^vmges-[a-f0-9]{32}$/u;
const FORBIDDEN_KEYS = new Set([
  'absolutepath', 'localpath', 'runtimelocator', 'bytes', 'buffer', 'base64',
  'datauri', 'authorization', 'apikey', 'secret', 'token', 'cookie',
  'providercredential', 'providerresponse',
  'providercredentials',
]);

export interface GenerationEvidenceArtifactRef {
  filename: string;
  sha256: string;
  byteSize: number;
}

export interface VisualMigrationGenerationEvidenceSnapshotV1 {
  schemaVersion: typeof VISUAL_MIGRATION_GENERATION_EVIDENCE_SCHEMA;
  snapshotId: string;
  snapshotFingerprint: string;
  reproducibilityFingerprint: string;
  projectId: string;
  runId: string;
  taskId: string;
  createdAt: string;
  runBinding: {
    parentRunId?: string;
    sourcePreset?: string;
    deliverable?: string;
    outputType?: string;
  };
  authority: {
    canon: {
      canonId: string;
      canonFingerprint: string;
      canonSourceFingerprint: string;
      projectIdentityFingerprint: string;
      lockedAssetFingerprint: string;
    };
    referencePack: { referencePackId: string; manifestFingerprint: string };
    policy: {
      policyId: string;
      policyFingerprint: string;
      sourceFingerprint: string;
      taskFingerprint: string;
      candidateSetFingerprint: string;
    };
  };
  capability: {
    schema: 'image-reference-capability/v1';
    registryVersion: string;
    capabilityVersion: string;
    capabilityFingerprint: string;
    registryModelId: string;
    provider: string;
    protocol: string;
    referenceSupport: true;
    supportsMultipleReferences: boolean;
    maxReferenceImages: number;
    supportedReferenceMimeTypes: string[];
  };
  referenceDecision: {
    minimumRequiredReferences: number;
    reserved: { identity?: string; structure?: string; style?: string };
    requestedCandidates: Array<{
      candidateId: string;
      role: ReferencePolicyRole;
      sourceKind: ReferencePolicyCandidateSourceKind;
      sourceId: string;
      retention: ReferencePolicyRetention;
      requiredGroup?: string;
      sourceOrder: number;
    }>;
    selectedCandidateIds: string[];
    droppedCandidateIds: string[];
    dropReasons: Array<{
      candidateId: string;
      reason: 'non_materializable' | 'capacity_surplus';
    }>;
    materializedReferences: Array<{
      candidateId: string;
      role: ReferencePolicyRole;
      providerRole: string;
      sourceKind: ReferencePolicyCandidateSourceKind;
      sourceId: string;
      mimeType: string;
      sha256: string;
      byteSize: number;
    }>;
  };
  providerEnvelope: {
    schema: 'visual-migration-provider-reference-envelope/v1';
    capabilityFingerprint: string;
    candidateIds: string[];
    providerRoles: string[];
    evidenceSha256s: string[];
  };
  artifacts: {
    task: GenerationEvidenceArtifactRef;
    sourceContextSnapshot: GenerationEvidenceArtifactRef;
    compiledPrompt: GenerationEvidenceArtifactRef;
    promptSourceMap: GenerationEvidenceArtifactRef;
    compileFingerprint?: GenerationEvidenceArtifactRef;
    providerRequestRedacted: GenerationEvidenceArtifactRef;
  };
}

export function generationEvidenceError(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): Error {
  return Object.assign(new Error(message), { code, ...details });
}

function requireText(value: unknown, field: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, `${field} is required.`);
  return text;
}

function exactOrder(expected: string[], actual: string[], stage: string): void {
  if (expected.length !== actual.length || expected.some((id, index) => id !== actual[index])) {
    throw generationEvidenceError(
      GENERATION_EVIDENCE_REFERENCE_SET_MISMATCH,
      `${stage} candidate order does not match the frozen allocation.`,
      { expectedCandidateIds: [...expected], actualCandidateIds: [...actual] },
    );
  }
}

function assertUnique(values: string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, `${field} must contain unique IDs.`);
  }
}

function unsafeString(value: string): boolean {
  return /^[a-z]:[\\/]/iu.test(value)
    || /^\\\\/u.test(value)
    || /^\/(?:[^/]|$)/u.test(value)
    || /^file:\/\//iu.test(value)
    || /^data:image\/[^;]+;base64,/iu.test(value)
    || /\bBearer\s+[A-Za-z0-9._~+/=-]+/iu.test(value);
}

export function assertGenerationEvidenceSafePayload(value: unknown, trail = '$'): void {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    throw generationEvidenceError(GENERATION_EVIDENCE_UNSAFE_PAYLOAD, `${trail} contains raw bytes.`);
  }
  if (typeof value === 'string' && unsafeString(value)) {
    throw generationEvidenceError(GENERATION_EVIDENCE_UNSAFE_PAYLOAD, `${trail} contains an unsafe string.`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertGenerationEvidenceSafePayload(item, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/gu, '');
    if (FORBIDDEN_KEYS.has(normalizedKey)) {
      throw generationEvidenceError(GENERATION_EVIDENCE_UNSAFE_PAYLOAD, `${trail}.${key} is forbidden.`);
    }
    assertGenerationEvidenceSafePayload(child, `${trail}.${key}`);
  }
}

export function computeGenerationEvidenceReproducibilityFingerprint(value: unknown): string {
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(value));
}

export function buildGenerationEvidenceSnapshotId(
  projectId: string,
  runId: string,
  reproducibilityFingerprint: string,
): string {
  const digest = sha256Fingerprint(canonicalSerializeVisualMigrationValue({
    projectId, runId, reproducibilityFingerprint,
  })).slice('sha256:'.length);
  return `vmges-${digest.slice(0, 32)}`;
}

export function computeGenerationEvidenceSnapshotFingerprint(
  snapshot: Omit<VisualMigrationGenerationEvidenceSnapshotV1, 'snapshotFingerprint'>
    | VisualMigrationGenerationEvidenceSnapshotV1,
): string {
  const { snapshotFingerprint: _ignored, ...payload } = snapshot as VisualMigrationGenerationEvidenceSnapshotV1;
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(payload));
}

function validateArtifact(
  artifact: GenerationEvidenceArtifactRef,
  expectedFilename: string,
  field: string,
): void {
  if (!artifact || artifact.filename !== expectedFilename || !SHA256.test(artifact.sha256)
    || !Number.isSafeInteger(artifact.byteSize) || artifact.byteSize < 0) {
    throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, `${field} artifact reference is invalid.`);
  }
}

export function validateVisualMigrationGenerationEvidenceSnapshotV1(
  value: unknown,
): VisualMigrationGenerationEvidenceSnapshotV1 {
  assertGenerationEvidenceSafePayload(value);
  if (!value || typeof value !== 'object') {
    throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, 'Generation Evidence Snapshot must be an object.');
  }
  const snapshot = value as VisualMigrationGenerationEvidenceSnapshotV1;
  if (snapshot.schemaVersion !== VISUAL_MIGRATION_GENERATION_EVIDENCE_SCHEMA) {
    throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, 'Generation Evidence Snapshot schema is unsupported.');
  }
  requireText(snapshot.projectId, 'projectId');
  requireText(snapshot.runId, 'runId');
  requireText(snapshot.taskId, 'taskId');
  if (!SNAPSHOT_ID.test(snapshot.snapshotId) || !FINGERPRINT.test(snapshot.snapshotFingerprint)
    || !FINGERPRINT.test(snapshot.reproducibilityFingerprint)
    || !Number.isFinite(Date.parse(snapshot.createdAt))) {
    throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, 'Snapshot identity or timestamps are invalid.');
  }
  const expectedId = buildGenerationEvidenceSnapshotId(
    snapshot.projectId, snapshot.runId, snapshot.reproducibilityFingerprint,
  );
  if (snapshot.snapshotId !== expectedId) {
    throw generationEvidenceError(GENERATION_EVIDENCE_FINGERPRINT_MISMATCH, 'snapshotId is inconsistent.');
  }
  const expectedFingerprint = computeGenerationEvidenceSnapshotFingerprint(snapshot);
  if (snapshot.snapshotFingerprint !== expectedFingerprint) {
    throw generationEvidenceError(
      GENERATION_EVIDENCE_FINGERPRINT_MISMATCH,
      'snapshotFingerprint does not match the canonical payload.',
    );
  }
  const { authority, capability, referenceDecision, providerEnvelope, artifacts } = snapshot;
  if (!authority?.canon || !authority.referencePack || !authority.policy
    || !referenceDecision
    || !Array.isArray(referenceDecision.requestedCandidates)
    || !Array.isArray(referenceDecision.selectedCandidateIds)
    || !Array.isArray(referenceDecision.droppedCandidateIds)
    || !Array.isArray(referenceDecision.dropReasons)
    || !Array.isArray(referenceDecision.materializedReferences)
    || !providerEnvelope
    || !Array.isArray(providerEnvelope.candidateIds)
    || !Array.isArray(providerEnvelope.providerRoles)
    || !Array.isArray(providerEnvelope.evidenceSha256s)
    || !artifacts) {
    throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, 'Generation Evidence Snapshot sections are incomplete.');
  }
  for (const fingerprint of [
    authority?.canon?.canonFingerprint,
    authority?.canon?.canonSourceFingerprint,
    authority?.canon?.projectIdentityFingerprint,
    authority?.canon?.lockedAssetFingerprint,
    authority?.referencePack?.manifestFingerprint,
    authority?.policy?.policyFingerprint,
    authority?.policy?.sourceFingerprint,
    authority?.policy?.taskFingerprint,
    authority?.policy?.candidateSetFingerprint,
  ]) {
    if (!FINGERPRINT.test(String(fingerprint ?? ''))) {
      throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, 'Authority fingerprint is invalid.');
    }
  }
  if (capability?.schema !== 'image-reference-capability/v1'
    || capability.referenceSupport !== true
    || !SHA256.test(String(capability.capabilityFingerprint ?? ''))
    || !Number.isInteger(capability.maxReferenceImages)
    || capability.maxReferenceImages < 1
    || !Array.isArray(capability.supportedReferenceMimeTypes)
    || capability.supportedReferenceMimeTypes.length < 1) {
    throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, 'Capability evidence is invalid.');
  }
  const requestedIds = referenceDecision.requestedCandidates.map((candidate) => candidate.candidateId);
  const selected = referenceDecision.selectedCandidateIds;
  const dropped = referenceDecision.droppedCandidateIds;
  assertUnique(requestedIds, 'requestedCandidates');
  assertUnique(selected, 'selectedCandidateIds');
  assertUnique(dropped, 'droppedCandidateIds');
  if (selected.some((id) => dropped.includes(id))
    || requestedIds.length !== selected.length + dropped.length
    || requestedIds.some((id) => !selected.includes(id) && !dropped.includes(id))) {
    throw generationEvidenceError(GENERATION_EVIDENCE_REFERENCE_SET_MISMATCH, 'Selected and dropped IDs do not cover requested candidates.');
  }
  exactOrder(selected, referenceDecision.materializedReferences.map((item) => item.candidateId), 'Materialized evidence');
  exactOrder(selected, providerEnvelope.candidateIds, 'Provider envelope');
  exactOrder(dropped, referenceDecision.dropReasons.map((item) => item.candidateId), 'Drop reasons');
  if (referenceDecision.dropReasons.some((item) =>
    !['non_materializable', 'capacity_surplus'].includes(item.reason))) {
    throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, 'Drop reason is unsupported.');
  }
  if (referenceDecision.materializedReferences.some((item) => item.role === 'analysis_only'
    || !SHA256.test(item.sha256)
    || !capability.supportedReferenceMimeTypes.includes(item.mimeType)
    || !Number.isSafeInteger(item.byteSize)
    || item.byteSize < 1)
    || referenceDecision.materializedReferences.length > capability.maxReferenceImages) {
    throw generationEvidenceError(GENERATION_EVIDENCE_INVALID, 'Materialized evidence violates capability or integrity constraints.');
  }
  if (providerEnvelope.schema !== 'visual-migration-provider-reference-envelope/v1'
    || providerEnvelope.capabilityFingerprint !== capability.capabilityFingerprint
    || providerEnvelope.providerRoles.length !== selected.length
    || providerEnvelope.evidenceSha256s.length !== selected.length
    || providerEnvelope.evidenceSha256s.some((sha) => !SHA256.test(sha))) {
    throw generationEvidenceError(GENERATION_EVIDENCE_REFERENCE_SET_MISMATCH, 'Provider envelope evidence is invalid.');
  }
  exactOrder(
    referenceDecision.materializedReferences.map((item) => item.providerRole),
    providerEnvelope.providerRoles,
    'Provider roles',
  );
  exactOrder(
    referenceDecision.materializedReferences.map((item) => item.sha256),
    providerEnvelope.evidenceSha256s,
    'Provider evidence hashes',
  );
  validateArtifact(artifacts.task, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.task, 'task');
  validateArtifact(artifacts.sourceContextSnapshot, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.sourceContextSnapshot, 'sourceContextSnapshot');
  validateArtifact(artifacts.compiledPrompt, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.compiledPrompt, 'compiledPrompt');
  validateArtifact(artifacts.promptSourceMap, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.promptSourceMap, 'promptSourceMap');
  if (artifacts.compileFingerprint) {
    validateArtifact(artifacts.compileFingerprint, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.compileFingerprint, 'compileFingerprint');
  }
  validateArtifact(artifacts.providerRequestRedacted, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.providerRequestRedacted, 'providerRequestRedacted');
  const expectedReproducibility = computeGenerationEvidenceReproducibilityFingerprint({
    authority,
    capability,
    referenceDecision,
    providerEnvelope,
    artifacts,
  });
  if (snapshot.reproducibilityFingerprint !== expectedReproducibility) {
    throw generationEvidenceError(
      GENERATION_EVIDENCE_FINGERPRINT_MISMATCH,
      'reproducibilityFingerprint does not match generation inputs.',
    );
  }
  return snapshot;
}
