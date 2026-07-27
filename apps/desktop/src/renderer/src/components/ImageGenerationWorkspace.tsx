import { useEffect, useMemo, useState } from 'react';
import type {
  ImageGenerationCompileResult,
  ImageGenerationProgress,
  ImageReviewDecision,
  ImageGenerationRun,
  ImageGenerationRunStatus,
  ImageGenerationRunSummary,
  ImageGenerationSourceBundle,
  ImageGenerationSourcePreview,
  ImageProviderCapabilities,
  PublicSettings,
  StartImageGenerationInput
} from '../../../shared/types';
import { cleanError } from '../utils';

interface Props {
  sourceBundle: ImageGenerationSourceBundle;
  settings: PublicSettings;
  apiProfileId: string;
  onApiProfileChange(profileId: string): void;
  onBack(): void;
  onOpenSettings(): void;
}

const STATUS_LABELS: Record<ImageGenerationRunStatus, string> = {
  created: '已创建',
  validating: '校验中',
  blocked: '已被 Gate 阻断',
  ready: '待提交',
  submitting: '提交中',
  queued: '已排队',
  running: '生成中',
  downloading: '下载中',
  succeeded: '已生成',
  failed: '失败',
  cancelled: '已取消'
};

const STATUS_TONE: Record<ImageGenerationRunStatus, string> = {
  created: '',
  validating: 'running',
  blocked: 'failed',
  ready: 'ready',
  submitting: 'running',
  queued: 'running',
  running: 'running',
  downloading: 'running',
  succeeded: 'ready',
  failed: 'failed',
  cancelled: 'failed'
};

const REVIEW_LABELS: Record<ImageReviewDecision, string> = {
  selected: '标记为选用',
  usable_after_edit: '标记为需后期',
  reference_only: '标记为仅参考',
  rejected: '拒绝'
};

const EXECUTING: Array<ImageGenerationRunStatus> = ['created', 'validating', 'ready', 'submitting', 'queued', 'running', 'downloading'];
const PRESET_LABELS: Record<ImageGenerationSourceBundle['preset'], string> = {
  visual_extension: '基于当前视觉继续生成',
  document_concept: '基于文档生成概念稿',
  reference_preview: '试生成参考效果',
  integrated_anchor: '使用完整上下文生成',
};

function assertCompileResult(value: ImageGenerationCompileResult): ImageGenerationCompileResult {
  if (
    !value
    || typeof value.runId !== 'string'
    || !value.gate
    || !Array.isArray(value.gate.errors)
    || !Array.isArray(value.gate.warnings)
  ) {
    throw new Error('生图编译结果格式无效，请更新客户端后重试。');
  }
  return value;
}

