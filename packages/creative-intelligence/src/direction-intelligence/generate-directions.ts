/**
 * Deterministic Direction synthesis.
 *
 * CI-6 Step 4-5: Concept-led generation. 1-3 directions per eligible
 * Concept, no forced quota.
 *
 * 8 DirectionFamily templates (system logic, NOT style):
 *   structural-system, relational-network, narrative-sequence,
 *   symbolic-abstraction, material-expression, editorial-system,
 *   modular-identity, spatial-extension
 *
 * Pure function. No model call. No visual prescription at pixel level.
 * Cross-media / space / packaging applicability is conceptual only.
 *
 * Deterministic quality intentionally template-driven. CI-6's job is to
 * establish the contract + trace + family-difference + gates + diversity
 * mechanism. If deterministic quality is insufficient, the path forward
 * is CI-6B Model-Assisted Direction Ideation — not silent model calls.
 */

import type { ConceptCandidate } from '../concept-intelligence/contracts.ts';
import type { OpportunityItem } from '../opportunity/contracts.ts';
import type { InsightItem } from '../insight-intelligence/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { ProjectTruthFact, ProjectTruthConflict } from '../truth/contracts.ts';
import type { EvidenceLedgerEntry } from '../evidence/contracts.ts';
import type {
  CreativeDirectionCandidate,
  DirectionFamily,
  CrossMediaTouchpoint,
  DirectionStatus,
} from './contracts.ts';
import { DIRECTION_TRACE_VERSION } from './contracts.ts';

export interface DirectionGenerationInput {
  projectId: string;
  concepts: ConceptCandidate[];
  opportunityMap: { opportunities: OpportunityItem[] };
  insights: InsightItem[];
  needs: NeedItem[];
  facts: ProjectTruthFact[];
  evidence: EvidenceLedgerEntry[];
  conflicts?: ProjectTruthConflict[];
  /** Maximum directions total. Default 5. */
  maxDirections?: number;
  /** Maximum directions per concept. Default 2. */
  maxPerConcept?: number;
  generatedAt?: string;
}

// --- Family templates ---

interface FamilyTemplate {
  family: DirectionFamily;
  titlePrefix: string;
  visualMechanismTpl: (concept: ConceptCandidate) => string;
  systemHypothesisTpl: (concept: ConceptCandidate) => string;
  compositionLogicTpl: (concept: ConceptCandidate) => string;
  colorRelationshipTpl: (concept: ConceptCandidate) => string;
  crossMedia: CrossMediaTouchpoint[];
  spaceApplicabilityTpl: (concept: ConceptCandidate) => string;
  packagingApplicabilityTpl: (concept: ConceptCandidate) => string;
  strengths: string[];
  risks: string[];
}

