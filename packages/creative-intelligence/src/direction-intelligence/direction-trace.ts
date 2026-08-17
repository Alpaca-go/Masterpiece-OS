/**
 * Direction trace validation (CI-6 Step 3, 12, 13).
 *
 * Every valid Direction requires:
 *   conceptRefs.length >= 1
 *   opportunityRefs.length >= 1
 *   insightRefs.length >= 1
 *   needRefs.length >= 1
 *   factRefs.length >= 1
 *
 * Transitive closure: Direction → Concept → Opportunity → Insight → Need → Fact → Evidence.
 *
 * Direction trace integrity target = 100%.
 *
 * Status propagation:
 *   blocked Concept → Direction status = blocked
 *   provisional Concept → Direction max status = provisional
 *   grounded Concept → Direction may be grounded
 */

import type {
  CreativeDirectionCandidate,
  DirectionTraceIssue,
  TraceValidationResult,
} from './contracts.ts';
import type { ConceptCandidate } from '../concept-intelligence/contracts.ts';
import type { OpportunityItem } from '../opportunity/contracts.ts';
import type { InsightItem } from '../insight-intelligence/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { ProjectTruthFact } from '../truth/contracts.ts';
import type { EvidenceLedgerEntry } from '../evidence/contracts.ts';

export interface DirectionTraceContext {
  directions: CreativeDirectionCandidate[];
  concepts: ConceptCandidate[];
  opportunities: OpportunityItem[];
  insights: InsightItem[];
  needs: NeedItem[];
  facts: ProjectTruthFact[];
  evidence: EvidenceLedgerEntry[];
}

export function validateDirectionTrace(ctx: DirectionTraceContext): TraceValidationResult {
  const { directions, concepts, opportunities, insights, needs, facts, evidence } = ctx;

  const conceptIds = new Set(concepts.map((c) => c.id));
  const oppIds = new Set(opportunities.map((o) => o.id));
  const insightIds = new Set(insights.map((i) => i.id));
  const needIds = new Set(needs.map((n) => n.id));
  const factIds = new Set(facts.map((f) => f.id));
  const evidenceIds = new Set(evidence.map((e) => e.id));

  const issues: DirectionTraceIssue[] = [];
  const perDirection: Record<string, { grounded: boolean; issueCount: number }> = {};

  for (const direction of directions) {
    let grounded = true;
    let issueCount = 0;

    // Minimum ref counts
    if (direction.conceptRefs.length === 0) {
      issues.push({
        directionId: direction.id,
        code: 'DIRECTION_TRACE_MISSING',
        message: `${direction.id} 缺少 concept 引用`,
        refType: 'concept',
        severity: 'block',
      });
      grounded = false;
      issueCount++;
    }
    if (direction.opportunityRefs.length === 0) {
      issues.push({
        directionId: direction.id,
        code: 'DIRECTION_TRACE_MISSING',
        message: `${direction.id} 缺少 opportunity 引用`,
        refType: 'opportunity',
        severity: 'block',
      });
      grounded = false;
      issueCount++;
    }
    if (direction.insightRefs.length === 0) {
      issues.push({
        directionId: direction.id,
        code: 'DIRECTION_TRACE_MISSING',
        message: `${direction.id} 缺少 insight 引用`,
        refType: 'insight',
        severity: 'block',
      });
      grounded = false;
      issueCount++;
    }
    if (direction.needRefs.length === 0) {
      issues.push({
        directionId: direction.id,
        code: 'DIRECTION_TRACE_MISSING',
        message: `${direction.id} 缺少 need 引用`,
        refType: 'need',
        severity: 'block',
      });
      grounded = false;
      issueCount++;
    }
    if (direction.factRefs.length === 0) {
      issues.push({
        directionId: direction.id,
        code: 'DIRECTION_TRACE_MISSING',
        message: `${direction.id} 缺少 fact 引用`,
        refType: 'fact',
        severity: 'block',
      });
      grounded = false;
      issueCount++;
    }

    // Dangling ref checks
    for (const ref of direction.conceptRefs) {
      if (!conceptIds.has(ref)) {
        issues.push({
          directionId: direction.id,
          code: 'DIRECTION_DANGLING_REF',
          message: `${direction.id} 引用了不存在的 concept: ${ref}`,
          refType: 'concept',
          refId: ref,
          severity: 'block',
        });
        grounded = false;
        issueCount++;
      }
    }
    for (const ref of direction.opportunityRefs) {
      if (!oppIds.has(ref)) {
        issues.push({
          directionId: direction.id,
          code: 'DIRECTION_DANGLING_REF',
          message: `${direction.id} 引用了不存在的 opportunity: ${ref}`,
          refType: 'opportunity',
          refId: ref,
          severity: 'block',
        });
        grounded = false;
        issueCount++;
      }
    }
    for (const ref of direction.insightRefs) {
      if (!insightIds.has(ref)) {
        issues.push({
          directionId: direction.id,
          code: 'DIRECTION_DANGLING_REF',
          message: `${direction.id} 引用了不存在的 insight: ${ref}`,
          refType: 'insight',
          refId: ref,
          severity: 'block',
        });
        grounded = false;
        issueCount++;
      }
    }
    for (const ref of direction.needRefs) {
      if (!needIds.has(ref)) {
        issues.push({
          directionId: direction.id,
          code: 'DIRECTION_DANGLING_REF',
          message: `${direction.id} 引用了不存在的 need: ${ref}`,
          refType: 'need',
          refId: ref,
          severity: 'block',
        });
        grounded = false;
        issueCount++;
      }
    }
    for (const ref of direction.factRefs) {
      if (!factIds.has(ref)) {
        issues.push({
          directionId: direction.id,
          code: 'DIRECTION_DANGLING_REF',
          message: `${direction.id} 引用了不存在的 fact: ${ref}`,
          refType: 'fact',
          refId: ref,
          severity: 'block',
        });
        grounded = false;
        issueCount++;
      }
    }
    for (const ref of direction.evidenceRefs) {
      if (!evidenceIds.has(ref)) {
        issues.push({
          directionId: direction.id,
          code: 'DIRECTION_DANGLING_REF',
          message: `${direction.id} 引用了不存在的 evidence: ${ref}`,
          refType: 'evidence',
          refId: ref,
          severity: 'warning',
        });
        issueCount++;
      }
    }

    perDirection[direction.id] = { grounded, issueCount };
  }

  const fullyGrounded = Object.values(perDirection).filter((p) => p.grounded).length;

  return {
    valid: fullyGrounded === directions.length && directions.length > 0,
    totalDirections: directions.length,
    fullyGrounded,
    issues,
    perDirection,
  };
}

