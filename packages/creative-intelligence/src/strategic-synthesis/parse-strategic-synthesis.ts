/**
 * CI-W1C.7 — Strategic Synthesis JSON parser.
 *
 * Parses the model JSON output into a `StrategicSynthesisArtifact`.
 * Performs **lightweight structural validation** (schema-version
 * check, required top-level fields, epistemic class enum check).
 * All semantic validation lives in `validate-strategic-synthesis.ts`.
 *
 * The parser is **strict**: if the model returns invalid JSON, missing
 * required fields, or wrong epistemic class, it throws a parse error
 * that the runtime uses to trigger the single repair call (spec §6.1.3
 * / §13).
 */

import {
  STRATEGIC_SYNTHESIS_SCHEMA_VERSION,
  STRATEGIC_SYNTHESIS_PROMPT_VERSION,
  type StrategicSynthesisArtifact,
  type StrategicTension,
  type StrategicInsight,
  type StrategicOpportunity,
  type StrategicProjectUnderstanding,
  type StrategicEpistemicClass,
  type CreativeReasoningPromptSourceMap,
} from './contracts.ts';
import { stripMarkdownFences } from '../contracts/strip-markdown-fences.ts';

export class StrategicSynthesisParseError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'StrategicSynthesisParseError';
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

function isEpistemicModelInference(v: unknown): v is StrategicEpistemicClass {
  return v === 'MODEL_INFERENCE';
}

function parseId(prefix: string, raw: unknown, fallback: string): string {
  if (isString(raw) && raw.length > 0) return raw;
  return `${prefix}-${fallback}`;
}

function parseProjectUnderstanding(raw: unknown, fallbackIndex: number): StrategicProjectUnderstanding {
  if (!isObject(raw)) {
    throw new StrategicSynthesisParseError(
      'PARSE_PROJECT_UNDERSTANDING',
      'projectUnderstanding must be an object',
    );
  }
  if (!isEpistemicModelInference(raw.epistemicClass)) {
    throw new StrategicSynthesisParseError(
      'PARSE_EPISTEMIC_CLASS',
      'projectUnderstanding.epistemicClass must be exactly "MODEL_INFERENCE"',
    );
  }
  if (!isString(raw.summary) || !isString(raw.coreChallenge) || !isString(raw.transformationGoal)) {
    throw new StrategicSynthesisParseError(
      'PARSE_PROJECT_UNDERSTANDING_FIELDS',
      'projectUnderstanding must have summary/coreChallenge/transformationGoal strings',
    );
  }
  // CI-W1C.7.4-R2 PART D — planningClaimRefs MUST be a string[].
  if (!isStringArray(raw.planningClaimRefs)) {
    throw new StrategicSynthesisParseError(
      'PARSE_PLANNING_CLAIM_REFS',
      'projectUnderstanding.planningClaimRefs must be a string array (use [] when no planning input)',
    );
  }
  const result: StrategicProjectUnderstanding = {
    summary: raw.summary,
    coreChallenge: raw.coreChallenge,
    transformationGoal: raw.transformationGoal,
    epistemicClass: 'MODEL_INFERENCE',
    factRefs: isStringArray(raw.factRefs) ? raw.factRefs : [],
    needRefs: isStringArray(raw.needRefs) ? raw.needRefs : [],
    evidenceRefs: isStringArray(raw.evidenceRefs) ? raw.evidenceRefs : [],
    planningClaimRefs: raw.planningClaimRefs,
  };
  if (isString(raw.brandRoleInterpretation)) {
    result.brandRoleInterpretation = raw.brandRoleInterpretation;
  }
  if (isString(raw.audienceTension)) {
    result.audienceTension = raw.audienceTension;
  }
  void fallbackIndex;
  return result;
}

