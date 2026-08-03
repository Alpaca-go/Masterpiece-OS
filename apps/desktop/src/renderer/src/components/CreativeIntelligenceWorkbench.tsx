import { useEffect, useMemo, useState } from 'react';
import type {
  ApiProfile,
  CreativeIntelligenceAnalysisOutput,
  CreativeIntelligenceDecisionBundle,
  CreativeIntelligenceDirection,
  CreativeIntelligenceDirectionArtifacts,
  ProjectRecord,
  UserDirectionDecisionInput
} from '../../../shared/types.ts';
import { cleanError } from '../utils.ts';

type SourceMode = 'visual' | 'document' | 'joint';
type DecisionMode = 'fast' | 'guided';

interface Props {
  project: ProjectRecord;
  profiles: ApiProfile[];
  selectedApiProfileId: string;
  onApiProfileChange(profileId: string): void;
  onBack(): void;
  onContinueProduction(): void;
}

const SOURCE_LABELS: Record<SourceMode, { title: string; description: string }> = {
  visual: { title: '视觉方案', description: '判断当前已经长什么样，以及保留、重构和淘汰项。' },
  document: { title: '品牌文档', description: '从已关联文档理解品牌意图、业务问题和设计约束。' },
  joint: { title: '联合分析', description: '对照品牌意图与当前视觉表达，识别表达差距。' }
};

const OPPORTUNITY_SECTIONS = [
  ['mustKeep', '必须保留'],
  ['canReconstruct', '可重构'],
  ['shouldAvoid', '应避免'],
  ['canOwn', '可长期占有']
] as const;

