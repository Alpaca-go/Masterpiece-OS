/**
 * CI-W1C.7 — Model-Assisted Strategic Synthesis contracts.
 *
 * `StrategicSynthesisArtifact` is the CI-4B output. It is a strictly
 * validated structured object produced by the model + grounding gate
 * pipeline. It is the **single** input that the CI-5B / CI-6B
 * Model-Assisted stages may consume.
 *
 * The artifact is **not** persisted into Project Truth. It is a
 * creative-reasoning workspace artifact. It is consumed by:
 *   - The shadow Model-Assisted Concept pipeline (CI-5B)
 *   - The shadow Model-Assisted Direction pipeline (CI-6B)
 *   - The Visual Direction Exploration Report compiler
 *
 * Epistemic taxonomy (frozen in CI-W1C.7):
 *   - FACT / USER_REQUIREMENT: from Project Truth only.
 *   - MODEL_INFERENCE: strategic interpretation. **Cannot** become FACT.
 *   - CREATIVE_HYPOTHESIS: novel creative proposal. Must answer a
 *     grounded strategic insight / opportunity.
 *   - UNKNOWN: explicitly not derivable from current inputs.
 *
 * Authority rules (frozen in CI-W1C.7):
 *   - StrategicSynthesisArtifact is **shadow**: it is **not** written
 *     to Project Truth. It is **not** consumed by the existing
 *     deterministic CI-4 / CI-5 / CI-6 pipeline. It is **not** an
 *     image source authority.
 *   - `visualAsset.*` / old visual style / old VI / old poster / old
 *     packaging / old spatial / `style_reference` / `structure_reference`
 *     / `spatial_reference` MUST NOT appear as positive creative
 *     authority in any field. The grounding gate blocks them.
 */

export const STRATEGIC_SYNTHESIS_SCHEMA_VERSION = '0.1' as const;
export const STRATEGIC_SYNTHESIS_PROMPT_VERSION = 'ci-w1c.7-strategic-synthesis-v0.1' as const;

export type StrategicEpistemicClass = 'MODEL_INFERENCE';
export type CreativeEpistemicClass = 'CREATIVE_HYPOTHESIS';

export interface StrategicTension {
  id: string;
  statement: string;
  poleA: string;
  poleB: string;
  whyItMatters: string;
  epistemicClass: StrategicEpistemicClass;
  factRefs: string[];
  needRefs: string[];
  evidenceRefs: string[];
  /**
   * CI-W1C.7.4-R2 PART B — planning strategic evidence claim IDs
   * used as a positive authority for this tension. Each ref MUST
   * resolve to an actual PlanningStrategicEvidence claimId in
   * the runtime input. NEVER put planning claim IDs in factRefs
   * / needRefs / evidenceRefs.
   */
  planningClaimRefs: string[];
}

export interface StrategicInsight {
  id: string;
  statement: string;
  implication: string;
  whyThisProject: string;
  epistemicClass: StrategicEpistemicClass;
  factRefs: string[];
  needRefs: string[];
  evidenceRefs: string[];
  /**
   * CI-W1C.7.4-R2 PART B — see StrategicTension.planningClaimRefs.
   */
  planningClaimRefs: string[];
}

export interface StrategicOpportunity {
  id: string;
  title: string;
  thesis: string;
  strategicMechanism: string;
  whyThisProject: string;
  risk: string[];
  insightRefs: string[];
  factRefs: string[];
  /**
   * CI-W1C.7.4-R2 PART B — see StrategicTension.planningClaimRefs.
   */
  planningClaimRefs: string[];
}

export interface StrategicProjectUnderstanding {
  summary: string;
  coreChallenge: string;
  transformationGoal: string;
  brandRoleInterpretation?: string;
  audienceTension?: string;
  epistemicClass: StrategicEpistemicClass;
  factRefs: string[];
  needRefs: string[];
  evidenceRefs: string[];
  /**
   * CI-W1C.7.4-R2 PART B — see StrategicTension.planningClaimRefs.
   */
  planningClaimRefs: string[];
}

export interface StrategicSynthesisArtifact {
  schemaVersion: typeof STRATEGIC_SYNTHESIS_SCHEMA_VERSION;
  projectId: string;
  promptVersion: typeof STRATEGIC_SYNTHESIS_PROMPT_VERSION;
  generatedAt: string;
  sourceMap: CreativeReasoningPromptSourceMap;
  projectUnderstanding: StrategicProjectUnderstanding;
  tensions: StrategicTension[];
  insights: StrategicInsight[];
  opportunities: StrategicOpportunity[];
  diagnostics: string[];
  /**
   * Internal bookkeeping for the runtime:
   * - `attempt` 1 = primary call, 2 = single repair (spec §6.1.3).
   * - `provider` / `model` set when produced from a real model; null
   *   when produced from a mock / fixture.
   * - `modelCallCount` is the running count (1 or 2). Spec §13 hard
   *   caps it at 2 per stage.
   */
  meta: {
    attempt: 1 | 2;
    provider: string | null;
    model: string | null;
    modelCallCount: 1 | 2;
    repairReason?: string;
  };
}

