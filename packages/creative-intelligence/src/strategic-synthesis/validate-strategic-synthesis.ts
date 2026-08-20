/**
 * CI-W1C.7 — Strategic Synthesis structural validator.
 *
 * Performs **lightweight structural** validation:
 *   - minimum / maximum quotas (1 PU, 2-5 tensions, 3-6 insights,
 *     3-5 opportunities)
 *   - required trace refs (non-empty per element)
 *   - prompt-version check
 *   - source-map non-empty
 *
 * This is the lightweight layer; **semantic** validation
 * (no template echo, no generic-only set, no cross-project
 * contamination, no locked conflict) lives in the
 * `strategic-grounding-gate.ts` module.
 */

import type { StrategicSynthesisArtifact } from './contracts.ts';
import { STRATEGIC_SYNTHESIS_MIN_QUOTAS } from './contracts.ts';
import { STRATEGIC_SYNTHESIS_PROMPT_VERSION } from './contracts.ts';

export type StrategicStructuralCode =
  | 'STR-01'
  | 'STR-02'
  | 'STR-03'
  | 'STR-04'
  | 'STR-05'
  | 'STR-06'
  | 'STR-07'
  | 'STR-08'
  | 'STR-09';

export interface StrategicStructuralIssue {
  code: StrategicStructuralCode;
  severity: 'block' | 'warn';
  detail: string;
  where: string;
}

export interface StrategicStructuralReport {
  passed: boolean;
  issues: StrategicStructuralIssue[];
  blockedCodes: StrategicStructuralCode[];
  warningCodes: StrategicStructuralCode[];
}

