// CreativeIntelligenceWorkspace — CI-W1B.1 progressive-disclosure workspace.
//
// Architecture:
//   - Controller (ciworkspace/controller.ts) owns all state transitions and
//     the user-view projection (deriveCreativeIntelligenceUserView).
//   - This component owns: lifecycle wiring (RPC calls, progress events),
//     layout, sub-views, and dialogs.
//   - The component NEVER reads run files from disk. The only CI access
//     is through `window.masterpiece.creativeIntelligence` (kebab-case RPC).
//   - The component NEVER imports from the CI domain package directly
//     (it talks to the runtime via window.masterpiece.creativeIntelligence).
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
  type WorkspaceView,
  type AllBlockedView
} from '../ciworkspace/types.ts';
import {
  applyLocalFactAction,
  applyLocalFactEdit,
  buildLocalFactRows,
  buildSelectionProposal,
  buildTraceChain,
  computeConceptReferenceability,
  deriveAllBlockedView,
  deriveCreativeIntelligenceUserView,
  deriveRunLifecycle,
  deriveThinkingProgress,
  evaluateSelectionAvailability,
  groupDiagnostics,
  groupFactRows,
  serializeFactRows
} from '../ciworkspace/controller.ts';
import {
  buildAnchorApprovalProposal,
  deriveAnchorAvailability,
  deriveAnchorUserView,
  describeEvaluationSummary,
  formatApprovalRevision,
  formatApprovalTimestamp,
  isCandidateApproveable,
  statusLabelFor,
} from '../ciworkspace/anchor-controller.ts';
import type {
  AnchorApprovalProposal,
  AnchorProductionWorkspace as AnchorProductionWorkspaceView,
  CiAnchorCandidate,
  CiAnchorCandidateEvaluation,
} from '../ciworkspace/anchor-types.ts';
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

  // CI-W1C.1 PART C: Anchor Production requires an explicit IMAGE
  // profile (separate from the ANALYSIS profile used for the CI main
  // run). The orchestrator throws SELECTION_REQUIRED if this is
  // missing — the analysis profile fallback is forbidden. Track a
  // dedicated image profile id here and pass it through to
  // startAnchorProduction.
  const imageProfiles = settings.profiles.filter((profile) =>
    profile.isEnabled
    && profile.hasApiKey
    && profile.modelType === 'image_generation');
  const defaultImageProfile = imageProfiles.find((profile) => profile.isDefault) || imageProfiles[0];
  const [imageApiProfileId, setImageApiProfileId] = useState<string>(defaultImageProfile?.id || '');

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
    if (!window.confirm('确定取消这个智能创意任务吗？')) return;
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

  // ── CI-W2: Anchor Production handlers (kebab-case RPC) ──
  // The Web never imports from the CI package; the only path to
  // Anchor Production state is through `creativeIntelligence:*-anchor-*`
  // channels. The component owns the dialog / confirm flow; the
  // controller owns the projection.
  const [pendingAnchorProposal, setPendingAnchorProposal] = useState<AnchorApprovalProposal | null>(null);

  const handleStartAnchorProduction = useCallback(async (runId: string) => {
    if (!ci.startAnchorProduction) return;
    if (!imageApiProfileId) { setError('请先选择图像生成模型（Image Profile）。'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const view = await ci.startAnchorProduction(runId, { apiProfileId: imageApiProfileId });
      setActiveView(view as WorkspaceView);
      setNotice('视觉锚点生成中…');
    } catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }, [ci, imageApiProfileId]);

  const handleApproveAnchorCandidate = useCallback(async (runId: string, candidateId: string) => {
    const workspace = (activeView as unknown as { anchorProduction?: AnchorProductionWorkspaceView } | null)?.anchorProduction;
    const candidate = workspace?.candidates?.find((c) => c.id === candidateId);
    if (!candidate) {
      setError('找不到候选视觉锚点');
      return;
    }
    if (!isCandidateApproveable(candidate)) {
      setError('当前候选包含阻断项，无法设为视觉基准');
      return;
    }
    const index = workspace?.candidates?.indexOf(candidate) ?? 0;
    const proposal = buildAnchorApprovalProposal(candidate, index);
    setPendingAnchorProposal(proposal);
  }, [activeView]);

  const confirmAnchorApproval = useCallback(async () => {
    if (!pendingAnchorProposal) return;
    const runId = activeLifecycle?.run.id;
    if (!runId) {
      setPendingAnchorProposal(null);
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      if (!ci.approveAnchorCandidate) throw new Error('approveAnchorCandidate 不可用');
      const view = await ci.approveAnchorCandidate(runId, pendingAnchorProposal.candidateId, 'user-confirmed');
      setActiveView(view as WorkspaceView);
      setNotice('已设为视觉基准');
    } catch (reason) { setError(cleanError(reason)); }
    finally {
      setPendingAnchorProposal(null);
      setBusy(false);
    }
  }, [pendingAnchorProposal, activeLifecycle, ci]);

  const handleRejectAnchorCandidate = useCallback(async (runId: string, candidateId: string) => {
    if (!ci.rejectAnchorCandidate) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const view = await ci.rejectAnchorCandidate(runId, candidateId);
      setActiveView(view as WorkspaceView);
    } catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }, [ci]);

  const handleRetryAnchorCandidate = useCallback(async (runId: string, candidateId: string | null) => {
    if (!ci.retryAnchorCandidate) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const view = await ci.retryAnchorCandidate(runId, candidateId);
      setActiveView(view as WorkspaceView);
    } catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }, [ci]);

  const handleCancelAnchorProduction = useCallback(async (runId: string) => {
    if (!window.confirm('确定取消当前视觉锚点生成吗？')) return;
    if (!ci.cancelAnchorProduction) return;
    setBusy(true); setError('');
    try {
      const view = await ci.cancelAnchorProduction(runId);
      setActiveView(view as WorkspaceView);
    } catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }, [ci]);

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
              { label: '智能创意' }
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
      <span>智能创意 · 5.0.0-rc.1</span>
      <span>{runs.length} 个任务 · {lifecycles.filter((l) => l.run.status === 'completed').length} 个完成</span>
    </>}
  >
    <div className="page ci-workspace" data-ciw-user-view={userView}>
      <header className="page-header ci-workspace__header">
        <div>
          <p className="eyebrow">智能创意</p>
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
        {userView === 'all-blocked' && activeLifecycle && <AllBlockedPage
          allBlocked={deriveAllBlockedView(activeView)}
          onOpenAdvanced={() => setShowAdvanced(true)}
          onRemove={() => void handleRemove(activeLifecycle.run)}
        />}
        {userView === 'visual-system' && activeLifecycle && <VisualSystemPage
          visualCanon={visualCanon}
          anchorContract={anchorContract}
          productionTranslation={productionTranslation}
          anchorProduction={activeView?.anchorProduction as AnchorProductionWorkspaceView | null}
          canonLocked={canonLocked}
          translationLocked={translationLocked}
          imageProfiles={imageProfiles}
          imageApiProfileId={imageApiProfileId}
          onImageApiProfileChange={setImageApiProfileId}
          onStartAnchorProduction={() => void handleStartAnchorProduction(activeLifecycle.run.id)}
          onApproveAnchorCandidate={(candidateId) => void handleApproveAnchorCandidate(activeLifecycle.run.id, candidateId)}
          onRejectAnchorCandidate={(candidateId) => void handleRejectAnchorCandidate(activeLifecycle.run.id, candidateId)}
          onRetryAnchorCandidates={(candidateId) => void handleRetryAnchorCandidate(activeLifecycle.run.id, candidateId)}
          onCancelAnchorProduction={() => void handleCancelAnchorProduction(activeLifecycle.run.id)}
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

      {pendingAnchorProposal && (
        <AnchorApprovalDialog
          proposal={pendingAnchorProposal}
          onCancel={() => setPendingAnchorProposal(null)}
          onConfirm={() => void confirmAnchorApproval()}
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
    case 'input': return '智能创意';
    case 'fact-review': return '确认项目事实';
    case 'thinking': return '正在形成创意方向';
    case 'direction-decision': return '创意方向';
    case 'all-blocked': return '暂时无法形成可用的创意方向';
    case 'visual-system': return '视觉系统';
  }
}

function viewSubtitle(userView: CreativeIntelligenceUserView): string {
  switch (userView) {
    case 'input': return '从项目资料出发，理解品牌与业务，形成可执行的创意方向与视觉系统。';
    case 'fact-review': return '这些信息会成为后续创意推理的事实基础。请确认、修改或标记未知。';
    case 'thinking': return '系统正在后台完成事实到方向的全部分析，完成后会请你选择创意方向。';
    case 'direction-decision': return '系统已生成并评估多个创意方向。请选择其一作为后续视觉系统的基础。';
    case 'all-blocked': return '系统已经完成项目分析，但当前所有概念均未通过进入创意方向的条件。下方是真实原因和恢复路径。';
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
              {busy ? '提交中…' : '开始智能创意'}
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
          <small className="ci-aside-label">最近 智能创意</small>
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
// CI-W1C.7: minimal projection of Model-Assisted Visual Direction
// Exploration Report shadow artifacts (when available). The panel
// reads from `window.masterpiece.creativeIntelligence.modelAssisted`
// and renders nothing if the data is absent.
// ---------------------------------------------------------------------------
import { ModelAssistedDirectionPanel } from './ModelAssistedDirectionPanel.tsx';
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
    {(() => {
      // CI-W1C.7 minimal projection: read model-assisted shadow
      // artifacts from the runtime accessor if available. The
      // panel renders nothing if the data is absent.
      const ci = typeof window !== 'undefined' ? (window as unknown as { masterpiece?: { creativeIntelligence?: { modelAssisted?: { listDirections?: (projectId: string) => Promise<unknown> } } } }).masterpiece?.creativeIntelligence : null;
      if (!ci?.modelAssisted?.listDirections) return null;
      const projectId = directionSet && (directionSet as { projectId?: string }).projectId;
      if (!projectId) return null;
      return <ModelAssistedDirectionPanelFetcher projectId={projectId} listDirections={ci.modelAssisted.listDirections} />;
    })()}
  </section>;
}

// CI-W1C.7: fetcher component for the Model-Assisted Direction
// panel. Renders nothing on error. Never throws.
function ModelAssistedDirectionPanelFetcher({ projectId, listDirections }: { projectId: string; listDirections: (projectId: string) => Promise<unknown> }) {
  const [data, setData] = useState<{ directions: Array<{ id: string; title?: string; directionFamily?: string; creativeThesis?: string; visualMechanism?: string; systemHypothesis?: string; whyThisProject?: string; differenceFromOtherDirections?: string; strengths?: string[]; risks?: string[]; mustNotBecome?: string[]; epistemicClass?: string }>; reportPath?: string; reportPreview?: string; generatedAt?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    listDirections(projectId).then((result) => {
      if (cancelled) return;
      setData(result as { directions: Array<{ id: string; title?: string; directionFamily?: string; creativeThesis?: string; visualMechanism?: string; systemHypothesis?: string; whyThisProject?: string; differenceFromOtherDirections?: string; strengths?: string[]; risks?: string[]; mustNotBecome?: string[]; epistemicClass?: string }>; reportPath?: string; reportPreview?: string; generatedAt?: string } | null);
    }).catch(() => {
      if (!cancelled) setData(null);
    });
    return () => { cancelled = true; };
  }, [projectId, listDirections]);
  if (!data) return null;
  return <ModelAssistedDirectionPanel
    directions={data.directions}
    reportPath={data.reportPath}
    reportPreview={data.reportPreview}
    generatedAt={data.generatedAt}
  />;
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

function VisualSystemPage({
  visualCanon,
  anchorContract,
  productionTranslation,
  anchorProduction,
  canonLocked,
  translationLocked,
  imageProfiles,
  imageApiProfileId,
  onImageApiProfileChange,
  onStartAnchorProduction,
  onApproveAnchorCandidate,
  onRejectAnchorCandidate,
  onRetryAnchorCandidates,
  onCancelAnchorProduction,
}: {
  visualCanon: { creativeThesis?: string; visualMechanism?: string; systemHypothesis?: string; directionFamily?: string; visualDNA?: unknown; visualGrammar?: Record<string, unknown>; crossMediaCanon?: unknown; lockedAssetRules?: unknown[]; prohibitedMutations?: string[]; canonVersion?: string; trace?: unknown; status?: string } | null;
  anchorContract: { purpose?: string; mustDemonstrate?: string[]; mustPreserve?: string[]; mayExplore?: string[]; mustNotChange?: string[]; evaluationCriteria?: unknown[]; status?: string } | null;
  productionTranslation: { context?: unknown; space?: { mustPreserve?: string[]; mayAdapt?: string[]; mustNotIntroduce?: string[]; canonVersion?: string; translationVersion?: string; status?: string }; packaging?: { mustPreserve?: string[]; mayAdapt?: string[]; mustNotIntroduce?: string[]; canonVersion?: string; translationVersion?: string; status?: string } } | null;
  anchorProduction: AnchorProductionWorkspaceView | null;
  canonLocked: boolean;
  translationLocked: boolean;
  imageProfiles: Array<{ id: string; displayName: string; modelId: string; protocol?: string }>;
  imageApiProfileId: string;
  onImageApiProfileChange(profileId: string): void;
  onStartAnchorProduction(): void;
  onApproveAnchorCandidate(candidateId: string): void;
  onRejectAnchorCandidate(candidateId: string): void;
  onRetryAnchorCandidates(candidateId: string | null): void;
  onCancelAnchorProduction(): void;
}) {
  const space = productionTranslation?.space;
  const packaging = productionTranslation?.packaging;
  const grammar = visualCanon?.visualGrammar ?? {};
  const grammarText = plainText(visualCanon?.visualGrammar);
  const selectedDirectionId = (anchorProduction?.run?.selectedDirectionId) ?? null;
  const selectionRevision = anchorProduction?.run?.selectionRevision ?? 0;
  const canonVersion = anchorProduction?.run?.canonVersion ?? null;
  const parent = visualCanon
    ? { selectionRevision, canonVersion: visualCanon.canonVersion ?? canonVersion }
    : (canonVersion ? { selectionRevision, canonVersion } : null);
  const availability = deriveAnchorAvailability(anchorProduction, parent);
  const anchorView = deriveAnchorUserView(anchorProduction);
  const approved = anchorProduction?.approvedAnchor ?? null;
  const candidates: CiAnchorCandidate[] = anchorProduction?.candidates ?? [];
  const generatedCandidates = candidates.filter((c: CiAnchorCandidate) => c.status === 'generated');
  const history = anchorProduction?.approvalHistory ?? [];
  const subRun = anchorProduction?.run ?? null;
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

      <section className="panel ci-vs-section ci-anchor-section" data-ciw-anchor-view={anchorView}>
        <h3>建立视觉基准</h3>
        <p className="ci-hint">将当前 Creative Direction 转化为第一组视觉 Anchor，用于确认这个方向在真实视觉中的表现。</p>

        {availability.blockers.length > 0 && (
          <ul className="ci-anchor-blockers" data-ciw-anchor-blockers>
            {availability.blockers.map((b) => <li key={b}>{anchorBlockerLabel(b)}</li>)}
          </ul>
        )}

        {anchorView === 'unvisualized' && (
          <div className="ci-anchor-empty" data-ciw-anchor-empty>
            <p className="ci-hint">尚未生成视觉锚点。</p>
            <div className="panel ci-profile-mini ci-anchor-image-profile">
              <label htmlFor="ci-anchor-image-profile-select">图像生成模型</label>
              <select
                id="ci-anchor-image-profile-select"
                data-ciw-anchor-image-profile-select
                value={imageApiProfileId}
                onChange={(event) => onImageApiProfileChange(event.target.value)}
                disabled={!imageProfiles.length}
              >
                {imageProfiles.length === 0 && <option value="">暂无已启用的图像生成模型，请先在模型设置中配置。</option>}
                {imageProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName} / {profile.modelId}
                  </option>
                ))}
              </select>
              <p className="ci-hint">
                必须为视觉锚点选择独立的图像生成模型，不能沿用 CI 主流程的文本分析模型。
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              disabled={!availability.canStart || !imageApiProfileId}
              onClick={onStartAnchorProduction}
            >
              生成视觉锚点
            </Button>
            {!availability.canStart && (
              <p className="ci-hint">当前状态下不能启动视觉锚点生成。</p>
            )}
            {availability.canStart && !imageApiProfileId && (
              <p className="ci-hint">请先选择图像生成模型。</p>
            )}
          </div>
        )}

        {anchorView === 'generating-anchor' && (
          <div className="ci-anchor-generating" data-ciw-anchor-generating>
            <p>正在生成视觉锚点</p>
            <p className="ci-hint">状态：{statusLabelFor(subRun?.status)}</p>
            {subRun?.providerId && subRun?.modelId && (
              <p className="ci-hint">模型：{subRun.providerId} / {subRun.modelId}</p>
            )}
            <Button variant="ghost" size="sm" onClick={onCancelAnchorProduction}>取消</Button>
          </div>
        )}

        {(anchorView === 'anchor-review' || anchorView === 'anchor-approved') && (
          <div className="ci-anchor-review" data-ciw-anchor-review>
            {anchorView === 'anchor-approved' && approved && (
              <div className="ci-anchor-approved-banner" data-ciw-anchor-approved>
                <strong>视觉基准已确认</strong>
                <p>Selected Direction · {selectedDirectionId ?? '—'}</p>
                <p>Canon Version · {approved.canonVersion}</p>
                <p>Anchor Revision · {formatApprovalRevision(approved.approvalRevision)}</p>
                <p>Approved at · {formatApprovalTimestamp(approved.approvedAt)}</p>
              </div>
            )}

            {generatedCandidates.length === 0 ? (
              <p className="ci-hint">未生成候选视觉锚点。</p>
            ) : (
              <ol className="ci-anchor-candidate-grid" data-ciw-anchor-candidate-grid>
                {generatedCandidates.map((cand: CiAnchorCandidate, idx: number) => {
                  const isApproved = approved?.candidateId === cand.id;
                  return <li
                    key={cand.id}
                    className={`ci-anchor-candidate ${isApproved ? 'is-approved' : ''}`}
                    data-ciw-anchor-candidate={cand.id}
                    data-ciw-anchor-candidate-index={idx}
                  >
                    <div className="ci-anchor-candidate__media">
                      <span className="ci-anchor-candidate__placeholder">
                        Anchor Candidate 0{idx + 1}
                      </span>
                    </div>
                    <div className="ci-anchor-candidate__body">
                      <p className="ci-anchor-candidate__id">candidate · {cand.id.slice(0, 8)}</p>
                      <p className="ci-anchor-candidate__eval">
                        验收摘要 · {describeEvaluationSummary(cand.evaluation)}
                      </p>
                      {cand.evaluation.warnings.length > 0 && (
                        <ul className="ci-anchor-candidate__warnings">
                          {cand.evaluation.warnings.map((w) => <li key={w}>{w}</li>)}
                        </ul>
                      )}
                      <div className="ci-anchor-candidate__cta">
                        <Button variant="ghost" size="sm" onClick={() => onRetryAnchorCandidates(cand.id)}>重新生成</Button>
                        <Button variant="ghost" size="sm" onClick={() => onRejectAnchorCandidate(cand.id)}>拒绝</Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={!availability.canApprove || !isCandidateApproveable(cand)}
                          onClick={() => onApproveAnchorCandidate(cand.id)}
                        >
                          设为视觉基准
                        </Button>
                      </div>
                      {isApproved && <span className="ci-anchor-candidate__badge">已设为视觉基准</span>}
                    </div>
                  </li>;
                })}
              </ol>
            )}

            <div className="ci-anchor-actions">
              <Button variant="ghost" size="sm" disabled={!availability.canRetry} onClick={() => onRetryAnchorCandidates(null)}>
                重新生成全部
              </Button>
            </div>

            {history.length > 0 && (
              <details className="ci-anchor-history">
                <summary>查看历史（{history.length}）</summary>
                <ul>
                  {history.map((h) => <li key={`${h.revision}-${h.candidateId}`}>
                    v{h.revision} · {h.candidateId.slice(0, 8)} · {h.canonVersion}
                    {h.supersededBy && <> · {h.supersededBy}</>}
                    · {formatApprovalTimestamp(h.approvedAt)}
                  </li>)}
                </ul>
              </details>
            )}

            {approved && (
              <div className="ci-anchor-next" data-ciw-anchor-next>
                <h4>应用这个视觉系统</h4>
                <p className="ci-hint">以下为后续入口，CI-W2 暂不触发生产。</p>
                <div className="ci-anchor-next__cards">
                  <article className="ci-anchor-next__card" aria-disabled="true">
                    <strong>空间效果图</strong>
                    <p>基于已确认的 Visual Canon + Approved Visual Anchor 延展。</p>
                    <span className="ci-anchor-next__disabled">CI-10 启动</span>
                  </article>
                  <article className="ci-anchor-next__card" aria-disabled="true">
                    <strong>包装效果图</strong>
                    <p>基于已确认的 Visual Canon + Approved Visual Anchor 延展。</p>
                    <span className="ci-anchor-next__disabled">CI-10 启动</span>
                  </article>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  </section>;
}

function anchorBlockerLabel(reason: string): string {
  switch (reason) {
    case 'no-selection': return '请先完成 Direction 选择。';
    case 'no-canon': return '请先生成 Visual Canon。';
    case 'no-contract': return '请先生成 Anchor Contract。';
    case 'contract-blocked': return 'Anchor Contract 当前被阻断。';
    case 'locked-asset-conflict': return '锁定资产与 Anchor Contract 不一致。';
    case 'generation-failed': return '上次视觉锚点生成失败。';
    case 'run-not-found': return 'Anchor sub-run 不存在。';
    default: return reason;
  }
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
// CI-W2: Anchor Approval confirmation dialog.
// Mirrors the SelectionDialog flow: the user must explicitly confirm
// before the runtime commits the approval. Auto-confirm is forbidden.
// ---------------------------------------------------------------------------

function AnchorApprovalDialog({ proposal, onCancel, onConfirm, busy }: {
  proposal: AnchorApprovalProposal;
  onCancel(): void;
  onConfirm(): void;
  busy: boolean;
}) {
  return <div className="ci-modal" role="dialog" aria-modal="true" data-ciw-anchor-approval-dialog>
    <div className="ci-modal__panel panel">
      <h2>将这张图设为视觉基准？</h2>
      <p>将这张图设为当前 Creative Direction 的视觉基准？后续空间与包装延展将以该 Visual Canon + Anchor 为参考。</p>
      <p className="ci-hint">候选 ID · {proposal.candidateId.slice(0, 8)}</p>
      <div className="ci-modal__actions">
        <Button variant="ghost" size="md" disabled={busy} onClick={onCancel}>取消</Button>
        <Button variant="primary" size="md" disabled={busy} onClick={onConfirm}>确认设为视觉基准</Button>
      </div>
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// CI-W1B.2: All-Blocked recovery page.
//
// The page is rendered ONLY when run.status === 'direction_blocked'.
// It shows the Runtime-projected blocker summary (one row per issue
// code) and offers three CTAs: 查看详细原因 / 重新创建任务 / 删除此任务.
// There is NO "返回事实确认" button because the Runtime does NOT
// yet support fact-revision (Spec §12, §29) — wiring one would be a
// fake-failure surface.
// ---------------------------------------------------------------------------

const CATEGORY_LABEL: Record<AllBlockedView['blockers'][number]['category'], string> = {
  need_coverage: '需求覆盖',
  identity_conflict: '身份冲突',
  asset_authorization: '资产 / 资质',
  evidence_gap: '事实依据',
  unsupported_claim: '事实声明',
  other: '其它'
};

function AllBlockedPage({ allBlocked, onOpenAdvanced, onRemove }: {
  allBlocked: AllBlockedView | null;
  onOpenAdvanced(): void;
  onRemove(): void;
}) {
  if (!allBlocked) {
    return <section className="ci-ab-view" data-ciw-user-view="all-blocked">
      <div className="panel">
        <h2>暂时无法形成可用的创意方向</h2>
        <p>未能加载阻断原因摘要。</p>
      </div>
    </section>;
  }
  const { blockers, blockedConceptCount, totalConceptCount, fallbackOnly } = allBlocked;
  return <section className="ci-ab-view" data-ciw-user-view="all-blocked" data-ciw-fallback={fallbackOnly ? 'true' : 'false'}>
    <div className="panel ci-ab-head">
      <h2>暂时无法形成可用的创意方向</h2>
      <p>
        系统已经完成项目分析，
        但当前 <strong>{totalConceptCount}</strong> 个概念中 <strong>{blockedConceptCount}</strong> 个未通过进入创意方向的条件。
      </p>
      <p className="ci-ab-sub">
        这不是错误，是系统在"当前没有可成立的创意方向"时的明确状态。
        下方是真实原因和恢复路径。
      </p>
    </div>

    <div className="panel ci-ab-summary">
      <h3>原因摘要</h3>
      {fallbackOnly ? <p>暂无详细诊断条目。系统未记录具体 Gate 阻断原因，请打开分析抽屉查看原始 Gate 结果。</p> : null}
      <ul className="ci-ab-list" data-ciw-blocker-count={blockers.length}>
        {blockers.map((b) => <li
          key={b.code}
          className="ci-ab-row"
          data-ciw-blocker-code={b.code}
          data-ciw-blocker-recoverable={b.recoverable ? 'true' : 'false'}
        >
          <div className="ci-ab-row__title">
            <strong>{b.title}</strong>
            <span className="ci-ab-row__count">{b.count} 个概念</span>
          </div>
          <div className="ci-ab-row__meta">
            <span className="ci-ab-row__category">{CATEGORY_LABEL[b.category] ?? b.category}</span>
            <code className="ci-ab-row__code">{b.code}</code>
            {b.recoverable ? <span className="ci-ab-row__recoverable">可恢复</span> : <span className="ci-ab-row__recoverable ci-ab-row__recoverable--no">暂无可恢复路径</span>}
          </div>
        </li>)}
      </ul>
    </div>

    <div className="panel ci-ab-actions" data-ciw-actions="view-details,recreate,remove">
      <h3>恢复路径</h3>
      <p>请选择你希望执行的下一步。本阶段没有"返回事实确认"这条路径，因为系统尚未支持事实修订能力。</p>
      <div className="ci-ab-actions__buttons">
        <Button variant="secondary" size="md" onClick={onOpenAdvanced}>查看详细原因</Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => { window.location.reload(); }}
        >重新创建任务</Button>
        <Button variant="danger" size="md" onClick={onRemove}>删除此任务</Button>
      </div>
    </div>
  </section>;
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