const FAMILY_TEMPLATES: Record<DirectionFamily, FamilyTemplate> = {
  'structural-system': {
    family: 'structural-system',
    titlePrefix: '结构系统：',
    visualMechanismTpl: (c) => `通过一个可重复的结构逻辑组织视觉表达，让"${c.title}"成为识别核心；所有触点共享同一套结构骨架。`,
    systemHypothesisTpl: (c) => `品牌通过结构本身被识别，而不是通过装饰元素。${c.thesis}`,
    compositionLogicTpl: (c) => `层级清晰的网格结构支撑内容，信息密度可调节。`,
    colorRelationshipTpl: () => `主色与结构对比；中性色承担信息负载。`,
    crossMedia: ['brand/VI', 'editorial', 'digital/UI', 'campaign/poster'],
    spaceApplicabilityTpl: () => `结构骨架可延展到空间导视与区域关系。`,
    packagingApplicabilityTpl: () => `同一网格支撑不同包装尺寸与品类。`,
    strengths: ['识别度高', '系统可扩展', '降低单点决策成本'],
    risks: ['可能偏理性', '柔性表达受限'],
  },
  'relational-network': {
    family: 'relational-network',
    titlePrefix: '关系网络：',
    visualMechanismTpl: (c) => `独立单元通过一套可重复的关系语法连接；每个单元保持自治但通过关系被识别为同一系统。`,
    systemHypothesisTpl: (c) => `${c.thesis} 品牌通过关系而非单一对象被识别。`,
    compositionLogicTpl: () => `节点-连接-集群的层级关系，关系密度可调。`,
    colorRelationshipTpl: () => `节点色与连接色对比；不同关系类型可由不同色相表达。`,
    crossMedia: ['brand/VI', 'digital/UI', 'editorial', 'campaign/poster'],
    spaceApplicabilityTpl: () => `关系网络可延展为空间动线与人流关系。`,
    packagingApplicabilityTpl: () => `系列产品通过关系图谱组织。`,
    strengths: ['表达复杂系统', '支持多方角色', '可承载多业务'],
    risks: ['学习成本较高', '需要清晰的连接规则'],
  },
  'narrative-sequence': {
    family: 'narrative-sequence',
    titlePrefix: '叙事序列：',
    visualMechanismTpl: (c) => `价值被表达为可识别的顺序，从一个角色到另一个角色的进展；序列是视觉的骨架。`,
    systemHypothesisTpl: (c) => `${c.thesis} 品牌作为序列的组织者被体验。`,
    compositionLogicTpl: () => `顺序驱动的版式；时间轴式的视觉节奏。`,
    colorRelationshipTpl: () => `顺序阶段由色相变化支撑；中性色作为过渡。`,
    crossMedia: ['editorial', 'campaign/poster', 'digital/UI'],
    spaceApplicabilityTpl: () => `序列可对应空间路径或动线组织。`,
    packagingApplicabilityTpl: () => `产品系列作为序列的节点。`,
    strengths: ['故事感强', '适合多阶段体验', '易讲述'],
    risks: ['需要清晰的故事线', '对碎片化场景不友好'],
  },
  'symbolic-abstraction': {
    family: 'symbolic-abstraction',
    titlePrefix: '符号抽象：',
    visualMechanismTpl: (c) => `通过一个抽象的符号图腾承载品牌身份；符号可被独立识别并复用于所有触点。`,
    systemHypothesisTpl: (c) => `${c.thesis} 品牌通过一个高密度的抽象符号被识别。`,
    compositionLogicTpl: () => `符号作为视觉锚点，版式围绕符号展开。`,
    colorRelationshipTpl: () => `符号色与背景色高对比；色彩服务于符号识别。`,
    crossMedia: ['brand/VI', 'campaign/poster', 'editorial'],
    spaceApplicabilityTpl: () => `符号可作为空间记忆点与导视核心。`,
    packagingApplicabilityTpl: () => `符号主导包装识别。`,
    strengths: ['识别强度高', '跨媒介延展性好', '建立心智锚点'],
    risks: ['符号设计要求高', '需要持续维护'],
  },
  'material-expression': {
    family: 'material-expression',
    titlePrefix: '材质表达：',
    visualMechanismTpl: (c) => `通过一套材质关系承载品牌身份；不同触点使用同一套材质语言但允许质感差异。`,
    systemHypothesisTpl: (c) => `${c.thesis} 品牌通过材质感官一致性被感知。`,
    compositionLogicTpl: () => `版式服务于材质表达；留白与质感优先。`,
    colorRelationshipTpl: () => `材质色温一致性；同色系不同明度。`,
    crossMedia: ['packaging', 'space', 'brand/VI'],
    spaceApplicabilityTpl: () => `材质语言直接驱动空间材质选择。`,
    packagingApplicabilityTpl: () => `材质是包装识别的核心。`,
    strengths: ['感官记忆强', '高端感强', '可持续性强'],
    risks: ['材质成本高', '数字媒介表现受限'],
  },
  'editorial-system': {
    family: 'editorial-system',
    titlePrefix: '编辑系统：',
    visualMechanismTpl: (c) => `通过结构化的信息层级让复杂生态可读；模块化编辑层承载不同信息密度。`,
    systemHypothesisTpl: (c) => `${c.thesis} 品牌作为信息的可读组织者被识别。`,
    compositionLogicTpl: () => `版式网格支撑信息密度变化；模块可重组。`,
    colorRelationshipTpl: () => `编辑色服务于信息分类；克制使用品牌色。`,
    crossMedia: ['editorial', 'digital/UI', 'brand/VI'],
    spaceApplicabilityTpl: () => `编辑层级可延展为空间信息板与导视层级。`,
    packagingApplicabilityTpl: () => `产品信息组织遵循同一编辑规则。`,
    strengths: ['复杂信息可读', '灵活可扩展', '专业感强'],
    risks: ['可能偏理性', '需要内容运营配合'],
  },
  'modular-identity': {
    family: 'modular-identity',
    titlePrefix: '模块化身份：',
    visualMechanismTpl: (c) => `通过可重组的模块单元承载品牌；模块可拼接成不同形态但共享同一套规则。`,
    systemHypothesisTpl: (c) => `${c.thesis} 品牌通过可重组的模块系统被识别。`,
    compositionLogicTpl: () => `模块可组合可堆叠；统一网格保证可重组性。`,
    colorRelationshipTpl: () => `模块色独立但受控；色板作为模块系统的一部分。`,
    crossMedia: ['brand/VI', 'digital/UI', 'campaign/poster'],
    spaceApplicabilityTpl: () => `模块可延展为空间展陈与导视单元。`,
    packagingApplicabilityTpl: () => `包装系统由模块组合而成。`,
    strengths: ['灵活度高', '可适配多变场景', '降低设计成本'],
    risks: ['需要明确的模块规则', '避免拼贴感'],
  },
  'spatial-extension': {
    family: 'spatial-extension',
    titlePrefix: '空间延展：',
    visualMechanismTpl: (c) => `通过空间关系作为视觉系统的骨架；触点作为空间节点被组织。`,
    systemHypothesisTpl: (c) => `${c.thesis} 品牌通过空间关系被识别。`,
    compositionLogicTpl: () => `空间尺度主导版式；远近关系作为信息层级。`,
    colorRelationshipTpl: () => `空间色温支撑；距离与色彩关联。`,
    crossMedia: ['space', 'brand/VI', 'packaging'],
    spaceApplicabilityTpl: () => `空间延展是核心机制。`,
    packagingApplicabilityTpl: () => `包装承载空间叙事。`,
    strengths: ['沉浸感强', '体验维度丰富'],
    risks: ['数字媒介表现受限', '需要空间项目支撑'],
  },
};

