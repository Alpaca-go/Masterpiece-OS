import {
  CREATIVE_RESEARCH_SESSION_STATUSES,
  DESIGN_BRIEF_FIELDS,
  NEGATIVE_SIGNAL_SCOPES,
  NEGATIVE_SIGNAL_TYPES,
  REFERENCE_ATTRIBUTES,
  REFERENCE_SELECTION_STATES,
  SEARCH_KEYWORD_KINDS,
  SEARCH_KEYWORD_SOURCES,
  SEARCH_QUERY_KINDS,
  SEARCH_QUERY_STATUSES,
  type CreativeResearchSession,
  type DesignBrief,
  type NegativeSignal,
  type PreferenceInsight,
  type ReferenceAttribute,
  type ReferenceItem,
  type ReferenceRegion,
  type ReferenceSelection,
  type SearchKeyword,
  type SearchQuery,
  type WebReferenceItem,
} from './contracts.ts';

function requireText(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
}

function requireIsoDate(value: unknown, field: string): asserts value is string {
  requireText(value, field);
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${field} must be an ISO 8601 string`);
}

function requireHttpUrl(value: unknown, field: string): asserts value is string {
  requireText(value, field);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute URL`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${field} must use http or https`);
}

function assertEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): asserts value is T {
  if (!allowed.includes(value as T)) throw new Error(`${field} is invalid`);
}

function assertAttributes(values: unknown, field: string): asserts values is ReferenceAttribute[] {
  if (!Array.isArray(values)) throw new Error(`${field} must be an array`);
  for (const value of values) assertEnum(value, REFERENCE_ATTRIBUTES, field);
  if (new Set(values).size !== values.length) throw new Error(`${field} must not contain duplicates`);
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function assertJsonSerializable(value: unknown, field = 'value'): void {
  const visit = (candidate: unknown, path: string, seen: Set<object>) => {
    if (candidate === undefined || typeof candidate === 'function' || typeof candidate === 'symbol' || typeof candidate === 'bigint') {
      throw new Error(`${path} is not JSON-serializable`);
    }
    if (typeof candidate === 'number' && !Number.isFinite(candidate)) {
      throw new Error(`${path} must be a finite JSON number`);
    }
    if (candidate === null || typeof candidate !== 'object') return;
    if (candidate instanceof Date) throw new Error(`${path} must use an ISO 8601 string, not Date`);
    if (seen.has(candidate)) throw new Error(`${path} contains a circular reference`);
    seen.add(candidate);
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, `${path}[${index}]`, seen));
    } else {
      for (const [key, item] of Object.entries(candidate)) visit(item, `${path}.${key}`, seen);
    }
    seen.delete(candidate);
  };
  visit(value, field, new Set());
}

export function assertCreativeResearchSession(session: CreativeResearchSession): void {
  requireText(session.id, 'session.id');
  requireText(session.projectId, 'session.projectId');
  assertEnum(session.status, CREATIVE_RESEARCH_SESSION_STATUSES, 'session.status');
  if (!Array.isArray(session.sourceDocumentIds)) throw new Error('session.sourceDocumentIds must be an array');
  requireIsoDate(session.createdAt, 'session.createdAt');
  requireIsoDate(session.updatedAt, 'session.updatedAt');
  if (session.completedAt !== undefined) requireIsoDate(session.completedAt, 'session.completedAt');
  if (session.status === 'COMPLETED' && !session.completedAt) throw new Error('completed session requires completedAt');
  if (session.status !== 'COMPLETED' && session.completedAt) throw new Error('incomplete session cannot have completedAt');
  assertJsonSerializable(session, 'session');
}

export function assertSearchKeyword(keyword: SearchKeyword): void {
  requireText(keyword.id, 'keyword.id');
  requireText(keyword.briefId, 'keyword.briefId');
  requireText(keyword.value, 'keyword.value');
  assertEnum(keyword.kind, SEARCH_KEYWORD_KINDS, 'keyword.kind');
  assertEnum(keyword.source, SEARCH_KEYWORD_SOURCES, 'keyword.source');
  if (typeof keyword.enabled !== 'boolean') throw new Error('keyword.enabled must be boolean');
  requireIsoDate(keyword.createdAt, 'keyword.createdAt');
  assertJsonSerializable(keyword, 'keyword');
}

export function assertDesignBrief(brief: DesignBrief): void {
  requireText(brief.id, 'brief.id');
  requireText(brief.sessionId, 'brief.sessionId');
  if (!Number.isInteger(brief.revision) || brief.revision < 1) throw new Error('brief.revision must be a positive integer');
  requireText(brief.projectSummary, 'brief.projectSummary');
  requireText(brief.designTask, 'brief.designTask');
  requireText(brief.audience, 'brief.audience');
  if (!Array.isArray(brief.evidence)) throw new Error('brief.evidence must be an array');
  for (const evidence of brief.evidence) {
    requireText(evidence.id, 'brief.evidence.id');
    requireText(evidence.sourceDocumentId, 'brief.evidence.sourceDocumentId');
    requireText(evidence.locator?.value, 'brief.evidence.locator.value');
    assertEnum(evidence.locator?.kind, ['DOCUMENT_PAGE', 'DOCUMENT_SECTION', 'DOCUMENT_RANGE'] as const, 'brief.evidence.locator.kind');
    requireIsoDate(evidence.createdAt, 'brief.evidence.createdAt');
  }
  for (const keyword of brief.searchKeywords) {
    assertSearchKeyword(keyword);
    if (keyword.briefId !== brief.id) throw new Error('keyword.briefId must match brief.id');
  }
  const evidenceIds = new Set(brief.evidence.map((item) => item.id));
  if (brief.fieldEvidence !== undefined) {
    if (!brief.fieldEvidence || typeof brief.fieldEvidence !== 'object' || Array.isArray(brief.fieldEvidence)) {
      throw new Error('brief.fieldEvidence must be an object');
    }
    for (const [field, ids] of Object.entries(brief.fieldEvidence)) {
      assertEnum(field, DESIGN_BRIEF_FIELDS, 'brief.fieldEvidence field');
      if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !evidenceIds.has(id))) {
        throw new Error(`brief.fieldEvidence.${field} must reference existing evidence`);
      }
    }
  }
  if (brief.warnings !== undefined && (!Array.isArray(brief.warnings) || brief.warnings.some((item) => typeof item !== 'string'))) {
    throw new Error('brief.warnings must be a string array');
  }
  requireIsoDate(brief.createdAt, 'brief.createdAt');
  requireIsoDate(brief.updatedAt, 'brief.updatedAt');
  assertJsonSerializable(brief, 'brief');
}

export function assertDesignBriefRevision(previous: DesignBrief, next: DesignBrief): void {
  assertDesignBrief(previous);
  assertDesignBrief(next);
  if (previous.sessionId !== next.sessionId) throw new Error('brief revision must preserve session identity');
  if (next.revision !== previous.revision + 1) throw new Error('brief revision must increment by exactly one');
}

export function assertSearchQuery(query: SearchQuery): void {
  requireText(query.id, 'query.id');
  requireText(query.sessionId, 'query.sessionId');
  requireText(query.text, 'query.text');
  assertEnum(query.kind, SEARCH_QUERY_KINDS, 'query.kind');
  assertEnum(query.status, SEARCH_QUERY_STATUSES, 'query.status');
  requireText(query.batch, 'query.batch');
  if (!Array.isArray(query.derivedFromKeywordIds) || !query.derivedFromKeywordIds.length) {
    throw new Error('query.derivedFromKeywordIds requires at least one keyword');
  }
  if (query.status === 'COMPLETED') {
    requireText(query.provider, 'query.provider');
    requireIsoDate(query.completedAt, 'query.completedAt');
  }
  requireIsoDate(query.createdAt, 'query.createdAt');
  assertJsonSerializable(query, 'query');
}

export function assertReferenceItem(reference: ReferenceItem): void {
  requireText(reference.id, 'reference.id');
  requireText(reference.sessionId, 'reference.sessionId');
  requireIsoDate(reference.createdAt, 'reference.createdAt');
  if (!Array.isArray(reference.tags)) throw new Error('reference.tags must be an array');

  if (reference.sourceType === 'WEB_REFERENCE') {
    requireHttpUrl(reference.sourceUrl, 'reference.sourceUrl');
    requireHttpUrl(reference.canonicalUrl, 'reference.canonicalUrl');
    requireText(reference.provider, 'reference.provider');
    requireText(reference.publisherOrDomain, 'reference.publisherOrDomain');
    requireText(reference.queryId, 'reference.queryId');
    if (!Number.isInteger(reference.resultRank) || reference.resultRank < 1) throw new Error('reference.resultRank must be a positive integer');
    requireIsoDate(reference.retrievedAt, 'reference.retrievedAt');
    if (hasOwn(reference, 'generationRunId') || hasOwn(reference, 'assetId')) {
      throw new Error('WEB_REFERENCE cannot use user or AI provenance fields');
    }
  } else if (reference.sourceType === 'USER_REFERENCE') {
    requireText(reference.assetId, 'reference.assetId');
    if (hasOwn(reference, 'sourceUrl') || hasOwn(reference, 'canonicalUrl') || hasOwn(reference, 'generationRunId')) {
      throw new Error('USER_REFERENCE cannot claim Web or AI provenance');
    }
  } else if (reference.sourceType === 'AI_EXPLORATION') {
    requireText(reference.generationRunId, 'reference.generationRunId');
    requireIsoDate(reference.generatedAt, 'reference.generatedAt');
    if (!Array.isArray(reference.inputReferenceIds)) throw new Error('reference.inputReferenceIds must be an array');
    if (hasOwn(reference, 'sourceUrl') || hasOwn(reference, 'canonicalUrl') || hasOwn(reference, 'queryId')) {
      throw new Error('AI_EXPLORATION cannot claim Web provenance');
    }
  } else {
    throw new Error('reference.sourceType is invalid');
  }
  assertJsonSerializable(reference, 'reference');
}

export function assertReferenceSelection(selection: ReferenceSelection): void {
  requireText(selection.referenceId, 'selection.referenceId');
  assertEnum(selection.state, REFERENCE_SELECTION_STATES, 'selection.state');
  if (selection.actor !== 'DESIGNER') throw new Error('selection.actor must be DESIGNER');
  assertAttributes(selection.selectedAttributes, 'selection.selectedAttributes');
  requireIsoDate(selection.createdAt, 'selection.createdAt');
  requireIsoDate(selection.updatedAt, 'selection.updatedAt');
  assertJsonSerializable(selection, 'selection');
}

export function assertReferenceRegion(region: ReferenceRegion): void {
  requireText(region.id, 'region.id');
  requireText(region.referenceId, 'region.referenceId');
  if (region.coordinateSpace !== 'NORMALIZED_0_1') throw new Error('region.coordinateSpace must be NORMALIZED_0_1');
  for (const [field, value] of Object.entries({ x: region.x, y: region.y, width: region.width, height: region.height })) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`region.${field} must be between 0 and 1`);
  }
  if (region.width <= 0 || region.height <= 0 || region.x + region.width > 1 || region.y + region.height > 1) {
    throw new Error('region geometry must fit within normalized bounds');
  }
  if (region.sourceWidth !== undefined && (!Number.isInteger(region.sourceWidth) || region.sourceWidth <= 0)) {
    throw new Error('region.sourceWidth must be a positive integer');
  }
  if (region.sourceHeight !== undefined && (!Number.isInteger(region.sourceHeight) || region.sourceHeight <= 0)) {
    throw new Error('region.sourceHeight must be a positive integer');
  }
  assertAttributes(region.selectedAttributes, 'region.selectedAttributes');
  requireIsoDate(region.createdAt, 'region.createdAt');
  assertJsonSerializable(region, 'region');
}

export function assertNegativeSignal(signal: NegativeSignal): void {
  requireText(signal.id, 'negativeSignal.id');
  requireText(signal.sessionId, 'negativeSignal.sessionId');
  assertEnum(signal.type, NEGATIVE_SIGNAL_TYPES, 'negativeSignal.type');
  assertEnum(signal.scope, NEGATIVE_SIGNAL_SCOPES, 'negativeSignal.scope');
  if (signal.actor !== 'DESIGNER') throw new Error('negativeSignal.actor must be DESIGNER');
  if (signal.type === 'REJECT_REFERENCE') requireText(signal.sourceReferenceId, 'negativeSignal.sourceReferenceId');
  if (signal.type === 'REMOVE_KEYWORD') requireText(signal.sourceKeywordId, 'negativeSignal.sourceKeywordId');
  if (['DESIGNER_NOTE', 'REANALYSIS_FEEDBACK'].includes(signal.type) && !signal.value?.trim() && !signal.reason?.trim()) {
    throw new Error('designer negative signal requires value or reason');
  }
  requireIsoDate(signal.createdAt, 'negativeSignal.createdAt');
  assertJsonSerializable(signal, 'negativeSignal');
}

export function assertPreferenceInsight(insight: PreferenceInsight): void {
  requireText(insight.id, 'insight.id');
  requireText(insight.sessionId, 'insight.sessionId');
  requireText(insight.summary, 'insight.summary');
  assertEnum(insight.category, REFERENCE_ATTRIBUTES, 'insight.category');
  assertEnum(insight.status, ['DRAFT', 'FINALIZED'] as const, 'insight.status');
  if (insight.confidence !== undefined && (!Number.isFinite(insight.confidence) || insight.confidence < 0 || insight.confidence > 1)) {
    throw new Error('insight.confidence must be between 0 and 1');
  }
  const evidenceCount = insight.supportingReferenceIds.length
    + insight.supportingRegionIds.length
    + insight.supportingNegativeSignalIds.length;
  if (insight.status === 'FINALIZED' && evidenceCount === 0) {
    throw new Error('finalized PreferenceInsight requires supporting evidence');
  }
  requireIsoDate(insight.createdAt, 'insight.createdAt');
  assertJsonSerializable(insight, 'insight');
}

export function assertWebReferenceResult(reference: WebReferenceItem, provider?: string): void {
  assertReferenceItem(reference);
  if (reference.sourceType !== 'WEB_REFERENCE') throw new Error('search result must be WEB_REFERENCE');
  if (provider && reference.provider !== provider) throw new Error('search result provider must match result page provider');
}
