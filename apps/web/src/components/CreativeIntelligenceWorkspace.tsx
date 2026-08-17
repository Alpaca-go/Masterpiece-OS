// CreativeIntelligenceWorkspace — CI-W1B Web Workspace.
//
// Architecture:
//   - Controller (ciworkspace/controller.ts) owns all state transitions.
//   - This component owns: lifecycle wiring (RPC calls, progress events),
//     layout, sub-views, and dialogs.
//   - The component NEVER reads run files from disk. The only CI access
//     is through `window.masterpiece.creativeIntelligence` (kebab-case RPC).
//   - The component NEVER imports from @masterpiece/creative-intelligence.
//   - The component NEVER auto-selects the recommendation. Selection is
//     gated by an explicit user click + confirm dialog.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CreativeIntelligenceFactReview,
  CreativeIntelligenceProgress,
  CreativeIntelligenceRun,
  CreativeIntelligenceWorkspaceView,
  PublicSettings
} from '@masterpiece/runtime-core/application-contracts.ts';
import {
  STAGES,
  type FactReview,
  type LocalFactRow,
  type Run,
  type RunLifecycle,
  type SelectionAvailability,
  type SelectionProposal,
  type StageId,
  type WorkspaceView
} from '../ciworkspace/types.ts';
import {
  activeStageForStatus,
  applyLocalFactAction,
  applyLocalFactEdit,
  buildLocalFactRows,
  buildSelectionProposal,
  buildTraceChain,
  computeConceptReferenceability,
  deriveRunLifecycle,
  evaluateSelectionAvailability,
  groupDiagnostics,
  serializeFactRows,
  stageLabelForStatus
} from '../ciworkspace/controller.ts';
import { cleanError, formatRelativeTime } from '../utils';
import { AppShell } from './layout/AppShell';
import { TopBar, TopBarActions, TopBarBreadcrumb } from './layout/TopBar';
import { Button } from './ui/Button';
import { DIRECTION_FAMILY_LABELS, EVALUATION_DIMENSION_LABELS, RUN_STATUS_LABELS, SCORE_LABELS, STATUS_TONE, STRATEGIC_PATTERN_LABELS } from '../ciworkspace/format.ts';

