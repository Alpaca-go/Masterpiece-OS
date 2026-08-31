import { useEffect, useMemo, useState } from 'react';
import type { CreativeResearchSessionDto } from '@masterpiece/runtime-core/application-contracts.ts';
import { Button } from '../../components/ui/Button';

export type ResearchExecutionStageState = 'completed' | 'active' | 'waiting' | 'failed';
export interface ResearchExecutionFailure { operation: string; message: string }
export interface ResearchExecutionStage { id: string; label: string; detail: string; state: ResearchExecutionStageState }

interface DeriveExecutionStagesInput {
  session: CreativeResearchSessionDto;
  projectName: string;
  briefReady: boolean;
  guideReady: boolean;
  referenceCount: number;
  judgedCount: number;
  preferenceCount: number;
  directionReady: boolean;
  busy: string;
  failure: ResearchExecutionFailure | null;
}

function operationStage(operation: string): string | null {
  if (operation === 'brief' || operation === 'saving') return 'brief';
  if (operation === 'guide') return 'guide';
  if (operation === 'importing') return 'intake';
  if (operation.startsWith('selection:')) return 'judgment';
  if (operation === 'preferences' || operation.startsWith('insight:')) return 'preferences';
  if (operation === 'direction' || operation.startsWith('direction:')) return 'direction';
  return null;
}

export function deriveResearchExecutionStages(input: DeriveExecutionStagesInput): ResearchExecutionStage[] {
  const failed = input.failure ? operationStage(input.failure.operation) : null;
  const active = operationStage(input.busy);
  const state = (id: string, completed: boolean, activeWhen = false): ResearchExecutionStageState => {
    if (failed === id) return 'failed';
    if (active === id || activeWhen) return 'active';
    return completed ? 'completed' : 'waiting';
  };
  return [
    { id: 'project', label: '校验项目与资料', detail: `${input.projectName} · ${input.session.sourceDocumentCount} 份资料`, state: 'completed' },
    { id: 'brief', label: '解析资料并生成 Brief', detail: input.briefReady ? 'Design Brief 已生成' : '等待生成 Design Brief', state: state('brief', input.briefReady) },
    { id: 'guide', label: '生成视觉参考研究指南', detail: input.guideReady ? 'Reference Guide 已就绪' : '等待生成研究领域', state: state('guide', input.guideReady) },
    { id: 'intake', label: '等待设计师导入参考', detail: `已导入 ${input.referenceCount} 张`, state: state('intake', input.referenceCount > 0, input.session.status === 'RESEARCH' && input.referenceCount === 0) },
    { id: 'judgment', label: '整理参考判断', detail: `已判断 ${input.judgedCount} 张`, state: state('judgment', input.judgedCount >= 3, input.referenceCount > 0 && input.judgedCount < 3) },
    { id: 'preferences', label: '分析视觉偏好', detail: input.preferenceCount ? `已形成 ${input.preferenceCount} 条 Evidence Insight` : '至少收藏 3 张后可分析', state: state('preferences', input.preferenceCount > 0) },
    { id: 'direction', label: '生成候选视觉方向', detail: input.directionReady ? 'Direction Board 已建立' : '等待偏好确认', state: state('direction', input.directionReady) },
    { id: 'board', label: '整理 Direction Board', detail: input.session.status === 'COMPLETED' ? '方向板已确认' : '等待设计师确认', state: input.session.status === 'COMPLETED' ? 'completed' : input.directionReady ? 'active' : 'waiting' },
    { id: 'context', label: '完成 Creative Direction Context', detail: input.session.status === 'COMPLETED' ? '生产上下文已冻结' : '等待最终确认', state: input.session.status === 'COMPLETED' ? 'completed' : 'waiting' },
  ];
}

function elapsedLabel(elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  return seconds >= 60 ? `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒` : `${seconds} 秒`;
}

export function ResearchExecutionPanel(props: DeriveExecutionStagesInput & { operationStartedAt: number | null; onDismissFailure(): void }) {
  const [clock, setClock] = useState(() => Date.now());
  const stages = useMemo(() => deriveResearchExecutionStages(props), [props]);
  useEffect(() => {
    if (!props.busy || props.operationStartedAt === null) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [props.busy, props.operationStartedAt]);
  const active = stages.find((stage) => stage.state === 'active');
  return <section className="cr-execution cr-panel" aria-live="polite">
    <header className="cr-execution__head"><div><span>Research progress</span><h2>{active ? active.label : '灵感研究进度'}</h2></div>{props.busy && props.operationStartedAt !== null && <b>已运行 {elapsedLabel(clock - props.operationStartedAt)}</b>}</header>
    <ol className="cr-execution__stages">{stages.map((stage, index) => <li key={stage.id} className={`is-${stage.state}`}><span className="cr-execution__marker" aria-hidden>{stage.state === 'completed' ? '✓' : stage.state === 'active' ? '●' : stage.state === 'failed' ? '!' : '○'}</span><div><strong>{String(index + 1).padStart(2, '0')} {stage.label}</strong><small>{stage.detail}</small></div></li>)}</ol>
    {props.failure && <div className="cr-execution__failure" role="alert"><div><strong>当前步骤执行失败</strong><p>{props.failure.message}</p></div><Button variant="secondary" size="sm" onClick={props.onDismissFailure}>关闭</Button></div>}
  </section>;
}
