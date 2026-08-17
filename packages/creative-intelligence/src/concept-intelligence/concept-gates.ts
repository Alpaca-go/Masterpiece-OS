/**
 * Concept Gate Pipeline (Spec #8, #27-#33, #42-#45).
 *
 * Gate order:
 *   1. Trace Gate              — refs must resolve
 *   2. Brand Identity Gate     — no unauthorized brand identity
 *   3. Asset Authorization Gate — no unauthorized asset claims
 *   4. Unsupported Claim Gate  — factual claims must be grounded
 *   5. Value Coverage Gate     — must address critical need
 *   6. Reference Guard         — reference identity ≠ current identity
 *   7. Unknown/Conflict Gate   — unknown → provisional, conflict → blocked
 *   8. Direction Leakage Gate  — no visual direction / mechanism
 *
 * Output: pass | pass_with_warnings | blocked
 *
 * Lab invariant adaptation (Spec #9, #29-#33):
 *   brand-identity-preservation evaluator → ConceptBrandIdentityGate
 *   asset-authorization evaluator          → ConceptAssetAuthorizationGate
 *   consumer-value-coverage evaluator      → ConceptValueCoverageGate
 *   business-model-coverage evaluator      → (integrated into value coverage)
 *
 * We do NOT simply import or rename lab evaluators. We extract the semantic
 * invariant and rewrite as a lightweight Concept-level check.
 */

import type {
  ConceptCandidate,
  ConceptGateResult,
  ConceptGateIssue,
  ConceptGateName,
  ConceptGateStatus,
  ConceptSet,
} from './contracts.ts';
import type { OpportunityItem } from '../opportunity/contracts.ts';
import type { InsightItem } from '../insight-intelligence/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { ProjectTruthFact, ProjectTruthConflict } from '../truth/contracts.ts';
import type { EvidenceLedgerEntry } from '../evidence/contracts.ts';
import { PROJECT_TRUTH_KEYS } from '../truth/key-registry.ts';
import { buildTransitiveTrace, validateConceptTrace } from './concept-trace.ts';
import { detectConceptLeakage } from './concept-leakage.ts';

export interface GateContext {
  concept: ConceptCandidate;
  opportunities: OpportunityItem[];
  insights: InsightItem[];
  needs: NeedItem[];
  facts: ProjectTruthFact[];
  evidence: EvidenceLedgerEntry[];
  conflicts: ProjectTruthConflict[];
  /** Truth-level brand name value (if known). */
  expectedBrandName?: string;
  /** Truth-level brand role value (if known). */
  expectedBrandRole?: string;
}

function makeIssue(
  gate: ConceptGateName,
  conceptId: string,
  code: string,
  severity: 'warning' | 'block',
  message: string,
  factRefs?: string[],
  evidenceRefs?: string[],
): ConceptGateIssue {
  return { code, severity, message, conceptId, gate, factRefs, evidenceRefs };
}

function aggregateStatus(issues: ConceptGateIssue[]): ConceptGateStatus {
  if (issues.some((i) => i.severity === 'block')) return 'blocked';
  if (issues.some((i) => i.severity === 'warning')) return 'pass_with_warnings';
  return 'pass';
}

// ---------- Gate 1: Trace ----------

