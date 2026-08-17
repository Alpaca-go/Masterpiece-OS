/**
 * Direction Gate Pipeline (CI-6 Step 9, 23-34, 36).
 *
 * Gate order:
 *   1. Trace Gate
 *   2. Brand Identity Gate            (Lab: brand-identity-preservation-evaluator)
 *   3. Asset Authorization Gate       (Lab: asset-authorization-evaluator)
 *   4. Business Coverage Gate         (Lab: business-model-coverage-evaluator)
 *   5. Consumer Coverage Gate         (Lab: consumer-value-coverage-evaluator)
 *   6. Group Visual Authorization Gate (Lab: group-direction-authorization — DEFERRED DETAIL)
 *   7. Family Difference Gate         (Lab: direction-family-difference-evaluator)
 *   8. Spatial Drift Gate             (Lab: spatial-drift-evaluator)
 *   9. Aesthetic Gate                 (Lab: aesthetic gate — disposition only)
 *  10. Execution Readiness Gate
 *  11. Anchor / Prompt Leakage Gate
 *
 * Each gate is a CI-owned re-implementation of the semantic invariant
 * from the corresponding Lab evaluator. We do NOT directly import Lab code.
 *
 * Output: pass | pass_with_warnings | blocked
 */

import type {
  CreativeDirectionCandidate,
  DirectionGateResult,
  DirectionGateIssue,
  DirectionGateName,
  DirectionGateStatus,
} from './contracts.ts';
import type { ConceptCandidate } from '../concept-intelligence/contracts.ts';
import type { OpportunityItem } from '../opportunity/contracts.ts';
import type { InsightItem } from '../insight-intelligence/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { ProjectTruthFact, ProjectTruthConflict } from '../truth/contracts.ts';
import type { EvidenceLedgerEntry } from '../evidence/contracts.ts';
import { PROJECT_TRUTH_KEYS } from '../truth/key-registry.ts';
import { buildDirectionTransitiveTrace, validateDirectionTrace } from './direction-trace.ts';
import { evaluateDirectionFamilyDifference } from './direction-family.ts';
import { detectDirectionLeakage } from './direction-leakage.ts';

export interface DirectionGateContext {
  direction: CreativeDirectionCandidate;
  concepts: ConceptCandidate[];
  opportunities: OpportunityItem[];
  insights: InsightItem[];
  needs: NeedItem[];
  facts: ProjectTruthFact[];
  evidence: EvidenceLedgerEntry[];
  conflicts: ProjectTruthConflict[];
  /** All directions in the set (for family-difference gate). */
  siblingDirections: CreativeDirectionCandidate[];
  expectedBrandName?: string;
  expectedBrandRole?: string;
}

function makeIssue(
  gate: DirectionGateName,
  directionId: string,
  code: string,
  severity: 'warning' | 'block',
  message: string,
  factRefs?: string[],
  evidenceRefs?: string[],
): DirectionGateIssue {
  return { code, severity, message, directionId, gate, factRefs, evidenceRefs };
}

function aggregateStatus(issues: DirectionGateIssue[]): DirectionGateStatus {
  if (issues.some((i) => i.severity === 'block')) return 'blocked';
  if (issues.some((i) => i.severity === 'warning')) return 'pass_with_warnings';
  return 'pass';
}

// ─────────────────────────────────────────────
// Gate 1: Trace
// ─────────────────────────────────────────────

function runTraceGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  const issues: DirectionGateIssue[] = [];
  const result = validateDirectionTrace({
    directions: [ctx.direction],
    concepts: ctx.concepts,
    opportunities: ctx.opportunities,
    insights: ctx.insights,
    needs: ctx.needs,
    facts: ctx.facts,
    evidence: ctx.evidence,
  });
  for (const issue of result.issues) {
    issues.push(makeIssue('trace', ctx.direction.id, issue.code, issue.severity, issue.message));
  }

  // Transitive closure check
  const trace = buildDirectionTransitiveTrace(ctx.direction, {
    directions: [ctx.direction],
    concepts: ctx.concepts,
    opportunities: ctx.opportunities,
    insights: ctx.insights,
    needs: ctx.needs,
    facts: ctx.facts,
    evidence: ctx.evidence,
  });
  if (trace.conceptIds.size === 0) {
    issues.push(makeIssue('trace', ctx.direction.id, 'NO_TRANSITIVE_CONCEPT', 'block',
      `${ctx.direction.id} 追溯闭包中没有 concept`));
  }
  if (trace.factIds.size === 0) {
    issues.push(makeIssue('trace', ctx.direction.id, 'NO_TRANSITIVE_FACT', 'block',
      `${ctx.direction.id} 追溯闭包中没有 fact`));
  }
  return issues;
}

// ─────────────────────────────────────────────
// Gate 2: Brand Identity (Lab invariant from brand-identity-preservation-evaluator)
// ─────────────────────────────────────────────

function runBrandIdentityGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  const issues: DirectionGateIssue[] = [];
  const { direction, facts } = ctx;

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

  const referenceBrandNames = new Set<string>();
  for (const f of facts) {
    if (f.key === PROJECT_TRUTH_KEYS.BRAND_NAME && f.isReferenceFact && f.value) {
      referenceBrandNames.add(String(f.value));
    }
  }

  const textFields = [direction.title, direction.thesis, direction.visualMechanism,
    direction.systemHypothesis, direction.colorRelationship, direction.compositionLogic,
    ...direction.strengths, ...direction.risks];

  // Direction-level check: expected brand name should appear somewhere
  // when an expectedBrandName is provided
  if (ctx.expectedBrandName) {
    const combined = textFields.filter(Boolean).join(' ');
    if (!combined.includes(ctx.expectedBrandName)) {
      issues.push(makeIssue('brand-identity', direction.id,
        'BRAND_NAME_NOT_PRESERVED', 'warning',
        `Direction 文本未包含项目品牌"${ctx.expectedBrandName}"`));
    }
  }

  for (const text of textFields) {
    if (!text) continue;
    const brandSuffix = /([\u4e00-\u9fa5A-Za-z]{2,15}(?:集团|控股|实业|生物科技|生命科学|药业|大健康|健康科技|文化传媒|品牌管理))/g;
    const matches = text.match(brandSuffix) || [];
    for (const match of matches) {
      if (knownBrandNames.has(match)) continue;
      if (referenceBrandNames.has(match)) {
        issues.push(makeIssue('brand-identity', direction.id,
          'REFERENCE_BRAND_AS_CURRENT', 'block',
          `Direction 文本中将参考品牌"${match}"当作当前项目品牌使用`));
        continue;
      }
      issues.push(makeIssue('brand-identity', direction.id,
        'UNEXPECTED_BRAND_NAME_WARNING', 'warning',
        `Direction 文本中出现疑似品牌名称"${match}"，需确认是否为项目品牌`));
    }
  }

  // Identity drift / replacement / distortion language
  const distortionPatterns = [
    /重新设计.{0,6}(品牌|logo|标志|vi)/i,
    /替换.{0,6}(品牌|logo|标志)/i,
    /扭曲.{0,6}身份/,
    /发明.{0,6}(品牌|logo)/i,
    /distort.{0,12}identity/i,
  ];
  for (const pattern of distortionPatterns) {
    for (const text of textFields) {
      if (pattern.test(text || '')) {
        issues.push(makeIssue('brand-identity', direction.id,
          'IDENTITY_DISTORTION', 'block',
          `Direction 文本包含身份扭曲/替换：${(text || '').slice(0, 40)}`));
        break;
      }
    }
  }

  return issues;
}

// ─────────────────────────────────────────────
// Gate 3: Asset Authorization (Lab invariant from asset-authorization-evaluator)
// ─────────────────────────────────────────────

function runAssetAuthorizationGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  const issues: DirectionGateIssue[] = [];
  const { direction, facts } = ctx;

  const textFields = [direction.visualMechanism, direction.systemHypothesis,
    direction.colorRelationship, direction.materialRelationship, direction.compositionLogic,
    direction.typographyBehavior, direction.graphicBehavior, direction.imageBehavior,
    direction.spaceApplicability, direction.packagingApplicability, ...direction.strengths];

  // Fabrication patterns at Direction level
  const fabricationPatterns: { re: RegExp; code: string; severity: 'warning' | 'block'; message: string }[] = [
    { re: /\d+(\.\d+)?%/, code: 'SPECIFIC_PERCENTAGE_CLAIM', severity: 'warning', message: 'Direction 包含具体百分比' },
    { re: /\d+(\.\d+)?[万亿]/, code: 'SPECIFIC_SCALE_CLAIM', severity: 'warning', message: 'Direction 包含具体规模数字' },
    { re: /(?:NMPA|FDA|CE|ISO\s*\d+|GMP|GSP)/i, code: 'OFFICIAL_CERTIFICATION_CLAIM', severity: 'block', message: 'Direction 提到官方认证' },
    { re: /第[一二三四五六七八九十]代产品/, code: 'PRODUCT_GENERATION_CLAIM', severity: 'warning', message: 'Direction 提到具体产品代际' },
    { re: /(?:独家|专有|唯一)(?:专利|认证|产品)/, code: 'EXCLUSIVITY_CLAIM', severity: 'block', message: 'Direction 主张独家性但无证据' },
  ];

  const knownTruthValues = new Set<string>();
  for (const f of facts) {
    if (typeof f.value === 'string' && f.value !== null) knownTruthValues.add(f.value);
  }

  for (const pattern of fabricationPatterns) {
    for (const text of textFields) {
      if (!text) continue;
      if (pattern.re.test(text)) {
        const matched = text.match(pattern.re);
        const matchedValue = matched?.[0] ?? '';
        const valueIsKnown = [...knownTruthValues].some((v) => v.includes(matchedValue));
        if (!valueIsKnown) {
          issues.push(makeIssue('asset-authorization', direction.id,
            pattern.code, pattern.severity, `${pattern.message}：${matchedValue}`));
          break;
        }
      }
    }
  }

  // Locked asset safety: can activate/repeat/position, but not redesign/replace
  const lockedAssetKeys = new Set(facts.filter((f) => f.authority === 'LOCKED').map((f) => f.key));
  if (lockedAssetKeys.size > 0) {
    const redesignVerbs = /(重新设计|改造|替换|重塑|重做|推翻|distort|invent alternate)/;
    for (const text of textFields) {
      if (text && redesignVerbs.test(text)) {
        issues.push(makeIssue('asset-authorization', direction.id,
          'LOCKED_ASSET_REDESIGN_SUSPECTED', 'block',
          `Direction 文本包含修改锁定资产的动词：${text.slice(0, 40)}`));
        break;
      }
    }
  }

  return issues;
}

// ─────────────────────────────────────────────
// Gate 4: Business Model Coverage
// ─────────────────────────────────────────────

function runBusinessCoverageGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  const issues: DirectionGateIssue[] = [];
  const { direction, needs } = ctx;

  const trace = buildDirectionTransitiveTrace(ctx.direction, {
    directions: [ctx.direction],
    concepts: ctx.concepts,
    opportunities: ctx.opportunities,
    insights: ctx.insights,
    needs: ctx.needs,
    facts: ctx.facts,
    evidence: ctx.evidence,
  });

  const tracedNeeds = needs.filter((n) => trace.needIds.has(n.id));
  const businessNeeds = needs.filter((n) => n.type === 'business' && n.status !== 'blocked');
  const criticalBusinessNeeds = businessNeeds.filter((n) => n.priority === 3);

  if (criticalBusinessNeeds.length > 0) {
    const coversCriticalBusiness = tracedNeeds.some((n) => n.type === 'business' && n.priority === 3);
    if (!coversCriticalBusiness) {
      issues.push(makeIssue('business-coverage', direction.id,
        'MISSING_CRITICAL_BUSINESS_NEED', 'block',
        '存在关键业务类需求，但该 Direction 未覆盖任何关键业务需求'));
    }
  } else if (businessNeeds.length > 0) {
    const coversBusiness = tracedNeeds.some((n) => n.type === 'business');
    if (!coversBusiness) {
      issues.push(makeIssue('business-coverage', direction.id,
        'MISSING_BUSINESS_VALUE_COVERAGE', 'warning',
        '存在业务类需求，但该 Direction 未覆盖任何业务类需求'));
    }
  }

  return issues;
}

