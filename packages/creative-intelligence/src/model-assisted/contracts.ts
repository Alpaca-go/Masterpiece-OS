/**
 * CI-W1C.7 — Model-Assisted Concept + Direction contracts (CI-5B / CI-6B).
 *
 * The Model-Assisted stages consume the validated
 * `StrategicSynthesisArtifact` (CI-4B output) and produce shadow
 * artifacts that are persisted alongside the existing deterministic
 * CI-5 / CI-6 outputs.
 *
 * Shadow mode: these artifacts NEVER replace the existing
 * deterministic outputs. They live in:
 *   <runRoot>/intermediate/concept-set.model-assisted.json
 *   <runRoot>/intermediate/direction-set.model-assisted.json
 *
 * Epistemic taxonomy:
 *   - Each ModelAssistedConceptCandidate.epistemicClass is
 *     exactly 'CREATIVE_HYPOTHESIS' (parsed strictly).
 *   - Each ModelAssistedCreativeDirection.epistemicClass is
 *     exactly 'CREATIVE_HYPOTHESIS'.
 *
 * Authority rules (frozen in CI-W1C.7):
 *   - visualAsset.* / old_VI / old_poster / old_packaging /
 *     old_spatial / style_reference / structure_reference /
 *     spatial_reference MUST NOT appear in any field as positive
 *     creative source.
 *   - Every claim must resolve to opportunityRefs / insightRefs /
 *     factRefs / needRefs provided by the upstream
 *     StrategicSynthesisArtifact.
 */

export const MODEL_ASSISTED_CONCEPT_SCHEMA_VERSION = '0.1' as const;
export const MODEL_ASSISTED_DIRECTION_SCHEMA_VERSION = '0.1' as const;
export const MODEL_ASSISTED_CONCEPT_PROMPT_VERSION = 'ci-w1c.7-model-assisted-concept-v0.1' as const;
export const MODEL_ASSISTED_DIRECTION_PROMPT_VERSION = 'ci-w1c.7-model-assisted-direction-v0.1' as const;

export type CreativeEpistemicClass = 'CREATIVE_HYPOTHESIS';

export interface ModelAssistedConceptCandidate {
  id: string;
  title: string;
  coreProposition: string;
  strategicMechanism: string;
  centralMetaphor?: string;
  whyThisProject: string;
  whyNotCategoryCliche: string;
  translationHypothesis: {
    organizationLogic: string;
    expressionLogic: string;
    possibleVisualBehaviors: string[];
  };
  epistemicClass: CreativeEpistemicClass;
  opportunityRefs: string[];
  insightRefs: string[];
  factRefs: string[];
  needRefs: string[];
  strengths: string[];
  risks: string[];
}

export interface ModelAssistedConceptSet {
  schemaVersion: typeof MODEL_ASSISTED_CONCEPT_SCHEMA_VERSION;
  projectId: string;
  promptVersion: typeof MODEL_ASSISTED_CONCEPT_PROMPT_VERSION;
  generatedAt: string;
  sourceMap: {
    strategicSynthesisRef: string;
    excludedAuthorities: string[];
  };
  candidates: ModelAssistedConceptCandidate[];
  diagnostics: string[];
  meta: {
    attempt: 1 | 2;
    provider: string | null;
    model: string | null;
    modelCallCount: 1 | 2;
    repairReason?: string;
  };
}

export type ModelAssistedDirectionFamily =
  | 'structural-system'
  | 'relational-network'
  | 'narrative-sequence'
  | 'editorial-system'
  | 'typographic-system'
  | 'material-system'
  | 'image-led'
  | 'spatial-system'
  | 'model-assisted';

export interface ModelAssistedDirectionVisualLanguage {
  compositionLogic: string;
  colorRelationship: string;
  typographyBehavior: string;
  graphicBehavior: string;
  imageBehavior: string;
  materialRelationship?: string;
  motionBehavior?: string;
}

export interface ModelAssistedDirectionCrossMediaBehavior {
  brandVI?: string;
  editorial?: string;
  campaignPoster?: string;
  packaging?: string;
  space?: string;
  digitalUI?: string;
}

export interface ModelAssistedCreativeDirection {
  id: string;
  title: string;
  directionFamily: ModelAssistedDirectionFamily;
  creativeThesis: string;
  visualMechanism: string;
  systemHypothesis: string;
  visualLanguage: ModelAssistedDirectionVisualLanguage;
  crossMediaBehavior: ModelAssistedDirectionCrossMediaBehavior;
  whyThisProject: string;
  differenceFromOtherDirections: string;
  epistemicClass: CreativeEpistemicClass;
  conceptRefs: string[];
  opportunityRefs: string[];
  insightRefs: string[];
  factRefs: string[];
  strengths: string[];
  risks: string[];
  mustNotBecome: string[];
}

export interface ModelAssistedDirectionSet {
  schemaVersion: typeof MODEL_ASSISTED_DIRECTION_SCHEMA_VERSION;
  projectId: string;
  promptVersion: typeof MODEL_ASSISTED_DIRECTION_PROMPT_VERSION;
  generatedAt: string;
  sourceMap: {
    strategicSynthesisRef: string;
    conceptSetRef: string;
    excludedAuthorities: string[];
  };
  directions: ModelAssistedCreativeDirection[];
  diagnostics: string[];
  meta: {
    attempt: 1 | 2;
    provider: string | null;
    model: string | null;
    modelCallCount: 1 | 2;
    repairReason?: string;
  };
}

/**
 * Min / max quotas for Model-Assisted Concept / Direction (spec §8 / §9):
 *   - Concept: 3-5
 *   - Direction: 3-4
 */
export const MODEL_ASSISTED_QUOTAS = {
  concept: { min: 3, max: 5 },
  direction: { min: 3, max: 4 },
} as const;

/**
 * Forbidden positive-creative-authority tokens (mirror of
 * strategic-synthesis/contracts.ts). Re-exported here so the
 * gates are self-contained.
 */
export const MODEL_ASSISTED_FORBIDDEN_POSITIVE_AUTHORITIES = [
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
 * Generic-only / category-cliche phrases that the Model-Assisted
 * Concept / Direction gates check against. Project-agnostic.
 */
export const MODEL_ASSISTED_GENERIC_VISUAL_PHRASES = [
  '使用简洁现代的视觉语言',
  '通过统一的设计系统建立识别度',
  '采用高级感配色',
  '使用模块化布局',
  '简洁现代',
  '统一设计系统',
  '高级感',
  '模块化',
] as const;
