import { useEffect, useMemo, useState } from 'react';
import type {
  AnalysisProgress,
  AssetSummary,
  DocumentContextRun,
  GenerationContextReadiness,
  ImageGenerationSourceBundle,
  ImageGenerationRunSummary,
  ProjectRecord,
  PublicSettings,
  ReferenceAnchorRun
} from '@masterpiece/runtime-core/application-contracts.ts';
import { AnalysisModeTabs, type AnalysisMode } from './components/AnalysisModeTabs';
import { AnalysisView } from './components/AnalysisView';
import { ProjectWizard } from './components/ProjectWizard';
import { ReportView } from './components/ReportView';
import { SettingsPanel } from './components/SettingsPanel';
import { ReferenceAnchorWorkspace } from './components/ReferenceAnchorWorkspace';
import { DocumentContextWorkspace } from './components/DocumentContextWorkspace';
import { ImageGenerationWorkspace } from './components/ImageGenerationWorkspace';
import { ShortChainGenerationWorkspace } from './components/ShortChainGenerationWorkspace';
import { ShortChainPage } from './pages/ShortChainPage';
import { ContextIntegrationPanel } from './components/ContextIntegrationPanel';
import { CreativeIntelligenceWorkspace } from './components/CreativeIntelligenceWorkspace';
import { PackagingWorkspace } from './features/packaging/PackagingWorkspace';
import { StatusBadgeInline } from './components/StatusBadgeInline';
import { ProjectDetail } from './components/ProjectDetail';
import { Button } from './components/ui/Button';
import { AppShell } from './components/layout/AppShell';
import { TopBar, TopBarBrand, TopBarBreadcrumb, TopBarActions, TopBarSegment } from './components/layout/TopBar';
import { CommandPalette, useCommandPalette } from './components/layout/CommandPalette';
import { ToastViewport, useToasts } from './components/layout/Toast';
import { cleanError, formatBytes, formatDuration, formatRelativeTime } from './utils';
import { useUrlScreen, type Screen } from './lib/useUrlScreen';

function StatusBadge({ status }: { status: ProjectRecord['status'] }) {
  const labels: Record<ProjectRecord['status'], string> = { draft: '待导入', ready: '可分析', running: '分析中', completed: '已完成', failed: '失败', cancelled: '已取消' };
  return <span className={`badge ${status}`}>{labels[status]}</span>;
}

const DOCUMENT_CONTEXT_EXECUTING = new Set<DocumentContextRun['status']>(['pending', 'parsing', 'extracting', 'repairing']);

function DocumentContextStatusBadge({ status }: { status: DocumentContextRun['status'] }) {
  const labels: Record<DocumentContextRun['status'], string> = {
    pending: '等待中',
    parsing: '解析中',
    extracting: '提取中',
    repairing: '修复中',
    awaiting_confirmation: '待确认',
    compiling: '待编译',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  };
  const tone = DOCUMENT_CONTEXT_EXECUTING.has(status) ? 'running'
    : status === 'awaiting_confirmation' || status === 'compiling' ? 'ready'
    : status;
  return <span className={`badge ${tone}`}>{labels[status]}</span>;
}

const REFERENCE_ANCHOR_EXECUTING = new Set<ReferenceAnchorRun['status']>(['pending', 'preparing', 'analyzing_reference', 'compiling_capsule', 'compiling_brief']);

function ReferenceAnchorStatusBadge({ status }: { status: ReferenceAnchorRun['status'] }) {
  const labels: Record<ReferenceAnchorRun['status'], string> = {
    pending: '等待中',
    preparing: '准备中',
    analyzing_reference: '参考分析中',
    compiling_capsule: '胶囊编译中',
    compiling_brief: 'Brief 编译中',
    awaiting_decision: '待决策',
    completed: '已通过',
    rejected: '已拒绝',
    failed: '失败',
    cancelled: '已取消'
  };
  const tone = REFERENCE_ANCHOR_EXECUTING.has(status) ? 'running'
    : status === 'awaiting_decision' ? 'ready'
    : status === 'rejected' ? 'failed'
    : status;
  return <span className={`badge ${tone}`}>{labels[status]}</span>;
}

