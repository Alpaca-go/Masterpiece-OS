import { useEffect, useMemo, useState } from 'react';
import type {
  CreativeDirectionContextDto,
  CreativeResearchBriefDto,
  CreativeResearchBriefFieldDto,
  CreativeResearchCredentialStatusDto,
  CreativeResearchDirectionBoardDto,
  CreativeResearchNegativeSignalDto,
  CreativeResearchPendingInsightDto,
  CreativeResearchPreferenceInsightDto,
  CreativeResearchQueryDto,
  CreativeResearchReferenceDto,
  CreativeResearchReferenceAttributeDto,
  CreativeResearchReferenceSelectionDto,
  CreativeResearchSessionDto,
  ProjectRecord,
  PublicSettings,
  UpdateCreativeResearchBriefInput,
  UpdateCreativeResearchDirectionBoardInput,
  UpdateCreativeResearchSearchStrategyInput,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { Button } from '../../components/ui/Button';
import { cleanError, formatRelativeTime } from '../../utils';
import {
  deriveResearchUiState,
  filterReferencesForResearchView,
  filterReferencesByResearchKind,
  listQueriesByResearchKind,
  deriveSoftCorrectionSuggestion,
  type ReferenceResearchKind,
} from './creative-research-view-model';
import { ReferenceCard } from './ReferenceCard';
import { SelectionTray } from './SelectionTray';
import { PreferenceInsightsPanel } from './PreferenceInsightsPanel';
import { CorrectionToolbar } from './CorrectionToolbar';
import { DirectionWorkspace } from './DirectionWorkspace';
import { ResearchExecutionPanel, type ResearchExecutionFailure } from './ResearchExecutionPanel';
import './creative-research.css';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`无法读取「${file.name}」`));
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.readAsDataURL(file);
  });
}

function listText(value: string): string[] {
  return value.split(/\r?\n|，|,/u).map((item) => item.trim()).filter(Boolean);
}