// Map strategicPattern to a default family. If concept has no strategicPattern, default to 'structural-system'.
const CONCEPT_TO_FAMILY: Record<string, DirectionFamily> = {
  'identity-preservation': 'symbolic-abstraction',
  'system-reframing': 'structural-system',
  'value-flow': 'narrative-sequence',
  'asset-activation': 'material-expression',
  'risk-inversion': 'symbolic-abstraction',
  'clarity-through-structure': 'editorial-system',
  'relationship-as-value': 'relational-network',
  'cross-media-unification': 'modular-identity',
};

function pickFamiliesForConcept(concept: ConceptCandidate): DirectionFamily[] {
  // Primary family: from strategic pattern mapping
  const primary = CONCEPT_TO_FAMILY[concept.strategicPattern] ?? 'structural-system';
  // Secondary family: a structurally different family
  const secondaryCandidates: DirectionFamily[] = [
    'relational-network', 'narrative-sequence', 'editorial-system',
    'modular-identity', 'material-expression', 'symbolic-abstraction',
    'spatial-extension', 'structural-system',
  ].filter((f) => f !== primary) as DirectionFamily[];
  const secondary = secondaryCandidates[concept.strategicPattern.length % secondaryCandidates.length];

  return [primary, secondary];
}

function buildDirectionForConcept(
  concept: ConceptCandidate,
  family: DirectionFamily,
  variant: number,
  ctx: Omit<DirectionGenerationInput, 'concepts' | 'opportunityMap' | 'insights' | 'needs' | 'facts' | 'evidence' | 'conflicts'>,
): CreativeDirectionCandidate {
  const tpl = FAMILY_TEMPLATES[family];
  const titleSuffix = variant === 0 ? '主路径' : '备选路径';

  // Trace: inherit all concept trace + concept refs
  const conceptRefs = [concept.id];
  const opportunityRefs = [...concept.opportunityRefs];
  const insightRefs = [...concept.insightRefs];
  const needRefs = [...concept.needRefs];
  const factRefs = [...concept.factRefs];
  const evidenceRefs = [...concept.evidenceRefs];

  // Status propagation (Step 13):
  //   blocked Concept → Direction status = blocked
  //   provisional Concept → Direction max status = provisional
  //   grounded Concept → Direction may be grounded
  let status: DirectionStatus;
  if (concept.status === 'blocked') {
    status = 'blocked';
  } else if (concept.status === 'provisional') {
    status = 'provisional';
  } else {
    // grounded Concept → Direction can be grounded
    status = 'grounded';
  }

  // If concept has any unknown/identity fact, downgrade to provisional
  const conceptFacts = ctx.facts.filter((f) => factRefs.includes(f.id));
  if (conceptFacts.some((f) => f.truthClass === 'unknown')) {
    status = 'provisional';
  }

  const blockers: string[] = [];
  if (status === 'blocked') blockers.push('上游概念被阻断');
  if (status === 'provisional') blockers.push('部分事实待确认');

  return {
    id: `dir-${concept.id}-${family}-v${variant}`,
    title: `${tpl.titlePrefix}${concept.title}（${titleSuffix}）`,
    thesis: `${tpl.systemHypothesisTpl(concept)}`,

    conceptRefs,

    visualMechanism: tpl.visualMechanismTpl(concept),
    systemHypothesis: tpl.systemHypothesisTpl(concept),
    directionFamily: family,

    colorRelationship: tpl.colorRelationshipTpl(concept),
    materialRelationship: undefined,
    compositionLogic: tpl.compositionLogicTpl(concept),
    typographyBehavior: undefined,
    graphicBehavior: undefined,
    imageBehavior: undefined,

    crossMediaBehavior: tpl.crossMedia,

    spaceApplicability: tpl.spaceApplicabilityTpl(concept),
    packagingApplicability: tpl.packagingApplicabilityTpl(concept),

    opportunityRefs,
    insightRefs,
    needRefs,
    factRefs,
    evidenceRefs,

    strengths: tpl.strengths,
    risks: tpl.risks,
    blockers,

    status,

    generatedBy: 'deterministic_synthesis',
    traceVersion: DIRECTION_TRACE_VERSION,
  };
}

