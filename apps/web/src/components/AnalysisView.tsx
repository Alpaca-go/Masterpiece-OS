import { useEffect, useRef, useState } from 'react';
import type { AnalysisProgress, ProjectRecord } from '@masterpiece/runtime-core/application-contracts.ts';
import { formatDuration } from '../utils';
import { ProviderBadge } from './ProviderBadge';
import { PageShell } from './PageShell';
import { Badge } from './ui/Badge';

const stages: Array<[AnalysisProgress['stage'], string]> = [
  ['preparing-assets', '素材准备'],
  ['extracting-project-facts', '项目信息识别'],
  ['building-contact-sheet', '视觉总览生成'],
  ['building-prompt', '分析任务构建'],
  ['reasoning', '深度创意导演分析'],
  ['generating-report', '报告生成'],
  ['validating-output', '输出校验'],
  ['repairing-decisions', '完善项目决策'],
  ['completed', '分析完成']
];

interface Props {
  project: ProjectRecord;
  progress: AnalysisProgress | null;
  error?: string;
  onCancel(): Promise<boolean>;
  onRetry(): void;
  onBack(): void;
}

export function AnalysisView({ project, progress, error, onCancel, onRetry, onBack }: Props) {
  const mountedAt = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const terminal = progress?.stage === 'failed' || progress?.stage === 'cancelled';
  const current = stages.findIndex(([stage]) => stage === progress?.stage);
  const failedStage = stages.find(([stage]) => stage === progress?.failedAtStage)?.[1];
  const started = progress?.startedAt ? Date.parse(progress.startedAt) : mountedAt.current;
  const elapsed = terminal ? (progress?.elapsedMs ?? now - started) : now - started;

  const statusBadge = terminal
    ? (progress?.stage === 'failed'
        ? <Badge tone="error">分析失败</Badge>
        : <Badge tone="default">已取消</Badge>)
    : <Badge tone="primary" dot>运行中</Badge>;

  async function cancel() {
    if (!window.confirm('确定要取消当前分析吗？\n已经产生的临时文件将被清理。')) return;
    setCancelling(true);
    try { await onCancel(); } finally { setCancelling(false); }
  }

  return (
    <PageShell
      eyebrow="FUSION ENHANCED"
      onBack={onBack}
      backLabel="返回素材页"
      actions={statusBadge}
    >
      <div className="analysis-v2">
        {/* Progress orbit / status visual */}
        <div className="analysis-v2__visual">
          <div className={`analysis-orbit ${terminal ? progress?.stage : ''}`}>
            <div className="indeterminate-dots"><i /><i /><i /></div>
          </div>
        </div>

        {/* Main progress message */}
        <h2 className="analysis-v2__message">
          {progress?.message || '正在准备分析'}
        </h2>
        <p className="analysis-v2__subtitle">
          {terminal
            ? `${failedStage ? `结束阶段：${failedStage} · ` : ''}${error || project.lastError || ''}`
            : '隐藏推理过程不会显示；这里只呈现可理解的 Pipeline 阶段。'}
        </p>

        <ProviderBadge
          project={project}
          runStatus={
            progress?.stage === 'completed' ? 'succeeded'
            : progress?.stage === 'failed' ? 'failed'
            : null
          }
          runErrorCode={progress?.stage === 'failed' ? (error || project.lastError || undefined) : null}
        />

        {/* Metrics row */}
        <div className="analysis-v2__metrics">
          <div className="analysis-metric">
            <small>当前模型</small>
            <strong>{progress?.model || project.model || '正在读取'}</strong>
          </div>
          <div className="analysis-metric">
            <small>已读取素材</small>
            <strong>{progress?.assetCount ?? project.assetCount} 个</strong>
          </div>
          <div className="analysis-metric">
            <small>已运行时间</small>
            <strong>{formatDuration(Math.max(0, elapsed))}</strong>
          </div>
          <div className="analysis-metric">
            <small>缓存状态</small>
            <strong>
              {progress?.cacheStatus === 'hit' ? '已命中'
                : progress?.cacheStatus === 'forced' ? '强制新推理'
                : progress?.cacheStatus === 'miss' ? '未命中'
                : '检查中'}
            </strong>
          </div>
        </div>

        {/* Stage checklist */}
        <div className="analysis-v2__stages">
          {stages.map(([stage, label], index) => {
            const done = index < current || progress?.stage === 'completed';
            const active = index === current && !terminal;
            const isFailed = terminal && progress?.stage === 'failed' && index === current;
            return (
              <div
                key={stage}
                className={`stage-item-v2 ${done ? 'is-done' : ''} ${active ? 'is-active' : ''} ${isFailed ? 'is-failed' : ''}`}
              >
                <span className="stage-item-v2__marker">
                  {done ? '✓' : active ? <span className="stage-pulse" /> : isFailed ? '!' : '○'}
                </span>
                <strong>{label}</strong>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="analysis-v2__actions">
          {terminal ? (
            <>
              <button className="ui-button ui-button--primary" onClick={onRetry}>重新分析</button>
              <button className="ui-button ui-button--ghost" onClick={onBack}>返回素材页</button>
            </>
          ) : (
            <button className="ui-button ui-button--ghost" disabled={cancelling} onClick={() => void cancel()}>
              {cancelling ? '正在取消…' : '取消分析'}
            </button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
