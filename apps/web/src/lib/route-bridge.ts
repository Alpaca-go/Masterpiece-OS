// lib/route-bridge.ts — 路线 A / P0 路由桥
//
// 把新 routes.tsx 的路由表与 v1 Phase 5.8 useUrlScreen 桥接。
// 当前阶段零运行时影响 — 不被 App.tsx import。
//
// 设计:
//   - parseRouteUrl(pathname) → RoutePath (v1 不感知, 仅暴露 helper)
//   - v1 内部 state machine 仍由 useUrlScreen 维护
//   - P1 阶段替换 useUrlScreen 时, 这层桥可以废弃 (P3 清理)
//
// 为什么不直接替换 useUrlScreen:
//   - useUrlScreen 跟 App.tsx 的 if/else screen 分发紧耦合
//   - 替换 = 重写 App.tsx 主路由分发 = P1 的核心工作
//   - P0 阶段只确保 ROUTES 表与现有 URL 路径共存, 不破坏 v1 行为

import { DEFAULT_ROUTE, parseRoute, type RoutePath } from '../routes';

/**
 * 把 window.location.pathname 解析为新 routes.tsx 定义的 RoutePath。
 * 仅用于诊断 / 未来 Page 激活判断; 不改变 App.tsx 现有路由分发。
 */
export function parseRouteUrl(pathname: string): RoutePath {
  // normalize URL pathname (strip hash / query / trailing slash)
  const normalized = pathname.replace(/[#?].*$/, '').replace(/\/+$/, '') || '/';
  return parseRoute(normalized);
}

/**
 * 当前浏览器 URL 对应的 RoutePath (供 React hook / 诊断用)。
 */
export function currentRoute(): RoutePath {
  if (typeof window === 'undefined') return DEFAULT_ROUTE;
  return parseRouteUrl(window.location.pathname);
}

export type { RoutePath } from '../routes';