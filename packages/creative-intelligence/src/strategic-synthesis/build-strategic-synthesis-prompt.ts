/**
 * CI-W1C.7.1 — Deterministic Strategic Synthesis prompt builder.
 *
 * Pure function: same input → same prompt. No IO, no model call,
 * no credentials, no provider SDK.
 *
 * The prompt carries full Planning-First semantic authority:
 *   - authoritative project facts (with VALUES, not counts)
 *   - user requirements
 *   - locked rules
 *   - prohibited directions
 *   - need skeleton (with statements)
 *   - evidence summaries
 *   - source trace IDs
 *   - excluded legacy visual authorities
 *   - task definition
 *   - output JSON schema
 *   - epistemic rules
 *
 * Legacy visual evidence is NEVER a positive creative authority;
 * the prompt explicitly lists the excluded authorities and the
 * epistemic rules forbid any inference from them.
 */

import type { StrategicReasoningContext } from './compile-strategic-context.ts';
import { STRATEGIC_SYNTHESIS_LEGACY_VISUAL_EXCLUDED_MIN, STRATEGIC_SYNTHESIS_SCHEMA_VERSION } from './contracts.ts';
import { strategicInputFingerprint } from './semantic-fingerprint.ts';

// CI-W1C.7.1 prompt version. The `STRATEGIC_SYNTHESIS_PROMPT_VERSION`
// re-exported from `contracts.ts` is the legacy CI-W1C.7 version
// (used as the schema-side prompt version). This is the CI-W1C.7.1
// prompt builder's version.
export const STRATEGIC_SYNTHESIS_BUILDER_PROMPT_VERSION = 'ci-w1c.7.1-strategic-synthesis-v0.2' as const;

// CI-W1C.7.4 prompt version: same wire-shape, but planning-strategic
// evidence is now a positive carrier. The PLANNING STRATEGIC EVIDENCE
// section is appended before EXCLUDED LEGACY VISUAL AUTHORITIES, with
// epistemic-class preserved per claim.
export const STRATEGIC_SYNTHESIS_BUILDER_PROMPT_VERSION_7_4 = 'ci-w1c.7.4-strategic-synthesis-v0.3' as const;

export interface StrategicSynthesisPromptInput {
  projectId: string;
  ctx: StrategicReasoningContext;
  /**
   * Optional override for the prompt version (defaults to
   * `STRATEGIC_SYNTHESIS_BUILDER_PROMPT_VERSION`).
   */
  promptVersion?: string;
}

export interface StrategicSynthesisPromptOutput {
  promptVersion: string;
  systemMessage: string;
  userMessage: string;
  inputFingerprint: string;
  size: {
    characterCount: number;
    sectionCount: number;
    factCount: number;
    needCount: number;
    evidenceCount: number;
    planningClaimCount: number;
  };
}

const SYSTEM_MESSAGE = [
  'You are a planning-first strategic synthesizer for the Masterpiece OS Creative Intelligence layer.',
  'You produce a StrategicSynthesisArtifact. You may NOT create new FACT.',
  'Strategic interpretation = MODEL_INFERENCE; creative proposal = CREATIVE_HYPOTHESIS.',
  'Every project-specific claim must resolve to a provided source ID.',
  'You will receive authoritative project facts, locked rules, prohibited directions, a need skeleton, evidence summaries, and (CI-W1C.7.4) planning strategic evidence from a registered planning brief.',
  'You MUST NOT use legacy visual evidence (visualAsset.* / old VI / old poster / old packaging / old spatial / style_reference / structure_reference / spatial_reference) as positive creative authority.',
  'Planning strategic evidence is a positive authority: cite claims by id and treat them as the strongest signal of project-specific planning intent. Preserve the claim epistemic class as written; do not promote USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN to FACT.',
  'Output the strict JSON for StrategicSynthesisArtifact with the exact schemaVersion ' + STRATEGIC_SYNTHESIS_SCHEMA_VERSION + '.',
].join('\n');

