// CI-W1B: Web controller — pure functions that drive the workspace.
//
// Hard invariants (Spec §21):
//   - recommendation MUST NEVER create selection
//   - selection requires explicit user action (Proposal must go through
//     `confirmProposal` before it becomes a selection)
//   - blocked Direction cannot be selected
//   - blocked Concept cannot be linked from a valid Direction
//   - no valid selection → Canon locked, Translation locked
//   - Web NEVER reaches into CI package, never reads run files
//
// All exports are pure: same input → same output, no side effects.
// Side effects (RPC calls) live in the React component, not here.

import type {
  Run,
  RunStatus,
  WorkspaceView,
  FactReview,
  FactItem,
  LocalFactRow,
  LocalFactAction,
  RunLifecycle,
  StageId,
  SelectionAvailability,
  SelectionProposal,
  ConceptReferenceability,
  TraceStep,
  CreativeIntelligenceUserView,
  ThinkingProgressKey
} from './types.ts';

// ---------------------------------------------------------------------------
// Stage rail mapping
// ---------------------------------------------------------------------------

const STAGE_BY_STATUS: Record<RunStatus, StageId> = {
  'pending': '01-input',
  'preparing_documents': '01-input',
  'extracting_facts': '01-input',
  'awaiting_fact_confirmation': '02-facts',
  'building_truth': '03-understanding',
  'building_understanding': '03-understanding',
  'building_concepts': '04-concepts',
  'building_directions': '05-directions',
  'evaluating': '06-evaluation',
  'awaiting_direction_selection': '07-selection',
  'building_canon': '08-canon',
  'building_translation': '09-translation',
  'completed': '09-translation',
  'failed': '01-input',
  'cancelled': '01-input'
};

const STAGE_LABEL_BY_STATUS: Record<RunStatus, string> = {
  'pending': '准备中',
  'preparing_documents': '准备文档',
  'extracting_facts': '提取事实',
  'awaiting_fact_confirmation': '待人工确认 (Checkpoint A)',
  'building_truth': '构建项目事实',
  'building_understanding': '构建需求 / 洞察 / 机会',
  'building_concepts': '构建战略概念',
  'building_directions': '构建视觉方向',
  'evaluating': '评估方向',
  'awaiting_direction_selection': '待人工选择 (Checkpoint B)',
  'building_canon': '构建 Visual Canon',
  'building_translation': '构建生产翻译',
  'completed': '已完成',
  'failed': '失败',
  'cancelled': '已取消'
};

/**
 * Map a run.status to the active stage id. Pure function.
 */
export function activeStageForStatus(status: RunStatus): StageId {
  return STAGE_BY_STATUS[status] ?? '01-input';
}

export function stageLabelForStatus(status: RunStatus): string {
  return STAGE_LABEL_BY_STATUS[status] ?? '未知';
}

// ---------------------------------------------------------------------------
// User view projection (CI-W1B.1 progressive disclosure)
// ---------------------------------------------------------------------------

const USER_VIEW_BY_STATUS: Record<RunStatus, CreativeIntelligenceUserView> = {
  'pending': 'thinking',
  'preparing_documents': 'thinking',
  'extracting_facts': 'thinking',
  'awaiting_fact_confirmation': 'fact-review',
  'building_truth': 'thinking',
  'building_understanding': 'thinking',
  'building_concepts': 'thinking',
  'building_directions': 'thinking',
  'evaluating': 'thinking',
  'awaiting_direction_selection': 'direction-decision',
  'building_canon': 'thinking',
  'building_translation': 'thinking',
  'completed': 'visual-system',
  'failed': 'input',
  'cancelled': 'input'
};

/**
 * Pure function. Project a run status onto the five user-facing views.
 * No active run (null/undefined) renders the upload-first input view.
 * failed / cancelled fall back to the input view where the run list
 * presents the error and the recovery actions (恢复 / 删除).
 */
export function deriveCreativeIntelligenceUserView(
  status: RunStatus | null | undefined
): CreativeIntelligenceUserView {
  if (!status) return 'input';
  return USER_VIEW_BY_STATUS[status] ?? 'input';
}