function runTraceGate(ctx: GateContext): ConceptGateIssue[] {
  const result = validateConceptTrace({
    concepts: [ctx.concept],
    opportunities: ctx.opportunities,
    insights: ctx.insights,
    needs: ctx.needs,
    facts: ctx.facts,
    evidence: ctx.evidence,
  });

  const issues: ConceptGateIssue[] = [];
  for (const issue of result.issues) {
    issues.push(makeIssue(
      'trace',
      ctx.concept.id,
      issue.code,
      issue.severity,
      issue.message,
    ));
  }

  // Also check: every opportunity ref must have at least one insight and need
  const trace = buildTransitiveTrace(ctx.concept, {
    concepts: [ctx.concept],
    opportunities: ctx.opportunities,
    insights: ctx.insights,
    needs: ctx.needs,
    facts: ctx.facts,
    evidence: ctx.evidence,
  });

  if (trace.insightIds.size === 0) {
    issues.push(makeIssue('trace', ctx.concept.id, 'NO_TRANSITIVE_INSIGHT', 'block',
      `${ctx.concept.id} 在追溯闭包中没有洞察`));
  }
  if (trace.needIds.size === 0) {
    issues.push(makeIssue('trace', ctx.concept.id, 'NO_TRANSITIVE_NEED', 'block',
      `${ctx.concept.id} 在追溯闭包中没有需求`));
  }
  if (trace.factIds.size === 0) {
    issues.push(makeIssue('trace', ctx.concept.id, 'NO_TRANSITIVE_FACT', 'block',
      `${ctx.concept.id} 在追溯闭包中没有事实`));
  }

  return issues;
}

// ---------- Gate 2: Brand Identity ----------
// Lab invariant: "Concept must not introduce a non-project brand identity."
// Adapted from brand-identity-preservation-evaluator.js — extracted semantic
// invariant only, removed direction-specific logic.

function runBrandIdentityGate(ctx: GateContext): ConceptGateIssue[] {
  const issues: ConceptGateIssue[] = [];
  const { concept, facts } = ctx;

  // Collect known brand names from project truth (authoritative, non-reference)
  const brandNameFacts = facts.filter((f) =>
    f.key === PROJECT_TRUTH_KEYS.BRAND_NAME
    && f.value !== null
    && f.truthClass !== 'unknown'
    && !f.isReferenceFact
    && (f.authority === 'USER_CONFIRMED' || f.authority === 'LOCKED'
      || f.authority === 'AUTHORITATIVE_DOCUMENT_FACT'
      || f.authority === 'AUTHORITATIVE_PROJECT_METADATA'),
  );

  const knownBrandNames = new Set<string>();
  for (const f of brandNameFacts) {
    if (typeof f.value === 'string') knownBrandNames.add(f.value);
  }
  if (ctx.expectedBrandName) knownBrandNames.add(ctx.expectedBrandName);

  // Reference brand names (must NOT become current identity)
  const referenceBrandNames = new Set<string>();
  for (const f of facts) {
    if (f.key === PROJECT_TRUTH_KEYS.BRAND_NAME && f.isReferenceFact && f.value) {
      referenceBrandNames.add(String(f.value));
    }
  }

  // Scan concept text for potential brand names
  const textFields = [concept.title, concept.thesis, concept.strategicMechanism,
    concept.rationale, concept.problemStatement, ...concept.strengths, ...concept.risks];

  for (const text of textFields) {
    if (!text) continue;

    // Check: does it reference a brand name not in the known set?
    // Simplified heuristic: look for 集团/控股/实业/生物科技/生命科学/药业/大健康/健康科技/文化传媒/品牌管理 suffixes
    const brandSuffix = /([\u4e00-\u9fa5A-Za-z]{2,15}(?:集团|控股|实业|生物科技|生命科学|药业|大健康|健康科技|文化传媒|品牌管理))/g;
    const matches = text.match(brandSuffix) || [];

    for (const match of matches) {
      if (knownBrandNames.has(match)) continue;
      if (referenceBrandNames.has(match)) {
        issues.push(makeIssue('brand-identity', concept.id,
          'REFERENCE_BRAND_AS_CURRENT', 'block',
          `概念文本中将参考品牌“${match}”当作当前项目品牌使用`,
        ));
        continue;
      }
      // Unknown brand — could be a false positive from strategic language.
      // Flag as warning only, not block (Spec #30: precision over recall).
      issues.push(makeIssue('brand-identity', concept.id,
        'UNEXPECTED_BRAND_NAME_WARNING', 'warning',
        `概念文本中出现疑似品牌名称“${match}”，需确认是否为项目品牌`,
      ));
    }
  }

  // Check: if concept claims to "redesign" or "replace" the brand identity
  const redesignPatterns = [
    /重新设计.{0,6}(品牌|logo|标志|vi)/i,
    /替换.{0,6}(品牌|logo|标志)/i,
    /品牌重塑/,
    /改头换面/,
  ];
  for (const pattern of redesignPatterns) {
    for (const text of textFields) {
      if (pattern.test(text || '')) {
        issues.push(makeIssue('brand-identity', concept.id,
          'BRAND_IDENTITY_REDESIGN_PROPOSED', 'warning',
          `概念文本提议修改品牌身份：${(text || '').slice(0, 40)}`,
        ));
        break;
      }
    }
  }

  return issues;
}

