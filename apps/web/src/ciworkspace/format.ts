// CI-W1B: Web formatters — pure display helpers.
//
// No business logic, no CI package imports. Status / family / pattern
// labels live here so the component tree is pure JSX. The Web side
// never imports the CI semantic enum types directly — it works with
// structural strings, which is exactly the runtime's wire format.

type DirectionFamily =
  | 'structural-system'
  | 'relational-network'
  | 'narrative-sequence'
  | 'symbolic-abstraction'
  | 'material-expression'
  | 'editorial-system'
  | 'modular-identity'
  | 'spatial-extension';

type StrategicPattern =
  | 'identity-preservation'
  | 'system-reframing'
  | 'value-flow'
  | 'asset-activation'
  | 'risk-inversion'
  | 'clarity-through-structure'
  | 'relationship-as-value'
  | 'cross-media-unification';

type EvaluationScore = 0 | 1 | 2 | 3;

type SelectionStatus = 'unselected' | 'selected' | 'selection_invalidated';

export const DIRECTION_FAMILY_LABELS: Record<DirectionFamily, string> = {
  'structural-system': '结构系统',
  'relational-network': '关系网络',
  'narrative-sequence': '叙事序列',
  'symbolic-abstraction': '符号抽象',
  'material-expression': '材料表达',
  'editorial-system': '编辑系统',
  'modular-identity': '模块化识别',
  'spatial-extension': '空间延展'
};

export const STRATEGIC_PATTERN_LABELS: Record<StrategicPattern, string> = {
  'identity-preservation': '身份保留',
  'system-reframing': '系统重构',
  'value-flow': '价值流',
  'asset-activation': '资产激活',
  'risk-inversion': '风险反转',
  'clarity-through-structure': '通过结构达到清晰',
  'relationship-as-value': '关系即价值',
  'cross-media-unification': '跨媒介统一'
};

export const EVALUATION_DIMENSION_LABELS: Record<string, string> = {
  'grounding': 'Grounding · 事实扎根',
  'strategic_fit': 'Strategic Fit · 战略契合',
  'need_coverage': 'Need Coverage · 需求覆盖',
  'concept_fit': 'Concept Fit · 概念契合',
  'direction_distinctness': 'Distinctness · 方向差异',
  'identity_safety': 'Identity Safety · 身份安全',
  'asset_safety': 'Asset Safety · 资产安全',
  'cross_media_coherence': 'Cross-Media · 跨媒介一致',
  'execution_readiness': 'Execution · 可执行性',
  'risk_load': 'Risk Load · 风险负载'
};

export const SCORE_LABELS: Record<EvaluationScore, string> = {
  0: '失败',
  1: '弱',
  2: '可接受',
  3: '强'
};

export const SELECTION_STATUS_LABELS: Record<SelectionStatus, string> = {
  'unselected': '未选择',
  'selected': '已选择',
  'selection_invalidated': '已失效'
};

export const RUN_STATUS_LABELS: Record<string, string> = {
  'pending': '准备中',
  'preparing_documents': '准备文档',
  'extracting_facts': '提取事实',
  'awaiting_fact_confirmation': '待事实确认 (A)',
  'building_truth': '构建项目事实',
  'building_understanding': '构建需求 / 洞察 / 机会',
  'building_concepts': '构建战略概念',
  'building_directions': '构建视觉方向',
  'evaluating': '评估方向',
  'awaiting_direction_selection': '待方向选择 (B)',
  'building_canon': '构建 Visual Canon',
  'building_translation': '构建生产翻译',
  'completed': '已完成',
  'failed': '失败',
  'cancelled': '已取消'
};

export const STATUS_TONE: Record<string, 'running' | 'ready' | 'failed' | 'done' | 'neutral'> = {
  'pending': 'neutral',
  'preparing_documents': 'running',
  'extracting_facts': 'running',
  'awaiting_fact_confirmation': 'ready',
  'building_truth': 'running',
  'building_understanding': 'running',
  'building_concepts': 'running',
  'building_directions': 'running',
  'evaluating': 'running',
  'awaiting_direction_selection': 'ready',
  'building_canon': 'running',
  'building_translation': 'running',
  'completed': 'done',
  'failed': 'failed',
  'cancelled': 'failed'
};