interface Props {
  settings: PublicSettings;
  selectedApiProfileId: string;
  onApiProfileChange(profileId: string): void;
  onBack(): void;
  onOpenSettings(): void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CreativeIntelligenceWorkspace({ settings, selectedApiProfileId, onApiProfileChange, onBack, onOpenSettings }: Props) {
  const profiles = settings.profiles.filter((profile) => profile.isEnabled);
  const initialProfile = profiles.find((profile) => profile.isDefault) || profiles[0];
  const profileId = profiles.some((profile) => profile.id === selectedApiProfileId)
    ? selectedApiProfileId
    : initialProfile?.id || '';

  const [runs, setRuns] = useState<Run[]>([]);
  const [activeRunId, setActiveRunId] = useState<string>('');
  const [activeView, setActiveView] = useState<WorkspaceView | null>(null);
  const [factReview, setFactReview] = useState<FactReview | null>(null);
  const [localFactRows, setLocalFactRows] = useState<LocalFactRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [progressEvent, setProgressEvent] = useState<CreativeIntelligenceProgress | null>(null);
  const [pendingSelection, setPendingSelection] = useState<SelectionProposal | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [stageFilter, setStageFilter] = useState<StageId | null>(null);
  const [inputDocumentPaths, setInputDocumentPaths] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');

  const ci = window.masterpiece.creativeIntelligence;

  // ── Lifecycle: list runs on mount + subscribe to progress ──
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await ci.listRuns();
        if (cancelled) return;
        setRuns(list);
      } catch (reason) { setError(cleanError(reason)); }
    })();
    const off = ci.onProgress((event: CreativeIntelligenceProgress) => {
      setProgressEvent(event);
    });
    return () => { cancelled = true; off(); };
  }, []);

  const refreshRuns = useCallback(async () => {
    const list = await ci.listRuns();
    setRuns(list);
    return list;
  }, [ci]);

  const refreshActive = useCallback(async (runId: string) => {
    try {
      const view = await ci.getWorkspace(runId);
      setActiveView(view);
    } catch (reason) { setError(cleanError(reason)); }
  }, [ci]);

  // Re-fetch workspace whenever runId changes OR progress event arrives
  useEffect(() => {
    if (!activeRunId) return;
    void refreshActive(activeRunId).catch(() => undefined);
  }, [activeRunId, progressEvent?.stage, refreshActive]);

  const lifecycles = useMemo(() => runs.map((run) => deriveRunLifecycle(run)), [runs]);
  const activeLifecycle: RunLifecycle | null = useMemo(
    () => lifecycles.find((lifecycle) => lifecycle.run.id === activeRunId) ?? null,
    [lifecycles, activeRunId]
  );

  // ── Input stage: start a run ──
  const handleStart = useCallback(async () => {
    if (!profileId) { setError('请先选择一个已启用的 API Profile。'); return; }
    if (!inputDocumentPaths.length) { setError('请至少添加一份文档。'); return; }
    setBusy(true); setError(''); setNotice(''); setActiveView(null); setFactReview(null); setLocalFactRows([]);
    try {
      const run = await ci.start({
        documentPaths: inputDocumentPaths,
        apiProfileId: profileId,
        projectName: projectName || undefined
      });
      setActiveRunId(run.id);
      setInputDocumentPaths([]);
      setProjectName('');
      await refreshRuns();
      setNotice('文档已提交。等待事实提取完成。');
    } catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }, [ci, profileId, inputDocumentPaths, projectName, refreshRuns]);

  const handleChooseDocuments = useCallback(async () => {
    try {
      const chosen = await window.masterpiece.documentContext.chooseDocuments();
      if (!chosen.length) return;
      setInputDocumentPaths((current) => [...new Set([...current, ...chosen])]);
    } catch (reason) { setError(cleanError(reason)); }
  }, []);

  // ── Fact review (Checkpoint A) ──
  const handleOpenFactReview = useCallback(async (runId: string) => {
    setBusy(true); setError('');
    try {
      const review = await ci.getFactReview(runId) as CreativeIntelligenceFactReview;
      setFactReview(review as FactReview);
      setLocalFactRows(buildLocalFactRows(review.facts));
    } catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }, [ci]);

  const handleConfirmFacts = useCallback(async () => {
    if (!activeRunId || !factReview) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const updated = await ci.confirmFacts(activeRunId, serializeFactRows(localFactRows)) as Run;
      setFactReview(null);
      setLocalFactRows([]);
      setNotice('事实已确认。系统将构建项目 Truth 与后续 Concept / Direction。');
      await refreshRuns();
      void refreshActive(updated.id);
    } catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }, [ci, activeRunId, factReview, localFactRows, refreshRuns, refreshActive]);

  // ── Selection (Checkpoint B) ──
  const handleProposeSelection = useCallback((direction: { id: string; title?: string }) => {
    if (!activeView) return;
    const proposal = buildSelectionProposal({
      direction,
      selectedDirectionId: activeView.run.selectedDirectionId ?? null,
      selectionRevision: activeView.run.selectionRevision,
      recommendation: activeView.recommendation as { primaryDirectionId?: string | null; recommendedDirectionIds?: string[] } | null
    });
    setPendingSelection(proposal);
  }, [activeView]);

  const handleConfirmSelection = useCallback(async () => {
    if (!activeRunId || !pendingSelection) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const view = await ci.selectDirection(activeRunId, {
        directionId: pendingSelection.directionId,
        reason: 'user-confirmed',
        occurredAt: new Date().toISOString()
      }) as CreativeIntelligenceWorkspaceView;
      setActiveView(view as WorkspaceView);
      setPendingSelection(null);
      setNotice(`已选择方向：${pendingSelection.directionTitle}。Canon / Anchor / Translation 已重建。`);
      await refreshRuns();
    } catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }, [ci, activeRunId, pendingSelection, refreshRuns]);

  // ── Run lifecycle: resume / cancel / remove ──
  const handleResume = useCallback(async (runId: string) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await ci.resume(runId);
      setActiveRunId(runId);
      await refreshRuns();
    } catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }, [ci, refreshRuns]);

  const handleCancel = useCallback(async (runId: string) => {
    if (!window.confirm('确定取消这个 Creative Intelligence 任务吗？')) return;
    try {
      await ci.cancel(runId);
      if (activeRunId === runId) setActiveRunId('');
      await refreshRuns();
    } catch (reason) { setError(cleanError(reason)); }
  }, [ci, activeRunId, refreshRuns]);

  const handleRemove = useCallback(async (run: Run) => {
    if (!window.confirm(`确定删除任务“${run.projectName}”吗？\n\n此操作会永久删除该任务的所有运行记录、Concept / Direction / Canon / 翻译合同。`)) return;
    try {
      await ci.remove(run.id);
      if (activeRunId === run.id) {
        setActiveRunId('');
        setActiveView(null);
        setFactReview(null);
        setLocalFactRows([]);
      }
      await refreshRuns();
    } catch (reason) { setError(cleanError(reason)); }
  }, [ci, activeRunId, refreshRuns]);

  // ── View switch helpers ──
  const openRun = useCallback(async (run: Run) => {
    setActiveRunId(run.id);
    setError(''); setNotice('');
    setFactReview(null); setLocalFactRows([]);
    setPendingSelection(null);
    setStageFilter(null);
    try {
      const view = await ci.getWorkspace(run.id);
      setActiveView(view as WorkspaceView);
      if (run.status === 'awaiting_fact_confirmation') await handleOpenFactReview(run.id);
    } catch (reason) { setError(cleanError(reason)); }
  }, [ci, handleOpenFactReview]);

  // ── Computed ──
  const conceptRef = useMemo(() => computeConceptReferenceability(activeView), [activeView]);
  const trace = useMemo(() => buildTraceChain(activeView), [activeView]);
  const diagnostics = useMemo(() => groupDiagnostics(activeView), [activeView]);
  const directionSet = activeView?.directionSet as null | { directions?: Array<{ id: string; title?: string; thesis?: string; systemHypothesis?: string; visualMechanism?: string; directionFamily?: string; colorRelationship?: string; materialRelationship?: string; compositionLogic?: string; typographyBehavior?: string; graphicBehavior?: string; imageBehavior?: string; crossMediaBehavior?: string[]; spaceApplicability?: string; packagingApplicability?: string; strengths?: string[]; risks?: string[]; status?: string }> } | undefined;
  const recommendations = activeView?.recommendation as null | { primaryDirectionId?: string | null; recommendedDirectionIds?: string[]; confidence?: string; rationale?: string[]; tradeoffs?: string[]; status?: string };
  const evaluationSet = activeView?.evaluation as null | { evaluations?: Array<{ directionId: string; dimensions?: Record<string, { score: number; reason?: string }>; totalScore?: number; blocked?: boolean; warnings?: string[]; strengths?: string[]; tradeoffs?: string[] }>; ranking?: { rankedDirectionIds?: string[]; rankingReason?: string[] }; recommendation?: { recommendedDirectionIds?: string[]; primaryDirectionId?: string | null; rationale?: string[]; tradeoffs?: string[]; confidence?: string; status?: string } };
  const conceptSet = activeView?.conceptSet as null | { concepts?: Array<{ id: string; title?: string; thesis?: string; strategicMechanism?: string; strategicPattern?: string; status?: string; strengths?: string[]; risks?: string[]; blockers?: string[]; factRefs?: string[]; evidenceRefs?: string[] }> };
  const opportunityMap = activeView?.opportunityMap as null | { opportunities?: Array<{ id: string; title?: string; description?: string }> };
  const needs = (activeView?.needs ?? []) as Array<{ id: string; title?: string; description?: string }>;
  const insights = (activeView?.insights ?? []) as Array<{ id: string; title?: string; description?: string }>;
  const truth = activeView?.truth as null | { facts?: Array<{ id: string; field: string; value: unknown; status?: string }> };
  const visualCanon = activeView?.visualCanon as null | { creativeThesis?: string; visualMechanism?: string; systemHypothesis?: string; directionFamily?: string; visualDNA?: unknown; visualGrammar?: unknown; crossMediaCanon?: unknown; lockedAssetRules?: unknown[]; prohibitedMutations?: string[]; status?: string };
  const anchorContract = activeView?.anchorContract as null | { purpose?: string; mustDemonstrate?: string[]; mustPreserve?: string[]; mayExplore?: string[]; mustNotChange?: string[]; evaluationCriteria?: unknown[]; status?: string };
  const productionTranslation = activeView?.productionTranslation as null | { context?: unknown; space?: { mustPreserve?: string[]; mayAdapt?: string[]; mustNotIntroduce?: string[]; spatialIdentityRules?: Array<{ id: string; rule: string; invariantLevel: string }>; zoneRelationshipRules?: Array<{ id: string; rule: string }>; environmentalGraphicRules?: Array<{ id: string; rule: string }>; wayfindingRules?: Array<{ id: string; rule: string }>; materialBehaviorRules?: Array<{ id: string; rule: string }>; brandPresenceRules?: Array<{ id: string; rule: string }>; scaleAdaptationRules?: Array<{ id: string; rule: string }>; prohibitedSpatialDrift?: string[]; status?: string }; packaging?: { mustPreserve?: string[]; mayAdapt?: string[]; mustNotIntroduce?: string[]; productIdentityRules?: Array<{ id: string; rule: string }>; structurePreservationRules?: Array<{ id: string; rule: string }>; informationHierarchyRules?: Array<{ id: string; rule: string }>; familySystemRules?: Array<{ id: string; rule: string }>; materialBehaviorRules?: Array<{ id: string; rule: string }>; brandPresenceRules?: Array<{ id: string; rule: string }>; lockedCopyRules?: Array<{ id: string; rule: string }>; prohibitedPackagingDrift?: string[]; status?: string } };

  const activeStage: StageId = activeLifecycle?.activeStage ?? '01-input';
  const selectedDirectionId = activeView?.run.selectedDirectionId ?? null;
  const canonLocked = !selectedDirectionId;
  const translationLocked = canonLocked || !activeView?.visualCanon;

  // ── Render ──
  return <AppShell
    topBar={
      <TopBar
        left={
          <TopBarBreadcrumb
            items={[
              { label: '项目', onClick: onBack },
              { label: 'Creative Intelligence' }
            ]}
          />
        }
        right={
          <TopBarActions>
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>API 设置</Button>
            <Button variant="primary" size="sm" onClick={onBack}>返回首页</Button>
          </TopBarActions>
        }
      />
    }
    bottomBar={<>
      <span>Creative Intelligence · 5.0.0-rc.1</span>
      <span>{runs.length} 个任务 · {lifecycles.filter((l) => l.run.status === 'completed').length} 个完成</span>
    </>}
  >
    <div className="page ci-workspace" data-ciw-stage={activeStage}>
      <header className="page-header ci-workspace__header">
        <div>
          <p className="eyebrow">CREATIVE INTELLIGENCE</p>
          <h1>Creative Intelligence Web Workspace</h1>
          <p>从文档出发，逐步构建项目事实、概念、方向，最终落成可被下游消费的可视规范 (Canon + 翻译合同)。</p>
        </div>
        <div className="ci-workspace__runstate">
          {activeLifecycle ? <RunStateBadge lifecycle={activeLifecycle} /> : <span className="ci-workspace__hint">选择下方一个任务开始</span>}
        </div>
      </header>

      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice ok" role="status">{notice}</div>}

      <div className="ci-workspace__rail" data-ciw-active-stage={activeStage}>
        {STAGES.map((stage, index) => {
          const stageStatus = stageStatusOf(stage.id, activeStage, activeLifecycle?.run.status);
          return <button
            key={stage.id}
            className={`ci-stage ci-stage--${stageStatus}`}
            onClick={() => setStageFilter(stageFilter === stage.id ? null : stage.id)}
            aria-pressed={stageFilter === stage.id}
            disabled={!activeLifecycle && stage.id !== '01-input'}
          >
            <span className="ci-stage__num">{String(index + 1).padStart(2, '0')}</span>
            <span className="ci-stage__label">{stage.label}</span>
            <small>{stage.hint}</small>
          </button>;
        })}
      </div>

      <div className="ci-workspace__body">
        {!activeLifecycle ? <RunListPanel lifecycles={lifecycles} onOpen={(run) => void openRun(run)} onResume={handleResume} onCancel={handleCancel} onRemove={handleRemove} /> : (
          <>
            <RunDetailTabs
              view={activeView}
              lifecycle={activeLifecycle}
              profiles={profiles}
              profileId={profileId}
              onProfileChange={onApiProfileChange}
              inputDocumentPaths={inputDocumentPaths}
              projectName={projectName}
              onProjectNameChange={setProjectName}
              onAddDocuments={handleChooseDocuments}
              onRemoveDocument={(path) => setInputDocumentPaths((cur) => cur.filter((p) => p !== path))}
              onStart={handleStart}
              busy={busy}
              activeStage={activeStage}
              stageFilter={stageFilter}
              // Stage 02 — Facts
              factReview={factReview}
              localFactRows={localFactRows}
              onSetLocalAction={(field, action) => setLocalFactRows((cur) => applyLocalFactAction(cur, field, action))}
              onSetLocalEdit={(field, value) => setLocalFactRows((cur) => applyLocalFactEdit(cur, field, value))}
              onOpenFactReview={() => void handleOpenFactReview(activeLifecycle.run.id)}
              onConfirmFacts={handleConfirmFacts}
              // Stage 03 — Understanding
              truth={truth}
              needs={needs}
              insights={insights}
              opportunityMap={opportunityMap}
              // Stage 04 — Concept
              conceptSet={conceptSet}
              conceptRef={conceptRef}
              // Stage 05/06 — Direction + Evaluation
              directionSet={directionSet}
              evaluationSet={evaluationSet}
              recommendations={recommendations}
              onProposeSelection={handleProposeSelection}
              selectedDirectionId={selectedDirectionId}
              // Stage 08 — Canon + Anchor
              visualCanon={visualCanon}
              anchorContract={anchorContract}
              canonLocked={canonLocked}
              // Stage 09 — Translation
              productionTranslation={productionTranslation}
              translationLocked={translationLocked}
              onResume={() => void handleResume(activeLifecycle.run.id)}
              onRemove={() => void handleRemove(activeLifecycle.run)}
              onCancel={() => void handleCancel(activeLifecycle.run.id)}
            />
          </>
        )}
      </div>

      {activeView && (
        <TraceDrawer
          open={showTrace}
          onClose={() => setShowTrace(false)}
          onOpen={() => setShowTrace(true)}
          steps={trace}
          diagnostics={diagnostics}
        />
      )}

      {pendingSelection && (
        <SelectionDialog
          proposal={pendingSelection}
          onCancel={() => setPendingSelection(null)}
          onConfirm={() => void handleConfirmSelection()}
          busy={busy}
        />
      )}
    </div>
  </AppShell>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function stageStatusOf(stageId: StageId, activeStage: StageId, status: CreativeIntelligenceRun['status'] | undefined): 'done' | 'active' | 'pending' | 'failed' {
  if (status === 'failed' || status === 'cancelled') {
    return activeStage === stageId ? 'failed' : 'pending';
  }
  const order: StageId[] = STAGES.map((stage) => stage.id);
  const activeIdx = order.indexOf(activeStage);
  const thisIdx = order.indexOf(stageId);
  if (thisIdx < activeIdx) return 'done';
  if (thisIdx === activeIdx) return 'active';
  return 'pending';
}