export function App() {
  // Phase 5.8: screen state now derives from URL pathname via HashRouter.
  // setScreen(...) is a thin wrapper over navigate(); the 46 call sites
  // in this file are unchanged in shape.
  const [screen, setScreen, navigateToPath] = useUrlScreen();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [documentContextRuns, setDocumentContextRuns] = useState<DocumentContextRun[]>([]);
  const [referenceAnchorRuns, setReferenceAnchorRuns] = useState<ReferenceAnchorRun[]>([]);
  const [requestedImageGen, setRequestedImageGen] = useState<ImageGenerationSourceBundle | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('visual-analysis');
  const [requestedDocumentContextRunId, setRequestedDocumentContextRunId] = useState('');
  const [requestedReferenceAnchorRunId, setRequestedReferenceAnchorRunId] = useState('');
  const [selected, setSelected] = useState<ProjectRecord | null>(null);
  const [selectedApiProfileId, setSelectedApiProfileId] = useState('');
  const [settingsReturnScreen, setSettingsReturnScreen] = useState<Screen>('home');
  const [assets, setAssets] = useState<AssetSummary | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState('');
  const [runFailure, setRunFailure] = useState('');
  // r2.0 / r10.4 UX: project-page entry decoupling. When the persisted
  // Project + Visual Context already has the minimum data needed for a
  // Short-Chain Generation lets the project page show a "继续创作 / 直接创作"
  // entry that bypasses the analysis report page. The full LLM report
  // is no longer a hard product gate; the Project Context is.
  const [generationReadiness, setGenerationReadiness] = useState<GenerationContextReadiness | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState('');
  const [deletingDocumentContextRunId, setDeletingDocumentContextRunId] = useState('');
  const [deletingReferenceAnchorRunId, setDeletingReferenceAnchorRunId] = useState('');
  const [loading, setLoading] = useState(true);
  const enabledProfiles = settings?.profiles.filter((profile) => profile.isEnabled) || [];
  const analysisProfiles = enabledProfiles.filter((profile) =>
    profile.modelType === 'analysis' && profile.protocol === 'openai-chat-multimodal');
  const selectedProfile = analysisProfiles.find((profile) => profile.id === selectedApiProfileId)
    || analysisProfiles.find((profile) => profile.isDefault)
    || analysisProfiles[0];
  const batches = useMemo(() => {
    const result = new Map<string, { label: string; count: number }>();
    for (const item of assets?.items || []) {
      const current = result.get(item.batchId);
      const label = item.archiveSourceName || (item.sourceType === 'folder' ? '文件夹批次' : item.name);
      result.set(item.batchId, { label: current?.label || label, count: (current?.count || 0) + 1 });
    }
    return [...result.entries()];
  }, [assets]);

  // ── Architecture layer hooks (Phase 5) ──
  // MUST be called on every render BEFORE any early return below,
  // otherwise React will throw "Rendered more hooks than during the
  // previous render" when the user navigates between screens that
  // take the early return paths and the home path.
  const [cmdOpen, setCmdOpen] = useCommandPalette();
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  // Build the command palette registry from current app state.
  // Zero-logic: just lists existing data + reuses existing setScreen handlers.
  // MUST be called before any early return below (see comment above) — otherwise
  // navigating from a non-home screen back to home changes hook count and trips
  // React's "Rendered more hooks than during the previous render" guard.
  const commandItems = useMemo(() => {
    const items: Array<{ id: string; label: string; hint?: string; section?: string; shortcut?: string; keywords?: string[]; }> = [
      { id: 'nav.home', label: '回到项目首页', hint: 'Home', section: '导航', keywords: ['home', 'project', '项目'], shortcut: 'g h' },
      { id: 'nav.create', label: '新建分析（视觉）', hint: 'Create / Visual', section: '导航', keywords: ['create', 'analysis', '新建', '分析'], shortcut: 'g c' },
      { id: 'nav.settings', label: 'API 与模型设置', hint: 'Settings', section: '导航', keywords: ['settings', '设置', 'api'], shortcut: 'g s' },
      { id: 'nav.packaging', label: '包装生成', hint: 'Packaging', section: '导航', keywords: ['packaging', '包装'] },
    ];
    for (const project of projects.slice(0, 8)) {
      items.push({
        id: `project.${project.id}`,
        label: project.projectName,
        hint: `${project.industry} · ${project.assetCount} 个素材`,
        section: '最近项目',
        keywords: ['project', project.brandName, project.industry, '项目'],
      });
    }
    return items;
  }, [projects]);

  async function refresh() {
    const [nextSettings, nextProjects, nextDocumentContextRuns, nextReferenceAnchorRuns] = await Promise.all([
      window.masterpiece.settings.get(),
      window.masterpiece.projects.list(),
      window.masterpiece.documentContext.listRuns(),
      window.masterpiece.referenceAnchor.listRuns()
    ]);
    setSettings(nextSettings);
    setProjects(nextProjects);
    setDocumentContextRuns(nextDocumentContextRuns);
    setReferenceAnchorRuns(nextReferenceAnchorRuns);
    return {
      settings: nextSettings,
      projects: nextProjects,
      documentContextRuns: nextDocumentContextRuns,
      referenceAnchorRuns: nextReferenceAnchorRuns
    };
  }

  useEffect(() => {
    if (!window.masterpiece) {
      setError('客户端安全桥接加载失败，请重新启动客户端。');
      setLoading(false);
      return;
    }
    let settled = false;
    const startupTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      setError('客户端初始化超时（20 秒）：主进程未响应启动请求。常见原因是默认数据目录位于不可访问的网络/重定向位置（如离线的 OneDrive、企业漫游配置文件），或主进程被阻塞。请确认数据目录可访问，或把数据目录改到本地路径后重试。');
      setLoading(false);
    }, 20000);
    void refresh()
      .then(({ settings: loaded, projects: existing }) => {
        if (settled) return;
        settled = true;
        clearTimeout(startupTimer);
        const initial = loaded.profiles.find((profile) => profile.isDefault && profile.isEnabled
          && profile.modelType === 'analysis' && profile.protocol === 'openai-chat-multimodal')
          || loaded.profiles.find((profile) => profile.isEnabled
            && profile.modelType === 'analysis' && profile.protocol === 'openai-chat-multimodal');
        setSelectedApiProfileId(initial?.id || '');
        if (!loaded.profiles.length && existing.length === 0) setScreen('settings');
      })
      .catch((reason) => {
        if (settled) return;
        settled = true;
        clearTimeout(startupTimer);
        setError(cleanError(reason));
      })
      .finally(() => { if (settled) setLoading(false); });
    return window.masterpiece.analysis.onProgress((event) => setProgress(event));
  }, []);

  // Phase 5.7: surface transient `error` state as a toast once the app
  // is past the splash screen. Splash-time errors (loading === false but
  // settings === null) keep their inline display at the splash return
  // because the user has not yet reached the home view. After that, any
  // setError(...) from event handlers (importMore / removeAsset / delete
  // project / etc.) becomes a toast and clears the inline state.
  useEffect(() => {
    if (error && settings) {
      pushToast({ tone: 'error', title: error, duration: 5000 });
      setError('');
    }
  }, [error, settings, pushToast]);

  async function openProject(project: ProjectRecord) {
    setSelected(project);
    setError('');
    setRunFailure('');
    const profile = analysisProfiles.find((item) => item.id === project.apiProfileId)
      || analysisProfiles.find((item) => item.isDefault)
      || analysisProfiles[0];
    setSelectedApiProfileId(profile?.id || '');
    // Phase 5.8: include the project id in the URL so the page is
    // shareable. setScreen drives the screen segment; the id segment
    // is appended for deep-link round-trips. The `selected` state
    // still owns the canonical record (the id segment is a hint, not
    // a source of truth — refresh() races and a stale id are both OK
    // because openProject always sets `selected` immediately).
    if (project.status === 'completed' && project.lastReportFilename) {
      navigateToPath(`/projects/${project.id}/report`);
    } else {
      navigateToPath(`/projects/${project.id}`);
    }
    try { setAssets(await window.masterpiece.projects.scanAssets(project.id)); }
    catch (reason) { setError(cleanError(reason)); }
    // r2.0 / r10.4 UX: ask the backend whether the persisted Project
    // + Visual Context already has the minimum data needed to enter
    // creative-session. The project page uses this to surface a
    // "继续创作 / 直接创作" entry that bypasses the analysis report
    // page when ready. A transport failure is surfaced instead of silently
    // collapsing back to the misleading "开始分析"-only state.
    setGenerationReadiness(null);
    try {
      const readiness = await window.masterpiece.projectContext.getGenerationReadiness(project.id);
      setGenerationReadiness(readiness);
    } catch (reason) {
      setGenerationReadiness(null);
      setError(`无法读取生成就绪状态：${cleanError(reason)}`);
    }
  }

  async function refreshSelected(projectId: string, nextAssets?: AssetSummary) {
    const summary = nextAssets || await window.masterpiece.projects.scanAssets(projectId);
    const [project, nextProjects] = await Promise.all([
      window.masterpiece.projects.get(projectId),
      window.masterpiece.projects.list()
    ]);
    setSelected(project);
    setProjects(nextProjects);
    setAssets(summary);
    return project;
  }

  async function run(project: ProjectRecord, forceReasoning: boolean, apiProfileId = selectedProfile?.id || '') {
    if (!apiProfileId) {
      setError('请先选择一个已启用的 API Profile。');
      setScreen('project');
      return;
    }
    setSelected(project);
    setSelectedApiProfileId(apiProfileId);
    setError('');
    setRunFailure('');
    setProgress(null);
    setScreen('analysis');
    try {
      const result = await window.masterpiece.analysis.start(project.id, forceReasoning, apiProfileId);
      setSelected(result.project);
      setProjects(await window.masterpiece.projects.list());
      setAssets(await window.masterpiece.projects.scanAssets(project.id));
      setScreen('report');
    } catch (reason) {
      const message = cleanError(reason);
      setRunFailure(message);
      const updated = await refreshSelected(project.id).catch(() => project);
      setSelected(updated);
      setProgress((current) => current?.stage === 'failed' || current?.stage === 'cancelled' ? current : {
        projectId: project.id,
        stage: /取消/.test(message) ? 'cancelled' : 'failed',
        message: /取消/.test(message) ? '分析已取消' : '分析失败',
        startedAt: new Date().toISOString(),
        elapsedMs: 0,
        assetCount: project.assetCount,
        model: selectedProfile?.modelId || project.model
      });
      setScreen('analysis');
    }
  }

  async function importMore(kind: 'assets' | 'logo' | 'brief') {
    if (!selected) return;
    const paths = await window.masterpiece.projects.chooseFiles(kind);
    if (!paths.length) return;
    try {
      const result = await window.masterpiece.projects.importFiles(selected.id, paths, kind);
      await refreshSelected(selected.id, result.summary);
      setError(result.skipped.length ? `已忽略 ${result.skipped.length} 个不支持或重复的文件。` : '');
    } catch (reason) { setError(cleanError(reason)); }
  }

  async function removeAsset(assetId: string) {
    if (!selected) return;
    try { await refreshSelected(selected.id, await window.masterpiece.projects.removeAsset(selected.id, assetId)); }
    catch (reason) { setError(cleanError(reason)); }
  }

  async function removeBatch(batchId: string, label: string) {
    if (!selected || !window.confirm(`确定删除批次“${label}”中的全部素材吗？`)) return;
    try { await refreshSelected(selected.id, await window.masterpiece.projects.removeBatch(selected.id, batchId)); }
    catch (reason) { setError(cleanError(reason)); }
  }

  async function clearAssets() {
    if (!selected || !window.confirm('确定清空全部素材吗？\n已生成的视觉总览缓存将失效。')) return;
    try { await refreshSelected(selected.id, await window.masterpiece.projects.clearAssets(selected.id)); }
    catch (reason) { setError(cleanError(reason)); }
  }

  async function deleteProject(project: ProjectRecord) {
    if (project.status === 'running') return;
    if (!window.confirm(`确定删除项目“${project.projectName}”吗？\n\n此操作会同时永久删除该项目对应的本地文件夹，包括素材、缓存、报告和运行记录，且无法撤销。`)) return;
    setDeletingProjectId(project.id);
    setError('');
    try {
      await window.masterpiece.projects.remove(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      if (selected?.id === project.id) {
        setSelected(null);
        setAssets(null);
      }
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setDeletingProjectId('');
    }
  }

  async function deleteReferenceAnchorRun(run: ReferenceAnchorRun) {
    if (REFERENCE_ANCHOR_EXECUTING.has(run.status)) return;
    if (!window.confirm(`确定删除参考锚定任务“${run.projectName}”吗？\n\n此操作会永久删除该任务的参考图副本、风格胶囊、Anchor Brief 和运行记录，且无法撤销。`)) return;
    setDeletingReferenceAnchorRunId(run.id);
    setError('');
    try {
      await window.masterpiece.referenceAnchor.remove(run.id);
      setReferenceAnchorRuns((current) => current.filter((item) => item.id !== run.id));
      if (requestedReferenceAnchorRunId === run.id) setRequestedReferenceAnchorRunId('');
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setDeletingReferenceAnchorRunId('');
    }
  }

  async function deleteDocumentContextRun(run: DocumentContextRun) {
    if (DOCUMENT_CONTEXT_EXECUTING.has(run.status)) return;
    if (!window.confirm(`确定删除文档上下文提取任务“${run.projectName}”吗？\n\n此操作会永久删除该任务的文档副本、中间产物、简报和运行记录，且无法撤销。`)) return;
    setDeletingDocumentContextRunId(run.id);
    setError('');
    try {
      const referenced = await window.masterpiece.contextIntegration.isDocumentContextReferenced(run.id).catch(() => false);
      if (referenced) {
        setError('该文档上下文已被视觉项目引用，请先在对应项目的「项目上下文」中解除关联后再删除。');
        setDeletingDocumentContextRunId('');
        return;
      }
      await window.masterpiece.documentContext.remove(run.id);
      setDocumentContextRuns((current) => current.filter((item) => item.id !== run.id));
      if (requestedDocumentContextRunId === run.id) setRequestedDocumentContextRunId('');
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setDeletingDocumentContextRunId('');
    }
  }

  function saveSettings(next: PublicSettings) {
    setSettings(next);
    const currentStillEnabled = next.profiles.some((profile) => profile.id === selectedApiProfileId && profile.isEnabled);
    if (!currentStillEnabled) {
      const fallback = next.profiles.find((profile) => profile.isDefault && profile.isEnabled
        && profile.modelType === 'analysis' && profile.protocol === 'openai-chat-multimodal')
        || next.profiles.find((profile) => profile.isEnabled
          && profile.modelType === 'analysis' && profile.protocol === 'openai-chat-multimodal');
      setSelectedApiProfileId(fallback?.id || '');
    }
  }

  function openImageGeneration(sources: ImageGenerationSourceBundle) {
    const imageProfile = settings?.profiles.find((profile) => profile.isEnabled && profile.hasApiKey && profile.modelType === 'image_generation' && profile.isDefault)
      || settings?.profiles.find((profile) => profile.isEnabled && profile.hasApiKey && profile.modelType === 'image_generation');
    setSelectedApiProfileId(imageProfile?.id || '');
    setRequestedImageGen(sources);
    setScreen('image-generation');
  }

  if (loading) return <div className="splash"><div className="brand-mark">M</div><p>正在启动 Masterpiece OS…</p></div>;
  if (!settings) return <div className="splash"><div className="brand-mark">!</div><p>{error || '客户端初始化失败，请重新启动。'}</p></div>;

  if (screen === 'settings') return <SettingsPanel settings={settings} onSaved={saveSettings} onClose={() => setScreen(settingsReturnScreen)} />;
  if (screen === 'create') return (
    <div className="create-shell-v2">
      <header className="create-shell-v2__bar">
        <button className="ui-button ui-button--ghost ui-button--sm" onClick={() => { setScreen('home'); void refresh(); }}>
          <span aria-hidden>←</span> 返回首页
        </button>
        <AnalysisModeTabs value={analysisMode} onChange={(mode) => {
          setAnalysisMode(mode);
          if (mode !== 'document-context') setRequestedDocumentContextRunId('');
          if (mode !== 'reference-anchor') setRequestedReferenceAnchorRunId('');
          if (mode === 'creative-intelligence') { setScreen('creative-intelligence'); }
        }} />
        <div className="create-shell-v2__spacer" />
      </header>
      <div className="create-shell-v2__body">
        <div hidden={analysisMode !== 'visual-analysis'}><ProjectWizard settings={settings} onCancel={() => { setScreen('home'); void refresh(); }} onStart={(project, profileId) => {
          setSelected(project);
          setSelectedApiProfileId(profileId);
          void run(project, true, profileId);
        }} /></div>
        <div hidden={analysisMode !== 'reference-anchor'}><ReferenceAnchorWorkspace settings={settings} selectedApiProfileId={selectedApiProfileId} initialRunId={requestedReferenceAnchorRunId} onApiProfileChange={setSelectedApiProfileId} onBack={() => { setScreen('home'); void refresh(); }} onOpenSettings={() => { setSettingsReturnScreen('create'); setScreen('settings'); }} onGenerateReferencePreview={(projectId, referenceAnchorRunId) => openImageGeneration({ preset: 'reference_preview', purpose: 'exploration', projectId, reference: { referenceAnchorRunId }, userIntent: {} })} onGenerateMasterAnchor={(projectId, referenceAnchorRunId) => openImageGeneration({ preset: 'integrated_anchor', purpose: 'production', projectId, visual: { projectId }, reference: { referenceAnchorRunId }, userIntent: {} })} onContinueCreativeProduction={(projectId) => {
          const project = projects.find((item) => item.id === projectId);
          if (project) {
            setSelected(project);
            setScreen('creative-session');
          }
        }} /></div>
        <div hidden={analysisMode !== 'document-context'}><DocumentContextWorkspace settings={settings} selectedApiProfileId={selectedApiProfileId} initialRunId={requestedDocumentContextRunId} onApiProfileChange={setSelectedApiProfileId} onBack={() => { setScreen('home'); void refresh(); }} onOpenSettings={() => { setSettingsReturnScreen('create'); setScreen('settings'); }} onGenerateConcept={(documentRunId) => openImageGeneration({ preset: 'document_concept', purpose: 'exploration', document: { documentRunId }, userIntent: {} })} /></div>
      </div>
    </div>
  );
  // CI-W1B: Creative Intelligence Web Workspace (primary Web entry).
  // Reached via /creative-intelligence. Hidden primary, no AppShell leak
  // — the workspace owns its own AppShell.
  if (screen === 'creative-intelligence') return <CreativeIntelligenceWorkspace
    settings={settings}
    selectedApiProfileId={selectedApiProfileId}
    onApiProfileChange={setSelectedApiProfileId}
    onBack={() => { setScreen('home'); void refresh(); }}
    onOpenSettings={() => { setSettingsReturnScreen('creative-intelligence'); setScreen('settings'); }}
  />;
  if (screen === 'analysis' && selected) return <AnalysisView
    project={selected}
    progress={progress}
    error={runFailure}
    onCancel={() => window.masterpiece.analysis.cancel(selected.id)}
    onRetry={() => void run(selected, true, selectedApiProfileId)}
    onBack={() => { setError(runFailure); setRunFailure(''); setScreen('project'); }}
  />;
  if (screen === 'report' && selected) return <ReportView project={selected} onBack={() => setScreen('project')} onRerun={(force) => void run(selected, force, selectedApiProfileId)} onGenerateVisual={() => setScreen('creative-session')} />;

  if (screen === 'creative-session' && selected) {
    // P1.7 路由切换: 用新 ShortChainPage (路线 A / §6 P1) 替代 v1 ShortChainGenerationWorkspace.
    // 旧的 Workspace 还保留 import 引用 (P3 退役阶段才删).
    return <ShortChainPage project={selected} />;
  }

  if (screen === 'image-generation' && requestedImageGen) return <ImageGenerationWorkspace
    sourceBundle={requestedImageGen}
    settings={settings}
    apiProfileId={selectedApiProfileId}
    onApiProfileChange={setSelectedApiProfileId}
    onBack={() => { setRequestedImageGen(null); setScreen('home'); void refresh(); }}
    onOpenSettings={() => { setSettingsReturnScreen('image-generation'); setScreen('settings'); }}
  />;

  if (screen === 'project' && selected) {
    return <ProjectDetail
      project={selected}
      settings={settings}
      assets={assets}
      analysisProfiles={analysisProfiles}
      selectedProfile={selectedProfile}
      selectedApiProfileId={selectedApiProfileId}
      generationReadiness={generationReadiness}
      batches={batches}
      error={error}
      onSelectApiProfile={setSelectedApiProfileId}
      onImportMore={(kind) => void importMore(kind)}
      onClearAssets={() => void clearAssets()}
      onRemoveBatch={(batchId, label) => void removeBatch(batchId, label)}
      onRemoveAsset={(id) => void removeAsset(id)}
      onRun={(force) => void run(selected, force, selectedProfile?.id)}
      onGoHome={() => { setScreen('home'); void refresh(); }}
      onGoReport={() => setScreen('report')}
      onGoCreative={() => setScreen('creative-session')}
      onOpenReference={() => { setAnalysisMode('reference-anchor'); setScreen('create'); }}
    />;
  }

  if (screen === 'packaging') return <PackagingWorkspace onBack={() => setScreen('home')} />;

  const defaultProfile = settings.profiles.find((profile) => profile.isDefault)
    || settings.profiles.find((profile) => profile.isEnabled);
  const hasUsableProfile = analysisProfiles.some((profile) => profile.hasApiKey && profile.baseUrl && profile.modelId);
  const recentRecords = [
    ...projects.map((project) => ({ kind: 'visual-analysis' as const, createdAt: project.lastRunAt || project.updatedAt || project.createdAt, project })),
    ...documentContextRuns.map((run) => ({ kind: 'document-context' as const, createdAt: run.createdAt, run })),
    ...referenceAnchorRuns.map((run) => ({ kind: 'reference-anchor' as const, createdAt: run.createdAt, run }))
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const currentScreen = screen;

  function runCommand(item: { id: string }) {
    if (item.id === 'nav.home') setScreen('home');
    else if (item.id === 'nav.create') { setAnalysisMode('visual-analysis'); setScreen('create'); }
    else if (item.id === 'nav.settings') { setSettingsReturnScreen(currentScreen); setScreen('settings'); }
    else if (item.id === 'nav.packaging') setScreen('packaging');
    else if (item.id.startsWith('project.')) {
      const id = item.id.slice('project.'.length);
      const project = projects.find((p) => p.id === id);
      if (project) void openProject(project);
    }
  }

  return (
    <>
    <AppShell
      topBar={
        <TopBar
          left={
            <>
              <TopBarBrand name="Masterpiece OS" tag="Web" />
              <TopBarBreadcrumb
                items={[
                  { label: '项目', onClick: () => setScreen('home') },
                  ...(selected ? [{ label: selected.projectName, onClick: () => setScreen('project') }] : []),
                ]}
              />
            </>
          }
          center={
            <TopBarSegment
              value={currentScreen === 'home' ? 'home' : 'create'}
              onChange={(v) => {
                if (v === 'home') setScreen('home');
                else if (v === 'create') { setAnalysisMode('visual-analysis'); setScreen('create'); }
              }}
              options={[
                { value: 'home' as const, label: '项目', count: projects.length },
                { value: 'create' as const, label: '分析工作台' },
              ]}
            />
          }
          right={
            <TopBarActions>
              <div className="app-topbar__status">
                <span className={'status-dot ' + settings.connectionStatus} />
                <span>{defaultProfile?.modelId ? <strong>{defaultProfile.modelId}</strong> : '未配置'}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCmdOpen(true)} title="搜索命令 / 跳转 (⌘K)">
                <span className="kbd-mono">⌘K</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setSettingsReturnScreen(currentScreen); setScreen('settings'); }}>
                设置
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setAnalysisMode('visual-analysis'); setScreen('create'); }}>
                新建分析
              </Button>
            </TopBarActions>
          }
        />
      }
      leftRail={
        <>
          <div className="app-rail__heading">
            <h3>最近项目</h3>
          </div>
          <div className="app-rail__list">
            {projects.slice(0, 8).map((project) => (
              <button
                key={project.id}
                className={'app-rail-item' + (selected?.id === project.id ? ' is-active' : '')}
                onClick={() => void openProject(project)}
              >
                <div className="app-rail-item__icon">{project.projectName.charAt(0)}</div>
                <div className="app-rail-item__body">
                  <span className="app-rail-item__name">{project.projectName}</span>
                  <span className="app-rail-item__meta">{project.industry} · {project.assetCount} 个素材</span>
                </div>
              </button>
            ))}
            {projects.length === 0 && (
              <div className="app-rail-empty">
                还没有项目
              </div>
            )}
          </div>
        </>
      }
      bottomBar={
        <>
          <span>Masterpiece OS · 5.0.0-rc.1</span>
          <span>{projects.length} 个项目 · {documentContextRuns.length} 份文档 · {referenceAnchorRuns.length} 次锚定</span>
        </>
      }
    >
      <div className="content-max">
        {!hasUsableProfile && (
          <div className="setup-banner setup-banner--block">
            <div>
              <strong>完成首次 API 配置</strong>
              <p>请添加并启用一个包含 API Key、Base URL 与 Model ID 的 Profile。</p>
            </div>
            <Button variant="secondary" onClick={() => setScreen('settings')}>前往设置</Button>
          </div>
        )}
        {/* Phase 5.7: transient `error` state is now surfaced as a toast
            via the useEffect above; the inline .notice is removed. Splash
            errors (init failure / 20s timeout) still display inline via
            the splash return. */}

        {/* Hero — editorial */}
        <section className="hero">
          <p className="hero__eyebrow">Masterpiece OS — Creative Director Preparation</p>
          <h1 className="hero__title">
            Visual judgment,<br />
            <em>as a system.</em>
          </h1>
          <p className="hero__subtitle">
            上传品牌素材，自动分析生成视觉总览与创作方向，一键交付规范级别的设计成果。
          </p>
          <div className="hero__actions">
            <Button variant="primary" onClick={() => { setAnalysisMode('visual-analysis'); setScreen('create'); }}>
              智能生成 →
            </Button>
            <Button variant="ghost" onClick={() => { setScreen('creative-intelligence'); }}>
              Creative Intelligence
            </Button>
            <Button variant="ghost" onClick={() => { setAnalysisMode('reference-anchor'); setScreen('create'); }}>
              参考视觉转换
            </Button>
          </div>
          <div className="hero__meta">
            <div className="hero__meta-item">
              <small>分析模型</small>
              <strong>{defaultProfile?.modelId || '未配置'}</strong>
            </div>
            <div className="hero__meta-item">
              <small>本地记录</small>
              <strong>{recentRecords.length}</strong>
            </div>
            <div className="hero__meta-item">
              <small>系统版本</small>
              <strong>5.0.0-rc.1</strong>
            </div>
          </div>
        </section>

        {/* Recent records */}
        <section>
          <div className="section-head">
            <div className="section-head__titles">
              <span className="section-head__eyebrow">Recent</span>
              <h2 className="section-head__title">最近分析记录</h2>
            </div>
            <span className="section-head__meta">{recentRecords.length} 条本地记录</span>
          </div>

          {recentRecords.length ? (
            <div className="record-grid">
              {/* New project CTA card */}
              <button
                className="record-card record-card--cta"
                onClick={() => { setAnalysisMode('visual-analysis'); setScreen('create'); }}
              >
                <div className="record-card__plus">+</div>
                <strong>开始新的分析</strong>
              </button>

              {recentRecords.map((record) => {
                const typeClass = record.kind === 'visual-analysis' ? 'record-card__type--analysis'
                  : record.kind === 'reference-anchor' ? 'record-card__type--reference'
                  : 'record-card__type--document';
                const typeLabel = record.kind === 'visual-analysis' ? '视觉分析'
                  : record.kind === 'reference-anchor' ? '参考锚定'
                  : '文档上下文';
                const name = record.kind === 'visual-analysis' ? record.project.projectName
                  : record.run.projectName;
                const desc = record.kind === 'visual-analysis'
                  ? record.project.industry + ' · ' + record.project.assetCount + ' 个素材'
                  : record.kind === 'reference-anchor'
                    ? record.run.referenceAssetCount + ' 张参考图'
                    : record.run.documentCount + ' 份文档';
                const status = record.kind === 'visual-analysis' ? record.project.status
                  : record.run.status;
                const handleClick = () => {
                  if (record.kind === 'visual-analysis') {
                    void openProject(record.project);
                  } else if (record.kind === 'reference-anchor') {
                    setRequestedReferenceAnchorRunId(record.run.id);
                    setAnalysisMode('reference-anchor');
                    setScreen('create');
                  } else {
                    setRequestedDocumentContextRunId(record.run.id);
                    setAnalysisMode('document-context');
                    setScreen('create');
                  }
                };
                const isDeleting = record.kind === 'visual-analysis' && deletingProjectId === record.project.id
                  || record.kind === 'reference-anchor' && deletingReferenceAnchorRunId === record.run.id
                  || record.kind === 'document-context' && deletingDocumentContextRunId === record.run.id;
                const canDelete = record.kind === 'visual-analysis' && record.project.status !== 'running'
                  || record.kind === 'reference-anchor' && !REFERENCE_ANCHOR_EXECUTING.has(record.run.status)
                  || record.kind === 'document-context' && !DOCUMENT_CONTEXT_EXECUTING.has(record.run.status);
                const handleDelete = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (record.kind === 'visual-analysis') void deleteProject(record.project);
                  else if (record.kind === 'reference-anchor') void deleteReferenceAnchorRun(record.run);
                  else void deleteDocumentContextRun(record.run);
                };

                return (
                  <button key={record.kind + '-' + (record.kind === 'visual-analysis' ? record.project.id : record.run.id)}
                    className="record-card"
                    onClick={handleClick}
                  >
                    <div className="record-card__head">
                      <span className={'record-card__type ' + typeClass}>{typeLabel}</span>
                      <StatusBadgeInline status={status} />
                    </div>
                    <h3 className="record-card__name">{name}</h3>
                    <p className="record-card__desc">{desc}</p>
                    <div className="record-card__foot">
                      <div className="record-card__meta">
                        <small>更新于</small>
                        <strong>{formatRelativeTime(record.createdAt)}</strong>
                      </div>
                      <div className="flex-row-sm-center">
                        <button
                          className="project-delete project-delete--inline"
                          disabled={!canDelete || isDeleting}
                          onClick={handleDelete}
                          aria-label="删除"
                        >
                          {isDeleting ? '…' : '删除'}
                        </button>
                        <span className="record-card__arrow" aria-hidden>→</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-home">
              <div className="empty-orbit" />
              <strong>还没有分析记录</strong>
              <p>进入分析工作台,选择智能生成、Creative Intelligence 或参考视觉转换开始第一次任务。</p>
              <Button variant="primary" onClick={() => { setAnalysisMode('visual-analysis'); setScreen('create'); }}>
                开始第一次分析
              </Button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
    {/* ── Architecture layer: Command Palette + Toast ── */}
    <CommandPalette
      open={cmdOpen}
      onClose={() => setCmdOpen(false)}
      items={commandItems}
      onSelect={runCommand}
      placeholder="搜索命令、跳转页面、打开项目…"
    />
    <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
