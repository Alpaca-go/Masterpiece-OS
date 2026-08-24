// primitives/index.ts — 公共导出 (P0 骨架)
//
// 替换 v1 的 components/ui/index.ts (P3 阶段)。当前阶段零运行时影响。
//
// P1 / P2 实施时按 spec §3.4 / §5 把组件从 ui/ 迁到 primitives/。

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { StatusDot } from './StatusDot';
export type { StatusDotProps, Tone as StatusDotTone } from './StatusDot';