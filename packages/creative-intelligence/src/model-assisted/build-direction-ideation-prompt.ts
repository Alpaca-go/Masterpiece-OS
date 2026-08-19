/**
 * CI-W1C.7.1 — Deterministic Direction Ideation prompt builder.
 *
 * Pure function: same input → same prompt. No IO, no model call.
 *
 * The prompt carries the FULL validated StrategicSynthesisArtifact AND
 * the FULL validated ModelAssistedConceptSet (not timestamps),
 * planning constraints, allowed refs, excluded legacy visual
 * authorities, exact Direction schema, and epistemic rules.
 */

import type { StrategicReasoningContext } from '../strategic-synthesis/compile-strategic-context.ts';
import type { StrategicSynthesisArtifact } from '../strategic-synthesis/contracts.ts';
import type { ModelAssistedConceptSet } from './contracts.ts';
import {
  MODEL_ASSISTED_DIRECTION_SCHEMA_VERSION,
  MODEL_ASSISTED_FORBIDDEN_POSITIVE_AUTHORITIES,
} from './contracts.ts';

export const MODEL_ASSISTED_DIRECTION_IDEATION_BUILDER_PROMPT_VERSION = 'ci-w1c.7.1-model-assisted-direction-v0.2' as const;

export interface DirectionIdeationPromptInput {
  projectId: string;
  ctx: StrategicReasoningContext;
  synthesis: StrategicSynthesisArtifact;
  conceptSet: ModelAssistedConceptSet;
  promptVersion?: string;
}

export interface DirectionIdeationPromptOutput {
  promptVersion: string;
  systemMessage: string;
  userMessage: string;
  inputFingerprint: string;
  size: {
    characterCount: number;
    sectionCount: number;
    synthesisInsightCount: number;
    conceptCount: number;
  };
}

const SYSTEM_MESSAGE = [
  'You are a planning-first direction ideator for the Masterpiece OS Creative Intelligence layer.',
  'You produce a ModelAssistedDirectionSet. Directions are CREATIVE_HYPOTHESIS, not FACT.',
  'You will receive a validated StrategicSynthesisArtifact, a validated ModelAssistedConceptSet, and planning constraints.',
  'Each direction must answer 5 required questions: what is organized, by what rule, what changes across touchpoints, what remains invariant, why does this answer the strategic problem.',
  'You MUST NOT use legacy visual evidence as positive creative authority.',
  'Output the strict JSON for ModelAssistedDirectionSet with the exact schemaVersion ' + MODEL_ASSISTED_DIRECTION_SCHEMA_VERSION + '.',
].join('\n');

const EPISTEMIC_RULES = [
  'Direction epistemicClass must be exactly "CREATIVE_HYPOTHESIS".',
  'Every conceptRef / opportunityRef / insightRef / factRef must resolve into the upstream artifacts.',
  'You may not create new FACT.',
  'Locked rules / prohibited directions are constraints, not inspiration.',
  'You MUST NOT use legacy visual evidence (visualAsset.* / old VI / old poster / old packaging / old spatial / style_reference / structure_reference / spatial_reference) as positive creative authority.',
  'Avoid category cliches and template-bank echo.',
  'visualMechanism is not a generic visual cliche ("使用简洁现代的视觉语言" etc.).',
  'visualMechanism must answer at least 3 of 5 required questions (organize / rule / change / invariant / why).',
  'visualLanguage fields must be actionable and project-specific (≥ 80 chars across the 5 main fields).',
].join('\n');

const VISUAL_LANGUAGE_REQUIREMENTS = [
  'visualMechanism must answer these 5 questions:',
  '  1. what is organized?',
  '  2. by what rule?',
  '  3. what changes across touchpoints?',
  '  4. what remains invariant?',
  '  5. why does this answer the strategic problem?',
  'Generic visual phrases are insufficient: "使用简洁现代的视觉语言" / "通过统一的设计系统建立识别度" / "采用高级感配色" / "使用模块化布局".',
].join('\n');

