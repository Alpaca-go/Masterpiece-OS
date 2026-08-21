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
  // CI-W1C.7.5-R1 PART H — every required source-map field is a
  // string[]. Silent fallback to [] is FORBIDDEN: the model must
  // obey the contract, and the existing single-repair attempt must
  // see the parse failure. The empty `[]` returned when the key is
  // missing entirely (undefined) is still allowed (per the
  // individual fields' "allow [] when no input" semantic).
  //
  // Code convention: repo underscore style (matches the existing
  // `PARSE_SOURCE_MAP_PLANNING_CLAIMS` R2 code). The R1 spec
  // example uses hyphens, but the spec also says "Use repository
  // naming conventions if different" — repo convention wins for
  // consistency with the rest of the parse error codes.
  //
  // `planningClaims` keeps the legacy R2 error code
  // (`PARSE_SOURCE_MAP_PLANNING_CLAIMS`) for back-compat with
  // PTR-05; the other fields get a new R1 code.
  const requireStringArrayOrThrow = (field: string, value: unknown): string[] => {
    if (value === undefined) return empty[field as keyof CreativeReasoningPromptSourceMap] as string[];
    if (!isStringArray(value)) {
      const code = `PARSE_SOURCE_MAP_${field.toUpperCase()}_NOT_STRING_ARRAY`;
      throw new StrategicSynthesisParseError(
        code,
        `sourceMap.${field} must be a string array (use [] when no input)`,
      );
    }
    return value;
  };
  return {
    planningTruth: requireStringArrayOrThrow('planningTruth', raw.planningTruth),
    userRequirements: requireStringArrayOrThrow('userRequirements', raw.userRequirements),
    lockedIdentity: requireStringArrayOrThrow('lockedIdentity', raw.lockedIdentity),
    prohibitedDirections: requireStringArrayOrThrow('prohibitedDirections', raw.prohibitedDirections),
    needs: requireStringArrayOrThrow('needs', raw.needs),
    evidence: requireStringArrayOrThrow('evidence', raw.evidence),
    // Legacy back-compat: keep the R2 error code for this field.
    planningClaims: (() => {
      const v = raw.planningClaims;
      if (v === undefined) return [];
      if (!isStringArray(v)) {
        throw new StrategicSynthesisParseError(
          'PARSE_SOURCE_MAP_PLANNING_CLAIMS',
          'sourceMap.planningClaims must be a string array (use [] when no planning input)',
        );
      }
      return v;
    })(),
    legacyVisualEvidenceExcluded: requireStringArrayOrThrow(
      'legacyVisualEvidenceExcluded',
      raw.legacyVisualEvidenceExcluded,
    ),
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
