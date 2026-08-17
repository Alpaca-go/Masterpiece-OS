/**
 * Deterministic Insight derivation.
 *
 * Spec #7: grounded strategic implications only.
 * Spec #21: every Insight has needRefs>0 AND factRefs>0.
 *           evidenceRefs>0 if source facts are evidence-eligible.
 * Spec #22: NO new model call.
 *
 * 4 grounded insight rules:
 *   1. identity-grounded insight (brand.name confirmed)
 *   2. business-model-grounded insight (business.model + business.industry)
 *   3. differentiation insight (brand.role + business.industry + differentiation need)
 *   4. unknown-aware insight (audience/business unknown → provisional)
 *   5. conflict-aware insight (identity conflict → blocked)
 *   6. system/asset insight (locked assets → preservation, no redesign)
 *
 * Pure functions only.
 */

import type {
  InsightItem,
  InsightType,
  InsightStatus,
  InsightDiagnostic,
} from './contracts.ts';
import { INSIGHT_TRACE_VERSION } from './contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import { PROJECT_TRUTH_KEYS } from '../truth/key-registry.ts';
import type { ProjectTruthFact } from '../truth/contracts.ts';

function insightId(type: InsightType, key: string, suffix: string): string {
  return `insight:${type}:${key}:${suffix}`;
}

function makeInsight(input: {
  type: InsightType;
  statement: string;
  implication: string;
  opportunityHint?: string;
  needRefs: string[];
  factRefs: string[];
  evidenceRefs: string[];
  status: InsightStatus;
  referenceFactIds: Set<string>;
  confidence?: number;
}): InsightItem {
  // Reference contamination guard.
  const hasReference = input.factRefs.some((id) => input.referenceFactIds.has(id));
  if (hasReference) {
    return {
      id: insightId(input.type, input.factRefs[0] ?? 'unknown', 'ref-blocked'),
      type: input.type,
      statement: input.statement,
      implication: input.implication,
      opportunityHint: input.opportunityHint,
      needRefs: input.needRefs,
      factRefs: input.factRefs,
      evidenceRefs: input.evidenceRefs,
      status: 'blocked',
      confidence: input.confidence,
      generatedBy: 'deterministic_rule',
      traceVersion: INSIGHT_TRACE_VERSION,
    };
  }
  return {
    id: insightId(input.type, input.factRefs[0] ?? 'unknown', input.status === 'blocked' ? 'blocked' : 'ok'),
    type: input.type,
    statement: input.statement,
    implication: input.implication,
    opportunityHint: input.opportunityHint,
    needRefs: input.needRefs,
    factRefs: input.factRefs,
    evidenceRefs: input.evidenceRefs,
    status: input.status,
    confidence: input.confidence,
    generatedBy: 'deterministic_rule',
    traceVersion: INSIGHT_TRACE_VERSION,
  };
}

export interface DeriveInsightInput {
  needs: NeedItem[];
  facts: ProjectTruthFact[];
  evidenceIds: Set<string>;
  referenceFactIds: Set<string>;
  blockedNeedIds: Set<string>;
}