export function validateStrategicSynthesisStructural(
  artifact: StrategicSynthesisArtifact,
): StrategicStructuralReport {
  const issues: StrategicStructuralIssue[] = [];

  // STR-01: promptVersion check
  if (artifact.promptVersion !== STRATEGIC_SYNTHESIS_PROMPT_VERSION) {
    issues.push({
      code: 'STR-01',
      severity: 'block',
      detail: `promptVersion must be exactly "${STRATEGIC_SYNTHESIS_PROMPT_VERSION}"`,
      where: 'artifact.promptVersion',
    });
  }

  // STR-02: projectUnderstanding has at least 1 factRef
  if (artifact.projectUnderstanding.factRefs.length === 0) {
    issues.push({
      code: 'STR-02',
      severity: 'block',
      detail: 'projectUnderstanding.factRefs must not be empty',
      where: 'artifact.projectUnderstanding',
    });
  }

  // STR-03: tensions count
  if (artifact.tensions.length < STRATEGIC_SYNTHESIS_MIN_QUOTAS.tensions.min) {
    issues.push({
      code: 'STR-03',
      severity: 'block',
      detail: `tensions.length ${artifact.tensions.length} < ${STRATEGIC_SYNTHESIS_MIN_QUOTAS.tensions.min}`,
      where: 'artifact.tensions',
    });
  }
  if (artifact.tensions.length > STRATEGIC_SYNTHESIS_MIN_QUOTAS.tensions.max) {
    issues.push({
      code: 'STR-03',
      severity: 'warn',
      detail: `tensions.length ${artifact.tensions.length} > ${STRATEGIC_SYNTHESIS_MIN_QUOTAS.tensions.max}`,
      where: 'artifact.tensions',
    });
  }

  // STR-04: insights count
  if (artifact.insights.length < STRATEGIC_SYNTHESIS_MIN_QUOTAS.insights.min) {
    issues.push({
      code: 'STR-04',
      severity: 'block',
      detail: `insights.length ${artifact.insights.length} < ${STRATEGIC_SYNTHESIS_MIN_QUOTAS.insights.min}`,
      where: 'artifact.insights',
    });
  }
  if (artifact.insights.length > STRATEGIC_SYNTHESIS_MIN_QUOTAS.insights.max) {
    issues.push({
      code: 'STR-04',
      severity: 'warn',
      detail: `insights.length ${artifact.insights.length} > ${STRATEGIC_SYNTHESIS_MIN_QUOTAS.insights.max}`,
      where: 'artifact.insights',
    });
  }

  // STR-05: opportunities count
  if (artifact.opportunities.length < STRATEGIC_SYNTHESIS_MIN_QUOTAS.opportunities.min) {
    issues.push({
      code: 'STR-05',
      severity: 'block',
      detail: `opportunities.length ${artifact.opportunities.length} < ${STRATEGIC_SYNTHESIS_MIN_QUOTAS.opportunities.min}`,
      where: 'artifact.opportunities',
    });
  }
  if (artifact.opportunities.length > STRATEGIC_SYNTHESIS_MIN_QUOTAS.opportunities.max) {
    issues.push({
      code: 'STR-05',
      severity: 'warn',
      detail: `opportunities.length ${artifact.opportunities.length} > ${STRATEGIC_SYNTHESIS_MIN_QUOTAS.opportunities.max}`,
      where: 'artifact.opportunities',
    });
  }

  // STR-06: each insight must have at least 1 factRef AND at least 1 needRef
  for (let i = 0; i < artifact.insights.length; i += 1) {
    const ins = artifact.insights[i];
    if (!ins) continue;
    if (ins.factRefs.length === 0) {
      issues.push({
        code: 'STR-06',
        severity: 'block',
        detail: `insights[${i}].factRefs must not be empty`,
        where: `insights[${i}]`,
      });
    }
    if (ins.needRefs.length === 0) {
      issues.push({
        code: 'STR-06',
        severity: 'block',
        detail: `insights[${i}].needRefs must not be empty`,
        where: `insights[${i}]`,
      });
    }
  }

  // STR-07: each opportunity must have at least 1 insightRef
  for (let i = 0; i < artifact.opportunities.length; i += 1) {
    const opp = artifact.opportunities[i];
    if (!opp) continue;
    if (opp.insightRefs.length === 0) {
      issues.push({
        code: 'STR-07',
        severity: 'block',
        detail: `opportunities[${i}].insightRefs must not be empty`,
        where: `opportunities[${i}]`,
      });
    }
  }

  // STR-08: sourceMap.legacyVisualEvidenceExcluded must be non-empty
  if (artifact.sourceMap.legacyVisualEvidenceExcluded.length === 0) {
    issues.push({
      code: 'STR-08',
      severity: 'block',
      detail: 'sourceMap.legacyVisualEvidenceExcluded must not be empty (positive authority audit trail)',
      where: 'artifact.sourceMap',
    });
  }

  // CI-W1C.7.4-R2 PART D — planningClaimRefs structural check.
  // The parser already enforces the string[] type; this is a
  // belt-and-suspenders safety net for direct-construct paths.
  for (const i of artifact.insights) {
    if (!Array.isArray(i.planningClaimRefs) || i.planningClaimRefs.some((r) => typeof r !== 'string')) {
      issues.push({
        code: 'STR-09',
        severity: 'block',
        detail: `insights[${i.id}].planningClaimRefs must be a string array`,
        where: `insights[${i.id}]`,
      });
    }
  }
  for (const t of artifact.tensions) {
    if (!Array.isArray(t.planningClaimRefs) || t.planningClaimRefs.some((r) => typeof r !== 'string')) {
      issues.push({
        code: 'STR-09',
        severity: 'block',
        detail: `tensions[${t.id}].planningClaimRefs must be a string array`,
        where: `tensions[${t.id}]`,
      });
    }
  }
  for (const o of artifact.opportunities) {
    if (!Array.isArray(o.planningClaimRefs) || o.planningClaimRefs.some((r) => typeof r !== 'string')) {
      issues.push({
        code: 'STR-09',
        severity: 'block',
        detail: `opportunities[${o.id}].planningClaimRefs must be a string array`,
        where: `opportunities[${o.id}]`,
      });
    }
  }
  if (!Array.isArray(artifact.projectUnderstanding.planningClaimRefs) || artifact.projectUnderstanding.planningClaimRefs.some((r) => typeof r !== 'string')) {
    issues.push({
      code: 'STR-09',
      severity: 'block',
      detail: 'projectUnderstanding.planningClaimRefs must be a string array',
      where: 'projectUnderstanding',
    });
  }
  if (!Array.isArray(artifact.sourceMap.planningClaims) || artifact.sourceMap.planningClaims.some((r) => typeof r !== 'string')) {
    issues.push({
      code: 'STR-09',
      severity: 'block',
      detail: 'sourceMap.planningClaims must be a string array',
      where: 'sourceMap',
    });
  }

  const blockedCodes = issues.filter((i) => i.severity === 'block').map((i) => i.code);
  const warningCodes = issues.filter((i) => i.severity === 'warn').map((i) => i.code);
  return {
    passed: blockedCodes.length === 0,
    issues,
    blockedCodes,
    warningCodes,
  };
}
