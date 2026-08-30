import { useEffect, useMemo, useState } from 'react';
import type {
  CreativeResearchQueryDto,
  CreativeResearchSessionDto,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { Button } from '../../components/ui/Button';

export type ResearchExecutionStageState = 'completed' | 'active' | 'waiting' | 'failed';

export interface ResearchExecutionFailure {
  operation: string;
  message: string;
}

export interface ResearchExecutionStage {
  id: string;
  label: string;
  detail: string;
  state: ResearchExecutionStageState;
}

interface DeriveExecutionStagesInput {
  session: CreativeResearchSessionDto;
  projectName: string;
  briefReady: boolean;
  planReady: boolean;
  queries: CreativeResearchQueryDto[];
  referenceCount: number;
  preferenceCount: number;
  directionReady: boolean;
  busy: string;
  failure: ResearchExecutionFailure | null;
}

function operationStage(operation: string): string | null {
  if (operation === 'brief' || operation === 'saving' || operation === 'reanalyzing') return 'brief';
  if (operation === 'planning' || operation === 'research-planning') return 'planning';
  if (['searching', 'refreshing', 'adjusting', 'similar'].includes(operation)) return 'search';
  if (operation === 'preferences' || operation.startsWith('insight:')) return 'preferences';
  if (operation === 'direction' || operation.startsWith('direction:')) return 'direction';
  return null;
}

export function deriveResearchExecutionStages(input: DeriveExecutionStagesInput): ResearchExecutionStage[] {
  const completedQueries = input.queries.filter((query) => query.status === 'COMPLETED').length;
  const pendingQueries = input.queries.filter((query) => query.status === 'PENDING').length;
  const knowledgeQueries = input.queries.filter((query) => query.intent === 'KNOWLEDGE');
  const visualQueries = input.queries.filter((query) => query.intent === 'VISUAL');
  const searchSettled = input.queries.length > 0 && pendingQueries === 0;
  const failedStage = input.failure ? operationStage(input.failure.operation) : null;
  const activeStage = operationStage(input.busy);
  const state = (id: string, completed: boolean): ResearchExecutionStageState => {
    if (failedStage === id) return 'failed';
    if (activeStage === id) return 'active';
    return completed ? 'completed' : 'waiting';
  };

  const intentSearchState = (queries: CreativeResearchQueryDto[]): ResearchExecutionStageState => {
    if (!queries.length) return 'waiting';
    if (failedStage === 'search' && queries.some((query) => query.status === 'FAILED')) return 'failed';
    if (activeStage === 'search' && queries.some((query) => query.status === 'PENDING')) return 'active';
    if (queries.every((query) => query.status === 'COMPLETED')) return 'completed';
    if (queries.every((query) => query.status !== 'PENDING') && queries.some((query) => query.status === 'FAILED')) return 'failed';
    return queries.some((query) => query.status === 'PENDING') ? 'active' : 'waiting';
  };

  return [
    {
      id: 'intake',
      label: '校验项目与资料',
      detail: `已确认 ${input.projectName} / 已导入 ${input.session.sourceDocumentCount} 份文档`,
      state: 'completed',
    },
    {
      id: 'brief',
      label: '解析资料并生成 Brief',
      detail: input.briefReady ? '已完成内容读取与 Brief 生成' : activeStage === 'brief' ? '正在读取资料并整理设计任务书' : '等待生成 Design Brief',
      state: state('brief', input.briefReady),
    },
    {
      id: 'planning',
      label: '归纳研究主题与 Query',
      detail: input.queries.length ? `已编译 ${input.queries.length} 组真实搜索任务` : input.planReady ? '研究主题与首轮 Query 已就绪' : activeStage === 'planning' ? '正在聚类线索并合成首轮 Query' : '等待生成 Research Plan',
      state: state('planning', input.planReady || input.queries.length > 0),
    },
    {
      id: 'knowledge-search',
      label: '搜索研究资料',
      detail: knowledgeQueries.length ? `已完成 ${knowledgeQueries.filter((query) => query.status === 'COMPLETED').length} / ${knowledgeQueries.length} 组知识检索` : '等待知识检索任务',
      state: intentSearchState(knowledgeQueries),
    },
    {
      id: 'visual-search',
      label: '搜索视觉参考',
      detail: visualQueries.length ? `已完成 ${visualQueries.filter((query) => query.status === 'COMPLETED').length} / ${visualQueries.length} 组视觉检索` : '等待视觉检索任务',
      state: intentSearchState(visualQueries),
    },
    {
      id: 'references',
      label: '整理参考结果',
      detail: searchSettled && completedQueries > 0 ? `已获得 ${input.referenceCount} 个参考结果` : '等待搜索结果',
      state: searchSettled && completedQueries > 0 ? 'completed' : 'waiting',
    },
    {
      id: 'preferences',
      label: '分析视觉偏好',
      detail: input.preferenceCount ? `已形成 ${input.preferenceCount} 条视觉倾向` : activeStage === 'preferences' ? '正在基于已收藏参考整理视觉倾向' : '等待设计师选择参考',
      state: state('preferences', input.preferenceCount > 0),
    },
    {
      id: 'direction',
      label: '整理研究方向',
      detail: input.session.status === 'COMPLETED' ? '研究方向已确认并生成上下文' : input.directionReady ? '视觉方向正在整理' : '等待进入方向整理',
      state: input.session.status === 'COMPLETED'
        ? 'completed'
        : failedStage === 'direction'
          ? 'failed'
          : activeStage === 'direction' || input.directionReady
            ? 'active'
            : 'waiting',
    },
  ];
}

function elapsedLabel(elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes} 分 ${remainder} 秒` : `${remainder} 秒`;
}

export function ResearchExecutionPanel(props: DeriveExecutionStagesInput & {
  operationStartedAt: number | null;
  onDismissFailure(): void;
}) {
  const [clock, setClock] = useState(() => Date.now());
  const stages = useMemo(() => deriveResearchExecutionStages(props), [
    props.session, props.projectName, props.briefReady, props.planReady, props.queries, props.referenceCount,
    props.preferenceCount, props.directionReady, props.busy, props.failure,
  ]);

  useEffect(() => {
    if (!props.busy || props.operationStartedAt === null) return;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [props.busy, props.operationStartedAt]);

  const active = stages.find((stage) => stage.state === 'active');
  const failureStage = stages.find((stage) => stage.state === 'failed');

  return <section className="cr-execution cr-panel" aria-live="polite">
    <header className="cr-execution__head">
      <div><span>Research progress</span><h2>{active ? '正在进行灵感研究' : '灵感研究进度'}</h2></div>
      {props.operationStartedAt !== null && props.busy && <b>已运行 {elapsedLabel(clock - props.operationStartedAt)}</b>}
    </header>
    <ol className="cr-execution__stages">
      {stages.map((stage, index) => <li key={stage.id} className={`is-${stage.state}`}>
        <span className="cr-execution__marker" aria-hidden>{stage.state === 'completed' ? '✓' : stage.state === 'active' ? '●' : stage.state === 'failed' ? '!' : '○'}</span>
        <div><strong>{String(index + 1).padStart(2, '0')} {stage.label}</strong><small>{stage.detail}</small></div>
      </li>)}
    </ol>
    {props.failure && <div className="cr-execution__failure" role="alert">
      <div><strong>{failureStage?.label || '研究任务'}执行失败</strong><p>{props.failure.message}</p></div>
      <Button variant="secondary" size="sm" onClick={props.onDismissFailure}>返回研究页</Button>
    </div>}
    {active && <p className="cr-execution__lock">执行期间当前 Session 输入保持只读；完成或失败后才会恢复可用操作。</p>}
  </section>;
}