// ---------- Gate 3: Asset Authorization ----------
// Lab invariant: "Concept may not claim or depend on unauthorized assets,
// official certifications, credentials, specific data, or project properties
// not supported by Truth/Evidence."
// Adapted from asset-authorization-evaluator.js — semantic invariant only.

function runAssetAuthorizationGate(ctx: GateContext): ConceptGateIssue[] {
  const issues: ConceptGateIssue[] = [];
  const { concept, facts } = ctx;

  const textFields = [concept.title, concept.thesis, concept.strategicMechanism,
    concept.rationale, concept.problemStatement, ...concept.strengths, ...concept.risks];

  // Check for specific data patterns that sound like factual claims
  // These are simplified patterns — deterministic, no regex library dependency.
  const fabricationPatterns: { re: RegExp; code: string; severity: 'warning' | 'block'; message: string }[] = [
    // Specific percentages
    { re: /\d+(\.\d+)?%/, code: 'SPECIFIC_PERCENTAGE_CLAIM', severity: 'warning', message: '包含具体百分比数据，需确认是否有事实/证据支持' },
    // Specific large numbers with 万/亿
    { re: /\d+(\.\d+)?[万亿]/, code: 'SPECIFIC_SCALE_CLAIM', severity: 'warning', message: '包含具体规模数字，需确认是否有事实/证据支持' },
    // Official certifications
    { re: /(?:NMPA|FDA|CE|ISO\s*\d+|GMP|GSP)/i, code: 'OFFICIAL_CERTIFICATION_CLAIM', severity: 'block', message: '提到官方认证/资质，必须有事实/证据支持' },
    // Specific product names that look like unauthorized product claims
    { re: /第[一二三四五六七八九十]代产品/, code: 'PRODUCT_GENERATION_CLAIM', severity: 'warning', message: '提到具体产品代际，需确认是否有事实/证据支持' },
  ];

  // Known truth values (what the project actually claims)
  const knownTruthValues = new Set<string>();
  for (const f of facts) {
    if (f.value !== null && typeof f.value === 'string') {
      knownTruthValues.add(f.value);
    }
  }

  for (const pattern of fabricationPatterns) {
    for (const text of textFields) {
      if (!text) continue;
      if (pattern.re.test(text)) {
        // Check if this specific value appears in known truth
        // (best-effort: if the whole value is in truth, it's fine)
        const matched = text.match(pattern.re);
        const matchedValue = matched?.[0] ?? '';
        const valueIsKnown = [...knownTruthValues].some((v) => v.includes(matchedValue));

        if (!valueIsKnown) {
          issues.push(makeIssue('asset-authorization', concept.id,
            pattern.code, pattern.severity,
            `概念${pattern.message}：${matchedValue}`,
          ));
          break;
        }
      }
    }
  }

  // Locked asset safety check: concept may activate locked assets, not redesign them
  const lockedAssetKeys = new Set(
    facts.filter((f) => f.authority === 'LOCKED').map((f) => f.key),
  );
  if (lockedAssetKeys.size > 0) {
    const redesignVerbs = /(重新设计|改造|替换|重塑|重做|推翻)/;
    for (const text of textFields) {
      if (redesignVerbs.test(text || '')) {
        issues.push(makeIssue('asset-authorization', concept.id,
          'LOCKED_ASSET_REDESIGN_SUSPECTED', 'warning',
          `概念文本包含可能修改锁定资产的动词：${text?.slice(0, 40)}`,
        ));
        break;
      }
    }
  }

  return issues;
}