const THINKING_PROGRESS_BY_STATUS: Record<RunStatus, ThinkingProgressKey | null> = {
  'pending': 'intake',
  'preparing_documents': 'intake',
  'extracting_facts': 'intake',
  'awaiting_fact_confirmation': null,
  'building_truth': 'core-information',
  'building_understanding': 'core-information',
  'building_concepts': 'opportunities',
  'building_directions': 'direction-evaluation',
  'evaluating': 'direction-evaluation',
  'awaiting_direction_selection': null,
  'building_canon': 'visual-system-build',
  'building_translation': 'visual-system-build',
  'completed': null,
  'failed': null,
  'cancelled': null
};

/**
 * Pure function. Friendly progress step for the single Thinking view.
 * Returns null when the run is not inside the internal reasoning
 * pipeline (checkpoints / terminal states).
 */
export function deriveThinkingProgress(
  status: RunStatus | null | undefined
): ThinkingProgressKey | null {
  if (!status) return null;
  return THINKING_PROGRESS_BY_STATUS[status] ?? null;
}

/**
 * Compute the lifecycle view-model for a run. Pure function.
 *
 * - resumable: run is in a human-checkpoint state OR failed
 * - cancellable: run is in an executing state
 * - removable: run is NOT in an executing state
 * - completable: run.status === 'completed'
 */
export function deriveRunLifecycle(run: Run): RunLifecycle {
  const executingStates = new Set<RunStatus>([
    'pending', 'preparing_documents', 'extracting_facts', 'building_truth',
    'building_understanding', 'building_concepts', 'building_directions',
    'evaluating', 'building_canon', 'building_translation'
  ]);
  const checkpointStates = new Set<RunStatus>([
    'awaiting_fact_confirmation', 'awaiting_direction_selection'
  ]);
  const isExecuting = executingStates.has(run.status);
  const isCheckpoint = checkpointStates.has(run.status);
  return {
    run,
    resumable: isCheckpoint || run.status === 'failed',
    cancellable: isExecuting,
    removable: !isExecuting,
    completable: run.status === 'completed',
    activeStage: activeStageForStatus(run.status),
    stageLabel: stageLabelForStatus(run.status)
  };
}

// ---------------------------------------------------------------------------
// Direction / Concept referenceability (Spec §8, §11)
// ---------------------------------------------------------------------------

/**
 * Pure function. The Web side MUST use this helper to decide which
 * Concept ids may be linked from a Direction. The P0 fix in CI-W1A
 * guarantees that the runtime never produces a Direction referencing
 * a blocked Concept; the Web side mirrors that here so a stale
 * WorkspaceView snapshot cannot leak a forbidden link into the UI.
 */
export function computeConceptReferenceability(workspace: WorkspaceView | null): ConceptReferenceability {
  if (!workspace) {
    return { referenceableConceptIds: new Set(), blockedConceptIds: new Set(), blockedDirectionIds: new Set() };
  }
  const conceptSet = workspace.conceptSet as null | { concepts?: Array<{ id: string; status?: string }>; blockedConceptIds?: string[] };
  const directionSet = workspace.directionSet as null | { directions?: Array<{ id: string; status?: string }>; blockedDirectionIds?: string[] };
  const blockedConcepts = new Set<string>(conceptSet?.blockedConceptIds ?? []);
  const blockedDirections = new Set<string>(directionSet?.blockedDirectionIds ?? []);
  const referenceable = new Set<string>();
  for (const concept of conceptSet?.concepts ?? []) {
    if (blockedConcepts.has(concept.id)) continue;
    if (concept.status === 'blocked') continue;
    referenceable.add(concept.id);
  }
  return { referenceableConceptIds: referenceable, blockedConceptIds: blockedConcepts, blockedDirectionIds: blockedDirections };
}

/**
 * Pure function. Determine whether a Direction may be selected.
 * Hard rule: blocked Direction may NEVER be selectable. The
 * recommendation may exist without being selected; that does NOT
 * auto-make the recommended Direction the current selection.
 */
