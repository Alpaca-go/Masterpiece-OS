// primitives/Skeleton.tsx
//
// P0 阶段骨架 (路线 A §3.4 / §5)
// 用途：异步加载时的占位（替代 v1 的 .analysis-orbit 旋转 + 内联 spinner）。
//
// 当前阶段零运行时影响 — 不被任何页面 import。

import type { CSSProperties } from 'react';

interface SkeletonProps {
  /** 形状：text / circle / rect。决定 border-radius + 默认尺寸 */
  variant?: 'text' | 'circle' | 'rect';
  /** 宽度（CSS value）；默认 text=100% / circle=40px / rect=100% */
  width?: string;
  /** 高度（CSS value）；默认 text=auto / circle=width / rect=80px */
  height?: string;
  /** 行数 (仅 text) — 多行骨架 */
  lines?: number;
}

export type { SkeletonProps };

/**
 * Skeleton — 内容加载占位。
 * 多个 Skeleton 配合 lines=N 表达列表/段落骨架。
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const isText = variant === 'text';
  const variantClass = `ui-skeleton ui-skeleton--${variant}`;
  const items = Array.from({ length: Math.max(1, lines) });
  return (
    <>
      {items.map((_, i) => {
        const style: CSSProperties = {
          width: isText && i < items.length - 1 ? '92%' : (width ?? defaultSize(variant, 'width')),
          height: height ?? defaultSize(variant, 'height'),
          marginBottom: isText && i < items.length - 1 ? '6px' : 0,
          animationDelay: `${i * 80}ms`,
        };
        return <div key={i} className={variantClass} style={style} aria-hidden />;
      })}
    </>
  );
}

function defaultSize(variant: 'text' | 'circle' | 'rect', dim: 'width' | 'height'): string {
  if (variant === 'text') return dim === 'width' ? '100%' : '12px';
  if (variant === 'circle') return '40px';
  return dim === 'width' ? '100%' : '80px';
}