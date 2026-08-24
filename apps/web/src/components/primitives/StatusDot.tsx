// primitives/StatusDot.tsx
//
// P0 阶段骨架 (路线 A §3.4 / §5)
// 用途：连接状态 / 进程运行状态指示。
// v1 已有 .status-dot (styles.css:199) + ProviderBadge.tsx 集成，
// 本文件作为 spec §3.4 命名空间的占位 — P1 替换 ProviderBadge 时
// 会从 v1 路径迁移过来。
//
// 当前阶段零运行时影响。

type Tone = 'default' | 'connected' | 'failed' | 'pending';

export type { Tone };

interface StatusDotProps {
  tone?: Tone;
  /** 尺寸（px）— 默认 8 */
  size?: number;
  /** 自定义 aria-label */
  label?: string;
}

export type { StatusDotProps };

const toneClass: Record<Tone, string> = {
  default: 'ui-status-dot--default',
  connected: 'ui-status-dot--connected',
  failed: 'ui-status-dot--failed',
  pending: 'ui-status-dot--pending',
};

/**
 * StatusDot — 圆形状态指示器（连接 / 失败 / 等待 / 默认）。
 */
export function StatusDot({ tone = 'default', size = 8, label }: StatusDotProps) {
  const style = { width: size, height: size };
  return (
    <span
      className={`ui-status-dot ${toneClass[tone]}`}
      style={style}
      role="status"
      aria-label={label}
    />
  );
}