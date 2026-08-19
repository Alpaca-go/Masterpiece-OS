/**
 * Deterministic Concept synthesis.
 *
 * CI-5 Step 4-5: Opportunity-led generation. 1-3 concepts per active
 * Opportunity, bounded to 3-5 total.
 *
 * 8 strategic synthesis patterns (Spec #21):
 *   identity-preservation
 *   system-reframing
 *   value-flow
 *   asset-activation
 *   risk-inversion
 *   clarity-through-structure
 *   relationship-as-value
 *   cross-media-unification
 *
 * Pure function. No model call. Zero visual prescription.
 *
 * Concepts are intentionally template-simple. CI-5's job is to establish
 * the contract + trace + gates + diversity mechanism, not to produce
 * final creative quality. If deterministic quality proves insufficient,
 * CI-5B Model-Assisted Ideation is the path forward.
 */

import type { OpportunityMap, OpportunityItem } from '../opportunity/contracts.ts';
import type { InsightItem } from '../insight-intelligence/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { ProjectTruthFact } from '../truth/contracts.ts';
import type { EvidenceLedgerEntry } from '../evidence/contracts.ts';
import type { ConceptCandidate, StrategicPattern, ConceptStatus } from './contracts.ts';
import { CONCEPT_TRACE_VERSION } from './contracts.ts';

export interface ConceptGenerationInput {
  projectId: string;
  opportunityMap: OpportunityMap;
  insights: InsightItem[];
  needs: NeedItem[];
  facts: ProjectTruthFact[];
  evidence: EvidenceLedgerEntry[];
  /** Maximum concepts total. Default 5. */
  maxConcepts?: number;
  /** Maximum concepts per opportunity. Default 2. */
  maxPerOpportunity?: number;
  generatedAt?: string;
}

/**
 * Map each OpportunityCluster to a primary strategic pattern and
 * title / thesis / mechanism templates.
 *
 * These are deterministic strategic-formula templates. They produce
 * sensible-but-generic Concepts grounded in Opportunity language.
 */
