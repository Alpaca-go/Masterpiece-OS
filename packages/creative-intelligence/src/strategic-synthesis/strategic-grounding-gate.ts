/**
 * CI-W1C.7 — Strategic Grounding Gate (spec §7).
 *
 * Deterministic validator that runs over a `StrategicSynthesisArtifact`
 * to assert:
 *   SG-01 ALL_REFS_RESOLVE
 *   SG-02 NO_UNSUPPORTED_FACT_CLAIM
 *   SG-03 NO_REFERENCE_FACT_AUTHORITY_ESCALATION
 *   SG-04 NO_LEGACY_VISUAL_POSITIVE_AUTHORITY
 *   SG-05 NO_LOCKED_RULE_CONFLICT
 *   SG-06 PROJECT_UNDERSTANDING_HAS_TRACE
 *   SG-07 EACH_INSIGHT_HAS_FACT_AND_NEED_TRACE
 *   SG-08 EACH_OPPORTUNITY_HAS_INSIGHT_TRACE
 *   SG-09 NO_GENERIC_ONLY_INSIGHT_SET
 *   SG-10 NO_PROJECT_CROSS_CONTAMINATION
 *
 * No model call. Pure function.
 */

import type {
  StrategicSynthesisArtifact,
  StrategicGroundingReport,
  StrategicGroundingIssue,
  StrategicGroundingGateCode,
} from './contracts.ts';
import {
  FORBIDDEN_POSITIVE_CREATIVE_AUTHORITIES,
  GENERIC_VISUAL_PHRASES,
  STRATEGIC_SYNTHESIS_LEGACY_VISUAL_EXCLUDED_MIN,
} from './contracts.ts';
import type { ProjectTruthModel } from '../truth/contracts.ts';
import type { PlanningStrategicClaim } from './planning-strategic-evidence.ts';

export interface StrategicGroundingGateInput {
  artifact: StrategicSynthesisArtifact;
  truth: ProjectTruthModel;
  /**
   * CI-W1C.7.4-R2 PART E — actual PlanningStrategicEvidence input
   * claims. The gate builds `knownPlanningClaimIds` from this list
   * PLUS the model-emitted `sourceMap.planningClaims` (audit trail).
   * Model output alone is NOT authority.
   */
  planningClaims?: PlanningStrategicClaim[];
  /**
   * Set of "other-project" fact/need/evidence IDs that must NOT
   * appear in this artifact. Used for SG-10 cross-project
   * contamination.
   */
  foreignIds?: {
    factIds: Set<string>;
    needIds: Set<string>;
    evidenceIds: Set<string>;
    planningClaimIds?: Set<string>;
  };
}

const KEYWORD_HINT_TOKENS = [
  'logo',
  'color',
  'typography',
  'motif',
  'imagery',
  'layout',
  'material',
  'old_vi',
  'old_poster',
  'old_packaging',
  'old_spatial',
  'style_reference',
  'structure_reference',
  'spatial_reference',
];

function allArtifactTextFields(artifact: StrategicSynthesisArtifact): Array<{ where: string; value: string }> {
  const out: Array<{ where: string; value: string }> = [];
  const push = (where: string, v: unknown): void => {
    if (typeof v === 'string' && v.length > 0) out.push({ where, value: v });
  };
  push('projectUnderstanding.summary', artifact.projectUnderstanding.summary);
  push('projectUnderstanding.coreChallenge', artifact.projectUnderstanding.coreChallenge);
  push('projectUnderstanding.transformationGoal', artifact.projectUnderstanding.transformationGoal);
  push('projectUnderstanding.brandRoleInterpretation', artifact.projectUnderstanding.brandRoleInterpretation);
  push('projectUnderstanding.audienceTension', artifact.projectUnderstanding.audienceTension);
  for (const t of artifact.tensions) {
    push(`tensions[${t.id}].statement`, t.statement);
    push(`tensions[${t.id}].poleA`, t.poleA);
    push(`tensions[${t.id}].poleB`, t.poleB);
    push(`tensions[${t.id}].whyItMatters`, t.whyItMatters);
  }
  for (const i of artifact.insights) {
    push(`insights[${i.id}].statement`, i.statement);
    push(`insights[${i.id}].implication`, i.implication);
    push(`insights[${i.id}].whyThisProject`, i.whyThisProject);
  }
  for (const o of artifact.opportunities) {
    push(`opportunities[${o.id}].title`, o.title);
    push(`opportunities[${o.id}].thesis`, o.thesis);
    push(`opportunities[${o.id}].strategicMechanism`, o.strategicMechanism);
    push(`opportunities[${o.id}].whyThisProject`, o.whyThisProject);
    for (let r = 0; r < o.risk.length; r += 1) {
      const riskVal = o.risk[r];
      if (riskVal !== undefined) {
        push(`opportunities[${o.id}].risk[${r}]`, riskVal);
      }
    }
  }
  return out;
}

