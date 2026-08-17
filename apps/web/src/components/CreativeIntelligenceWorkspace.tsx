// CreativeIntelligenceWorkspace — CI-W1B.1 progressive-disclosure workspace.
//
// Architecture:
//   - Controller (ciworkspace/controller.ts) owns all state transitions and
//     the user-view projection (deriveCreativeIntelligenceUserView).
//   - This component owns: lifecycle wiring (RPC calls, progress events),
//     layout, sub-views, and dialogs.
//   - The component NEVER reads run files from disk. The only CI access
//     is through `window.masterpiece.creativeIntelligence` (kebab-case RPC).
//   - The component NEVER imports from @masterpiece/creative-intelligence.
//   - The component NEVER auto-selects the recommendation. Selection is
//     gated by an explicit user click + confirm dialog.
//   - CI-W1B.1: the internal 9-stage rail (Input → Facts → Understanding →
//     Concepts → Directions → Evaluation → Selection → Canon → Translation)
//     is NOT rendered as the default navigation. The default UI projects
//     run.status onto five user views: input / fact-review / thinking /
//     direction-decision / visual-system. The internal mapping stays in
//     ciworkspace (controller / types) for resume, tests and the
//     advanced-analysis drawer.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  CreativeIntelligenceFactReview,
  CreativeIntelligenceProgress,
  CreativeIntelligenceRun,
  CreativeIntelligenceWorkspaceView,
  PublicSettings
} from '@masterpiece/runtime-core/application-contracts.ts';
import {
  THINKING_PROGRESS_LABELS,
  type CreativeIntelligenceUserView,
  type FactReview,
  type LocalFactRow,
  type Run,
  type RunLifecycle,
  type SelectionProposal,
  type ThinkingProgressKey,
  type WorkspaceView
} from '../ciworkspace/types.ts';
import {
  applyLocalFactAction,
  applyLocalFactEdit,
  buildLocalFactRows,
  buildSelectionProposal,
  buildTraceChain,
  computeConceptReferenceability,
  deriveCreativeIntelligenceUserView,
  deriveRunLifecycle,
  deriveThinkingProgress,
  evaluateSelectionAvailability,
  groupDiagnostics,
  groupFactRows,
  serializeFactRows
} from '../ciworkspace/controller.ts';
import { cleanError, formatRelativeTime } from '../utils';
import { AppShell } from './layout/AppShell';
import { TopBar, TopBarActions, TopBarBreadcrumb } from './layout/TopBar';
import { Button } from './ui/Button';
import { DIRECTION_FAMILY_LABELS, EVALUATION_DIMENSION_LABELS, RUN_STATUS_LABELS, SCORE_LABELS, STATUS_TONE } from '../ciworkspace/format.ts';

const PICKER_UNAVAILABLE_TEXT = '无法打开文件选择器，请重试。';
const PICKER_EMPTY_DETAIL = '选择器未返回任何文档。当前运行环境没有可用的文件选择器。';

// Browser document intake — when the host picker bridge (env-var driven)
// returns nothing, the input page falls back to a real <input type=file>
// and uploads the bytes through document-context:import-documents.
interface WebDocumentImportEntry {
  name: string;
  content: string;
  size: number;
}

