/**
 * CI-W1C.7 — Model-Assisted Concept / Direction JSON parser.
 *
 * Strict parser. Throws `ModelAssistedParseError` on:
 *   - invalid JSON
 *   - missing required fields
 *   - wrong schemaVersion
 *   - wrong epistemicClass (anything other than
 *     'CREATIVE_HYPOTHESIS')
 *   - wrong `projectId`
 *
 * The runtime uses these errors to trigger the single repair
 * call (spec §13: at most 1 primary + 1 repair per stage).
 */

import {
  MODEL_ASSISTED_CONCEPT_SCHEMA_VERSION,
  MODEL_ASSISTED_CONCEPT_PROMPT_VERSION,
  MODEL_ASSISTED_DIRECTION_SCHEMA_VERSION,
  MODEL_ASSISTED_DIRECTION_PROMPT_VERSION,
  type ModelAssistedConceptCandidate,
  type ModelAssistedConceptSet,
  type ModelAssistedCreativeDirection,
  type ModelAssistedDirectionSet,
  type ModelAssistedDirectionFamily,
  type ModelAssistedDirectionVisualLanguage,
  type ModelAssistedDirectionCrossMediaBehavior,
} from './contracts.ts';
import { stripMarkdownFences } from '../contracts/strip-markdown-fences.ts';

export class ModelAssistedParseError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ModelAssistedParseError';
    this.code = code;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isString(v: unknown): v is string {
  return typeof v === 'string';
}
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

const ALLOWED_DIRECTION_FAMILIES: ReadonlySet<ModelAssistedDirectionFamily> = new Set<ModelAssistedDirectionFamily>([
  'structural-system',
  'relational-network',
  'narrative-sequence',
  'editorial-system',
  'typographic-system',
  'material-system',
  'image-led',
  'spatial-system',
  'model-assisted',
]);

function parseTranslationHypothesis(raw: unknown, prefix: string): ModelAssistedConceptCandidate['translationHypothesis'] {
  if (!isObject(raw)) {
    throw new ModelAssistedParseError(`${prefix}.translationHypothesis`, 'translationHypothesis must be an object');
  }
  if (!isString(raw.organizationLogic) || !isString(raw.expressionLogic)) {
    throw new ModelAssistedParseError(
      `${prefix}.translationHypothesis`,
      'organizationLogic and expressionLogic must be strings',
    );
  }
  const possibleVisualBehaviors = isStringArray(raw.possibleVisualBehaviors) ? raw.possibleVisualBehaviors : [];
  return {
    organizationLogic: raw.organizationLogic,
    expressionLogic: raw.expressionLogic,
    possibleVisualBehaviors,
  };
}

function parseConceptCandidate(raw: unknown, index: number): ModelAssistedConceptCandidate {
  const prefix = `candidates[${index}]`;
  if (!isObject(raw)) {
    throw new ModelAssistedParseError(prefix, 'must be an object');
  }
  if (raw.epistemicClass !== 'CREATIVE_HYPOTHESIS') {
    throw new ModelAssistedParseError(
      `${prefix}.epistemicClass`,
      'epistemicClass must be exactly "CREATIVE_HYPOTHESIS"',
    );
  }
  if (!isString(raw.title)
    || !isString(raw.coreProposition)
    || !isString(raw.strategicMechanism)
    || !isString(raw.whyThisProject)
    || !isString(raw.whyNotCategoryCliche)) {
    throw new ModelAssistedParseError(
      `${prefix}`,
      'title / coreProposition / strategicMechanism / whyThisProject / whyNotCategoryCliche are required strings',
    );
  }
  return {
    id: isString(raw.id) && raw.id.length > 0 ? raw.id : `concept-ma-${index}`,
    title: raw.title,
    coreProposition: raw.coreProposition,
    strategicMechanism: raw.strategicMechanism,
    ...(isString(raw.centralMetaphor) ? { centralMetaphor: raw.centralMetaphor } : {}),
    whyThisProject: raw.whyThisProject,
    whyNotCategoryCliche: raw.whyNotCategoryCliche,
    translationHypothesis: parseTranslationHypothesis(raw.translationHypothesis, prefix),
    epistemicClass: 'CREATIVE_HYPOTHESIS',
    opportunityRefs: isStringArray(raw.opportunityRefs) ? raw.opportunityRefs : [],
    insightRefs: isStringArray(raw.insightRefs) ? raw.insightRefs : [],
    factRefs: isStringArray(raw.factRefs) ? raw.factRefs : [],
    needRefs: isStringArray(raw.needRefs) ? raw.needRefs : [],
    strengths: isStringArray(raw.strengths) ? raw.strengths : [],
    risks: isStringArray(raw.risks) ? raw.risks : [],
  };
}

