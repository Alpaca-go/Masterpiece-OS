// feedback/ConnectionIndicator.tsx
//
// P0 阶段骨架 (路线 A §3.4 / §5)
// 用途：RPC 心跳指示 — 显示与 Node Web Host 的连接状态。
// 当前由 App.tsx line 580 的内联 .status-dot 实现；本组件是 spec
// 命名空间的占位，P1 实施时替换 App.tsx 内的内联实现。
//
// 当前阶段零运行时影响 — 不被任何页面 import。

import { StatusDot } from '../primitives/StatusDot';

interface ConnectionIndicatorProps {
  /** 'connected' | 'failed' | 'pending' */
  status?: 'connected' | 'failed' | 'pending';
  /** 状态文本（默认中文） */
  label?: string;
}

export type { ConnectionIndicatorProps };

/**
 * ConnectionIndicator — RPC 心跳。
 * 显示状态点 + 描述文字。P1 实施时由真实 RPC 心跳事件驱动 status。
 */
export function ConnectionIndicator({
  status = 'connected',
  label,
}: ConnectionIndicatorProps) {
  const defaultLabel = status === 'connected' ? '已连接'
    : status === 'failed' ? '连接失败'
    : '连接中';
  return (
    <span className="ui-connection-indicator">
      <StatusDot tone={status} label={label ?? defaultLabel} />
      <span className="ui-connection-indicator__label">{label ?? defaultLabel}</span>
    </span>
  );
}