const CLUSTER_PATTERN_MAP: Record<string, { pattern: StrategicPattern; titleTpl: (opp: OpportunityItem) => string; thesisTpl: (opp: OpportunityItem) => string; mechanismTpl: (opp: OpportunityItem) => string; rationaleTpl: (opp: OpportunityItem) => string; problemTpl: (opp: OpportunityItem) => string; strengths: string[]; risks: string[] }> = {
  'identity-preservation': {
    pattern: 'identity-preservation',
    titleTpl: (opp) => `激活品牌身份：${opp.title}`,
    thesisTpl: (opp) => `以品牌核心身份为创作主轴，通过${opp.strategicValue || '已验证的身份要素'}重建认知一致性。`,
    mechanismTpl: (opp) => `将品牌身份从背景信息提升为创意的组织原则，所有表达围绕已验证的身份定位展开。`,
    rationaleTpl: (opp) => `${opp.statement} 这意味着身份必须成为创意系统的第一性原理，而不是装饰性元素。`,
    problemTpl: (opp) => opp.statement,
    strengths: ['品牌一致性强', '身份识别风险低', '易于跨媒介延展'],
    risks: ['可能过于保守', '如果身份本身弱则创意张力不足'],
  },
  'business-communication': {
    pattern: 'value-flow',
    titleTpl: (opp) => `价值流动叙事：${opp.title}`,
    thesisTpl: (opp) => `把业务价值描绘成一条从供给到消费的清晰流动路径，让受众通过价值流动理解品牌角色。`,
    mechanismTpl: (opp) => `用价值流作为叙事结构，替代传统功能枚举，让业务关系成为理解品牌的入口。`,
    rationaleTpl: (opp) => `${opp.statement} 通过价值流叙事，业务角色从抽象描述转化为可感知的关系结构。`,
    problemTpl: (opp) => opp.statement,
    strengths: ['业务逻辑清晰', '价值传递直接', '适配产业类项目'],
    risks: ['可能偏理性、缺少情感张力'],
  },
  'audience-clarity': {
    pattern: 'relationship-as-value',
    titleTpl: (opp) => `受众关系价值化：${opp.title}`,
    thesisTpl: (opp) => `把受众从“被传达者”重构为价值关系的参与者，品牌价值在关系中显现。`,
    mechanismTpl: (opp) => `以受众视角组织创意表达，让品牌价值通过受众的体验、决策和收益来呈现。`,
    rationaleTpl: (opp) => `${opp.statement} 当受众能在创意中看见自己的角色，品牌价值才真正落地。`,
    problemTpl: (opp) => opp.statement,
    strengths: ['受众共情强', '避免自说自话', '转化导向清晰'],
    risks: ['可能牺牲品牌主体性'],
  },
  'system-coherence': {
    pattern: 'system-reframing',
    titleTpl: (opp) => `系统重构视角：${opp.title}`,
    thesisTpl: (opp) => `把品牌重新框定为一个系统而非单一对象，让系统各部分的关系成为创意核心。`,
    mechanismTpl: (opp) => `用系统思维替代单点思维，创意围绕部分与整体、结构与功能的关系展开。`,
    rationaleTpl: (opp) => `${opp.statement} 系统性品牌需要系统性创意，而非碎片化的视觉补丁。`,
    problemTpl: (opp) => opp.statement,
    strengths: ['整体感强', '架构逻辑清晰', '可扩展性好'],
    risks: ['可能过于抽象', '执行层面需要更多转译'],
  },
  'differentiation': {
    pattern: 'clarity-through-structure',
    titleTpl: (opp) => `结构即差异：${opp.title}`,
    thesisTpl: (opp) => `通过差异化的信息结构和认知框架建立独特性，而非依赖表面风格。`,
    mechanismTpl: (opp) => `用独有的信息组织方式和叙事结构创造识别度，让结构本身成为品牌的差异点。`,
    rationaleTpl: (opp) => `${opp.statement} 真正的差异化来自认知结构，而不是视觉装饰的替换。`,
    problemTpl: (opp) => opp.statement,
    strengths: ['差异化可持续', '不易被模仿', '认知深度高'],
    risks: ['需要受众投入更多认知成本'],
  },
  'asset-activation': {
    pattern: 'asset-activation',
    titleTpl: (opp) => `资产激活策略：${opp.title}`,
    thesisTpl: (opp) => `将已有的品牌资产从被动存储状态激活为创意驱动力，让资产承担叙事功能。`,
    mechanismTpl: (opp) => `把锁定资产和已有资产重新编排进创意系统，使其从“存在”变为“发挥作用”。`,
    rationaleTpl: (opp) => `${opp.statement} 已有资产是最可靠的创意素材，激活比创造更高效、更安全。`,
    problemTpl: (opp) => opp.statement,
    strengths: ['品牌资产利用率高', '身份风险低', '成本效益好'],
    risks: ['如果资产少则发挥空间有限'],
  },
  'risk-reduction': {
    pattern: 'risk-inversion',
    titleTpl: (opp) => `风险倒置法：${opp.title}`,
    thesisTpl: (opp) => `把风险点转化为创意的正面主题，用坦诚和透明建立信任，而不是回避。`,
    mechanismTpl: (opp) => `主动直面风险，把约束和挑战转化为创意的驱动力和可信度来源。`,
    rationaleTpl: (opp) => `${opp.statement} 当风险被诚实面对，它反而成为品牌可信度的证明。`,
    problemTpl: (opp) => opp.statement,
    strengths: ['信任度高', '真实感强', '差异化明显'],
    risks: ['需要精准把握分寸', '不适合所有品牌阶段'],
  },
  'cross-media-consistency': {
    pattern: 'cross-media-unification',
    titleTpl: (opp) => `跨媒介统一逻辑：${opp.title}`,
    thesisTpl: (opp) => `建立一个可在不同媒介中保持完整识别度的核心创意基因，形式可变但本质不变。`,
    mechanismTpl: (opp) => `提取可移植的创意基因，确保每个接触点都是同一个品牌系统的不同表达。`,
    rationaleTpl: (opp) => `${opp.statement} 跨媒介一致性不是复制粘贴，而是同一基因在不同环境中的生长。`,
    problemTpl: (opp) => opp.statement,
    strengths: ['品牌一致性强', '系统扩展性好', '执行效率高'],
    risks: ['需要良好的设计系统支撑'],
  },
};

function pickInsightsForOpportunity(
  opp: OpportunityItem,
  insights: InsightItem[],
  maxInsights = 2,
): InsightItem[] {
  const grounded = insights.filter((i) =>
    i.status === 'grounded'
    && opp.insightRefs.includes(i.id),
  );
  return grounded.slice(0, maxInsights);
}

function pickNeedsForOpportunity(
  opp: OpportunityItem,
  needs: NeedItem[],
  maxNeeds = 3,
): NeedItem[] {
  const active = needs.filter((n) =>
    (n.status === 'required' || n.status === 'important')
    && opp.needRefs.includes(n.id),
  );
  return active.sort((a, b) => b.priority - a.priority).slice(0, maxNeeds);
}

function collectFactsForRefs(
  factRefs: string[],
  facts: ProjectTruthFact[],
): ProjectTruthFact[] {
  return facts.filter((f) => factRefs.includes(f.id));
}