// ─────────────────────────────────────────────
// Gate 5: Consumer Value Coverage
// ─────────────────────────────────────────────

function runConsumerCoverageGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  const issues: DirectionGateIssue[] = [];
  const { direction, needs } = ctx;

  const trace = buildDirectionTransitiveTrace(ctx.direction, {
    directions: [ctx.direction],
    concepts: ctx.concepts,
    opportunities: ctx.opportunities,
    insights: ctx.insights,
    needs: ctx.needs,
    facts: ctx.facts,
    evidence: ctx.evidence,
  });

  const tracedNeeds = needs.filter((n) => trace.needIds.has(n.id));
  const audienceNeeds = needs.filter((n) => n.type === 'audience' && n.status !== 'blocked');
  const criticalAudienceNeeds = audienceNeeds.filter((n) => n.priority === 3);

  if (criticalAudienceNeeds.length > 0) {
    const coversCritical = tracedNeeds.some((n) => n.type === 'audience' && n.priority === 3);
    if (!coversCritical) {
      issues.push(makeIssue('consumer-coverage', direction.id,
        'MISSING_CRITICAL_AUDIENCE_NEED', 'block',
        '存在关键受众类需求，但该 Direction 未覆盖关键受众需求'));
    }
  } else if (audienceNeeds.length > 0) {
    const coversAudience = tracedNeeds.some((n) => n.type === 'audience');
    if (!coversAudience) {
      issues.push(makeIssue('consumer-coverage', direction.id,
        'MISSING_AUDIENCE_COVERAGE', 'warning',
        '存在受众类需求，但该 Direction 未覆盖任何受众类需求'));
    }
  }

  return issues;
}

// ─────────────────────────────────────────────
// Gate 6: Group Visual Authorization (deferred-detail disposition)
// ─────────────────────────────────────────────

function runGroupVisualAuthorizationGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  // Lab evaluator `group-direction-authorization` re-audited.
  // Semantic invariant: Direction must respect project group's visual
  // authorization (e.g. sub-brand / parent-brand relationships).
  //
  // Lab evaluator assumes project-specific parent/child brand knowledge.
  // We do NOT import that knowledge. We only verify:
  //   - Direction does not claim to represent a different brand
  //   - Direction does not adopt an unauthorized brand identity
  //   - Direction does not claim to be a sub-brand of a reference brand
  //
  // Detailed per-project group authorization is deferred to the
  // production-side decision. CI-6 only ensures no unauthorized claim
  // appears in Direction text.
  const issues: DirectionGateIssue[] = [];
  const { direction, facts } = ctx;

  const knownBrandNames = new Set<string>();
  for (const f of facts) {
    if (f.key === PROJECT_TRUTH_KEYS.BRAND_NAME
      && f.value !== null
      && f.truthClass !== 'unknown'
      && !f.isReferenceFact) {
      knownBrandNames.add(String(f.value));
    }
  }

  const textFields = [direction.title, direction.thesis, direction.visualMechanism, direction.systemHypothesis];

  // Check for unauthorized sub-brand claim
  const subBrandPatterns = [
    /(?:子品牌|姊妹品牌|兄弟品牌|sub-?brand|sister brand)\s*(?:为|是|of|:|：)\s*[^\s]{2,15}/,
    /(?:隶属于|归属)\s*[^\s]{2,15}(?:集团|控股|实业)/,
  ];
  for (const pattern of subBrandPatterns) {
    for (const text of textFields) {
      if (!text) continue;
      const m = text.match(pattern);
      if (m) {
        const claimedBrand = m[0].replace(/^[^一-龥\w]+/, '').replace(/(集团|控股|实业|子品牌|sub-?brand).*$/, '');
        if (claimedBrand && !knownBrandNames.has(claimedBrand)) {
          issues.push(makeIssue('group-visual-authorization', direction.id,
            'UNAUTHORIZED_SUBBRAND_CLAIM', 'warning',
            `Direction 文本中提到未授权的从属品牌声明：${claimedBrand}`));
          break;
        }
      }
    }
  }

  return issues;
}

