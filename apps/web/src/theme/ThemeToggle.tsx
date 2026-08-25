// theme/ThemeToggle.tsx
//
// 主题切换三段式按钮：浅色 / 深色 / 跟随系统
// 放在 TopBar 右侧操作区。

import { useTheme, type ThemeMode } from './useTheme';

interface Option {
  value: ThemeMode;
  label: string;
  icon: string;
  title: string;
}

const OPTIONS: Option[] = [
  { value: 'light',  label: '亮', icon: '☀', title: '浅色主题' },
  { value: 'dark',   label: '暗', icon: '☾', title: '深色主题' },
  { value: 'system', label: '自', icon: '◐', title: '跟随系统' },
];

export function ThemeToggle() {
  const { mode, setTheme } = useTheme();

  return (
    <div
      className="theme-toggle"
      role="radiogroup"
      aria-label="主题选择"
    >
      {OPTIONS.map((opt) => {
        const isActive = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={opt.title}
            className={`theme-toggle__option${isActive ? ' is-active' : ''}`}
            onClick={() => setTheme(opt.value)}
          >
            <span className="theme-toggle__icon" aria-hidden>{opt.icon}</span>
            <span className="theme-toggle__label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