export function buildDirectionIdeationPrompt(input: DirectionIdeationPromptInput): DirectionIdeationPromptOutput {
  const { ctx, synthesis, conceptSet } = input;
  const synthesisJson = JSON.stringify(synthesis, null, 2);
  const conceptSetJson = JSON.stringify(conceptSet, null, 2);
  const lockedBlock = ctx.lockedIdentity.length === 0
    ? '  (no LOCKED facts)'
    : ctx.lockedIdentity.map((f) => `  - id=${f.id} key=${typeof f.key === 'string' ? f.key : '?'} value=${typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '')}`).join('\n');
  const prohibitedBlock = ctx.prohibitedDirections.length === 0
    ? '  (no prohibited.* / style.prohibited facts)'
    : ctx.prohibitedDirections.map((f) => `  - id=${f.id} key=${typeof f.key === 'string' ? f.key : '?'} value=${typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '')}`).join('\n');
  const allowedRefs = [
    ...ctx.sourceIds.facts,
    ...conceptSet.candidates.flatMap((c) => c.id ? [c.id] : []),
    ...synthesis.opportunities.flatMap((o) => o.id ? [o.id] : []),
    ...synthesis.insights.flatMap((i) => i.id ? [i.id] : []),
  ];
  const allowedRefsBlock = `  [${allowedRefs.join(', ')}]`;
  const excludedBlock = [
    ...ctx.legacyVisualEvidenceExcluded,
    ...MODEL_ASSISTED_FORBIDDEN_POSITIVE_AUTHORITIES.filter((t) => !ctx.legacyVisualEvidenceExcluded.includes(t)),
  ].join(', ');

  const userMessage = [
    '# VALIDATED STRATEGIC SYNTHESIS',
    'The full validated StrategicSynthesisArtifact is below. Use it as the grounding source for your direction candidates.',
    synthesisJson,
    '',
    '# VALIDATED CONCEPT SET',
    'The full validated ModelAssistedConceptSet is below. Each Direction must reference at least one conceptRef.',
    conceptSetJson,
    '',
    '# AUTHORITATIVE CONSTRAINTS',
    '## LOCKED RULES',
    lockedBlock,
    '',
    '## PROHIBITED DIRECTIONS',
    prohibitedBlock,
    '',
    '# ALLOWED SOURCE IDS',
    'You may cite these IDs in conceptRefs / opportunityRefs / insightRefs / factRefs.',
    allowedRefsBlock,
    '',
    '# EXCLUDED LEGACY VISUAL AUTHORITIES',
    'These are NOT positive creative authority. Do not use them to propose future visual direction.',
    excludedBlock,
    '',
    '# VISUAL LANGUAGE REQUIREMENTS (MD-11)',
    VISUAL_LANGUAGE_REQUIREMENTS,
    '',
    '# TASK',
    'Produce 3-4 ModelAssistedCreativeDirection entries. Each must contain:',
    '  - id, title, directionFamily',
    '  - creativeThesis, visualMechanism, systemHypothesis',
    '  - visualLanguage: compositionLogic, colorRelationship, typographyBehavior, graphicBehavior, imageBehavior, materialRelationship?, motionBehavior?',
    '  - crossMediaBehavior: brandVI?, editorial?, campaignPoster?, packaging?, space?, digitalUI?',
    '  - whyThisProject, differenceFromOtherDirections',
    '  - epistemicClass="CREATIVE_HYPOTHESIS"',
    '  - conceptRefs[], opportunityRefs[], insightRefs[], factRefs[]',
    '  - strengths[], risks[], mustNotBecome[]',
    '',
    '# OUTPUT JSON SCHEMA',
    `schemaVersion must be exactly "${MODEL_ASSISTED_DIRECTION_SCHEMA_VERSION}".`,
    'projectId must equal the projectId above.',
    'All epistemicClass fields must be exactly "CREATIVE_HYPOTHESIS".',
    '',
    '# EPISTEMIC RULES',
    EPISTEMIC_RULES,
  ].join('\n');

  const characterCount = userMessage.length;
  const sectionCount = (userMessage.match(/^# /gm) ?? []).length;
  const inputFingerprint = computeFingerprint({
    projectId: input.projectId,
    synthesisInsightCount: synthesis.insights.length,
    conceptCount: conceptSet.candidates.length,
    allowedRefCount: allowedRefs.length,
  });

  return {
    promptVersion: input.promptVersion ?? MODEL_ASSISTED_DIRECTION_IDEATION_BUILDER_PROMPT_VERSION,
    systemMessage: SYSTEM_MESSAGE,
    userMessage,
    inputFingerprint,
    size: {
      characterCount,
      sectionCount,
      synthesisInsightCount: synthesis.insights.length,
      conceptCount: conceptSet.candidates.length,
    },
  };
}

function computeFingerprint(parts: Record<string, unknown>): string {
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(parts).sort()) sorted[k] = parts[k];
  return Buffer.from(JSON.stringify(sorted)).toString('hex').slice(0, 32);
}
