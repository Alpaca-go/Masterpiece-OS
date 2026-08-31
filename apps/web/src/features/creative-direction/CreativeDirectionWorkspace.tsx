import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type {
  CreativeDirectionSession,
  CreativeDirectionWorkspace as Workspace,
  CreativeIntelligenceRun,
  CreativeResearchSessionDto,
  ProjectRecord,
  SharedProjectFact,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import './creative-direction.css';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`无法读取「${file.name}」`));
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.readAsDataURL(file);
  });
}

function LaneBadge({ state }: { state: string }) {
  const labels: Record<string, string> = { EMPTY: '尚未开始', IN_PROGRESS: '进行中', READY: '可用于综合', BLOCKED: '需要处理' };
  return <span className={`cd-badge cd-badge--${state.toLowerCase()}`}>{labels[state] || state}</span>;
}

function DirectionLists({ final }: { final: NonNullable<Workspace['finalDirection']> }) {
  return <div className="cd-columns">
    <div><h3>策略原则</h3>{final.strategicPrinciples.length ? <ul>{final.strategicPrinciples.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="cd-muted">暂无策略原则</p>}</div>
    <div><h3>视觉原则</h3>{final.visualPrinciples.length ? <ul>{final.visualPrinciples.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="cd-muted">视觉研究尚未完成</p>}</div>
    <div><h3>避免与风险</h3>{final.negativeConstraints.length || final.risks.length ? <ul>{[...final.negativeConstraints, ...final.risks].map((item) => <li key={item}>{item}</li>)}</ul> : <p className="cd-muted">暂无已识别风险</p>}</div>
  </div>;
}

function ProductionStatus(props: {
  workspace: Workspace;
  busy: boolean;
  onRetry: () => void;
  onNavigate: (path: string) => void;
}) {
  const handoff = props.workspace.productionHandoff;
  if (!handoff) return null;
  if (handoff.status === 'STALE') return <section className="cd-production cd-production--warning"><h3>生产上下文已过期</h3><p>上游内容已发生变化。请重新综合并确认最终方向后再进入生产。</p></section>;
  if (handoff.status === 'COMPILING') return <section className="cd-production"><h3>正在准备生产上下文</h3><ol><li className="is-done">最终方向已确认</li><li className="is-active">正在建立 Visual Canon 与 Anchor Contract</li><li>空间 / 包装生产上下文</li></ol></section>;
  if (handoff.status === 'FAILED') return <section className="cd-production cd-production--error"><h3>最终方向已确认，但生产上下文准备失败</h3><p>{handoff.errorCode}{handoff.errorMessage ? ` · ${handoff.errorMessage}` : ''}</p><button className="cd-primary" disabled={props.busy} onClick={props.onRetry}>重新准备</button></section>;
  if (handoff.status === 'READY') return <section className="cd-production cd-production--ready"><h3>生产上下文已准备完成</h3><p>Visual Canon 与 Anchor Contract 已建立，可进入真实可用的生产入口。</p><div className="cd-actions">{handoff.packagingTranslationId && <button className="cd-primary" onClick={() => props.onNavigate('/packaging')}>进入包装效果图</button>}</div></section>;
  return <section className="cd-production cd-production--pending"><h3>最终方向已确认</h3>{handoff.pendingReason === 'VISUAL_RESEARCH_REQUIRED' ? <><p>视觉研究尚未完成，完整视觉生产上下文暂不生成。</p><button onClick={() => props.onNavigate(`/creative-research?projectId=${encodeURIComponent(props.workspace.session.projectId)}`)}>继续视觉研究 →</button></> : <p>Canon authority 的生产接入仍在审计中；当前不会伪造 Visual Canon 或生产入口。</p>}</section>;
}

export function CreativeDirectionWorkspace(props: {
  projects: ProjectRecord[];
  onNavigate: (path: string) => void;
  onBack: () => void;
}) {
  const { confirm } = useConfirm();
  const location = useLocation();
  const sessionId = location.pathname.match(/^\/creative-direction\/([^/]+)/)?.[1] || null;
  const [sessions, setSessions] = useState<CreativeDirectionSession[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projectId, setProjectId] = useState(props.projects[0]?.id || '');
  const [documents, setDocuments] = useState<File[]>([]);
  const [facts, setFacts] = useState<SharedProjectFact[]>([]);
  const [strategyRuns, setStrategyRuns] = useState<CreativeIntelligenceRun[]>([]);
  const [researchSessions, setResearchSessions] = useState<CreativeResearchSessionDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const project = useMemo(() => props.projects.find((item) => item.id === projectId), [projectId, props.projects]);

  const loadIndex = async () => setSessions(await window.masterpiece.creativeDirection.listSessions());
  const loadWorkspace = async (id: string) => {
    const value = await window.masterpiece.creativeDirection.getWorkspace(id);
    setWorkspace(value); setFacts(value.context.facts);
    const [runs, research] = await Promise.all([
      window.masterpiece.creativeIntelligence.listRuns(),
      window.masterpiece.creativeResearch.listSessions(value.session.projectId),
    ]);
    setStrategyRuns(runs.filter((run) => !run.projectId || run.projectId === value.session.projectId));
    setResearchSessions(research);
  };
  useEffect(() => { void (sessionId ? loadWorkspace(sessionId) : loadIndex()).catch((reason) => setError(String(reason))); }, [sessionId]);

  const run = async (task: () => Promise<Workspace>) => {
    setBusy(true); setError('');
    try { const value = await task(); setWorkspace(value); setFacts(value.context.facts); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };
  const create = async () => {
    if (!project || !documents.length) return;
    setBusy(true); setError('');
    try {
      const sourceDocumentIds = await window.masterpiece.documentContext.importDocuments({ documents: await Promise.all(documents.map(async (file) => ({
        name: file.name, size: file.size, content: await fileToBase64(file),
      }))) });
      const value = await window.masterpiece.creativeDirection.createSession({
        projectId: project.id, projectName: project.projectName, brandName: project.brandName,
        industry: project.industry, description: project.description, lockedFacts: project.lockedFacts,
        sourceDocumentIds, sourceDocumentLabels: documents.map((file) => file.name),
      });
      props.onNavigate(`/creative-direction/${value.session.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };
  const deleteRecent = async (target: CreativeDirectionSession) => {
    const approved = await confirm({
      title: '删除创意策划记录',
      message: `确定删除「${target.projectName}」的这条创意策划记录吗？\n\n只会删除统一工作区及最终方向草案；已关联的策略推演和视觉研究记录会保留。`,
      confirmText: '删除记录',
      tone: 'destructive',
    });
    if (!approved) return;
    setBusy(true); setError('');
    try {
      const result = await window.masterpiece.creativeDirection.deleteSession(target.id);
      if (!result.deleted) throw new Error('删除失败：记录不存在');
      setSessions((current) => current.filter((item) => item.id !== target.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };

  if (!sessionId) return <main className="cd-shell">
    <header className="cd-header"><button onClick={props.onBack}>← 项目</button><div><small>CREATIVE DIRECTION</small><h1>创意策划</h1></div><span /></header>
    <section className="cd-intro"><p>从同一份项目理解出发，按需完成策略推演与视觉研究，最终由你确认创意方向。</p></section>
    {error && <p className="cd-error">{error}</p>}
    <section className="cd-card cd-create">
      <div><small>NEW WORKSPACE</small><h2>开始创意策划</h2></div>
      <label className="cd-upload"><span>导入项目资料</span><input type="file" multiple disabled={busy} accept=".pdf,.docx,.md,.markdown,.txt" onChange={(event) => setDocuments(Array.from(event.target.files || []))} /><small>{documents.length ? `已选择 ${documents.length} 份文档` : '至少上传 1 份 PDF、DOCX、Markdown 或 TXT'}</small></label>
      <select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">请选择项目</option>{props.projects.map((item) => <option key={item.id} value={item.id}>{item.projectName}</option>)}</select>
      <button className="cd-primary" disabled={!projectId || !documents.length || busy} onClick={() => void create()}>{busy ? '正在上传并创建…' : '建立统一工作区'}</button>
    </section>
    <section className="cd-list"><h2>最近创意策划</h2>{sessions.length === 0 && <p className="cd-muted">还没有创意策划记录。</p>}{sessions.map((item) => <article key={item.id} className="cd-list__item"><button className="cd-list__open" onClick={() => props.onNavigate(`/creative-direction/${item.id}`)}><strong>{item.projectName}</strong><span>{item.sourceDocumentCount ?? 0} 份资料 · {item.status} · Context R{item.contextRevision}</span></button><button className="cd-list__delete" disabled={busy} aria-label={`删除 ${item.projectName} 的创意策划记录`} onClick={() => void deleteRecent(item)}>删除</button></article>)}</section>
  </main>;

  if (!workspace) return <main className="cd-shell"><p>{error || '正在载入创意策划…'}</p></main>;
  const strategyLane = workspace.lanes.find((lane) => lane.kind === 'STRATEGY')!;
  const visualLane = workspace.lanes.find((lane) => lane.kind === 'VISUAL_RESEARCH')!;
  const final = workspace.finalDirection;
  return <main className="cd-shell">
    <header className="cd-header"><button onClick={() => props.onNavigate('/creative-direction')}>← 创意策划</button><div><small>CREATIVE DIRECTION</small><h1>{workspace.session.projectName}</h1></div><span>Context R{workspace.context.revision}</span></header>
    <nav className="cd-steps"><a href="#context">项目理解</a><a href="#lanes">策略推演</a><a href="#lanes">视觉研究</a><a href="#final">最终方向</a></nav>
    {error && <p className="cd-error">{error}</p>}
    <section id="context" className="cd-card">
      <div className="cd-section-title"><div><small>01 · SHARED CONTEXT</small><h2>项目理解</h2></div><span>{workspace.context.confirmedByUser ? '已由用户确认' : '等待确认'}</span></div>
      <p className="cd-muted">这里的事实会同时约束两条工作通道。修改后会建立新版本，并将旧的最终方向标记为需要重审。</p>
      <div className="cd-facts">{facts.map((fact, index) => <label key={`${fact.key}-${index}`}><span>{fact.key === 'lockedFact' ? '锁定事实' : fact.key}</span><input value={fact.value} onChange={(event) => setFacts(facts.map((item, i) => i === index ? { ...item, value: event.target.value, authority: 'USER_CONFIRMED' } : item))} /><small>{fact.authority} · {fact.evidence.join(' / ')}</small></label>)}</div>
      <button className="cd-primary" disabled={busy} onClick={() => void run(() => window.masterpiece.creativeDirection.updateContext(sessionId, { facts, confirm: true }))}>确认并建立新版本</button>
    </section>
    <section id="lanes" className="cd-lanes">
      <article className="cd-card"><div className="cd-section-title"><div><small>02 · STRATEGY</small><h2>策略推演</h2></div><LaneBadge state={strategyLane.state} /></div><p>{strategyLane.summary}</p><select value={workspace.session.strategyRunId || ''} onChange={(event) => void run(() => window.masterpiece.creativeDirection.linkStrategy(sessionId, event.target.value || null))}><option value="">关联已有策略推演</option>{strategyRuns.map((item) => <option key={item.id} value={item.id}>{item.projectName} · {item.status}</option>)}</select><button onClick={() => props.onNavigate(`/creative-intelligence?projectId=${encodeURIComponent(workspace.session.projectId)}`)}>进入策略推演 →</button></article>
      <article className="cd-card"><div className="cd-section-title"><div><small>03 · VISUAL RESEARCH</small><h2>视觉研究</h2></div><LaneBadge state={visualLane.state} /></div><p>{visualLane.summary}</p><select value={workspace.session.visualResearchSessionId || ''} onChange={(event) => void run(() => window.masterpiece.creativeDirection.linkVisualResearch(sessionId, event.target.value || null))}><option value="">关联已有视觉研究</option>{researchSessions.map((item) => <option key={item.id} value={item.id}>{item.status} · {new Date(item.updatedAt).toLocaleString()}</option>)}</select><button onClick={() => props.onNavigate(`/creative-research?projectId=${encodeURIComponent(workspace.session.projectId)}`)}>进入视觉研究 →</button></article>
    </section>
    <section id="final" className="cd-card cd-final">
      <div className="cd-section-title"><div><small>04 · FINAL DIRECTION</small><h2>最终方向</h2></div>{final && <span>{final.stale ? '上游已变化 · 需要重审' : final.status === 'FINALIZED' ? '已定稿' : '待确认'}</span>}</div>
      {!final && <p className="cd-muted">任一通道达到“可用于综合”即可生成草案；两个通道都完成时会一并识别策略与视觉之间的张力。</p>}
      <button className="cd-primary" disabled={busy || !workspace.context.confirmedByUser || !workspace.lanes.some((lane) => lane.state === 'READY')} onClick={() => void run(() => window.masterpiece.creativeDirection.synthesize(sessionId))}>{final ? '重新综合方向' : '综合方向草案'}</button>
      {!workspace.context.confirmedByUser && <p className="cd-gate-hint">请先在“项目理解”中确认事实，之后再完成至少一条工作通道。</p>}
      {workspace.context.confirmedByUser && !workspace.lanes.some((lane) => lane.state === 'READY') && <p className="cd-gate-hint">请在策略推演中确认一个方向，或在视觉研究中完成 Direction，任一通道就绪后即可综合。</p>}
      {final?.status === 'DRAFT' && <div className="cd-direction cd-direction--draft"><input className="cd-title-input" value={final.title} onChange={(event) => setWorkspace({ ...workspace, finalDirection: { ...final, title: event.target.value } })} /><textarea value={final.proposition} onChange={(event) => setWorkspace({ ...workspace, finalDirection: { ...final, proposition: event.target.value } })} /><DirectionLists final={final} /><p className="cd-coverage">来源覆盖：策略 {final.sourceCoverage.strategy} · 视觉 {final.sourceCoverage.visualResearch} · Context R{final.sourceCoverage.contextRevision}</p>{final.sourceCoverage.visualResearch !== 'USED' && <p className="cd-gate-hint">当前方向未包含完整视觉研究；视觉研究完成后需要重新综合。</p>}<div className="cd-actions"><button onClick={() => void run(() => window.masterpiece.creativeDirection.updateDraft(sessionId, { title: final.title, proposition: final.proposition }))}>保存编辑</button><button className="cd-primary" disabled={final.stale} onClick={() => void run(() => window.masterpiece.creativeDirection.finalize(sessionId, true))}>确认最终方向</button></div></div>}
      {final?.status === 'FINALIZED' && <div className="cd-direction cd-direction--finalized"><div className="cd-finalized-meta"><span>FINAL DIRECTION · R{final.revision}</span><strong>已确认</strong></div><h2>{final.title}</h2><div className="cd-proposition"><small>核心创意主张</small><p>{final.proposition}</p></div><DirectionLists final={final} /><p className="cd-coverage">来源：Strategy {final.sourceCoverage.strategy} · Visual {final.sourceCoverage.visualResearch} · Context R{final.sourceCoverage.contextRevision}</p><p className="cd-finalized-time">确认时间：{final.finalizedAt ? new Date(final.finalizedAt).toLocaleString() : '—'} · 来源指纹 {final.sourceFingerprint.digest.slice(0, 10)}</p></div>}
      {final?.stale && <p className="cd-gate-hint">上游内容已发生变化，当前最终方向需要重新综合；旧生产结果仅可作为旧版本查看。</p>}
      <ProductionStatus workspace={workspace} busy={busy} onRetry={() => void run(() => window.masterpiece.creativeDirection.retryProduction(sessionId))} onNavigate={props.onNavigate} />
    </section>
  </main>;
}