type WebDocumentImportBridge = {
  chooseDocuments(): Promise<string[]>;
  importDocuments?(input: { documents: WebDocumentImportEntry[] }): Promise<string[]>;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function readDocumentFile(file: File): Promise<WebDocumentImportEntry> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { name: file.name, content: bytesToBase64(bytes), size: bytes.length };
}

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inputDocumentPaths, setInputDocumentPaths] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [pickerError, setPickerError] = useState('');
  const [pickerErrorDetail, setPickerErrorDetail] = useState('');

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
    setPickerError(''); setPickerErrorDetail('');
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

  // ── Document picker — the SINGLE upload entry point (CI-W1B.1 Part A).
  // Every trigger (dropzone click, icon click, 选择文档 button, keyboard
  // Enter / Space) routes through this handler. The host picker bridge is
  // tried first (keeps the env-var smoke/E2E path working); when it has
  // no picker the browser file dialog opens and the picked bytes are
  // uploaded through document-context:import-documents. Picker and
  // upload failures are always visible — never silent.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChooseDocuments = useCallback(async () => {
    if (busy) return;
    setPickerError(''); setPickerErrorDetail('');
    try {
      const chosen = await window.masterpiece.documentContext.chooseDocuments();
      if (chosen && chosen.length) {
        setInputDocumentPaths((current) => [...new Set([...current, ...chosen])]);
        return;
      }
      fileInputRef.current?.click();
    } catch (reason) {
      setPickerError(PICKER_UNAVAILABLE_TEXT);
      setPickerErrorDetail(cleanError(reason));
    }
  }, [busy]);

  const ingestFiles = useCallback(async (files: FileList | null) => {
    setPickerError(''); setPickerErrorDetail('');
    if (!files || !files.length) return;
    const bridge = window.masterpiece.documentContext as unknown as WebDocumentImportBridge;
    if (typeof bridge.importDocuments !== 'function') {
      setPickerError(PICKER_UNAVAILABLE_TEXT);
      setPickerErrorDetail(PICKER_EMPTY_DETAIL);
      return;
    }
    setBusy(true);
    try {
      const documents = await Promise.all(Array.from(files).map(readDocumentFile));
      const imported = await bridge.importDocuments({ documents });
      if (!imported || !imported.length) {
        setPickerError(PICKER_UNAVAILABLE_TEXT);
        setPickerErrorDetail('上传完成但未返回任何文档路径。');
        return;
      }
      setInputDocumentPaths((current) => [...new Set([...current, ...imported])]);
    } catch (reason) {
      const message = cleanError(reason);
      setPickerError(PICKER_UNAVAILABLE_TEXT);
      setPickerErrorDetail(/RUNTIME_OPERATION_NOT_FOUND/i.test(message)
        ? `${message}\nWeb Runtime 缺少文档导入通道（可能是旧进程）。请重启 Web Runtime（停止后重新运行 npm run web:dev），再刷新页面重试。`
        : message);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleDropFiles = useCallback((files: FileList | null) => {
    setPickerError(''); setPickerErrorDetail('');
    if (!files || !files.length) return;
    const paths = Array.from(files)
      .map((file) => window.masterpiece.files.getPathForFile(file))
      .filter(Boolean);
    if (paths.length) {
      setInputDocumentPaths((current) => [...new Set([...current, ...paths])]);
      return;
    }
    void ingestFiles(files);
  }, [ingestFiles]);

  // ── Fact review (human confirmation gate) ──
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
      setNotice('事实已确认。系统将构建创意方向所需的推理基础。');
      await refreshRuns();
      void refreshActive(updated.id);
    } catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }, [ci, activeRunId, factReview, localFactRows, refreshRuns, refreshActive]);

  // ── Selection (human decision gate) ──
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
      setNotice(`已选择方向：${pendingSelection.directionTitle}。视觉系统与适配方案将基于该方向生成。`);
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
    if (!window.confirm(`确定删除任务“${run.projectName}”吗？\n\n此操作会永久删除该任务的所有运行记录与产出。`)) return;
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
  const visualCanon = activeView?.visualCanon as null | { creativeThesis?: string; visualMechanism?: string; systemHypothesis?: string; directionFamily?: string; visualDNA?: unknown; visualGrammar?: Record<string, unknown>; crossMediaCanon?: unknown; lockedAssetRules?: unknown[]; prohibitedMutations?: string[]; canonVersion?: string; trace?: unknown; status?: string };
  const anchorContract = activeView?.anchorContract as null | { purpose?: string; mustDemonstrate?: string[]; mustPreserve?: string[]; mayExplore?: string[]; mustNotChange?: string[]; evaluationCriteria?: unknown[]; status?: string };
  const productionTranslation = activeView?.productionTranslation as null | { context?: unknown; space?: { mustPreserve?: string[]; mayAdapt?: string[]; mustNotIntroduce?: string[]; canonVersion?: string; translationVersion?: string; status?: string }; packaging?: { mustPreserve?: string[]; mayAdapt?: string[]; mustNotIntroduce?: string[]; canonVersion?: string; translationVersion?: string; status?: string } };

  const selectedDirectionId = activeView?.run.selectedDirectionId ?? null;
  const canonLocked = !selectedDirectionId;
  const translationLocked = canonLocked || !activeView?.visualCanon;

  const userView: CreativeIntelligenceUserView = deriveCreativeIntelligenceUserView(
    activeLifecycle?.run.status ?? null
  );
  const thinkingProgress: ThinkingProgressKey | null = deriveThinkingProgress(
    activeLifecycle?.run.status ?? null
  );

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
    <div className="page ci-workspace" data-ciw-user-view={userView}>
      <header className="page-header ci-workspace__header">
        <div>
          <p className="eyebrow">CREATIVE INTELLIGENCE</p>
          <h1>{viewHeading(userView)}</h1>
          <p>{viewSubtitle(userView)}</p>
        </div>
        <div className="ci-workspace__runstate">
          {activeLifecycle ? <RunStateBadge lifecycle={activeLifecycle} /> : null}
        </div>
      </header>

      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice ok" role="status">{notice}</div>}

      <div className="ci-workspace__body">
        {userView === 'input' && <InputPage
          profiles={profiles}
          profileId={profileId}
          onProfileChange={onApiProfileChange}
          inputDocumentPaths={inputDocumentPaths}
          projectName={projectName}
          onProjectNameChange={setProjectName}
          onChooseDocuments={() => void handleChooseDocuments()}
          onDropFiles={handleDropFiles}
          onRemoveDocument={(path) => setInputDocumentPaths((cur) => cur.filter((p) => p !== path))}
          onStart={handleStart}
          busy={busy}
          pickerError={pickerError}
          pickerErrorDetail={pickerErrorDetail}
          lifecycles={lifecycles}
          activeLifecycle={activeLifecycle}
          onOpenRun={(run) => void openRun(run)}
          onResume={(runId) => void handleResume(runId)}
          onCancel={(runId) => void handleCancel(runId)}
          onRemove={(run) => void handleRemove(run)}
        />}
        {userView === 'fact-review' && activeLifecycle && <FactReviewPage
          factReview={factReview}
          localFactRows={localFactRows}
          lifecycle={activeLifecycle}
          busy={busy}
          onSetLocalAction={(field, action) => setLocalFactRows((cur) => applyLocalFactAction(cur, field, action))}
          onSetLocalEdit={(field, value) => setLocalFactRows((cur) => applyLocalFactEdit(cur, field, value))}
          onOpenFactReview={() => void handleOpenFactReview(activeLifecycle.run.id)}
          onConfirmFacts={handleConfirmFacts}
        />}
        {userView === 'thinking' && activeLifecycle && <ThinkingPage
          lifecycle={activeLifecycle}
          thinkingProgress={thinkingProgress}
          onCancel={() => void handleCancel(activeLifecycle.run.id)}
        />}
        {userView === 'direction-decision' && activeLifecycle && <DirectionDecisionPage
          directionSet={directionSet}
          evaluationSet={evaluationSet}
          recommendations={recommendations}
          conceptRef={conceptRef}
          selectedDirectionId={selectedDirectionId}
          onProposeSelection={handleProposeSelection}
        />}
        {userView === 'visual-system' && activeLifecycle && <VisualSystemPage
          visualCanon={visualCanon}
          anchorContract={anchorContract}
          productionTranslation={productionTranslation}
          canonLocked={canonLocked}
          translationLocked={translationLocked}
        />}
      </div>

      {activeView && activeLifecycle && (
        <AdvancedAnalysisDrawer
          open={showAdvanced}
          onClose={() => setShowAdvanced(false)}
          onOpen={() => setShowAdvanced(true)}
          view={activeView}
          trace={trace}
          diagnostics={diagnostics}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.md,.markdown,.txt"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          void ingestFiles(event.target.files);
          event.target.value = '';
        }}
      />

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
// User view copy
// ---------------------------------------------------------------------------