function parseTension(raw: unknown, index: number): StrategicTension {
  if (!isObject(raw)) {
    throw new StrategicSynthesisParseError(
      'PARSE_TENSION',
      `tensions[${index}] must be an object`,
    );
  }
  if (!isEpistemicModelInference(raw.epistemicClass)) {
    throw new StrategicSynthesisParseError(
      'PARSE_TENSION_EPISTEMIC',
      `tensions[${index}].epistemicClass must be "MODEL_INFERENCE"`,
    );
  }
  if (!isString(raw.statement) || !isString(raw.poleA) || !isString(raw.poleB) || !isString(raw.whyItMatters)) {
    throw new StrategicSynthesisParseError(
      'PARSE_TENSION_FIELDS',
      `tensions[${index}] must have statement/poleA/poleB/whyItMatters strings`,
    );
  }
  // CI-W1C.7.4-R2 PART D — planningClaimRefs MUST be a string[].
  if (!isStringArray(raw.planningClaimRefs)) {
    throw new StrategicSynthesisParseError(
      'PARSE_PLANNING_CLAIM_REFS',
      `tensions[${index}].planningClaimRefs must be a string array (use [] when no planning input)`,
    );
  }
  return {
    id: parseId('tension', raw.id, `i${index}`),
    statement: raw.statement,
    poleA: raw.poleA,
    poleB: raw.poleB,
    whyItMatters: raw.whyItMatters,
    epistemicClass: 'MODEL_INFERENCE',
    factRefs: isStringArray(raw.factRefs) ? raw.factRefs : [],
    needRefs: isStringArray(raw.needRefs) ? raw.needRefs : [],
    evidenceRefs: isStringArray(raw.evidenceRefs) ? raw.evidenceRefs : [],
    planningClaimRefs: raw.planningClaimRefs,
  };
}

function parseInsight(raw: unknown, index: number): StrategicInsight {
  if (!isObject(raw)) {
    throw new StrategicSynthesisParseError(
      'PARSE_INSIGHT',
      `insights[${index}] must be an object`,
    );
  }
  if (!isEpistemicModelInference(raw.epistemicClass)) {
    throw new StrategicSynthesisParseError(
      'PARSE_INSIGHT_EPISTEMIC',
      `insights[${index}].epistemicClass must be "MODEL_INFERENCE"`,
    );
  }
  if (!isString(raw.statement) || !isString(raw.implication) || !isString(raw.whyThisProject)) {
    throw new StrategicSynthesisParseError(
      'PARSE_INSIGHT_FIELDS',
      `insights[${index}] must have statement/implication/whyThisProject strings`,
    );
  }
  // CI-W1C.7.4-R2 PART D — planningClaimRefs MUST be a string[].
  if (!isStringArray(raw.planningClaimRefs)) {
    throw new StrategicSynthesisParseError(
      'PARSE_PLANNING_CLAIM_REFS',
      `insights[${index}].planningClaimRefs must be a string array (use [] when no planning input)`,
    );
  }
  return {
    id: parseId('insight', raw.id, `i${index}`),
    statement: raw.statement,
    implication: raw.implication,
    whyThisProject: raw.whyThisProject,
    epistemicClass: 'MODEL_INFERENCE',
    factRefs: isStringArray(raw.factRefs) ? raw.factRefs : [],
    needRefs: isStringArray(raw.needRefs) ? raw.needRefs : [],
    evidenceRefs: isStringArray(raw.evidenceRefs) ? raw.evidenceRefs : [],
    planningClaimRefs: raw.planningClaimRefs,
  };
}

function parseOpportunity(raw: unknown, index: number): StrategicOpportunity {
  if (!isObject(raw)) {
    throw new StrategicSynthesisParseError(
      'PARSE_OPPORTUNITY',
      `opportunities[${index}] must be an object`,
    );
  }
  if (!isString(raw.title) || !isString(raw.thesis) || !isString(raw.strategicMechanism) || !isString(raw.whyThisProject)) {
    throw new StrategicSynthesisParseError(
      'PARSE_OPPORTUNITY_FIELDS',
      `opportunities[${index}] must have title/thesis/strategicMechanism/whyThisProject strings`,
    );
  }
  // CI-W1C.7.4-R2 PART D — planningClaimRefs MUST be a string[].
  if (!isStringArray(raw.planningClaimRefs)) {
    throw new StrategicSynthesisParseError(
      'PARSE_PLANNING_CLAIM_REFS',
      `opportunities[${index}].planningClaimRefs must be a string array (use [] when no planning input)`,
    );
  }
  return {
    id: parseId('opp', raw.id, `i${index}`),
    title: raw.title,
    thesis: raw.thesis,
    strategicMechanism: raw.strategicMechanism,
    whyThisProject: raw.whyThisProject,
    risk: isStringArray(raw.risk) ? raw.risk : [],
    insightRefs: isStringArray(raw.insightRefs) ? raw.insightRefs : [],
    factRefs: isStringArray(raw.factRefs) ? raw.factRefs : [],
    planningClaimRefs: raw.planningClaimRefs,
  };
}

