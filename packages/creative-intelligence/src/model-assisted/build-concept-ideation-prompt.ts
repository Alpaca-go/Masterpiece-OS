/**
 * CI-W1C.7.1 — Deterministic Concept Ideation prompt builder.
 *
 * Pure function: same input → same prompt. No IO, no model call.
 *
 * The prompt carries the FULL validated StrategicSynthesisArtifact
 * (not a timestamp), planning constraints, allowed refs, excluded
 * legacy visual authorities, output schema, and epistemic rules.
 */

import type { StrategicReasoningContext } from '../strategic-synthesis/compile-strategic-context.ts';
import type { StrategicSynthesisArtifact } from '../strategic-synthesis/contracts.ts';
import { conceptInputFingerprint } from '../strategic-synthesis/semantic-fingerprint.ts';
import { MODEL_ASSISTED_CONCEPT_SCHEMA_VERSION, MODEL_ASSISTED_FORBIDDEN_POSITIVE_AUTHORITIES } from './contracts.ts';

export const MODEL_ASSISTED_CONCEPT_IDEATION_BUILDER_PROMPT_VERSION = 'ci-w1c.7.1-model-assisted-concept-v0.2' as const;

export interface ConceptIdeationPromptInput {
  projectId: string;
  ctx: StrategicReasoningContext;
  synthesis: StrategicSynthesisArtifact;
  promptVersion?: string;
}

export interface ConceptIdeationPromptOutput {
  promptVersion: string;
  systemMessage: string;
  userMessage: string;
  inputFingerprint: string;
  size: {
    characterCount: number;
    sectionCount: number;
    synthesisInsightCount: number;
    synthesisOpportunityCount: number;
  };
}

const SYSTEM_MESSAGE = [
  'You are a planning-first concept ideator for the Masterpiece OS Creative Intelligence layer.',
  'You produce a ModelAssistedConceptSet. Concepts are CREATIVE_HYPOTHESIS, not FACT.',
  'You will receive a validated StrategicSynthesisArtifact and planning constraints.',
  'You MUST NOT use legacy visual evidence as positive creative authority.',
  'Output the strict JSON for ModelAssistedConceptSet with the exact schemaVersion ' + MODEL_ASSISTED_CONCEPT_SCHEMA_VERSION + '.',
].join('\n');

const EPISTEMIC_RULES = [
  'Concept epistemicClass must be exactly "CREATIVE_HYPOTHESIS".',
  'Every opportunityRef / insightRef / factRef / needRef must resolve into the StrategicSynthesisArtifact provided above.',
  'You may not create new FACT.',
  'Locked rules / prohibited directions are constraints, not inspiration.',
  'You MUST NOT use legacy visual evidence (visualAsset.* / old VI / old poster / old packaging / old spatial / style_reference / structure_reference / spatial_reference) as positive creative authority.',
  'Avoid category cliches and template-bank echo.',
  'Each concept must answer a grounded strategic insight / opportunity.',
].join('\n');