export function deriveInsights(input: DeriveInsightInput): {
  insights: InsightItem[];
  diagnostics: InsightDiagnostic[];
} {
  const insights: InsightItem[] = [];
  const diagnostics: InsightDiagnostic[] = [];
  const { needs, facts, evidenceIds, referenceFactIds, blockedNeedIds } = input;

  // Build a quick fact lookup by canonical key (current-project only).
  const factsByKey = new Map<string, ProjectTruthFact[]>();
  for (const f of facts) {
    if (f.isReferenceFact) continue;
    const list = factsByKey.get(f.key) ?? [];
    list.push(f);
    factsByKey.set(f.key, list);
  }

  const factIdsForKey = (key: string): { ids: string[]; evidence: string[]; confidence?: number } => {
    const list = factsByKey.get(key) ?? [];
    const ids = list.map((f) => f.id);
    const ev = list.flatMap((f) => f.evidenceRefs);
    const confidences = list.map((f) => f.confidence).filter((c): c is number => c !== undefined);
    return { ids, evidence: ev, confidence: confidences.length > 0 ? Math.max(...confidences) : undefined };
  };

  const needByType = new Map<string, NeedItem[]>();
  for (const n of needs) {
    const list = needByType.get(n.type) ?? [];
    list.push(n);
    needByType.set(n.type, list);
  }

  // ── Rule 1: identity-grounded (brand.name + brand.role confirmed) ──

  const brandIds = factIdsForKey(PROJECT_TRUTH_KEYS.BRAND_NAME);
  const brandRoleIds = factIdsForKey(PROJECT_TRUTH_KEYS.BRAND_ROLE);
  if (brandIds.ids.length > 0 && brandRoleIds.ids.length > 0) {
    const identityNeeds = needByType.get('identity') ?? [];
    if (identityNeeds.length > 0) {
      const candidate = makeInsight({
        type: 'identity',
        statement: 'Confirmed brand name + role anchor a stable identity space.',
        implication: 'Strategic territory lies in strengthening and preserving identity, not in re-categorization.',
        opportunityHint: 'identity-preservation',
        needRefs: identityNeeds.map((n) => n.id),
        factRefs: [...brandIds.ids, ...brandRoleIds.ids],
        evidenceRefs: brandIds.evidence.filter((e) => evidenceIds.has(e)),
        status: 'grounded',
        referenceFactIds,
        confidence: brandIds.confidence ?? brandRoleIds.confidence,
      });
      insights.push(candidate);
    }
  }

  // ── Rule 2: business-model-grounded ──

  const bizIds = factIdsForKey(PROJECT_TRUTH_KEYS.BUSINESS_MODEL);
  if (bizIds.ids.length > 0) {
    const businessNeeds = needByType.get('business') ?? [];
    if (businessNeeds.length > 0) {
      const candidate = makeInsight({
        type: 'business',
        statement: 'Business model constrains which touchpoints and communication registers are appropriate.',
        implication: 'Strategic territory lies in expressing the value chain, not in generic promotion.',
        opportunityHint: 'business-communication',
        needRefs: businessNeeds.map((n) => n.id),
        factRefs: bizIds.ids,
        evidenceRefs: bizIds.evidence.filter((e) => evidenceIds.has(e)),
        status: 'grounded',
        referenceFactIds,
        confidence: bizIds.confidence,
      });
      insights.push(candidate);
    }
  }

  // ── Rule 3: differentiation ──

  const industryIds = factIdsForKey(PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY);
  if (brandRoleIds.ids.length > 0 && industryIds.ids.length > 0) {
    const diffNeeds = needByType.get('differentiation') ?? [];
    if (diffNeeds.length > 0) {
      const candidate = makeInsight({
        type: 'differentiation',
        statement: 'Brand role + industry together define a differentiation space away from category clichés.',
        implication: 'Strategic territory is occupied by category-defying, not category-mimicking, choices.',
        opportunityHint: 'differentiation',
        needRefs: diffNeeds.map((n) => n.id),
        factRefs: [...brandRoleIds.ids, ...industryIds.ids],
        evidenceRefs: brandRoleIds.evidence.filter((e) => evidenceIds.has(e)),
        status: 'grounded',
        referenceFactIds,
        confidence: brandRoleIds.confidence ?? industryIds.confidence,
      });
      insights.push(candidate);
    }
  }

  // ── Rule 4: unknown-aware (audience unknown → provisional) ──

  const audienceFacts = (factsByKey.get(PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY) ?? [])
    .filter((f) => !f.isReferenceFact);
  const audienceKnown = audienceFacts.some(
    (f) => f.value !== null && f.truthClass !== 'unknown',
  );
  if (!audienceKnown) {
    // Spec #21: "Unknown audience → provisional Insight" — any clarification
    // need about audience / business / brand identity qualifies, including
    // blocked needs (the insight is itself provisional).
    const clarificationNeeds = needs.filter((n) => n.type === 'clarification');
    if (clarificationNeeds.length > 0) {
      insights.push(makeInsight({
        type: 'audience',
        statement: 'Audience authority is not yet available; emotional and lifestyle interpretation must remain provisional.',
        implication: 'Strategic territory is restricted to brand-identity and product-mechanic territory until audience is confirmed.',
        opportunityHint: 'audience-clarity',
        needRefs: clarificationNeeds.map((n) => n.id),
        factRefs: clarificationNeeds.flatMap((n) => n.factRefs),
        evidenceRefs: [],
        status: 'provisional',
        referenceFactIds,
      }));
    }
  } else {
    // Audience known → strategic clarity insight
    const audienceIds = factIdsForKey(PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY);
    const audienceNeeds = needByType.get('audience') ?? [];
    if (audienceNeeds.length > 0) {
      insights.push(makeInsight({
        type: 'audience',
        statement: 'Confirmed audience enables targeted strategic communication.',
        implication: 'Strategic territory includes language register and reference vocabulary for the audience.',
        opportunityHint: 'audience-clarity',
        needRefs: audienceNeeds.map((n) => n.id),
        factRefs: audienceIds.ids,
        evidenceRefs: audienceIds.evidence.filter((e) => evidenceIds.has(e)),
        status: 'grounded',
        referenceFactIds,
        confidence: audienceIds.confidence,
      }));
    }
  }

  // ── Rule 5: conflict-aware (identity conflict → blocked) ──

  const conflictNeeds = needs.filter((n) => n.type === 'risk' && n.conflictRefs.length > 0);
  if (conflictNeeds.length > 0) {
    for (const cn of conflictNeeds) {
      insights.push(makeInsight({
        type: 'risk',
        statement: 'Identity / business facts are in conflict; further strategic claims must be deferred until the conflict is resolved.',
        implication: 'No opportunity territory can be claimed while the conflict is open; resolving it is the precondition.',
        opportunityHint: 'risk-reduction',
        needRefs: [cn.id],
        factRefs: cn.factRefs,
        evidenceRefs: cn.evidenceRefs.filter((e) => evidenceIds.has(e)),
        status: 'blocked',
        referenceFactIds,
      }));
    }
  }

  // ── Rule 6: system/asset preservation (locked assets) ──

  const lockFactIds = facts
    .filter((f) => f.authority === 'LOCKED' && !f.isReferenceFact)
    .map((f) => f.id);
  const lockEv = facts
    .filter((f) => f.authority === 'LOCKED' && !f.isReferenceFact)
    .flatMap((f) => f.evidenceRefs);
  if (lockFactIds.length >= 2) {
    // Strong locked identity (>=2 locked identity facts) → system/asset insight
    // per spec #21 "Strong locked identity" example.
    const preservationNeeds = needByType.get('preservation') ?? [];
    if (preservationNeeds.length > 0) {
      insights.push(makeInsight({
        type: 'asset',
        statement: 'Strong locked identity assets imply the creative opportunity lies in system and context transformation rather than redesigning core identity assets.',
        implication: 'Strategic territory is system/context transformation, not asset-level redesign.',
        opportunityHint: 'asset-activation',
        needRefs: preservationNeeds.map((n) => n.id),
        factRefs: lockFactIds,
        evidenceRefs: lockEv.filter((e) => evidenceIds.has(e)),
        status: 'grounded',
        referenceFactIds,
      }));
    }
  }

  // Trace validation (spec #20 hard rule).
  for (const ins of insights) {
    if (ins.needRefs.length === 0) {
      diagnostics.push({
        code: 'INSIGHT_WITHOUT_NEED_TRACE',
        message: `Insight ${ins.id} has no needRefs.`,
        insightId: ins.id,
      });
    }
    if (ins.factRefs.length === 0) {
      diagnostics.push({
        code: 'INSIGHT_WITHOUT_FACT_TRACE',
        message: `Insight ${ins.id} has no factRefs.`,
        insightId: ins.id,
      });
    }
    if (ins.status === 'grounded' && ins.evidenceRefs.length === 0) {
      // For evidence-eligible source facts, we want evidenceRefs > 0.
      // If the underlying fact has no evidence, we leave the insight grounded
      // but mark a soft diagnostic.
      diagnostics.push({
        code: 'INSIGHT_UNGROUNDED',
        message: `Insight ${ins.id} is grounded but has no evidenceRefs.`,
        insightId: ins.id,
      });
    }
    if (ins.factRefs.some((id) => referenceFactIds.has(id)) && ins.status !== 'blocked') {
      diagnostics.push({
        code: 'INSIGHT_REFERENCE_CONTAMINATION',
        message: `Insight ${ins.id} has reference fact but is not blocked.`,
        insightId: ins.id,
      });
    }
  }

  return { insights, diagnostics };
}

