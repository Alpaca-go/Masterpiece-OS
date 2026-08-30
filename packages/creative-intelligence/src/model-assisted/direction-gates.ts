/**
 * CI-W1C.7 — Model-Assisted Direction Gates (spec §9).
 *
 * Deterministic gate set:
 *   MD-01 ALL_TRACE_REFS_RESOLVE
 *   MD-02 STRATEGIC_GROUNDING_PRESENT
 *   MD-03 PROJECT_SPECIFICITY_PRESENT
 *   MD-04 TEMPLATE_ECHO_HIGH
 *   MD-05 CROSS_DIRECTION_COLLAPSE
 *   MD-06 CROSS_PROJECT_SEMANTIC_COLLAPSE
 *   MD-07 LEGACY_VISUAL_CONTAMINATION
 *   MD-08 LOCKED_IDENTITY_VIOLATION
 *   MD-09 PROHIBITED_DIRECTION_VIOLATION
 *   MD-10 FACT_HALLUCINATION
 *   MD-11 VISUAL_MECHANISM_TOO_GENERIC
 *   MD-12 VISUAL_LANGUAGE_NOT_ACTIONABLE
 */

import type {
  ModelAssistedDirectionSet,
  ModelAssistedCreativeDirection,
  ModelAssistedDirectionFamily,
} from './contracts.ts';
import {
  MODEL_ASSISTED_QUOTAS,
  MODEL_ASSISTED_GENERIC_VISUAL_PHRASES,
} from './contracts.ts';
import { computeTemplateEcho } from './template-echo.ts';
import type { StrategicSynthesisArtifact } from '../strategic-synthesis/contracts.ts';
import type { ModelAssistedConceptSet } from './contracts.ts';

export type ModelAssistedDirectionGateCode =
  | 'MD-01'
  | 'MD-02'
  | 'MD-03'
  | 'MD-04'
  | 'MD-05'
  | 'MD-06'
  | 'MD-07'
  | 'MD-08'
  | 'MD-09'
  | 'MD-10'
  | 'MD-11'
  | 'MD-12';

export type DirectionGateSeverity = 'block' | 'warn';

export interface ModelAssistedDirectionGateIssue {
  code: ModelAssistedDirectionGateCode;
  severity: DirectionGateSeverity;
  where: string;
  detail: string;
  refs?: string[];
}

export interface ModelAssistedDirectionGateReport {
  passed: boolean;
  issues: ModelAssistedDirectionGateIssue[];
  blockedCodes: ModelAssistedDirectionGateCode[];
  warningCodes: ModelAssistedDirectionGateCode[];
}

export interface ModelAssistedDirectionGateInput {
  set: ModelAssistedDirectionSet;
  synthesis: StrategicSynthesisArtifact;
  conceptSet: ModelAssistedConceptSet;
  projectFactKeys: ReadonlySet<string>;
  lockedFactKeys: ReadonlySet<string>;
  /**
   * The forbidden positive-authority keys (e.g. visualAsset.*, old_VI).
   * Used by MD-07 and MD-09.
   */
  prohibitedFactKeys: ReadonlySet<string>;
  /**
   * Set of foreign project fact IDs (cross-project contamination).
   */
  foreignFactIds?: ReadonlySet<string>;
  /**
   * When the gate is run as part of a multi-project counterfactual
   * test, this is the *other* project's direction set. Used by
   * MD-06 CROSS_PROJECT_SEMANTIC_COLLAPSE.
   */
  foreignDirectionSet?: ModelAssistedDirectionSet;
}

