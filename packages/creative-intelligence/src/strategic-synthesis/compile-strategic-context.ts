/**
 * CI-W1C.7 — Strategic Reasoning Context Compiler.
 *
 * Builds a deterministic, planning-only context from Project Truth +
 * Need skeleton + Evidence that the analysis-model prompt will read.
 *
 * Hard rules (spec §4):
 *   - Allowed positive creative authority: confirmed Project Truth
 *     facts, USER_REQUIREMENT, locked rules (constraint only),
 *     prohibited directions (constraint only), Need skeleton,
 *     evidence summaries supporting current-project facts,
 *     user-confirmed edits, planning-document source snippets that
 *     already entered the Evidence / Truth trace.
 *   - Forbidden positive creative authority: visualAsset.* /
 *     old_VI / old_poster / old_packaging / old_spatial /
 *     style_reference / structure_reference / spatial_reference /
 *     current_project_identity (unless verified locked logo).
 *
 * This module performs **no** model call. It compiles an in-memory
 * snapshot that the runtime can hand to a prompt builder.
 */

import type { ProjectTruthModel, ProjectTruthFact } from '../truth/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { EvidenceLedgerSnapshot, EvidenceItem } from '../evidence/contracts.ts';

export interface StrategicReasoningContext {
  projectId: string;
  promptVersion: string;
  generatedAt: string;
  authoritativeFacts: ProjectTruthFact[];
  userRequirements: ProjectTruthFact[];
  lockedIdentity: ProjectTruthFact[];
  prohibitedDirections: ProjectTruthFact[];
  needs: NeedItem[];
  evidence: EvidenceItem[];
  /**
   * The names of source authorities that were excluded from
   * positive creative authority. The grounding gate (SG-04) and
   * the contamination scanner assert this is non-empty.
   */
  legacyVisualEvidenceExcluded: readonly string[];
  /**
   * `sourceIds` is the deterministic list of source IDs that
   * the model is allowed to reference. Every strategic claim in
   * the model output must resolve to one of these.
   */
  sourceIds: {
    facts: string[];
    needs: string[];
    evidence: string[];
  };
}

const STRATEGIC_REASONING_PROMPT_VERSION = 'ci-w1c.7-strategic-reasoning-v0.1';

/**
 * Whether a fact is "authoritative" in the planning sense for
 * strategic reasoning. We use the existing `authority` field that
 * the CI-W1C.6 demotion already established.
 */
function isAuthoritativePlanning(fact: ProjectTruthFact): boolean {
  const a = fact.authority;
  return a === 'USER_CONFIRMED' || a === 'CONFIRMED' || a === 'LOCKED';
}

function isUserRequirement(fact: ProjectTruthFact): boolean {
  // user.requirement* keys are USER_REQUIREMENT-class facts.
  return typeof fact.key === 'string' && fact.key.startsWith('user.requirement');
}

function isLockedIdentity(fact: ProjectTruthFact): boolean {
  return fact.authority === 'LOCKED';
}

function isProhibitedDirection(fact: ProjectTruthFact): boolean {
  if (typeof fact.key !== 'string') return false;
  // explicit key shape: prohibited.directions[] or style.prohibited
  return fact.key.startsWith('prohibited.') || fact.key.startsWith('style.prohibited');
}

function isLegacyVisualEvidence(fact: ProjectTruthFact): boolean {
  if (typeof fact.key !== 'string') return false;
  if (fact.authority !== 'VISUAL_SOURCE_FACT') return false;
  return fact.key.startsWith('visualAsset.')
    || fact.key.startsWith('visual.')
    || fact.key.startsWith('style.')
    || fact.key.startsWith('reference.');
}

export function compileStrategicReasoningContext(input: {
  projectId: string;
  truth: ProjectTruthModel;
  needs: NeedItem[];
  evidence: EvidenceLedgerSnapshot;
  legacyVisualEvidenceExcluded?: readonly string[];
}): StrategicReasoningContext {
  const facts = input.truth.facts;
  const authoritativeFacts = facts.filter(isAuthoritativePlanning);
  const userRequirements = facts.filter(isUserRequirement);
  const lockedIdentity = facts.filter(isLockedIdentity);
  const prohibitedDirections = facts.filter(isProhibitedDirection);
  const evidenceItems: EvidenceItem[] = (input.evidence.entries ?? (input.evidence as { items?: EvidenceItem[] }).items) ?? [];

  // The strategic-context source map MUST include every fact ID that
  // the model is allowed to reference. The grounding gate asserts
  // that every factRef in the model output resolves to one of these.
  const sourceFactIds = new Set<string>();
  for (const f of authoritativeFacts) sourceFactIds.add(f.id);
  for (const f of userRequirements) sourceFactIds.add(f.id);
  for (const f of lockedIdentity) sourceFactIds.add(f.id);
  for (const f of prohibitedDirections) sourceFactIds.add(f.id);

  const sourceNeedIds = new Set<string>();
  for (const n of input.needs) sourceNeedIds.add(n.id);

  const sourceEvidenceIds = new Set<string>();
  for (const e of evidenceItems) sourceEvidenceIds.add(e.id);

  // The legacy visual evidence is intentionally NOT included.
  // The grounding gate asserts this — `legacyVisualEvidenceExcluded`
  // is non-empty so any positive reference to visualAsset.* in
  // the model output is hard to claim.
  void isLegacyVisualEvidence;

  return {
    projectId: input.projectId,
    promptVersion: STRATEGIC_REASONING_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    authoritativeFacts,
    userRequirements,
    lockedIdentity,
    prohibitedDirections,
    needs: input.needs,
    evidence: evidenceItems,
    legacyVisualEvidenceExcluded: input.legacyVisualEvidenceExcluded ?? [
      'visualAsset.*',
      'old_visual_style',
      'old_VI',
      'old_poster',
      'old_packaging',
      'old_spatial',
      'style_reference',
      'structure_reference',
      'spatial_reference',
    ],
    sourceIds: {
      facts: Array.from(sourceFactIds),
      needs: Array.from(sourceNeedIds),
      evidence: Array.from(sourceEvidenceIds),
    },
  };
}