// ─────────────────────────────────────────────
// Gate 7: Family Difference
// ─────────────────────────────────────────────

function runFamilyDifferenceGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  const issues: DirectionGateIssue[] = [];
  const { direction, siblingDirections } = ctx;

  // Evaluate all sibling pairs that include this direction
  const others = siblingDirections.filter((d) => d.id !== direction.id);
  if (others.length === 0) return issues; // 1 direction, no pair to check

  const allSiblings = [...others, direction];
  const diff = evaluateDirectionFamilyDifference(allSiblings);

  // Find pairs involving this direction
  const myPairs = diff.pairs.filter((p) => p.directionA === direction.id || p.directionB === direction.id);

  for (const pair of myPairs) {
    if (pair.isFakeDiversity) {
      issues.push(makeIssue('family-difference', direction.id,
        'FAKE_DIVERSITY_DETECTED', 'block',
        `与 ${pair.directionA === direction.id ? pair.directionB : pair.directionA} 的差异仅为表面（颜色/材质/情绪）`));
    } else if (!pair.isMeaningfullyDistinct) {
      issues.push(makeIssue('family-difference', direction.id,
        'UNDER_DISTINGUISHED', 'warning',
        `与 ${pair.directionA === direction.id ? pair.directionB : pair.directionA} 的结构性差异不足 2 维`));
    }
  }

  return issues;
}

// ─────────────────────────────────────────────
// Gate 8: Spatial Drift (Lab invariant from spatial-drift-evaluator)
// ─────────────────────────────────────────────

function runSpatialDriftGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  const issues: DirectionGateIssue[] = [];
  const { direction, opportunities } = ctx;

  // If project is space-capable but Direction is NOT in a space-extension family,
  // and Direction contains "space" in crossMediaBehavior, this could indicate drift.
  const hasSpaceOpp = opportunities.some((o) => o.cluster === 'spatial-extension');
  const isInSpaceFamily = direction.directionFamily === 'spatial-extension';
  const mentionsSpace = direction.crossMediaBehavior.includes('space');

  // Spatial drift: if a non-space family Direction heavily prescribes spatial mechanisms
  const spatialMechanismRedFlags = [
    /具体(?:的)?(?:空间|动线|流线|导视|区域)\s*(?:布局|设计|规划)/,
    /特定.{0,8}(?:尺寸|比例|高度|宽度|位置)\s*(?:的)?(?:大堂|走廊|墙体|天花板|地面|货架|展墙)/,
    /camera\s*position/i,
    /机位/,
  ];
  const textFields = [direction.spaceApplicability, direction.visualMechanism, direction.systemHypothesis];

  for (const pattern of spatialMechanismRedFlags) {
    for (const text of textFields) {
      if (text && pattern.test(text)) {
        issues.push(makeIssue('spatial-drift', direction.id,
          'SPATIAL_MECHANISM_PRESCRIBED', 'block',
          `Direction 文本包含具体空间机制：${text.slice(0, 40)}`));
        break;
      }
    }
  }

  // Soft warning: family mismatch with capability
  if (mentionsSpace && !isInSpaceFamily && hasSpaceOpp) {
    issues.push(makeIssue('spatial-drift', direction.id,
      'FAMILY_CAPABILITY_MISMATCH', 'warning',
      'Direction 在 crossMedia 涉及 space，但 directionFamily 不是 spatial-extension'));
  }

  return issues;
}