export function parseModelAssistedConceptSet(input: {
  rawText: string;
  projectId: string;
  attempt: 1 | 2;
  provider: string | null;
  model: string | null;
  modelCallCount: 1 | 2;
  repairReason?: string;
}): ModelAssistedConceptSet {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFences(input.rawText));
  } catch (err) {
    throw new ModelAssistedParseError('PARSE_JSON', `Concept set is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!isObject(parsed)) {
    throw new ModelAssistedParseError('PARSE_ROOT', 'root must be an object');
  }
  if (parsed.schemaVersion !== MODEL_ASSISTED_CONCEPT_SCHEMA_VERSION) {
    throw new ModelAssistedParseError(
      'PARSE_SCHEMA_VERSION',
      `schemaVersion must be exactly "${MODEL_ASSISTED_CONCEPT_SCHEMA_VERSION}"`,
    );
  }
  if (parsed.projectId !== input.projectId) {
    throw new ModelAssistedParseError('PARSE_PROJECT_ID', 'projectId mismatch');
  }
  if (!isObject(parsed.sourceMap)) {
    throw new ModelAssistedParseError('PARSE_SOURCE_MAP', 'sourceMap must be an object');
  }
  if (!Array.isArray(parsed.candidates)) {
    throw new ModelAssistedParseError('PARSE_CANDIDATES', 'candidates must be an array');
  }
  return {
    schemaVersion: MODEL_ASSISTED_CONCEPT_SCHEMA_VERSION,
    projectId: input.projectId,
    promptVersion: MODEL_ASSISTED_CONCEPT_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    sourceMap: {
      strategicSynthesisRef: isString(parsed.sourceMap.strategicSynthesisRef)
        ? parsed.sourceMap.strategicSynthesisRef
        : '',
      excludedAuthorities: isStringArray(parsed.sourceMap.excludedAuthorities)
        ? parsed.sourceMap.excludedAuthorities
        : [],
    },
    candidates: parsed.candidates.map((c, i) => parseConceptCandidate(c, i)),
    diagnostics: isStringArray(parsed.diagnostics) ? parsed.diagnostics : [],
    meta: {
      attempt: input.attempt,
      provider: input.provider,
      model: input.model,
      modelCallCount: input.modelCallCount,
      ...(input.repairReason ? { repairReason: input.repairReason } : {}),
    },
  };
}

function parseVisualLanguage(raw: unknown, prefix: string): ModelAssistedDirectionVisualLanguage {
  if (!isObject(raw)) {
    throw new ModelAssistedParseError(prefix, 'visualLanguage must be an object');
  }
  if (!isString(raw.compositionLogic)
    || !isString(raw.colorRelationship)
    || !isString(raw.typographyBehavior)
    || !isString(raw.graphicBehavior)
    || !isString(raw.imageBehavior)) {
    throw new ModelAssistedParseError(
      prefix,
      'compositionLogic / colorRelationship / typographyBehavior / graphicBehavior / imageBehavior are required strings',
    );
  }
  const result: ModelAssistedDirectionVisualLanguage = {
    compositionLogic: raw.compositionLogic,
    colorRelationship: raw.colorRelationship,
    typographyBehavior: raw.typographyBehavior,
    graphicBehavior: raw.graphicBehavior,
    imageBehavior: raw.imageBehavior,
  };
  if (isString(raw.materialRelationship)) result.materialRelationship = raw.materialRelationship;
  if (isString(raw.motionBehavior)) result.motionBehavior = raw.motionBehavior;
  return result;
}

function parseCrossMediaBehavior(raw: unknown, prefix: string): ModelAssistedDirectionCrossMediaBehavior {
  if (!isObject(raw)) {
    throw new ModelAssistedParseError(prefix, 'crossMediaBehavior must be an object');
  }
  const result: ModelAssistedDirectionCrossMediaBehavior = {};
  for (const k of ['brandVI', 'editorial', 'campaignPoster', 'packaging', 'space', 'digitalUI'] as const) {
    const v = raw[k];
    if (isString(v)) result[k] = v;
  }
  return result;
}

function parseDirection(raw: unknown, index: number): ModelAssistedCreativeDirection {
  const prefix = `directions[${index}]`;
  if (!isObject(raw)) {
    throw new ModelAssistedParseError(prefix, 'must be an object');
  }
  if (raw.epistemicClass !== 'CREATIVE_HYPOTHESIS') {
    throw new ModelAssistedParseError(
      `${prefix}.epistemicClass`,
      'epistemicClass must be exactly "CREATIVE_HYPOTHESIS"',
    );
  }
  if (!isString(raw.directionFamily)
    || !ALLOWED_DIRECTION_FAMILIES.has(raw.directionFamily as ModelAssistedDirectionFamily)) {
    throw new ModelAssistedParseError(
      `${prefix}.directionFamily`,
      `directionFamily must be one of: ${Array.from(ALLOWED_DIRECTION_FAMILIES).join(', ')}`,
    );
  }
  if (!isString(raw.title)
    || !isString(raw.creativeThesis)
    || !isString(raw.visualMechanism)
    || !isString(raw.systemHypothesis)
    || !isString(raw.whyThisProject)
    || !isString(raw.differenceFromOtherDirections)) {
    throw new ModelAssistedParseError(
      prefix,
      'title / creativeThesis / visualMechanism / systemHypothesis / whyThisProject / differenceFromOtherDirections are required strings',
    );
  }
  return {
    id: isString(raw.id) && raw.id.length > 0 ? raw.id : `direction-ma-${index}`,
    title: raw.title,
    directionFamily: raw.directionFamily as ModelAssistedDirectionFamily,
    creativeThesis: raw.creativeThesis,
    visualMechanism: raw.visualMechanism,
    systemHypothesis: raw.systemHypothesis,
    visualLanguage: parseVisualLanguage(raw.visualLanguage, prefix),
    crossMediaBehavior: parseCrossMediaBehavior(raw.crossMediaBehavior, prefix),
    whyThisProject: raw.whyThisProject,
    differenceFromOtherDirections: raw.differenceFromOtherDirections,
    epistemicClass: 'CREATIVE_HYPOTHESIS',
    conceptRefs: isStringArray(raw.conceptRefs) ? raw.conceptRefs : [],
    opportunityRefs: isStringArray(raw.opportunityRefs) ? raw.opportunityRefs : [],
    insightRefs: isStringArray(raw.insightRefs) ? raw.insightRefs : [],
    factRefs: isStringArray(raw.factRefs) ? raw.factRefs : [],
    strengths: isStringArray(raw.strengths) ? raw.strengths : [],
    risks: isStringArray(raw.risks) ? raw.risks : [],
    mustNotBecome: isStringArray(raw.mustNotBecome) ? raw.mustNotBecome : [],
  };
}

export function parseModelAssistedDirectionSet(input: {
  rawText: string;
  projectId: string;
  attempt: 1 | 2;
  provider: string | null;
  model: string | null;
  modelCallCount: 1 | 2;
  repairReason?: string;
}): ModelAssistedDirectionSet {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFences(input.rawText));
  } catch (err) {
    throw new ModelAssistedParseError('PARSE_JSON', `Direction set is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!isObject(parsed)) {
    throw new ModelAssistedParseError('PARSE_ROOT', 'root must be an object');
  }
  if (parsed.schemaVersion !== MODEL_ASSISTED_DIRECTION_SCHEMA_VERSION) {
    throw new ModelAssistedParseError(
      'PARSE_SCHEMA_VERSION',
      `schemaVersion must be exactly "${MODEL_ASSISTED_DIRECTION_SCHEMA_VERSION}"`,
    );
  }
  if (parsed.projectId !== input.projectId) {
    throw new ModelAssistedParseError('PARSE_PROJECT_ID', 'projectId mismatch');
  }
  if (!isObject(parsed.sourceMap)) {
    throw new ModelAssistedParseError('PARSE_SOURCE_MAP', 'sourceMap must be an object');
  }
  if (!Array.isArray(parsed.directions)) {
    throw new ModelAssistedParseError('PARSE_DIRECTIONS', 'directions must be an array');
  }
  return {
    schemaVersion: MODEL_ASSISTED_DIRECTION_SCHEMA_VERSION,
    projectId: input.projectId,
    promptVersion: MODEL_ASSISTED_DIRECTION_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    sourceMap: {
      strategicSynthesisRef: isString(parsed.sourceMap.strategicSynthesisRef)
        ? parsed.sourceMap.strategicSynthesisRef
        : '',
      conceptSetRef: isString(parsed.sourceMap.conceptSetRef) ? parsed.sourceMap.conceptSetRef : '',
      excludedAuthorities: isStringArray(parsed.sourceMap.excludedAuthorities)
        ? parsed.sourceMap.excludedAuthorities
        : [],
    },
    directions: parsed.directions.map((d, i) => parseDirection(d, i)),
    diagnostics: isStringArray(parsed.diagnostics) ? parsed.diagnostics : [],
    meta: {
      attempt: input.attempt,
      provider: input.provider,
      model: input.model,
      modelCallCount: input.modelCallCount,
      ...(input.repairReason ? { repairReason: input.repairReason } : {}),
    },
  };
}
