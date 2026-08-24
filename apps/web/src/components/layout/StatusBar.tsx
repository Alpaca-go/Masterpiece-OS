// layout/StatusBar.tsx
//
// P0 阶段骨架 (路线 A §3.4 / §5)
// 用途：底部状态条 — 任务状态 / 调用次数 / 时长。
// 当前阶段零运行时影响。P1 实施时由 SDK events 驱动状态文字。

interface StatusBarProps {
  /** 当前任务状态 */
  taskStatus?: 'idle' | 'compiling' | 'running' | 'awaiting-confirm' | 'done' | 'error';
  /** 已调用次数 */
  callCount?: number;
  /** 已用时长 (ms) */
  durationMs?: number;
  /** 额外右侧 slot (e.g. "查看日志") */
  trailing?: React.ReactNode;
}

export type { StatusBarProps };

/**
 * StatusBar — 底部条。
 * 左侧 = 当前任务状态；中间 = 元数据；右侧 = trailing slot。
 */
export function StatusBar({
  taskStatus = 'idle',
  callCount = 0,
  durationMs = 0,
  trailing,
}: StatusBarProps) {
  const statusLabel = ({
    idle: '空闲',
    compiling: '正在编译',
    running: '正在生成',
    'awaiting-confirm': '待你确认',
    done: '完成',
    error: '出错',
  } as const)[taskStatus];
  const seconds = (durationMs / 1000).toFixed(1);
  return (
    <footer className="ui-status-bar" role="status">
      <span className="ui-status-bar__cell ui-status-bar__status">
        <span className={`ui-status-bar__indicator ui-status-bar__indicator--${taskStatus}`} aria-hidden />
        {statusLabel}
      </span>
      <span className="ui-status-bar__cell ui-status-bar__meta">
        调用 {callCount} 次 · {seconds}s
      </span>
      {trailing && (
        <span className="ui-status-bar__cell ui-status-bar__trailing">{trailing}</span>
      )}
    </footer>
  );
}