export interface CreativeReasoningPromptSourceMap {
  planningTruth: string[];
  userRequirements: string[];
  lockedIdentity: string[];
  prohibitedDirections: string[];
  needs: string[];
  evidence: string[];
  /**
   * CI-W1C.7.4-R2 PART B — input-derived list of PlanningStrategicEvidence
   * claim IDs the model is allowed to cite via planningClaimRefs.
   *
   * This list MUST be derived from the runtime input. The model MUST
   * NOT self-authorize IDs that are not in this list. The grounding gate
   * (SG-01) verifies every model-emitted *.planningClaimRefs resolves
   * to an ID in this list AND in the actual runtime input.
   */
  planningClaims: string[];
  /**
   * Always present and non-empty: the names of the source authorities
   * that were **excluded** from positive creative authority.
   */
  legacyVisualEvidenceExcluded: string[];
}

export const STRATEGIC_SYNTHESIS_LEGACY_VISUAL_EXCLUDED_MIN: readonly string[] = [
  'visualAsset.*',
  'old_visual_style',
  'old_VI',
  'old_poster',
  'old_packaging',
  'old_spatial',
  'style_reference',
  'structure_reference',
  'spatial_reference',
] as const;

/**
 * Minimum structural quotas (spec §6.2):
 *   1 project understanding (mandatory)
 *   2-5 strategic tensions
 *   3-6 grounded insights
 *   3-5 opportunity territories
 */
export const STRATEGIC_SYNTHESIS_MIN_QUOTAS = {
  tensions: { min: 2, max: 5 },
  insights: { min: 3, max: 6 },
  opportunities: { min: 3, max: 5 },
} as const;

/**
 * The set of Strategic Grounding Gate codes (spec §7).
 * These are deterministic validators; they have no model dependency.
 */
export const STRATEGIC_GROUNDING_GATE_CODES = [
  'SG-01',
  'SG-02',
  'SG-03',
  'SG-04',
  'SG-05',
  'SG-06',
  'SG-07',
  'SG-08',
  'SG-09',
  'SG-10',
  'SG-11',
  'SG-12',
  // CI-W1C.7.5-R1 PART J — runtime/sourceMap consistency gates.
  // The model-emitted sourceMap is an audit copy; the runtime
  // carriers are authority. These gates enforce that the model's
  // sourceMap mirrors the runtime input per domain.
  'SG-13',
  'SG-14',
  'SG-15',
] as const;
export type StrategicGroundingGateCode = typeof STRATEGIC_GROUNDING_GATE_CODES[number];

export type StrategicGroundingSeverity = 'block' | 'warn';

export interface StrategicGroundingIssue {
  code: StrategicGroundingGateCode;
  severity: StrategicGroundingSeverity;
  where: string;
  detail: string;
  refs?: string[];
}

export interface StrategicGroundingReport {
  passed: boolean;
  issues: StrategicGroundingIssue[];
  blockedCodes: StrategicGroundingGateCode[];
  warningCodes: StrategicGroundingGateCode[];
}

/**
 * Forbidden positive-creative-authority tokens (spec §4.2).
 * These are the *names* of the authorities that MUST NOT appear in
 * the model output as positive creative source. They are checked by
 * the grounding gate in field text, NOT as hardcoded project tokens.
 * The CI-W1C.7 contamination scanner is what applies these rules.
 */
export const FORBIDDEN_POSITIVE_CREATIVE_AUTHORITIES = [
  'visualAsset.*',
  'old_visual_style',
  'old_VI',
  'old_poster',
  'old_packaging',
  'old_spatial',
  'style_reference',
  'structure_reference',
  'spatial_reference',
  'current_project_identity',
] as const;

/**
 * Generic-only / category-cliche phrases that the grounding gate
 * (SG-09 NO_GENERIC_ONLY_INSIGHT_SET) and the Direction gate
 * (MD-11 VISUAL_MECHANISM_TOO_GENERIC) check against. They are
 * tested in field text. The list is **not** project-specific.
 */
export const GENERIC_VISUAL_PHRASES = [
  '使用简洁现代的视觉语言',
  '通过统一的设计系统建立识别度',
  '采用高级感配色',
  '使用模块化布局',
  '简洁现代',
  '统一设计系统',
  '高级感',
  '模块化',
] as const;
