import type { CreativeResearchPlanDto } from '@masterpiece/runtime-core/application-contracts.ts';
import { Button } from '../../components/ui/Button';

const TRACK_KIND_LABELS: Record<CreativeResearchPlanDto['tracks'][number]['kind'], string> = {
  CATEGORY: '品类',
  MARKET: '市场',
  CONCEPT: '概念',
  CULTURE: '文化',
  VISUAL: '视觉',
  COMPLIANCE: '合规',
};

export function ResearchPlanPanel({ plan, busy, frozen, onGenerate }: {
  plan: CreativeResearchPlanDto | null;
  busy: boolean;
  frozen: boolean;
  onGenerate(): Promise<void>;
}) {
  if (!plan) return <section className="cr-plan cr-panel">
    <header className="cr-panel__head"><div><span>Research planner</span><h2>研究计划</h2></div><b>尚未生成</b></header>
    <p className="cr-plan__intro">系统会先把研究线索归纳为 3～6 个主题，再组合成少量高上下文搜索语句，不会逐条搜索关键词。</p>
    {!frozen && <Button variant="secondary" disabled={busy} onClick={() => void onGenerate()}>{busy ? '正在规划…' : '生成研究计划'}</Button>}
  </section>;

  const trackById = new Map(plan.tracks.map((track) => [track.id, track]));
  return <section className="cr-plan cr-panel">
    <header className="cr-panel__head">
      <div><span>Research planner</span><h2>研究计划</h2></div>
      <b>{plan.tracks.length} 个主题 · {plan.firstRoundQueries.length} 条首轮 Query</b>
    </header>
    <p className="cr-plan__intro">关键词已经聚类为研究主题；视觉表现线索默认延后，不会在首轮直接搜索。</p>
    <ol className="cr-plan__tracks">
      {plan.tracks.map((track, index) => <li key={track.id} className={track.firstRoundEligible ? 'is-initial' : 'is-deferred'}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <div><strong>{track.title}</strong><p>{track.summary}</p><small>{TRACK_KIND_LABELS[track.kind]} · {track.firstRoundEligible ? '首轮研究' : '第二轮线索'}</small></div>
        <i aria-label={track.firstRoundEligible ? '首轮研究' : '第二轮'}>{track.firstRoundEligible ? '●' : '○'}</i>
      </li>)}
    </ol>
    <div className="cr-plan__queries">
      <h3>首轮研究 · {plan.firstRoundQueries.length} 个方向</h3>
      {plan.firstRoundQueries.map((query) => <article key={query.id}>
        <span>{trackById.get(query.trackId)?.title || '研究主题'}</span>
        <strong>{query.text}</strong>
      </article>)}
    </div>
    <footer><small>{plan.plannerMode === 'DETERMINISTIC_FALLBACK' ? '模型规划不可用，已采用克制的确定性计划。' : '已由分析模型完成主题聚类与 Query 合成。'}</small></footer>
  </section>;
}