export function evaluateSelectionAvailability(
  direction: { id: string; status?: string } | null,
  directionSet: { directions?: Array<{ id: string; status?: string }>; blockedDirectionIds?: string[] } | null | undefined,
  selectedDirectionId: string | null | undefined,
  recommendation: { primaryDirectionId?: string | null; recommendedDirectionIds?: string[] } | null | undefined
): SelectionAvailability {
  if (!direction) {
    return { selectable: false, reason: 'no-direction-set', isRecommended: false, isAlreadySelected: false, isBlocked: false };
  }
  const blockedIds = new Set<string>(directionSet?.blockedDirectionIds ?? []);
  const isBlocked = blockedIds.has(direction.id) || direction.status === 'blocked';
  if (isBlocked) {
    return { selectable: false, reason: 'direction-blocked', isRecommended: false, isAlreadySelected: false, isBlocked: true };
  }
  const recIds = new Set<string>(recommendation?.recommendedDirectionIds ?? []);
  const isRecommended = recIds.has(direction.id) || recommendation?.primaryDirectionId === direction.id;
  const isAlreadySelected = selectedDirectionId === direction.id;
  return { selectable: !isAlreadySelected, reason: null, isRecommended, isAlreadySelected, isBlocked: false };
}

/**
 * Pure function. Build an in-flight selection proposal. The component
 * MUST show a confirm dialog before calling `confirmProposal`.
 *
 * Hard rule: this proposal is created ONLY when the user explicitly
 * clicks "选择此方向". Recommendation auto-promotion is forbidden.
 */
export function buildSelectionProposal(input: {
  direction: { id: string; title?: string };
  selectedDirectionId: string | null;
  selectionRevision: number;
  recommendation: { primaryDirectionId?: string | null; recommendedDirectionIds?: string[] } | null;
}): SelectionProposal {
  const isRecommended = !!(input.recommendation?.primaryDirectionId === input.direction.id
    || (input.recommendation?.recommendedDirectionIds ?? []).includes(input.direction.id));
  const isRevision = input.selectedDirectionId !== null
    && input.selectedDirectionId !== input.direction.id;
  return {
    directionId: input.direction.id,
    directionTitle: input.direction.title ?? input.direction.id,
    recommended: isRecommended,
    isRevision,
    previousDirectionId: input.selectedDirectionId,
    newRevision: input.selectionRevision + 1,
    requiresConfirmation: true
  };
}

// ---------------------------------------------------------------------------
// Fact review view-model
// ---------------------------------------------------------------------------

/**
 * Pure function. Initialize a per-fact edit buffer from the server's
 * fact review. All facts start in the 'confirm' action; the user can
 * flip them to 'edit' / 'remove' / 'unknown' through the UI, but the
 * Web side never reaches into the server's `userAction` field — the
 * local action is sent as-is on `confirmFacts`.
 */
export function buildLocalFactRows(facts: FactItem[]): LocalFactRow[] {
  return facts.map((fact) => ({
    field: fact.field,
    value: fact.value,
    authority: fact.authority,
    sourceRef: fact.sourceRef ?? null,
    evidenceRefs: fact.evidenceRefs ?? [],
    userAction: 'confirm',
    editedValue: fact.value,
    hasEdited: false
  }));
}

export function applyLocalFactEdit(rows: LocalFactRow[], field: string, value: unknown): LocalFactRow[] {
  return rows.map((row) => row.field === field
    ? { ...row, userAction: 'edit' as LocalFactAction, editedValue: value, hasEdited: true }
    : row);
}

export function applyLocalFactAction(rows: LocalFactRow[], field: string, action: LocalFactAction): LocalFactRow[] {
  return rows.map((row) => row.field === field
    ? {
      ...row,
      userAction: action,
      editedValue: action === 'edit' ? row.editedValue : action === 'remove' ? null : action === 'unknown' ? null : row.value
    }
    : row);
}

/**
 * Pure function. Materialize the local rows back to the
 * CreativeIntelligenceFactItem[] shape the runtime expects.
 * 'remove' / 'unknown' clear value; 'edit' uses editedValue; 'confirm' uses original.
 */