function parseSourceMap(raw: unknown): CreativeReasoningPromptSourceMap {
  const empty: CreativeReasoningPromptSourceMap = {
    planningTruth: [],
    userRequirements: [],
    lockedIdentity: [],
    prohibitedDirections: [],
    needs: [],
    evidence: [],
    planningClaims: [],
    legacyVisualEvidenceExcluded: [],
  };
  if (!isObject(raw)) return empty;
  // CI-W1C.7.4-R2 PART D — sourceMap.planningClaims MUST be a
  // string array. Allow [] (no planning input) but reject scalars /
  // objects.
  if (raw.planningClaims !== undefined && !isStringArray(raw.planningClaims)) {
    throw new StrategicSynthesisParseError(
      'PARSE_SOURCE_MAP_PLANNING_CLAIMS',
      'sourceMap.planningClaims must be a string array (use [] when no planning input)',
    );
  }
  return {
    planningTruth: isStringArray(raw.planningTruth) ? raw.planningTruth : [],
    userRequirements: isStringArray(raw.userRequirements) ? raw.userRequirements : [],
    lockedIdentity: isStringArray(raw.lockedIdentity) ? raw.lockedIdentity : [],
    prohibitedDirections: isStringArray(raw.prohibitedDirections) ? raw.prohibitedDirections : [],
    needs: isStringArray(raw.needs) ? raw.needs : [],
    evidence: isStringArray(raw.evidence) ? raw.evidence : [],
    planningClaims: isStringArray(raw.planningClaims) ? raw.planningClaims : [],
    legacyVisualEvidenceExcluded: isStringArray(raw.legacyVisualEvidenceExcluded)
      ? raw.legacyVisualEvidenceExcluded
      : [],
  };
}

export function parseStrategicSynthesis(input: {
  rawText: string;
  projectId: string;
  attempt: 1 | 2;
  provider: string | null;
  model: string | null;
  modelCallCount: 1 | 2;
  repairReason?: string;
}): StrategicSynthesisArtifact {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFences(input.rawText));
  } catch (err) {
    throw new StrategicSynthesisParseError(
      'PARSE_JSON',
      `Strategic Synthesis response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!isObject(parsed)) {
    throw new StrategicSynthesisParseError('PARSE_ROOT', 'Strategic Synthesis root must be an object');
  }
  if (parsed.schemaVersion !== STRATEGIC_SYNTHESIS_SCHEMA_VERSION) {
    throw new StrategicSynthesisParseError(
      'PARSE_SCHEMA_VERSION',
      `schemaVersion must be exactly "${STRATEGIC_SYNTHESIS_SCHEMA_VERSION}"`,
    );
  }
  if (!isString(parsed.projectId) || parsed.projectId !== input.projectId) {
    throw new StrategicSynthesisParseError(
      'PARSE_PROJECT_ID',
      'projectId mismatch',
    );
  }
  if (!Array.isArray(parsed.tensions)) {
    throw new StrategicSynthesisParseError('PARSE_TENSIONS', 'tensions must be an array');
  }
  if (!Array.isArray(parsed.insights)) {
    throw new StrategicSynthesisParseError('PARSE_INSIGHTS', 'insights must be an array');
  }
  if (!Array.isArray(parsed.opportunities)) {
    throw new StrategicSynthesisParseError('PARSE_OPPORTUNITIES', 'opportunities must be an array');
  }
  return {
    schemaVersion: STRATEGIC_SYNTHESIS_SCHEMA_VERSION,
    projectId: input.projectId,
    promptVersion: STRATEGIC_SYNTHESIS_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    sourceMap: parseSourceMap(parsed.sourceMap),
    projectUnderstanding: parseProjectUnderstanding(parsed.projectUnderstanding, 0),
    tensions: parsed.tensions.map((t: unknown, i: number) => parseTension(t, i)),
    insights: parsed.insights.map((i: unknown, idx: number) => parseInsight(i, idx)),
    opportunities: parsed.opportunities.map((o: unknown, i: number) => parseOpportunity(o, i)),
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