const EPISTEMIC_RULES = [
  'You may not create FACT.',
  'Strategic interpretation = MODEL_INFERENCE.',
  'Every project-specific claim must resolve to allowed refs.',
  'Do not infer new facts from brand-name semantics.',
  'Do not summarize old visual style.',
  'Do not use legacy visual evidence as positive creative authority.',
  'Planning strategic evidence has its own epistemic class (FACT / USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN). Preserve it. Do not promote USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN claims into FACT.',
  'Unknown information remains unknown.',
  'Every Insight must have at least 1 factRef and 1 needRef.',
  'Every Opportunity must have at least 1 insightRef.',
].join('\n');

function safeFact(f: { id: string; key?: string; value?: unknown; authority?: string; sourceRefs?: unknown }): string {
  const v = typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '');
  const k = typeof f.key === 'string' ? f.key : '(no key)';
  const a = typeof f.authority === 'string' ? f.authority : 'UNKNOWN';
  return `  - id=${f.id} key=${k} value=${v} authority=${a}`;
}

function safeNeed(n: { id: string; type?: string; statement?: string; factRefs?: string[]; needRefs?: string[]; coverageRequirement?: string }): string {
  const t = n.type ?? 'unknown';
  const s = n.statement ?? '(no statement)';
  const fr = Array.isArray(n.factRefs) ? n.factRefs.join(',') : '';
  const cov = n.coverageRequirement ?? 'unspecified';
  return `  - id=${n.id} type=${t} coverage=${cov} statement=${s} factRefs=[${fr}]`;
}

function safeEvidence(e: { id: string; sourceKind?: string; summary?: string; factRefs?: string[]; confidence?: number }): string {
  const k = e.sourceKind ?? 'unknown';
  const s = e.summary ?? '(no summary)';
  const fr = Array.isArray(e.factRefs) ? e.factRefs.join(',') : '';
  const c = typeof e.confidence === 'number' ? e.confidence.toFixed(2) : 'unspecified';
  return `  - id=${e.id} sourceKind=${k} confidence=${c} summary=${s} factRefs=[${fr}]`;
}

/**
 * CI-W1C.7.4 — Render a planning strategic claim into a single
 * human-readable line. Preserves sourceDocumentId + chunkRefs +
 * epistemicClass. NEVER renders the raw brief text.
 */
function safePlanningClaim(c: {
  claimId: string;
  key: string;
  value: string;
  epistemicClass: string;
  sourceDocumentId: string;
  chunkRefs?: string[];
  confidence?: number;
}): string {
  const conf = typeof c.confidence === 'number' ? c.confidence.toFixed(2) : 'unspecified';
  const chunks = Array.isArray(c.chunkRefs) ? c.chunkRefs.join(',') : '';
  return `  - id=${c.claimId} key=${c.key} value=${c.value} epistemicClass=${c.epistemicClass} confidence=${conf} sourceDocumentId=${c.sourceDocumentId} chunkRefs=[${chunks}]`;
}

