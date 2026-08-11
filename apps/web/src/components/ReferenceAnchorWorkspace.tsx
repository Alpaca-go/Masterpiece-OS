import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useEffect, useMemo, useState } from 'react';
import type {
  AnalysisProgress,
  AssetSummary,
  DocumentContextRun,
  ProjectDocumentContextLink,
  ProjectRecord,
  PublicSettings,
  ReferenceAnchorProgress,
  ReferenceAnchorResult,
  ReferenceAnchorRun,
  ReferenceAnchorStage,
  ReferenceAssetSelection,
  ResolvedProjectContext
} from '@masterpiece/runtime-core/application-contracts.ts';
import { cleanError, formatBytes, formatDurationHuman } from '../utils';
import { VisualAssetUploader } from './VisualAssetUploader';

interface Props {
  settings: PublicSettings;
  selectedApiProfileId: string;
  initialRunId?: string;
  onApiProfileChange(profileId: string): void;
  onBack(): void;
  onOpenSettings(): void;
  onGenerateMasterAnchor(projectId: string, referenceAnchorRunId: string): void;
  onGenerateReferencePreview(projectId: string, referenceAnchorRunId: string): void;
  onContinueCreativeProduction(projectId: string): void;
}

const STAGES: Array<[ReferenceAnchorStage, string]> = [
  ['00-load-current-project', '加载当前项目'],
  ['01-reference-analysis', '参考视觉分析'],
  ['02-style-capsule', '风格胶囊'],
  ['03-anchor-brief', 'Anchor Brief'],
  ['04-anchor-decision', '人工决策']
];

const STAGE_INDEX: Record<ReferenceAnchorStage, number> = {
  '00-load-current-project': 0,
  '01-reference-analysis': 1,
  '02-style-capsule': 2,
  '03-anchor-brief': 3,
  '04-anchor-decision': 4
};

const STATUS_LABELS: Record<ReferenceAnchorRun['status'], string> = {
  pending: '等待中',
  preparing: '准备中',
  analyzing_reference: '参考分析中',
  compiling_capsule: '胶囊编译中',
  compiling_brief: 'Brief 编译中',
  awaiting_decision: '待人工决策',
  completed: '已通过',
  rejected: '已拒绝',
  failed: '失败',
  cancelled: '已取消'
};

const DECISION_LABELS: Record<ReferenceAnchorRun['decision'], string> = {
  pending: '待决策',
  approved: '已通过',
  retry: '重试中',
  rejected: '已拒绝'
};

const EXECUTING_STATUSES = new Set<ReferenceAnchorRun['status']>(['pending', 'preparing', 'analyzing_reference', 'compiling_capsule', 'compiling_brief']);

const MIN_ASSETS = 4;
const MAX_ASSETS = 8;

