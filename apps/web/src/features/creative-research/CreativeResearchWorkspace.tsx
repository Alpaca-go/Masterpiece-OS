import { useEffect, useState, type ChangeEvent } from 'react';
import type {
  CreativeDirectionContextDto,
  CreativeResearchBriefDto,
  CreativeResearchBriefFieldDto,
  CreativeResearchDirectionBoardDto,
  CreativeResearchNegativeSignalDto,
  CreativeResearchPendingInsightDto,
  CreativeResearchPreferenceInsightDto,
  CreativeResearchReferenceGuideDto,
  CreativeResearchReferenceSelectionDto,
  CreativeResearchReferenceDto,
  CreativeResearchSessionDto,
  ProjectRecord,
  PublicSettings,
  UpdateCreativeResearchBriefInput,
  UpdateCreativeResearchDirectionBoardInput,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { Button } from '../../components/ui/Button';
import { cleanError, formatRelativeTime } from '../../utils';
import { DirectionWorkspace } from './DirectionWorkspace';
import { PreferenceInsightsPanel } from './PreferenceInsightsPanel';
import { ReferenceCard } from './ReferenceCard';
import { ResearchExecutionPanel, type ResearchExecutionFailure } from './ResearchExecutionPanel';
import { SelectionTray } from './SelectionTray';
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
    value: draft[key], disabled: !editable,
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => setDraft({ ...draft, [key]: event.target.value }),
  });
  const listField = (key: 'scenarios' | 'coreMessages' | 'constraints' | 'conceptKeywords' | 'visualKeywords' | 'designerNotes') => ({
    value: draft[key].join('\n'), disabled: !editable,
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => setDraft({ ...draft, [key]: listText(event.target.value) }),
  });
  const evidenceFor = (key: CreativeResearchBriefFieldDto) => {
    const ids = new Set(brief.fieldEvidence.find((item) => item.field === key)?.evidenceIds || []);
    return brief.evidence.filter((item) => ids.has(item.id));
  };
  const label = (text: string, key: CreativeResearchBriefFieldDto) => <div className="cr-brief-field__label"><span>{text}</span>{evidenceFor(key).length > 0 && <button type="button" onClick={() => setEvidenceField(key)}>依据</button>}</div>;
  return <section className="cr-panel cr-brief">
    <header className="cr-panel__head"><div><span>Brief</span><h2>设计任务书</h2></div><b>Revision {brief.revision}</b></header>
    <div className="cr-brief__grid">
      <div className="cr-brief-field">{label('项目是什么', 'projectSummary')}<textarea aria-label="项目摘要" {...field('projectSummary')} /></div>
      <div className="cr-brief-field">{label('设计任务', 'designTask')}<textarea aria-label="设计任务" {...field('designTask')} /></div>
      <div className="cr-brief-field">{label('目标用户', 'audience')}<textarea aria-label="目标受众" {...field('audience')} /></div>
      <div className="cr-brief-field">{label('使用场景', 'scenarios')}<textarea aria-label="使用场景" {...listField('scenarios')} /></div>
      <div className="cr-brief-field">{label('品牌目标 / 核心信息', 'coreMessages')}<textarea aria-label="核心信息" {...listField('coreMessages')} /></div>
      <div className="cr-brief-field">{label('必须保留 / 应避免', 'constraints')}<textarea aria-label="约束" {...listField('constraints')} /></div>
      <label>概念线索<textarea {...listField('conceptKeywords')} /></label>
      <label>视觉机会<textarea {...listField('visualKeywords')} /></label>
      <label className="cr-brief__wide">设计师备注<textarea {...listField('designerNotes')} /></label>
    </div>
    {evidenceField && <aside className="cr-evidence" role="dialog" aria-label="字段依据"><header><div><span>Evidence trace</span><h3>字段依据</h3></div><button type="button" onClick={() => setEvidenceField(null)}>关闭</button></header>{evidenceFor(evidenceField).map((item) => <article key={item.id}><dl><div><dt>来源</dt><dd>{item.sourceLabel}</dd></div><div><dt>位置</dt><dd>{item.locator.kind} · {item.locator.value}</dd></div></dl><blockquote>{item.excerpt || '该依据没有可展示的摘录。'}</blockquote></article>)}</aside>}
    {editable && <Button variant="primary" disabled={busy} onClick={() => onSave({
      projectSummary: draft.projectSummary, designTask: draft.designTask, audience: draft.audience,
      scenarios: draft.scenarios, coreMessages: draft.coreMessages, constraints: draft.constraints,
      conceptKeywords: draft.conceptKeywords, visualKeywords: draft.visualKeywords, designerNotes: draft.designerNotes,
    })}>保存新 Revision</Button>}
  </section>;
}