export function dedupeAndSortInsights(
  insights: InsightItem[],
): { insights: InsightItem[]; diagnostics: InsightDiagnostic[] } {
  const diagnostics: InsightDiagnostic[] = [];
  const grouped = new Map<string, InsightItem>();
  const order: string[] = [];
  for (const ins of insights) {
    const k = `${ins.type}::${ins.statement.toLowerCase().trim()}`;
    const existing = grouped.get(k);
    if (!existing) {
      grouped.set(k, {
        ...ins,
        needRefs: [...ins.needRefs],
        factRefs: [...ins.factRefs],
        evidenceRefs: [...ins.evidenceRefs],
      });
      order.push(k);
    } else {
      diagnostics.push({
        code: 'DUPLICATE_INSIGHT',
        message: `Insight "${ins.statement}" deduplicated with existing ${existing.id}.`,
        insightId: existing.id,
      });
      grouped.set(k, {
        ...existing,
        status: existing.status === 'blocked' || ins.status === 'blocked' ? 'blocked'
              : existing.status === 'provisional' || ins.status === 'provisional' ? 'provisional'
              : 'grounded',
        needRefs: Array.from(new Set([...existing.needRefs, ...ins.needRefs])).sort(),
        factRefs: Array.from(new Set([...existing.factRefs, ...ins.factRefs])).sort(),
        evidenceRefs: Array.from(new Set([...existing.evidenceRefs, ...ins.evidenceRefs])).sort(),
      });
    }
  }
  // Stable order: type → id.
  const sorted = order
    .map((k) => grouped.get(k)!)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type < b.type ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
  return { insights: sorted, diagnostics };
}