export interface DirectionGenerationResult {
  directions: CreativeDirectionCandidate[];
  diagnostics: string[];
}

export function generateDirections(input: DirectionGenerationInput): DirectionGenerationResult {
  const {
    concepts,
    facts,
    evidence,
    maxDirections = 5,
    maxPerConcept = 2,
  } = input;

  const diagnostics: string[] = [];
  const directions: CreativeDirectionCandidate[] = [];

  // Only generate from valid concepts (not blocked)
  const eligibleConcepts = concepts.filter((c) => c.status !== 'blocked');

  if (eligibleConcepts.length === 0) {
    diagnostics.push('NO_ELIGIBLE_CONCEPTS: 无已验证的概念可生成 Direction');
    return { directions: [], diagnostics };
  }

  // Sort concepts by priority (proxy: 3 = strong, 2 = viable, 1 = exploratory)
  // Concepts don't have explicit priority, so use fact-count as a proxy
  const sortedConcepts = [...eligibleConcepts].sort((a, b) => b.factRefs.length - a.factRefs.length);

  let remainingSlots = maxDirections;
  const ctxSubset = { ...input };

  for (const concept of sortedConcepts) {
    if (remainingSlots <= 0) break;

    // Skip concepts with no trace grounding
    if (concept.opportunityRefs.length === 0 || concept.insightRefs.length === 0
        || concept.needRefs.length === 0 || concept.factRefs.length === 0) {
      diagnostics.push(`SKIP_CONCEPT_NO_TRACE: ${concept.id} 缺少必要的追溯引用`);
      continue;
    }

    const families = pickFamiliesForConcept(concept);

    for (let v = 0; v < Math.min(families.length, maxPerConcept); v++) {
      if (remainingSlots <= 0) break;
      const direction = buildDirectionForConcept(concept, families[v], v, ctxSubset);
      directions.push(direction);
      remainingSlots--;
    }
  }

  if (directions.length === 0) {
    diagnostics.push('NO_GROUNDED_DIRECTIONS: 所有概念都缺乏足够的追溯依据');
  }

  // Reference contamination check (defense-in-depth)
  for (const d of directions) {
    const refFacts = facts.filter((f) => d.factRefs.includes(f.id) && f.isReferenceFact);
    const currentFacts = facts.filter((f) => d.factRefs.includes(f.id) && !f.isReferenceFact);
    if (refFacts.length > 0 && currentFacts.length === 0) {
      diagnostics.push(`DIRECTION_ALL_REFERENCE_FACTS: ${d.id} 仅基于参考事实`);
    }
  }

  return { directions, diagnostics };
}

// Export for tests.
export { FAMILY_TEMPLATES, CONCEPT_TO_FAMILY, pickFamiliesForConcept };
