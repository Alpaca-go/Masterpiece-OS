import { createHash } from 'node:crypto';
import {
  CreativeIntelligenceValidationError,
  EVIDENCE_STATUSES,
  EVIDENCE_TYPES,
  SOURCE_TYPES
} from './contracts.js';

const STATUS_PRIORITY = Object.freeze({
  rejected: 0,
  unconfirmed: 1,
  observed: 2,
  confirmed: 3,
  conflicted: 4
});

function cleanString(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableObject(value[key])])
  );
}

export function stableFingerprint(value) {
  return createHash('sha256').update(JSON.stringify(stableObject(value))).digest('hex');
}

function uniqueBy(items, keyOf) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeSource(source) {
  const sourceType = cleanString(source?.sourceType);
  const sourceId = cleanString(source?.sourceId);
  if (!SOURCE_TYPES.includes(sourceType) || !sourceId) return null;
  const normalized = { sourceType, sourceId };
  const location = cleanString(source.location);
  if (location) normalized.location = location;
  const label = cleanString(source.label);
  if (label) normalized.label = label;
  return normalized;
}

export function normalizeEvidenceCandidate(candidate) {
  const evidenceType = cleanString(candidate?.evidenceType);
  const content = cleanString(candidate?.content);
  const subjectPath = cleanString(candidate?.subjectPath);
  const claimMode = candidate?.claimMode === 'one' ? 'one' : 'many';
  const status = cleanString(candidate?.status) || 'unconfirmed';
  const confidence = Number(candidate?.confidence);
  const sources = uniqueBy(
    (Array.isArray(candidate?.sources) ? candidate.sources : [])
      .map(normalizeSource)
      .filter(Boolean),
    (source) => `${source.sourceType}|${source.sourceId}|${source.location || ''}`
  );
  const issues = [];
  if (!EVIDENCE_TYPES.includes(evidenceType)) issues.push(`unsupported evidenceType: ${evidenceType || '<empty>'}`);
  if (!content) issues.push('content is required');
  if (!subjectPath) issues.push('subjectPath is required');
  if (!EVIDENCE_STATUSES.includes(status)) issues.push(`unsupported status: ${status}`);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) issues.push('confidence must be between 0 and 1');
  if (!sources.length) issues.push('at least one valid source is required');
  if (issues.length) {
    throw new CreativeIntelligenceValidationError(
      'EVIDENCE_CANDIDATE_INVALID',
      `Evidence candidate is invalid: ${issues.join('; ')}`,
      issues
    );
  }
  const identity = stableFingerprint({
    evidenceType,
    subjectPath: subjectPath.toLocaleLowerCase('en-US'),
    content: content.toLocaleLowerCase('en-US')
  });
  return {
    id: `EV-${identity.slice(0, 16)}`,
    evidenceType,
    subjectPath,
    claimMode,
    content,
    confidence,
    status,
    sources,
    statusHistory: sources.map((source) => ({
      status,
      sourceType: source.sourceType,
      sourceId: source.sourceId
    }))
  };
}

function mergeEvidence(existing, incoming) {
  const sources = uniqueBy(
    [...existing.sources, ...incoming.sources],
    (source) => `${source.sourceType}|${source.sourceId}|${source.location || ''}`
  );
  const statusHistory = uniqueBy(
    [...existing.statusHistory, ...incoming.statusHistory],
    (item) => `${item.status}|${item.sourceType}|${item.sourceId}`
  );
  const status = STATUS_PRIORITY[incoming.status] > STATUS_PRIORITY[existing.status]
    ? incoming.status
    : existing.status;
  return {
    ...existing,
    confidence: Math.max(existing.confidence, incoming.confidence),
    status,
    sources,
    statusHistory
  };
}

export function validateEvidenceLedger(ledger) {
  const issues = [];
  if (!ledger || typeof ledger !== 'object') return ['ledger must be an object'];
  if (ledger.schemaVersion !== '2.0') issues.push('schemaVersion must be 2.0');
  if (!cleanString(ledger.projectId)) issues.push('projectId is required');
  if (!Array.isArray(ledger.evidence)) issues.push('evidence must be an array');
  const ids = new Set();
  for (const entry of Array.isArray(ledger.evidence) ? ledger.evidence : []) {
    try {
      const normalized = normalizeEvidenceCandidate(entry);
      if (entry.id !== normalized.id) issues.push(`evidence id is not deterministic: ${entry.id || '<empty>'}`);
      if (ids.has(entry.id)) issues.push(`duplicate evidence id: ${entry.id}`);
      ids.add(entry.id);
    } catch (error) {
      issues.push(...(error.issues || [error.message]));
    }
  }
  return issues;
}

export function buildEvidenceLedger({ projectId, candidates, generatedAt = new Date().toISOString() }) {
  const normalizedProjectId = cleanString(projectId);
  if (!normalizedProjectId) {
    throw new CreativeIntelligenceValidationError('PROJECT_ID_REQUIRED', 'projectId is required');
  }
  const byId = new Map();
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const normalized = normalizeEvidenceCandidate(candidate);
    byId.set(normalized.id, byId.has(normalized.id) ? mergeEvidence(byId.get(normalized.id), normalized) : normalized);
  }
  const evidence = [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
  const ledger = {
    schemaVersion: '2.0',
    projectId: normalizedProjectId,
    generatedAt,
    sourceFingerprint: stableFingerprint(evidence.map(({ id, confidence, status, sources }) => ({ id, confidence, status, sources }))),
    evidence
  };
  const issues = validateEvidenceLedger(ledger);
  if (issues.length) {
    throw new CreativeIntelligenceValidationError('EVIDENCE_LEDGER_INVALID', `Evidence Ledger is invalid: ${issues.join('; ')}`, issues);
  }
  return ledger;
}
