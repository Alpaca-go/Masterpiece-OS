// components/ui/Banner.tsx
//
// Banner — 页面级横幅提示（严重错误 / 阻塞性提示）。
// 比 Toast 更持久（用户必须主动关闭），比 inline error 更显眼。
//
// 用法：
//   <Banner tone="error" onClose={() => setError('')}>
//     启动失败：主进程未响应。 <button>重试</button>
//   </Banner>

import type { ReactNode } from 'react';

export type BannerTone = 'info' | 'warn' | 'error' | 'success';

interface Props {
  tone: BannerTone;
  children: ReactNode;
  /** 可选的右侧操作区（按钮等） */
  action?: ReactNode;
  /** 是否允许关闭 — 默认 true */
  dismissible?: boolean;
  onClose?: () => void;
  /** aria-live 级别 — 默认 polite，error 时用 assertive */
  ariaLive?: 'polite' | 'assertive';
  className?: string;
}

const TONE_LABELS: Record<BannerTone, string> = {
  info:    '提示',
  warn:    '注意',
  error:   '错误',
  success: '成功',
};

const TONE_ICONS: Record<BannerTone, string> = {
  info:    'ⓘ',
  warn:    '⚠',
  error:   '✕',
  success: '✓',
};

export function Banner({
  tone,
  children,
  action,
  dismissible = true,
  onClose,
  ariaLive,
  className = '',
}: Props) {
  const cls = `ui-banner ui-banner--${tone} ${className}`.trim();
  const live = ariaLive ?? (tone === 'error' ? 'assertive' : 'polite');

  return (
    <div
      className={cls}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={live}
    >
      <span className="ui-banner__icon" aria-hidden>{TONE_ICONS[tone]}</span>
      <div className="ui-banner__body">
        <span className="ui-banner__label">{TONE_LABELS[tone]}</span>
        <span className="ui-banner__message">{children}</span>
      </div>
      {action && <div className="ui-banner__action">{action}</div>}
      {dismissible && onClose && (
        <button
          type="button"
          className="ui-banner__close"
          onClick={onClose}
          aria-label="关闭"
        >
          ×
        </button>
      )}
    </div>
  );
}
