/**
 * Deterministic Need derivation rules.
 *
 * Spec #14: NeedRule interface — applies() + derive() over a context.
 *           8 rules covering identity / business / audience / differentiation
 *           / constraints / locked / clarification (unknown) / risk (conflict).
 *
 * Spec #4:  NO MODEL CALL. All deterministic.
 * Spec #10-#11: every Need is traceable to a fact/evidence/conflict ref.
 * Spec #12: Need taxonomy: communication / identity / business / audience /
 *           differentiation / constraint / preservation / clarification / risk.
 *
 * Pure functions only.
 */

import type {
  NeedItem,
  NeedDerivationContext,
  NeedRule,
  NeedType,
  NeedStatus,
  NeedPriority,
  NeedDiagnostic,
} from './contracts.ts';
import { NEED_TRACE_VERSION } from './contracts.ts';
import {
  PROJECT_TRUTH_KEYS,
  IDENTITY_KEYS,
  LOCKED_KEYS,
} from '../truth/key-registry.ts';
import type { ProjectTruthFact } from '../truth/contracts.ts';

function needId(type: NeedType, key: string, suffix: string): string {
  return `need:${type}:${key}:${suffix}`;
}

function makeNeed(input: {
  type: NeedType;
  statement: string;
  whyItMatters: string;
  status: NeedStatus;
  priority: NeedPriority;
  factIds: string[];
  evidenceIds: string[];
  conflictIds: string[];
  sourceKinds: string[];
  confidence?: number;
  referenceFactIds: Set<string>;
}): NeedItem {
  // Reference contamination guard (spec #34): any fact that is reference-derived
  // must not produce a current-project need. If any fact is reference, downgrade
  // to blocked and tag it for the trace validator.
  const hasReference = input.factIds.some((id) => input.referenceFactIds.has(id));
  if (hasReference) {
    return {
      id: needId(input.type, input.factIds[0] ?? 'unknown', 'ref-blocked'),
      type: input.type,
      statement: input.statement,
      whyItMatters: input.whyItMatters,
      status: 'blocked',
      priority: input.priority,
      factRefs: input.factIds,
      evidenceRefs: input.evidenceIds,
      conflictRefs: input.conflictIds,
      sourceKinds: input.sourceKinds,
      confidence: input.confidence,
      generatedBy: 'deterministic_rule',
      traceVersion: NEED_TRACE_VERSION,
    };
  }
  return {
    id: needId(input.type, input.factIds[0] ?? 'unknown', input.priority === 3 ? 'critical' : input.priority === 2 ? 'important' : 'supporting'),
    type: input.type,
    statement: input.statement,
    whyItMatters: input.whyItMatters,
    status: input.status,
    priority: input.priority,
    factRefs: input.factIds,
    evidenceRefs: input.evidenceIds,
    conflictRefs: input.conflictIds,
    sourceKinds: input.sourceKinds,
    confidence: input.confidence,
    generatedBy: 'deterministic_rule',
    traceVersion: NEED_TRACE_VERSION,
  };
}

// ── Rule 1: identity preservation ──

const identityPreservationRule: NeedRule = {
  id: 'rule-identity-preservation',
  applies(ctx) {
    // Spec #13: "brand.name confirmed" — i.e. a non-unknown brand.name fact
    // is present and not reference-derived. CI-2 carriers may emit
    // USER_CONFIRMED (ProjectRecord with explicit user input) or
    // AUTHORITATIVE_DOCUMENT_FACT / AUTHORITATIVE_PROJECT_METADATA
    // (document / project-level metadata). All count as confirmed.
    return ctx.facts.some(
      (f) => (f.key === PROJECT_TRUTH_KEYS.BRAND_NAME || f.key === PROJECT_TRUTH_KEYS.BRAND_ROLE)
        && f.value !== null
        && f.truthClass !== 'unknown'
        && !f.isReferenceFact,
    );
  },
  derive(ctx) {
    const factIds: string[] = [];
    const sourceKinds = new Set<string>();
    let confidence: number | undefined;
    for (const f of ctx.facts) {
      if (f.key === PROJECT_TRUTH_KEYS.BRAND_NAME || f.key === PROJECT_TRUTH_KEYS.BRAND_ROLE) {
        if (f.value !== null && f.truthClass !== 'unknown' && !f.isReferenceFact) {
          factIds.push(f.id);
          sourceKinds.add(f.sourceType);
          if (f.confidence !== undefined) {
            confidence = Math.max(confidence ?? 0, f.confidence);
          }
        }
      }
    }
    if (factIds.length === 0) return [];
    return [makeNeed({
      type: 'identity',
      statement: 'Preserve current brand identity and prevent reinterpretation as another category or brand.',
      whyItMatters: 'Confirmed brand name/role facts anchor all downstream communication; any drift introduces category misread risk.',
      status: 'required',
      priority: 3,
      factIds,
      evidenceIds: [],
      conflictIds: [],
      sourceKinds: [...sourceKinds],
      confidence,
      referenceFactIds: ctx.referenceFactIds,
    })];
  },
};

