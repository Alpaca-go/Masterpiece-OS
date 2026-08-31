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
import './creative-direction.css';

function LaneBadge({ state }: { state: string }) {
  const labels: Record<string, string> = { EMPTY: '尚未开始', IN_PROGRESS: '进行中', READY: '可用于综合', BLOCKED: '需要处理' };
  return <span className={`cd-badge cd-badge--${state.toLowerCase()}`}>{labels[state] || state}</span>;
}

export function CreativeDirectionWorkspace(props: {
  projects: ProjectRecord[];
  onNavigate: (path: string) => void;
  onBack: () => void;
}) {
  const location = useLocation();
  const sessionId = location.pathname.match(/^\/creative-direction\/([^/]+)/)?.[1] || null;
  const [sessions, setSessions] = useState<CreativeDirectionSession[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projectId, setProjectId] = useState(props.projects[0]?.id || '');
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
    if (!project) return;
    setBusy(true); setError('');
    try {
      const value = await window.masterpiece.creativeDirection.createSession({
        projectId: project.id, projectName: project.projectName, brandName: project.brandName,
        industry: project.industry, description: project.description, lockedFacts: project.lockedFacts,
      });
      props.onNavigate(`/creative-direction/${value.session.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); setBusy(false); }
  };

  if (!sessionId) return <main className="cd-shell">
    <header className="cd-header"><button onClick={props.onBack}>← 项目</button><div><small>CREATIVE DIRECTION</small><h1>创意策划</h1></div><span /></header>
    <section className="cd-intro"><p>从同一份项目理解出发，按需完成策略推演与视觉研究，最终由你确认创意方向。</p></section>
    {error && <p className="cd-error">{error}</p>}
    <section className="cd-card cd-create">
      <div><small>NEW WORKSPACE</small><h2>开始创意策划</h2></div>
      <select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">请选择项目</option>{props.projects.map((item) => <option key={item.id} value={item.id}>{item.projectName}</option>)}</select>
      <button className="cd-primary" disabled={!projectId || busy} onClick={() => void create()}>建立统一工作区</button>
    </section>
    <section className="cd-list"><h2>最近创意策划</h2>{sessions.length === 0 && <p className="cd-muted">还没有创意策划记录。</p>}{sessions.map((item) => <button key={item.id} onClick={() => props.onNavigate(`/creative-direction/${item.id}`)}><strong>{item.projectName}</strong><span>{item.status} · Context R{item.contextRevision}</span></button>)}</section>
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
      {final && <div className="cd-direction"><input className="cd-title-input" value={final.title} disabled={final.status === 'FINALIZED'} onChange={(event) => setWorkspace({ ...workspace, finalDirection: { ...final, title: event.target.value } })} /><textarea value={final.proposition} disabled={final.status === 'FINALIZED'} onChange={(event) => setWorkspace({ ...workspace, finalDirection: { ...final, proposition: event.target.value } })} /><div className="cd-columns"><div><h3>策略原则</h3><ul>{final.strategicPrinciples.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>视觉原则</h3><ul>{final.visualPrinciples.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>避免与风险</h3><ul>{[...final.negativeConstraints, ...final.risks].map((item) => <li key={item}>{item}</li>)}</ul></div></div><p className="cd-coverage">来源覆盖：策略 {final.sourceCoverage.strategy} · 视觉 {final.sourceCoverage.visualResearch} · Context R{final.sourceCoverage.contextRevision}</p>{final.status === 'DRAFT' && <div className="cd-actions"><button onClick={() => void run(() => window.masterpiece.creativeDirection.updateDraft(sessionId, { title: final.title, proposition: final.proposition }))}>保存编辑</button><button className="cd-primary" disabled={final.stale} onClick={() => void run(() => window.masterpiece.creativeDirection.finalize(sessionId, true))}>确认最终方向</button></div>}</div>}
    </section>
  </main>;
}
