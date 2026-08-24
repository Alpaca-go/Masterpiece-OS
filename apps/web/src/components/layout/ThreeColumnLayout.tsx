// layout/ThreeColumnLayout.tsx
//
// P0 阶段骨架 (路线 A §3.4 / §5)
// 用途：Short-Chain 主工作台布局 = Brief | Canvas | Inspector 三栏。
// 当前阶段零运行时影响。P1 实施时 BriefEditor / PreviewCanvas /
// DecisionStream / OutputGallery 4 个组件会填充到三栏。

import type { ReactNode } from 'react';

interface ThreeColumnLayoutProps {
  /** 左栏（Brief 输入） */
  left: ReactNode;
  /** 中栏（Preview Canvas — 核心） */
  center: ReactNode;
  /** 右栏（Inspector / 决策历史） */
  right: ReactNode;
  /** 三栏宽度比 (left : center : right)，默认 360 : flex : 360 */
  columnWidths?: { left: number; center: number; right: number };
}

export type { ThreeColumnLayoutProps };

/**
 * ThreeColumnLayout — Short-Chain 工作台骨架。
 * §3 价值观："克制 / 可读"。三栏宽度固定在 360 / flex / 360，
 * 中栏核心区自适应窗口宽度。
 */
export function ThreeColumnLayout({
  left,
  center,
  right,
  columnWidths = { left: 360, center: 0, right: 360 },
}: ThreeColumnLayoutProps) {
  const leftStyle = { width: columnWidths.left, flex: 'none' };
  const centerStyle = { flex: 1, minWidth: 0 };
  const rightStyle = { width: columnWidths.right, flex: 'none' };
  return (
    <div className="ui-three-column">
      <aside className="ui-three-column__left" style={leftStyle}>{left}</aside>
      <main className="ui-three-column__center" style={centerStyle}>{center}</main>
      <aside className="ui-three-column__right" style={rightStyle}>{right}</aside>
    </div>
  );
}