function RunStateBadge({ lifecycle }: { lifecycle: RunLifecycle }) {
  const tone = STATUS_TONE[lifecycle.run.status] ?? 'neutral';
  return <div className={`ci-runstate-badge ci-runstate-badge--${tone}`}>
    <strong>{RUN_STATUS_LABELS[lifecycle.run.status] ?? lifecycle.run.status}</strong>
    <small>{lifecycle.run.projectName} · 修订 v{lifecycle.run.selectionRevision}</small>
  </div>;
}

function RunListPanel({ lifecycles, onOpen, onResume, onCancel, onRemove }: {
  lifecycles: RunLifecycle[];
  onOpen(run: Run): void;
  onResume(runId: string): void;
  onCancel(runId: string): void;
  onRemove(run: Run): void;
}) {
  if (lifecycles.length === 0) {
    return <div className="ci-empty">
      <div className="ci-empty__orbit" />
      <strong>还没有 Creative Intelligence 任务</strong>
      <p>在右侧 <em>Input</em> 步骤上传文档即可开始第一个任务。</p>
    </div>;
  }
  return <div className="ci-run-list">
    {lifecycles.map((lifecycle) => <div key={lifecycle.run.id} className="ci-run-card" data-status={lifecycle.run.status}>
      <div className="ci-run-card__head">
        <strong>{lifecycle.run.projectName}</strong>
        <span className={`ci-run-card__status ci-run-card__status--${STATUS_TONE[lifecycle.run.status] ?? 'neutral'}`}>
          {RUN_STATUS_LABELS[lifecycle.run.status] ?? lifecycle.run.status}
        </span>
      </div>
      <small className="ci-run-card__meta">
        {lifecycle.run.model} · {lifecycle.run.provider} · 创建于 {formatRelativeTime(lifecycle.run.createdAt)}
        {lifecycle.run.completedAt ? ` · 完成于 ${formatRelativeTime(lifecycle.run.completedAt)}` : ''}
      </small>
      {lifecycle.run.lastError && <p className="ci-run-card__error">{lifecycle.run.lastError}</p>}
      <div className="ci-run-card__actions">
        <Button variant="primary" size="sm" onClick={() => onOpen(lifecycle.run)}>打开</Button>
        {lifecycle.resumable && <Button variant="secondary" size="sm" onClick={() => onResume(lifecycle.run.id)}>恢复</Button>}
        {lifecycle.cancellable && <Button variant="ghost" size="sm" onClick={() => onCancel(lifecycle.run.id)}>取消</Button>}
        {lifecycle.removable && <Button variant="ghost" size="sm" onClick={() => onRemove(lifecycle.run)}>删除</Button>}
      </div>
    </div>)}
  </div>;
}