// ---------- Gate 4: Unsupported Claim / Evidence Gate ----------

function runUnsupportedClaimGate(ctx: GateContext): ConceptGateIssue[] {
  const issues: ConceptGateIssue[] = [];
  const { concept, facts, evidence } = ctx;

  const trace = buildTransitiveTrace(ctx.concept, {
    concepts: [ctx.concept],
    opportunities: ctx.opportunities,
    insights: ctx.insights,
    needs: ctx.needs,
    facts: ctx.facts,
    evidence: ctx.evidence,
  });

  const tracedFacts = facts.filter((f) => trace.factIds.has(f.id));
  const tracedEvidence = evidence.filter((e) => trace.evidenceIds.has(e.id));

  // If concept has evidenceRefs but evidence doesn't actually resolve to
  // traced facts, flag it (evidence should be backing the referenced facts)
  if (concept.evidenceRefs.length > 0 && tracedEvidence.length === 0) {
    issues.push(makeIssue('unsupported-claim', concept.id,
      'EVIDENCE_REFS_DONT_RESOLVE', 'warning',
      '概念引用了证据，但证据条目未与追溯到的事实关联'));
  }

  // If concept has factRefs and zero evidenceRefs but facts are evidence-supported,
  // that's fine — evidence is optional at concept level.
  // But if a concept makes an explicit factual claim that isn't in traced facts,
  // flag it. (Deterministic concepts always reference facts, so this mainly
  // catches manually constructed or model-assisted concepts.)

  const hasAnyFacts = tracedFacts.length > 0;
  if (!hasAnyFacts) {
    issues.push(makeIssue('unsupported-claim', concept.id,
      'NO_TRACED_FACTS', 'block',
      '概念没有可追溯到的事实依据'));
  }

  // Reference-only check: if ALL traced facts are reference facts,
  // this concept is reference-derived (should be caught by reference guard too)
  const allReference = tracedFacts.length > 0 && tracedFacts.every((f) => f.isReferenceFact);
  if (allReference) {
    issues.push(makeIssue('unsupported-claim', concept.id,
      'ALL_TRACED_FACTS_ARE_REFERENCE', 'warning',
      '概念的所有可追溯事实均来自参考来源'));
  }

  return issues;
}

// ---------- Gate 5: Value Coverage Gate ----------
// Lab invariant: "Concept must address at least one validated
// audience/consumer/user-value Need when such a Need is critical."
// Adapted from consumer-value-coverage + business-model-coverage evaluators.
//
// CI-W1B.2 audit (Spec §13-18, §25): the original implementation
// counted every priority=3 Need as a coverage target. That produced
// a false-positive MISSING_CRITICAL_NEED_COVERAGE block for Concept
// Sets whose Concepts correctly REFERENCE but do not THEME the
// identity-preservation / locked-preservation / prohibited-directions
// Needs (which are constraints, not coverage targets).
//
// New rule: a Need counts as a coverage target iff
//   coverageRequirement === 'required' && priority >= 2 && status !== 'blocked'
// Constraint / preservation / upstream-block Needs are excluded;
// they are validated by the relevant constraint gates instead.

function isCoverageCriticalNeed(n: { priority?: number; status?: string; coverageRequirement?: string }): boolean {
  if (n.status === 'blocked') return false;
  if (n.coverageRequirement && n.coverageRequirement !== 'required') return false;
  return (n.priority ?? 0) >= 2;
}

