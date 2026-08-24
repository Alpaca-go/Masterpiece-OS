// routes.tsx — 路线 A / P0 §3.3 / §5 / §6 路由壳子
//
// 阶段定义:
//   - 当前 (P0): 路由表 + Page 映射 + 简单的 URL → Page 解析
//   - P1: 接入 React Router 7 / HashRouter (与 v1 Phase 5.8 共存过渡)
//   - P3: 删除 useUrlScreen.tsx (v1), routes.tsx 成为唯一路由源
//
// 当前阶段零运行时影响 — 不被 main.tsx import。spec 路由表：
//   /short-chain  → ShortChainPage  (默认, 主工作台)
//   /library      → LibraryPage     (历史产物)
//   /settings     → SettingsPage    (Provider / Profile / Registry)

import type { ReactNode } from 'react';
import { ShortChainPage } from './pages/ShortChainPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';

export type RoutePath = '/short-chain' | '/library' | '/settings';

export interface RouteDefinition {
  path: RoutePath;
  label: string;
  element: ReactNode;
}

export const ROUTES: readonly RouteDefinition[] = [
  { path: '/short-chain', label: '创作', element: <ShortChainPage /> },
  { path: '/library', label: 'Library', element: <LibraryPage /> },
  { path: '/settings', label: '设置', element: <SettingsPage /> },
];

export const DEFAULT_ROUTE: RoutePath = '/short-chain';

/**
 * P0 阶段最小化路由解析 (纯字符串前缀匹配)：
 *   '' / '/'        → /short-chain
 *   '/short-chain'  → /short-chain
 *   '/library'      → /library
 *   '/settings'     → /settings
 *   其他           → DEFAULT_ROUTE
 *
 * 不使用 react-router，P0 阶段先验证路由表 + Page 装配。
 * P1 阶段替换为 useUrlScreen 的等价 React Router 7 版本。
 */
export function parseRoute(pathname: string): RoutePath {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  for (const route of ROUTES) {
    if (normalized === route.path || normalized === `/${route.path.replace(/^\//, '')}`) {
      return route.path;
    }
  }
  return DEFAULT_ROUTE;
}