interface RunDetailTabsProps {
  view: WorkspaceView | null;
  lifecycle: RunLifecycle;
  profiles: PublicSettings['profiles'];
  profileId: string;
  onProfileChange(profileId: string): void;
  inputDocumentPaths: string[];
  projectName: string;
  onProjectNameChange(value: string): void;
  onAddDocuments(): void;
  onRemoveDocument(path: string): void;
  onStart(): void;
  busy: boolean;
  activeStage: StageId;
  stageFilter: StageId | null;
  factReview: FactReview | null;
  localFactRows: LocalFactRow[];
  onSetLocalAction(field: string, action: LocalFactRow['userAction']): void;
  onSetLocalEdit(field: string, value: unknown): void;
  onOpenFactReview(): void;
  onConfirmFacts(): void;
  truth: { facts?: Array<{ id: string; field: string; value: unknown; status?: string }> } | null;
  needs: Array<{ id: string; title?: string; description?: string }>;
  insights: Array<{ id: string; title?: string; description?: string }>;
  opportunityMap: { opportunities?: Array<{ id: string; title?: string; description?: string }> } | null;
  conceptSet: { concepts?: Array<{ id: string; title?: string; thesis?: string; strategicMechanism?: string; strategicPattern?: string; status?: string; strengths?: string[]; risks?: string[]; blockers?: string[]; factRefs?: string[]; evidenceRefs?: string[] }> } | null;
  conceptRef: { referenceableConceptIds: Set<string>; blockedConceptIds: Set<string>; blockedDirectionIds: Set<string> };
  directionSet: { directions?: Array<{ id: string; title?: string; thesis?: string; systemHypothesis?: string; visualMechanism?: string; directionFamily?: string; colorRelationship?: string; materialRelationship?: string; compositionLogic?: string; typographyBehavior?: string; graphicBehavior?: string; imageBehavior?: string; crossMediaBehavior?: string[]; spaceApplicability?: string; packagingApplicability?: string; strengths?: string[]; risks?: string[]; status?: string }> } | null | undefined;
  evaluationSet: { evaluations?: Array<{ directionId: string; dimensions?: Record<string, { score: number; reason?: string }>; totalScore?: number; blocked?: boolean; warnings?: string[]; strengths?: string[]; tradeoffs?: string[] }>; ranking?: { rankedDirectionIds?: string[]; rankingReason?: string[] }; recommendation?: { recommendedDirectionIds?: string[]; primaryDirectionId?: string | null; rationale?: string[]; tradeoffs?: string[]; confidence?: string; status?: string } } | null;
  recommendations: { primaryDirectionId?: string | null; recommendedDirectionIds?: string[]; confidence?: string; rationale?: string[]; tradeoffs?: string[]; status?: string } | null;
  onProposeSelection(direction: { id: string; title?: string }): void;
  selectedDirectionId: string | null;
  visualCanon: { creativeThesis?: string; visualMechanism?: string; systemHypothesis?: string; directionFamily?: string; visualDNA?: unknown; visualGrammar?: unknown; crossMediaCanon?: unknown; lockedAssetRules?: unknown[]; prohibitedMutations?: string[]; status?: string } | null;
  anchorContract: { purpose?: string; mustDemonstrate?: string[]; mustPreserve?: string[]; mayExplore?: string[]; mustNotChange?: string[]; evaluationCriteria?: unknown[]; status?: string } | null;
  canonLocked: boolean;
  productionTranslation: { context?: unknown; space?: unknown; packaging?: unknown } | null;
  translationLocked: boolean;
  onResume(): void;
  onRemove(): void;
  onCancel(): void;
}

function RunDetailTabs(props: RunDetailTabsProps) {
  const stage = props.stageFilter ?? props.activeStage;
  return <div className="ci-detail" data-ciw-active-detail={stage}>
    <section className="ci-detail__stage-header panel">
      <div className="ci-detail__stage-summary">
        <span className="ci-detail__stage-tag">当前阶段</span>
        <strong>{STAGES.find((s) => s.id === stage)?.label}</strong>
        <small>{STAGES.find((s) => s.id === stage)?.hint}</small>
      </div>
      <div className="ci-detail__stage-actions">
        {props.lifecycle.resumable && <Button variant="secondary" size="sm" onClick={props.onResume}>恢复</Button>}
        {props.lifecycle.cancellable && <Button variant="ghost" size="sm" onClick={props.onCancel}>取消</Button>}
        {props.lifecycle.removable && <Button variant="ghost" size="sm" onClick={props.onRemove}>删除</Button>}
      </div>
    </section>

    {stage === '01-input' && <InputPanel {...props} />}
    {stage === '02-facts' && <FactReviewPanel {...props} />}
    {stage === '03-understanding' && <UnderstandingPanel {...props} />}
    {stage === '04-concepts' && <ConceptPanel {...props} />}
    {(stage === '05-directions' || stage === '06-evaluation' || stage === '07-selection') && <DirectionAndSelectionPanel {...props} />}
    {stage === '08-canon' && <CanonPanel {...props} />}
    {stage === '09-translation' && <TranslationPanel {...props} />}
  </div>;
}