function viewHeading(userView: CreativeIntelligenceUserView): string {
  switch (userView) {
    case 'input': return 'Creative Intelligence';
    case 'fact-review': return '确认项目事实';
    case 'thinking': return '正在形成创意方向';
    case 'direction-decision': return 'Creative Directions';
    case 'visual-system': return '视觉系统';
  }
}

function viewSubtitle(userView: CreativeIntelligenceUserView): string {
  switch (userView) {
    case 'input': return '从项目资料出发，理解品牌与业务，形成可执行的创意方向与视觉系统。';
    case 'fact-review': return '这些信息会成为后续创意推理的事实基础。请确认、修改或标记未知。';
    case 'thinking': return '系统正在后台完成事实到方向的全部分析，完成后会请你选择创意方向。';
    case 'direction-decision': return '系统已生成并评估多个创意方向。请选择其一作为后续视觉系统的基础。';
    case 'visual-system': return '基于你选择的方向生成的视觉系统、验收标准与应用适配。';
  }
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function RunStateBadge({ lifecycle }: { lifecycle: RunLifecycle }) {
  const tone = STATUS_TONE[lifecycle.run.status] ?? 'neutral';
  return <div className={`ci-runstate-badge ci-runstate-badge--${tone}`}>
    <strong>{RUN_STATUS_LABELS[lifecycle.run.status] ?? lifecycle.run.status}</strong>
    <small>{lifecycle.run.projectName} · 修订 v{lifecycle.run.selectionRevision}</small>
  </div>;
}

function plainText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function versionLabel(value: unknown): string {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number') return String(value);
  return '—';
}

const DIRECTION_STATUS_USER_LABELS: Record<string, string> = {
  'grounded': '已就绪',
  'provisional': '待定',
  'blocked': '已阻断'
};

// ---------------------------------------------------------------------------
// Input page — upload-first (CI-W1B.1 Part A + D)
// ---------------------------------------------------------------------------

function InputPage({ profiles, profileId, onProfileChange, inputDocumentPaths, projectName, onProjectNameChange, onChooseDocuments, onDropFiles, onRemoveDocument, onStart, busy, pickerError, pickerErrorDetail, lifecycles, activeLifecycle, onOpenRun, onResume, onCancel, onRemove }: {
  profiles: PublicSettings['profiles'];
  profileId: string;
  onProfileChange(profileId: string): void;
  inputDocumentPaths: string[];
  projectName: string;
  onProjectNameChange(value: string): void;
  onChooseDocuments(): void;
  onDropFiles(files: FileList | null): void;
  onRemoveDocument(path: string): void;
  onStart(): void;
  busy: boolean;
  pickerError: string;
  pickerErrorDetail: string;
  lifecycles: RunLifecycle[];
  activeLifecycle: RunLifecycle | null;
  onOpenRun(run: Run): void;
  onResume(runId: string): void;
  onCancel(runId: string): void;
  onRemove(run: Run): void;
}) {
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const currentProfile = profiles.find((profile) => profile.id === profileId);
  const recent = lifecycles.slice(0, 5);

  return <section className="ci-input-view" data-ciw-user-view="input">
    <div className="ci-input-layout">
      <div className="ci-input-main">
        <div className="ci-upload-hero panel"
          role="button"
          tabIndex={0}
          aria-label="上传项目资料，选择文档"
          onClick={onChooseDocuments}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onChooseDocuments();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(event) => {
            event.preventDefault();
            onDropFiles(event.dataTransfer.files);
          }}
        >
          <div className="upload-orbit" aria-hidden>↥</div>
          <strong>上传项目资料</strong>
          <p className="ci-upload-formats">PDF · DOCX · Markdown · TXT</p>
          <p className="ci-upload-caption">可一次上传多份策划、品牌、产品或业务资料</p>
          <button className="button primary" type="button" disabled={busy}
            onClick={(event) => { event.stopPropagation(); onChooseDocuments(); }}>
            选择文档
          </button>
        </div>

        {pickerError && <div className="notice error ci-picker-error" role="alert">
          <strong>{pickerError}</strong>
          {pickerErrorDetail ? <details><summary>详细信息</summary><code>{pickerErrorDetail}</code></details> : null}
        </div>}

        <div className="panel ci-input-docs">
          <div className="ci-document-toolbar">
            <strong>项目文档</strong>
            <small>{inputDocumentPaths.length} 份已选</small>
          </div>
          {inputDocumentPaths.length ? <ul className="ci-doc-list">
            {inputDocumentPaths.map((path) => <li key={path}>
              <span>{path.split(/[\\/]/).pop()}</span>
              <button type="button" aria-label="移除" onClick={() => onRemoveDocument(path)}>×</button>
            </li>)}
          </ul> : <p className="ci-hint">尚未选择文档。点击上方上传区域或拖入文件。</p>}
          <label className="ci-form-row">
            <span>项目名称（可选，自动从文档识别）</span>
            <input value={projectName} onChange={(e) => onProjectNameChange(e.target.value)} placeholder="项目名称（可选）" />
          </label>
          <div className="ci-form-row ci-form-row--actions">
            <Button variant="primary" size="md" disabled={busy || !profileId || !inputDocumentPaths.length} onClick={onStart}>
              {busy ? '提交中…' : '开始 Creative Intelligence'}
            </Button>
            <p className="ci-hint">加入文档后即可开始。事实提取阶段调用 1 次模型，之后为本地推理。</p>
          </div>
        </div>
      </div>

      <aside className="ci-input-aside">
        <div className="panel ci-profile-mini">
          <small className="ci-aside-label">分析模型 / API</small>
          {showProfileEdit ? <>
            <select value={profileId} onChange={(e) => onProfileChange(e.target.value)}>
              <option value="">请选择 API Profile</option>
              {profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.displayName} / {profile.modelId}</option>)}
            </select>
            <div className="button-row">
              <Button variant="ghost" size="sm" onClick={() => setShowProfileEdit(false)}>完成</Button>
            </div>
          </> : <>
            <p className="ci-profile-mini__line">{currentProfile ? `当前模型：${currentProfile.displayName} / ${currentProfile.modelId}` : '未选择 API Profile'}</p>
            <button className="button ghost" type="button" onClick={() => setShowProfileEdit(true)}>更改</button>
          </>}
        </div>

        <div className="panel ci-recent">
          <small className="ci-aside-label">最近 Creative Intelligence</small>
          {recent.length === 0
            ? <p className="ci-hint">还没有任务。上传文档即可开始第一个任务。</p>
            : <ul className="ci-recent-list">
              {recent.map((lifecycle) => <li key={lifecycle.run.id}>
                <button className="ci-recent-item" type="button" onClick={() => onOpenRun(lifecycle.run)}>
                  <strong>{lifecycle.run.projectName}</strong>
                  <small>{RUN_STATUS_LABELS[lifecycle.run.status] ?? lifecycle.run.status} · 更新于 {formatRelativeTime(lifecycle.run.completedAt ?? lifecycle.run.createdAt)}</small>
                </button>
                {lifecycle.resumable && <Button variant="secondary" size="sm" onClick={() => onResume(lifecycle.run.id)}>恢复</Button>}
              </li>)}
            </ul>}
          {lifecycles.length > 5 && <p className="ci-hint">共 {lifecycles.length} 个任务，仅显示最近 5 个。</p>}
        </div>

        {activeLifecycle && <div className="panel ci-active-runstrip">
          <RunStateBadge lifecycle={activeLifecycle} />
          {activeLifecycle.run.lastError && <p className="ci-run-card__error">{activeLifecycle.run.lastError}</p>}
          <div className="ci-run-card__actions">
            <Button variant="primary" size="sm" onClick={() => onOpenRun(activeLifecycle.run)}>查看任务</Button>
            {activeLifecycle.resumable && <Button variant="secondary" size="sm" onClick={() => onResume(activeLifecycle.run.id)}>恢复</Button>}
            {activeLifecycle.cancellable && <Button variant="ghost" size="sm" onClick={() => onCancel(activeLifecycle.run.id)}>取消</Button>}
            {activeLifecycle.removable && <Button variant="ghost" size="sm" onClick={() => onRemove(activeLifecycle.run)}>删除</Button>}
          </div>
        </div>}
      </aside>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// Fact review page — user-facing fact confirmation (CI-W1B.1 Part E)
