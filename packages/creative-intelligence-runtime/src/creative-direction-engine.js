import { CreativeIntelligenceValidationError } from './contracts.js';
import { stableFingerprint } from './evidence-ledger.js';

export const DIRECTION_MODES = Object.freeze([
  'greenfield', 'existing_system_upgrade', 'reference_translation', 'brief_execution'
]);

export const SOURCE_MECHANISM_TYPES = Object.freeze([
  'product_form', 'core_function', 'ingredient_or_material', 'user_action',
  'use_outcome', 'brand_name', 'origin_or_culture', 'brand_story',
  'competitive_opposition', 'packaging_structure', 'service_process', 'data_or_technology'
]);

const REQUIRED_TEXT_FIELDS = Object.freeze([
  'name', 'strategicProposition', 'coreMetaphor', 'languageNail', 'visualHammer',
  'visualGenerationMechanism', 'compositionLogic', 'colorLogic', 'typographyLogic',
  'imageMaterialLogic', 'perceptionOutcome', 'crossTouchpointLogic'
]);

function text(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function strings(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))];
}

export function parseCreativeDirectionResponseV2(raw) {
  if (raw && typeof raw === 'object') return raw;
  const stripped = text(raw).replace(/```(?:json)?/giu, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new CreativeIntelligenceValidationError('DIRECTION_RESPONSE_PARSE_FAILED', 'Direction response does not contain a JSON object');
  }
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch (error) {
    throw new CreativeIntelligenceValidationError('DIRECTION_RESPONSE_PARSE_FAILED', `Direction response JSON is invalid: ${error.message}`);
  }
}

function knownEvidence(input) {
  return new Set([
    ...(input.categoryOpportunityMap?.evidenceRefs || []),
    ...Object.values(input.projectTruthModel || {})
      .filter(Array.isArray)
      .flatMap((claims) => claims.flatMap((claim) => claim?.evidenceRefs || []))
  ]);
}

function knownTouchpoints(input) {
  return new Set((input.categoryOpportunityMap?.primaryTouchpoints || []).flatMap((item) => [item.id, item.label]));
}

export function inferDirectionMode({ projectTruthModel, requestedMode } = {}) {
  if (requestedMode) {
    if (!DIRECTION_MODES.includes(requestedMode)) throw new Error(`Unsupported direction mode: ${requestedMode}`);
    return requestedMode;
  }
  return (projectTruthModel?.observedVisualAssets?.length || projectTruthModel?.currentVisualPatterns?.length)
    ? 'existing_system_upgrade'
    : 'greenfield';
}

export function buildCreativeDirectionGenerationRequest({ projectTruthModel, categoryOpportunityMap, requestedMode }) {
  if (!projectTruthModel?.projectId || projectTruthModel.projectId !== categoryOpportunityMap?.projectId) {
    throw new CreativeIntelligenceValidationError('DIRECTION_INPUT_MISMATCH', 'Truth Model and Opportunity Map must belong to the same project');
  }
  if (!categoryOpportunityMap.evidenceRefs?.length) {
    throw new CreativeIntelligenceValidationError('DIRECTION_EVIDENCE_REQUIRED', 'Direction generation requires evidence-backed opportunities');
  }
  const directionMode = inferDirectionMode({ projectTruthModel, requestedMode });
  const responseContract = {
    directionMode,
    directions: ['D01', 'D02', 'D03'].map((id) => ({
      id, name: 'string', strategicProposition: 'string', coreMetaphor: 'string',
      sourceMechanisms: [{ type: 'one of allowed source mechanism types', mechanism: 'string', evidenceRefs: ['EV-...'] }],
      languageNail: 'string', visualHammer: 'string', visualGenerationMechanism: 'string',
      compositionLogic: 'string', colorLogic: 'string', typographyLogic: 'string', imageMaterialLogic: 'string',
      perceptionOutcome: 'string', crossTouchpointLogic: 'string', touchpointPotential: ['registered touchpoint id or label'],
      advantages: ['string'], risks: ['string'], evidenceRefs: ['EV-...']
    })),
    conceptScores: ['D01', 'D02', 'D03'].map((directionId) => ({
      directionId,
      strategyFit: 'number 0-10', differentiation: 'number 0-10', memoryPotential: 'number 0-10',
      categoryTrust: 'number 0-10', extensionPotential: 'number 0-10', evidenceRefs: ['EV-...']
    }))
  };
  return {
    schemaVersion: '1.0',
    projectId: projectTruthModel.projectId,
    directionMode,
    systemPrompt: [
      'You are the Creative Direction hypothesis layer of Masterpiece OS.',
      'Return strict JSON only. Generate exactly three candidates and do not recommend or select one.',
      'The candidates must differ in underlying strategy, metaphor, visual generation mechanism, composition, material/image logic, perception outcome, and touchpoint extension.',
      'Changing only color, typography, background, decoration, material, rendering style, or packaging of one visual hammer is prohibited.',
      'Use only supplied evidence references and registered business touchpoints.',
      'Language Nail and Visual Hammer are hypotheses pending user and Anchor validation; never describe them as confirmed Canon.',
      'Score all three hypotheses for concept pre-evaluation; this score is non-binding and cannot replace user or Anchor validation.',
      `Across the set, use at least five source types from: ${SOURCE_MECHANISM_TYPES.join(', ')}.`
    ].join('\n'),
    userPrompt: JSON.stringify({ projectTruthModel, categoryOpportunityMap, responseContract }, null, 2),
    responseContract,
    inputFingerprint: stableFingerprint({ projectTruthModel, categoryOpportunityMap, directionMode })
  };
}

function normalizeMechanisms(value, evidenceSet) {
  const mechanisms = Array.isArray(value) ? value.map((item) => ({
    type: text(item?.type),
    mechanism: text(item?.mechanism),
    evidenceRefs: strings(item?.evidenceRefs)
  })) : [];
  if (mechanisms.length < 2) throw new CreativeIntelligenceValidationError('DIRECTION_SOURCE_MECHANISMS_INSUFFICIENT', 'Each direction requires at least two source mechanisms');
  for (const mechanism of mechanisms) {
    if (!SOURCE_MECHANISM_TYPES.includes(mechanism.type) || !mechanism.mechanism || !mechanism.evidenceRefs.length) {
      throw new CreativeIntelligenceValidationError('DIRECTION_SOURCE_MECHANISM_INVALID', 'Every source mechanism requires a supported type, mechanism, and evidence');
    }
    if (mechanism.evidenceRefs.some((ref) => !evidenceSet.has(ref))) {
      throw new CreativeIntelligenceValidationError('DIRECTION_EVIDENCE_UNKNOWN', 'Direction source mechanism cites unknown evidence');
    }
  }
  return mechanisms;
}

export function normalizeCreativeDirectionSet(raw, input) {
  const parsed = parseCreativeDirectionResponseV2(raw);
  const directionMode = inferDirectionMode({ projectTruthModel: input.projectTruthModel, requestedMode: parsed.directionMode || input.requestedMode });
  if (!Array.isArray(parsed.directions) || parsed.directions.length !== 3) {
    throw new CreativeIntelligenceValidationError('DIRECTION_COUNT_INVALID', 'Guided Direction Mode requires exactly three directions');
  }
  const evidenceSet = knownEvidence(input);
  const touchpointSet = knownTouchpoints(input);
  const directions = parsed.directions.map((candidate, index) => {
    const normalized = { id: `D0${index + 1}` };
    for (const field of REQUIRED_TEXT_FIELDS) normalized[field] = text(candidate?.[field]);
    const missing = REQUIRED_TEXT_FIELDS.filter((field) => !normalized[field]);
    if (missing.length) {
      throw new CreativeIntelligenceValidationError('DIRECTION_FIELD_MISSING', `Direction D0${index + 1} is missing: ${missing.join(', ')}`, missing);
    }
    normalized.sourceMechanisms = normalizeMechanisms(candidate.sourceMechanisms, evidenceSet);
    normalized.touchpointPotential = strings(candidate.touchpointPotential);
    if (normalized.touchpointPotential.some((item) => !touchpointSet.has(item))) {
      throw new CreativeIntelligenceValidationError('DIRECTION_TOUCHPOINT_UNKNOWN', `Direction D0${index + 1} cites an unregistered business touchpoint`);
    }
    normalized.advantages = strings(candidate.advantages);
    normalized.risks = strings(candidate.risks);
    normalized.evidenceRefs = strings(candidate.evidenceRefs);
    if (!normalized.advantages.length || !normalized.risks.length || !normalized.evidenceRefs.length) {
      throw new CreativeIntelligenceValidationError('DIRECTION_JUSTIFICATION_MISSING', `Direction D0${index + 1} requires advantages, risks, and evidence`);
    }
    if (normalized.evidenceRefs.some((ref) => !evidenceSet.has(ref))) {
      throw new CreativeIntelligenceValidationError('DIRECTION_EVIDENCE_UNKNOWN', `Direction D0${index + 1} cites unknown evidence`);
    }
    return normalized;
  });
  const names = new Set(directions.map((direction) => direction.name.toLocaleLowerCase('en-US')));
  if (names.size !== 3) throw new CreativeIntelligenceValidationError('DIRECTION_NAME_DUPLICATED', 'Direction names must be distinct');
  const sourceTypes = new Set(directions.flatMap((direction) => direction.sourceMechanisms.map((item) => item.type)));
  if (sourceTypes.size < 5) {
    throw new CreativeIntelligenceValidationError('DIRECTION_SOURCE_SCAN_INSUFFICIENT', 'The direction set must use at least five creative source mechanism types');
  }
  return {
    schemaVersion: '1.0', projectId: input.projectTruthModel.projectId, directionMode,
    hypothesisStatus: 'awaiting_user_decision', inputFingerprint: input.inputFingerprint || null,
    directions
  };
}
