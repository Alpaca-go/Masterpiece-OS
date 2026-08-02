import { useEffect, useRef, useState } from 'react';
import type { AnalysisProgress, ProjectRecord } from '../../../shared/types';
import { formatDuration } from '../utils';

const stages: Array<[AnalysisProgress['stage'], string]> = [
  ['preparing-assets', '素材准备'],
  ['extracting-project-facts', '项目信息识别'],
  ['building-contact-sheet', '视觉总览生成'],
  ['building-prompt', '分析任务构建'],
  ['reasoning', '深度创意导演分析'],
  ['generating-report', '报告生成'],
  ['validating-output', '输出校验'],
  ['repairing-decisions', '完善项目决策'],
  ['awaiting-confirmation', '等待项目事实确认'],
  ['completed', '分析完成']
];

interface Props {
  project: ProjectRecord;
  progress: AnalysisProgress | null;
  error?: string;
  onCancel(): Promise<boolean>;
  onConfirm(responses: Record<string, string>): Promise<void>;
  onRetry(): void;
  onBack(): void;
}

export function AnalysisView({ project, progress, error, onCancel, onConfirm, onRetry, onBack }: Props) {
  const mountedAt = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const awaitingConfirmation = project.status === 'awaiting_confirmation'
    && Boolean(project.analysisConfirmation?.questions.length);
  const terminal = awaitingConfirmation || progress?.stage === 'failed' || progress?.stage === 'cancelled';
  const current = stages.findIndex(([stage]) => stage === progress?.stage);
  const failedStage = stages.find(([stage]) => stage === progress?.failedAtStage)?.[1];
  const started = progress?.startedAt ? Date.parse(progress.startedAt) : mountedAt.current;
  const elapsed = terminal ? (progress?.elapsedMs ?? now - started) : now - started;

  async function cancel() {
    if (!window.confirm('确定要取消当前分析吗？\n已经产生的临时文件将被清理。')) return;
    setCancelling(true);
    try { await onCancel(); } finally { setCancelling(false); }
  }

  async function confirm() {
    const questions = project.analysisConfirmation?.questions ?? [];
    if (questions.some((question) => !String(responses[question.code] ?? '').trim())) return;
    setConfirming(true);
    try { await onConfirm(responses); } finally { setConfirming(false); }
  }

  return <div className={`analysis-screen ${terminal ? 'terminal' : ''}`}>
    <div className={`analysis-orbit ${terminal ? progress?.stage : ''}`}>
      <div className="indeterminate-dots"><i /><i /><i /></div>
    </div>
    <p className="eyebrow">FUSION ENHANCED</p>
    <h1>{progress?.message || '正在准备分析'}</h1>
    <p className="analysis-subtitle">{awaitingConfirmation ? '分析检查点已保存。请确认下列真实项目信息。' : terminal ? `${failedStage ? `结束阶段：${failedStage} · ` : ''}${error || project.lastError || ''}` : '隐藏推理过程不会显示；这里只呈现可理解的 Pipeline 阶段。'}</p>
    <div className="run-metrics">
      <div><small>任务状态</small><strong>{awaitingConfirmation ? '等待确认' : progress?.stage === 'failed' ? '分析失败' : progress?.stage === 'cancelled' ? '已取消' : '运行中'}</strong></div>
      <div><small>当前模型</small><strong>{progress?.model || project.model || '正在读取'}</strong></div>
      <div><small>已读取素材</small><strong>{progress?.assetCount ?? project.assetCount} 个</strong></div>
      <div><small>已运行时间</small><strong>{formatDuration(Math.max(0, elapsed))}</strong></div>
      <div><small>缓存状态</small><strong>{progress?.cacheStatus === 'hit' ? '已命中' : progress?.cacheStatus === 'forced' ? '强制新推理' : progress?.cacheStatus === 'miss' ? '未命中' : '检查中'}</strong></div>
    </div>
    <div className="stage-list">{stages.map(([stage, label], index) => <div key={stage} className={`stage-row ${index < current || progress?.stage === 'completed' ? 'done' : index === current ? 'active' : ''}`}><span>{index < current || progress?.stage === 'completed' ? '✓' : index === current ? '●' : '○'}</span><strong>{label}</strong></div>)}</div>
    {awaitingConfirmation && <section className="panel analysis-confirmation-panel">
      <div className="section-heading"><span>!</span><div><h2>确认项目事实</h2><p>回答后继续分析，系统不会把无证据推测当作事实。</p></div></div>
      {(project.analysisConfirmation?.questions ?? []).map((question) => <label key={question.code} className="field-label">
        <span>{question.question}</span>
        {question.options?.length
          ? <select value={responses[question.code] ?? ''} onChange={(event) => setResponses((current) => ({ ...current, [question.code]: event.target.value }))}>
            <option value="">请选择</option>
            {question.options.map((option) => <option key={option.id} value={option.label}>{option.label}</option>)}
          </select>
          : <textarea rows={3} value={responses[question.code] ?? ''} onChange={(event) => setResponses((current) => ({ ...current, [question.code]: event.target.value }))} />}
      </label>)}
      <div className="button-row">
        <button className="button primary" disabled={confirming || (project.analysisConfirmation?.questions ?? []).some((question) => !String(responses[question.code] ?? '').trim())} onClick={() => void confirm()}>{confirming ? '正在继续…' : '确认并继续分析'}</button>
        <button className="button ghost" onClick={onBack}>返回素材页</button>
      </div>
    </section>}
    {terminal
      ? awaitingConfirmation ? null : <div className="button-row"><button className="button primary" onClick={onRetry}>重新分析</button><button className="button ghost" onClick={onBack}>返回素材页</button></div>
      : <button className="button ghost" disabled={cancelling} onClick={() => void cancel()}>{cancelling ? '正在取消…' : '取消分析'}</button>}
  </div>;
}