export function serializeFactRows(rows: LocalFactRow[]): FactItem[] {
  return rows.map((row) => {
    let value: unknown;
    switch (row.userAction) {
      case 'confirm': value = row.value; break;
      case 'edit': value = row.hasEdited ? row.editedValue : row.value; break;
      case 'remove': value = null; break;
      case 'unknown': value = null; break;
    }
    return {
      field: row.field,
      value,
      authority: row.authority,
      sourceRef: row.sourceRef ?? undefined,
      evidenceRefs: row.evidenceRefs,
      userAction: row.userAction
    };
  });
}

// ---------------------------------------------------------------------------
// Trace chain
// ---------------------------------------------------------------------------

/**
 * Pure function. Build the flat Trace Drawer list from a WorkspaceView.
 * Direction → Concept → Opportunity → Insight → Need → Fact → Evidence.
 * Stale values (WorkspaceView without selection) skip the Direction step.
 */
export function buildTraceChain(workspace: WorkspaceView | null): TraceStep[] {
  if (!workspace) return [];
  const out: TraceStep[] = [];
  const directionSet = workspace.directionSet as null | { directions?: Array<{ id: string; title?: string; thesis?: string; status?: string }> };
  const conceptSet = workspace.conceptSet as null | { concepts?: Array<{ id: string; title?: string; thesis?: string; status?: string }>; blockedConceptIds?: string[] };
  const opportunityMap = workspace.opportunityMap as null | { opportunities?: Array<{ id: string; title?: string; description?: string; status?: string }> };
  const needs = (workspace.needs ?? []) as Array<{ id: string; title?: string; description?: string; status?: string }>;
  const insights = (workspace.insights ?? []) as Array<{ id: string; title?: string; description?: string; status?: string }>;
  const truth = workspace.truth as null | { facts?: Array<{ id: string; field: string; value: unknown; status?: string }> };
  const evidence = workspace.evidence as null | { entries?: Array<{ id: string; sourceRef?: string; summary?: string; status?: string }> };

  const selected = workspace.selectedDirectionSnapshot as null | { directionId: string };
  if (selected) {
    const direction = directionSet?.directions?.find((d) => d.id === selected.directionId);
    if (direction) {
      out.push({
        kind: 'direction',
        id: direction.id,
        label: direction.title ?? direction.id,
        detail: direction.thesis ?? '',
        status: (direction.status as TraceStep['status']) ?? 'valid',
        refs: [direction.id]
      });
    }
  }
  for (const concept of conceptSet?.concepts ?? []) {
    out.push({
      kind: 'concept',
      id: concept.id,
      label: concept.title ?? concept.id,
      detail: concept.thesis ?? '',
      status: (concept.status as TraceStep['status']) ?? 'valid',
      refs: [concept.id]
    });
  }
  for (const opp of opportunityMap?.opportunities ?? []) {
    out.push({
      kind: 'opportunity',
      id: opp.id,
      label: opp.title ?? opp.id,
      detail: opp.description ?? '',
      status: (opp.status as TraceStep['status']) ?? 'valid',
      refs: [opp.id]
    });
  }
  for (const ins of insights) {
    out.push({
      kind: 'insight',
      id: ins.id,
      label: ins.title ?? ins.id,
      detail: ins.description ?? '',
      status: (ins.status as TraceStep['status']) ?? 'valid',
      refs: [ins.id]
    });
  }
  for (const need of needs) {
    out.push({
      kind: 'need',
      id: need.id,
      label: need.title ?? need.id,
      detail: need.description ?? '',
      status: (need.status as TraceStep['status']) ?? 'valid',
      refs: [need.id]
    });
  }
  for (const fact of truth?.facts ?? []) {
    out.push({
      kind: 'fact',
      id: fact.id,
      label: fact.field,
      detail: typeof fact.value === 'string' ? fact.value : JSON.stringify(fact.value),
      status: (fact.status as TraceStep['status']) ?? 'valid',
      refs: [fact.id]
    });
  }
  for (const entry of evidence?.entries ?? []) {
    out.push({
      kind: 'evidence',
      id: entry.id,
      label: entry.sourceRef ?? entry.id,
      detail: entry.summary ?? '',
      status: (entry.status as TraceStep['status']) ?? 'valid',
      refs: [entry.id]
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fact review grouping (CI-W1B.1 user-facing groups)
// ---------------------------------------------------------------------------

export interface FactRowGroup {
  key: string;
  label: string;
  rows: LocalFactRow[];
}

const FACT_GROUP_ORDER = ['brand', 'business', 'product', 'audience', 'requirements', 'locked', 'unconfirmed'] as const;

/**
 * Pure function. Partition the local fact rows into the user-facing
 * groups: 品牌 / 业务 / 产品·服务 / 目标用户 / 核心要求 / Locked Facts /
 * 尚未确认. Grouping is derived from the fact field name (heuristics),
 * the authority ('locked' → Locked Facts) and the local action
 * ('unknown' → 尚未确认). Internal fields are never shown.
 */
export function groupFactRows(rows: LocalFactRow[]): FactRowGroup[] {
  const groups: Record<'brand' | 'business' | 'product' | 'audience' | 'requirements' | 'locked' | 'unconfirmed', FactRowGroup> = {
    brand: { key: 'brand', label: '品牌', rows: [] },
    business: { key: 'business', label: '业务', rows: [] },
    product: { key: 'product', label: '产品 / 服务', rows: [] },
    audience: { key: 'audience', label: '目标用户', rows: [] },
    requirements: { key: 'requirements', label: '核心要求', rows: [] },
    locked: { key: 'locked', label: 'Locked Facts', rows: [] },
    unconfirmed: { key: 'unconfirmed', label: '尚未确认', rows: [] }
  };
  for (const row of rows) {
    let key: keyof typeof groups = 'requirements';
    const field = String(row.field ?? '');
    const authority = String(row.authority ?? '');
    if (row.userAction === 'unknown') key = 'unconfirmed';
    else if (/locked/i.test(authority)) key = 'locked';
    else if (/brand|品牌|logo|标识|vi|视觉识别|名称|name/i.test(field)) key = 'brand';
    else if (/business|业务|industry|行业|positioning|定位|market|市场|渠道|channel/i.test(field)) key = 'business';
    else if (/product|产品|service|服务|category|品类|sku|offer/i.test(field)) key = 'product';
    else if (/audience|用户|target|客群|consumer|customer|客户|persona/i.test(field)) key = 'audience';
    groups[key].rows.push(row);
  }
  return FACT_GROUP_ORDER
    .filter((groupKey) => groups[groupKey].rows.length > 0)
    .map((groupKey) => groups[groupKey]);
}

// ---------------------------------------------------------------------------
// Diagnostic grouping
// ---------------------------------------------------------------------------

export interface DiagnosticGroups {
  blocking: string[];
  warning: string[];
  diagnostic: string[];
}

/**
 * Pure function. Group workspace diagnostics into blocking / warning /
 * diagnostic. Anything containing a PT_, SELECTION_, ANCHOR_, or
 * CONCEPT_ error code is treated as blocking.
 */
export function groupDiagnostics(workspace: WorkspaceView | null): DiagnosticGroups {
  const out: DiagnosticGroups = { blocking: [], warning: [], diagnostic: [] };
  if (!workspace) return out;
  const all = [
    ...(workspace.blockers ?? []),
    ...(workspace.warnings ?? []),
    ...(workspace.diagnostics ?? [])
  ];
  for (const item of all) {
    if (/(?:BLOCKED|VIOLATION|MISSING|REQUIRED|INVALID|CONFLICT|LEAKAGE|UNSUPPORTED|AUTH)/i.test(item)) {
      out.blocking.push(item);
    } else if (/(?:WARN|REVIEW|CONFIDENCE_LOW|UNKNOWN)/i.test(item)) {
      out.warning.push(item);
    } else {
      out.diagnostic.push(item);
    }
  }
  return out;
}
