import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CreativeSession,
  AnchorCandidate,
  AnchorCandidateEvaluation,
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
  const [production, setProduction] = useState<ProductionState>({ anchors: [], styles: [], canons: [] });
  const [tab, setTab] = useState<'session' | 'anchor' | 'canon' | 'generation'>('session');
  const [anchorPurpose, setAnchorPurpose] = useState('建立新的品牌主视觉方向');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewScores, setReviewScores] = useState<Record<string, number>>(
    Object.fromEntries(ANCHOR_DIMENSIONS.map(({ key }) => [key, 4]))
  );
  const [request, setRequest] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'loading' | 'reading' | 'generating' | ''>('loading');

  const refresh = useCallback(async () => {
    const [next, anchors, styles, canons] = await Promise.all([
      window.masterpiece.creativeSession.getWorkspace(project.id),
      window.masterpiece.creativeProduction.listAnchorCandidates(project.id),
      window.masterpiece.creativeProduction.listStyleProfiles(project.id),
      window.masterpiece.creativeProduction.listVisualCanons(project.id)
    ]);
    setWorkspace(next);
    setProduction({ anchors, styles, canons });
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
  const canGenerate = Boolean(
    understanding
    && workspace?.styleProfile?.status === 'confirmed'
    && workspace?.visualCanon?.status === 'confirmed'
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

  const activeAnchor = production.anchors.find((item) => item.status === 'accepted')
    || production.anchors[0];
  const anchorRunView = activeAnchor?.generationRunId
    ? runViews.find((item) => item.run.runId === activeAnchor.generationRunId)
    : undefined;

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
    {(tab === 'session' || tab === 'generation') && <div className="creative-session-layout">
      <aside className="panel creative-context-panel">
        <div className="section-heading"><span>01</span><div><h2>项目理解</h2><p>持续上下文与已确认基准</p></div></div>
        <ul className="creative-checks">
          <li className="pass">✓ 原视觉方案</li>
          <li className={project.lastReportFilename ? 'pass' : ''}>✓ 视觉分析报告</li>
          <li className={understanding ? 'pass' : ''}>{understanding ? '✓' : '○'} 品牌身份与保留资产</li>
          <li className={understanding ? 'pass' : ''}>{understanding ? '✓' : '○'} 升级原则与旧模式禁区</li>
          <li className={workspace?.styleProfile?.status === 'confirmed' ? 'pass' : ''}>
            {workspace?.styleProfile?.status === 'confirmed' ? '✓' : '○'} Style Profile
          </li>
          <li className={workspace?.visualCanon?.status === 'confirmed' ? 'pass' : ''}>
            {workspace?.visualCanon?.status === 'confirmed' ? '✓' : '○'} Visual Canon
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
            disabled={!understanding || !request.trim() || Boolean(busy)}
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
        {understanding && !workspace?.styleProfile && <button
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
        {!workspace?.visualCanon && activeAnchor?.status === 'accepted' && <button
          className="button primary full"
          disabled={Boolean(busy)}
          onClick={() => void runProductionAction(
            () => window.masterpiece.creativeProduction.buildVisualCanon(project.id, {
              primaryCandidateId: activeAnchor.id
            })
          )}
        >从 Primary Anchor 建立 Visual Canon</button>}
        {workspace?.visualCanon && <div className="canon-details">
          <div className="production-summary-card">
            <small>VISUAL CANON / {workspace.visualCanon.version}</small>
            <h3>{workspace.visualCanon.name}</h3>
            <span className={`badge ${workspace.visualCanon.status === 'confirmed' ? 'completed' : 'ready'}`}>
              {workspace.visualCanon.status}
            </span>
          </div>
          <h4>Shared Rules</h4>
          <ul>{workspace.visualCanon.sharedRules.map((item) => <li key={item}>{item}</li>)}</ul>
          <h4>Variation Rules</h4>
          <ul>{workspace.visualCanon.variationRules.map((item) => <li key={item}>{item}</li>)}</ul>
          <h4>Conflict Warnings</h4>
          {workspace.visualCanon.conflicts.length
            ? <ul>{workspace.visualCanon.conflicts.map((item, index) =>
              <li key={`${item.dimension}-${index}`}>{item.severity} · {item.message}</li>)}</ul>
            : <p>未发现冲突。</p>}
          {workspace.visualCanon.status !== 'confirmed' && <button
            className="button primary full"
            disabled={Boolean(busy) || workspace.visualCanon.conflicts.some((item) => item.severity === 'blocking')}
            onClick={() => void runProductionAction(
              () => window.masterpiece.creativeProduction
                .confirmVisualCanon(project.id, workspace.visualCanon!.id)
            )}
          >确认 Visual Canon</button>}
        </div>}
      </section>
    </div>}
  </div>;
}
