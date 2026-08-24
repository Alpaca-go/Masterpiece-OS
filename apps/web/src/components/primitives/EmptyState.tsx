// primitives/EmptyState.tsx
//
// P0 阶段骨架 (路线 A §3.4 / §5)
// 用途：列表/网格/空数据展示。
//
// 当前阶段零运行时影响 — 不被任何页面 import。P1 / P2 在迁移各
// Workspace / Page 时会替换 v1 的 .empty-home / .empty-state /
// .empty-profile-list 等零散 class。

import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** 顶部 icon / illustration (推荐用语义 emoji 或 SVG) */
  icon?: ReactNode;
  /** 主标题 (粗体) */
  title: ReactNode;
  /** 副标题 / 描述 (灰色) */
  description?: ReactNode;
  /** 主操作按钮组 */
  action?: ReactNode;
  /** 是否显示虚线 dashed border (用于页面级 vs 行内级区分) */
  bordered?: boolean;
}

export type { EmptyStateProps };

/**
 * EmptyState — 列表/网格的零数据提示。
 * 替换 v1 的 .empty-home / .empty-state / .empty-profile-list。
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  bordered = false,
}: EmptyStateProps) {
  const classes = [
    'ui-empty',
    bordered ? 'ui-empty--bordered' : '',
  ].filter(Boolean).join(' ');
  return (
    <div className={classes} role="status">
      {icon && <div className="ui-empty__icon" aria-hidden>{icon}</div>}
      <strong className="ui-empty__title">{title}</strong>
      {description && <p className="ui-empty__description">{description}</p>}
      {action && <div className="ui-empty__action">{action}</div>}
    </div>
  );
}