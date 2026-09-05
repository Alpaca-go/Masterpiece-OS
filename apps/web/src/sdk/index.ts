// sdk/index.ts
//
// SDK 公共入口 — 重做路线 A / P0 (docs/ui/redesign-development-doc.md §4)
//
// 本文件目前是 SKELETON — §4.2 规划的最终结构是：
//
//   export { createSdkClient } from './client';
//   export type { SdkError } from './errors';
//   export type { ShortChainSdk, CompileShortChainInput, ... } from './operations/short-chain';
//   export type { ProjectContextSdk, ... } from './operations/project-context';
//   export { sdkEvents } from './events';
//
// 后续 P1/P2 实施时，本文件会逐步补齐。当前阶段（路线 A / P0）只
// 做骨架 + 顶层契约文档，零运行时影响，App.tsx 完全不动。
//
// 关联规范：
// - §3 设计 token → 见 styles/tokens.css
// - §4.3 17 个 Short-Chain channel 名 → 不要改名（RC008）
// - §4.4 错误模型 → 见 errors.ts
// - §4.5 接口示例 → 见 operations/short-chain.ts

export type * from './types';
export type * from './errors';
export * from './operations/visual-migration';