export function buildConceptIdeationPrompt(input: ConceptIdeationPromptInput): ConceptIdeationPromptOutput {
  const { ctx, synthesis } = input;
  // We pass the full synthesis as JSON, not a ref.
  const synthesisJson = JSON.stringify(synthesis, null, 2);
  // Locked constraints
  const lockedBlock = ctx.lockedIdentity.length === 0
    ? '  (no LOCKED facts)'
    : ctx.lockedIdentity.map((f) => `  - id=${f.id} key=${typeof f.key === 'string' ? f.key : '?'} value=${typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '')}`).join('\n');
  // Prohibited directions
  const prohibitedBlock = ctx.prohibitedDirections.length === 0
    ? '  (no prohibited.* / style.prohibited facts)'
    : ctx.prohibitedDirections.map((f) => `  - id=${f.id} key=${typeof f.key === 'string' ? f.key : '?'} value=${typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '')}`).join('\n');
  // Allowed source IDs
  const allowedRefs = [
    ...ctx.sourceIds.facts,
    ...synthesis.opportunities.flatMap((o) => o.id ? [o.id] : []),
    ...synthesis.insights.flatMap((i) => i.id ? [i.id] : []),
    ...synthesis.tensions.flatMap((t) => t.id ? [t.id] : []),
  ];
  const allowedRefsBlock = `  [${allowedRefs.join(', ')}]`;
  // Excluded legacy visual authorities
  const excludedBlock = [
    ...ctx.legacyVisualEvidenceExcluded,
    ...MODEL_ASSISTED_FORBIDDEN_POSITIVE_AUTHORITIES.filter((t) => !ctx.legacyVisualEvidenceExcluded.includes(t)),
  ].join(', ');

  const userMessage = [
    '# VALIDATED STRATEGIC SYNTHESIS',
    'The full validated StrategicSynthesisArtifact is below. Use it as the grounding source for your concept candidates.',
    synthesisJson,
    '',
    '# AUTHORITATIVE CONSTRAINTS',
    '## LOCKED RULES',
    'Hard constraints. You MUST NOT propose concepts that contradict these.',
    lockedBlock,
    '',
    '## PROHIBITED DIRECTIONS',
    'Forbidden as positive creative authority.',
    prohibitedBlock,
    '',
    '# ALLOWED SOURCE IDS',
    'You may cite these IDs in opportunityRefs / insightRefs / factRefs / needRefs. Do not invent IDs.',
    allowedRefsBlock,
    '',
    '# EXCLUDED LEGACY VISUAL AUTHORITIES',
    'These are NOT positive creative authority. Do not use them to propose future visual direction.',
    excludedBlock,
    '',
    '# TASK',
    'Produce a ModelAssistedConceptSet containing:',
    '  0. sourceMap (strategicSynthesisRef: string, excludedAuthorities: string[])',
    '  1. candidates (3-5 ModelAssistedConceptCandidate entries; each must contain:',
    '     - id, title, coreProposition, strategicMechanism, whyThisProject, whyNotCategoryCliche',
    '     - centralMetaphor? (optional)',
    '     - translationHypothesis.organizationLogic, .expressionLogic, .possibleVisualBehaviors[]',
    '     - epistemicClass="CREATIVE_HYPOTHESIS"',
    '     - opportunityRefs[], insightRefs[], factRefs[], needRefs[]',
    '     - strengths[], risks[])',
    '  2. diagnostics (string[]; optional, can be empty)',
    '',
    'sourceMap.strategicSynthesisRef MUST be the artifact ID of the Strategic Synthesis above.',
    'sourceMap.excludedAuthorities MUST list every authority excluded from positive creative source (typically: visualAsset.*, old_visual_style, old_VI, old_poster, old_packaging, old_spatial, style_reference, structure_reference, spatial_reference).',
    '',
    '# OUTPUT JSON SCHEMA',
    `schemaVersion must be exactly "${MODEL_ASSISTED_CONCEPT_SCHEMA_VERSION}".`,
    'projectId must equal the projectId above.',
    'All epistemicClass fields must be exactly "CREATIVE_HYPOTHESIS".',
    '',
    '# EPISTEMIC RULES',
    EPISTEMIC_RULES,
  ].join('\n');

  const characterCount = userMessage.length;
  const sectionCount = (userMessage.match(/^# /gm) ?? []).length;
  // CI-W1C.7.1A: canonical SHA-256 of the full Concept semantic input
  // (includes upstream synthesis + planning constraints). Replaces
  // the previous count-only 32-char hex.
  const inputFingerprint = conceptInputFingerprint({
    projectId: input.projectId,
    promptVersion: input.promptVersion ?? MODEL_ASSISTED_CONCEPT_IDEATION_BUILDER_PROMPT_VERSION,
    authoritativeFacts: ctx.authoritativeFacts,
    userRequirements: ctx.userRequirements,
    lockedIdentity: ctx.lockedIdentity,
    prohibitedDirections: ctx.prohibitedDirections,
    needs: ctx.needs,
    evidence: ctx.evidence,
    legacyVisualEvidenceExcluded: ctx.legacyVisualEvidenceExcluded,
    synthesis,
  });

  return {
    promptVersion: input.promptVersion ?? MODEL_ASSISTED_CONCEPT_IDEATION_BUILDER_PROMPT_VERSION,
    systemMessage: SYSTEM_MESSAGE,
    userMessage,
    inputFingerprint,
    size: {
      characterCount,
      sectionCount,
      synthesisInsightCount: synthesis.insights.length,
      synthesisOpportunityCount: synthesis.opportunities.length,
    },
  };
}