function ReferenceGuidePanel({ guide }: { guide: CreativeResearchReferenceGuideDto }) {
  const kindLabel = { INDUSTRY: '行业基准', POSITIONING: '气质迁移', CROSS_CATEGORY: '相邻品类', CUSTOM: '自定义领域' } as const;
  return <section className="cr-panel cr-reference-guide">
    <header className="cr-panel__head"><div><span>Reference Guide</span><h2>视觉参考研究指南</h2></div><b>{guide.territories.length} 个研究领域</b></header>
    <p>AI 只定义“应该去哪些视觉世界里找参考”；找图与第一轮审美筛选由设计师完成。</p>
    <div className="cr-reference-guide__grid">{guide.territories.map((territory, index) => <article key={territory.id}>
      <span>{String(index + 1).padStart(2, '0')} · {kindLabel[territory.kind]}</span><h3>{territory.title}</h3>
      <strong>{territory.keywords.join(' / ')}</strong><p>{territory.rationale}</p>
      <h4>重点观察</h4><ul>{territory.observe.map((item) => <li key={item}>{item}</li>)}</ul>
      {territory.suggestedQueries.length > 0 && <><h4>人工搜图建议</h4><div className="cr-guide-queries">{territory.suggestedQueries.map((item) => <code key={item}>{item}</code>)}</div></>}
    </article>)}</div>
  </section>;
}