function runValueCoverageGate(ctx: GateContext): ConceptGateIssue[] {
  const issues: ConceptGateIssue[] = [];
  const { concept, needs } = ctx;

  const trace = buildTransitiveTrace(ctx.concept, {
    concepts: [ctx.concept],
    opportunities: ctx.opportunities,
    insights: ctx.insights,
    needs: ctx.needs,
    facts: ctx.facts,
    evidence: ctx.evidence,
  });

  const tracedNeeds = needs.filter((n) => trace.needIds.has(n.id));
  const coverageCriticalNeeds = needs.filter(isCoverageCriticalNeed);
  const tracedCoverageCritical = tracedNeeds.filter(isCoverageCriticalNeed);

  if (coverageCriticalNeeds.length > 0 && tracedCoverageCritical.length === 0) {
    issues.push(makeIssue('value-coverage', concept.id,
      'MISSING_CRITICAL_NEED_COVERAGE', 'block',
      '存在关键覆盖需求（priority≥2 且 required），但该概念未覆盖任何关键覆盖需求'));
  }

  // Business model alignment check: if there are business-type needs,
  // concept should reference at least one.
  const businessNeeds = needs.filter((n) => n.type === 'business' && n.status !== 'blocked');
  if (businessNeeds.length > 0) {
    const coversBusiness = tracedNeeds.some((n) => n.type === 'business');
    if (!coversBusiness) {
      issues.push(makeIssue('value-coverage', concept.id,
        'MISSING_BUSINESS_VALUE_COVERAGE', 'warning',
        '存在业务类需求，但该概念未覆盖任何业务类需求'));
    }
  }

  // Audience alignment check
  const audienceNeeds = needs.filter((n) => n.type === 'audience' && n.status !== 'blocked');
  if (audienceNeeds.length > 0) {
    const coversAudience = tracedNeeds.some((n) => n.type === 'audience');
    if (!coversAudience) {
      issues.push(makeIssue('value-coverage', concept.id,
        'MISSING_AUDIENCE_VALUE_COVERAGE', 'warning',
        '存在受众类需求，但该概念未覆盖任何受众类需求'));
    }
  }

  return issues;
}

// ---------- Gate 6: Reference Guard ----------

function runReferenceGuard(ctx: GateContext): ConceptGateIssue[] {
  const issues: ConceptGateIssue[] = [];
  const { concept, facts } = ctx;

  const trace = buildTransitiveTrace(ctx.concept, {
    concepts: [ctx.concept],
    opportunities: ctx.opportunities,
    insights: ctx.insights,
    needs: ctx.needs,
    facts: ctx.facts,
    evidence: ctx.evidence,
  });

  const tracedFacts = facts.filter((f) => trace.factIds.has(f.id));
  const currentFacts = tracedFacts.filter((f) => !f.isReferenceFact);
  const referenceFacts = tracedFacts.filter((f) => f.isReferenceFact);

  // Hard rule: identity keys (brand_name, brand_role) must NOT be
  // reference-only. If all identity-bearing facts are reference-derived,
  // that's reference contamination.
  const identityKeys = [
    PROJECT_TRUTH_KEYS.BRAND_NAME,
    PROJECT_TRUTH_KEYS.BRAND_ROLE,
    PROJECT_TRUTH_KEYS.BRAND_INDUSTRY,
  ];

  for (const key of identityKeys) {
    const keyCurrent = currentFacts.filter((f) => f.key === key && f.truthClass !== 'unknown');
    const keyReference = referenceFacts.filter((f) => f.key === key && f.truthClass !== 'unknown');
    if (keyReference.length > 0 && keyCurrent.length === 0) {
      issues.push(makeIssue('reference-guard', concept.id,
        'REFERENCE_IDENTITY_CONTAMINATION', 'block',
        `概念的身份事实（${key}）仅来自参考来源，存在参考污染风险`));
    }
  }

  if (referenceFacts.length > 0) {
    issues.push(makeIssue('reference-guard', concept.id,
      'REFERENCE_FACTS_PRESENT', 'warning',
      `概念引用了 ${referenceFacts.length} 条参考事实，请注意区分参考与当前项目`));
  }

  return issues;
}