function InputPanel({ profiles, profileId, onProfileChange, inputDocumentPaths, projectName, onProjectNameChange, onAddDocuments, onRemoveDocument, onStart, busy, lifecycle }: RunDetailTabsProps) {
  const stageStatus = lifecycle.run.status;
  const isCurrentRun = !!lifecycle.run.id;
  return <section className="panel ci-stage-panel ci-stage-panel--input" data-ciw-stage="01-input">
    <div className="section-heading"><span>01</span><div><h2>Input</h2><p>准备文档 + 提取模型（CI-1..CI-9 尚未运行）</p></div></div>
    {!isCurrentRun ? <p className="ci-hint">选择一个任务或新建任务以查看 Input 阶段。</p> : (
      <>
        <div className="ci-form-row">
          <label>项目名称（可选，自动从文档识别）
            <input value={projectName} onChange={(e) => onProjectNameChange(e.target.value)} placeholder="项目名称（可选）" />
          </label>
        </div>
        <div className="ci-form-row">
          <label>提取模型（Analysis Profile）
            <select value={profileId} onChange={(e) => onProfileChange(e.target.value)}>
              <option value="">请选择 API Profile</option>
              {profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.displayName} / {profile.modelId}</option>)}
            </select>
          </label>
        </div>
        <div className="ci-form-row">
          <div className="ci-document-toolbar">
            <strong>项目文档</strong>
            <small>{inputDocumentPaths.length} 份已选</small>
          </div>
          <div className="drop-zone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
            e.preventDefault();
            const paths = Array.from(e.dataTransfer.files).map((file) => window.masterpiece.files.getPathForFile(file)).filter(Boolean);
            if (paths.length) onAddDocuments();
          }}>
            <div className="upload-orbit">↥</div>
            <strong>{busy ? '正在提交…' : '将项目文档拖到这里'}</strong>
            <p>支持 PDF / DOCX / Markdown / TXT</p>
            <button className="button secondary" type="button" disabled={busy} onClick={onAddDocuments}>选择文档</button>
          </div>
          {inputDocumentPaths.length ? <ul className="ci-doc-list">
            {inputDocumentPaths.map((path) => <li key={path}>
              <span>{path.split(/[\\/]/).pop()}</span>
              <button type="button" aria-label="移除" onClick={() => onRemoveDocument(path)}>×</button>
            </li>)}
          </ul> : null}
        </div>
        <div className="ci-form-row ci-form-row--actions">
          <Button variant="primary" size="md" disabled={busy || !profileId || !inputDocumentPaths.length || stageStatus === 'awaiting_fact_confirmation'} onClick={onStart}>
            {busy ? '提交中…' : '开始 Creative Intelligence'}
          </Button>
          <p className="ci-hint">启动后系统会调用 documentContext.start() 提取事实 (1 次模型调用，仅此 1 次)，随后全部本地推理。不会自动进入 Concept / Direction。</p>
        </div>
      </>
    )}
  </section>;
}

function FactReviewPanel({ factReview, localFactRows, onSetLocalAction, onSetLocalEdit, onConfirmFacts, onOpenFactReview, busy, lifecycle }: RunDetailTabsProps) {
  if (!factReview) {
    return <section className="panel ci-stage-panel ci-stage-panel--facts" data-ciw-stage="02-facts">
      <div className="section-heading"><span>02</span><div><h2>Facts · Checkpoint A</h2><p>逐项确认、修改、删除或标记未知</p></div></div>
      <div className="ci-checkpoint-prompt">
        <strong>事实已就绪，等待人工确认</strong>
        <p>这是 Human Checkpoint A — 在你确认前，系统不会进入 Truth / Concept / Direction 推理。</p>
        <Button variant="primary" size="md" onClick={onOpenFactReview}>打开事实确认</Button>
      </div>
    </section>;
  }
  return <section className="panel ci-stage-panel ci-stage-panel--facts" data-ciw-stage="02-facts">
    <div className="section-heading"><span>02</span><div><h2>Facts · Checkpoint A</h2><p>{lifecycle.run.projectName} · {localFactRows.length} 项</p></div></div>
    <ul className="ci-fact-list">
      {localFactRows.map((row) => <li key={row.field} className={`ci-fact ci-fact--${row.userAction}`}>
        <div className="ci-fact__head">
          <strong>{row.field}</strong>
          <div className="ci-fact__actions">
            <button type="button" className={row.userAction === 'confirm' ? 'chip active' : 'chip'} onClick={() => onSetLocalAction(row.field, 'confirm')}>确认</button>
            <button type="button" className={row.userAction === 'edit' ? 'chip active' : 'chip'} onClick={() => onSetLocalAction(row.field, 'edit')}>修改</button>
            <button type="button" className={row.userAction === 'remove' ? 'chip warn active' : 'chip warn'} onClick={() => onSetLocalAction(row.field, 'remove')}>删除</button>
            <button type="button" className={row.userAction === 'unknown' ? 'chip warn active' : 'chip warn'} onClick={() => onSetLocalAction(row.field, 'unknown')}>未知</button>
          </div>
        </div>
        {row.userAction === 'edit' ? <input
          defaultValue={String(row.editedValue ?? '')}
          onChange={(e) => onSetLocalEdit(row.field, e.target.value)}
        /> : <div className="ci-fact__value">{row.userAction === 'remove' ? '已标记删除' : row.userAction === 'unknown' ? '已标记未知' : String(row.value ?? '—')}</div>}
        <small>Authority: {row.authority}{row.sourceRef ? ` · ${row.sourceRef}` : ''}{row.evidenceRefs.length ? ` · ${row.evidenceRefs.length} 条证据` : ''}</small>
      </li>)}
    </ul>
    <div className="ci-form-row ci-form-row--actions">
      <Button variant="primary" size="md" disabled={busy} onClick={onConfirmFacts}>{busy ? '正在提交…' : '确认事实并进入 Understanding'}</Button>
      <p className="ci-hint">确认后系统会在本地构建 Project Truth → Need → Insight → Opportunity → Concept → Direction，本阶段内不会再调用模型。</p>
    </div>
  </section>;
}

function UnderstandingPanel({ truth, needs, insights, opportunityMap }: RunDetailTabsProps) {
  const facts = truth?.facts ?? [];
  return <section className="panel ci-stage-panel ci-stage-panel--understanding" data-ciw-stage="03-understanding">
    <div className="section-heading"><span>03</span><div><h2>Understanding</h2><p>Project Truth · Need · Insight · Opportunity</p></div></div>
    <div className="ci-understanding-grid">
      <div>
        <h3>Project Truth</h3>
        {facts.length ? <ul className="ci-truth-list">
          {facts.map((fact) => <li key={fact.id}>
            <strong>{fact.field}</strong>
            <span>{typeof fact.value === 'string' ? fact.value : JSON.stringify(fact.value)}</span>
          </li>)}
        </ul> : <p className="ci-hint">尚无 Truth 事实。</p>}
      </div>
      <div>
        <h3>Need</h3>
        {needs.length ? <ul className="ci-list">
          {needs.map((need) => <li key={need.id}><strong>{need.title ?? need.id}</strong><p>{need.description ?? ''}</p></li>)}
        </ul> : <p className="ci-hint">尚无 Need。</p>}
      </div>
      <div>
        <h3>Insight</h3>
        {insights.length ? <ul className="ci-list">
          {insights.map((insight) => <li key={insight.id}><strong>{insight.title ?? insight.id}</strong><p>{insight.description ?? ''}</p></li>)}
        </ul> : <p className="ci-hint">尚无 Insight。</p>}
      </div>
      <div>
        <h3>Opportunity</h3>
        {opportunityMap?.opportunities?.length ? <ul className="ci-list">
          {opportunityMap.opportunities.map((opp) => <li key={opp.id}><strong>{opp.title ?? opp.id}</strong><p>{opp.description ?? ''}</p></li>)}
        </ul> : <p className="ci-hint">尚无 Opportunity。</p>}
      </div>
    </div>
  </section>;
}