const MERGE_FIELDS: Array<{ key: keyof CreativeIntelligenceDirection; label: string }> = [
  { key: 'visualHammer', label: '视觉锤' },
  { key: 'compositionLogic', label: '构图逻辑' },
  { key: 'imageMaterialLogic', label: '材质 / 图像逻辑' }
];

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function CreativeIntelligenceWorkbench({
  project, profiles, selectedApiProfileId, onApiProfileChange, onBack, onContinueProduction
}: Props) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('visual');
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('guided');
  const [analysis, setAnalysis] = useState<CreativeIntelligenceAnalysisOutput | null>(null);
  const [directions, setDirections] = useState<CreativeIntelligenceDirectionArtifacts | null>(null);
  const [decision, setDecision] = useState<CreativeIntelligenceDecisionBundle | null>(null);
  const [selectedDirectionId, setSelectedDirectionId] = useState('');
  const [acceptedText, setAcceptedText] = useState('');
  const [rejectedText, setRejectedText] = useState('');
  const [rationale, setRationale] = useState('');
  const [merged, setMerged] = useState<UserDirectionDecisionInput['mergedElements']>([]);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const reasoningProfiles = profiles.filter((profile) => profile.isEnabled && profile.hasApiKey && profile.modelType !== 'image_generation');
  const activeProfileId = reasoningProfiles.some((profile) => profile.id === selectedApiProfileId)
    ? selectedApiProfileId
    : (reasoningProfiles.find((profile) => profile.isDefault) || reasoningProfiles[0])?.id || '';

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.masterpiece.creativeIntelligence.getAnalysis(project.id).catch(() => null),
      window.masterpiece.creativeIntelligence.getDirections(project.id).catch(() => null),
      window.masterpiece.creativeIntelligence.getDecision(project.id).catch(() => null)
    ]).then(([nextAnalysis, nextDirections, nextDecision]) => {
      if (cancelled) return;
      if (nextAnalysis) {
        setAnalysis(nextAnalysis);
        setSourceMode(nextAnalysis.mode);
      }
      if (nextDirections) setDirections(nextDirections);
      if (nextDecision) setDecision(nextDecision);
    });
    return () => { cancelled = true; };
  }, [project.id]);

  const scoreByDirection = useMemo(() => new Map(
    (directions?.directionEvaluation.scores || []).map((score) => [score.directionId, score])
  ), [directions]);

  async function buildAnalysis() {
    setBusy('analysis'); setError('');
    try {
      const output = await window.masterpiece.creativeIntelligence.buildAnalysis(project.id, { sourceMode });
      setAnalysis(output); setDirections(null); setDecision(null);
    } catch (cause) { setError(cleanError(cause)); }
    finally { setBusy(''); }
  }

  async function generateDirections() {
    setBusy('directions'); setError('');
    try {
      if (!analysis || analysis.mode !== sourceMode) {
        const refreshed = await window.masterpiece.creativeIntelligence.buildAnalysis(project.id, { sourceMode });
        setAnalysis(refreshed);
      }
      const output = await window.masterpiece.creativeIntelligence.generateDirections(project.id, { apiProfileId: activeProfileId });
      setDirections(output); setDecision(null); setSelectedDirectionId(''); setMerged([]); setEliminated([]);
    } catch (cause) { setError(cleanError(cause)); }
    finally { setBusy(''); }
  }

  function toggleMerge(direction: CreativeIntelligenceDirection, key: keyof CreativeIntelligenceDirection) {
    const id = `${direction.id}:${String(key)}`;
    setMerged((current = []) => current.some((item) => `${item.fromDirectionId}:${item.elementType}` === id)
      ? current.filter((item) => `${item.fromDirectionId}:${item.elementType}` !== id)
      : [...current, { fromDirectionId: direction.id, elementType: String(key), content: String(direction[key]) }]);
  }

  function toggleEliminated(direction: CreativeIntelligenceDirection) {
    setEliminated((current) => current.includes(direction.id)
      ? current.filter((id) => id !== direction.id)
      : [...current, direction.id]);
  }

  async function saveDraft() {
    if (!directions) return;
    setBusy('draft'); setError('');
    try {
      await window.masterpiece.creativeIntelligence.saveDraft(project.id, decisionInput());
    } catch (cause) { setError(cleanError(cause)); }
    finally { setBusy(''); }
  }

  function decisionInput(): UserDirectionDecisionInput {
    const eliminatedLabels = (directions?.directionSet.directions || [])
      .filter((direction) => eliminated.includes(direction.id))
      .map((direction) => `淘汰方向 ${direction.id}：${direction.name}`);
    return {
      selectedDirectionId,
      acceptedElements: lines(acceptedText),
      rejectedElements: [...lines(rejectedText), ...eliminatedLabels],
      mergedElements: merged,
      userRationale: rationale
    };
  }

  async function confirmDecision() {
    setBusy('confirm'); setError('');
    try {
      const output = await window.masterpiece.creativeIntelligence.confirm(project.id, decisionInput());
      setDecision(output);
    } catch (cause) { setError(cleanError(cause)); }
    finally { setBusy(''); }
  }

  return <div className="page ci-workbench">
    <header className="page-header ci-header">
      <div><p className="eyebrow">CREATIVE INTELLIGENCE V2</p><h1>分析与创意决策工作台</h1><p>{project.projectName} · 从证据到唯一正式决策</p></div>
      <div className="button-row"><button className="button ghost" onClick={onBack}>返回项目</button>{decision?.creativeDecision && <button className="button primary" onClick={onContinueProduction}>进入视觉生成</button>}</div>
    </header>

    {error && <div className="notice error top-notice">{error}</div>}

    <section className="panel ci-control-panel">
      <div className="ci-control-block"><small>01 · 资料类型</small><div className="ci-segmented three">{(Object.keys(SOURCE_LABELS) as SourceMode[]).map((mode) => <button key={mode} className={sourceMode === mode ? 'active' : ''} onClick={() => setSourceMode(mode)}><strong>{SOURCE_LABELS[mode].title}</strong><span>{SOURCE_LABELS[mode].description}</span></button>)}</div></div>
      <div className="ci-control-block"><small>02 · 决策模式</small><div className="ci-segmented two"><button className={decisionMode === 'fast' ? 'active' : ''} onClick={() => setDecisionMode('fast')}><strong>快速分析</strong><span>保留现有 Document Intelligence / Short-Chain 流程，不比较方向。</span></button><button className={decisionMode === 'guided' ? 'active' : ''} onClick={() => setDecisionMode('guided')}><strong>方向推演</strong><span>生成三个底层机制不同的方向，由你选择、组合和确认。</span></button></div></div>
      <div className="ci-toolbar"><button className="button secondary" disabled={Boolean(busy)} onClick={() => void buildAnalysis()}>{busy === 'analysis' ? '分析中…' : analysis ? '重新构建分析' : '构建证据与机会地图'}</button><span>{analysis ? `${analysis.mode.toUpperCase()} · Truth confidence ${Math.round(analysis.artifacts.projectTruthModel.confidence.overall * 100)}%` : '尚未生成 V2 分析'}</span></div>
    </section>

    {analysis && <>
      <div className="ci-analysis-grid">
        <section className="panel ci-evidence-panel"><div className="section-heading"><span>03</span><div><h2>Evidence Ledger</h2><p>{analysis.artifacts.evidenceLedger.evidence.length} 条可追溯证据</p></div></div><div className="ci-evidence-list">{analysis.artifacts.evidenceLedger.evidence.map((item) => <details key={item.id}><summary><span className={`ci-evidence-type ${item.evidenceType}`}>{item.evidenceType}</span><strong>{item.content}</strong><em>{Math.round(item.confidence * 100)}%</em></summary><p>{item.subjectPath}</p><ul>{item.sources.map((source) => <li key={`${source.sourceType}-${source.sourceId}-${source.location || ''}`}>{source.sourceType} · {source.label || source.sourceId}{source.location ? ` · ${source.location}` : ''}</li>)}</ul></details>)}</div></section>
        <section className="panel ci-opportunity-panel"><div className="section-heading"><span>04</span><div><h2>Category Opportunity Map</h2><p>只使用证据支持的保留、重构、规避与占有空间</p></div></div><div className="ci-opportunity-grid">{OPPORTUNITY_SECTIONS.map(([key, label]) => <div key={key}><h3>{label}</h3>{analysis.artifacts.categoryOpportunityMap[key].length ? <ul>{analysis.artifacts.categoryOpportunityMap[key].map((item) => <li key={item.id}><strong>{item.content}</strong><small>{item.rationale}</small></li>)}</ul> : <p className="muted">暂无证据支持的结论</p>}</div>)}</div><div className="ci-touchpoints"><h3>真实业务触点</h3>{analysis.artifacts.categoryOpportunityMap.primaryTouchpoints.length ? analysis.artifacts.categoryOpportunityMap.primaryTouchpoints.map((item) => <span key={item.id}>{item.label}<small>{item.routeStatus === 'routable' ? ` → ${item.taskRoute?.deliverableFamily}` : ' · 待映射'}</small></span>) : <p className="notice warning">没有可靠触点，不会自动补名片、手提袋或办公楼 Mockup。</p>}</div></section>
      </div>
      <section className="panel ci-gap-strip"><div><small>意图—视觉差距</small><strong>{analysis.artifacts.intentVisualGapAnalysis.requiresHumanReview ? '需要人工复核' : '未发现阻断差距'}</strong></div>{(['aligned', 'underExpressed', 'overExpressed', 'misaligned', 'missing'] as const).map((key) => <span key={key}>{key}<b>{analysis.artifacts.intentVisualGapAnalysis[key].length}</b></span>)}</section>
    </>}

    {analysis && decisionMode === 'fast' && <section className="panel ci-fast-panel"><div><p className="eyebrow">FAST ANALYSIS MODE</p><h2>沿用现有快速分析与 Short-Chain</h2><p>此模式不生成三方向，也不会用概念评分替你做选择。当前 Evidence、Truth 和 Opportunity 作为分析补充，生产链路保持现有正式路径。</p></div><button className="button primary" onClick={onContinueProduction}>继续现有视觉生成</button></section>}

    {analysis && decisionMode === 'guided' && <section className="ci-direction-section">
      <div className="ci-direction-heading"><div><p className="eyebrow">GUIDED DIRECTION MODE</p><h2>三个机制级创意方向</h2><p>Language Nail 与 Visual Hammer 在 Anchor 验证前都只是方向假设。</p></div><div className="ci-generation-actions"><label>推演模型<select value={activeProfileId} onChange={(event) => onApiProfileChange(event.target.value)}>{!reasoningProfiles.length && <option value="">无可用分析模型</option>}{reasoningProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName} / {profile.modelId}</option>)}</select></label><button className="button primary" disabled={Boolean(busy) || !activeProfileId || !analysis.artifacts.categoryOpportunityMap.primaryTouchpoints.length} onClick={() => void generateDirections()}>{busy === 'directions' ? '方向推演中…' : directions ? '重新生成三个方向' : '生成三个方向'}</button></div></div>
      {!analysis.artifacts.categoryOpportunityMap.primaryTouchpoints.length && <div className="notice warning">请先确认至少一个真实业务触点，再生成可执行方向。</div>}
      {directions && <>
        <div className="ci-direction-cards">{directions.directionSet.directions.map((direction) => {
          const score = scoreByDirection.get(direction.id);
          const selected = selectedDirectionId === direction.id;
          const isEliminated = eliminated.includes(direction.id);
          return <article key={direction.id} className={`ci-direction-card ${selected ? 'selected' : ''} ${isEliminated ? 'eliminated' : ''}`}>
            <header><div><span>{direction.id}</span><h3>{direction.name}</h3></div>{score && <b title="仅为概念预评估，不替代 Anchor 验证">{score.total.toFixed(1)}<small>/10</small></b>}</header>
            <p className="ci-proposition">{direction.strategicProposition}</p>{score && <div className="ci-score-grid" title="概念预评估；不能替代用户选择或 Anchor 视觉验证"><span>策略匹配 <b>{score.strategyFit}</b></span><span>差异性 <b>{score.differentiation}</b></span><span>记忆潜力 <b>{score.memoryPotential}</b></span><span>品类信任 <b>{score.categoryTrust}</b></span><span>延展潜力 <b>{score.extensionPotential}</b></span></div>}<dl><div><dt>核心隐喻</dt><dd>{direction.coreMetaphor}</dd></div><div><dt>语言钉假设</dt><dd>{direction.languageNail}</dd></div><div><dt>视觉锤假设</dt><dd>{direction.visualHammer}</dd></div><div><dt>生成机制</dt><dd>{direction.visualGenerationMechanism}</dd></div><div><dt>认知结果</dt><dd>{direction.perceptionOutcome}</dd></div></dl>
            <details><summary>展开执行逻辑与证据</summary><p><strong>构图：</strong>{direction.compositionLogic}</p><p><strong>色彩：</strong>{direction.colorLogic}</p><p><strong>字体：</strong>{direction.typographyLogic}</p><p><strong>材质 / 图像：</strong>{direction.imageMaterialLogic}</p><ul>{direction.sourceMechanisms.map((source) => <li key={`${source.type}-${source.mechanism}`}><b>{source.type}</b> · {source.mechanism}</li>)}</ul><p className="risk"><strong>最大风险：</strong>{direction.risks[0]}</p></details>
            <div className="ci-card-actions"><button className={`button ${selected ? 'primary' : 'secondary'}`} onClick={() => { setSelectedDirectionId(direction.id); setEliminated((current) => current.filter((id) => id !== direction.id)); }}>{selected ? '已保留为主方向' : '保留为主方向'}</button><button className="button ghost" disabled={selected} onClick={() => toggleEliminated(direction)}>{isEliminated ? '撤销淘汰' : '淘汰此方向'}</button></div>
            {selectedDirectionId && !selected && !isEliminated && <div className="ci-merge-actions"><small>组合到主方向</small>{MERGE_FIELDS.map((field) => { const active = merged?.some((item) => item.fromDirectionId === direction.id && item.elementType === field.key); return <button key={field.key} className={active ? 'active' : ''} onClick={() => toggleMerge(direction, field.key)}>{active ? '✓ ' : '+ '}{field.label}</button>; })}</div>}
          </article>;
        })}</div>
        <section className="panel ci-decision-gate"><div className="section-heading"><span>05</span><div><h2>User Decision Gate</h2><p>系统建议不等于正式选择；确认后才生成 Creative Decision V2。</p></div></div><div className="ci-decision-form"><label>保留 / 优化要点（每行一条）<textarea value={acceptedText} onChange={(event) => setAcceptedText(event.target.value)} placeholder="例如：保留模块化阅读顺序" /></label><label>明确拒绝的表达（每行一条）<textarea value={rejectedText} onChange={(event) => setRejectedText(event.target.value)} placeholder="例如：拒绝高密度装饰边框" /></label><label className="full">选择理由（必填）<textarea value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="为什么这个方向最适合当前品牌、业务和触点？" /></label></div><div className="ci-confirm-row"><div>{selectedDirectionId ? <strong>主方向：{selectedDirectionId}</strong> : <strong>尚未选择主方向</strong>}<span> · 已组合 {merged?.length || 0} 个字段 · 已淘汰 {eliminated.length} 个方向</span></div><div className="button-row"><button className="button secondary" disabled={Boolean(busy)} onClick={() => void saveDraft()}>{busy === 'draft' ? '保存中…' : '保存草稿'}</button><button className="button primary" disabled={Boolean(busy) || !selectedDirectionId || !rationale.trim()} onClick={() => void confirmDecision()}>{busy === 'confirm' ? '确认编译中…' : '确认并生成 Creative Decision'}</button></div></div>{decision?.creativeDecision && <div className="notice ok"><strong>Creative Decision V2 已确认。</strong> 当前视觉机制仍为 Anchor 待验证状态，尚未写入正式 Visual Canon。</div>}</section>
      </>}
    </section>}
  </div>;
}