function allDirectionText(d: ModelAssistedCreativeDirection): Array<{ where: string; value: string }> {
  const out: Array<{ where: string; value: string }> = [];
  const push = (where: string, v: unknown): void => {
    if (typeof v === 'string' && v.length > 0) out.push({ where, value: v });
  };
  push(`directions[${d.id}].title`, d.title);
  push(`directions[${d.id}].creativeThesis`, d.creativeThesis);
  push(`directions[${d.id}].visualMechanism`, d.visualMechanism);
  push(`directions[${d.id}].systemHypothesis`, d.systemHypothesis);
  push(`directions[${d.id}].whyThisProject`, d.whyThisProject);
  push(`directions[${d.id}].differenceFromOtherDirections`, d.differenceFromOtherDirections);
  push(`directions[${d.id}].visualLanguage.compositionLogic`, d.visualLanguage.compositionLogic);
  push(`directions[${d.id}].visualLanguage.colorRelationship`, d.visualLanguage.colorRelationship);
  push(`directions[${d.id}].visualLanguage.typographyBehavior`, d.visualLanguage.typographyBehavior);
  push(`directions[${d.id}].visualLanguage.graphicBehavior`, d.visualLanguage.graphicBehavior);
  push(`directions[${d.id}].visualLanguage.imageBehavior`, d.visualLanguage.imageBehavior);
  push(`directions[${d.id}].visualLanguage.materialRelationship`, d.visualLanguage.materialRelationship);
  push(`directions[${d.id}].visualLanguage.motionBehavior`, d.visualLanguage.motionBehavior);
  for (const k of ['brandVI', 'editorial', 'campaignPoster', 'packaging', 'space', 'digitalUI'] as const) {
    push(`directions[${d.id}].crossMediaBehavior.${k}`, d.crossMediaBehavior[k]);
  }
  for (let i = 0; i < d.mustNotBecome.length; i += 1) {
    const v = d.mustNotBecome[i];
    if (v !== undefined) push(`directions[${d.id}].mustNotBecome[${i}]`, v);
  }
  return out;
}

const VISUAL_MECHANISM_REQUIRED_QUESTIONS = [
  /what is organized|组织什么|组织的是/i,
  /by what rule|按什么规则|用什么规则/i,
  /what changes across touchpoints|在不同触点上变化|触点间变化/i,
  /what remains invariant|什么保持不变|保持不变/i,
  /why does this answer|为什么回答|为什么能回答/i,
];