// ---------- Gate 7: Unknown / Conflict Gate ----------

function runUnknownConflictGate(ctx: GateContext): ConceptGateIssue[] {
  const issues: ConceptGateIssue[] = [];
  const { concept, facts, conflicts } = ctx;

  const trace = buildTransitiveTrace(ctx.concept, {
    concepts: [ctx.concept],
    opportunities: ctx.opportunities,
    insights: ctx.insights,
    needs: ctx.needs,
    facts: ctx.facts,
    evidence: ctx.evidence,
  });

  const tracedFacts = facts.filter((f) => trace.factIds.has(f.id));
  const unknownFacts = tracedFacts.filter((f) => f.truthClass === 'unknown');
  const criticalKeys = [PROJECT_TRUTH_KEYS.BRAND_NAME, PROJECT_TRUTH_KEYS.BRAND_ROLE];
  const hasCriticalUnknown = unknownFacts.some((f) => criticalKeys.includes(f.key as any));

  if (hasCriticalUnknown) {
    issues.push(makeIssue('unknown-conflict', concept.id,
      'CRITICAL_UNKNOWN_DEPENDENCY', 'block',
      '概念依赖关键未知事实（品牌名/品牌角色），应被阻断'));
  } else if (unknownFacts.length > 0) {
    issues.push(makeIssue('unknown-conflict', concept.id,
      'UNKNOWN_DEPENDENCY', 'warning',
      `概念依赖 ${unknownFacts.length} 条未知事实，状态为 provisional`));
  }

  // Conflict check: if any traced fact is involved in a critical unresolved
  // conflict, the concept should be blocked.
  const tracedFactIds = new Set(tracedFacts.map((f) => f.id));
  const affectingConflicts = conflicts.filter((c) =>
    c.status === 'open' && c.factIds?.some((fid) => tracedFactIds.has(fid)),
  );

  const criticalConflictTypes = ['identity_mismatch', 'locked_value_violation', 'reference_contamination'];
  const criticalConflicts = affectingConflicts.filter((c) =>
    criticalConflictTypes.includes(c.type),
  );

  if (criticalConflicts.length > 0) {
    issues.push(makeIssue('unknown-conflict', concept.id,
      'CRITICAL_CONFLICT_DEPENDENCY', 'block',
      `概念依赖 ${criticalConflicts.length} 个关键未解决冲突，应被阻断`));
  } else if (affectingConflicts.length > 0) {
    issues.push(makeIssue('unknown-conflict', concept.id,
      'CONFLICT_DEPENDENCY', 'warning',
      `概念依赖 ${affectingConflicts.length} 个未解决冲突`));
  }

  return issues;
}

// ---------- Gate 8: Direction Leakage ----------

function runDirectionLeakageGate(ctx: GateContext): ConceptGateIssue[] {
  const issues: ConceptGateIssue[] = [];
  const { concept } = ctx;

  const leakage = detectConceptLeakage(concept);

  if (leakage.field) {
    issues.push(makeIssue('direction-leakage', concept.id,
      'FORBIDDEN_FIELD_NAME', 'block',
      `概念包含禁止的字段名：${leakage.field}`));
  }
  if (leakage.text) {
    issues.push(makeIssue('direction-leakage', concept.id,
      'FORBIDDEN_TEXT_PATTERN', 'block',
      `概念文本包含禁止的方向/视觉机制模式：${leakage.text.slice(0, 60)}`));
  }

  // Also check that strategicMechanism is non-visual — scan for visual
  // mechanism red flags in the strategicMechanism field.
  const visualMechanismPatterns = [
    /(?:使用|采用|运用).{0,6}(?:网络拓扑|节点图|流程图|时间轴|网格|矩阵|同心圆|径向图|分形|蒙太奇|拼贴)/,
    /(?:视觉语言|视觉体系|视觉符号|视觉语法)/,
  ];
  for (const pattern of visualMechanismPatterns) {
    if (pattern.test(concept.strategicMechanism)) {
      issues.push(makeIssue('direction-leakage', concept.id,
        'VISUAL_MECHANISM_IN_STRATEGIC', 'block',
        `strategicMechanism 中疑似包含具体视觉机制描述：${concept.strategicMechanism.slice(0, 60)}`));
      break;
    }
  }

  return issues;
}

