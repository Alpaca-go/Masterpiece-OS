import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CreativeSession,
  CreativeDirection,
  AnchorCandidate,
  AnchorCandidateEvaluation,
  GenerationOutput,
  GenerationSeries,
  ImageGenerationRun,
  ImageGenerationRunSummary,
  ProjectRecord,
  StyleProfile,
  VisualCanon
} from '../../../shared/types';
import { cleanError } from '../utils';

interface Props {
  project: ProjectRecord;
  apiProfileId: string;
  imageApiProfileId: string;
  onBack(): void;
  onOpenSettings(): void;
}

interface WorkspaceState {
  session: CreativeSession;
  creativeDirection: CreativeDirection | null;
  styleProfile: StyleProfile | null;
  visualCanon: VisualCanon | null;
  runs: ImageGenerationRunSummary[];
}

interface RunView {
  run: ImageGenerationRun;
  imageUrls: string[];
}

interface ProductionState {
  anchors: AnchorCandidate[];
  styles: StyleProfile[];
  canons: VisualCanon[];
  series: GenerationSeries[];
  outputs: GenerationOutput[];
}

const ANCHOR_DIMENSIONS: Array<{
  key: Exclude<keyof AnchorCandidateEvaluation, 'evaluatedAt'>;
  label: string;
}> = [
  { key: 'color', label: '色彩' },
  { key: 'composition', label: '构图' },
  { key: 'material', label: '材质' },
  { key: 'lighting', label: '光线' },
  { key: 'graphic_language', label: '图形语言' },
  { key: 'brand_assets', label: '品牌资产' },
  { key: 'overall_tone', label: '整体气质' }
];

const QUICK_TASKS = [
  '生成一张升级后的品牌海报',
  '生成一张升级后的包装渲染图',
  '生成一张升级后的店内空间效果图'
];

const STATE_LABELS: Partial<Record<CreativeSession['workflowState'], string>> = {
  CREATED: '会话已创建',
  SESSION_CREATED: '会话已创建',
  DIRECTION_GENERATING: '创意总监正在制定方向',
  DIRECTION_READY: '创意方向已制定',
  CREATIVE_DECISION_COMPLETED: '创意决策已完成',
  STYLE_PROFILE_CREATED: '风格档案已建立',
  PRIMARY_ANCHOR_PENDING_REVIEW: '等待确认主视觉锚点',
  PRIMARY_ANCHOR_CONFIRMED: '主视觉锚点已确认',
  VISUAL_CANON_CONFIRMED: '视觉规范已确认',
  GENERATION_READY: '可以开始创作',
  GENERATING: '正在生成',
  REVIEWING_OUTPUTS: '等待结果反馈',
  REVISION_IN_PROGRESS: '正在修订',
  COMPLETED: '已完成',
  FAILED: '发生错误',
  CANCELLED: '已取消'
};