// ─────────────────────────────────────────────
// Gate 9: Aesthetic Gate (disposition only — no scoring)
// ─────────────────────────────────────────────

function runAestheticGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  const issues: DirectionGateIssue[] = [];
  const { direction } = ctx;

  // Deterministic structural checks only. No beauty scoring.
  // 1. Mechanism consistency: visualMechanism and systemHypothesis should align
  // 2. System completeness: at least one of compositionLogic / typographyBehavior / etc. should be set
  // 3. Style contradiction: no contradictory "minimal" + "maximal" language

  const textFields = [direction.visualMechanism, direction.systemHypothesis];

  // Contradiction check
  const contradictionPatterns = [
    { re: /(?:极简|极简主义|简约|minimal)\s*[\.，,]\s*(?:极度装饰|繁复|highly\s*decorated|ornate)/i, code: 'STYLE_CONTRADICTION' },
    { re: /(?:温暖|warm)\s*[\.，,]\s*(?:冷峻|cold|cool)/i, code: 'STYLE_CONTRADICTION' },
  ];
  for (const { re, code } of contradictionPatterns) {
    const combined = textFields.filter(Boolean).join(' ');
    if (re.test(combined)) {
      issues.push(makeIssue('aesthetic', direction.id, code, 'warning',
        'Direction 文本中存在风格自相矛盾'));
    }
  }

  // System completeness: at least one behavioral dimension
  const behaviorDims = [
    direction.colorRelationship,
    direction.materialRelationship,
    direction.compositionLogic,
    direction.typographyBehavior,
    direction.graphicBehavior,
    direction.imageBehavior,
  ].filter((s) => s && s.length > 0).length;

  if (behaviorDims === 0) {
    issues.push(makeIssue('aesthetic', direction.id,
      'SYSTEM_INCOMPLETE', 'warning',
      'Direction 缺少任何行为维度（color/material/composition/...）'));
  }

  return issues;
}

// ─────────────────────────────────────────────
// Gate 10: Execution Readiness
// ─────────────────────────────────────────────

function runExecutionReadinessGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  const issues: DirectionGateIssue[] = [];
  const { direction } = ctx;

  if (!direction.visualMechanism || direction.visualMechanism.length === 0) {
    issues.push(makeIssue('execution-readiness', direction.id,
      'NO_VISUAL_MECHANISM', 'block',
      'Direction 缺少 visualMechanism'));
  }
  if (!direction.systemHypothesis || direction.systemHypothesis.length === 0) {
    issues.push(makeIssue('execution-readiness', direction.id,
      'NO_SYSTEM_HYPOTHESIS', 'block',
      'Direction 缺少 systemHypothesis'));
  }
  if (!direction.crossMediaBehavior || direction.crossMediaBehavior.length === 0) {
    issues.push(makeIssue('execution-readiness', direction.id,
      'NO_CROSS_MEDIA', 'block',
      'Direction 缺少 crossMediaBehavior'));
  }
  if (direction.status === 'blocked') {
    issues.push(makeIssue('execution-readiness', direction.id,
      'DIRECTION_BLOCKED', 'block',
      'Direction 状态为 blocked'));
  }

  return issues;
}

// ─────────────────────────────────────────────
// Gate 11: Anchor / Prompt Leakage
// ─────────────────────────────────────────────

function runAnchorPromptLeakageGate(ctx: DirectionGateContext): DirectionGateIssue[] {
  const issues: DirectionGateIssue[] = [];
  const { direction } = ctx;

  const leak = detectDirectionLeakage(direction);

  if (leak.field) {
    issues.push(makeIssue('anchor-prompt-leakage', direction.id,
      'FORBIDDEN_FIELD_NAME', 'block',
      `Direction 包含禁止的字段名：${leak.field}`));
  }
  if (leak.text) {
    issues.push(makeIssue('anchor-prompt-leakage', direction.id,
      'FORBIDDEN_TEXT_PATTERN', 'block',
      `Direction 文本包含禁止的 Anchor/Prompt/Production 模式：${leak.text.slice(0, 60)}`));
  }

  return issues;
}

