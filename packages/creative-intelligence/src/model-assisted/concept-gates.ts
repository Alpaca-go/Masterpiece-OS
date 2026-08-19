/**
 * CI-W1C.7 — Model-Assisted Concept Gates (spec §8).
 *
 * Deterministic gate set:
 *   MC-01 MODEL_CONCEPT_REFS_VALID
 *   MC-02 PROJECT_SPECIFICITY_LOW
 *   MC-03 TEMPLATE_ECHO_HIGH
 *   MC-04 CONCEPT_SEMANTIC_DUPLICATION
 *   MC-05 UNSUPPORTED_PROJECT_CLAIM
 *   MC-06 LEGACY_VISUAL_CONTAMINATION
 *   MC-07 LOCKED_CONFLICT
 *   MC-08 CATEGORY_CLICHE_ONLY
 *   MC-09 NO_STRATEGIC_MECHANISM
 *   MC-10 NO_WHY_THIS_PROJECT
 */

import type {
  ModelAssistedConceptSet,
  ModelAssistedConceptCandidate,
} from './contracts.ts';
import {
  MODEL_ASSISTED_QUOTAS,
  MODEL_ASSISTED_FORBIDDEN_POSITIVE_AUTHORITIES,
  MODEL_ASSISTED_GENERIC_VISUAL_PHRASES,
} from './contracts.ts';
import { computeTemplateEcho } from './template-echo.ts';
import type { StrategicSynthesisArtifact } from '../strategic-synthesis/contracts.ts';

export type ModelAssistedConceptGateCode =
  | 'MC-01'
  | 'MC-02'
  | 'MC-03'
  | 'MC-04'
  | 'MC-05'
  | 'MC-06'
  | 'MC-07'
  | 'MC-08'
  | 'MC-09'
  | 'MC-10';

export type GateSeverity = 'block' | 'warn';

export interface ModelAssistedConceptGateIssue {
  code: ModelAssistedConceptGateCode;
  severity: GateSeverity;
  where: string;
  detail: string;
  refs?: string[];
}

export interface ModelAssistedConceptGateReport {
  passed: boolean;
  issues: ModelAssistedConceptGateIssue[];
  blockedCodes: ModelAssistedConceptGateCode[];
  warningCodes: ModelAssistedConceptGateCode[];
}

export interface ModelAssistedConceptGateInput {
  set: ModelAssistedConceptSet;
  /**
   * The validated upstream StrategicSynthesisArtifact. We use it
   * to assert refs resolve into the synthesis set.
   */
  synthesis: StrategicSynthesisArtifact;
  /**
   * Project Truth facts (key set) used to detect project-specificity.
   */
  projectFactKeys: ReadonlySet<string>;
  /**
   * Set of locked fact keys (e.g. `brand.locked_logo`). Used for
   * MC-07 LOCKED_CONFLICT.
   */
  lockedFactKeys: ReadonlySet<string>;
  /**
   * Set of foreign project fact IDs (cross-project contamination).
   */
  foreignFactIds?: ReadonlySet<string>;
}

function allConceptText(c: ModelAssistedConceptCandidate): Array<{ where: string; value: string }> {
  const out: Array<{ where: string; value: string }> = [];
  const push = (where: string, v: unknown): void => {
    if (typeof v === 'string' && v.length > 0) out.push({ where, value: v });
  };
  push(`candidates[${c.id}].title`, c.title);
  push(`candidates[${c.id}].coreProposition`, c.coreProposition);
  push(`candidates[${c.id}].strategicMechanism`, c.strategicMechanism);
  push(`candidates[${c.id}].whyThisProject`, c.whyThisProject);
  push(`candidates[${c.id}].whyNotCategoryCliche`, c.whyNotCategoryCliche);
  push(`candidates[${c.id}].centralMetaphor`, c.centralMetaphor);
  push(`candidates[${c.id}].translationHypothesis.organizationLogic`, c.translationHypothesis.organizationLogic);
  push(`candidates[${c.id}].translationHypothesis.expressionLogic`, c.translationHypothesis.expressionLogic);
  for (let i = 0; i < c.translationHypothesis.possibleVisualBehaviors.length; i += 1) {
    const v = c.translationHypothesis.possibleVisualBehaviors[i];
    if (v !== undefined) {
      push(`candidates[${c.id}].translationHypothesis.possibleVisualBehaviors[${i}]`, v);
    }
  }
  return out;
}