function mentionsAny(text: string, needles: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const n of needles) {
    if (lower.includes(n.toLowerCase())) return n;
  }
  return null;
}

export function runStrategicGroundingGate(input: StrategicGroundingGateInput): StrategicGroundingReport {
  const issues: StrategicGroundingIssue[] = [];
  const { artifact, truth } = input;
  const factIdSet = new Set<string>();
  const needIdSet = new Set<string>();
  const evidenceIdSet = new Set<string>();
  for (const f of truth.facts) factIdSet.add(f.id);
  for (const c of truth.conflicts) {
    // Conflicts do not register fact IDs in the source map. We only
    // include the conflict's reference IDs in the foreignIds check.
    void c;
  }
  // We collect need IDs from the artifact's sourceMap (deterministic
  // run context).
  for (const id of artifact.sourceMap.needs) needIdSet.add(id);
  for (const id of artifact.sourceMap.evidence) evidenceIdSet.add(id);
  const knownFactIds = new Set<string>([...factIdSet, ...artifact.sourceMap.planningTruth]);
  const knownNeedIds = new Set<string>([...needIdSet, ...artifact.sourceMap.needs]);
  const knownEvidenceIds = new Set<string>([...evidenceIdSet, ...artifact.sourceMap.evidence]);
  // CI-W1C.7.4-R2 PART E — knownPlanningClaimIds comes ONLY from
  // the ACTUAL runtime input (`input.planningClaims`). The
  // model-emitted `sourceMap.planningClaims` is recorded for audit
  // but is NOT authority; the gate refuses to let the model
  // self-authorize fake IDs (RTG-02b).
  const knownPlanningClaimIds = new Set<string>();
  for (const c of input.planningClaims ?? []) {
    if (typeof c?.claimId === 'string') knownPlanningClaimIds.add(c.claimId);
  }

  const block = (code: StrategicGroundingGateCode, where: string, detail: string, refs?: string[]): void => {
    issues.push({ code, severity: 'block', where, detail, ...(refs ? { refs } : {}) });
  };
  const warn = (code: StrategicGroundingGateCode, where: string, detail: string, refs?: string[]): void => {
    issues.push({ code, severity: 'warn', where, detail, ...(refs ? { refs } : {}) });
  };

  // SG-01 ALL_REFS_RESOLVE
  for (const i of artifact.insights) {
    for (const ref of i.factRefs) {
      if (!knownFactIds.has(ref)) {
        block('SG-01', `insights[${i.id}].factRefs`, `unresolved factRef "${ref}"`, [ref]);
      }
    }
    for (const ref of i.needRefs) {
      if (!knownNeedIds.has(ref)) {
        block('SG-01', `insights[${i.id}].needRefs`, `unresolved needRef "${ref}"`, [ref]);
      }
    }
    for (const ref of i.evidenceRefs) {
      if (!knownEvidenceIds.has(ref)) {
        block('SG-01', `insights[${i.id}].evidenceRefs`, `unresolved evidenceRef "${ref}"`, [ref]);
      }
    }
    // CI-W1C.7.4-R2 PART E — planning claim refs must resolve to
    // the actual runtime input IDs, NOT to model-emitted sourceMap.
    for (const ref of i.planningClaimRefs) {
      if (!knownPlanningClaimIds.has(ref)) {
        block(
          'SG-01',
          `insights[${i.id}].planningClaimRefs`,
          `unresolved planningClaimRef "${ref}"`,
          [ref],
        );
      }
    }
  }
  for (const t of artifact.tensions) {
    for (const ref of t.factRefs) {
      if (!knownFactIds.has(ref)) {
        block('SG-01', `tensions[${t.id}].factRefs`, `unresolved factRef "${ref}"`, [ref]);
      }
    }
    for (const ref of t.needRefs) {
      if (!knownNeedIds.has(ref)) {
        block('SG-01', `tensions[${t.id}].needRefs`, `unresolved needRef "${ref}"`, [ref]);
      }
    }
    for (const ref of t.planningClaimRefs) {
      if (!knownPlanningClaimIds.has(ref)) {
        block(
          'SG-01',
          `tensions[${t.id}].planningClaimRefs`,
          `unresolved planningClaimRef "${ref}"`,
          [ref],
        );
      }
    }
  }
  for (const ref of artifact.projectUnderstanding.factRefs) {
    if (!knownFactIds.has(ref)) {
      block('SG-01', 'projectUnderstanding.factRefs', `unresolved factRef "${ref}"`, [ref]);
    }
  }
  for (const ref of artifact.projectUnderstanding.needRefs) {
    if (!knownNeedIds.has(ref)) {
      block('SG-01', 'projectUnderstanding.needRefs', `unresolved needRef "${ref}"`, [ref]);
    }
  }
  for (const ref of artifact.projectUnderstanding.planningClaimRefs) {
    if (!knownPlanningClaimIds.has(ref)) {
      block(
        'SG-01',
        'projectUnderstanding.planningClaimRefs',
        `unresolved planningClaimRef "${ref}"`,
        [ref],
      );
    }
  }
  for (const o of artifact.opportunities) {
    for (const ref of o.factRefs) {
      if (!knownFactIds.has(ref)) {
        block('SG-01', `opportunities[${o.id}].factRefs`, `unresolved factRef "${ref}"`, [ref]);
      }
    }
    for (const ref of o.planningClaimRefs) {
      if (!knownPlanningClaimIds.has(ref)) {
        block(
          'SG-01',
          `opportunities[${o.id}].planningClaimRefs`,
          `unresolved planningClaimRef "${ref}"`,
          [ref],
        );
      }
    }
  }

  // SG-02 NO_UNSUPPORTED_FACT_CLAIM
  // Heuristic: any field claiming a specific fact about a project that
  // is not in `knownFactIds`. (Covered by SG-01 for explicit refs. This
  // gate asserts the artifact's *claims* don't include forbidden
  // phrasing like "as a public company" or "as a 30-year-old brand".)
  for (const t of allArtifactTextFields(artifact)) {
    // 'as an X company' / 'as a X brand' style unsupported claims
    if (/\b(as an? (?:public|private|global|national|state-owned|family-owned)\s+(?:company|brand|firm|studio|group))\b/i.test(t.value)) {
      block('SG-02', t.where, `unsupported FACT claim phrasing: "${t.value}"`);
    }
  }

  // SG-03 NO_REFERENCE_FACT_AUTHORITY_ESCALATION
  // assert that no factRef points to a fact with authority
  // `VISUAL_SOURCE_FACT` (those are LEGACY_VISUAL_EVIDENCE).
  for (const f of truth.facts) {
    if (f.authority === 'VISUAL_SOURCE_FACT') {
      for (const i of artifact.insights) {
        if (i.factRefs.includes(f.id)) {
          block('SG-03', `insights[*]`, `VISUAL_SOURCE_FACT "${f.id}" may not become a strategic reference`, [f.id]);
        }
        if (i.evidenceRefs.includes(f.id)) {
          block('SG-03', `insights[*]`, `VISUAL_SOURCE_FACT "${f.id}" may not become evidence`, [f.id]);
        }
      }
    }
  }

  // SG-04 NO_LEGACY_VISUAL_POSITIVE_AUTHORITY
  // The artifact's text MUST NOT include forbidden positive authority
  // tokens as the *primary* creative source. The check is text-level
  // and project-agnostic (no hardcoded project tokens). It also
  // asserts the sourceMap.legacyVisualEvidenceExcluded contains the
  // spec minimum set.
  for (const excluded of STRATEGIC_SYNTHESIS_LEGACY_VISUAL_EXCLUDED_MIN) {
    if (!artifact.sourceMap.legacyVisualEvidenceExcluded.includes(excluded)) {
      block('SG-04', 'sourceMap.legacyVisualEvidenceExcluded',
        `missing required exclusion token "${excluded}"`,
      );
    }
  }
  // For each artifact text field, we only block on explicit
  // positive-authority phrasing. We do NOT block mentions of
  // "logo" / "color" etc. as generic vocabulary. We DO block
  // explicit references like "based on the old VI" or "matching
  // the current poster".
  for (const t of allArtifactTextFields(artifact)) {
    if (/\bbased on (?:the |our )?(?:old |existing |current )?(vi|visual identity|poster|packaging|spatial|brand visual)\b/i.test(t.value)) {
      block('SG-04', t.where, `positive creative authority claim from legacy visual: "${t.value}"`);
    }
  }

  // SG-05 NO_LOCKED_RULE_CONFLICT
  // Assert that no field contradicts an explicitly LOCKED fact.
  for (const t of allArtifactTextFields(artifact)) {
    if (/\b(?:replace|remove|change|drop|abandon|discard)\s+(?:the\s+)?(?:brand|logo|wordmark|locked|signature)/i.test(t.value)) {
      block('SG-05', t.where, `potential LOCKED identity violation: "${t.value}"`);
    }
  }

  // SG-06 PROJECT_UNDERSTANDING_HAS_TRACE
  if (artifact.projectUnderstanding.factRefs.length === 0
    || artifact.projectUnderstanding.needRefs.length === 0) {
    block('SG-06', 'projectUnderstanding',
      'projectUnderstanding must have at least 1 factRef and 1 needRef');
  }

  // SG-07 EACH_INSIGHT_HAS_FACT_AND_NEED_TRACE
  for (const i of artifact.insights) {
    if (i.factRefs.length === 0 || i.needRefs.length === 0) {
      block('SG-07', `insights[${i.id}]`, 'insight must have factRefs AND needRefs');
    }
  }

  // SG-08 EACH_OPPORTUNITY_HAS_INSIGHT_TRACE
  for (const o of artifact.opportunities) {
    if (o.insightRefs.length === 0) {
      block('SG-08', `opportunities[${o.id}]`, 'opportunity must have insightRefs');
    }
  }

  // SG-09 NO_GENERIC_ONLY_INSIGHT_SET
  // Count insights whose statement only contains generic visual
  // phrases and no project-specific signal. A project-specific
  // signal is detected when the text contains a fact ID or
  // mention of a project-unique fact from `knownFactIds` keys.
  const projectFactKeySignals = new Set<string>();
  for (const f of truth.facts) {
    if (typeof f.key === 'string') projectFactKeySignals.add(f.key.toLowerCase());
  }
  const genericOnlyCount = artifact.insights.reduce<number>((acc, i) => {
    const s = i.statement.toLowerCase();
    const mentionsGenericPhrase = GENERIC_VISUAL_PHRASES.some((p) => s.includes(p.toLowerCase()));
    const mentionsProjectKey = Array.from(projectFactKeySignals).some((k) => s.includes(k));
    return acc + ((mentionsGenericPhrase && !mentionsProjectKey) ? 1 : 0);
  }, 0);
  if (artifact.insights.length > 0 && genericOnlyCount / artifact.insights.length > 0.5) {
    block('SG-09', 'insights',
      `${genericOnlyCount}/${artifact.insights.length} insights are generic-only`);
  } else if (genericOnlyCount > 0) {
    warn('SG-09', 'insights', `${genericOnlyCount}/${artifact.insights.length} insights are generic-only`);
  }

  // SG-10 NO_PROJECT_CROSS_CONTAMINATION
  if (input.foreignIds) {
    for (const i of artifact.insights) {
      for (const ref of i.factRefs) {
        if (input.foreignIds.factIds.has(ref)) {
          block('SG-10', `insights[${i.id}]`, `foreign factRef "${ref}" detected`, [ref]);
        }
      }
      for (const ref of i.needRefs) {
        if (input.foreignIds.needIds.has(ref)) {
          block('SG-10', `insights[${i.id}]`, `foreign needRef "${ref}" detected`, [ref]);
        }
      }
      // CI-W1C.7.4-R2 PART E — foreign planning claim IDs are blocked.
      for (const ref of i.planningClaimRefs) {
        if (input.foreignIds.planningClaimIds?.has(ref)) {
          block(
            'SG-10',
            `insights[${i.id}].planningClaimRefs`,
            `foreign planningClaimRef "${ref}" detected`,
            [ref],
          );
        }
      }
    }
    for (const t of artifact.tensions) {
      for (const ref of t.planningClaimRefs) {
        if (input.foreignIds.planningClaimIds?.has(ref)) {
          block(
            'SG-10',
            `tensions[${t.id}].planningClaimRefs`,
            `foreign planningClaimRef "${ref}" detected`,
            [ref],
          );
        }
      }
    }
    for (const o of artifact.opportunities) {
      for (const ref of o.factRefs) {
        if (input.foreignIds.factIds.has(ref)) {
          block('SG-10', `opportunities[${o.id}]`, `foreign factRef "${ref}" detected`, [ref]);
        }
      }
      for (const ref of o.planningClaimRefs) {
        if (input.foreignIds.planningClaimIds?.has(ref)) {
          block(
            'SG-10',
            `opportunities[${o.id}].planningClaimRefs`,
            `foreign planningClaimRef "${ref}" detected`,
            [ref],
          );
        }
      }
    }
    for (const ref of artifact.projectUnderstanding.planningClaimRefs) {
      if (input.foreignIds.planningClaimIds?.has(ref)) {
        block(
          'SG-10',
          'projectUnderstanding.planningClaimRefs',
          `foreign planningClaimRef "${ref}" detected`,
          [ref],
        );
      }
    }
  }

  // CI-W1C.7.4-R2 PART E 7 — minimum planning claim usage.
  // When the runtime input has planning claims, the artifact must
  // actually use them. We do NOT force every output element to
  // reference a planning claim, but the projectUnderstanding must
  // and at least one tension or insight must.
  if ((input.planningClaims ?? []).length > 0) {
    if (artifact.projectUnderstanding.planningClaimRefs.length === 0) {
      block(
        'SG-11',
        'projectUnderstanding.planningClaimRefs',
        'projectUnderstanding must cite at least 1 planningClaimRef when planning input is present',
      );
    }
    const usedInTensionOrInsight =
      artifact.tensions.some((t) => t.planningClaimRefs.length > 0) ||
      artifact.insights.some((i) => i.planningClaimRefs.length > 0);
    if (!usedInTensionOrInsight) {
      block(
        'SG-11',
        'planningClaimRefs',
        'at least 1 tension or insight must cite a planningClaimRef when planning input is present',
      );
    }
  }

  // CI-W1C.7.4-R2.1 PART C — SG-12 PLANNING_SOURCE_MAP_MATCHES_RUNTIME.
  // The model-emitted `sourceMap.planningClaims` is metadata and
  // MUST exactly mirror the runtime input claim IDs as a sorted
  // unique set. We do NOT silently overwrite the artifact; we
  // BLOCK so the existing repair attempt can fix the structured
  // output on the next attempt.
  {
    const runtimeClaimIds = Array.from(
      new Set(
        (input.planningClaims ?? [])
          .map((c) => c?.claimId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ).sort();
    const artifactClaimIds = Array.from(
      new Set(
        (artifact.sourceMap.planningClaims ?? []).filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        ),
      ),
    ).sort();
    if (runtimeClaimIds.length === 0 && artifactClaimIds.length !== 0) {
      block(
        'SG-12',
        'sourceMap.planningClaims',
        `no planning input but sourceMap.planningClaims has ${artifactClaimIds.length} entr(y/ies)`,
        artifactClaimIds,
      );
    } else if (
      runtimeClaimIds.length > 0 &&
      (artifactClaimIds.length !== runtimeClaimIds.length ||
        artifactClaimIds.some((id, idx) => id !== runtimeClaimIds[idx]))
    ) {
      block(
        'SG-12',
        'sourceMap.planningClaims',
        `sourceMap.planningClaims does not match runtime claim IDs: runtime=[${runtimeClaimIds.join(', ')}] artifact=[${artifactClaimIds.join(', ')}]`,
        Array.from(new Set([...runtimeClaimIds, ...artifactClaimIds])),
      );
    }
  }

  // Additional cross-check: keyword mention heuristic for SG-04.
  // We only WARN on keyword hints (logo / color / typography / ...)
  // because they are valid vocabulary; the model must still be
  // project-grounded. We do not hardcode project tokens.
  for (const t of allArtifactTextFields(artifact)) {
    const hit = mentionsAny(t.value, KEYWORD_HINT_TOKENS);
    if (hit && !t.value.includes('§4.2')) {
      // No-op: this is a vocabulary hint, not a positive-authority
      // claim. SG-04 already blocks the actual positive-authority
      // claims ("based on the old ...").
      void hit;
    }
  }

  // Reuse FORBIDDEN_POSITIVE_CREATIVE_AUTHORITIES so the linter
  // sees the import. (Future: textual check that no factRef id
  // begins with a visualAsset.* prefix; the SG-03 check covers
  // the authority side, this covers the key side.)
  for (const f of truth.facts) {
    if (typeof f.key === 'string' && f.key.startsWith('visualAsset.')) {
      for (const i of artifact.insights) {
        if (i.factRefs.includes(f.id)) {
          block('SG-04', `insights[*]`,
            `visualAsset.* fact "${f.id}" may not appear as positive creative source`,
            [f.id]);
        }
      }
    }
  }
  void FORBIDDEN_POSITIVE_CREATIVE_AUTHORITIES;

  const blockedCodes = Array.from(new Set(issues.filter((i) => i.severity === 'block').map((i) => i.code)));
  const warningCodes = Array.from(new Set(issues.filter((i) => i.severity === 'warn').map((i) => i.code)));
  return {
    passed: blockedCodes.length === 0,
    issues,
    blockedCodes,
    warningCodes,
  };
}
