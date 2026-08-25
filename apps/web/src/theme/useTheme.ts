// theme/useTheme.ts
//
// 主题管理 Hook — 支持 light / dark / system 三态。
// - light: 强制浅色
// - dark:  强制深色
// - system: 跟随系统 (prefers-color-scheme)
//
// 实现方式：在 <html> 上切换 data-theme 属性。
//   - light → data-theme="light"
//   - dark  → data-theme="dark"
//   - system → 移除 data-theme 属性，让 @media (prefers-color-scheme) 生效
//
// 持久化：localStorage['theme']，值为 'light' | 'dark' | 'system'

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

/** 读取系统主题偏好 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 读取持久化的主题设置 */
function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return null;
}

/** 把主题应用到 <html> 元素 */
function applyThemeToDom(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', mode);
  }
}

export interface UseThemeResult {
  /** 当前主题模式 (light / dark / system) */
  mode: ThemeMode;
  /** 实际生效的主题（考虑 system 解析后的结果） */
  resolved: 'light' | 'dark';
  /** 切换主题 */
  setTheme: (mode: ThemeMode) => void;
  /** 在 light / dark 间快速切换（命令面板等场景用） */
  toggle: () => void;
}

export function useTheme(): UseThemeResult {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // 初始化：优先用存储值，否则 system
    return getStoredTheme() ?? 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

  // 监听系统主题变化（仅 system 模式下影响 resolved）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  // 模式变化时应用到 DOM 并持久化
  useEffect(() => {
    applyThemeToDom(mode);
    if (typeof window !== 'undefined') {
      if (mode === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, mode);
      }
    }
  }, [mode]);

  const setTheme = useCallback((next: ThemeMode) => {
    setMode(next);
  }, []);

  const toggle = useCallback(() => {
    const current = mode === 'system' ? systemTheme : mode;
    setMode(current === 'dark' ? 'light' : 'dark');
  }, [mode, systemTheme]);

  const resolved: 'light' | 'dark' = mode === 'system' ? systemTheme : mode;

  return { mode, resolved, setTheme, toggle };
}