function resolveOpportunityRefs(input: ModelAssistedConceptGateInput): Set<string> {
  return new Set(input.synthesis.opportunities.map((o) => o.id));
}
function resolveInsightRefs(input: ModelAssistedConceptGateInput): Set<string> {
  return new Set(input.synthesis.insights.map((i) => i.id));
}
function resolveFactRefs(input: ModelAssistedConceptGateInput): Set<string> {
  return new Set<string>([
    ...input.synthesis.projectUnderstanding.factRefs,
    ...input.synthesis.insights.flatMap((i) => i.factRefs),
    ...input.synthesis.opportunities.flatMap((o) => o.factRefs),
  ]);
}
function resolveNeedRefs(input: ModelAssistedConceptGateInput): Set<string> {
  return new Set<string>([
    ...input.synthesis.projectUnderstanding.needRefs,
    ...input.synthesis.insights.flatMap((i) => i.needRefs),
    ...input.synthesis.tensions.flatMap((t) => t.needRefs),
  ]);
}

export function runModelAssistedConceptGates(input: ModelAssistedConceptGateInput): ModelAssistedConceptGateReport {
  const issues: ModelAssistedConceptGateIssue[] = [];
  const block = (code: ModelAssistedConceptGateCode, where: string, detail: string, refs?: string[]): void => {
    issues.push({ code, severity: 'block', where, detail, ...(refs ? { refs } : {}) });
  };
  const warn = (code: ModelAssistedConceptGateCode, where: string, detail: string, refs?: string[]): void => {
    issues.push({ code, severity: 'warn', where, detail, ...(refs ? { refs } : {}) });
  };

  // MC-09 NO_STRATEGIC_MECHANISM (cheap to check first)
  // MC-10 NO_WHY_THIS_PROJECT
  for (const c of input.set.candidates) {
    if (c.strategicMechanism.trim().length === 0) {
      block('MC-09', `candidates[${c.id}]`, 'strategicMechanism must not be empty');
    }
    if (c.whyThisProject.trim().length === 0) {
      block('MC-10', `candidates[${c.id}]`, 'whyThisProject must not be empty');
    }
  }

  // Quota check (used by MC-01 implicitly)
  if (input.set.candidates.length < MODEL_ASSISTED_QUOTAS.concept.min) {
    block('MC-01', 'candidates', `candidates.length ${input.set.candidates.length} < ${MODEL_ASSISTED_QUOTAS.concept.min}`);
  }
  if (input.set.candidates.length > MODEL_ASSISTED_QUOTAS.concept.max) {
    warn('MC-01', 'candidates', `candidates.length ${input.set.candidates.length} > ${MODEL_ASSISTED_QUOTAS.concept.max}`);
  }

  const oppIds = resolveOpportunityRefs(input);
  const insightIds = resolveInsightRefs(input);
  const factIds = resolveFactRefs(input);
  const needIds = resolveNeedRefs(input);

  for (const c of input.set.candidates) {
    // MC-01 MODEL_CONCEPT_REFS_VALID
    for (const ref of c.opportunityRefs) {
      if (!oppIds.has(ref)) {
        block('MC-01', `candidates[${c.id}].opportunityRefs`, `unresolved opportunityRef "${ref}"`, [ref]);
      }
    }
    for (const ref of c.insightRefs) {
      if (!insightIds.has(ref)) {
        block('MC-01', `candidates[${c.id}].insightRefs`, `unresolved insightRef "${ref}"`, [ref]);
      }
    }
    for (const ref of c.factRefs) {
      if (!factIds.has(ref)) {
        block('MC-01', `candidates[${c.id}].factRefs`, `unresolved factRef "${ref}"`, [ref]);
      }
      if (input.foreignFactIds?.has(ref)) {
        block('MC-01', `candidates[${c.id}].factRefs`, `foreign factRef "${ref}"`, [ref]);
      }
    }
    for (const ref of c.needRefs) {
      if (!needIds.has(ref)) {
        block('MC-01', `candidates[${c.id}].needRefs`, `unresolved needRef "${ref}"`, [ref]);
      }
    }

    // MC-02 PROJECT_SPECIFICITY_LOW — text mentions a project fact key
    // AND opportunityRefs / insightRefs are non-empty.
    const allText = allConceptText(c).map((t) => t.value).join(' \n ').toLowerCase();
    let projectSignal = false;
    for (const key of input.projectFactKeys) {
      if (allText.includes(key.toLowerCase())) {
        projectSignal = true;
        break;
      }
    }
    if (!projectSignal && c.opportunityRefs.length === 0 && c.insightRefs.length === 0) {
      block('MC-02', `candidates[${c.id}]`, 'no project-specificity signal (no project fact key, no opportunity/insight refs)');
    } else if (!projectSignal) {
      warn('MC-02', `candidates[${c.id}]`, 'no project fact key mentioned in text (refs present)');
    }

    // MC-03 TEMPLATE_ECHO_HIGH
    for (const t of allConceptText(c)) {
      const echo = computeTemplateEcho(t.value);
      if (echo.band === 'block') {
        block('MC-03', t.where, `template echo high (${echo.similarity.toFixed(2)}) vs "${echo.topMatchLabel}"`);
        break; // one block per candidate is enough
      } else if (echo.band === 'warn') {
        warn('MC-03', t.where, `template echo warn (${echo.similarity.toFixed(2)}) vs "${echo.topMatchLabel}"`);
      }
    }

    // MC-05 UNSUPPORTED_PROJECT_CLAIM
    for (const t of allConceptText(c)) {
      if (/\b(as an? (?:public|private|global|national|state-owned|family-owned)\s+(?:company|brand|firm|studio|group))\b/i.test(t.value)) {
        block('MC-05', t.where, `unsupported FACT claim phrasing: "${t.value}"`);
      }
    }

    // MC-06 LEGACY_VISUAL_CONTAMINATION
    for (const t of allConceptText(c)) {
      if (/\bbased on (?:the |our )?(?:old |existing |current )?(vi|visual identity|poster|packaging|spatial|brand visual)\b/i.test(t.value)) {
        block('MC-06', t.where, `positive creative authority claim from legacy visual: "${t.value}"`);
      }
    }

    // MC-07 LOCKED_CONFLICT
    for (const t of allConceptText(c)) {
      if (/\b(?:replace|remove|change|drop|abandon|discard)\s+(?:the\s+)?(?:brand|logo|wordmark|locked|signature)/i.test(t.value)) {
        block('MC-07', t.where, `potential LOCKED identity violation: "${t.value}"`);
      }
    }

    // MC-08 CATEGORY_CLICHE_ONLY
    // A concept is "category cliche only" if every primary field
    // (title / coreProposition / strategicMechanism / whyThisProject)
    // is dominated by a phrase from the generic visual cliche list
    // AND the project fact keys set is empty (so the candidate
    // never reached for project-grounded vocabulary).
    const primaryFields = [
      c.title,
      c.coreProposition,
      c.strategicMechanism,
      c.whyThisProject,
    ].map((s) => s.toLowerCase());
    const everyFieldIsCliche = primaryFields.every((s) =>
      MODEL_ASSISTED_GENERIC_VISUAL_PHRASES.some((p) => s.includes(p.toLowerCase()))
      || s.trim().length < 8,
    );
    if (everyFieldIsCliche && input.projectFactKeys.size === 0) {
      block('MC-08', `candidates[${c.id}]`, 'candidate is composed entirely of generic visual cliches');
    }
  }

  // MC-04 CONCEPT_SEMANTIC_DUPLICATION
  for (let i = 0; i < input.set.candidates.length; i += 1) {
    for (let j = i + 1; j < input.set.candidates.length; j += 1) {
      const a = input.set.candidates[i];
      const b = input.set.candidates[j];
      if (!a || !b) continue;
      const aText = allConceptText(a).map((t) => t.value).join(' ');
      const bText = allConceptText(b).map((t) => t.value).join(' ');
      const aEcho = computeTemplateEcho(aText);
      const bEcho = computeTemplateEcho(bText);
      // Duplicate detection: very high echo on both AND a
      // non-distinct strategicMechanism.
      if (a.strategicMechanism === b.strategicMechanism) {
        block('MC-04', `candidates[${a.id}]/${b.id}`,
          `strategicMechanism duplicated: "${a.strategicMechanism}"`);
      }
      // Echo-based duplicate: same template family hit with high sim
      if (aEcho.topMatchLabel && aEcho.topMatchLabel === bEcho.topMatchLabel
        && aEcho.similarity >= 0.55 && bEcho.similarity >= 0.55) {
        warn('MC-04', `candidates[${a.id}]/${b.id}]`,
          `both echo "${aEcho.topMatchLabel}" (${aEcho.similarity.toFixed(2)} / ${bEcho.similarity.toFixed(2)})`);
      }
    }
  }

  // Re-export for the linter.
  void MODEL_ASSISTED_FORBIDDEN_POSITIVE_AUTHORITIES;

  const blockedCodes = Array.from(new Set(issues.filter((i) => i.severity === 'block').map((i) => i.code)));
  const warningCodes = Array.from(new Set(issues.filter((i) => i.severity === 'warn').map((i) => i.code)));
  return {
    passed: blockedCodes.length === 0,
    issues,
    blockedCodes,
    warningCodes,
  };
}