export function buildStrategicSynthesisPrompt(input: StrategicSynthesisPromptInput): StrategicSynthesisPromptOutput {
  const { ctx } = input;
  // 1. Authoritative project facts (with VALUES)
  const factBlock = ctx.authoritativeFacts.length === 0
    ? '  (no authoritative facts)'
    : ctx.authoritativeFacts.map(safeFact).join('\n');
  // 2. User requirements (separate from generic planning facts)
  const userReqBlock = ctx.userRequirements.length === 0
    ? '  (no explicit user.requirement* facts)'
    : ctx.userRequirements.map(safeFact).join('\n');
  // 3. Locked rules
  const lockedBlock = ctx.lockedIdentity.length === 0
    ? '  (no LOCKED facts)'
    : ctx.lockedIdentity.map(safeFact).join('\n');
  // 4. Prohibited directions
  const prohibitedBlock = ctx.prohibitedDirections.length === 0
    ? '  (no prohibited.* / style.prohibited facts)'
    : ctx.prohibitedDirections.map(safeFact).join('\n');
  // 5. Need skeleton
  const needBlock = ctx.needs.length === 0
    ? '  (no needs)'
    : ctx.needs.map(safeNeed).join('\n');
  // 6. Evidence
  const evidenceBlock = ctx.evidence.length === 0
    ? '  (no evidence)'
    : ctx.evidence.map(safeEvidence).join('\n');
  // 6.5 CI-W1C.7.4 — Planning Strategic Evidence (positive carrier).
  // Each claim has sourceDocumentId + chunkRefs + epistemicClass
  // preserved. NO raw brief text is rendered.
  const planningClaims = ctx.planningStrategicEvidence ?? [];
  const planningClaimBlock = planningClaims.length === 0
    ? '  (no planning strategic evidence — no human-authored planning brief registered)'
    : planningClaims.map(safePlanningClaim).join('\n');
  // 7. Source trace IDs
  const sourceIdsBlock = [
    `  facts: [${ctx.sourceIds.facts.join(', ')}]`,
    `  needs: [${ctx.sourceIds.needs.join(', ')}]`,
    `  evidence: [${ctx.sourceIds.evidence.join(', ')}]`,
    `  planningClaims: [${(ctx.sourceIds.planningClaims ?? []).join(', ')}]`,
  ].join('\n');
  // 8. Excluded legacy visual authorities
  const excludedBlock = [
    ...ctx.legacyVisualEvidenceExcluded,
    ...STRATEGIC_SYNTHESIS_LEGACY_VISUAL_EXCLUDED_MIN.filter((t) => !ctx.legacyVisualEvidenceExcluded.includes(t)),
  ].join(', ');

  const userMessage = [
    '# PROJECT',
    `projectId: ${input.projectId}`,
    '',
    '# AUTHORITATIVE PROJECT FACTS',
    'Each fact exposes only id, key, value, authority. These are confirmed planning inputs you MAY use as positive creative authority.',
    factBlock,
    '',
    '# USER REQUIREMENTS',
    'Explicit user-stated requirements (separate from generic planning facts). Treat as USER_REQUIREMENT epistemic class.',
    userReqBlock,
    '',
    '# LOCKED RULES',
    'Hard constraints. You MUST NOT propose visual directions that contradict these.',
    lockedBlock,
    '',
    '# PROHIBITED DIRECTIONS',
    'Forbidden as positive creative authority. Treat as constraints.',
    prohibitedBlock,
    '',
    '# NEED SKELETON',
    'Deterministic Need skeleton. Each need has its own id, type, statement, factRefs, coverageRequirement.',
    needBlock,
    '',
    '# EVIDENCE',
    'Evidence summaries supporting the current-project facts. Each item has its own id and sourceKind.',
    evidenceBlock,
    '',
    '# PLANNING STRATEGIC EVIDENCE',
    'Human-authored planning claims derived from a registered planning brief (creative-brief / brand-strategy / market-research / product-information).',
    'Each claim exposes id / key / value / epistemicClass / sourceDocumentId / chunkRefs / confidence. The epistemic class is preserved from the source — FACT / USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN. Do not auto-promote.',
    'These are positive strategic authority (sibling to AUTHORITATIVE PROJECT FACTS). Use them as the strongest signal of project-specific planning intent. Cite by claim id.',
    planningClaimBlock,
    '',
    '# SOURCE TRACE IDS',
    'Every factRef / needRef / evidenceRef you cite MUST appear in these lists. Do not invent IDs.',
    sourceIdsBlock,
    '',
    '# EXCLUDED LEGACY VISUAL AUTHORITIES',
    'These are NOT positive creative authority. Do not use them to propose future visual direction.',
    excludedBlock,
    '',
    '# TASK',
    'Produce a StrategicSynthesisArtifact containing:',
    '  0. sourceMap (planningTruth[], userRequirements[], lockedIdentity[], prohibitedDirections[], needs[], evidence[], legacyVisualEvidenceExcluded[])',
    '  1. projectUnderstanding (summary, coreChallenge, transformationGoal, brandRoleInterpretation?, audienceTension?, epistemicClass=MODEL_INFERENCE, factRefs, needRefs, evidenceRefs)',
    '  2. tensions (2-5; statement, poleA, poleB, whyItMatters, epistemicClass=MODEL_INFERENCE, factRefs, needRefs, evidenceRefs) — every tension must have a one-sentence `statement` summarizing the tension in addition to poleA/poleB',
    '  3. insights (3-6; statement, implication, whyThisProject, epistemicClass=MODEL_INFERENCE, factRefs, needRefs, evidenceRefs)',
    '  4. opportunities (3-5; title, thesis, strategicMechanism, whyThisProject, risk, insightRefs, factRefs) — every opportunity must have a `title` in addition to thesis; opportunities do NOT need an epistemicClass field (per schema); they are derived from the synthesis.',
    '  5. diagnostics (string[]; optional, can be empty)',
    '',
    'sourceMap.legacyVisualEvidenceExcluded MUST be non-empty and MUST contain every one of these tokens (this is an audit-trail requirement, not a suggestion): visualAsset.*, old_visual_style, old_VI, old_poster, old_packaging, old_spatial, style_reference, structure_reference, spatial_reference. Copy them verbatim into the array.',
    '',
    '# ID ASSIGNMENT (deterministic; you may omit the id field on each item)',
    'When you do not provide an explicit `id` on a tension / insight / opportunity, the runtime parser auto-assigns one in declaration order:',
    '  - tensions[0] -> id "tension-i0"; tensions[1] -> "tension-i1"; ...',
    '  - insights[0] -> id "insight-i0"; insights[1] -> "insight-i1"; ...',
    '  - opportunities[0] -> id "opp-i0"; opportunities[1] -> "opp-i1"; ...',
    'opportunity.insightRefs MUST be a list of insight IDs (either the ones you wrote, or the auto-assigned "insight-i0" / "insight-i1" / ...). Do NOT put insight statement text or full sentences in insightRefs — only IDs.',
    'If you prefer to assign IDs yourself, you may write them as `id: "tension-…"`, `id: "insight-…"`, `id: "opp-…"` on each item, but then you MUST cite those exact IDs in any cross-references (opportunity.insightRefs, etc.).',
    '',
    '# OUTPUT JSON SCHEMA',
    `schemaVersion must be exactly "${STRATEGIC_SYNTHESIS_SCHEMA_VERSION}".`,
    'projectId must equal the projectId above.',
    'All epistemicClass fields must be exactly "MODEL_INFERENCE".',
    'All factRefs / needRefs / evidenceRefs must resolve into the SOURCE TRACE IDS above.',
    '',
    '# REQUIRED SHAPE — every field below MUST appear in the output',
    'Use this exact field set. Do not omit any field; the runtime parser will reject incomplete objects.',
    '',
    'tension = { statement, poleA, poleB, whyItMatters, epistemicClass: "MODEL_INFERENCE", factRefs[], needRefs[], evidenceRefs[] }',
    'insight = { statement, implication, whyThisProject, epistemicClass: "MODEL_INFERENCE", factRefs[], needRefs[], evidenceRefs[] }',
    'opportunity = { title, thesis, strategicMechanism, whyThisProject, risk[], insightRefs[], factRefs[] }',
    '',
    '# EPISTEMIC RULES',
    EPISTEMIC_RULES,
  ].join('\n');

  const characterCount = userMessage.length;
  const sectionCount = (userMessage.match(/^# /gm) ?? []).length;
  // CI-W1C.7.1A: canonical SHA-256 of the full Planning-First semantic
  // input. Replaces the previous count-only 32-char hex.
  // CI-W1C.7.4: also include planningStrategicEvidence in the input
  // fingerprint so that a planning-brief change invalidates the
  // snapshot.
  const inputFingerprint = strategicInputFingerprint({
    projectId: input.projectId,
    promptVersion: input.promptVersion ?? STRATEGIC_SYNTHESIS_BUILDER_PROMPT_VERSION,
    authoritativeFacts: ctx.authoritativeFacts,
    userRequirements: ctx.userRequirements,
    lockedIdentity: ctx.lockedIdentity,
    prohibitedDirections: ctx.prohibitedDirections,
    needs: ctx.needs,
    evidence: ctx.evidence,
    planningStrategicEvidence: ctx.planningStrategicEvidence ?? [],
    legacyVisualEvidenceExcluded: ctx.legacyVisualEvidenceExcluded,
  });

  return {
    promptVersion: input.promptVersion ?? STRATEGIC_SYNTHESIS_BUILDER_PROMPT_VERSION,
    systemMessage: SYSTEM_MESSAGE,
    userMessage,
    inputFingerprint,
    size: {
      characterCount,
      sectionCount,
      factCount: ctx.authoritativeFacts.length,
      needCount: ctx.needs.length,
      evidenceCount: ctx.evidence.length,
      planningClaimCount: (ctx.planningStrategicEvidence ?? []).length,
    },
  };
}