function ConceptPanel({ conceptSet, conceptRef }: RunDetailTabsProps) {
  const concepts = conceptSet?.concepts ?? [];
  return <section className="panel ci-stage-panel ci-stage-panel--concepts" data-ciw-stage="04-concepts">
    <div className="section-heading"><span>04</span><div><h2>Concepts</h2><p>{concepts.length} 个候选 · {conceptRef.blockedConceptIds.size} 个被 Gate 阻断</p></div></div>
    {concepts.length === 0 ? <p className="ci-hint">尚无 Concept 候选。</p> : <ul className="ci-concept-list">
      {concepts.map((concept) => {
        const isBlocked = conceptRef.blockedConceptIds.has(concept.id) || concept.status === 'blocked';
        const refable = conceptRef.referenceableConceptIds.has(concept.id);
        return <li key={concept.id} className={`ci-concept ${isBlocked ? 'is-blocked' : ''} ${refable ? 'is-refable' : 'is-unrefable'}`}>
          <div className="ci-concept__head">
            <strong>{concept.title ?? concept.id}</strong>
            <span className={`ci-concept__status ci-concept__status--${concept.status ?? 'unknown'}`}>{concept.status ?? 'unknown'}</span>
            {isBlocked && <span className="ci-concept__locked">P0 · 已被 Gate 阻断</span>}
          </div>
          <p>{concept.thesis ?? ''}</p>
          {concept.strategicMechanism && <p className="ci-concept__mechanism">机制：{concept.strategicMechanism}</p>}
          {concept.strategicPattern && <p className="ci-concept__pattern">战略模式：{STRATEGIC_PATTERN_LABELS[concept.strategicPattern as keyof typeof STRATEGIC_PATTERN_LABELS] ?? concept.strategicPattern}</p>}
          {concept.strengths && concept.strengths.length > 0 && <p className="ci-concept__strengths">优势：{concept.strengths.join('、')}</p>}
          {concept.risks && concept.risks.length > 0 && <p className="ci-concept__risks">风险：{concept.risks.join('、')}</p>}
          {isBlocked && <p className="ci-concept__warn">此 Concept 已被 Concept Gate 阻断。下方 Direction 视图 <strong>绝不会</strong> 引用被阻断的 Concept。</p>}
        </li>;
      })}
    </ul>}
  </section>;
}

function DirectionAndSelectionPanel(props: RunDetailTabsProps) {
  const { directionSet, evaluationSet, recommendations, onProposeSelection, selectedDirectionId, conceptRef } = props;
  const directions = directionSet?.directions ?? [];
  const evals = evaluationSet?.evaluations ?? [];
  const ranking = evaluationSet?.ranking;
  const evalById = new Map(evals.map((e) => [e.directionId, e] as const));
  return <section className="ci-stage-panel ci-stage-panel--directions" data-ciw-stage={props.stageFilter ?? props.activeStage}>
    <div className="section-heading"><span>{props.stageFilter === '07-selection' ? '07' : props.stageFilter === '06-evaluation' ? '06' : '05'}</span><div><h2>{props.stageFilter === '07-selection' ? 'Selection' : props.stageFilter === '06-evaluation' ? 'Evaluation' : 'Directions'}</h2><p>{directions.length} 个候选 · {conceptRef.blockedDirectionIds.size} 个被 Gate 阻断</p></div></div>
    {directions.length === 0 ? <p className="ci-hint">尚无 Direction 候选。</p> : (
      <>
        {(props.stageFilter === '06-evaluation' || props.stageFilter === '07-selection' || props.stageFilter === null) && recommendations && (
          <div className="ci-recommendation-banner" data-ciw-blocked={conceptRef.blockedDirectionIds.size > 0 ? 'true' : 'false'}>
            <div>
              <strong>系统推荐</strong>
              <p>基于 10 维评估与跨方向差异度，置信度：<em>{recommendations.confidence ?? 'low'}</em></p>
              {recommendations.rationale && recommendations.rationale.length > 0 && <ul>{recommendations.rationale.map((r, i) => <li key={i}>{r}</li>)}</ul>}
              {recommendations.tradeoffs && recommendations.tradeoffs.length > 0 && <p className="ci-recommendation__tradeoffs">代价：{recommendations.tradeoffs.join('、')}</p>}
            </div>
            <p className="ci-recommendation__warn">⚠ 推荐仅供参考，<strong>不会自动</strong>成为你的选择。你必须显式点击"选择此方向"才完成 Checkpoint B。</p>
          </div>
        )}
        <ul className="ci-direction-list">
          {directions.map((direction, index) => {
            const isBlocked = conceptRef.blockedDirectionIds.has(direction.id) || direction.status === 'blocked';
            const evalItem = evalById.get(direction.id);
            const availability: SelectionAvailability = evaluateSelectionAvailability(
              { id: direction.id, status: direction.status },
              directionSet,
              selectedDirectionId,
              recommendations
            );
            const isRecommended = availability.isRecommended;
            const isSelected = selectedDirectionId === direction.id;
            const showScore = props.stageFilter === '06-evaluation' || props.stageFilter === '07-selection' || props.stageFilter === null;
            const showSelectionControls = props.stageFilter === '07-selection' || props.stageFilter === null;
            return <li key={direction.id} className={`ci-direction ${isBlocked ? 'is-blocked' : ''} ${isRecommended ? 'is-recommended' : ''} ${isSelected ? 'is-selected' : ''}`}>
              <div className="ci-direction__head">
                <strong>Direction {String.fromCharCode(65 + index)} · {direction.title ?? direction.id}</strong>
                <span className={`ci-direction__status ci-direction__status--${direction.status ?? 'unknown'}`}>{direction.status ?? 'unknown'}</span>
                {isRecommended && <span className="ci-direction__recommended">系统推荐</span>}
                {isSelected && <span className="ci-direction__selected">已选择</span>}
                {isBlocked && <span className="ci-direction__locked">P0 · Gate 阻断</span>}
              </div>
              <p className="ci-direction__thesis">{direction.thesis ?? ''}</p>
              {direction.visualMechanism && <p className="ci-direction__line"><strong>视觉机制：</strong>{direction.visualMechanism}</p>}
              {direction.systemHypothesis && <p className="ci-direction__line"><strong>系统假设：</strong>{direction.systemHypothesis}</p>}
              {direction.directionFamily && <p className="ci-direction__line"><strong>方向族：</strong>{DIRECTION_FAMILY_LABELS[direction.directionFamily as keyof typeof DIRECTION_FAMILY_LABELS] ?? direction.directionFamily}</p>}
              <div className="ci-direction__grid">
                {direction.colorRelationship && <div><small>色彩</small><span>{direction.colorRelationship}</span></div>}
                {direction.materialRelationship && <div><small>材料</small><span>{direction.materialRelationship}</span></div>}
                {direction.compositionLogic && <div><small>构图</small><span>{direction.compositionLogic}</span></div>}
                {direction.typographyBehavior && <div><small>字体</small><span>{direction.typographyBehavior}</span></div>}
                {direction.graphicBehavior && <div><small>图形</small><span>{direction.graphicBehavior}</span></div>}
                {direction.imageBehavior && <div><small>图像</small><span>{direction.imageBehavior}</span></div>}
                {direction.spaceApplicability && <div><small>空间</small><span>{direction.spaceApplicability}</span></div>}
                {direction.packagingApplicability && <div><small>包装</small><span>{direction.packagingApplicability}</span></div>}
                {direction.crossMediaBehavior && direction.crossMediaBehavior.length > 0 && <div><small>跨媒介</small><span>{direction.crossMediaBehavior.join('、')}</span></div>}
              </div>
              {showScore && evalItem && <div className="ci-direction__eval">
                <h4>评估（{evalItem.totalScore ?? 0} 分）</h4>
                <ul>
                  {Object.entries(evalItem.dimensions ?? {}).map(([key, dim]) => <li key={key}>
                    <strong>{EVALUATION_DIMENSION_LABELS[key] ?? key}</strong>
                    <span className={`ci-eval-score ci-eval-score--${dim.score}`}>{SCORE_LABELS[dim.score as 0 | 1 | 2 | 3] ?? dim.score}</span>
                    {dim.reason && <small>{dim.reason}</small>}
                  </li>)}
                </ul>
              </div>}
              {(direction.strengths?.length || direction.risks?.length) && <div className="ci-direction__proscons">
                {direction.strengths && direction.strengths.length > 0 && <p><strong>优势：</strong>{direction.strengths.join('、')}</p>}
                {direction.risks && direction.risks.length > 0 && <p><strong>风险：</strong>{direction.risks.join('、')}</p>}
              </div>}
              {showSelectionControls && <div className="ci-direction__cta">
                {isBlocked
                  ? <Button variant="ghost" size="sm" disabled>已阻断 · 不可选择</Button>
                  : isSelected
                    ? <Button variant="secondary" size="sm" disabled>已选择</Button>
                    : <Button variant="primary" size="sm" onClick={() => onProposeSelection({ id: direction.id, title: direction.title ?? direction.id })}>选择此方向</Button>}
              </div>}
            </li>;
          })}
        </ul>
        {ranking?.rankedDirectionIds && ranking.rankedDirectionIds.length > 0 && (
          <div className="ci-ranking">
            <h3>排名</h3>
            <ol>
              {ranking.rankedDirectionIds.map((id, idx) => <li key={id}>{idx + 1}. {id}</li>)}
            </ol>
            {ranking.rankingReason && ranking.rankingReason.length > 0 && <p>{ranking.rankingReason.join('；')}</p>}
          </div>
        )}
      </>
    )}
  </section>;
}

