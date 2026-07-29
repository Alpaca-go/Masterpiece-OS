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
  VisualCanon,
  VisualExploration
} from '../../../shared/types';
import { cleanError } from '../utils';

interface Props {
  project: ProjectRecord;
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
  metadata: {
    outputType: string;
    promptVersion: string;
    templateId?: string;
    templateVersion?: string;
  } | null;
}

interface EvaluationDraft {
  runId: string;
  brandAlignment: number;
  brandNotes: string;
  visualConsistency: number;
  visualNotes: string;
  assetUsability: number;
  assetNotes: string;
  deviationSeverity: 'none' | 'minor' | 'major';
  deviationFindings: string;
}

interface ProductionState {
  anchors: AnchorCandidate[];
  explorations: VisualExploration[];
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

type CreativeCommandOutputType =
  | 'brand_poster'
  | 'packaging_render'
  | 'interior_scene'
  | 'vi_application';

interface QuickCommand {
  id: string;
  label: string;
  request: string;
  outputType: CreativeCommandOutputType;
  templateLabel: string;
}

const QUICK_COMMANDS: QuickCommand[] = [
  {
    id: 'poster',
    label: '品牌升级海报',
    request: '生成一张升级后的品牌海报',
    outputType: 'brand_poster',
    templateLabel: 'Poster Template'
  },
  {
    id: 'packaging',
    label: '包装效果图',
    request: '生成一张升级后的包装渲染图',
    outputType: 'packaging_render',
    templateLabel: 'Packaging Template'
  },
  {
    id: 'interior',
    label: '店内空间效果图',
    request: '生成一张升级后的店内空间效果图',
    outputType: 'interior_scene',
    templateLabel: 'Interior Template'
  },
  {
    id: 'vi',
    label: 'VI 应用展示',
    request: '生成一张升级后的 VI 应用物料展示图',
    outputType: 'vi_application',
    templateLabel: 'VI Template · 预留'
  }
];

const STATE_LABELS: Partial<Record<CreativeSession['workflowState'], string>> = {
  CREATED: '会话已创建',
  SESSION_CREATED: '会话已创建',
  DIRECTION_GENERATING: '创意总监正在制定方向',
  DIRECTION_READY: '创意方向已制定',
  CREATIVE_DECISION_COMPLETED: '创意决策已完成',
  STYLE_PROFILE_CREATED: '风格档案已建立',
  VISUAL_EXPLORATION_GENERATING: '正在探索视觉方向',
  VISUAL_EXPLORATION_READY: '视觉方向等待设计师选择',
  VISUAL_DIRECTION_SELECTED: '设计师已选择视觉方向',
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
  imageApiProfileId,
  onBack,
  onOpenSettings
}: Props) {
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [runViews, setRunViews] = useState<RunView[]>([]);
  const [production, setProduction] = useState<ProductionState>({
    anchors: [],
    explorations: [],
    styles: [],
    canons: [],
    series: [],
    outputs: []
  });
  const [tab, setTab] = useState<
    'foundation' | 'exploration' | 'anchor' | 'visual-system' | 'versions'
  >('foundation');
  const [explorationCount, setExplorationCount] = useState(5);
  const [anchorPurpose, setAnchorPurpose] = useState('建立新的品牌主视觉方向');
  const [anchorCandidateCount, setAnchorCandidateCount] = useState(3);
  const [selectedAnchorId, setSelectedAnchorId] = useState('');
  const [contextDirection, setContextDirection] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewScores, setReviewScores] = useState<Record<string, number>>(
    Object.fromEntries(ANCHOR_DIMENSIONS.map(({ key }) => [key, 4]))
  );
  const [promptDrawer, setPromptDrawer] = useState<{ runId: string; prompt: string } | null>(null);
  const [evaluationDraft, setEvaluationDraft] = useState<EvaluationDraft | null>(null);
  const [revisionDraft, setRevisionDraft] = useState<{
    outputId: string;
    taskId: string;
    mode: 'edit' | 'variant';
    preserve: string;
    change: string;
  } | null>(null);
  const [compareOutputIds, setCompareOutputIds] = useState<string[]>([]);
  const [request, setRequest] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<QuickCommand | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'loading' | 'reading' | 'generating' | ''>('loading');

  const refresh = useCallback(async () => {
    const [next, anchors, explorations, styles, canons, series] = await Promise.all([
      window.masterpiece.creativeSession.getWorkspace(project.id),
      window.masterpiece.creativeProduction.listAnchorCandidates(project.id),
      window.masterpiece.creativeProduction.listVisualExplorations(project.id),
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
    setProduction({ anchors, explorations, styles, canons, series, outputs });
    const fullRuns = await Promise.all(next.runs.slice(0, 12).map(async (summary) => {
      const run = await window.masterpiece.creativeSession.getRun(summary.runId);
      if (!run) return null;
      const imageUrls = (await Promise.all(run.images.map(async (image) => {
        const value = await window.masterpiece.creativeSession
          .getImageDataUrl(run.runId, image.imageId)
          .catch(() => null);
        return value?.dataUrl || '';
      }))).filter(Boolean);
      const metadata = await window.masterpiece.creativeProduction
        .getRunMetadata(project.id, run.runId)
        .catch(() => null);
      return { run, imageUrls, metadata };
    }));
    setRunViews(fullRuns.filter((item) => item !== null));
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
  const visualRuleGroups = useMemo(() => {
    const profile = workspace?.styleProfile;
    if (!profile) return [];
    return [
      {
        id: 'color',
        label: '色彩',
        rules: [
          ...profile.colorSystem.primary.map((item) => `主色 · ${item}`),
          ...profile.colorSystem.secondary.map((item) => `辅色 · ${item}`),
          ...profile.colorSystem.accent.map((item) => `强调色 · ${item}`),
          ...profile.colorSystem.distributionRules
        ]
      },
      {
        id: 'material',
        label: '材质',
        rules: [
          ...profile.materialAndTexture.materials,
          ...profile.materialAndTexture.surfaceRules,
          ...profile.materialAndTexture.renderingRules
        ]
      },
      {
        id: 'lighting',
        label: '光线',
        rules: [
          profile.lightingSystem.type,
          profile.lightingSystem.contrast,
          profile.lightingSystem.shadow,
          profile.lightingSystem.temperature
        ]
      },
      {
        id: 'composition',
        label: '构图',
        rules: [
          ...profile.compositionSystem.hierarchy,
          `密度 · ${profile.compositionSystem.density}`,
          `留白 · ${profile.compositionSystem.negativeSpace}`,
          ...profile.compositionSystem.focalPointRules,
          ...profile.compositionSystem.croppingRules
        ]
      },
      {
        id: 'typography',
        label: '字体',
        rules: profile.typographyCompatibility
      },
      {
        id: 'spatial',
        label: '空间',
        rules: [
          creativeDirection?.spaceStrategy || '',
          ...profile.compositionSystem.cameraRules,
          ...profile.shapeLanguage.proportionRules
        ]
      },
      {
        id: 'forbidden',
        label: '禁止项',
        rules: [
          ...profile.colorSystem.forbiddenColors,
          ...profile.materialAndTexture.forbiddenTextures,
          ...profile.forbiddenVariations,
          ...profile.promptComponents.negative,
          ...(currentCanon?.conflicts.map((item) => item.message) || [])
        ]
      }
    ].map((group) => ({
      ...group,
      rules: [...new Set(group.rules.map((item) => item.trim()).filter(Boolean))]
    }));
  }, [workspace?.styleProfile, creativeDirection, currentCanon]);

  function evaluationScoreForRun(runId: string) {
    const runEvaluation = runViews.find((item) => item.run.runId === runId)?.run.review?.evaluation;
    if (runEvaluation) return runEvaluation.overallScore;
    const evaluation = production.anchors.find((item) =>
      item.generationRunId === runId)?.evaluation;
    if (!evaluation) return null;
    const values = ANCHOR_DIMENSIONS.map(({ key }) => evaluation[key].score);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function changeSummaryForRun(runId: string) {
    const output = production.outputs.find((item) => item.generationRunId === runId);
    const task = output
      ? production.series.flatMap((item) => item.tasks).find((item) => item.id === output.taskId)
      : undefined;
    if (!task) return '首次生成';
    return task.change.length ? task.change.slice(0, 2).join('；') : task.mode || '首次生成';
  }

  async function generate() {
    const userRequest = request.trim();
    if (!userRequest) return;
    setBusy('generating');
    setError('');
    try {
      await window.masterpiece.creativeSession.generate(project.id, {
        userRequest,
        apiProfileId: imageApiProfileId || undefined,
        outputType: selectedCommand?.outputType
      });
      setRequest('');
      setSelectedCommand(null);
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
  const activeAnchor = anchorsForCurrentStyle.find((item) => item.id === selectedAnchorId)
    || anchorsForCurrentStyle.find((item) => item.status === 'accepted')
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
      <button className={tab === 'foundation' ? 'active' : ''} onClick={() => setTab('foundation')}>Creative Foundation</button>
      <button className={tab === 'exploration' ? 'active' : ''} onClick={() => setTab('exploration')}>Visual Exploration</button>
      <button className={tab === 'anchor' ? 'active' : ''} onClick={() => setTab('anchor')}>Anchor</button>
      <button className={tab === 'visual-system' ? 'active' : ''} onClick={() => setTab('visual-system')}>Visual System</button>
      <button className={tab === 'versions' ? 'active' : ''} onClick={() => setTab('versions')}>Versions</button>
    </nav>
    {tab === 'foundation' && <div className="creative-session-layout">
      <aside className="panel creative-context-panel">
        <div className="section-heading"><span>01</span><div><h2>Creative Foundation</h2><p>AI 已建立完成的设计基础，不是待办任务</p></div></div>
        <ul className="creative-checks">
          <li className={understanding ? 'pass' : ''}>{understanding ? '✓' : '○'} Visual Analysis 完成</li>
          <li className={understanding ? 'pass' : ''}>{understanding ? '✓' : '○'} Brand Understanding</li>
          <li className={creativeDirection ? 'pass' : ''}>{creativeDirection ? '✓' : '○'} Creative Direction</li>
          <li className={workspace?.styleProfile?.status === 'confirmed' ? 'pass' : ''}>
            {workspace?.styleProfile?.status === 'confirmed' ? '✓' : '○'} Style Profile
          </li>
          <li className={currentCanon?.status === 'confirmed' ? 'pass' : ''}>
            {currentCanon?.status === 'confirmed' ? '✓' : '○'} Visual System
          </li>
        </ul>
        {!understanding && <div className="foundation-gate">
          <p>Creative Foundation 尚未建立。请先返回 Visual Analysis 完成项目理解。</p>
          <button className="button primary full" onClick={onBack}>返回 Visual Analysis</button>
        </div>}
        {understanding && <div className="understanding-summary">
          <small>BRAND UNDERSTANDING</small>
          <h3>{understanding.projectIdentity.brandName || project.brandName}</h3>
          <p>{understanding.projectIdentity.industry || '行业待确认'}</p>
          <small>身份锁定 · {understanding.identityLocks.length}</small>
          <ul>{understanding.identityLocks.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
          <small>升级原则</small>
          <ul>{understanding.upgradePrinciples.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
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
        {workspace?.styleProfile && <div className="understanding-summary">
          <small>STYLE PROFILE · {workspace.styleProfile.version}</small>
          <h3>{workspace.styleProfile.name}</h3>
          <p>{workspace.styleProfile.styleEssence.summary}</p>
        </div>}
      </aside>

      <main className="panel creative-conversation-panel">
        <div className="section-heading"><span>02</span><div><h2>Creative Command</h2><p>描述本次创作需求，继承已确认的设计基础</p></div></div>
        <div className="creative-message-list">
          {recentMessages.length ? recentMessages.map((message) =>
            <article className={`creative-message ${message.role}`} key={message.messageId}>
              <small>{message.role === 'user' ? '你' : message.role === 'assistant' ? '生成记录' : '系统'}</small>
              <p>{message.content}</p>
            </article>
          ) : <div className="empty-state small">完成项目理解后，输入这次想生成什么。</div>}
        </div>
        <div className="quick-task-row" aria-label="快捷创作入口">
          {QUICK_COMMANDS.map((item) => <button
            key={item.id}
            className={selectedCommand?.id === item.id ? 'active' : ''}
            onClick={() => {
              setSelectedCommand(item);
              setRequest(item.request);
            }}
          >{item.label}</button>)}
        </div>
        <div className="creative-command-pipeline">
          <span>{selectedCommand?.templateLabel || '选择输出类型'}</span>
          <i>→</i>
          <span>Prompt Compiler</span>
          <i>→</i>
          <span>Image Generation Adapter</span>
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
        <div className="section-heading"><span>03</span><div><h2>Generation History</h2><p>{workspace?.runs.length || 0} 次历史运行</p></div></div>
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

    {tab === 'exploration' && <div className="visual-exploration-workspace">
      <section className="panel visual-exploration-head">
        <div>
          <p className="eyebrow">VISUAL EXPLORATION SYSTEM</p>
          <h2>在建立 Visual Canon 前探索多个视觉方向</h2>
          <p>Concept Image 只表达色彩、材质、光线、空间和构图关系，不继承 Logo、文字与具体版式。</p>
        </div>
        <div className="visual-exploration-controls">
          <label>概念数量
            <select
              value={explorationCount}
              onChange={(event) => setExplorationCount(Number(event.target.value))}
            >
              {[4, 5, 6].map((count) => <option key={count} value={count}>{count} 张</option>)}
            </select>
          </label>
          <button
            className="button primary"
            disabled={
              workspace?.styleProfile?.status !== 'confirmed'
              || !imageApiProfileId
              || Boolean(busy)
            }
            onClick={() => void runProductionAction(
              () => window.masterpiece.creativeProduction.generateVisualExploration(project.id, {
                conceptCount: explorationCount,
                apiProfileId: imageApiProfileId || undefined
              })
            )}
          >生成 Visual Exploration</button>
        </div>
      </section>
      {production.explorations.length ? production.explorations.map((exploration) =>
        <section className="panel" key={exploration.id}>
          <div className="section-heading">
            <span>{exploration.conceptCount}</span>
            <div>
              <h2>Concept Images</h2>
              <p>{exploration.status} · Direction {exploration.creativeDirectionVersion}</p>
            </div>
          </div>
          <div className="visual-concept-grid">
            {exploration.concepts.map((concept) => {
              const view = concept.generationRunId
                ? runViews.find((item) => item.run.runId === concept.generationRunId)
                : undefined;
              return <article key={concept.id}>
                {view?.imageUrls[0]
                  ? <img src={view.imageUrls[0]} alt={concept.title} />
                  : <div className="history-image-placeholder">{concept.status}</div>}
                <div>
                  <small>{String(concept.index).padStart(2, '0')} · {concept.type}</small>
                  <h3>{concept.title}</h3>
                  <p>{concept.objective}</p>
                  {concept.errorMessage && <p className="error-inline">{concept.errorMessage}</p>}
                </div>
              </article>;
            })}
          </div>
        </section>
      ) : <section className="panel empty-state">
        尚未生成视觉探索。系统会创建 Space、Packaging、Product Scene、Graphic 与 Material Concept。
      </section>}
    </div>}

    {tab === 'anchor' && <div className="creative-production-grid">
      <section className="panel">
        <div className="section-heading"><span>01</span><div><h2>生产上下文</h2><p>Style Profile 与 Locked Assets</p></div></div>
        {!understanding && <div className="empty-state small">请先返回 Visual Analysis 建立 Creative Foundation。</div>}
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
        <div className="section-heading"><span>02</span><div><h2>Anchor Candidates</h2><p>多候选比较与人工 Primary 选择</p></div></div>
        <div className="anchor-create-form">
          <label>候选图任务<textarea rows={3} value={anchorPurpose} onChange={(event) => setAnchorPurpose(event.target.value)} /></label>
          <label>候选数量<select
            value={anchorCandidateCount}
            onChange={(event) => setAnchorCandidateCount(Number(event.target.value))}
          >
            {[2, 3, 4].map((count) => <option key={count} value={count}>{count} 个候选</option>)}
          </select></label>
          <button
            className="button primary full"
            disabled={workspace?.styleProfile?.status !== 'confirmed' || !imageApiProfileId || Boolean(busy)}
            onClick={() => void runProductionAction(async () => {
              const result = await window.masterpiece.creativeProduction.generateAnchorSet(project.id, {
                purpose: anchorPurpose,
                aspectRatio: '1:1',
                candidateCount: anchorCandidateCount,
                apiProfileId: imageApiProfileId || undefined
              });
              setSelectedAnchorId(result.results[0]?.candidate.id || '');
            })}
          >{busy === 'generating' ? '正在生成候选组…' : `生成 ${anchorCandidateCount} 个候选`}</button>
        </div>
        {anchorsForCurrentStyle.length > 0 && <div className="anchor-comparison-grid">
          {anchorsForCurrentStyle.map((candidate) => {
            const view = candidate.generationRunId
              ? runViews.find((item) => item.run.runId === candidate.generationRunId)
              : undefined;
            const score = candidate.generationRunId
              ? evaluationScoreForRun(candidate.generationRunId)
              : null;
            return <button
              type="button"
              key={candidate.id}
              className={activeAnchor?.id === candidate.id ? 'active' : ''}
              onClick={() => setSelectedAnchorId(candidate.id)}
            >
              {view?.imageUrls[0]
                ? <img src={view.imageUrls[0]} alt={`Anchor Candidate ${candidate.candidateIndex || ''}`} />
                : <div className="anchor-candidate-placeholder">{candidate.status}</div>}
              <span>
                候选 {candidate.candidateIndex || candidate.revision}
                {candidate.candidateCount ? ` / ${candidate.candidateCount}` : ''}
              </span>
              <small>{candidate.status} · {score === null ? '待评估' : `${score.toFixed(1)} 分`}</small>
            </button>;
          })}
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

    {tab === 'visual-system' && <div className="creative-production-grid">
      <section className="panel">
        <div className="section-heading"><span>01</span><div><h2>Primary Canon</h2><p>已接受的 Anchor 基准</p></div></div>
        {activeAnchor?.status === 'accepted' ? <div className="production-summary-card">
          {anchorRunView?.imageUrls[0] && <img src={anchorRunView.imageUrls[0]} alt="Primary Canon" />}
          <h3>{activeAnchor.task.purpose}</h3>
          <p>Style Profile {activeAnchor.styleProfileVersion}</p>
        </div> : <div className="empty-state small">请先在 Anchor 审核页接受一个 Candidate。</div>}
      </section>
      <section className="panel">
        <div className="section-heading"><span>02</span><div><h2>Visual System</h2><p>从 Style Profile 与 Canon 汇总的可执行规则库</p></div></div>
        {!currentCanon && activeAnchor?.status === 'accepted' && <button
          className="button primary full"
          disabled={Boolean(busy)}
          onClick={() => void runProductionAction(
            () => window.masterpiece.creativeProduction.buildVisualCanon(project.id, {
              primaryCandidateId: activeAnchor.id
            })
          )}
        >从 Primary Anchor 建立 Visual Canon</button>}
        {workspace?.styleProfile && <div className="visual-rule-library">
          {visualRuleGroups.map((group) => <article key={group.id}>
            <div><span>{group.label}</span><small>{group.rules.length} 条规则</small></div>
            {group.rules.length
              ? <ul>{group.rules.slice(0, 8).map((item) => <li key={item}>{item}</li>)}</ul>
              : <p>当前 Style Profile 未定义此类规则。</p>}
          </article>)}
        </div>}
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

    {tab === 'versions' && <div className="generation-series-workspace">
      <section className="panel generation-history-overview">
        <div className="section-heading"><span>01</span><div><h2>Generation History</h2><p>图像、Prompt、模型、评估与修改记录</p></div></div>
        <div className="generation-history-grid">
          {runViews.length ? runViews.map(({ run, imageUrls, metadata }) => {
            const evaluationScore = evaluationScoreForRun(run.runId);
            return <article key={run.runId}>
              {imageUrls[0]
                ? <img src={imageUrls[0]} alt="Generation History" />
                : <div className="history-image-placeholder">{run.status}</div>}
              <div className="generation-history-meta">
                <strong>{metadata?.outputType || run.outputType}</strong>
                {run.review?.evaluation && <>
                  <small>Deviation Detection · {run.review.evaluation.deviationDetection.severity}</small>
                  <small>Prompt Adjustment · {run.review.evaluation.promptAdjustments.join(' / ')}</small>
                </>}
                {run.images.length > 0 && <div className="button-row evaluation-actions">
                  <button onClick={() => setEvaluationDraft({
                    runId: run.runId,
                    brandAlignment: run.review?.evaluation?.brandAlignment.score || 4,
                    brandNotes: run.review?.evaluation?.brandAlignment.notes || '品牌表达与 Visual Canon 基本一致。',
                    visualConsistency: run.review?.evaluation?.visualConsistency.score || 4,
                    visualNotes: run.review?.evaluation?.visualConsistency.notes || '色彩、材质、光线与构图系统基本一致。',
                    assetUsability: run.review?.evaluation?.assetUsability.score || 4,
                    assetNotes: run.review?.evaluation?.assetUsability.notes || '当前结果可用于后续设计与交付。',
                    deviationSeverity: run.review?.evaluation?.deviationDetection.severity || 'none',
                    deviationFindings: run.review?.evaluation?.deviationDetection.findings.join('\n') || ''
                  })}>评估此版本</button>
                  {run.review?.evaluation && <button
                    disabled={!imageApiProfileId || Boolean(busy)}
                    onClick={() => void runProductionAction(
                      () => window.masterpiece.creativeSession.regenerateFromEvaluation(
                        project.id,
                        run.runId,
                        imageApiProfileId || undefined
                      )
                    )}
                  >按评价重新生成</button>}
                </div>}
                <small>Run · {run.runId}</small>
                <small>Prompt · {metadata?.promptVersion || 'Legacy / unavailable'}</small>
                <small>Model · {run.providerId} / {run.modelId}</small>
                <small>Evaluation Score · {evaluationScore === null ? '待评估' : evaluationScore.toFixed(1)}</small>
                <small>修改内容 · {changeSummaryForRun(run.runId)}</small>
              </div>
            </article>;
          }) : <div className="empty-state small">尚无生成历史。</div>}
        </div>
      </section>
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
    {evaluationDraft && <div className="modal-overlay" onClick={() => setEvaluationDraft(null)}>
      <div className="modal prompt-drawer evaluation-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><small>IMAGE EVALUATION</small><h2>图像评价与偏差检测</h2></div>
          <button onClick={() => setEvaluationDraft(null)}>关闭</button>
        </div>
        {([
          ['brandAlignment', 'brandNotes', 'Brand Alignment', '品牌一致性'],
          ['visualConsistency', 'visualNotes', 'Visual Consistency', '视觉系统一致性'],
          ['assetUsability', 'assetNotes', 'Asset Usability', '资产可用性']
        ] as const).map(([scoreKey, notesKey, label, help]) => <fieldset key={scoreKey}>
          <legend>{label} · {help}</legend>
          <label>评分（1–5）
            <select
              value={evaluationDraft[scoreKey]}
              onChange={(event) => setEvaluationDraft((current) => current && ({
                ...current,
                [scoreKey]: Number(event.target.value)
              }))}
            >
              {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
            </select>
          </label>
          <label>评价说明
            <textarea
              rows={2}
              value={evaluationDraft[notesKey]}
              onChange={(event) => setEvaluationDraft((current) => current && ({
                ...current,
                [notesKey]: event.target.value
              }))}
            />
          </label>
        </fieldset>)}
        <fieldset>
          <legend>Deviation Detection · 偏差检测</legend>
          <label>偏差程度
            <select
              value={evaluationDraft.deviationSeverity}
              onChange={(event) => setEvaluationDraft((current) => current && ({
                ...current,
                deviationSeverity: event.target.value as EvaluationDraft['deviationSeverity']
              }))}
            >
              <option value="none">无偏差</option>
              <option value="minor">轻微偏差</option>
              <option value="major">重大偏差</option>
            </select>
          </label>
          <label>偏差项（每行一条）
            <textarea
              rows={4}
              value={evaluationDraft.deviationFindings}
              onChange={(event) => setEvaluationDraft((current) => current && ({
                ...current,
                deviationFindings: event.target.value
              }))}
            />
          </label>
        </fieldset>
        <button
          className="button primary full"
          disabled={
            Boolean(busy)
            || !evaluationDraft.brandNotes.trim()
            || !evaluationDraft.visualNotes.trim()
            || !evaluationDraft.assetNotes.trim()
            || (evaluationDraft.deviationSeverity !== 'none' && !evaluationDraft.deviationFindings.trim())
          }
          onClick={() => void runProductionAction(async () => {
            await window.masterpiece.creativeSession.evaluate(project.id, evaluationDraft.runId, {
              brandAlignment: {
                score: evaluationDraft.brandAlignment,
                notes: evaluationDraft.brandNotes.trim()
              },
              visualConsistency: {
                score: evaluationDraft.visualConsistency,
                notes: evaluationDraft.visualNotes.trim()
              },
              assetUsability: {
                score: evaluationDraft.assetUsability,
                notes: evaluationDraft.assetNotes.trim()
              },
              deviationDetection: {
                severity: evaluationDraft.deviationSeverity,
                findings: evaluationDraft.deviationFindings
                  .split('\n').map((item) => item.trim()).filter(Boolean)
              }
            });
            setEvaluationDraft(null);
          })}
        >保存评价并生成 Prompt Adjustment</button>
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