function collectEvidenceForFacts(
  factRefs: string[],
  evidence: EvidenceLedgerEntry[],
): string[] {
  const result: string[] = [];
  for (const entry of evidence) {
    if (entry.factIds?.some((fid) => factRefs.includes(fid))) {
      result.push(entry.id);
    }
  }
  return result;
}

function deriveConceptStatus(
  opp: OpportunityItem,
  insights: InsightItem[],
  needs: NeedItem[],
  factIds: string[],
  facts: ProjectTruthFact[],
): ConceptStatus {
  if (opp.status === 'blocked') return 'blocked';

  const hasBlockingInsight = insights.some((i) => i.status === 'blocked');
  const hasBlockingNeed = needs.some((n) => n.status === 'blocked');
  if (hasBlockingInsight || hasBlockingNeed) return 'blocked';

  const factsForRefs = facts.filter((f) => factIds.includes(f.id));
  const hasUnknown = factsForRefs.some((f) => f.truthClass === 'unknown');
  const hasProvisionalInsight = insights.some((i) => i.status === 'provisional');
  const hasConditionalNeed = needs.some((n) => n.status === 'conditional');

  if (opp.status === 'provisional' || hasUnknown || hasProvisionalInsight || hasConditionalNeed) {
    return 'provisional';
  }

  return 'grounded';
}

function buildConceptForOpportunity(
  opp: OpportunityItem,
  insights: InsightItem[],
  needs: NeedItem[],
  facts: ProjectTruthFact[],
  evidence: EvidenceLedgerEntry[],
  variant: number,
): ConceptCandidate {
  const patternMap = CLUSTER_PATTERN_MAP[opp.cluster] ?? CLUSTER_PATTERN_MAP['system-coherence'];

  const relevantInsights = pickInsightsForOpportunity(opp, insights);
  const relevantNeeds = pickNeedsForOpportunity(opp, needs);

  // CI-W1C.6 PART B: visualAsset.* factIds are STILL included in the
  // concept's fact graph (for trace / evidence purposes) but they
  // MUST NOT auto-promote a visualAsset differentiation Need into
  // the concept's needRefs. The CI-W1C.5 PART E auto-promotion of
  // a visualAsset differentiation Need was demoted in Rule 9 (now
  // type='preservation' + coverageRequirement='constraint_only'), so
  // it does not enter the value-coverage gate as a coverage target.
  const visualFactIds = facts
    .filter((f) => typeof f.key === 'string'
      && f.key.startsWith('visualAsset.')
      && f.authority === 'VISUAL_SOURCE_FACT'
      && f.value !== null
      && f.truthClass !== 'unknown'
      && !f.isReferenceFact)
    .map((f) => f.id);

  const factIds = [...new Set([
    ...opp.factRefs,
    ...relevantInsights.flatMap((i) => i.factRefs),
    ...relevantNeeds.flatMap((n) => n.factRefs),
    ...visualFactIds,
  ])].slice(0, 10);
  const evidenceIds = collectEvidenceForFacts(factIds, evidence).slice(0, 8);

  const status = deriveConceptStatus(opp, relevantInsights, relevantNeeds, factIds, facts);

  // For variant 0 (primary), use the cluster-optimized pattern.
  // For variant 1 (secondary), derive a complementary angle.
  let pattern: StrategicPattern = patternMap.pattern;
  let title = patternMap.titleTpl(opp);
  let thesis = patternMap.thesisTpl(opp);
  let mechanism = patternMap.mechanismTpl(opp);
  let rationale = patternMap.rationaleTpl(opp);
  let problemStatement = patternMap.problemTpl(opp);
  let strengths = [...patternMap.strengths];
  let risks = [...patternMap.risks];

  // CI-W1C.5 PART E (visual anchor suffix is applied AFTER the
  // variant 1 override so both v0 and v1 variants carry the
  // project-specific visual semantics). CI-W1C.6 PART B removed the
  // visual anchor step — legacy visual descriptors MUST NOT
  // become positive future-style Concept text. The cluster template
  // text is the only source of Concept content; the visual contribution
  // remains in the fact graph (above) for trace / evidence purposes.

  if (variant === 1) {
    // Secondary concept: pick a complementary pattern based on cluster
    const altPatterns: Record<string, StrategicPattern> = {
      'identity-preservation': 'asset-activation',
      'business-communication': 'system-reframing',
      'audience-clarity': 'value-flow',
      'system-coherence': 'clarity-through-structure',
      'differentiation': 'system-reframing',
      'asset-activation': 'cross-media-unification',
      'risk-reduction': 'relationship-as-value',
      'cross-media-consistency': 'system-reframing',
    };
    const alt = altPatterns[opp.cluster] ?? 'relationship-as-value';
    pattern = alt;
    title = `${alt}路径：${opp.title}`;
    thesis = `从${alt}角度切入，重新阐释 ${opp.statement} 的创意解法。`;
    mechanism = `用${alt}的战略逻辑组织创意，为 ${opp.title} 提供另一种可能的解法。`;
    rationale = `除了主路径，${alt}视角为 ${opp.title} 提供了差异化的战略选择。`;
    problemStatement = opp.statement;
    strengths = [`${alt}路径差异化`, '提供备选方案', '降低单点风险'];
    risks = ['可能分散焦点', '需要更强的筛选机制'];
  }

  const blockers: string[] = [];
  if (status === 'blocked') blockers.push('上游依赖被阻断');
  if (status === 'provisional') blockers.push('部分事实待确认');

  return {
    id: `concept-${opp.id}-v${variant}`,
    title,
    thesis,
    problemStatement,
    strategicMechanism: mechanism,
    rationale,
    opportunityRefs: [opp.id],
    insightRefs: relevantInsights.map((i) => i.id),
    needRefs: relevantNeeds.map((n) => n.id),
    factRefs: factIds,
    evidenceRefs: evidenceIds,
    strategicPattern: pattern,
    strengths,
    risks,
    blockers,
    status,
    generatedBy: 'deterministic_synthesis',
    traceVersion: CONCEPT_TRACE_VERSION,
  };
}