// ── Rule 2: locked preservation ──

const lockedPreservationRule: NeedRule = {
  id: 'rule-locked-preservation',
  applies(ctx) {
    return ctx.lockedKeys.size > 0;
  },
  derive(ctx) {
    const factIds: string[] = [];
    const sourceKinds = new Set<string>();
    for (const f of ctx.facts) {
      if (f.authority === 'LOCKED' && !f.isReferenceFact && LOCKED_KEYS.includes(f.key as never)) {
        factIds.push(f.id);
        sourceKinds.add(f.sourceType);
      }
    }
    if (factIds.length === 0) return [];
    return [makeNeed({
      type: 'preservation',
      statement: 'Locked assets and locked facts must remain unchanged across downstream creative interpretation.',
      whyItMatters: 'Lock state is the strongest authority; any change invalidates user / system intent.',
      status: 'required',
      priority: 3,
      factIds,
      evidenceIds: [],
      conflictIds: [],
      sourceKinds: [...sourceKinds],
      referenceFactIds: ctx.referenceFactIds,
    })];
  },
};

// ── Rule 3: business model communication ──

const businessCommunicationRule: NeedRule = {
  id: 'rule-business-communication',
  applies(ctx) {
    return Array.from(ctx.facts)
      .some((f) => f.key === PROJECT_TRUTH_KEYS.BUSINESS_MODEL && f.value !== null && !f.isReferenceFact);
  },
  derive(ctx) {
    const factIds: string[] = [];
    const sourceKinds = new Set<string>();
    for (const f of ctx.facts) {
      if (f.key === PROJECT_TRUTH_KEYS.BUSINESS_MODEL && f.value !== null && !f.isReferenceFact) {
        factIds.push(f.id);
        sourceKinds.add(f.sourceType);
      }
    }
    if (factIds.length === 0) return [];
    return [makeNeed({
      type: 'business',
      statement: 'Communicate the business model clearly so downstream design can support the value chain.',
      whyItMatters: 'Business model facts constrain which audiences, touchpoints, and visuals are appropriate.',
      status: 'important',
      priority: 2,
      factIds,
      evidenceIds: [],
      conflictIds: [],
      sourceKinds: [...sourceKinds],
      referenceFactIds: ctx.referenceFactIds,
    })];
  },
};

// ── Rule 4: audience requirement ──

const audienceRequirementRule: NeedRule = {
  id: 'rule-audience-requirement',
  applies(ctx) {
    return Array.from(ctx.facts)
      .some((f) => f.key === PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY
        && Array.isArray(f.value) && (f.value as unknown[]).length > 0
        && !f.isReferenceFact);
  },
  derive(ctx) {
    const factIds: string[] = [];
    const sourceKinds = new Set<string>();
    for (const f of ctx.facts) {
      if (f.key === PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY
        && Array.isArray(f.value) && (f.value as unknown[]).length > 0
        && !f.isReferenceFact) {
        factIds.push(f.id);
        sourceKinds.add(f.sourceType);
      }
    }
    if (factIds.length === 0) return [];
    return [makeNeed({
      type: 'audience',
      statement: 'Audience-specific creative decisions must remain conditional until target audience is confirmed.',
      whyItMatters: 'Audience facts drive emotional register, language register, and reference vocabulary.',
      status: 'important',
      priority: 2,
      factIds,
      evidenceIds: [],
      conflictIds: [],
      sourceKinds: [...sourceKinds],
      referenceFactIds: ctx.referenceFactIds,
    })];
  },
};