// ---------------------------------------------------------------------------

function FactReviewPage({ factReview, localFactRows, lifecycle, busy, onSetLocalAction, onSetLocalEdit, onOpenFactReview, onConfirmFacts }: {
  factReview: FactReview | null;
  localFactRows: LocalFactRow[];
  lifecycle: RunLifecycle;
  busy: boolean;
  onSetLocalAction(field: string, action: LocalFactRow['userAction']): void;
  onSetLocalEdit(field: string, value: unknown): void;
  onOpenFactReview(): void;
  onConfirmFacts(): void;
}) {
  if (!factReview) {
    return <section className="ci-fact-view" data-ciw-user-view="fact-review">
      <div className="ci-checkpoint-prompt panel">
        <strong>事实已就绪，等待人工确认</strong>
        <p>在你确认前，系统不会进入后续创意推理。请逐项确认、修改、删除或标记未知。</p>
        <Button variant="primary" size="md" onClick={onOpenFactReview}>打开事实确认</Button>
      </div>
    </section>;
  }
  const groups = groupFactRows(localFactRows);
  return <section className="ci-fact-view" data-ciw-user-view="fact-review">
    <div className="ci-fact-groups">
      {groups.map((group) => <div className="panel ci-fact-group" key={group.key}>
        <h3>{group.label}<small>{group.rows.length} 项</small></h3>
        <ul className="ci-fact-list">
          {group.rows.map((row) => <FactRow key={row.field} row={row} onSetLocalAction={onSetLocalAction} onSetLocalEdit={onSetLocalEdit} />)}
        </ul>
      </div>)}
    </div>
    <div className="panel ci-fact-cta">
      <div className="ci-form-row ci-form-row--actions">
        <Button variant="primary" size="md" disabled={busy} onClick={onConfirmFacts}>{busy ? '正在提交…' : '确认事实并继续'}</Button>
        <p className="ci-hint">确认后系统会构建创意方向所需的推理基础，本阶段不会再调用模型。</p>
      </div>
      <p className="ci-hint">{lifecycle.run.projectName} · {localFactRows.length} 项事实</p>
    </div>
  </section>;
}

function FactRow({ row, onSetLocalAction, onSetLocalEdit }: {
  row: LocalFactRow;
  onSetLocalAction(field: string, action: LocalFactRow['userAction']): void;
  onSetLocalEdit(field: string, value: unknown): void;
}) {
  return <li className={`ci-fact ci-fact--${row.userAction}`}>
    <div className="ci-fact__head">
      <strong>{row.field}</strong>
      <div className="ci-fact__actions">
        <button type="button" className={row.userAction === 'confirm' ? 'chip active' : 'chip'} onClick={() => onSetLocalAction(row.field, 'confirm')}>确认</button>
        <button type="button" className={row.userAction === 'edit' ? 'chip active' : 'chip'} onClick={() => onSetLocalAction(row.field, 'edit')}>修改</button>
        <button type="button" className={row.userAction === 'remove' ? 'chip warn active' : 'chip warn'} onClick={() => onSetLocalAction(row.field, 'remove')}>删除</button>
        <button type="button" className={row.userAction === 'unknown' ? 'chip warn active' : 'chip warn'} onClick={() => onSetLocalAction(row.field, 'unknown')}>标记未知</button>
      </div>
    </div>
    {row.userAction === 'edit' ? <input
      defaultValue={String(row.editedValue ?? '')}
      onChange={(e) => onSetLocalEdit(row.field, e.target.value)}
    /> : <div className="ci-fact__value">{row.userAction === 'remove' ? '已标记删除' : row.userAction === 'unknown' ? '已标记未知' : String(row.value ?? '—')}</div>}
    <details className="ci-fact__source">
      <summary>查看来源</summary>
      <small>Authority: {row.authority}{row.sourceRef ? ` · ${row.sourceRef}` : ''}{row.evidenceRefs.length ? ` · ${row.evidenceRefs.length} 条证据` : ''}</small>
    </details>
  </li>;
}