export function ImageGenerationWorkspace({ sourceBundle, settings, apiProfileId, onApiProfileChange, onBack, onOpenSettings }: Props) {
  const [userIntent, setUserIntent] = useState(sourceBundle.userIntent?.prompt || '');
  const input: StartImageGenerationInput = useMemo(() => ({
    sources: sourceBundle,
    apiProfileId
  }), [sourceBundle, apiProfileId]);
  const currentInput = (): StartImageGenerationInput => ({
    sources: {
      ...sourceBundle,
      userIntent: { ...sourceBundle.userIntent, prompt: userIntent.trim() },
    },
    apiProfileId,
  });
  const runScopeId = sourceBundle.projectId || sourceBundle.visual?.projectId || `document-${sourceBundle.document?.documentRunId}`;
  const imageProfiles = settings.profiles.filter((profile) => profile.isEnabled && profile.protocol === 'dashscope-wan-image');

  const [capabilities, setCapabilities] = useState<ImageProviderCapabilities | null>(null);
  const [sourcePreview, setSourcePreview] = useState<ImageGenerationSourcePreview | null>(null);
  const [compileResult, setCompileResult] = useState<ImageGenerationCompileResult | null>(null);
  const [activeRun, setActiveRun] = useState<ImageGenerationRun | null>(null);
  const [activeRunId, setActiveRunId] = useState('');
  const [progress, setProgress] = useState<ImageGenerationProgress | null>(null);
  const [runs, setRuns] = useState<ImageGenerationRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewDecision, setReviewDecision] = useState<ImageReviewDecision | ''>('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');

  const gateBlocked = Boolean(compileResult?.gate?.blocked);

  async function refreshRuns() {
    const next = await window.masterpiece.imageGeneration.listRuns(runScopeId);
    setRuns(next);
    return next;
  }

  async function loadRun(runId: string) {
    const run = await window.masterpiece.imageGeneration.getRun(runId);
    setActiveRun(run);
    setActiveRunId(runId);
    setProgress(null);
    setImageDataUrl(null);
    setReviewDecision(run?.review?.decision || '');
    setReviewNotes(run?.review?.notes || '');
    if (run?.status === 'succeeded' && run.images[0]) {
      const result = await window.masterpiece.imageGeneration.getImageDataUrl(runId, run.images[0].imageId).catch(() => null);
      if (result) setImageDataUrl(result.dataUrl);
    }
  }

  // 进入页面：加载能力 + 编译预览（Gate 校验，不提交 Provider）
  useEffect(() => {
    setError('');
    setNotice('');
    setActiveRun(null);
    setActiveRunId('');
    setImageDataUrl(null);
    setCompileResult(null);
    void Promise.all([
      window.masterpiece.imageGeneration.getCapabilities().then(setCapabilities),
      window.masterpiece.imageGeneration.getSourcePreview(input).then(setSourcePreview),
      refreshRuns()
    ]).catch((reason) => setError(cleanError(reason)));
    // 自动编译以展示 Prompt 预览与 Gate 结果
    window.masterpiece.imageGeneration.compile(input)
      .then((rawResult) => {
        const result = assertCompileResult(rawResult);
        setCompileResult(result);
        if (result.gate.blocked) {
          setNotice(`三层 Gate 已阻断：${result.gate.errors.map((e) => e.message).join('；')}`);
        } else {
          setNotice('编译通过，点击下方按钮开始生成 Master Anchor Image。');
        }
      })
      .catch((reason) => setError(cleanError(reason)));
  }, [input]);

  // 订阅运行状态广播
  useEffect(() => {
    if (!activeRunId) return;
    const unsubscribe = window.masterpiece.imageGeneration.onRunUpdated((event: ImageGenerationProgress) => {
      if (event.runId !== activeRunId) return;
      setProgress(event);
      if (!EXECUTING.includes(event.status)) {
        void loadRun(activeRunId);
      }
    });
    return unsubscribe;
  }, [activeRunId]);

  async function startGeneration() {
    if (gateBlocked || busy) return;
    if (!apiProfileId) {
      setError('请先在 API 设置中配置并启用包含 API Key 的 Profile。');
      onOpenSettings();
      return;
    }
    setBusy(true);
    setError('');
    setNotice('正在生成 Master Anchor Image…');
    try {
      const run = await window.masterpiece.imageGeneration.start(currentInput());
      setActiveRunId(run.runId);
      await loadRun(run.runId);
      if (run.status === 'blocked') {
        setNotice(`三层 Gate 已阻断：${run.errorMessage || run.gate.errors.map((e) => e.message).join('；')}`);
      } else if (run.status === 'succeeded') {
        setNotice('生成成功，等待设计师确认。');
      } else if (run.status === 'failed') {
        setError(run.errorMessage || '生成失败。');
      }
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
      void refreshRuns();
    }
  }

  async function cancelRun() {
    if (!activeRunId) return;
    setBusy(true);
    try {
      await window.masterpiece.imageGeneration.cancel(activeRunId);
      await loadRun(activeRunId);
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function retryRun(mode: 'same_prompt' | 'edited_prompt') {
    if (!activeRunId || busy) return;
    if (mode === 'edited_prompt' && !editedPrompt.trim()) return;
    setBusy(true);
    setError('');
    setShowEditPrompt(false);
    try {
      const run = await window.masterpiece.imageGeneration.retry({
        runId: activeRunId,
        mode,
        editedPrompt: mode === 'edited_prompt' ? editedPrompt : undefined,
        apiProfileId
      });
      setActiveRunId(run.runId);
      await loadRun(run.runId);
      if (run.status === 'blocked') {
        setNotice(`三层 Gate 已阻断：${run.errorMessage || run.gate.errors.map((e) => e.message).join('；')}`);
      }
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
      void refreshRuns();
    }
  }

  async function submitReview(decision: ImageReviewDecision) {
    if (!activeRun || !activeRun.images[0]) return;
    setBusy(true);
    try {
      const review = await window.masterpiece.imageGeneration.saveReview({
        runId: activeRun.runId,
        imageId: activeRun.images[0].imageId,
        decision,
        notes: reviewNotes.trim() || undefined,
        reviewedAt: new Date().toISOString()
      });
      setActiveRun(review);
      setReviewDecision(decision);
      setNotice(`已记录评价：${REVIEW_LABELS[decision]}`);
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  const historyRuns = runs.filter((run) => run.parentRunId === undefined);

  return <div className="page project-page">
    <header className="page-header">
      <div>
        <p className="eyebrow">IMAGE GENERATION</p>
        <div className="title-line"><h1>{PRESET_LABELS[sourceBundle.preset]}</h1></div>
        <p>预设 {sourceBundle.preset} · 用途 {sourceBundle.purpose === 'production' ? '正式生成' : '方向探索'}</p>
      </div>
      <div className="button-row">
        <button className="button ghost" onClick={onBack}>返回</button>
        <button className="button secondary" disabled={!activeRunId} onClick={() => void window.masterpiece.imageGeneration.openFolder(activeRunId)}>打开本地文件夹</button>
      </div>
    </header>

    {error && <div className="notice error top-notice">{error}</div>}
    {notice && !error && <div className="notice ok top-notice">{notice}</div>}

    <div className="project-grid">
      {/* 左：来源上下文摘要 */}
      <section className="panel assets-panel">
        <div className="section-heading"><span>01</span><div><h2>来源上下文</h2><p>仅继承参考风格机制，不迁移参考品牌身份</p></div></div>
        <div className="facts-box">
          <small>上游</small>
          {sourceBundle.visual && <p>视觉项目：{sourceBundle.visual.projectId.slice(0, 8)}</p>}
          {sourceBundle.document && <p>文档上下文：{sourceBundle.document.documentRunId.slice(0, 8)}</p>}
          {sourceBundle.reference && <p>Reference Anchor：{sourceBundle.reference.referenceAnchorRunId.slice(0, 8)}</p>}
          {sourcePreview && <p>实际使用：{Object.entries(sourcePreview.sourcesUsed).filter(([, used]) => used).map(([name]) => name).join(' / ') || '无'}</p>}
          {sourcePreview?.sourcesNotUsed.length ? <p>未使用：{sourcePreview.sourcesNotUsed.join(' / ')}</p> : null}
        </div>
        <div className="facts-box">
          <small>Provider 能力</small>
          <p>模型：{capabilities?.modelId || '—'}</p>
          <p>支持尺寸：{capabilities?.supportedSizes.join(' / ') || '—'}</p>
          <p>输出格式：{capabilities?.outputMimeTypes.join(' / ') || '—'}</p>
        </div>
        <div className="facts-box">
          <small>配置</small>
          <label>生成模型<select value={apiProfileId} onChange={(event) => onApiProfileChange(event.target.value)}>
            <option value="">请选择 API Profile</option>
            {imageProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName} / {profile.modelId}</option>)}
          </select></label>
          {!imageProfiles.length && <em>暂无已启用的 DashScope Wan 生图 Profile，请先在 API 设置中配置。</em>}
          <label>本次生成意图<textarea rows={4} value={userIntent} onChange={(event) => setUserIntent(event.target.value)} placeholder="描述希望生成的画面、触点或探索方向" /></label>
        </div>
        {historyRuns.length > 0 && <div className="facts-box">
          <small>历史运行</small>
          {historyRuns.map((run) => <div key={run.runId} className="history-row">
            <button className="link-button" onClick={() => { void loadRun(run.runId); setSelectedRunId(run.runId); }}>{run.runId.slice(0, 8)}</button>
            <span className={`badge ${STATUS_TONE[run.status]}`}>{STATUS_LABELS[run.status]}</span>
            {run.reviewDecision && <small>· {REVIEW_LABELS[run.reviewDecision]}</small>}
          </div>)}
        </div>}
      </section>

      {/* 中：生成状态 / 图片结果 */}
      <section className="panel">
        <div className="section-heading"><span>02</span><div><h2>生成结果</h2><p>{activeRun ? STATUS_LABELS[activeRun.status] : '尚未开始'}</p></div></div>
        {progress && EXECUTING.includes(progress.status) && <div className="running-state">
          <small>{progress.message}</small>
          <div className="progress-bar"><div className="progress-fill" /></div>
        </div>}
        {imageDataUrl
          ? <div className="result-image"><img src={imageDataUrl} alt="Master Anchor Image" /></div>
          : activeRun && activeRun.status === 'succeeded'
            ? <div className="empty-state"><strong>图片已生成</strong><p>点击「打开本地文件夹」查看原图。</p></div>
            : <div className="empty-state"><strong>等待生成</strong><p>确认左侧来源上下文后，点击下方「开始生成」。</p></div>}
        {activeRun?.errorMessage && activeRun.status === 'failed' && <div className="notice error">{activeRun.errorMessage}</div>}
      </section>

      {/* 右：模型 / 规格 / Prompt 预览 / Warning */}
      <aside className="panel project-sidebar">
        <div className="section-heading"><span>03</span><div><h2>编译与约束</h2><p>三层 Gate 校验结果</p></div></div>
        {compileResult ? <>
          <div className="facts-box">
            <small>Prompt 版本</small>
            <p>v{compileResult.promptVersion}</p>
          </div>
          <details className="prompt-preview">
            <summary>查看编译后的 Prompt</summary>
            <pre>{compileResult.compiledPrompt}</pre>
          </details>
          {compileResult.gate.errors.length > 0 && <div className="notice error">
            <strong>阻断错误（{compileResult.gate.errors.length}）</strong>
            <ul>{compileResult.gate.errors.map((e) => <li key={e.code}>{e.message}</li>)}</ul>
          </div>}
          {compileResult.gate.warnings.length > 0 && <div className="notice warn">
            <strong>Warning（{compileResult.gate.warnings.length}）</strong>
            <ul>{compileResult.gate.warnings.map((w) => <li key={w.code}>{w.message}</li>)}</ul>
          </div>}
        </> : <div className="empty-state"><p>正在编译 Prompt…</p></div>}

        <div className="button-row generation-actions">
          <button className="button primary full" disabled={gateBlocked || busy || !apiProfileId} onClick={() => void startGeneration()}>
            {busy ? '生成中…' : '开始生成'}
          </button>
          {activeRunId && EXECUTING.includes(activeRun?.status || 'created') && (
            <button className="button danger full" disabled={busy} onClick={() => void cancelRun()}>取消任务</button>
          )}
        </div>

        {activeRun && (activeRun.status === 'succeeded' || activeRun.status === 'failed' || activeRun.status === 'blocked') && (
          <div className="button-row">
            <button className="button secondary full" disabled={busy} onClick={() => void retryRun('same_prompt')}>相同 Prompt 重试</button>
            <button className="button secondary full" disabled={busy} onClick={() => { setEditedPrompt(compileResult?.compiledPrompt || ''); setShowEditPrompt((v) => !v); }}>编辑 Prompt 重试</button>
          </div>
        )}
        {showEditPrompt && <div className="edit-prompt">
          <textarea value={editedPrompt} onChange={(event) => setEditedPrompt(event.target.value)} rows={6} />
          <button className="button primary full" disabled={busy || !editedPrompt.trim()} onClick={() => void retryRun('edited_prompt')}>采用编辑后的 Prompt 重试</button>
        </div>}
      </aside>
    </div>

    {/* 底部：人工评价 */}
    {activeRun?.status === 'succeeded' && activeRun.images.length > 0 && <footer className="context-confirm-footer panel">
      <div><p className="eyebrow">DESIGNER REVIEW</p><h2>设计师确认</h2><p>请对本次生成的 Master Anchor Image 给出评价。</p></div>
      <textarea className="review-notes" placeholder="评价备注（可选）" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} />
      <div className="button-row review-actions">
        {(Object.keys(REVIEW_LABELS) as ImageReviewDecision[]).map((decision) => (
          <button key={decision} className={reviewDecision === decision ? 'button primary' : 'button secondary'} disabled={busy} onClick={() => void submitReview(decision)}>{REVIEW_LABELS[decision]}</button>
        ))}
      </div>
    </footer>}
  </div>;
}