// ── Rule 5: differentiation (brand role + industry) ──

const differentiationRule: NeedRule = {
  id: 'rule-differentiation',
  applies(ctx) {
    const hasBrandRole = ctx.facts.some((f) => f.key === PROJECT_TRUTH_KEYS.BRAND_ROLE && f.value && !f.isReferenceFact);
    const hasIndustry = ctx.facts.some((f) => f.key === PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY && f.value && !f.isReferenceFact);
    return hasBrandRole && hasIndustry;
  },
  derive(ctx) {
    const factIds: string[] = [];
    const sourceKinds = new Set<string>();
    for (const f of ctx.facts) {
      if ((f.key === PROJECT_TRUTH_KEYS.BRAND_ROLE || f.key === PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY)
        && f.value && !f.isReferenceFact) {
        factIds.push(f.id);
        sourceKinds.add(f.sourceType);
      }
    }
    if (factIds.length === 0) return [];
    return [makeNeed({
      type: 'differentiation',
      statement: 'Differentiate from generic category expression so the brand does not blend with industry clichés.',
      whyItMatters: 'Brand role + industry together define the differentiation space.',
      status: 'important',
      priority: 2,
      factIds,
      evidenceIds: [],
      conflictIds: [],
      sourceKinds: [...sourceKinds],
      referenceFactIds: ctx.referenceFactIds,
    })];
  },
};

// ── Rule 6: constraints (prohibited directions) ──

const constraintsRule: NeedRule = {
  id: 'rule-constraints',
  applies(ctx) {
    return Array.from(ctx.facts)
      .some((f) => f.key === PROJECT_TRUTH_KEYS.CONSTRAINT_PROHIBITED_DIRECTIONS
        && Array.isArray(f.value) && (f.value as unknown[]).length > 0
        && !f.isReferenceFact);
  },
  derive(ctx) {
    const factIds: string[] = [];
    const sourceKinds = new Set<string>();
    for (const f of ctx.facts) {
      if (f.key === PROJECT_TRUTH_KEYS.CONSTRAINT_PROHIBITED_DIRECTIONS
        && Array.isArray(f.value) && (f.value as unknown[]).length > 0
        && !f.isReferenceFact) {
        factIds.push(f.id);
        sourceKinds.add(f.sourceType);
      }
    }
    if (factIds.length === 0) return [];
    return [makeNeed({
      type: 'constraint',
      statement: 'Honor prohibited directions as hard boundaries in downstream creative interpretation.',
      whyItMatters: 'Prohibited directions are explicit negative constraints; violating them produces a category misread or a brand-incompatible output.',
      status: 'required',
      priority: 3,
      factIds,
      evidenceIds: [],
      conflictIds: [],
      sourceKinds: [...sourceKinds],
      referenceFactIds: ctx.referenceFactIds,
    })];
  },
};

// ── Rule 7: clarification (unknown audience / business_model) ──

const clarificationRule: NeedRule = {
  id: 'rule-clarification',
  applies(ctx) {
    return ctx.unknownKeys.has(PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY)
      || ctx.unknownKeys.has(PROJECT_TRUTH_KEYS.BUSINESS_MODEL)
      || ctx.unknownKeys.has(PROJECT_TRUTH_KEYS.BRAND_NAME);
  },
  derive(ctx) {
    const factIds: string[] = [];
    const sourceKinds = new Set<string>();
    for (const f of ctx.facts) {
      if ((f.truthClass === 'unknown' || f.value === null) && !f.isReferenceFact) {
        if (f.key === PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY
          || f.key === PROJECT_TRUTH_KEYS.BUSINESS_MODEL
          || f.key === PROJECT_TRUTH_KEYS.BRAND_NAME) {
          factIds.push(f.id);
          sourceKinds.add(f.sourceType);
        }
      }
    }
    if (factIds.length === 0) return [];
    return [makeNeed({
      type: 'clarification',
      statement: 'Audience/business-model/brand identity must be confirmed before downstream creative direction can be considered firm.',
      whyItMatters: 'Unknown on these keys makes downstream strategic claims provisional; resolving them is a precondition.',
      status: 'blocked',
      priority: 3,
      factIds,
      evidenceIds: [],
      conflictIds: [],
      sourceKinds: [...sourceKinds],
      referenceFactIds: ctx.referenceFactIds,
    })];
  },
};