export function runModelAssistedDirectionGates(input: ModelAssistedDirectionGateInput): ModelAssistedDirectionGateReport {
  const issues: ModelAssistedDirectionGateIssue[] = [];
  const block = (code: ModelAssistedDirectionGateCode, where: string, detail: string, refs?: string[]): void => {
    issues.push({ code, severity: 'block', where, detail, ...(refs ? { refs } : {}) });
  };
  const warn = (code: ModelAssistedDirectionGateCode, where: string, detail: string, refs?: string[]): void => {
    issues.push({ code, severity: 'warn', where, detail, ...(refs ? { refs } : {}) });
  };

  // Quota check (used by MD-01 implicitly)
  if (input.set.directions.length < MODEL_ASSISTED_QUOTAS.direction.min) {
    block('MD-01', 'directions', `directions.length ${input.set.directions.length} < ${MODEL_ASSISTED_QUOTAS.direction.min}`);
  }
  if (input.set.directions.length > MODEL_ASSISTED_QUOTAS.direction.max) {
    warn('MD-01', 'directions', `directions.length ${input.set.directions.length} > ${MODEL_ASSISTED_QUOTAS.direction.max}`);
  }

  const oppIds = new Set(input.synthesis.opportunities.map((o) => o.id));
  const insightIds = new Set(input.synthesis.insights.map((i) => i.id));
  const factIds = new Set<string>([
    ...input.synthesis.projectUnderstanding.factRefs,
    ...input.synthesis.insights.flatMap((i) => i.factRefs),
    ...input.synthesis.opportunities.flatMap((o) => o.factRefs),
  ]);
  const conceptIds = new Set(input.conceptSet.candidates.map((c) => c.id));

  for (const d of input.set.directions) {
    // MD-01 ALL_TRACE_REFS_RESOLVE
    for (const ref of d.opportunityRefs) {
      if (!oppIds.has(ref)) {
        block('MD-01', `directions[${d.id}].opportunityRefs`, `unresolved opportunityRef "${ref}"`, [ref]);
      }
    }
    for (const ref of d.insightRefs) {
      if (!insightIds.has(ref)) {
        block('MD-01', `directions[${d.id}].insightRefs`, `unresolved insightRef "${ref}"`, [ref]);
      }
    }
    for (const ref of d.factRefs) {
      if (!factIds.has(ref)) {
        block('MD-01', `directions[${d.id}].factRefs`, `unresolved factRef "${ref}"`, [ref]);
      }
      if (input.foreignFactIds?.has(ref)) {
        block('MD-01', `directions[${d.id}].factRefs`, `foreign factRef "${ref}"`, [ref]);
      }
    }
    for (const ref of d.conceptRefs) {
      if (!conceptIds.has(ref)) {
        block('MD-01', `directions[${d.id}].conceptRefs`, `unresolved conceptRef "${ref}"`, [ref]);
      }
    }

    // MD-02 STRATEGIC_GROUNDING_PRESENT
    if (d.opportunityRefs.length === 0 && d.insightRefs.length === 0) {
      block('MD-02', `directions[${d.id}]`, 'must have at least one opportunityRef or insightRef');
    }

    // MD-03 PROJECT_SPECIFICITY_PRESENT
    const allText = allDirectionText(d).map((t) => t.value).join(' \n ').toLowerCase();
    let projectSignal = false;
    for (const key of input.projectFactKeys) {
      if (allText.includes(key.toLowerCase())) {
        projectSignal = true;
        break;
      }
    }
    if (!projectSignal) {
      warn('MD-03', `directions[${d.id}]`, 'no project fact key mentioned in any direction text field');
    }

    // MD-04 TEMPLATE_ECHO_HIGH
    for (const t of allDirectionText(d)) {
      const echo = computeTemplateEcho(t.value);
      if (echo.band === 'block') {
        block('MD-04', t.where, `template echo high (${echo.similarity.toFixed(2)}) vs "${echo.topMatchLabel}"`);
        break;
      } else if (echo.band === 'warn') {
        warn('MD-04', t.where, `template echo warn (${echo.similarity.toFixed(2)}) vs "${echo.topMatchLabel}"`);
      }
    }

    // MD-07 LEGACY_VISUAL_CONTAMINATION
    for (const t of allDirectionText(d)) {
      if (/\bbased on (?:the |our )?(?:old |existing |current )?(vi|visual identity|poster|packaging|spatial|brand visual)\b/i.test(t.value)) {
        block('MD-07', t.where, `positive creative authority claim from legacy visual: "${t.value}"`);
      }
      // Per-fact-key check (e.g. visualAsset.logo.description)
      for (const key of input.prohibitedFactKeys) {
        if (key.startsWith('visualAsset.') && t.value.toLowerCase().includes(key.toLowerCase())) {
          block('MD-07', t.where, `visualAsset.* fact key "${key}" mentioned in direction text`);
        }
      }
    }

    // MD-08 LOCKED_IDENTITY_VIOLATION
    for (const t of allDirectionText(d)) {
      if (/\b(?:replace|remove|change|drop|abandon|discard)\s+(?:the\s+)?(?:brand|logo|wordmark|locked|signature)/i.test(t.value)) {
        block('MD-08', t.where, `potential LOCKED identity violation: "${t.value}"`);
      }
    }

    // MD-09 PROHIBITED_DIRECTION_VIOLATION
    for (const key of input.prohibitedFactKeys) {
      if (key.startsWith('prohibited.') || key.startsWith('style.prohibited')) {
        if (allText.includes(key.toLowerCase())) {
          block('MD-09', `directions[${d.id}]`, `prohibited key "${key}" used as positive direction`);
        }
      }
    }

    // MD-10 FACT_HALLUCINATION
    for (const t of allDirectionText(d)) {
      if (/\b(as an? (?:public|private|global|national|state-owned|family-owned)\s+(?:company|brand|firm|studio|group))\b/i.test(t.value)) {
        block('MD-10', t.where, `unsupported FACT claim phrasing: "${t.value}"`);
      }
    }

    // MD-11 VISUAL_MECHANISM_TOO_GENERIC
    const vm = d.visualMechanism.toLowerCase();
    const onlyCliche = MODEL_ASSISTED_GENERIC_VISUAL_PHRASES.some((p) => vm.includes(p.toLowerCase()))
      && !input.projectFactKeys.size;
    if (onlyCliche) {
      block('MD-11', `directions[${d.id}].visualMechanism`, 'visualMechanism is a generic visual cliche');
    }
    // assert visualMechanism answers the 5 required questions
    const questionsAnswered = VISUAL_MECHANISM_REQUIRED_QUESTIONS.filter((re) => re.test(d.visualMechanism)).length;
    if (questionsAnswered < 3) {
      warn('MD-11', `directions[${d.id}].visualMechanism`,
        `visualMechanism answers only ${questionsAnswered}/5 required questions (organize / rule / change / invariant / why)`);
    }
    // assert mustDemonstrate fields (compositionLogic / etc.) are not all generic
    const fields = [
      d.visualLanguage.compositionLogic,
      d.visualLanguage.colorRelationship,
      d.visualLanguage.typographyBehavior,
      d.visualLanguage.graphicBehavior,
      d.visualLanguage.imageBehavior,
    ];
    const allGeneric = fields.every((f) => MODEL_ASSISTED_GENERIC_VISUAL_PHRASES.some((p) => f.toLowerCase().includes(p.toLowerCase())));
    if (allGeneric) {
      block('MD-11', `directions[${d.id}].visualLanguage`, 'all visualLanguage fields are generic cliches');
    }

    // MD-12 VISUAL_LANGUAGE_NOT_ACTIONABLE
    const visualLangConcat = `${d.visualLanguage.compositionLogic}\n${d.visualLanguage.colorRelationship}\n${d.visualLanguage.typographyBehavior}\n${d.visualLanguage.graphicBehavior}\n${d.visualLanguage.imageBehavior}`;
    if (visualLangConcat.trim().length < 80) {
      block('MD-12', `directions[${d.id}].visualLanguage`, 'visualLanguage fields are too short to be actionable');
    }
    // cross-media behavior must not be empty (the spec says "at
    // least some" — we require at least 2 of 6 to be present).
    const crossMediaCount = Object.values(d.crossMediaBehavior).filter((v) => typeof v === 'string' && v.length > 0).length;
    if (crossMediaCount < 2) {
      warn('MD-12', `directions[${d.id}].crossMediaBehavior`, `only ${crossMediaCount} cross-media behaviors defined (recommend >= 2)`);
    }
  }

  // MD-05 CROSS_DIRECTION_COLLAPSE
  for (let i = 0; i < input.set.directions.length; i += 1) {
    for (let j = i + 1; j < input.set.directions.length; j += 1) {
      const a = input.set.directions[i];
      const b = input.set.directions[j];
      if (!a || !b) continue;
      if (a.creativeThesis === b.creativeThesis) {
        block('MD-05', `directions[${a.id}]/${b.id}`,
          `creativeThesis duplicated: "${a.creativeThesis}"`);
      }
      if (a.visualMechanism === b.visualMechanism) {
        block('MD-05', `directions[${a.id}]/${b.id}`,
          `visualMechanism duplicated: "${a.visualMechanism}"`);
      }
      if (a.directionFamily === b.directionFamily) {
        // spec §9: "允许多个项目选择相同 DirectionFamily, but
        // same family != same semantic text". So same family is
        // not a hard fail; we WARN.
        warn('MD-05', `directions[${a.id}]/${b.id}]`,
          `same directionFamily "${a.directionFamily}" — text must differ in strategy`);
      }
      const aText = allDirectionText(a).map((t) => t.value).join(' ');
      const bText = allDirectionText(b).map((t) => t.value).join(' ');
      const aEcho = computeTemplateEcho(aText);
      const bEcho = computeTemplateEcho(bText);
      if (aEcho.topMatchLabel && aEcho.topMatchLabel === bEcho.topMatchLabel
        && aEcho.similarity >= 0.55 && bEcho.similarity >= 0.55) {
        warn('MD-05', `directions[${a.id}]/${b.id}]`,
          `both echo "${aEcho.topMatchLabel}" (${aEcho.similarity.toFixed(2)} / ${bEcho.similarity.toFixed(2)})`);
      }
    }
  }

  // MD-06 CROSS_PROJECT_SEMANTIC_COLLAPSE
  if (input.foreignDirectionSet) {
    for (const a of input.set.directions) {
      for (const b of input.foreignDirectionSet.directions) {
        if (a.creativeThesis === b.creativeThesis
          || a.visualMechanism === b.visualMechanism
          || a.systemHypothesis === b.systemHypothesis) {
          block('MD-06', `directions[${a.id}] vs ${b.id}`,
            'semantic text identical across projects (cross-project collapse)');
        }
        // Same-directionFamily with identical creativeThesis is a
        // stronger collapse signal.
        if (a.directionFamily === b.directionFamily && a.creativeThesis === b.creativeThesis) {
          block('MD-06', `directions[${a.id}] vs ${b.id}]`,
            'same directionFamily + same creativeThesis across projects');
        }
      }
    }
  }

  const blockedCodes = Array.from(new Set(issues.filter((i) => i.severity === 'block').map((i) => i.code)));
  const warningCodes = Array.from(new Set(issues.filter((i) => i.severity === 'warn').map((i) => i.code)));
  return {
    passed: blockedCodes.length === 0,
    issues,
    blockedCodes,
    warningCodes,
  };
}

// Re-export family type for callers.
export type { ModelAssistedDirectionFamily };