function BriefEditor({ brief, editable, busy, onSave }: {
  brief: CreativeResearchBriefDto;
  editable: boolean;
  busy: boolean;
  onSave(input: UpdateCreativeResearchBriefInput): Promise<void>;
}) {
  const [draft, setDraft] = useState(brief);
  const [evidenceField, setEvidenceField] = useState<CreativeResearchBriefFieldDto | null>(null);
  useEffect(() => setDraft(brief), [brief]);
  const field = (key: 'projectSummary' | 'designTask' | 'audience') => ({
    value: draft[key],
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEvidenceField((current) => current === key ? null : current);
      setDraft({ ...draft, [key]: event.target.value });
    },
    disabled: !editable,
  });
  const listField = (key: 'scenarios' | 'coreMessages' | 'constraints' | 'conceptKeywords' | 'visualKeywords' | 'designerNotes') => ({
    value: draft[key].join('\n'),
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (key === 'scenarios' || key === 'coreMessages' || key === 'constraints') {
        setEvidenceField((current) => current === key ? null : current);
      }
      setDraft({ ...draft, [key]: listText(event.target.value) });
    },
    disabled: !editable,
  });
  const evidenceIdsFor = (key: CreativeResearchBriefFieldDto) =>
    brief.fieldEvidence.find((item) => item.field === key)?.evidenceIds || [];
  const valueChanged = (key: CreativeResearchBriefFieldDto) =>
    JSON.stringify(draft[key]) !== JSON.stringify(brief[key]);
  const evidenceFor = (key: CreativeResearchBriefFieldDto) => {
    const ids = new Set(evidenceIdsFor(key));
    return brief.evidence.filter((item) => ids.has(item.id));
  };
  const fieldHeader = (label: string, key: CreativeResearchBriefFieldDto) => <div className="cr-brief-field__label">
    <span>{label}</span>
    {!valueChanged(key) && evidenceIdsFor(key).length > 0 && <button type="button" onClick={() => setEvidenceField(key)}>依据</button>}
  </div>;
  return <section className="cr-panel cr-brief">
    <header className="cr-panel__head"><div><span>Brief</span><h2>设计任务书</h2></div><b>Revision {brief.revision}</b></header>
    <div className="cr-brief__grid">
      <div className="cr-brief-field">{fieldHeader('项目摘要', 'projectSummary')}<textarea aria-label="项目摘要" {...field('projectSummary')} /></div>
      <div className="cr-brief-field">{fieldHeader('设计任务', 'designTask')}<textarea aria-label="设计任务" {...field('designTask')} /></div>
      <div className="cr-brief-field">{fieldHeader('目标受众', 'audience')}<textarea aria-label="目标受众" {...field('audience')} /></div>
      <div className="cr-brief-field">{fieldHeader('使用场景（每行一项）', 'scenarios')}<textarea aria-label="使用场景" {...listField('scenarios')} /></div>
      <div className="cr-brief-field">{fieldHeader('核心信息（每行一项）', 'coreMessages')}<textarea aria-label="核心信息" {...listField('coreMessages')} /></div>
      <div className="cr-brief-field">{fieldHeader('约束（每行一项）', 'constraints')}<textarea aria-label="约束" {...listField('constraints')} /></div>
      <label>概念词（每行一项）<textarea {...listField('conceptKeywords')} /></label>
      <label>视觉词（每行一项）<textarea {...listField('visualKeywords')} /></label>
      <label className="cr-brief__wide">设计师备注<textarea {...listField('designerNotes')} /></label>
    </div>
    {evidenceField && <aside className="cr-evidence" role="dialog" aria-label="字段依据">
      <header><div><span>Evidence trace</span><h3>字段依据</h3></div><button type="button" onClick={() => setEvidenceField(null)}>关闭</button></header>
      {evidenceFor(evidenceField).map((item) => <article key={item.id}>
        <dl><div><dt>来源</dt><dd>{item.sourceLabel}</dd></div><div><dt>位置</dt><dd>{item.locator.kind} · {item.locator.value}</dd></div></dl>
        <blockquote>{item.excerpt || '该依据没有可展示的摘录。'}</blockquote>
      </article>)}
    </aside>}
    <div className="cr-keywords">
      <h3>搜索关键词</h3>
      {draft.searchKeywords.map((keyword, index) => <div className="cr-keyword" key={keyword.id}>
        <input type="checkbox" checked={keyword.enabled} disabled={!editable} onChange={(event) => {
          const next = [...draft.searchKeywords]; next[index] = { ...keyword, enabled: event.target.checked }; setDraft({ ...draft, searchKeywords: next });
        }} />
        <select value={keyword.kind} disabled={!editable} onChange={(event) => {
          const next = [...draft.searchKeywords]; next[index] = { ...keyword, kind: event.target.value as typeof keyword.kind }; setDraft({ ...draft, searchKeywords: next });
        }}><option value="CONCEPT">概念</option><option value="CATEGORY">品类</option><option value="VISUAL">视觉（不参与首轮）</option></select>
        <input value={keyword.value} disabled={!editable} onChange={(event) => {
          const next = [...draft.searchKeywords]; next[index] = { ...keyword, value: event.target.value }; setDraft({ ...draft, searchKeywords: next });
        }} />
        {editable && <button onClick={() => setDraft({ ...draft, searchKeywords: draft.searchKeywords.filter((_, itemIndex) => itemIndex !== index) })}>移除</button>}
      </div>)}
      {editable && <Button variant="ghost" size="sm" onClick={() => setDraft({ ...draft, searchKeywords: [...draft.searchKeywords, { id: `draft-${Date.now()}`, value: '', kind: 'CONCEPT', source: 'DESIGNER', enabled: true }] })}>添加关键词</Button>}
    </div>
    {brief.warnings.length > 0 && <details><summary>{brief.warnings.length} 条来源提示</summary><ul>{brief.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
    {editable && <Button variant="primary" disabled={busy} onClick={() => onSave({
      projectSummary: draft.projectSummary, designTask: draft.designTask, audience: draft.audience,
      scenarios: draft.scenarios, coreMessages: draft.coreMessages, constraints: draft.constraints,
      conceptKeywords: draft.conceptKeywords, visualKeywords: draft.visualKeywords, designerNotes: draft.designerNotes,
      searchKeywords: draft.searchKeywords.filter((keyword) => keyword.value.trim()).map(({ id, value, kind, enabled, rationale, locale }) => ({ id: id.startsWith('draft-') ? undefined : id, value, kind, enabled, rationale, locale })),
    })}>保存新 Revision</Button>}
  </section>;
}

export function CreativeResearchWorkspace({ settings, projects, onNavigate, onBack, onOpenSettings, onOpenResearchSettings }: {
  settings: PublicSettings;
  projects: ProjectRecord[];
  onNavigate(path: string): void;
  onBack(): void;
  onOpenSettings(): void;
  onOpenResearchSettings(): void;
}) {
  const sessionId = decodeURIComponent(window.location.hash.match(/^#\/creative-research\/([^/?]+)/u)?.[1] || '');
  const api = window.masterpiece.creativeResearch;
  const analysisProfiles = settings.profiles.filter((profile) => profile.isEnabled && profile.modelType === 'analysis');
  const [projectId, setProjectId] = useState('');
  const [profileId, setProfileId] = useState(analysisProfiles.find((profile) => profile.isDefault)?.id || analysisProfiles[0]?.id || '');
  const [sessions, setSessions] = useState<CreativeResearchSessionDto[]>([]);
  const [session, setSession] = useState<CreativeResearchSessionDto | null>(null);
  const [brief, setBrief] = useState<CreativeResearchBriefDto | null>(null);
  const [queries, setQueries] = useState<CreativeResearchQueryDto[]>([]);
  const [references, setReferences] = useState<CreativeResearchReferenceDto[]>([]);
  const [selections, setSelections] = useState<CreativeResearchReferenceSelectionDto[]>([]);
  const [negativeSignals, setNegativeSignals] = useState<CreativeResearchNegativeSignalDto[]>([]);
  const [preferenceInsights, setPreferenceInsights] = useState<CreativeResearchPreferenceInsightDto[]>([]);
  const [credential, setCredential] = useState<CreativeResearchCredentialStatusDto>({ provider: 'baidu-search', configured: false });
  const [documents, setDocuments] = useState<File[]>([]);
  const [filter, setFilter] = useState('all');
  const [researchKind, setResearchKind] = useState<ReferenceResearchKind>('CONCEPT');
  const [trayExpanded, setTrayExpanded] = useState(false);
  const [tab, setTab] = useState<'brief' | 'references' | 'direction'>('brief');
  const [board, setBoard] = useState<CreativeResearchDirectionBoardDto | null>(null);
  const [directionContext, setDirectionContext] = useState<CreativeDirectionContextDto | null>(null);
  const [pendingFinalizedInsights, setPendingFinalizedInsights] = useState<CreativeResearchPendingInsightDto[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [operationStartedAt, setOperationStartedAt] = useState<number | null>(null);
  const [executionFailure, setExecutionFailure] = useState<ResearchExecutionFailure | null>(null);

  async function loadSession(id: string) {
    const nextSession = await api.getSession(id);
    const inDirection = nextSession.status === 'DIRECTION' || nextSession.status === 'COMPLETED';
    const [nextBrief, nextQueries, nextReferences, nextSelections, nextNegativeSignals, nextPreferenceInsights, nextBoardResult, nextContextResult] = await Promise.all([
      api.getDesignBrief(id).catch(() => null), api.getSearchHistory(id), api.listReferences(id),
      api.listSelections(id), api.listNegativeSignals(id), api.listPreferenceInsights(id),
      inDirection ? api.getDirectionBoard(id).catch(() => null) : Promise.resolve(null),
      nextSession.status === 'COMPLETED' ? api.getDirectionContext(id).catch(() => null) : Promise.resolve(null),
    ]);
    setSession(nextSession); setBrief(nextBrief); setQueries(nextQueries); setReferences(nextReferences);
    setSelections(nextSelections); setNegativeSignals(nextNegativeSignals);
    setPreferenceInsights(nextPreferenceInsights);
    setBoard(nextBoardResult?.board || null);
    setDirectionContext(nextContextResult?.context || null);
    setPendingFinalizedInsights([]);
  }
  useEffect(() => { void api.getSearchCredentialStatus().then(setCredential).catch((reason) => setError(cleanError(reason))); }, []);
  useEffect(() => {
    if (sessionId) void loadSession(sessionId).catch((reason) => setError(cleanError(reason)));
  }, [sessionId]);
  useEffect(() => {
    if (sessionId) return;
    setProjectId('');
    setDocuments([]);
    setSession(null);
    setBrief(null);
    setQueries([]);
    setReferences([]);
    setExecutionFailure(null);
  }, [sessionId]);
  useEffect(() => {
    if (sessionId) return;
    let active = true;
    void Promise.all(projects.map((item) => api.listSessions(item.id)))
      .then((groups) => {
        if (active) setSessions(groups.flat().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
      })
      .catch((reason) => { if (active) setError(cleanError(reason)); });
    return () => { active = false; };
  }, [api, projects, sessionId]);

  async function action(name: string, operation: (transition: (next: string) => void) => Promise<void>) {
    let currentOperation = name;
    const transition = (next: string) => {
      currentOperation = next;
      setBusy(next);
    };
    setBusy(name); setError(''); setExecutionFailure(null); setOperationStartedAt(Date.now());
    try {
      await operation(transition);
    } catch (reason) {
      const message = cleanError(reason);
      setError(message);
      setExecutionFailure({ operation: currentOperation, message });
    } finally {
      setBusy('');
      setOperationStartedAt(null);
    }
  }

  async function createSession() {
    await action('creating', async () => {
      if (!projectId || !documents.length) throw new Error('请选择项目并导入至少一份文档');
      const imported = await window.masterpiece.documentContext.importDocuments({ documents: await Promise.all(documents.map(async (file) => ({ name: file.name, size: file.size, content: await fileToBase64(file) }))) });
      const created = await api.createSession({ projectId, sourceDocumentIds: imported });
      onNavigate(`/creative-research/${encodeURIComponent(created.id)}`);
    });
  }

  async function runInitialSearch() {
    if (!session) return;
    await action('planning', async (transition) => {
      await api.startResearch(session.id);
      const planned = await api.planInitialSearch(session.id);
      setQueries(planned); setTab('references'); transition('searching');
      try { await api.executeSearchBatch(session.id); } finally { await loadSession(session.id); }
    });
  }

  async function setReferenceSelection(referenceId: string, input: {
    state: CreativeResearchReferenceSelectionDto['state'];
    selectedAttributes: CreativeResearchReferenceSelectionDto['selectedAttributes'];
    designerNote?: string;
    rejectionReason?: string;
  }) {
    await action(`selection:${referenceId}`, async () => {
      const saved = await api.setReferenceSelection({ sessionId, referenceId, ...input });
      setSelections((current) => [...current.filter((item) => item.referenceId !== referenceId), saved]);
      if (input.state === 'REJECTED') setNegativeSignals(await api.listNegativeSignals(sessionId));
    });
  }

  async function analyzePreferences() {
    await action('preferences', async () => {
      if (!profileId) throw new Error('请选择可用的分析模型');
      await api.analyzePreferences(sessionId, profileId);
      setPreferenceInsights(await api.listPreferenceInsights(sessionId));
    });
  }

  async function updatePreferenceInsight(insightId: string, designerOverride: string) {
    await action(`insight:${insightId}`, async () => {
      const saved = await api.updatePreferenceInsight(sessionId, insightId, designerOverride);
      setPreferenceInsights((current) => current.map((item) => item.id === insightId ? saved : item));
    });
  }

  async function finalizePreferenceInsight(insightId: string) {
    await action(`insight:${insightId}`, async () => {
      const saved = await api.finalizePreferenceInsight(sessionId, insightId);
      setPreferenceInsights((current) => current.map((item) => item.id === insightId ? saved : item));
    });
  }

  async function executePlannedSearch(planner: () => Promise<CreativeResearchQueryDto[]>) {
    const planned = await planner();
    setQueries((current) => [...current, ...planned]);
    setBusy('searching');
    try { await api.executeSearchBatch(sessionId, planned.map((item) => item.id)); } finally { await loadSession(sessionId); }
  }

  async function refreshSearch() {
    await action('refreshing', async () => {
      if (!profileId) throw new Error('请选择可用的分析模型');
      await executePlannedSearch(() => api.planRefreshSearch(sessionId, profileId));
    });
  }

  async function adjustSearchStrategy(input: UpdateCreativeResearchSearchStrategyInput) {
    await action('adjusting', async () => {
      setBrief(await api.updateSearchStrategy(sessionId, input));
      await executePlannedSearch(() => api.planKeywordAdjustmentSearch(sessionId));
      setNegativeSignals(await api.listNegativeSignals(sessionId));
    });
  }

  async function reanalyze(feedback: string[]) {
    await action('reanalyzing', async () => {
      if (!profileId) throw new Error('请选择可用的分析模型');
      await api.reanalyzeDesignBrief(sessionId, { profileId, feedback });
      await loadSession(sessionId);
      setTab('brief');
      setNotice('已根据你的反馈重新分析。之前的参考、选择和排除记录都已保留。');
    });
  }

  async function findSimilar(input: { sourceReferenceId?: string; sourcePreferenceInsightId?: string; dimension?: CreativeResearchReferenceAttributeDto | 'PEER_CASE' }) {
    await action('similar', async () => {
      if (!profileId) throw new Error('请选择可用的分析模型');
      await executePlannedSearch(() => api.planSimilarSearch({ sessionId, profileId, targetKind: researchKind, ...input }));
    });
  }

  async function startDirectionFlow() {
    await action('direction', async () => {
      const result = await api.startDirection(sessionId);
      setSession(result.session); setBoard(result.board);
      setPendingFinalizedInsights(result.pendingFinalizedInsights);
      setTab('direction');
    });
  }

  async function resumeDirection() {
    await action('direction', async () => {
      const result = await api.getDirectionBoard(sessionId);
      setSession(result.session); setBoard(result.board);
      setTab('direction');
    });
  }

  async function saveDirectionBoard(input: UpdateCreativeResearchDirectionBoardInput) {
    await action('direction:saving', async () => {
      setBoard(await api.updateDirectionBoard(sessionId, input));
    });
  }

  async function returnToResearchFlow() {
    await action('direction:returning', async () => {
      setSession(await api.returnToResearch(sessionId));
      setTab('references');
    });
  }

  async function completeDirectionFlow() {
    await action('direction:completing', async () => {
      const result = await api.completeDirection(sessionId, { confirm: true });
      setSession(result.session); setDirectionContext(result.context);
    });
  }

  const uiState = deriveResearchUiState(queries, busy);
  const kindQueries = useMemo(() => listQueriesByResearchKind(queries, researchKind), [queries, researchKind]);
  const kindReferences = useMemo(() => filterReferencesByResearchKind(references, queries, researchKind), [references, queries, researchKind]);
  const visibleReferences = useMemo(() => filterReferencesForResearchView(references, queries, researchKind, filter), [references, queries, researchKind, filter]);
  const imageReferences = visibleReferences.filter((reference) => reference.resourceType === 'IMAGE');
  const webReferences = visibleReferences.filter((reference) => reference.resourceType === 'WEB');
  const correctionSuggestion = useMemo(() => deriveSoftCorrectionSuggestion(queries, references, selections), [queries, references, selections]);
  const project = projects.find((item) => item.id === (session?.projectId || projectId));
  const selectedReferenceCount = selections.filter((item) => item.state === 'SELECTED').length;
  const directionTabEnabled = session?.status === 'DIRECTION' || session?.status === 'COMPLETED';
  const referencesReadOnly = session?.status !== 'RESEARCH';
  const createReady = Boolean(projectId && documents.length && profileId && !busy);

  if (!sessionId) return <main className="cr-shell">
    <header className="cr-top"><button onClick={onBack}>← 项目</button><div><span>Creative Research</span><h1>灵感研究工作台</h1></div><button onClick={onOpenSettings}>模型设置</button></header>
    {error && <div className="cr-alert cr-alert--error">{error}</div>}
    {notice && <div className="cr-alert cr-alert--success">{notice}</div>}
    <section className="cr-intake cr-panel">
      <div><span className="cr-step">01</span><h2>选择项目</h2><select value={projectId} disabled={Boolean(busy)} onChange={(event) => setProjectId(event.target.value)}><option value="" disabled>请选择项目</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.projectName}</option>)}</select></div>
      <div><span className="cr-step">02</span><h2>导入设计资料</h2><input type="file" multiple disabled={Boolean(busy)} accept=".pdf,.docx,.md,.markdown,.txt" onChange={(event) => setDocuments(Array.from(event.target.files || []))} /><small>{documents.length ? `${documents.length} 份文档` : 'PDF / DOCX / Markdown / TXT'}</small></div>
      <div><span className="cr-step">03</span><h2>选择分析模型</h2><select value={profileId} disabled={Boolean(busy)} onChange={(event) => setProfileId(event.target.value)}>{analysisProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></div>
      <Button variant="primary" disabled={!createReady} onClick={() => void createSession()}>{busy === 'creating' ? '正在创建…' : '创建研究 Session'}</Button>
    </section>
    <section className="cr-recent"><h2>最近研究</h2>{sessions.length ? sessions.map((item) => <button key={item.id} onClick={() => onNavigate(`/creative-research/${item.id}`)}><strong>{projects.find((candidate) => candidate.id === item.projectId)?.projectName || item.projectId}</strong><span>{item.status} · {formatRelativeTime(item.updatedAt)}</span></button>) : <p>还没有研究记录。</p>}</section>
  </main>;

  return <main className="cr-shell">
    <header className="cr-top"><button onClick={() => onNavigate('/creative-research')}>← 研究列表</button><div><span>{project?.projectName || 'Creative Research'}</span><h1>灵感研究工作台</h1></div><div className="cr-top__status"><b>{session?.status || '载入中'}</b><button onClick={onOpenSettings}>设置</button></div></header>
    {error && <div className="cr-alert cr-alert--error">{error}</div>}
    <section className={`cr-service-status ${credential.configured ? 'is-configured' : ''}`}>
      <div><span aria-hidden>●</span><strong>搜索服务</strong><small>{credential.configured ? '百度 AI 搜索已连接' : '尚未配置百度 AI 搜索'}</small></div>
      {!credential.configured && <Button variant="secondary" size="sm" onClick={onOpenResearchSettings}>前往 API 设置</Button>}
    </section>
    <nav className="cr-tabs"><button className={tab === 'brief' ? 'is-active' : ''} onClick={() => setTab('brief')}>Brief</button><button className={tab === 'references' ? 'is-active' : ''} onClick={() => setTab('references')}>References <span>{references.length}</span></button><button className={tab === 'direction' ? 'is-active' : ''} disabled={!directionTabEnabled} title={directionTabEnabled ? undefined : '收藏参考后，通过「整理成视觉方向」进入方向整理。'} onClick={() => setTab('direction')}>Direction</button></nav>
    {session && <ResearchExecutionPanel
      session={session}
      projectName={project?.projectName || session.projectId}
      briefReady={Boolean(brief)}
      queries={queries}
      referenceCount={references.length}
      preferenceCount={preferenceInsights.length}
      directionReady={Boolean(board) || session.status === 'DIRECTION' || session.status === 'COMPLETED'}
      busy={busy}
      operationStartedAt={operationStartedAt}
      failure={executionFailure}
      onDismissFailure={() => { setExecutionFailure(null); setError(''); }}
    />}
    {!session || !brief ? <section className="cr-panel cr-loading">{busy === 'brief' ? <p>资料解析与 Brief 生成正在执行，详细阶段见上方进度面板。</p> : <><p>{session ? '此 Session 尚未生成 Design Brief。' : '正在载入研究 Session…'}</p>{session && <Button variant="primary" disabled={!profileId || busy !== ''} onClick={() => void action('brief', async () => { const next = await api.prepareDesignBrief(sessionId, { profileId }); setBrief(next); })}>生成 Design Brief</Button>}</>}</section>
      : tab === 'brief' ? <><BriefEditor brief={brief} editable={session.status === 'INTAKE' && busy === ''} busy={busy !== ''} onSave={async (input) => action('saving', async () => setBrief(await api.updateDesignBrief(session.id, input)))} />
        {session.status === 'INTAKE' && <section className="cr-start"><div><h2>Brief 已就绪</h2><p>开始研究后 Brief 与本次 Session 输入将只读，并按启用的概念与品类关键词执行首轮搜索。</p>{!credential.configured && <small>搜索服务尚未配置。请先前往「API 与模型 → 研究服务」连接百度 AI 搜索。</small>}</div><div className="cr-start__actions">{!credential.configured && <Button variant="secondary" onClick={onOpenResearchSettings}>前往 API 设置</Button>}<Button variant="primary" disabled={busy !== '' || !credential.configured} onClick={() => void runInitialSearch()}>开始研究</Button></div></section>}</>
      : tab === 'direction' ? (board ? <DirectionWorkspace session={session} brief={brief} board={board} references={references} selections={selections} negativeSignals={negativeSignals} insights={preferenceInsights} pendingFinalizedInsights={pendingFinalizedInsights} context={directionContext} busy={busy.startsWith('direction:')} onSave={saveDirectionBoard} onReturnToResearch={returnToResearchFlow} onComplete={completeDirectionFlow} /> : <section className="cr-panel cr-loading">方向板载入中…</section>)
      : <section className="cr-references">
        <div className="cr-search-head"><div><span>Search state</span><h2>{uiState}</h2></div><div><span className={credential.configured ? 'cr-configured' : 'cr-unconfigured'}>{credential.configured ? '百度 AI 搜索已连接' : '搜索服务未配置'}</span>{!credential.configured && <Button size="sm" variant="secondary" onClick={onOpenResearchSettings}>前往 API 设置</Button>}</div></div>
        <nav className="cr-kind-tabs" aria-label="参考研究类型">
          <button className={researchKind === 'CONCEPT' ? 'is-active' : ''} onClick={() => { setResearchKind('CONCEPT'); setFilter('all'); }}>Concept References</button>
          <button className={researchKind === 'CATEGORY' ? 'is-active' : ''} onClick={() => { setResearchKind('CATEGORY'); setFilter('all'); }}>Category References</button>
        </nav>
        {session.status === 'RESEARCH' && <CorrectionToolbar brief={brief} busy={busy !== ''} onRefresh={refreshSearch} onAdjust={adjustSearchStrategy} onReanalyze={reanalyze} />}
        {session.status === 'INTAKE' && <div className="cr-alert cr-alert--warning">旧参考仍可浏览；请在 Brief 确认后重新开始研究，才能执行新搜索。</div>}
        {correctionSuggestion && session.status === 'RESEARCH' && <div className="cr-alert cr-alert--warning cr-soft-correction"><span>{correctionSuggestion.message}</span><div><button onClick={() => void refreshSearch()}>继续换一批</button><button onClick={() => document.querySelector<HTMLButtonElement>('.cr-correction-toolbar__actions button:nth-child(2)')?.click()}>调整关键词</button><button onClick={() => document.querySelector<HTMLButtonElement>('.cr-correction-toolbar__actions button:nth-child(3)')?.click()}>重新分析</button></div></div>}
        <div className="cr-query-chips"><button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>全部 {kindReferences.length}</button>{kindQueries.map((query) => <button key={query.id} className={filter === query.id ? 'is-active' : ''} onClick={() => setFilter(query.id)}>{query.text} <span>{query.status}</span></button>)}</div>
        {queries.some((query) => query.status === 'FAILED') && <div className="cr-alert cr-alert--warning"><span>部分查询失败，已有结果仍可浏览。</span><Button size="sm" variant="secondary" disabled={busy !== '' || !credential.configured} onClick={() => void action('searching', async () => { await api.executeSearchBatch(sessionId, queries.filter((query) => query.status === 'FAILED').map((query) => query.id)); await loadSession(sessionId); })}>重试失败查询</Button></div>}
        {!queries.length && session?.status === 'RESEARCH' && <Button variant="primary" disabled={busy !== '' || !credential.configured} onClick={() => void action('planning', async (transition) => { const planned = await api.planInitialSearch(sessionId); setQueries(planned); transition('searching'); try { await api.executeSearchBatch(sessionId); } finally { await loadSession(sessionId); } })}>规划并搜索</Button>}
        <SelectionTray selections={selections} references={references} expanded={trayExpanded} onToggle={() => setTrayExpanded((value) => !value)} busy={busy !== ''} onAnalyze={() => void analyzePreferences()} />
        {session.status === 'RESEARCH' && selectedReferenceCount >= 1 && <section className="cr-direction-cta"><p>这些参考已经足够让我开始设计了。</p><Button variant="primary" disabled={busy !== ''} onClick={() => void startDirectionFlow()}>整理成视觉方向</Button></section>}
        {session.status === 'DIRECTION' && <section className="cr-direction-cta"><p>视觉方向已开始整理，保存的参考与排除记录都会保留。</p><Button variant="primary" disabled={busy !== ''} onClick={() => void resumeDirection()}>继续整理视觉方向</Button></section>}
        {preferenceInsights.length > 0 && <PreferenceInsightsPanel insights={preferenceInsights} references={references} negativeSignals={negativeSignals} busy={busy.startsWith('insight:') || busy === 'similar'} readOnly={referencesReadOnly} onUpdate={updatePreferenceInsight} onFinalize={finalizePreferenceInsight} onFindMoreSimilar={(insightId) => findSimilar({ sourcePreferenceInsightId: insightId })} />}
        <div className="cr-section-head"><h3>图片灵感板</h3><span>{imageReferences.length}</span></div>
        {imageReferences.length ? <div className="cr-image-board">{imageReferences.map((reference) => <ReferenceCard key={reference.id} display="IMAGE" reference={reference} selection={selections.find((item) => item.referenceId === reference.id)} busy={busy === `selection:${reference.id}` || busy === 'similar'} readOnly={referencesReadOnly} onSelectionChange={(input) => setReferenceSelection(reference.id, input)} onFindSimilar={(dimension) => findSimilar({ sourceReferenceId: reference.id, dimension })} />)}</div> : <div className="cr-empty">当前筛选没有图片结果。</div>}
        <div className="cr-section-head"><h3>网页来源</h3><span>{webReferences.length}</span></div>
        {webReferences.length ? <div className="cr-web-list">{webReferences.map((reference) => <ReferenceCard key={reference.id} display="WEB" reference={reference} selection={selections.find((item) => item.referenceId === reference.id)} busy={busy === `selection:${reference.id}` || busy === 'similar'} readOnly={referencesReadOnly} onSelectionChange={(input) => setReferenceSelection(reference.id, input)} onFindSimilar={(dimension) => findSimilar({ sourceReferenceId: reference.id, dimension })} />)}</div> : <div className="cr-empty">当前筛选没有网页来源。</div>}
      </section>}
  </main>;
}