// ---------------------------------------------------------------------------
// Thinking page — single reasoning state (CI-W1B.1 Part F)
// ---------------------------------------------------------------------------

function ThinkingPage({ lifecycle, thinkingProgress, onCancel }: {
  lifecycle: RunLifecycle;
  thinkingProgress: ThinkingProgressKey | null;
  onCancel(): void;
}) {
  const current = thinkingProgress ?? 'intake';
  const steps: Array<{ key: ThinkingProgressKey; label: string }> = [
    { key: 'core-information', label: '理解项目核心信息' },
    { key: 'opportunities', label: '梳理创意机会' },
    { key: 'direction-evaluation', label: '生成并评估创意方向' }
  ];
  const activeIndex = current === 'intake'
    ? -1
    : current === 'visual-system-build'
      ? steps.length
      : steps.findIndex((step) => step.key === current);
  return <section className="ci-thinking-view" data-ciw-user-view="thinking">
    <div className="panel ci-thinking">
      <div className="ci-thinking__orbit"><span aria-hidden>✦</span></div>
      <h2>正在形成创意方向</h2>
      <p className="ci-thinking__run">{lifecycle.run.projectName} · {THINKING_PROGRESS_LABELS[current]}</p>
      {current === 'intake'
        ? <p className="ci-hint">正在准备项目资料并提取事实。完成后会请你确认项目事实。</p>
        : <ol className="ci-thinking__steps">
          {steps.map((step, index) => <li key={step.key} className={index < activeIndex ? 'is-done' : index === activeIndex ? 'is-active' : ''}>
            {step.label}
          </li>)}
          {current === 'visual-system-build' && <li className="is-active">生成视觉系统与适配方案</li>}
        </ol>}
      <div className="ci-form-row ci-form-row--actions">
        {lifecycle.cancellable && <Button variant="ghost" size="sm" onClick={onCancel}>取消任务</Button>}
        <p className="ci-hint">分析完成后会自动进入下一步，无需手动切换。</p>
      </div>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// Direction decision page — merged Directions + Evaluation + Selection
// (CI-W1B.1 Part G)
// ---------------------------------------------------------------------------

function DirectionDecisionPage({ directionSet, evaluationSet, recommendations, conceptRef, selectedDirectionId, onProposeSelection }: {
  directionSet: { directions?: Array<{ id: string; title?: string; thesis?: string; systemHypothesis?: string; visualMechanism?: string; directionFamily?: string; colorRelationship?: string; materialRelationship?: string; compositionLogic?: string; typographyBehavior?: string; graphicBehavior?: string; imageBehavior?: string; crossMediaBehavior?: string[]; spaceApplicability?: string; packagingApplicability?: string; strengths?: string[]; risks?: string[]; status?: string }> } | null | undefined;
  evaluationSet: { evaluations?: Array<{ directionId: string; dimensions?: Record<string, { score: number; reason?: string }>; totalScore?: number; blocked?: boolean; warnings?: string[]; strengths?: string[]; tradeoffs?: string[] }>; ranking?: { rankedDirectionIds?: string[]; rankingReason?: string[] }; recommendation?: { recommendedDirectionIds?: string[]; primaryDirectionId?: string | null; rationale?: string[]; tradeoffs?: string[]; confidence?: string; status?: string } } | null;
  recommendations: { primaryDirectionId?: string | null; recommendedDirectionIds?: string[]; confidence?: string; rationale?: string[]; tradeoffs?: string[]; status?: string } | null;
  conceptRef: { referenceableConceptIds: Set<string>; blockedConceptIds: Set<string>; blockedDirectionIds: Set<string> };
  selectedDirectionId: string | null;
  onProposeSelection(direction: { id: string; title?: string }): void;
}) {
  const directions = directionSet?.directions ?? [];
  const evals = evaluationSet?.evaluations ?? [];
  const evalById = new Map(evals.map((e) => [e.directionId, e] as const));
  const recommendedTitle = directions.find((d) => d.id === recommendations?.primaryDirectionId)?.title ?? recommendations?.primaryDirectionId;
  return <section className="ci-dd-view" data-ciw-user-view="direction-decision">
    <div className="panel ci-dd-head">
      <h2>选择创意方向</h2>
      <p>每个方向都基于已确认的事实生成。系统推荐仅供参考，不会自动成为你的选择。</p>
    </div>
    {recommendations && recommendedTitle && (
      <div className="ci-recommendation-banner" data-ciw-blocked={conceptRef.blockedDirectionIds.size > 0 ? 'true' : 'false'}>
        <div>
          <strong>系统推荐：{recommendedTitle}</strong>
          {recommendations.rationale && recommendations.rationale.length > 0 && <details>
            <summary>为什么推荐</summary>
            <ul>{recommendations.rationale.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </details>}
          {recommendations.tradeoffs && recommendations.tradeoffs.length > 0 && <p className="ci-recommendation__tradeoffs">代价：{recommendations.tradeoffs.join('、')}</p>}
        </div>
        <p className="ci-recommendation__warn">推荐仅供参考，不会自动成为你的选择。只有点击「选择此方向」并确认后才生效。</p>
      </div>
    )}
    {directions.length === 0
      ? <p className="ci-hint panel">尚无 Direction 候选。</p>
      : <ul className="ci-direction-list">
        {directions.map((direction, index) => {
          const availability = evaluateSelectionAvailability(
            { id: direction.id, status: direction.status },
            directionSet,
            selectedDirectionId,
            recommendations
          );
          const evalItem = evalById.get(direction.id);
          return <DirectionDecisionCard
            key={direction.id}
            direction={direction}
            index={index}
            availability={availability}
            selectedDirectionId={selectedDirectionId}
            evalItem={evalItem}
            onProposeSelection={onProposeSelection}
          />;
        })}
      </ul>}
  </section>;
}

function DirectionDecisionCard({ direction, index, availability, selectedDirectionId, evalItem, onProposeSelection }: {
  direction: { id: string; title?: string; thesis?: string; systemHypothesis?: string; visualMechanism?: string; directionFamily?: string; colorRelationship?: string; materialRelationship?: string; compositionLogic?: string; typographyBehavior?: string; graphicBehavior?: string; imageBehavior?: string; crossMediaBehavior?: string[]; spaceApplicability?: string; packagingApplicability?: string; strengths?: string[]; risks?: string[]; status?: string };
  index: number;
  availability: { selectable: boolean; isRecommended: boolean; isAlreadySelected: boolean; isBlocked: boolean };
  selectedDirectionId: string | null;
  evalItem: { directionId: string; dimensions?: Record<string, { score: number; reason?: string }>; totalScore?: number; blocked?: boolean; warnings?: string[]; strengths?: string[]; tradeoffs?: string[] } | undefined;
  onProposeSelection(direction: { id: string; title?: string }): void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBlocked = availability.isBlocked || direction.status === 'blocked';
  const isSelected = selectedDirectionId === direction.id;
  const statusLabel = DIRECTION_STATUS_USER_LABELS[direction.status ?? ''];
  const mediaParts = [
    direction.directionFamily ? DIRECTION_FAMILY_LABELS[direction.directionFamily as keyof typeof DIRECTION_FAMILY_LABELS] ?? direction.directionFamily : '',
    ...(direction.crossMediaBehavior ?? []),
    direction.spaceApplicability ? `空间：${direction.spaceApplicability}` : '',
    direction.packagingApplicability ? `包装：${direction.packagingApplicability}` : ''
  ].filter(Boolean);
  return <li className={`ci-direction ${isBlocked ? 'is-blocked' : ''} ${availability.isRecommended ? 'is-recommended' : ''} ${isSelected ? 'is-selected' : ''}`}>
    <div className="ci-direction__head">
      <strong>Direction {String.fromCharCode(65 + index)} · {direction.title ?? direction.id}</strong>
      {statusLabel && <span className={`ci-direction__status ci-direction__status--${direction.status ?? 'unknown'}`}>{statusLabel}</span>}
      {availability.isRecommended && <span className="ci-direction__recommended">系统推荐</span>}
      {isSelected && <span className="ci-direction__selected">已选择</span>}
      {isBlocked && <span className="ci-direction__locked">不可选择</span>}
    </div>
    <p className="ci-direction__thesis">{direction.thesis ?? ''}</p>
    {direction.visualMechanism && <p className="ci-direction__line"><strong>视觉机制：</strong>{direction.visualMechanism}</p>}
    {direction.systemHypothesis && <p className="ci-direction__line"><strong>系统假设：</strong>{direction.systemHypothesis}</p>}
    {mediaParts.length > 0 && <p className="ci-direction__line"><strong>适用媒介：</strong>{mediaParts.join(' · ')}</p>}
    {(direction.strengths?.length || direction.risks?.length) ? <div className="ci-direction__proscons">
      {direction.strengths && direction.strengths.length > 0 && <p><strong>优势：</strong>{direction.strengths.join('、')}</p>}
      {direction.risks && direction.risks.length > 0 && <p><strong>风险：</strong>{direction.risks.join('、')}</p>}
    </div> : null}
    <div className="ci-direction__cta">
      {isBlocked
        ? <Button variant="ghost" size="sm" disabled>不可选择</Button>
        : isSelected
          ? <Button variant="secondary" size="sm" disabled>已选择</Button>
          : <Button variant="primary" size="sm" onClick={() => onProposeSelection({ id: direction.id, title: direction.title ?? direction.id })}>选择此方向</Button>}
      <button className="button text-button" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        {expanded ? '收起完整方向' : '查看完整方向'}
      </button>
    </div>
    {expanded && <div className="ci-direction__advanced">
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
      {evalItem && <div className="ci-direction__eval">
        <h4>评估（{evalItem.totalScore ?? 0} 分）</h4>
        <ul>
          {Object.entries(evalItem.dimensions ?? {}).map(([key, dim]) => <li key={key}>
            <strong>{EVALUATION_DIMENSION_LABELS[key] ?? key}</strong>
            <span className={`ci-eval-score ci-eval-score--${dim.score}`}>{SCORE_LABELS[dim.score as 0 | 1 | 2 | 3] ?? dim.score}</span>
            {dim.reason && <small>{dim.reason}</small>}
          </li>)}
        </ul>
      </div>}
      <p className="ci-hint">完整追溯链可在「查看分析依据」中查看。</p>
    </div>}
  </li>;
}

// ---------------------------------------------------------------------------
// Visual system page (CI-W1B.1 Part H)
// ---------------------------------------------------------------------------

function VisualSystemPage({ visualCanon, anchorContract, productionTranslation, canonLocked, translationLocked }: {
  visualCanon: { creativeThesis?: string; visualMechanism?: string; systemHypothesis?: string; directionFamily?: string; visualDNA?: unknown; visualGrammar?: Record<string, unknown>; crossMediaCanon?: unknown; lockedAssetRules?: unknown[]; prohibitedMutations?: string[]; canonVersion?: string; trace?: unknown; status?: string } | null;
  anchorContract: { purpose?: string; mustDemonstrate?: string[]; mustPreserve?: string[]; mayExplore?: string[]; mustNotChange?: string[]; evaluationCriteria?: unknown[]; status?: string } | null;
  productionTranslation: { context?: unknown; space?: { mustPreserve?: string[]; mayAdapt?: string[]; mustNotIntroduce?: string[]; canonVersion?: string; translationVersion?: string; status?: string }; packaging?: { mustPreserve?: string[]; mayAdapt?: string[]; mustNotIntroduce?: string[]; canonVersion?: string; translationVersion?: string; status?: string } } | null;
  canonLocked: boolean;
  translationLocked: boolean;
}) {
  const space = productionTranslation?.space;
  const packaging = productionTranslation?.packaging;
  const grammar = visualCanon?.visualGrammar ?? {};
  const grammarText = plainText(visualCanon?.visualGrammar);
  return <section className="ci-vs-view" data-ciw-user-view="visual-system">
    <div className="ci-vs-grid">
      <section className="panel ci-vs-section">
        <h3>核心视觉原则</h3>
        {!visualCanon
          ? <p className="ci-hint">{canonLocked ? '选择创意方向后才会生成视觉系统。' : '尚无视觉系统数据。'}</p>
          : <div className="ci-canon-user">
            <VisualCanonRow index="01" title="核心视觉原则" value={visualCanon.creativeThesis} />
            {visualCanon.visualMechanism && <p className="ci-canon-user__line"><strong>视觉机制：</strong>{visualCanon.visualMechanism}</p>}
            {visualCanon.systemHypothesis && <p className="ci-canon-user__line"><strong>系统假设：</strong>{visualCanon.systemHypothesis}</p>}
            {visualCanon.directionFamily && <p className="ci-canon-user__line"><strong>方向族：</strong>{DIRECTION_FAMILY_LABELS[visualCanon.directionFamily as keyof typeof DIRECTION_FAMILY_LABELS] ?? visualCanon.directionFamily}</p>}
            <VisualCanonRow index="02" title="视觉 DNA" value={plainText(visualCanon.visualDNA)} />
            <VisualCanonRow index="03" title="构图与层级" value={plainText(grammar.compositionLogic ?? grammar.layout ?? (grammarText && !grammar.colorRelationship && !grammar.materialRelationship && !grammar.graphicBehavior ? grammarText : ''))} />
            <VisualCanonRow index="04" title="色彩关系" value={plainText(grammar.colorRelationship)} />
            <VisualCanonRow index="05" title="材质关系" value={plainText(grammar.materialRelationship)} />
            <VisualCanonRow index="06" title="图形语言" value={plainText(grammar.graphicBehavior)} />
            <VisualCanonRow index="07" title="跨媒介延展" value={plainText(visualCanon.crossMediaCanon)} />
            <VisualCanonRow index="08" title="禁止偏移" value={(visualCanon.prohibitedMutations ?? []).join('；')} />
          </div>}
      </section>

      <section className="panel ci-vs-section">
        <h3>视觉验收标准</h3>
        <p className="ci-hint">定义后续视觉产出必须保留、可以探索和禁止改变的内容。</p>
        {!anchorContract
          ? <p className="ci-hint">尚无验收标准。</p>
          : <div className="ci-anchor-user">
            {anchorContract.purpose && <p><strong>目的：</strong>{anchorContract.purpose}</p>}
            <ContractBucket title="必须呈现" items={anchorContract.mustDemonstrate ?? []} />
            <ContractBucket title="必须保留" items={anchorContract.mustPreserve ?? []} />
            <ContractBucket title="可以探索" items={anchorContract.mayExplore ?? []} />
            <ContractBucket title="不得改变" items={anchorContract.mustNotChange ?? []} />
          </div>}
      </section>

      <section className="panel ci-vs-section">
        <h3>应用适配</h3>
        {translationLocked
          ? <p className="ci-hint">完成方向选择与视觉系统生成后，才会产出空间与包装的适配说明。</p>
          : <>
            {space ? <div className="ci-adapt">
              <h4>空间适配</h4>
              <AdaptationBucket title="必须保留" items={space.mustPreserve ?? []} />
              <AdaptationBucket title="可以调整" items={space.mayAdapt ?? []} />
              <AdaptationBucket title="不能引入" items={space.mustNotIntroduce ?? []} />
            </div> : <p className="ci-hint">尚无空间适配说明。</p>}
            {packaging ? <div className="ci-adapt">
              <h4>包装适配</h4>
              <AdaptationBucket title="必须保留" items={packaging.mustPreserve ?? []} />
              <AdaptationBucket title="可以调整" items={packaging.mayAdapt ?? []} />
              <AdaptationBucket title="不能引入" items={packaging.mustNotIntroduce ?? []} />
            </div> : <p className="ci-hint">尚无包装适配说明。</p>}
          </>}
      </section>
    </div>
  </section>;
}

function VisualCanonRow({ index, title, value }: { index: string; title: string; value?: string }) {
  if (!value) return null;
  return <div className="ci-canon-user__row">
    <strong>{index} · {title}</strong>
    <p>{value}</p>
  </div>;
}

function ContractBucket({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div className="ci-anchor-user__bucket">
    <h4>{title}</h4>
    <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
  </div>;
}

function AdaptationBucket({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div className="ci-adapt__bucket">
    <h4>{title}</h4>
    <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
  </div>;
}

// ---------------------------------------------------------------------------
// Selection confirm dialog (CI-W1B.1 Part G)
// ---------------------------------------------------------------------------

function SelectionDialog({ proposal, onCancel, onConfirm, busy }: {
  proposal: SelectionProposal;
  onCancel(): void;
  onConfirm(): void;
  busy: boolean;
}) {
  return <div className="ci-modal" role="dialog" aria-modal="true">
    <div className="ci-modal__panel panel">
      <h2>确认选择「{proposal.directionTitle}」？</h2>
      <p>这个方向将成为后续视觉系统的基础。</p>
      <p>系统推荐不会替代你的选择。</p>
      {proposal.isRevision && <p className="ci-modal__rev">这是第 <strong>{proposal.newRevision}</strong> 次选择，视觉系统与适配方案将基于新方向重建。</p>}
      {proposal.recommended && <p className="ci-modal__rec">系统也推荐了此方向 — 仅作为参考，不会自动选中。</p>}
      <div className="ci-modal__actions">
        <Button variant="ghost" size="md" onClick={onCancel} disabled={busy}>取消</Button>
        <Button variant="primary" size="md" onClick={onConfirm} disabled={busy}>{busy ? '提交中…' : '确认选择'}</Button>
      </div>
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Advanced analysis drawer (CI-W1B.1 Part I)
// ---------------------------------------------------------------------------

function AdvancedAnalysisDrawer({ open, onClose, onOpen, view, trace, diagnostics }: {
  open: boolean;
  onClose(): void;
  onOpen(): void;
  view: WorkspaceView;
  trace: Array<{ kind: string; id: string; label: string; detail: string; status: string; refs: string[] }>;
  diagnostics: { blocking: string[]; warning: string[]; diagnostic: string[] };
}) {
  const truth = view.truth as null | { facts?: Array<{ id: string; field: string; value: unknown; status?: string }> };
  const needs = (view.needs ?? []) as Array<{ id: string; title?: string; description?: string }>;
  const insights = (view.insights ?? []) as Array<{ id: string; title?: string; description?: string }>;
  const opportunities = (view.opportunityMap as null | { opportunities?: Array<{ id: string; title?: string; description?: string }> })?.opportunities ?? [];
  const concepts = (view.conceptSet as null | { concepts?: Array<{ id: string; title?: string; thesis?: string; status?: string }> })?.concepts ?? [];
  const evaluations = (view.evaluation as null | { evaluations?: Array<{ directionId: string; totalScore?: number; blocked?: boolean }>; ranking?: { rankedDirectionIds?: string[] } })?.evaluations ?? [];
  const ranking = (view.evaluation as null | { ranking?: { rankedDirectionIds?: string[] } })?.ranking ?? null;
  const snapshot = view.selectedDirectionSnapshot as null | { traceVersion?: string };
  const visualCanon = view.visualCanon as null | { canonVersion?: string };
  const space = (view.productionTranslation as null | { space?: { canonVersion?: string; translationVersion?: string } | null })?.space;
  const packaging = (view.productionTranslation as null | { packaging?: { canonVersion?: string; translationVersion?: string } | null })?.packaging;
  const selectionRevision = view.run.selectionRevision;
  const canonVersion = versionLabel(visualCanon?.canonVersion ?? snapshot?.traceVersion ?? null);
  const spaceVersion = versionLabel(space?.canonVersion ?? space?.translationVersion ?? null);
  const packagingVersion = versionLabel(packaging?.canonVersion ?? packaging?.translationVersion ?? null);
  return <>
    <button className="ci-advanced-button" type="button" onClick={onOpen} aria-pressed={open}>查看分析依据</button>
    {open ? <div className="ci-advanced-drawer" role="dialog" aria-label="查看分析依据">
      <header>
        <strong>查看分析依据</strong>
        <small>内部推理数据 · 高级</small>
        <button type="button" onClick={onClose} aria-label="关闭">×</button>
      </header>
      <div className="ci-advanced-drawer__body">
        <PipelineSection title="Project Truth">
          {(truth?.facts ?? []).map((fact) => <li key={fact.id}><strong>{fact.field}</strong><span>{plainText(fact.value)}</span></li>)}
        </PipelineSection>
        <PipelineSection title="Need">
          {needs.map((need) => <li key={need.id}><strong>{need.title ?? need.id}</strong><span>{need.description ?? ''}</span></li>)}
        </PipelineSection>
        <PipelineSection title="Insight">
          {insights.map((insight) => <li key={insight.id}><strong>{insight.title ?? insight.id}</strong><span>{insight.description ?? ''}</span></li>)}
        </PipelineSection>
        <PipelineSection title="Opportunity">
          {opportunities.map((opp) => <li key={opp.id}><strong>{opp.title ?? opp.id}</strong><span>{opp.description ?? ''}</span></li>)}
        </PipelineSection>
        <PipelineSection title="Concept">
          {concepts.map((concept) => <li key={concept.id}><strong>{concept.title ?? concept.id}</strong><span>{concept.thesis ?? ''} · {concept.status ?? ''}</span></li>)}
        </PipelineSection>
        <PipelineSection title="Evaluation">
          {evaluations.map((evalItem) => <li key={evalItem.directionId}><strong>{evalItem.directionId}</strong><span>总分 {evalItem.totalScore ?? 0}{evalItem.blocked ? ' · blocked' : ''}</span></li>)}
          {ranking?.rankedDirectionIds && ranking.rankedDirectionIds.length > 0 && <li className="ci-advanced-drawer__sub"><strong>排名</strong><span>{ranking.rankedDirectionIds.join(' > ')}</span></li>}
        </PipelineSection>
        <section className="ci-advanced-drawer__section">
          <h3>Trace</h3>
          {trace.length ? <ol className="ci-trace-list">
            {trace.map((step) => <li key={`${step.kind}-${step.id}`} className={`ci-trace-step ci-trace-step--${step.kind}`}>
              <span className="ci-trace-step__kind">{step.kind}</span>
              <strong>{step.label}</strong>
              {step.detail && <p>{step.detail}</p>}
              <small>status: {step.status}</small>
            </li>)}
          </ol> : <p className="ci-hint">无追溯数据。</p>}
        </section>
        <section className="ci-advanced-drawer__section">
          <h3>Diagnostics</h3>
          {diagnostics.blocking.length > 0 && <div className="ci-diagnostics ci-diagnostics--blocking">
            <strong>需要处理 ({diagnostics.blocking.length})</strong>
            <ul>{diagnostics.blocking.map((d, i) => <li key={i}>{d}</li>)}</ul>
          </div>}
          {diagnostics.warning.length > 0 && <div className="ci-diagnostics ci-diagnostics--warning">
            <strong>提醒 ({diagnostics.warning.length})</strong>
            <ul>{diagnostics.warning.map((d, i) => <li key={i}>{d}</li>)}</ul>
          </div>}
          {diagnostics.diagnostic.length > 0 && <div className="ci-diagnostics ci-diagnostics--diagnostic">
            <strong>技术信息 ({diagnostics.diagnostic.length})</strong>
            <ul>{diagnostics.diagnostic.map((d, i) => <li key={i}>{d}</li>)}</ul>
          </div>}
          {diagnostics.blocking.length === 0 && diagnostics.warning.length === 0 && diagnostics.diagnostic.length === 0 && <p className="ci-hint">无诊断信息。</p>}
        </section>
        <section className="ci-advanced-drawer__section">
          <h3>版本信息</h3>
          <ul className="ci-advanced-drawer__kv">
            <li><strong>Selection Revision</strong><span>v{selectionRevision}</span></li>
            <li><strong>Canon Version</strong><span>{canonVersion}</span></li>
            <li><strong>Translation Version · Space</strong><span>{spaceVersion}</span></li>
            <li><strong>Translation Version · Packaging</strong><span>{packagingVersion}</span></li>
          </ul>
        </section>
      </div>
    </div> : null}
  </>;
}

function PipelineSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ci-advanced-drawer__section">
    <h3>{title}</h3>
    <ul className="ci-pipeline-list">{children}</ul>
  </section>;
}