export interface ConceptGenerationResult {
  concepts: ConceptCandidate[];
  diagnostics: string[];
}

export function generateConcepts(input: ConceptGenerationInput): ConceptGenerationResult {
  const {
    projectId,
    opportunityMap,
    insights,
    needs,
    facts,
    evidence,
    maxConcepts = 5,
    maxPerOpportunity = 2,
  } = input;

  const diagnostics: string[] = [];
  const concepts: ConceptCandidate[] = [];

  // Sort opportunities by priority desc — higher priority gets concept slots first
  const sortedOpps = [...opportunityMap.opportunities]
    .filter((o) => o.status !== 'blocked')
    .sort((a, b) => b.priority - a.priority);

  if (sortedOpps.length === 0) {
    diagnostics.push('NO_ACTIVE_OPPORTUNITIES: 无活跃机会点，无法生成概念');
    return { concepts: [], diagnostics };
  }

  let remainingSlots = maxConcepts;

  // First pass: 1 concept per opportunity (primary variant)
  for (const opp of sortedOpps) {
    if (remainingSlots <= 0) break;

    const relevantInsights = pickInsightsForOpportunity(opp, insights);
    const relevantNeeds = pickNeedsForOpportunity(opp, needs);

    // Skip if no grounding — this Opportunity has no downstream trace
    if (relevantInsights.length === 0 || relevantNeeds.length === 0 || opp.factRefs.length === 0) {
      diagnostics.push(`SKIP_OPPORTUNITY_NO_GROUNDING: ${opp.id} 缺少必要的洞察/需求/事实追溯`);
      continue;
    }

    const concept = buildConceptForOpportunity(opp, insights, needs, facts, evidence, 0);
    concepts.push(concept);
    remainingSlots--;
  }

  // Second pass: second variant for top opportunities, if slots remain
  if (remainingSlots > 0) {
    for (const opp of sortedOpps) {
      if (remainingSlots <= 0) break;
      if (maxPerOpportunity < 2) break;

      const alreadyHas = concepts.filter((c) => c.opportunityRefs.includes(opp.id)).length;
      if (alreadyHas >= maxPerOpportunity) continue;

      const relevantInsights = pickInsightsForOpportunity(opp, insights);
      const relevantNeeds = pickNeedsForOpportunity(opp, needs);
      if (relevantInsights.length === 0 || relevantNeeds.length === 0) continue;

      const concept = buildConceptForOpportunity(opp, insights, needs, facts, evidence, 1);
      concepts.push(concept);
      remainingSlots--;
    }
  }

  if (concepts.length === 0) {
    diagnostics.push('NO_GROUNDED_CONCEPTS: 所有机会点均缺乏足够的追溯依据');
  }

  // Reference contamination check at generation level (defense-in-depth).
  // If the opportunity is derived entirely from reference facts, mark as
  // reference-contaminated — this should have been caught upstream.
  for (const c of concepts) {
    const allFactIds = new Set(c.factRefs);
    const referenceFacts = facts.filter((f) => allFactIds.has(f.id) && f.isReferenceFact);
    const currentFacts = facts.filter((f) => allFactIds.has(f.id) && !f.isReferenceFact);

    if (referenceFacts.length > 0 && currentFacts.length === 0) {
      diagnostics.push(`CONCEPT_ALL_REFERENCE_FACTS: ${c.id} 仅基于参考事实，可能存在参考污染`);
    }
  }

  return { concepts, diagnostics };
}

// Exported for tests.
export { CLUSTER_PATTERN_MAP };