function CanonPanel({ visualCanon, anchorContract, canonLocked }: RunDetailTabsProps) {
  if (canonLocked) return <section className="panel ci-stage-panel ci-stage-panel--canon" data-ciw-stage="08-canon">
    <div className="section-heading"><span>08</span><div><h2>Canon</h2><p>等待人工选择方向</p></div></div>
    <div className="ci-locked">
      <strong>Canon 暂未生成</strong>
      <p>请先在 <em>Selection</em> 阶段完成 Checkpoint B（选择方向）。Canon 不会在显式选择前生成。</p>
    </div>
  </section>;
  return <section className="panel ci-stage-panel ci-stage-panel--canon" data-ciw-stage="08-canon">
    <div className="section-heading"><span>08</span><div><h2>Canon</h2><p>Visual Canon + Anchor Contract</p></div></div>
    {visualCanon ? <div className="ci-canon">
      <h3>Visual Canon</h3>
      <p><strong>创意论点：</strong>{visualCanon.creativeThesis ?? '—'}</p>
      <p><strong>视觉机制：</strong>{visualCanon.visualMechanism ?? '—'}</p>
      <p><strong>系统假设：</strong>{visualCanon.systemHypothesis ?? '—'}</p>
      {visualCanon.directionFamily && <p><strong>方向族：</strong>{DIRECTION_FAMILY_LABELS[visualCanon.directionFamily as keyof typeof DIRECTION_FAMILY_LABELS] ?? visualCanon.directionFamily}</p>}
      <p><strong>状态：</strong>{visualCanon.status ?? '—'}</p>
      {visualCanon.prohibitedMutations && visualCanon.prohibitedMutations.length > 0 && (
        <div className="ci-canon__prohibited">
          <h4>禁止的视觉变更</h4>
          <ul>{visualCanon.prohibitedMutations.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}
    </div> : <p className="ci-hint">尚无 Visual Canon。</p>}
    {anchorContract ? <div className="ci-anchor">
      <h3>Anchor Contract <small>（这是验收合同，不是 Anchor 图像本身）</small></h3>
      <p><strong>目的：</strong>{anchorContract.purpose ?? '—'}</p>
      <h4>必须呈现 (mustDemonstrate)</h4>
      <ul>{(anchorContract.mustDemonstrate ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul>
      <h4>必须保留 (mustPreserve)</h4>
      <ul>{(anchorContract.mustPreserve ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul>
      <h4>可以探索 (mayExplore)</h4>
      <ul>{(anchorContract.mayExplore ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul>
      <h4>不得改变 (mustNotChange)</h4>
      <ul>{(anchorContract.mustNotChange ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul>
      <p><strong>状态：</strong>{anchorContract.status ?? '—'}</p>
    </div> : <p className="ci-hint">尚无 Anchor Contract。</p>}
  </section>;
}

function TranslationPanel({ productionTranslation, translationLocked }: RunDetailTabsProps) {
  if (translationLocked) return <section className="panel ci-stage-panel ci-stage-panel--translation" data-ciw-stage="09-translation">
    <div className="section-heading"><span>09</span><div><h2>Translation</h2><p>等待 Canon</p></div></div>
    <div className="ci-locked">
      <strong>Translation 暂未生成</strong>
      <p>请先完成 <em>Selection</em> + <em>Canon</em>。Space / Packaging 翻译合同不会在 Canon 前生成，也不会触发下游 Space / Packaging 生成链。</p>
    </div>
  </section>;
  const space = productionTranslation?.space as { mustPreserve?: string[]; mayAdapt?: string[]; mustNotIntroduce?: string[]; spatialIdentityRules?: Array<{ id: string; rule: string; invariantLevel: string }>; zoneRelationshipRules?: Array<{ id: string; rule: string }>; environmentalGraphicRules?: Array<{ id: string; rule: string }>; wayfindingRules?: Array<{ id: string; rule: string }>; materialBehaviorRules?: Array<{ id: string; rule: string }>; brandPresenceRules?: Array<{ id: string; rule: string }>; scaleAdaptationRules?: Array<{ id: string; rule: string }>; prohibitedSpatialDrift?: string[]; status?: string } | undefined;
  const packaging = productionTranslation?.packaging as { mustPreserve?: string[]; mayAdapt?: string[]; mustNotIntroduce?: string[]; productIdentityRules?: Array<{ id: string; rule: string }>; structurePreservationRules?: Array<{ id: string; rule: string }>; informationHierarchyRules?: Array<{ id: string; rule: string }>; familySystemRules?: Array<{ id: string; rule: string }>; materialBehaviorRules?: Array<{ id: string; rule: string }>; brandPresenceRules?: Array<{ id: string; rule: string }>; lockedCopyRules?: Array<{ id: string; rule: string }>; prohibitedPackagingDrift?: string[]; status?: string } | undefined;
  return <section className="panel ci-stage-panel ci-stage-panel--translation" data-ciw-stage="09-translation">
    <div className="section-heading"><span>09</span><div><h2>Translation</h2><p>Space + Packaging 翻译合同 (CI-9 · shadow / comparison only)</p></div></div>
    <p className="ci-hint">翻译合同只是描述下游必须保留 / 可以调整 / 不能引入的内容。CI-W1B <strong>不会</strong> 触发 Space / Packaging 生成链，没有 "Send to Production" 按钮。</p>
    {space ? <div className="ci-translation">
      <h3>Space Translation Contract</h3>
      <p><strong>状态：</strong>{space.status ?? '—'}</p>
      <TranslationBucket title="必须保留" items={space.mustPreserve ?? []} />
      <TranslationBucket title="可以调整" items={space.mayAdapt ?? []} />
      <TranslationBucket title="不得引入" items={space.mustNotIntroduce ?? []} />
      <TranslationBucket title="禁止的空间漂移" items={space.prohibitedSpatialDrift ?? []} tone="warn" />
    </div> : <p className="ci-hint">尚无 Space 翻译合同。</p>}
    {packaging ? <div className="ci-translation">
      <h3>Packaging Translation Contract</h3>
      <p><strong>状态：</strong>{packaging.status ?? '—'}</p>
      <TranslationBucket title="必须保留" items={packaging.mustPreserve ?? []} />
      <TranslationBucket title="可以调整" items={packaging.mayAdapt ?? []} />
      <TranslationBucket title="不得引入" items={packaging.mustNotIntroduce ?? []} />
      <TranslationBucket title="禁止的包装漂移" items={packaging.prohibitedPackagingDrift ?? []} tone="warn" />
    </div> : <p className="ci-hint">尚无 Packaging 翻译合同。</p>}
  </section>;
}

function TranslationBucket({ title, items, tone }: { title: string; items: string[]; tone?: 'warn' }) {
  if (!items.length) return null;
  return <div className={`ci-translation__bucket ${tone === 'warn' ? 'is-warn' : ''}`}>
    <h4>{title}</h4>
    <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
  </div>;
}

function SelectionDialog({ proposal, onCancel, onConfirm, busy }: {
  proposal: SelectionProposal;
  onCancel(): void;
  onConfirm(): void;
  busy: boolean;
}) {
  return <div className="ci-modal" role="dialog" aria-modal="true">
    <div className="ci-modal__panel panel">
      <h2>确认选择方向</h2>
      <p>你正在选择：<strong>{proposal.directionTitle}</strong></p>
      {proposal.isRevision ? <p className="ci-modal__rev">⚠ 这是第 <strong>{proposal.newRevision}</strong> 次修订，原选择为 {proposal.previousDirectionId}。Canon / Anchor / Translation 都会被重建。</p> : <p>第 {proposal.newRevision} 次选择。</p>}
      {proposal.recommended && <p className="ci-modal__rec">系统也推荐了此方向 — 但仅作为参考，不会自动选中。</p>}
      <div className="ci-modal__actions">
        <Button variant="ghost" size="md" onClick={onCancel} disabled={busy}>取消</Button>
        <Button variant="primary" size="md" onClick={onConfirm} disabled={busy}>{busy ? '提交中…' : '确认选择 (Checkpoint B)'}</Button>
      </div>
    </div>
  </div>;
}

function TraceDrawer({ open, onClose, onOpen, steps, diagnostics }: {
  open: boolean;
  onClose(): void;
  onOpen(): void;
  steps: Array<{ kind: string; id: string; label: string; detail: string; status: string; refs: string[] }>;
  diagnostics: { blocking: string[]; warning: string[]; diagnostic: string[] };
}) {
  return <>
    <button className="ci-trace-button" type="button" onClick={onOpen} aria-pressed={open}>Trace & Diagnostics</button>
    {open ? <div className="ci-trace-drawer" role="dialog" aria-label="Trace Drawer">
      <header>
        <strong>Trace · Direction → Concept → Opportunity → Insight → Need → Fact → Evidence</strong>
        <button type="button" onClick={onClose} aria-label="关闭">×</button>
      </header>
      <section className="ci-trace-drawer__section">
        <h3>诊断</h3>
        {diagnostics.blocking.length > 0 && <div className="ci-diagnostics ci-diagnostics--blocking">
          <strong>阻断 ({diagnostics.blocking.length})</strong>
          <ul>{diagnostics.blocking.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </div>}
        {diagnostics.warning.length > 0 && <div className="ci-diagnostics ci-diagnostics--warning">
          <strong>警告 ({diagnostics.warning.length})</strong>
          <ul>{diagnostics.warning.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </div>}
        {diagnostics.diagnostic.length > 0 && <div className="ci-diagnostics ci-diagnostics--diagnostic">
          <strong>提示 ({diagnostics.diagnostic.length})</strong>
          <ul>{diagnostics.diagnostic.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </div>}
        {diagnostics.blocking.length === 0 && diagnostics.warning.length === 0 && diagnostics.diagnostic.length === 0 && <p className="ci-hint">无诊断信息。</p>}
      </section>
      <section className="ci-trace-drawer__section">
        <h3>追溯链 ({steps.length})</h3>
        <ol className="ci-trace-list">
          {steps.map((step) => <li key={`${step.kind}-${step.id}`} className={`ci-trace-step ci-trace-step--${step.kind}`}>
            <span className="ci-trace-step__kind">{step.kind}</span>
            <strong>{step.label}</strong>
            {step.detail && <p>{step.detail}</p>}
            <small>status: {step.status}</small>
          </li>)}
        </ol>
      </section>
    </div> : null}
  </>;
}