export function CreativeResearchWorkspace({ settings, projects, onNavigate, onBack, onOpenSettings }: {
  settings: PublicSettings;
  projects: ProjectRecord[];
  onNavigate(path: string): void;
  onBack(): void;
  onOpenSettings(): void;
}) {
  const sessionId = decodeURIComponent(window.location.hash.match(/^#\/creative-research\/([^/?]+)/u)?.[1] || '');
  const api = window.masterpiece.creativeResearch;
  const analysisProfiles = settings.profiles.filter((profile) => profile.isEnabled && profile.modelType === 'analysis');
  const [projectId, setProjectId] = useState('');
  const [profileId, setProfileId] = useState(analysisProfiles.find((profile) => profile.isDefault)?.id || analysisProfiles[0]?.id || '');
  const [documents, setDocuments] = useState<File[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [sessions, setSessions] = useState<CreativeResearchSessionDto[]>([]);
  const [session, setSession] = useState<CreativeResearchSessionDto | null>(null);
  const [brief, setBrief] = useState<CreativeResearchBriefDto | null>(null);
  const [guide, setGuide] = useState<CreativeResearchReferenceGuideDto | null>(null);
  const [references, setReferences] = useState<CreativeResearchReferenceDto[]>([]);
  const [selections, setSelections] = useState<CreativeResearchReferenceSelectionDto[]>([]);
  const [negativeSignals, setNegativeSignals] = useState<CreativeResearchNegativeSignalDto[]>([]);
  const [preferenceInsights, setPreferenceInsights] = useState<CreativeResearchPreferenceInsightDto[]>([]);
  const [board, setBoard] = useState<CreativeResearchDirectionBoardDto | null>(null);
  const [directionContext, setDirectionContext] = useState<CreativeDirectionContextDto | null>(null);
  const [pendingFinalizedInsights, setPendingFinalizedInsights] = useState<CreativeResearchPendingInsightDto[]>([]);
  const [trayExpanded, setTrayExpanded] = useState(false);
  const [tab, setTab] = useState<'brief' | 'references' | 'direction'>('brief');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [operationStartedAt, setOperationStartedAt] = useState<number | null>(null);
  const [executionFailure, setExecutionFailure] = useState<ResearchExecutionFailure | null>(null);

  async function loadSession(id: string) {
    const nextSession = await api.getSession(id);
    const inDirection = nextSession.status === 'DIRECTION' || nextSession.status === 'COMPLETED';
    const [nextBrief, nextGuide, nextReferences, nextSelections, nextNegatives, nextInsights, nextBoard, nextContext] = await Promise.all([
      api.getDesignBrief(id).catch(() => null), api.getReferenceGuide(id).catch(() => null), api.listReferences(id),
      api.listSelections(id), api.listNegativeSignals(id), api.listPreferenceInsights(id),
      inDirection ? api.getDirectionBoard(id).catch(() => null) : Promise.resolve(null),
      nextSession.status === 'COMPLETED' ? api.getDirectionContext(id).catch(() => null) : Promise.resolve(null),
    ]);
    setSession(nextSession); setBrief(nextBrief); setGuide(nextGuide); setReferences(nextReferences);
    setSelections(nextSelections); setNegativeSignals(nextNegatives); setPreferenceInsights(nextInsights);
    setBoard(nextBoard?.board || null); setDirectionContext(nextContext?.context || null);
  }

  useEffect(() => { if (sessionId) void loadSession(sessionId).catch((reason) => setError(cleanError(reason))); }, [sessionId]);
  useEffect(() => {
    if (sessionId) return;
    let active = true;
    void Promise.all(projects.map((project) => api.listSessions(project.id))).then((groups) => {
      if (active) setSessions(groups.flat().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
    }).catch((reason) => { if (active) setError(cleanError(reason)); });
    return () => { active = false; };
  }, [api, projects, sessionId]);

  async function action(name: string, operation: (transition: (next: string) => void) => Promise<void>) {
    let current = name;
    const transition = (next: string) => { current = next; setBusy(next); };
    setBusy(name); setError(''); setNotice(''); setExecutionFailure(null); setOperationStartedAt(Date.now());
    try { await operation(transition); }
    catch (reason) { const message = cleanError(reason); setError(message); setExecutionFailure({ operation: current, message }); }
    finally { setBusy(''); setOperationStartedAt(null); }
  }

  async function createSession() {
    await action('creating', async () => {
      if (!projectId || !documents.length) throw new Error('请选择项目并导入至少一份文档');
      const imported = await window.masterpiece.documentContext.importDocuments({ documents: await Promise.all(documents.map(async (file) => ({ name: file.name, size: file.size, content: await fileToBase64(file) }))) });
      const created = await api.createSession({ projectId, sourceDocumentIds: imported });
      onNavigate(`/creative-research/${encodeURIComponent(created.id)}`);
    });
  }

  async function generateBriefAndGuide() {
    if (!session) return;
    await action('brief', async (transition) => {
      if (!profileId) throw new Error('请选择可用的分析模型');
      setBrief(await api.prepareDesignBrief(session.id, { profileId }));
      transition('guide');
      setGuide(await api.generateReferenceGuide(session.id, { profileId }));
    });
  }

  async function generateGuide() {
    if (!session) return;
    await action('guide', async () => { setGuide(await api.generateReferenceGuide(session.id, { profileId })); });
  }

  async function beginReferenceIntake() {
    if (!session || !guide) return;
    await action('guide', async () => { setSession(await api.startResearch(session.id)); setTab('references'); });
  }

  async function importReferences() {
    if (!session || !referenceFiles.length) return;
    await action('importing', async () => {
      const files = await Promise.all(referenceFiles.map(async (file) => ({ name: file.name, size: file.size, content: await fileToBase64(file) })));
      await api.importCuratedReferences(session.id, { files });
      setReferenceFiles([]); await loadSession(session.id); setNotice(`已导入精选参考。`);
    });
  }

  async function setReferenceSelection(referenceId: string, input: Omit<CreativeResearchReferenceSelectionDto, 'referenceId' | 'updatedAt'> & { rejectionReason?: string }) {
    await action(`selection:${referenceId}`, async () => {
      const saved = await api.setReferenceSelection({ sessionId, referenceId, ...input });
      setSelections((current) => [...current.filter((item) => item.referenceId !== referenceId), saved]);
      if (input.state === 'REJECTED') setNegativeSignals(await api.listNegativeSignals(sessionId));
    });
  }

  async function removeReference(referenceId: string) {
    if (!window.confirm('确定删除这张精选参考吗？')) return;
    await action(`selection:${referenceId}`, async () => { await api.removeCuratedReference(sessionId, referenceId); await loadSession(sessionId); });
  }

  async function updateReferenceSource(referenceId: string, input: { sourceUrl?: string; sourceLabel?: string }) {
    await action(`selection:${referenceId}`, async () => {
      const updated = await api.updateCuratedReferenceSource(sessionId, referenceId, input);
      setReferences((items) => items.map((item) => item.id === referenceId ? updated : item));
    });
  }

  async function analyzePreferences() {
    await action('preferences', async () => { await api.analyzePreferences(sessionId, profileId); setPreferenceInsights(await api.listPreferenceInsights(sessionId)); });
  }

  async function startDirectionFlow() {
    await action('direction', async () => { const result = await api.startDirection(sessionId); setSession(result.session); setBoard(result.board); setPendingFinalizedInsights(result.pendingFinalizedInsights); setTab('direction'); });
  }

  const project = projects.find((item) => item.id === (session?.projectId || projectId));
  const curatedReferences = references.filter((item) => item.sourceType === 'CURATED_REFERENCE');
  const legacyReferences = references.filter((item) => item.sourceType === 'WEB_REFERENCE');
  const selectedReferenceCount = selections.filter((item) => item.state === 'SELECTED').length;
  const judgedCount = selections.filter((item) => item.state !== 'NONE').length;
  const directionTabEnabled = session?.status === 'DIRECTION' || session?.status === 'COMPLETED';
  const createReady = Boolean(projectId && documents.length && profileId && !busy);

  if (!sessionId) return <main className="cr-shell">
    <header className="cr-top"><button onClick={onBack}>← 项目</button><div><span>Creative Research</span><h1>灵感研究工作台</h1></div><button onClick={onOpenSettings}>模型设置</button></header>
    {error && <div className="cr-alert cr-alert--error">{error}</div>}{notice && <div className="cr-alert cr-alert--success">{notice}</div>}
    <section className="cr-intake cr-panel">
      <div><span className="cr-step">01</span><h2>导入设计资料</h2><input type="file" multiple disabled={Boolean(busy)} accept=".pdf,.docx,.md,.markdown,.txt" onChange={(event) => setDocuments(Array.from(event.target.files || []))} /><small>{documents.length ? `${documents.length} 份文档` : '至少导入 1 份项目资料'}</small></div>
      <div><span className="cr-step">02</span><h2>选择项目</h2><select value={projectId} disabled={Boolean(busy)} onChange={(event) => setProjectId(event.target.value)}><option value="" disabled>请选择项目</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.projectName}</option>)}</select><small>不会默认选择历史项目。</small></div>
      <div><span className="cr-step">03</span><h2>选择分析模型</h2><select value={profileId} disabled={Boolean(busy)} onChange={(event) => setProfileId(event.target.value)}>{analysisProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></div>
      <Button variant="primary" disabled={!createReady} onClick={() => void createSession()}>{busy === 'creating' ? '正在创建…' : '创建研究 Session'}</Button>
    </section>
    <section className="cr-recent"><h2>最近研究</h2>{sessions.length ? sessions.map((item) => <article key={item.id} className="cr-recent__item"><button type="button" className="cr-recent__open" onClick={() => onNavigate(`/creative-research/${item.id}`)}><strong>{projects.find((candidate) => candidate.id === item.projectId)?.projectName || item.projectId}</strong><span>{item.status} · {formatRelativeTime(item.updatedAt)}</span></button></article>) : <p>还没有研究记录。</p>}</section>
  </main>;

  return <main className="cr-shell">
    <header className="cr-top"><button onClick={() => onNavigate('/creative-research')}>← 研究列表</button><div><span>{project?.projectName || 'Creative Research'}</span><h1>灵感研究工作台</h1></div><div className="cr-top__status"><b>{session?.status || '载入中'}</b><button onClick={onOpenSettings}>设置</button></div></header>
    {error && <div className="cr-alert cr-alert--error">{error}</div>}{notice && <div className="cr-alert cr-alert--success">{notice}</div>}
    <nav className="cr-tabs"><button className={tab === 'brief' ? 'is-active' : ''} onClick={() => setTab('brief')}>Brief & Guide</button><button className={tab === 'references' ? 'is-active' : ''} onClick={() => setTab('references')}>Reference Board <span>{curatedReferences.length}</span></button><button className={tab === 'direction' ? 'is-active' : ''} disabled={!directionTabEnabled} onClick={() => setTab('direction')}>Direction</button></nav>
    {session && <ResearchExecutionPanel session={session} projectName={project?.projectName || session.projectId} briefReady={Boolean(brief)} guideReady={Boolean(guide)} referenceCount={curatedReferences.length} judgedCount={judgedCount} preferenceCount={preferenceInsights.length} directionReady={Boolean(board)} busy={busy} operationStartedAt={operationStartedAt} failure={executionFailure} onDismissFailure={() => { setExecutionFailure(null); setError(''); }} />}
    {!session || !brief ? <section className="cr-panel cr-loading"><p>{session ? '此 Session 尚未生成 Design Brief。' : '正在载入研究 Session…'}</p>{session && <Button variant="primary" disabled={!profileId || Boolean(busy)} onClick={() => void generateBriefAndGuide()}>生成 Design Brief 与 Reference Guide</Button>}</section>
      : tab === 'brief' ? <>
        <BriefEditor brief={brief} editable={session.status === 'INTAKE' && !busy} busy={Boolean(busy)} onSave={async (input) => action('saving', async () => { setBrief(await api.updateDesignBrief(session.id, input)); setGuide(null); })} />
        {guide ? <ReferenceGuidePanel guide={guide} /> : <section className="cr-panel cr-loading"><p>Brief 已更新，需要为当前 Revision 重新生成 Reference Guide。</p><Button variant="primary" disabled={Boolean(busy) || !profileId} onClick={() => void generateGuide()}>生成 Reference Guide</Button></section>}
        {session.status === 'INTAKE' && guide && <section className="cr-start"><div><h2>研究范围已就绪</h2><p>下一步由你自行找图并导入精选参考。系统不会调用搜索 API，也不会生成 Search Query。</p></div><Button variant="primary" disabled={Boolean(busy)} onClick={() => void beginReferenceIntake()}>确认 Guide，开始导入参考</Button></section>}
      </>
      : tab === 'direction' ? (board ? <DirectionWorkspace session={session} brief={brief} board={board} references={references} selections={selections} negativeSignals={negativeSignals} insights={preferenceInsights} pendingFinalizedInsights={pendingFinalizedInsights} context={directionContext} busy={busy.startsWith('direction:')} onSave={async (input: UpdateCreativeResearchDirectionBoardInput) => action('direction:saving', async () => { setBoard(await api.updateDirectionBoard(sessionId, input)); })} onReturnToResearch={async () => action('direction:returning', async () => { setSession(await api.returnToResearch(sessionId)); setTab('references'); })} onComplete={async () => action('direction:completing', async () => { const result = await api.completeDirection(sessionId, { confirm: true }); setSession(result.session); setDirectionContext(result.context); })} /> : <section className="cr-panel cr-loading">方向板载入中…</section>)
      : <section className="cr-references">
        {guide && <ReferenceGuidePanel guide={guide} />}
        {session.status === 'RESEARCH' && <section className="cr-panel cr-reference-intake"><header className="cr-panel__head"><div><span>Reference Intake</span><h2>导入参考图</h2></div><b>{curatedReferences.length} / 50</b></header><p>把你已经筛选好的视觉参考导入这里。支持 JPG / JPEG / PNG / WEBP，单张不超过 20 MiB。</p><input type="file" multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={Boolean(busy)} onChange={(event) => setReferenceFiles(Array.from(event.target.files || []))} /><div className="cr-start__actions"><small>{referenceFiles.length ? `待导入 ${referenceFiles.length} 张` : '建议保留 8～20 张高质量参考'}</small><Button variant="primary" disabled={!referenceFiles.length || Boolean(busy)} onClick={() => void importReferences()}>导入精选参考</Button></div></section>}
        <SelectionTray selections={selections} references={curatedReferences} expanded={trayExpanded} onToggle={() => setTrayExpanded((value) => !value)} busy={Boolean(busy)} onAnalyze={() => void analyzePreferences()} />
        {preferenceInsights.length > 0 && <PreferenceInsightsPanel insights={preferenceInsights} references={references} negativeSignals={negativeSignals} busy={busy.startsWith('insight:')} readOnly={session.status !== 'RESEARCH'} onUpdate={async (id, value) => action(`insight:${id}`, async () => { const saved = await api.updatePreferenceInsight(sessionId, id, value); setPreferenceInsights((items) => items.map((item) => item.id === id ? saved : item)); })} onFinalize={async (id) => action(`insight:${id}`, async () => { const saved = await api.finalizePreferenceInsight(sessionId, id); setPreferenceInsights((items) => items.map((item) => item.id === id ? saved : item)); })} />}
        {session.status === 'RESEARCH' && selectedReferenceCount >= 3 && preferenceInsights.length > 0 && <section className="cr-direction-cta"><p>偏好 Evidence 已形成，可以转译为项目视觉方向。</p><Button variant="primary" disabled={Boolean(busy)} onClick={() => void startDirectionFlow()}>整理成视觉方向</Button></section>}
        <div className="cr-section-head"><h3>Reference Board / 精选参考</h3><span>{curatedReferences.length}</span></div>
        {curatedReferences.length ? <div className="cr-image-board">{curatedReferences.map((reference) => <ReferenceCard key={reference.id} display="IMAGE" reference={reference} selection={selections.find((item) => item.referenceId === reference.id)} busy={busy === `selection:${reference.id}`} readOnly={session.status !== 'RESEARCH'} onSelectionChange={(input) => setReferenceSelection(reference.id, input)} onRemove={() => removeReference(reference.id)} onUpdateSource={(input) => updateReferenceSource(reference.id, input)} />)}</div> : <div className="cr-empty">还没有精选参考。请先在外部完成第一轮审美筛选，再把值得研究的图片导入这里。</div>}
        {legacyReferences.length > 0 && <details className="cr-panel cr-legacy-references"><summary>历史搜索 Evidence · {legacyReferences.length} 项（只读）</summary><p>这些参考来自旧版 Session，数据仍被保留，但不会进入新的自动搜索流程。</p><div className="cr-image-board">{legacyReferences.map((reference) => <ReferenceCard key={reference.id} display={reference.resourceType} reference={reference} selection={selections.find((item) => item.referenceId === reference.id)} busy={false} readOnly onSelectionChange={async () => undefined} />)}</div></details>}
      </section>}
  </main>;
}