export interface FullDirectionGateSummary {
  overallStatus: DirectionGateStatus;
  perDirection: Record<string, DirectionGateStatus>;
  allResults: DirectionGateResult[];
  blockedCount: number;
  passedCount: number;
  warningCount: number;
}

// ─────────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────────

const GATE_ORDER: DirectionGateName[] = [
  'trace',
  'brand-identity',
  'asset-authorization',
  'business-coverage',
  'consumer-coverage',
  'group-visual-authorization',
  'family-difference',
  'spatial-drift',
  'aesthetic',
  'execution-readiness',
  'anchor-prompt-leakage',
];

const GATE_RUNNERS: Record<DirectionGateName, (ctx: DirectionGateContext) => DirectionGateIssue[]> = {
  'trace': runTraceGate,
  'brand-identity': runBrandIdentityGate,
  'asset-authorization': runAssetAuthorizationGate,
  'business-coverage': runBusinessCoverageGate,
  'consumer-coverage': runConsumerCoverageGate,
  'group-visual-authorization': runGroupVisualAuthorizationGate,
  'family-difference': runFamilyDifferenceGate,
  'spatial-drift': runSpatialDriftGate,
  'aesthetic': runAestheticGate,
  'execution-readiness': runExecutionReadinessGate,
  'anchor-prompt-leakage': runAnchorPromptLeakageGate,
};

export function runDirectionGates(
  direction: CreativeDirectionCandidate,
  ctx: Omit<DirectionGateContext, 'direction'>,
): DirectionGateResult[] {
  const fullCtx: DirectionGateContext = { ...ctx, direction };
  const results: DirectionGateResult[] = [];
  for (const gate of GATE_ORDER) {
    const issues = GATE_RUNNERS[gate](fullCtx);
    const status = aggregateStatus(issues);
    results.push({ directionId: direction.id, gate, status, issues });
  }
  return results;
}

export function runDirectionGatesForSet(
  directions: CreativeDirectionCandidate[],
  ctx: Omit<DirectionGateContext, 'direction'>,
): FullDirectionGateSummary {
  const allResults: DirectionGateResult[] = [];
  const perDirection: Record<string, DirectionGateStatus> = {};

  for (const direction of directions) {
    const results = runDirectionGates(direction, ctx);
    allResults.push(...results);

    let overall: DirectionGateStatus = 'pass';
    for (const r of results) {
      if (r.status === 'blocked') { overall = 'blocked'; break; }
      if (r.status === 'pass_with_warnings' && overall === 'pass') {
        overall = 'pass_with_warnings';
      }
    }
    perDirection[direction.id] = overall;
  }

  const blockedCount = Object.values(perDirection).filter((s) => s === 'blocked').length;
  const warningCount = Object.values(perDirection).filter((s) => s === 'pass_with_warnings').length;
  const passedCount = Object.values(perDirection).filter((s) => s === 'pass').length;

  let overallStatus: DirectionGateStatus = 'pass';
  if (blockedCount > 0) overallStatus = 'blocked';
  else if (warningCount > 0) overallStatus = 'pass_with_warnings';

  return { overallStatus, perDirection, allResults, blockedCount, passedCount, warningCount };
}

export {
  runTraceGate,
  runBrandIdentityGate,
  runAssetAuthorizationGate,
  runBusinessCoverageGate,
  runConsumerCoverageGate,
  runGroupVisualAuthorizationGate,
  runFamilyDifferenceGate,
  runSpatialDriftGate,
  runAestheticGate,
  runExecutionReadinessGate,
  runAnchorPromptLeakageGate,
};