// ---------- Pipeline ----------

const GATE_ORDER: ConceptGateName[] = [
  'trace',
  'brand-identity',
  'asset-authorization',
  'unsupported-claim',
  'value-coverage',
  'reference-guard',
  'unknown-conflict',
  'direction-leakage',
];

const GATE_RUNNERS: Record<ConceptGateName, (ctx: GateContext) => ConceptGateIssue[]> = {
  'trace': runTraceGate,
  'brand-identity': runBrandIdentityGate,
  'asset-authorization': runAssetAuthorizationGate,
  'unsupported-claim': runUnsupportedClaimGate,
  'value-coverage': runValueCoverageGate,
  'reference-guard': runReferenceGuard,
  'unknown-conflict': runUnknownConflictGate,
  'direction-leakage': runDirectionLeakageGate,
};

export function runConceptGates(
  concept: ConceptCandidate,
  ctx: Omit<GateContext, 'concept'>,
): ConceptGateResult[] {
  const fullCtx: GateContext = { ...ctx, concept };
  const results: ConceptGateResult[] = [];

  for (const gate of GATE_ORDER) {
    const issues = GATE_RUNNERS[gate](fullCtx);
    const status = aggregateStatus(issues);
    results.push({ conceptId: concept.id, gate, status, issues });
  }

  return results;
}

export interface FullConceptGateSummary {
  overallStatus: ConceptGateStatus;
  perConcept: Record<string, ConceptGateStatus>;
  allResults: ConceptGateResult[];
  blockedCount: number;
  passedCount: number;
  warningCount: number;
}

export function runConceptGatesForSet(
  concepts: ConceptCandidate[],
  ctx: Omit<GateContext, 'concept'>,
): FullConceptGateSummary {
  const allResults: ConceptGateResult[] = [];
  const perConcept: Record<string, ConceptGateStatus> = {};

  for (const concept of concepts) {
    const results = runConceptGates(concept, ctx);
    allResults.push(...results);

    // A concept's overall status is the worst gate result
    let overall: ConceptGateStatus = 'pass';
    for (const r of results) {
      if (r.status === 'blocked') { overall = 'blocked'; break; }
      if (r.status === 'pass_with_warnings' && overall === 'pass') {
        overall = 'pass_with_warnings';
      }
    }
    perConcept[concept.id] = overall;
  }

  const blockedCount = Object.values(perConcept).filter((s) => s === 'blocked').length;
  const warningCount = Object.values(perConcept).filter((s) => s === 'pass_with_warnings').length;
  const passedCount = Object.values(perConcept).filter((s) => s === 'pass').length;

  let overallStatus: ConceptGateStatus = 'pass';
  if (blockedCount > 0) overallStatus = 'blocked';
  else if (warningCount > 0) overallStatus = 'pass_with_warnings';

  return { overallStatus, perConcept, allResults, blockedCount, passedCount, warningCount };
}

// Export individual gates for testing
export {
  runTraceGate,
  runBrandIdentityGate,
  runAssetAuthorizationGate,
  runUnsupportedClaimGate,
  runValueCoverageGate,
  runReferenceGuard,
  runUnknownConflictGate,
  runDirectionLeakageGate,
};