function splitLines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function ReferenceAnchorWorkspace({ settings, selectedApiProfileId, initialRunId, onApiProfileChange, onBack, onOpenSettings, onGenerateMasterAnchor, onGenerateReferencePreview, onContinueCreativeProduction }: Props) {
  const profiles = settings.profiles.filter((profile) => profile.isEnabled);
  const initialProfile = profiles.find((profile) => profile.isDefault) || profiles[0];
  const profileId = profiles.some((profile) => profile.id === selectedApiProfileId) ? selectedApiProfileId : initialProfile?.id || '';

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [documentRuns, setDocumentRuns] = useState<DocumentContextRun[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectSourceMode, setProjectSourceMode] = useState<'existing' | 'upload'>('existing');
  const [uploadProject, setUploadProject] = useState<ProjectRecord | null>(null);
  const [uploadSummary, setUploadSummary] = useState<AssetSummary | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedDocumentRunId, setSelectedDocumentRunId] = useState('');
  const [selection, setSelection] = useState<ReferenceAssetSelection | null>(null);
  const [preference, setPreference] = useState('');
  const [avoidanceText, setAvoidanceText] = useState('');
  const [runs, setRuns] = useState<ReferenceAnchorRun[]>([]);
  const [progress, setProgress] = useState<ReferenceAnchorProgress | null>(null);
  const [activeRunId, setActiveRunId] = useState('');
  const [view, setView] = useState<'workspace' | 'result'>('workspace');
  const [selectedRun, setSelectedRun] = useState<ReferenceAnchorRun | null>(null);
  const [capsuleMarkdown, setCapsuleMarkdown] = useState('');
  const [briefMarkdown, setBriefMarkdown] = useState('');
  const [capsuleHtml, setCapsuleHtml] = useState('');
  const [briefHtml, setBriefHtml] = useState('');
  const [resultTab, setResultTab] = useState<'brief' | 'capsule'>('brief');
  const [retryMode, setRetryMode] = useState<'none' | 'edit-brief' | 'preference'>('none');
  const [editedBrief, setEditedBrief] = useState('');
  const [retryPreference, setRetryPreference] = useState('');
  const [retryAvoidance, setRetryAvoidance] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sourceInfo, setSourceInfo] = useState<{
    visual: { status: string; schemaVersion?: string | null };
    link: ProjectDocumentContextLink | null;
    resolved: ResolvedProjectContext | null;
  } | null>(null);
  const activeStageIndex = progress ? STAGE_INDEX[progress.stage] : -1;

  const readyProjects = useMemo(() => projects.filter((project) => project.status === 'completed'), [projects]);
  const readyDocumentRuns = useMemo(() => documentRuns.filter((run) => run.status === 'completed'), [documentRuns]);
  const selectedProject = readyProjects.find((project) => project.id === selectedProjectId);
  const assetCount = selection?.items.length || 0;

  async function refreshRuns() {
    const next = await window.masterpiece.referenceAnchor.listRuns();
    setRuns(next);
    if (selectedRun) setSelectedRun(next.find((run) => run.id === selectedRun.id) || selectedRun);
    return next;
  }

  useEffect(() => {
    void Promise.all([
      window.masterpiece.projects.list().then(setProjects),
      window.masterpiece.documentContext.listRuns().then(setDocumentRuns),
      refreshRuns()
    ]).catch((reason) => setError(cleanError(reason)));
    return window.masterpiece.referenceAnchor.onProgress((event) => {
      setActiveRunId(event.runId);
      setProgress(event);
    });
  }, []);

  // 上传新项目时订阅视觉分析进度（仅展示当前上传项目的进度）。
  useEffect(() => {
    if (!uploadProject) return;
    return window.masterpiece.analysis.onProgress((event) => {
      if (event.projectId === uploadProject.id) setAnalysisProgress(event);
    });
  }, [uploadProject]);

  useEffect(() => {
    void Promise.resolve(marked.parse(capsuleMarkdown)).then((value) => setCapsuleHtml(DOMPurify.sanitize(value)));
  }, [capsuleMarkdown]);

  useEffect(() => {
    void Promise.resolve(marked.parse(briefMarkdown)).then((value) => setBriefHtml(DOMPurify.sanitize(value)));
  }, [briefMarkdown]);

  useEffect(() => {
    if (!initialRunId) return;
    void (async () => {
      const next = await refreshRuns();
      const run = next.find((item) => item.id === initialRunId);
      if (run) await openRun(run);
    })().catch((reason) => setError(cleanError(reason)));
  }, [initialRunId]);

  // §7.3 当前读取来源横幅：视觉上下文 + 文档关联 + 合并状态 + Locked Assets。
  useEffect(() => {
    if (!selectedProjectId) { setSourceInfo(null); return; }
    void Promise.all([
      window.masterpiece.contextIntegration.getVisualStatus(selectedProjectId),
      window.masterpiece.contextIntegration.getLink(selectedProjectId),
      window.masterpiece.contextIntegration.getResolved(selectedProjectId)
    ]).then(([visual, link, resolved]) => setSourceInfo({ visual, link, resolved })).catch(() => setSourceInfo(null));
  }, [selectedProjectId]);

  async function addAssets(paths: string[]) {
    if (!paths.length) return;
    setError('');
    setBusy(true);
    try {
      const merged = [...new Set([...(selection?.items.map((item) => item.sourcePath) || []), ...paths])];
      const next = await window.masterpiece.referenceAnchor.inspectAssets(merged);
      setSelection(next);
      if (next.skipped.length) setNotice(`已忽略 ${next.skipped.length} 个不支持的文件${next.duplicateCount ? `，去重 ${next.duplicateCount} 个` : ''}。`);
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  function removeAsset(sourcePath: string) {
    setSelection((current) => current ? { ...current, items: current.items.filter((item) => item.sourcePath !== sourcePath) } : current);
  }

  // ── 上传新项目（拖入图片 → 建项目 → 视觉分析 → 设为当前项目）──
  async function addProjectAssets(paths: string[]) {
    const unique = [...new Set(paths.filter(Boolean))];
    if (!unique.length) return;
    if (!profileId) { setError('请先在下方选择分析模型（API Profile）。'); return; }
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (uploadProject) {
        const imported = await window.masterpiece.projects.importFiles(uploadProject.id, unique, 'assets');
        setUploadProject(await window.masterpiece.projects.get(uploadProject.id));
        setUploadSummary(imported.summary);
        if (imported.skipped.length) setNotice(`已忽略 ${imported.skipped.length} 个不支持或重复的文件。`);
      } else {
        const created = await window.masterpiece.projects.create({ sourcePaths: unique, apiProfileId: profileId });
        setUploadProject(created);
        setUploadSummary(await window.masterpiece.projects.scanAssets(created.id));
      }
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function removeUploadAsset(assetId: string) {
    if (!uploadProject) return;
    setBusy(true);
    try { setUploadSummary(await window.masterpiece.projects.removeAsset(uploadProject.id, assetId)); }
    catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }

  async function clearUploadAssets() {
    if (!uploadProject || !window.confirm('确定清空全部素材吗？')) return;
    setBusy(true);
    try { setUploadSummary(await window.masterpiece.projects.clearAssets(uploadProject.id)); }
    catch (reason) { setError(cleanError(reason)); }
    finally { setBusy(false); }
  }

  async function discardUploadProject() {
    if (uploadProject && !window.confirm(`放弃并删除刚上传的项目「${uploadProject.projectName}」吗？`)) return;
    const target = uploadProject;
    setUploadProject(null);
    setUploadSummary(null);
    setAnalysisProgress(null);
    if (target) await window.masterpiece.projects.remove(target.id).catch(() => {});
  }

  async function analyzeAndSelect() {
    if (!uploadProject || !uploadSummary?.totalFiles || !profileId) return;
    setAnalyzing(true);
    setError('');
    setNotice('');
    setAnalysisProgress(null);
    try {
      const result = await window.masterpiece.analysis.start(uploadProject.id, false, profileId);
      const finished = result.project;
      setProjects(await window.masterpiece.projects.list());
      setSelectedProjectId(finished.id);
      setProjectSourceMode('existing');
      setUploadProject(null);
      setUploadSummary(null);
      setAnalysisProgress(null);
      setNotice(`「${finished.projectName}」视觉分析已完成，已设为当前项目，现在可以上传参考图开始锚定。`);
    } catch (reason) {
      setError(cleanError(reason));
      const refreshed = await window.masterpiece.projects.get(uploadProject.id).catch(() => null);
      if (refreshed) setUploadProject(refreshed);
    } finally {
      setAnalyzing(false);
    }
  }

  function applyResult(result: ReferenceAnchorResult) {
    setSelectedRun(result.run);
    setCapsuleMarkdown(result.capsuleMarkdown);
    setBriefMarkdown(result.briefMarkdown);
    setEditedBrief(result.briefMarkdown);
    setRetryPreference(result.capsule.userPreference || '');
    setRetryAvoidance(result.capsule.userAvoidance.join('\n'));
    setRetryMode('none');
    setDecisionNote('');
    setResultTab('brief');
    setView('result');
  }

  async function openRun(run: ReferenceAnchorRun) {
    if (EXECUTING_STATUSES.has(run.status) || run.status === 'failed' || run.status === 'cancelled') return;
    setError('');
    setNotice('');
    try {
      const [capsule, capsuleMd, brief] = await Promise.all([
        window.masterpiece.referenceAnchor.getCapsule(run.id),
        window.masterpiece.referenceAnchor.getCapsuleMarkdown(run.id),
        window.masterpiece.referenceAnchor.getBrief(run.id)
      ]);
      applyResult({ run, capsule, capsuleMarkdown: capsuleMd, briefMarkdown: brief });
    } catch (reason) {
      setError(cleanError(reason));
    }
  }

  async function start() {
    if (!selectedProjectId || !selection?.items.length || !profileId) return;
    setBusy(true);
    setError('');
    setNotice('');
    setProgress(null);
    try {
      const result = await window.masterpiece.referenceAnchor.start({
        currentProjectId: selectedProjectId,
        referenceAssetPaths: selection.items.map((item) => item.sourcePath),
        apiProfileId: profileId,
        documentRunId: selectedDocumentRunId || undefined,
        preference: preference.trim() || undefined,
        avoidance: splitLines(avoidanceText)
      });
      await refreshRuns();
      setNotice('参考风格胶囊与 Anchor Brief 已生成，请在下方确认或重试。');
      applyResult(result);
    } catch (reason) {
      setError(cleanError(reason));
      await refreshRuns().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function submitDecision(decision: 'approved' | 'rejected') {
    if (!selectedRun) return;
    setBusy(true);
    setError('');
    try {
      const run = await window.masterpiece.referenceAnchor.setDecision(selectedRun.id, decision, decisionNote.trim() || undefined);
      setSelectedRun(run);
      setNotice(decision === 'approved' ? 'Anchor 已通过，本次参考锚定任务完成。' : '已拒绝本次 Anchor，可更换参考图或调整偏好后重新发起。');
      await refreshRuns().catch(() => {});
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function retryRecompileBrief() {
    if (!selectedRun) return;
    setBusy(true);
    setError('');
    try {
      await window.masterpiece.referenceAnchor.setDecision(selectedRun.id, 'retry', decisionNote.trim() || undefined);
      const result = await window.masterpiece.referenceAnchor.retryBrief(selectedRun.id);
      setNotice('已仅重新编译 Anchor Brief（零模型调用，复用本地缓存）。');
      applyResult(result);
      await refreshRuns().catch(() => {});
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function retrySaveEditedBrief() {
    if (!selectedRun || !editedBrief.trim()) return;
    setBusy(true);
    setError('');
    try {
      await window.masterpiece.referenceAnchor.setDecision(selectedRun.id, 'retry', '手动编辑 Brief');
      const result = await window.masterpiece.referenceAnchor.retryBrief(selectedRun.id, editedBrief);
      setNotice('已采用编辑后的 Anchor Brief（已通过校验）。');
      applyResult(result);
      await refreshRuns().catch(() => {});
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function retryUpdatePreference() {
    if (!selectedRun) return;
    setBusy(true);
    setError('');
    try {
      await window.masterpiece.referenceAnchor.setDecision(selectedRun.id, 'retry', '调整继承 / 规避偏好');
      const result = await window.masterpiece.referenceAnchor.updatePreference(selectedRun.id, retryPreference.trim(), splitLines(retryAvoidance));
      setNotice('已按新偏好重新编译风格胶囊与 Anchor Brief（零模型调用）。');
      applyResult(result);
      await refreshRuns().catch(() => {});
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function removeRun(run: ReferenceAnchorRun) {
    if (EXECUTING_STATUSES.has(run.status)) return;
    if (!window.confirm(`确定删除参考锚定任务“${run.projectName}”吗？\n\n此操作会永久删除该任务的参考图副本、胶囊、Brief 和运行记录，且无法撤销。`)) return;
    setError('');
    try {
      await window.masterpiece.referenceAnchor.remove(run.id);
      setRuns((current) => current.filter((item) => item.id !== run.id));
      if (selectedRun?.id === run.id) {
        setSelectedRun(null);
        setView('workspace');
      }
    } catch (reason) {
      setError(cleanError(reason));
    }
  }

  async function exportBrief() {
    if (!selectedRun) return;
    try {
      const destination = await window.masterpiece.referenceAnchor.export(selectedRun.id);
      if (destination) setNotice(`已导出：${destination}`);
    } catch (reason) { setError(cleanError(reason)); }
  }

  async function quickExtractStyle() {
    if (!selectedRun) return;
    setBusy(true);
    setError('');
    try {
      await window.masterpiece.creativeProduction.quickExtractStyle(
        selectedRun.projectId,
        selectedRun.id,
      );
      setNotice('风格已提取为标准 Style Profile，并进入同一套 Anchor / Canon / Series 流程。');
      onContinueCreativeProduction(selectedRun.projectId);
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  // ── 结果 / 决策页 ──
  if (view === 'result' && selectedRun) {
    const decided = selectedRun.decision === 'approved' || selectedRun.decision === 'rejected';
    return <div className="page report-page visual-translation-report reference-anchor-result-page">
      <header className="page-header">
        <div><p className="eyebrow">REFERENCE ANCHOR</p><h1>{selectedRun.projectName}</h1><p>{selectedRun.referenceAssetCount} 张参考图 · {STATUS_LABELS[selectedRun.status]} · 决策：{DECISION_LABELS[selectedRun.decision]}</p></div>
        <button className="button ghost" onClick={() => { setView('workspace'); setRetryMode('none'); void refreshRuns().catch(() => {}); }}>返回工作台</button>
      </header>
      <div className="result-summary">
        <div><small>模型</small><strong>{selectedRun.model}</strong></div>
        <div><small>模型调用</small><strong>{selectedRun.modelCallCount ?? 0} 次</strong></div>
        <div><small>重试</small><strong>{selectedRun.retryCount ?? 0} 次</strong></div>
        <div><small>非阻断警告</small><strong>{selectedRun.warnings?.length ?? 0} 条</strong></div>
      </div>
      <div className="result-actions">
        <button className="button primary" onClick={() => void exportBrief()}>导出 Brief</button>
        <button className="button secondary" onClick={() => void navigator.clipboard.writeText(resultTab === 'brief' ? briefMarkdown : capsuleMarkdown).then(() => setNotice('内容已复制。'))}>复制内容</button>
        <button className="button secondary" onClick={() => void window.masterpiece.referenceAnchor.openFolder(selectedRun.id)}>打开输出文件夹</button>
        {selectedRun.status !== 'rejected' && selectedRun.status !== 'failed' && selectedRun.status !== 'cancelled' && <button className="button secondary" onClick={() => onGenerateReferencePreview(selectedRun.projectId, selectedRun.id)}>试生成参考效果</button>}
        {selectedRun.decision === 'approved' && <button className="button secondary" disabled={busy} onClick={() => void quickExtractStyle()}>快速提取到生产系统</button>}
        {selectedRun.decision === 'approved' && <button className="button primary" onClick={() => onGenerateMasterAnchor(selectedRun.projectId, selectedRun.id)}>生成 Master Anchor Image</button>}
      </div>
      {notice && <div className="notice ok">{notice}</div>}
      {error && <div className="notice error">{error}</div>}
      {selectedRun.warnings?.length ? <div className="notice warn">{selectedRun.warnings.map((warning) => <p key={warning.code}>{warning.message}</p>)}</div> : null}

      <div className="analysis-mode-tabs reference-anchor-result-tabs" role="tablist" aria-label="结果内容">
        <button role="tab" aria-selected={resultTab === 'brief'} className={resultTab === 'brief' ? 'active' : ''} onClick={() => setResultTab('brief')}><span>Anchor Generation Brief</span><small>交给图像生成的唯一正式输入</small></button>
        <button role="tab" aria-selected={resultTab === 'capsule'} className={resultTab === 'capsule' ? 'active' : ''} onClick={() => setResultTab('capsule')}><span>参考风格胶囊</span><small>可继承规则 / 禁止清单 / 不确定项</small></button>
      </div>
      <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: resultTab === 'brief' ? briefHtml : capsuleHtml }} />

      {!decided && <footer className="context-confirm-footer panel reference-anchor-decision">
        <div>
          <strong>Anchor 人工决策</strong>
          <p>通过后进入图像生成；重试仅在本地重新编译（不重跑当前项目视觉分析）；更换参考图请返回工作台新建任务。</p>
          <input value={decisionNote} placeholder="决策备注（可选）" onChange={(event) => setDecisionNote(event.target.value)} />
        </div>
        <div className="button-row">
          <button className="button primary" disabled={busy} onClick={() => void submitDecision('approved')}>通过 Anchor</button>
          <button className="button secondary" disabled={busy} onClick={() => setRetryMode(retryMode === 'none' ? 'edit-brief' : 'none')}>{retryMode === 'none' ? '重试…' : '收起重试'}</button>
          <button className="button danger" disabled={busy} onClick={() => void submitDecision('rejected')}>拒绝</button>
        </div>
      </footer>}

      {!decided && retryMode !== 'none' && <section className="panel reference-anchor-retry-panel">
        <div className="analysis-mode-tabs" role="tablist" aria-label="重试方式">
          <button role="tab" aria-selected={retryMode === 'edit-brief'} className={retryMode === 'edit-brief' ? 'active' : ''} onClick={() => setRetryMode('edit-brief')}><span>编辑 / 重编 Brief</span><small>只重新编译 Brief，风格胶囊不变</small></button>
          <button role="tab" aria-selected={retryMode === 'preference'} className={retryMode === 'preference' ? 'active' : ''} onClick={() => setRetryMode('preference')}><span>调整继承偏好</span><small>重新编译胶囊 + Brief（零模型调用）</small></button>
        </div>
        {retryMode === 'edit-brief' && <div className="reference-anchor-retry-body">
          <textarea rows={14} value={editedBrief} onChange={(event) => setEditedBrief(event.target.value)} />
          <div className="button-row">
            <button className="button primary" disabled={busy || !editedBrief.trim()} onClick={() => void retrySaveEditedBrief()}>采用编辑后的 Brief</button>
            <button className="button secondary" disabled={busy} onClick={() => void retryRecompileBrief()}>放弃编辑，按胶囊重新编译</button>
          </div>
        </div>}
        {retryMode === 'preference' && <div className="reference-anchor-retry-body">
          <label>希望继承的内容<textarea rows={3} value={retryPreference} placeholder="例如：继承它的留白节奏和低饱和用色" onChange={(event) => setRetryPreference(event.target.value)} /></label>
          <label>明确不要继承的内容（每行一条）<textarea rows={3} value={retryAvoidance} placeholder={'例如：\n不要它的插画风格\n不要复刻它的版式骨架'} onChange={(event) => setRetryAvoidance(event.target.value)} /></label>
          <div className="button-row"><button className="button primary" disabled={busy} onClick={() => void retryUpdatePreference()}>按新偏好重新编译</button></div>
        </div>}
      </section>}
    </div>;
  }

  // ── 工作台（默认视图）──
  return <div className="page visual-translation-page reference-anchor-page">
    <header className="page-header">
      <div><p className="eyebrow">REFERENCE → ANCHOR</p><h1>参考锚定（Anchor）</h1><p>选择当前项目，上传 4–8 张参考图，提炼可继承的风格规则并生成 Anchor Generation Brief，由你确认后交给图像生成。</p></div>
      <div className="button-row"><button className="button ghost" onClick={onOpenSettings}>API 设置</button><button className="button ghost" onClick={onBack}>返回首页</button></div>
    </header>

    {error && <div className="notice error">{error}</div>}
    {notice && <div className="notice ok">{notice}</div>}

    <div className="visual-translation-grid">
      <section className="panel visual-translation-form">
        <div className="section-heading"><span>01</span><div><h2>当前项目</h2><p>必须已完成视觉分析（读取项目视觉上下文与 Locked Assets）</p></div></div>
        <div className="analysis-mode-tabs anchor-project-source-tabs" role="tablist" aria-label="当前项目来源">
          <button role="tab" aria-selected={projectSourceMode === 'existing'} className={projectSourceMode === 'existing' ? 'active' : ''} disabled={analyzing} onClick={() => setProjectSourceMode('existing')}><span>选择已有项目</span><small>已完成视觉分析</small></button>
          <button role="tab" aria-selected={projectSourceMode === 'upload'} className={projectSourceMode === 'upload' ? 'active' : ''} disabled={analyzing} onClick={() => setProjectSourceMode('upload')}><span>上传新项目</span><small>拖入图片，自动分析</small></button>
        </div>

        {projectSourceMode === 'existing' && <>
          <label>当前项目<select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
            <option value="">请选择已完成视觉分析的项目</option>
            {readyProjects.map((project) => <option key={project.id} value={project.id}>{project.projectName} · {project.brandName}</option>)}
          </select></label>
          {!readyProjects.length && <div className="notice warn">还没有已完成视觉分析的项目。可切到「上传新项目」直接拖入图片，或先在「视觉分析」中完成一次分析。</div>}
          {selectedProject && <div className="facts-box"><small>身份锁定</small><p>品牌：{selectedProject.brandName} · 行业：{selectedProject.industry}</p><p>参考图仅用于提炼风格规则；参考品牌的名称 / Logo / Slogan / 标志性图形不会进入生成。</p></div>}
          {selectedProject && sourceInfo && (
            <div className="source-banner">
              <small>当前读取来源（§7.3）</small>
              <ul>
                <li><span>当前项目</span><strong>{selectedProject.projectName}</strong></li>
                <li><span>视觉上下文</span><strong>{sourceInfo.visual.status === 'ready' ? `v${sourceInfo.visual.schemaVersion ?? ''}` : '未生成'}</strong></li>
                <li><span>文档上下文</span><strong>{sourceInfo.link ? '已关联' : '未关联'}</strong></li>
                <li><span>合并状态</span><strong>{!sourceInfo.link ? '仅视觉上下文' : sourceInfo.resolved ? (sourceInfo.resolved.conflicts.some((conflict) => conflict.resolution === 'unresolved') ? '有冲突' : '可用') : '未生成'}</strong></li>
                <li><span>Locked Assets</span><strong>{sourceInfo.resolved ? sourceInfo.resolved.lockedAssets.logoAssetIds.length + sourceInfo.resolved.lockedAssets.lockedFacts.length : 0} 项</strong></li>
              </ul>
            </div>
          )}
        </>}

        {projectSourceMode === 'upload' && <div className="anchor-project-upload">
          <VisualAssetUploader
            role="current_project"
            busy={busy}
            items={(uploadSummary?.items || []).map((item) => ({
              id: item.id,
              name: item.name,
              extension: item.extension,
              bytes: item.bytes,
              thumbnailDataUrl: item.thumbnailDataUrl
            }))}
            onAddPaths={addProjectAssets}
            onChooseFiles={() => window.masterpiece.projects.chooseFiles('assets')}
            onChooseFolder={() => window.masterpiece.projects.chooseFolder()}
            onRemove={removeUploadAsset}
            onClear={clearUploadAssets}
          />
          {uploadProject && uploadSummary && <div className="facts-box">
            <small>已识别项目（深度分析后会优先使用视觉内容中的真实名称）</small>
            <p>{uploadProject.detectedProjectName || uploadProject.projectName} · {uploadSummary.totalFiles} 个素材（图片 {uploadSummary.imageCount} · PDF {uploadSummary.pdfCount}）</p>
            <p>品牌线索：{uploadProject.detectedBrandName}（{Math.round(uploadProject.factConfidence.brandName * 100)}%） · 行业线索：{uploadProject.detectedIndustry}（{Math.round(uploadProject.factConfidence.industry * 100)}%）</p>
          </div>}
          {analyzing && <div className="notice">视觉分析中：{analysisProgress?.message || '正在准备素材…'}{analysisProgress?.model ? ` · ${analysisProgress.model}` : ''}</div>}
          <div className="button-row">
            <button className="button primary" disabled={busy || analyzing || !uploadSummary?.totalFiles || !profiles.find((profile) => profile.id === profileId)?.hasApiKey} onClick={() => void analyzeAndSelect()}>{analyzing ? '视觉分析中…' : '开始视觉分析并设为当前项目'}</button>
            {analyzing && uploadProject && <button className="button danger" onClick={() => void window.masterpiece.analysis.cancel(uploadProject.id)}>取消分析</button>}
            {!analyzing && uploadProject && <button className="button ghost" disabled={busy} onClick={() => void discardUploadProject()}>放弃</button>}
          </div>
          {!profiles.some((profile) => profile.hasApiKey) && <div className="notice error">尚未配置可用的 API Profile，请先前往 API 设置。</div>}
        </div>}
        <label>文档上下文（可选）<select value={selectedDocumentRunId} onChange={(event) => setSelectedDocumentRunId(event.target.value)}>
          <option value="">不加载文档上下文</option>
          {readyDocumentRuns.map((run) => <option key={run.id} value={run.id}>{run.projectName} · {new Date(run.createdAt).toLocaleDateString('zh-CN')}</option>)}
        </select></label>
        <label>分析模型<select value={profileId} onChange={(event) => onApiProfileChange(event.target.value)}><option value="">请选择 API Profile</option>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.displayName} / {profile.modelId}</option>)}</select></label>

        <div className="section-heading"><span>02</span><div><h2>参考图（{assetCount} / {MIN_ASSETS}–{MAX_ASSETS}）</h2><p>建议同一风格体系的 4–8 张参考图，超过 {MAX_ASSETS} 张将截取前 {MAX_ASSETS} 张</p></div></div>
        <div className={`drop-zone translation-drop-zone ${busy ? 'busy' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
          event.preventDefault();
          void addAssets(Array.from(event.dataTransfer.files).map((file) => window.masterpiece.files.getPathForFile(file)));
        }}>
          <div className="upload-orbit">↥</div>
          <strong>{busy ? '正在读取参考图…' : '将参考图拖到这里'}</strong>
          <p>支持 JPG、JPEG、PNG 和 WEBP</p>
          <button className="button secondary" type="button" disabled={busy} onClick={() => void window.masterpiece.referenceAnchor.chooseReferenceAssets().then(addAssets)}>选择参考图</button>
        </div>
        {selection?.items.length ? <div className="asset-grid reference-anchor-asset-grid">{selection.items.map((item) => <div className="asset-card removable" key={item.sourcePath}>
          <button className="asset-remove" title={`移除 ${item.name}`} aria-label={`移除 ${item.name}`} onClick={() => removeAsset(item.sourcePath)}>×</button>
          {item.thumbnailDataUrl ? <img src={item.thumbnailDataUrl} alt="" /> : <div className="file-placeholder image">{item.extension.replace('.', '').toUpperCase()}</div>}
          <strong title={item.sourcePath}>{item.name}</strong><small>{formatBytes(item.sizeBytes)}</small>
        </div>)}</div> : null}
        {assetCount > 0 && assetCount < MIN_ASSETS && <div className="notice warn">参考图少于 {MIN_ASSETS} 张：仍可运行，但风格证据不足，规则置信度会降低。</div>}

        <div className="section-heading"><span>03</span><div><h2>继承偏好（可选）</h2><p>告诉系统你想要什么、不要什么</p></div></div>
        <label>希望继承的内容<textarea rows={2} value={preference} placeholder="例如：继承它的留白节奏和低饱和用色" onChange={(event) => setPreference(event.target.value)} /></label>
        <label>明确不要继承的内容（每行一条）<textarea rows={2} value={avoidanceText} placeholder={'例如：\n不要它的插画风格'} onChange={(event) => setAvoidanceText(event.target.value)} /></label>
        {!profiles.some((profile) => profile.hasApiKey) && <div className="notice error">尚未配置可用的 API Profile，请先前往 API 设置。</div>}
        <button className="button primary full" disabled={busy || !selectedProjectId || !assetCount || !profiles.find((profile) => profile.id === profileId)?.hasApiKey} onClick={() => void start()}>{busy ? '锚定运行中…' : '开始参考锚定'}</button>
      </section>

      <aside className="panel visual-translation-history">
        <div className="section-heading"><span>04</span><div><h2>锚定记录</h2><p>待决策任务可直接进入决策页；重试仅本地重编译，不重复调用模型</p></div></div>
        {runs.length ? <div className="visual-run-list">{runs.map((run) => <div key={run.id} className={`visual-run-card ${run.status}`}>
          <div><strong>{run.projectName}</strong><span>{STATUS_LABELS[run.status]}</span></div>
          <small>{run.referenceAssetCount} 张参考图 · {run.model}</small>
          <small>{new Date(run.createdAt).toLocaleString('zh-CN')}{run.durationMs ? ` · ${formatDurationHuman(run.durationMs)}` : ''}</small>
          {run.lastError && <em>{run.lastError}</em>}
          <div className="button-row">
            {(run.status === 'awaiting_decision' || run.status === 'completed' || run.status === 'rejected') && <button className="button secondary" onClick={() => void openRun(run)}>{run.status === 'awaiting_decision' ? '进入决策' : '查看结果'}</button>}
            {EXECUTING_STATUSES.has(run.status) && <button className="button danger" onClick={() => void window.masterpiece.referenceAnchor.cancel(run.id)}>取消</button>}
            {!EXECUTING_STATUSES.has(run.status) && <button className="button ghost" onClick={() => void removeRun(run)}>删除</button>}
          </div>
        </div>)}</div> : <div className="visual-document-empty">还没有参考锚定任务。</div>}

      </aside>
    </div>

    {(busy || progress) && <section className="panel visual-progress-panel">
      <div><p className="eyebrow">锚定进度</p><h2>{progress?.message || '正在创建任务'}</h2><p>{progress?.model || profiles.find((profile) => profile.id === profileId)?.modelId}</p></div>
      <div className="visual-stage-strip">{STAGES.map(([stage, label], index) => <div key={stage} className={index < activeStageIndex ? 'done' : index === activeStageIndex ? 'active' : ''}><span>{index < activeStageIndex ? '✓' : String(index + 1).padStart(2, '0')}</span><strong>{label}</strong></div>)}</div>
      {busy && activeRunId && <button className="button danger" onClick={() => void window.masterpiece.referenceAnchor.cancel(activeRunId)}>取消锚定</button>}
    </section>}
  </div>;
}
