// layout/index.ts — 公共导出 (P0 骨架)
//
// 当前 layout/ 目录已有 (v1) — AppShell / TopBar / CommandPalette /
// InspectorDrawer / Toast 5 个组件在 components/layout/。本 index
// 之后追加 P0 新组件，按 spec §3.4 命名空间。

export { StatusBar } from './StatusBar';
export type { StatusBarProps } from './StatusBar';

export { ThreeColumnLayout } from './ThreeColumnLayout';
export type { ThreeColumnLayoutProps } from './ThreeColumnLayout';

// 已有 (v1) — 暂不通过 index re-export，P3 阶段再统一
// export { AppShell } from './AppShell';
// export { TopBar } from './TopBar';
// export { CommandPalette } from './CommandPalette';
// export { InspectorDrawer } from './InspectorDrawer';
// export { Toast } from './Toast';