export function CreativeSessionWorkspace({
  project,
  apiProfileId,
  imageApiProfileId,
  onBack,
  onOpenSettings
}: Props) {
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [runViews, setRunViews] = useState<RunView[]>([]);
  const [production, setProduction] = useState<ProductionState>({
    anchors: [],
    styles: [],
    canons: [],
    series: [],
    outputs: []
  });
  const [tab, setTab] = useState<'session' | 'anchor' | 'canon' | 'generation'>('session');
  const [anchorPurpose, setAnchorPurpose] = useState('建立新的品牌主视觉方向');
  const [contextDirection, setContextDirection] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewScores, setReviewScores] = useState<Record<string, number>>(
    Object.fromEntries(ANCHOR_DIMENSIONS.map(({ key }) => [key, 4]))
  );
  const [promptDrawer, setPromptDrawer] = useState<{ runId: string; prompt: string } | null>(null);
  const [revisionDraft, setRevisionDraft] = useState<{
    outputId: string;
    taskId: string;
    mode: 'edit' | 'variant';
    preserve: string;
    change: string;
  } | null>(null);
  const [compareOutputIds, setCompareOutputIds] = useState<string[]>([]);
  const [request, setRequest] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'loading' | 'reading' | 'generating' | ''>('loading');

  const refresh = useCallback(async () => {
    const [next, anchors, styles, canons, series] = await Promise.all([
      window.masterpiece.creativeSession.getWorkspace(project.id),
      window.masterpiece.creativeProduction.listAnchorCandidates(project.id),
      window.masterpiece.creativeProduction.listStyleProfiles(project.id),
      window.masterpiece.creativeProduction.listVisualCanons(project.id),
      window.masterpiece.creativeProduction.listSeries(project.id)
    ]);
    setWorkspace(next);
    const currentCanon = next.visualCanon
      && next.styleProfile
      && next.visualCanon.styleProfileId === next.styleProfile.id
      && next.visualCanon.styleProfileVersion === next.styleProfile.version
      ? next.visualCanon
      : null;
    const activeSeries = series.find((item) =>
      item.styleProfileVersion === next.styleProfile?.version
      && item.visualCanonVersion === currentCanon?.version
      && item.id === next.session.activeSeriesId)
      || series.find((item) =>
        item.styleProfileVersion === next.styleProfile?.version
        && item.visualCanonVersion === currentCanon?.version);
    const outputs = activeSeries
      ? await window.masterpiece.creativeProduction.listFormalAssets(project.id, activeSeries.id)
      : [];
    setProduction({ anchors, styles, canons, series, outputs });
    const fullRuns = await Promise.all(next.runs.slice(0, 12).map(async (summary) => {
      const run = await window.masterpiece.creativeSession.getRun(summary.runId);
      if (!run) return null;
      const imageUrls = (await Promise.all(run.images.map(async (image) => {
        const value = await window.masterpiece.creativeSession
          .getImageDataUrl(run.runId, image.imageId)
          .catch(() => null);
        return value?.dataUrl || '';
      }))).filter(Boolean);
      return { run, imageUrls };
    }));
    setRunViews(fullRuns.filter((item): item is RunView => Boolean(item)));
  }, [project.id]);

  useEffect(() => {
    let active = true;
    void refresh()
      .catch((reason) => { if (active) setError(cleanError(reason)); })
      .finally(() => { if (active) setBusy(''); });
    const unsubscribe = window.masterpiece.imageGeneration.onRunUpdated((event) => {
      if (event.projectId === project.id) void refresh().catch(() => undefined);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [project.id, refresh]);

  const understanding = workspace?.session.understanding;
  const creativeDirection = workspace?.creativeDirection;
  const currentCanon = workspace?.visualCanon
    && workspace?.styleProfile
    && workspace.visualCanon.styleProfileId === workspace.styleProfile.id
    && workspace.visualCanon.styleProfileVersion === workspace.styleProfile.version
    ? workspace.visualCanon
    : null;
  const canGenerate = Boolean(
    understanding
    && creativeDirection
    && workspace?.styleProfile?.status === 'confirmed'
    && currentCanon?.status === 'confirmed'
    && imageApiProfileId
  );
  const recentMessages = useMemo(
    () => workspace?.session.messages.slice(-8) || [],
    [workspace?.session.messages]
  );

  async function runReading() {
    setBusy('reading');
    setError('');
    try {
      await window.masterpiece.creativeSession.read(project.id, apiProfileId || undefined);
      await refresh();
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy('');
    }
  }

  async function generate() {
    const userRequest = request.trim();
    if (!userRequest) return;
    setBusy('generating');
    setError('');
    try {
      await window.masterpiece.creativeSession.generate(project.id, {
        userRequest,
        apiProfileId: imageApiProfileId || undefined
      });
      setRequest('');
      await refresh();
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy('');
    }
  }

  async function saveFeedback() {
    const content = request.trim();
    if (!content) return;
    setBusy('generating');
    setError('');
    try {
      await window.masterpiece.creativeSession.appendFeedback(project.id, content);
      setRequest('');
      await refresh();
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy('');
    }
  }

  async function retry(runId: string, regenerate: boolean) {
    setBusy('generating');
    setError('');
    try {
      if (regenerate) {
        await window.masterpiece.creativeSession
          .regenerateInstruction(project.id, runId, imageApiProfileId || undefined);
      } else {
        await window.masterpiece.creativeSession
          .retrySame(project.id, runId, imageApiProfileId || undefined);
      }
      await refresh();
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy('');
    }
  }

  async function runProductionAction(action: () => Promise<unknown>, mode: 'reading' | 'generating' = 'generating') {
    setBusy(mode);
    setError('');
    try {
      await action();
      await refresh();
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy('');
    }
  }

  function anchorEvaluation(): AnchorCandidateEvaluation {
    const notes = reviewFeedback.trim() || '已按当前视觉方向完成审核。';
    return {
      evaluatedAt: new Date().toISOString(),
      color: { score: reviewScores.color as 1 | 2 | 3 | 4 | 5, notes },
      composition: { score: reviewScores.composition as 1 | 2 | 3 | 4 | 5, notes },
      material: { score: reviewScores.material as 1 | 2 | 3 | 4 | 5, notes },
      lighting: { score: reviewScores.lighting as 1 | 2 | 3 | 4 | 5, notes },
      graphic_language: { score: reviewScores.graphic_language as 1 | 2 | 3 | 4 | 5, notes },
      brand_assets: { score: reviewScores.brand_assets as 1 | 2 | 3 | 4 | 5, notes },
      overall_tone: { score: reviewScores.overall_tone as 1 | 2 | 3 | 4 | 5, notes }
    };
  }

  const anchorsForCurrentStyle = production.anchors.filter((item) =>
    item.styleProfileId === workspace?.styleProfile?.id
    && item.styleProfileVersion === workspace?.styleProfile?.version);
  const activeAnchor = anchorsForCurrentStyle.find((item) => item.status === 'accepted')
    || anchorsForCurrentStyle[0];
  const anchorRunView = activeAnchor?.generationRunId
    ? runViews.find((item) => item.run.runId === activeAnchor.generationRunId)
    : undefined;
  const activeSeries = production.series.find((item) =>
    item.id === workspace?.session.activeSeriesId
    && item.styleProfileVersion === workspace?.styleProfile?.version
    && item.visualCanonVersion === currentCanon?.version)
    || production.series.find((item) =>
      item.styleProfileVersion === workspace?.styleProfile?.version
      && item.visualCanonVersion === currentCanon?.version);

  return <div className="page creative-session-page">
    <header className="page-header">
      <div>
        <p className="eyebrow">CREATIVE SESSION</p>
        <h1>{project.projectName}</h1>
        <p>{STATE_LABELS[workspace?.session.workflowState || 'CREATED'] || workspace?.session.workflowState}</p>
      </div>
      <div className="button-row">
        <button className="button ghost" onClick={onBack}>返回报告</button>
        <button className="button secondary" onClick={onOpenSettings}>模型设置</button>
      </div>
    </header>

    {error && <div className="notice error top-notice">{error}</div>}
    <nav className="creative-workspace-tabs" aria-label="Creative Production 工作区">
      <button className={tab === 'session' ? 'active' : ''} onClick={() => setTab('session')}>Session 状态</button>
      <button className={tab === 'anchor' ? 'active' : ''} onClick={() => setTab('anchor')}>Anchor 审核</button>
      <button className={tab === 'canon' ? 'active' : ''} onClick={() => setTab('canon')}>Visual Canon</button>
      <button className={tab === 'generation' ? 'active' : ''} onClick={() => setTab('generation')}>生成与版本</button>
    </nav>
    {tab === 'session' && <div className="creative-session-layout">
      <aside className="panel creative-context-panel">
        <div className="section-heading"><span>01</span><div><h2>项目理解</h2><p>持续上下文与已确认基准</p></div></div>
        <ul className="creative-checks">
          <li className="pass">✓ 已读取视觉方案</li>
          <li className={understanding ? 'pass' : ''}>{understanding ? '✓' : '○'} 已完成品牌理解</li>
          <li className={creativeDirection ? 'pass' : ''}>{creativeDirection ? '✓' : '○'} 已制定创意方向</li>
          <li className={workspace?.styleProfile?.status === 'confirmed' ? 'pass' : ''}>
            {workspace?.styleProfile?.status === 'confirmed' ? '✓' : '○'} Style Profile
          </li>
          <li className={currentCanon?.status === 'confirmed' ? 'pass' : ''}>
            {currentCanon?.status === 'confirmed' ? '✓' : '○'} Visual Canon
          </li>
        </ul>
        {!understanding && <button
          className="button primary full"
          disabled={Boolean(busy)}
          onClick={() => void runReading()}
        >{busy === 'reading' ? '正在完整阅读…' : '建立项目理解'}</button>}
        {understanding && <div className="understanding-summary">
          <small>升级原则</small>
          <ul>{understanding.upgradePrinciples.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
          <button
            className="button ghost full"
            disabled={Boolean(busy)}
            onClick={() => void runReading()}
          >重新读取项目</button>
        </div>}
        {creativeDirection && <div className="understanding-summary creative-direction-summary">
          <small>当前创作方向 · {creativeDirection.version}</small>
          <h3>{creativeDirection.primaryConcept}</h3>
          <p>{creativeDirection.projectTransformation}</p>
          <small>设计重点</small>
          <p>{creativeDirection.designStrategy}</p>
          <div className="direction-keywords">
            {creativeDirection.visualKeywords.slice(0, 6).map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>}
      </aside>

      <main className="panel creative-conversation-panel">
        <div className="section-heading"><span>02</span><div><h2>继续创作</h2><p>同一 Session 继承项目理解与反馈</p></div></div>
        <div className="creative-message-list">
          {recentMessages.length ? recentMessages.map((message) =>
            <article className={`creative-message ${message.role}`} key={message.messageId}>
              <small>{message.role === 'user' ? '你' : message.role === 'assistant' ? '生成记录' : '系统'}</small>
              <p>{message.content}</p>
            </article>
          ) : <div className="empty-state small">完成项目理解后，输入这次想生成什么。</div>}
        </div>
        <div className="quick-task-row">
          {QUICK_TASKS.map((item) => <button key={item} onClick={() => setRequest(item)}>{item}</button>)}
        </div>
        <textarea
          rows={4}
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          placeholder="例如：生成一张升级后的店内装修效果图"
        />
        {!canGenerate && understanding && <p className="creative-gate-note">
          {!imageApiProfileId
            ? '请先在模型设置中启用一个图像生成模型。'
            : '需要先在当前项目流程中确认 Style Profile 与 Visual Canon，系统不会在方向未确认时直接生图。'}
        </p>}
        <div className="creative-submit-row">
          <button
            className="button secondary"
            disabled={!understanding || !creativeDirection || !request.trim() || Boolean(busy)}
            onClick={() => void saveFeedback()}
          >记录为反馈</button>
          <button
            className="button primary"
            disabled={!canGenerate || !request.trim() || Boolean(busy)}
            onClick={() => void generate()}
          >{busy === 'generating' ? '正在处理…' : '开始创作'}</button>
        </div>
      </main>

      <aside className="panel creative-results-panel">
        <div className="section-heading"><span>03</span><div><h2>生成结果</h2><p>{workspace?.runs.length || 0} 次历史运行</p></div></div>
        <div className="creative-result-list">
          {runViews.length ? runViews.map(({ run, imageUrls }) => <article key={run.runId}>
            {imageUrls.map((url, index) => <img key={`${run.runId}-${index}`} src={url} alt="生成结果" />)}
            <div><strong>{run.status}</strong><small>{new Date(run.createdAt).toLocaleString()}</small></div>
            {run.errorMessage && <p className="error-text">{run.errorMessage}</p>}
            <div className="creative-retry-row">
              <button disabled={Boolean(busy)} onClick={() => void retry(run.runId, false)}>相同指令重试</button>
              <button disabled={Boolean(busy)} onClick={() => void retry(run.runId, true)}>重新生成指令</button>
            </div>
          </article>) : <div className="empty-state small">尚无生成结果。</div>}
        </div>
      </aside>
    </div>}

    {tab === 'anchor' && <div className="creative-production-grid">
      <section className="panel">
        <div className="section-heading"><span>01</span><div><h2>生产上下文</h2><p>Style Profile 与 Locked Assets</p></div></div>
        {!understanding && <div className="empty-state small">请先在 Session 状态页建立项目理解。</div>}
        {understanding && creativeDirection && !workspace?.styleProfile && <button
          className="button primary full"
          disabled={Boolean(busy)}
          onClick={() => void runProductionAction(
            () => window.masterpiece.creativeProduction.prepare(project.id)
          )}
        >建立 Style Profile 与 Locked Assets</button>}
        {workspace?.styleProfile && <div className="production-summary-card">
          <small>STYLE PROFILE / {workspace.styleProfile.version}</small>
          <h3>{workspace.styleProfile.name}</h3>
          <p>{workspace.styleProfile.styleEssence.summary}</p>
          <span className={`badge ${workspace.styleProfile.status === 'confirmed' ? 'completed' : 'ready'}`}>
            {workspace.styleProfile.status}
          </span>
          {workspace.styleProfile.status !== 'confirmed' && <button
            className="button primary full"
            disabled={Boolean(busy)}
            onClick={() => void runProductionAction(
              () => window.masterpiece.creativeProduction
                .confirmStyleProfile(project.id, workspace.styleProfile!.id)
            )}
          >确认 Style Profile</button>}
        </div>}
        {workspace?.styleProfile && <div className="context-regeneration-form">
          <label>下一版 Anchor 的变化方向
            <textarea
              rows={4}
              value={contextDirection}
              placeholder="例如：减少传统装饰，改成更明亮的现代社区小馆；强化自然木材、晨间光线和开放式后厨。"
              onChange={(event) => setContextDirection(event.target.value)}
            />
          </label>
          <p>将创建新版本 Style Profile；旧 Anchor、Visual Canon 和 Series 会保留为历史，但不会继续用于新版本。</p>
          <button
            className="button secondary full"
            disabled={contextDirection.trim().length < 8 || Boolean(busy)}
            onClick={() => void runProductionAction(async () => {
              await window.masterpiece.creativeProduction.regenerateContext(project.id, {
                directionBrief: contextDirection.trim()
              });
              setContextDirection('');
            })}
          >根据变化方向重新生成上下文</button>
        </div>}
      </section>

      <section className="panel">
        <div className="section-heading"><span>02</span><div><h2>Anchor Candidate</h2><p>单图验证新的整体视觉方向</p></div></div>
        {!activeAnchor && <div className="anchor-create-form">
          <label>候选图任务<textarea rows={3} value={anchorPurpose} onChange={(event) => setAnchorPurpose(event.target.value)} /></label>
          <button
            className="button primary full"
            disabled={workspace?.styleProfile?.status !== 'confirmed' || !imageApiProfileId || Boolean(busy)}
            onClick={() => void runProductionAction(
              () => window.masterpiece.creativeProduction.generateAnchor(project.id, {
                purpose: anchorPurpose,
                aspectRatio: '1:1',
                apiProfileId: imageApiProfileId || undefined
              })
            )}
          >{busy === 'generating' ? '正在生成 Anchor…' : '生成 Anchor Candidate'}</button>
        </div>}
        {activeAnchor && <div className="anchor-review-card">
          {anchorRunView?.imageUrls[0] && <img src={anchorRunView.imageUrls[0]} alt="Anchor Candidate" />}
          <div className="production-summary-card">
            <small>CANDIDATE / REVISION {activeAnchor.revision}</small>
            <h3>{activeAnchor.task.purpose}</h3>
            <span className={`badge ${activeAnchor.status === 'accepted' ? 'completed' : 'ready'}`}>
              {activeAnchor.status}
            </span>
            {activeAnchor.status === 'generation_failed' && <p className="error-text">
              {activeAnchor.generationFailure?.errorMessage || '图片生成失败，请重试。'}
            </p>}
          </div>
          {activeAnchor.status === 'pending_review' && <>
            <div className="anchor-score-grid">
              {ANCHOR_DIMENSIONS.map(({ key, label }) => <label key={key}>{label}
                <select value={reviewScores[key]} onChange={(event) => setReviewScores((current) => ({
                  ...current,
                  [key]: Number(event.target.value)
                }))}>
                  {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} 分</option>)}
                </select>
              </label>)}
            </div>
            <label>审核意见<textarea rows={3} value={reviewFeedback} onChange={(event) => setReviewFeedback(event.target.value)} /></label>
            <div className="button-row">
              <button className="button primary" disabled={Boolean(busy)} onClick={() => void runProductionAction(
                () => window.masterpiece.creativeProduction.reviewAnchor(project.id, activeAnchor.id, {
                  action: 'accept_primary',
                  feedback: reviewFeedback || '接受为 Primary Canon。',
                  evaluation: anchorEvaluation()
                })
              )}>接受为 Primary Canon</button>
              <button className="button secondary" disabled={Boolean(busy)} onClick={() => void runProductionAction(
                () => window.masterpiece.creativeProduction.reviewAnchor(project.id, activeAnchor.id, {
                  action: 'minor_adjustment',
                  feedback: reviewFeedback || '需要轻微调整。',
                  evaluation: anchorEvaluation()
                })
              )}>轻微调整</button>
              <button className="button ghost" disabled={Boolean(busy)} onClick={() => void runProductionAction(
                () => window.masterpiece.creativeProduction.reviewAnchor(project.id, activeAnchor.id, {
                  action: 'reject',
                  feedback: reviewFeedback || '当前方向不通过。',
                  evaluation: anchorEvaluation()
                })
              )}>驳回</button>
            </div>
          </>}
          {['generation_failed', 'revision_required', 'rejected'].includes(activeAnchor.status) && <button
            className="button primary full"
            disabled={!imageApiProfileId || Boolean(busy)}
            onClick={() => void runProductionAction(
              () => window.masterpiece.creativeProduction.retryAnchor(
                project.id,
                activeAnchor.id,
                { apiProfileId: imageApiProfileId || undefined }
              )
            )}
          >生成下一版 Anchor</button>}
        </div>}
      </section>
    </div>}

    {tab === 'canon' && <div className="creative-production-grid">
      <section className="panel">
        <div className="section-heading"><span>01</span><div><h2>Primary Canon</h2><p>已接受的 Anchor 基准</p></div></div>
        {activeAnchor?.status === 'accepted' ? <div className="production-summary-card">
          {anchorRunView?.imageUrls[0] && <img src={anchorRunView.imageUrls[0]} alt="Primary Canon" />}
          <h3>{activeAnchor.task.purpose}</h3>
          <p>Style Profile {activeAnchor.styleProfileVersion}</p>
        </div> : <div className="empty-state small">请先在 Anchor 审核页接受一个 Candidate。</div>}
      </section>
      <section className="panel">
        <div className="section-heading"><span>02</span><div><h2>Visual Canon</h2><p>共享规则、变化规则与冲突警告</p></div></div>
        {!currentCanon && activeAnchor?.status === 'accepted' && <button
          className="button primary full"
          disabled={Boolean(busy)}
          onClick={() => void runProductionAction(
            () => window.masterpiece.creativeProduction.buildVisualCanon(project.id, {
              primaryCandidateId: activeAnchor.id
            })
          )}
        >从 Primary Anchor 建立 Visual Canon</button>}
        {currentCanon && <div className="canon-details">
          <div className="production-summary-card">
            <small>VISUAL CANON / {currentCanon.version}</small>
            <h3>{currentCanon.name}</h3>
            <span className={`badge ${currentCanon.status === 'confirmed' ? 'completed' : 'ready'}`}>
              {currentCanon.status}
            </span>
          </div>
          <h4>Shared Rules</h4>
          <ul>{currentCanon.sharedRules.map((item) => <li key={item}>{item}</li>)}</ul>
          <h4>Variation Rules</h4>
          <ul>{currentCanon.variationRules.map((item) => <li key={item}>{item}</li>)}</ul>
          <h4>Conflict Warnings</h4>
          {currentCanon.conflicts.length
            ? <ul>{currentCanon.conflicts.map((item, index) =>
              <li key={`${item.dimension}-${index}`}>{item.severity} · {item.message}</li>)}</ul>
            : <p>未发现冲突。</p>}
          {currentCanon.status !== 'confirmed' && <button
            className="button primary full"
            disabled={Boolean(busy) || currentCanon.conflicts.some((item) => item.severity === 'blocking')}
            onClick={() => void runProductionAction(
              () => window.masterpiece.creativeProduction
                .confirmVisualCanon(project.id, currentCanon.id)
            )}
          >确认 Visual Canon</button>}
        </div>}
      </section>
    </div>}

    {tab === 'generation' && <div className="generation-series-workspace">
      <section className="panel generation-series-head">
        <div>
          <p className="eyebrow">GENERATION SERIES</p>
          <h2>{activeSeries?.name || '尚未创建生成系列'}</h2>
          <p>
            Style {workspace?.styleProfile?.version || '—'} · Canon {currentCanon?.version || '—'}
            {activeSeries ? ` · ${activeSeries.tasks.filter((item) => item.status === 'succeeded').length}/${activeSeries.tasks.length}` : ''}
          </p>
        </div>
        {!activeSeries && <button
          className="button primary"
          disabled={currentCanon?.status !== 'confirmed' || Boolean(busy)}
          onClick={() => void runProductionAction(
            () => window.masterpiece.creativeProduction.createSeries(project.id, {
              name: `${project.projectName} 首轮生产系列`,
              tasks: [
                {
                  taskType: 'packaging_render',
                  title: '包装渲染',
                  responsibility: '生成一个真实、完整的升级后包装渲染结果',
                  subject: project.brandName,
                  aspectRatio: '4:5',
                  preserve: currentCanon?.sharedRules || [],
                  change: currentCanon?.variationRules || [],
                  forbidden: workspace?.styleProfile?.forbiddenVariations || []
                },
                {
                  taskType: 'poster',
                  title: '品牌海报',
                  responsibility: '生成一张单一主画面的升级后品牌海报',
                  subject: project.brandName,
                  aspectRatio: '4:5',
                  preserve: currentCanon?.sharedRules || [],
                  change: currentCanon?.variationRules || [],
                  forbidden: workspace?.styleProfile?.forbiddenVariations || []
                },
                {
                  taskType: 'vi_application',
                  title: 'VI 应用',
                  responsibility: '生成一种明确、真实的品牌 VI 应用',
                  subject: project.brandName,
                  aspectRatio: '4:5',
                  preserve: currentCanon?.sharedRules || [],
                  change: currentCanon?.variationRules || [],
                  forbidden: workspace?.styleProfile?.forbiddenVariations || []
                }
              ]
            })
          )}
        >创建基础系列</button>}
        {activeSeries && <div className="button-row">
          {['ready', 'running', 'failed'].includes(activeSeries.status) && <button
            className="button primary"
            disabled={!imageApiProfileId || Boolean(busy)}
            onClick={() => void runProductionAction(
              () => window.masterpiece.creativeProduction
                .runSeries(project.id, activeSeries.id, imageApiProfileId || undefined)
            )}
          >执行未完成任务</button>}
          {activeSeries.status === 'running' && <button className="button secondary" onClick={() => void runProductionAction(
            () => window.masterpiece.creativeProduction.pauseSeries(project.id, activeSeries.id)
          )}>暂停</button>}
          {activeSeries.status === 'paused' && <button className="button secondary" onClick={() => void runProductionAction(
            () => window.masterpiece.creativeProduction.resumeSeries(project.id, activeSeries.id)
          )}>继续</button>}
          {!['completed', 'cancelled'].includes(activeSeries.status) && <button className="button ghost" onClick={() => void runProductionAction(
            () => window.masterpiece.creativeProduction.cancelSeries(project.id, activeSeries.id)
          )}>取消系列</button>}
        </div>}
      </section>

      {activeSeries && <div className="generation-task-grid">
        {activeSeries.tasks.map((task) => <article className="panel generation-task-card" key={task.id}>
          <div className="task-card-head">
            <span>{task.taskCode}</span>
            <strong>{task.status}</strong>
          </div>
          <h3>{task.title}</h3>
          <p>{task.responsibility}</p>
          <small>{task.aspectRatio} · 尝试 {task.attemptCount} 次 · 版本 {task.mode || 'original'}</small>
          <ul>
            {task.preserve.slice(0, 3).map((item) => <li key={item}>保留 · {item}</li>)}
            {task.change.slice(0, 2).map((item) => <li key={item}>改变 · {item}</li>)}
          </ul>
          {['ready', 'failed'].includes(task.status) && <button
            className="button secondary full"
            disabled={!imageApiProfileId || Boolean(busy) || activeSeries.status === 'paused'}
            onClick={() => void runProductionAction(
              () => window.masterpiece.creativeProduction
                .runSeriesTask(project.id, activeSeries.id, task.id, imageApiProfileId || undefined)
            )}
          >执行此任务</button>}
        </article>)}
      </div>}

      <div className="creative-production-grid generation-output-grid">
        <section className="panel">
          <div className="section-heading"><span>02</span><div><h2>输出与版本</h2><p>候选、正式资产和 Supporting Canon</p></div></div>
          <div className="generation-output-list">
            {production.outputs.length ? production.outputs.map((output) => {
              const view = runViews.find((item) => item.run.runId === output.generationRunId);
              return <article key={output.id}>
                {view?.imageUrls[0] && <img src={view.imageUrls[0]} alt="Generation Output" />}
                <div><strong>V{output.version} · {output.status}</strong><small>{output.taskId}</small></div>
                <div className="button-row">
                  <button onClick={() => setCompareOutputIds((current) => {
                    if (current.includes(output.id)) return current.filter((id) => id !== output.id);
                    return [...current.slice(-1), output.id];
                  })}>{compareOutputIds.includes(output.id) ? '移出对比' : '加入对比'}</button>
                  <button onClick={() => {
                    const task = activeSeries?.tasks.find((item) => item.id === output.taskId);
                    setRevisionDraft({
                      outputId: output.id,
                      taskId: output.taskId,
                      mode: 'edit',
                      preserve: task?.preserve.join('\n') || '',
                      change: ''
                    });
                  }}>创建修正版</button>
                  {output.status === 'candidate' && <button onClick={() => void runProductionAction(
                    () => window.masterpiece.creativeProduction.reviewFormalAsset(
                      project.id, output.seriesId, output.id, { action: 'accept_formal', note: '确认为正式资产。' }
                    )
                  )}>确认为正式资产</button>}
                  {output.status === 'candidate' && <button onClick={() => void runProductionAction(
                    () => window.masterpiece.creativeProduction.reviewFormalAsset(
                      project.id,
                      output.seriesId,
                      output.id,
                      { action: 'promote_supporting_canon', humanConfirmed: true, note: '人工确认提升为 Supporting Canon。' }
                    )
                  )}>提升 Supporting Canon</button>}
                  <button onClick={() => void window.masterpiece.creativeProduction
                    .getRunPrompt(output.generationRunId)
                    .then((prompt) => setPromptDrawer({ runId: output.generationRunId, prompt: prompt || 'Prompt 不可用。' }))
                  }>查看 Prompt</button>
                </div>
              </article>;
            }) : <div className="empty-state small">尚无系列输出。</div>}
          </div>
          {compareOutputIds.length === 2 && <div className="version-compare-grid">
            {compareOutputIds.map((outputId) => {
              const output = production.outputs.find((item) => item.id === outputId);
              const view = output
                ? runViews.find((item) => item.run.runId === output.generationRunId)
                : undefined;
              return output ? <article key={output.id}>
                {view?.imageUrls[0] && <img src={view.imageUrls[0]} alt={`版本 ${output.version}`} />}
                <strong>V{output.version}</strong>
                <small>{output.status} · {output.taskId}</small>
              </article> : null;
            })}
          </div>}
        </section>
        <section className="panel">
          <div className="section-heading"><span>03</span><div><h2>历史系列</h2><p>上下文与版本可追溯</p></div></div>
          <div className="series-history-list">
            {production.series.map((series) => <article key={series.id}>
              <strong>{series.name}</strong>
              <small>{series.status} · Style {series.styleProfileVersion} · Canon {series.visualCanonVersion}</small>
            </article>)}
          </div>
        </section>
      </div>
    </div>}

    {promptDrawer && <div className="modal-overlay" onClick={() => setPromptDrawer(null)}>
      <div className="modal prompt-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><small>RUN {promptDrawer.runId}</small><h2>Prompt Snapshot</h2></div><button onClick={() => setPromptDrawer(null)}>关闭</button></div>
        <pre>{promptDrawer.prompt}</pre>
      </div>
    </div>}
    {revisionDraft && activeSeries && <div className="modal-overlay" onClick={() => setRevisionDraft(null)}>
      <div className="modal prompt-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><small>REVISION</small><h2>创建修正版或变体</h2></div>
          <button onClick={() => setRevisionDraft(null)}>关闭</button>
        </div>
        <label>类型<select
          value={revisionDraft.mode}
          onChange={(event) => setRevisionDraft((current) => current && ({
            ...current,
            mode: event.target.value as 'edit' | 'variant'
          }))}
        ><option value="edit">修正版</option><option value="variant">变体</option></select></label>
        <label>必须保留（每行一条）<textarea
          rows={5}
          value={revisionDraft.preserve}
          onChange={(event) => setRevisionDraft((current) => current && ({
            ...current,
            preserve: event.target.value
          }))}
        /></label>
        <label>本次改变（每行一条）<textarea
          rows={5}
          value={revisionDraft.change}
          onChange={(event) => setRevisionDraft((current) => current && ({
            ...current,
            change: event.target.value
          }))}
        /></label>
        <button
          className="button primary full"
          disabled={!revisionDraft.change.trim() || Boolean(busy)}
          onClick={() => void runProductionAction(async () => {
            await window.masterpiece.creativeProduction.createRevision(project.id, activeSeries.id, {
              parentTaskId: revisionDraft.taskId,
              baseImageId: revisionDraft.outputId,
              mode: revisionDraft.mode,
              preserve: revisionDraft.preserve.split('\n').map((item) => item.trim()).filter(Boolean),
              change: revisionDraft.change.split('\n').map((item) => item.trim()).filter(Boolean)
            });
            setRevisionDraft(null);
          })}
        >创建并加入任务队列</button>
      </div>
    </div>}
  </div>;
}