/**
 * Build transitive trace set for a direction: all reachable objects
 * through concept → opportunity → insight → need → fact → evidence.
 */
export function buildDirectionTransitiveTrace(
  direction: CreativeDirectionCandidate,
  ctx: DirectionTraceContext,
): {
  conceptIds: Set<string>;
  opportunityIds: Set<string>;
  insightIds: Set<string>;
  needIds: Set<string>;
  factIds: Set<string>;
  evidenceIds: Set<string>;
} {
  const conceptIds = new Set(direction.conceptRefs);
  const opportunityIds = new Set(direction.opportunityRefs);
  const insightIds = new Set(direction.insightRefs);
  const needIds = new Set(direction.needRefs);
  const factIds = new Set(direction.factRefs);
  const evidenceIds = new Set(direction.evidenceRefs);

  // Add trace from referenced concepts
  for (const concept of ctx.concepts) {
    if (conceptIds.has(concept.id)) {
      for (const ref of concept.opportunityRefs) opportunityIds.add(ref);
      for (const ref of concept.insightRefs) insightIds.add(ref);
      for (const ref of concept.needRefs) needIds.add(ref);
      for (const ref of concept.factRefs) factIds.add(ref);
      for (const ref of concept.evidenceRefs) evidenceIds.add(ref);
    }
  }

  // Add trace from opportunities
  for (const opp of ctx.opportunities) {
    if (opportunityIds.has(opp.id)) {
      for (const ref of opp.insightRefs) insightIds.add(ref);
      for (const ref of opp.needRefs) needIds.add(ref);
      for (const ref of opp.factRefs) factIds.add(ref);
      for (const ref of opp.evidenceRefs) evidenceIds.add(ref);
    }
  }

  // Add trace from insights
  for (const insight of ctx.insights) {
    if (insightIds.has(insight.id)) {
      for (const ref of insight.needRefs) needIds.add(ref);
      for (const ref of insight.factRefs) factIds.add(ref);
      for (const ref of insight.evidenceRefs) evidenceIds.add(ref);
    }
  }

  // Add trace from needs
  for (const need of ctx.needs) {
    if (needIds.has(need.id)) {
      for (const ref of need.factRefs) factIds.add(ref);
      for (const ref of need.evidenceRefs) evidenceIds.add(ref);
    }
  }

  return { conceptIds, opportunityIds, insightIds, needIds, factIds, evidenceIds };
}
