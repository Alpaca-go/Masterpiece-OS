import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CreativeSession,
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

export function CreativeSessionWorkspace({ project, apiProfileId, onBack, onOpenSettings }: Props) {
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [runViews, setRunViews] = useState<RunView[]>([]);
  const [request, setRequest] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'loading' | 'reading' | 'generating' | ''>('loading');

  const refresh = useCallback(async () => {
    const next = await window.masterpiece.creativeSession.getWorkspace(project.id);
    setWorkspace(next);
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
        apiProfileId: apiProfileId || undefined
      });
      setRequest('');
      await refresh();
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy('');
    }
  }

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
    <div className="creative-session-layout">
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
          需要先在当前项目流程中确认 Style Profile 与 Visual Canon，系统不会在方向未确认时直接生图。
        </p>}
        <button
          className="button primary full"
          disabled={!canGenerate || !request.trim() || Boolean(busy)}
          onClick={() => void generate()}
        >{busy === 'generating' ? '正在创作…' : '开始创作'}</button>
      </main>

      <aside className="panel creative-results-panel">
        <div className="section-heading"><span>03</span><div><h2>生成结果</h2><p>{workspace?.runs.length || 0} 次历史运行</p></div></div>
        <div className="creative-result-list">
          {runViews.length ? runViews.map(({ run, imageUrls }) => <article key={run.runId}>
            {imageUrls.map((url, index) => <img key={`${run.runId}-${index}`} src={url} alt="生成结果" />)}
            <div><strong>{run.status}</strong><small>{new Date(run.createdAt).toLocaleString()}</small></div>
            {run.errorMessage && <p className="error-text">{run.errorMessage}</p>}
          </article>) : <div className="empty-state small">尚无生成结果。</div>}
        </div>
      </aside>
    </div>
  </div>;
}