// ── Rule 8: risk (conflict on identity / business) ──

const conflictRiskRule: NeedRule = {
  id: 'rule-conflict-risk',
  applies(ctx) {
    return Array.from(ctx.conflictIds).some((id) => {
      // Conflict ids include the canonical key. We re-derive the
      // base key from the id for evaluation; cheaper: the id starts
      // with `<type>:<key>:...` and the key is one of IDENTITY_KEYS.
      return IDENTITY_KEYS.some((k) => id.includes(k));
    });
  },
  derive(ctx) {
    const factIds: string[] = [];
    const sourceKinds = new Set<string>();
    for (const cid of ctx.conflictIds) {
      const key = IDENTITY_KEYS.find((k) => cid.includes(k));
      if (!key) continue;
      for (const f of ctx.facts) {
        if (f.key === key && !f.isReferenceFact) {
          factIds.push(f.id);
          sourceKinds.add(f.sourceType);
        }
      }
    }
    if (factIds.length === 0) return [];
    return [makeNeed({
      type: 'risk',
      statement: 'Resolve or explicitly preserve ambiguity around identity / business model before direction generation.',
      whyItMatters: 'Open conflict on identity or business facts would otherwise be silently selected and could produce a confident but wrong strategic claim.',
      status: 'blocked',
      priority: 3,
      factIds,
      evidenceIds: [],
      conflictIds: [...ctx.conflictIds].filter((id) =>
        IDENTITY_KEYS.some((k) => id.includes(k))
      ),
      sourceKinds: [...sourceKinds],
      referenceFactIds: ctx.referenceFactIds,
    })];
  },
};

export const NEED_RULES: NeedRule[] = [
  identityPreservationRule,
  lockedPreservationRule,
  businessCommunicationRule,
  audienceRequirementRule,
  differentiationRule,
  constraintsRule,
  clarificationRule,
  conflictRiskRule,
];

export function buildDerivationContext(
  facts: ProjectTruthFact[],
  evidenceIds: Set<string>,
  conflictIds: Set<string>,
  unknownKeys: Set<string>,
  sourceKinds: Set<string>,
  lockedKeys: Set<string>,
  userConfirmedIdentity: Set<string>,
  referenceFactIds: Set<string>,
): NeedDerivationContext {
  return {
    facts,
    evidenceIds,
    conflictIds,
    unknownKeys,
    sourceKinds,
    lockedKeys,
    userConfirmedIdentity,
    referenceFactIds,
  };
}

export function deriveNeeds(ctx: NeedDerivationContext): { needs: NeedItem[]; diagnostics: NeedDiagnostic[] } {
  const needs: NeedItem[] = [];
  const diagnostics: NeedDiagnostic[] = [];
  for (const rule of NEED_RULES) {
    if (!rule.applies(ctx)) continue;
    try {
      const out = rule.derive(ctx);
      for (const n of out) {
        // Hard invariant: every Need must have at least one factRef.
        if (n.factRefs.length === 0) {
          diagnostics.push({
            code: 'NEED_WITHOUT_FACT_TRACE',
            message: `Need ${n.id} has no factRefs.`,
            needId: n.id,
          });
          continue;
        }
        // Reference contamination guard: any factRef that is reference-derived
        // causes the need to be status='blocked' (already handled in makeNeed).
        // We also re-check here in case the rule produced a non-blocked need
        // with a reference fact.
        if (
          n.factRefs.some((id) => ctx.referenceFactIds.has(id))
          && n.status !== 'blocked'
        ) {
          diagnostics.push({
            code: 'NEED_WITHOUT_FACT_TRACE',
            message: `Need ${n.id} references a reference-derived fact but is not blocked.`,
            needId: n.id,
          });
        }
        needs.push(n);
      }
    } catch (e) {
      diagnostics.push({
        code: 'UNSUPPORTED_NEED_TYPE',
        message: `Rule ${rule.id} failed: ${(e as Error).message}`,
      });
    }
  }
  return { needs, diagnostics };
}
