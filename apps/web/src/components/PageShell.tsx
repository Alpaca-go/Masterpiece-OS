import type { ReactNode } from 'react';

interface PageShellProps {
  /** Top-bar title shown next to brand mark */
  title?: string;
  /** Small eyebrow label above title */
  eyebrow?: string;
  /** Subtitle / description under title */
  subtitle?: ReactNode;
  /** Back button handler — when provided, shows a back arrow in the top bar */
  onBack?: () => void;
  backLabel?: string;
  /** Right-side actions in the header area */
  actions?: ReactNode;
  /** Main content */
  children: ReactNode;
  /** Optional maximum width for content (default 1200) */
  maxWidth?: number;
  /** Optional className on root */
  className?: string;
}

export function PageShell({
  title, eyebrow, subtitle, onBack, backLabel = '返回',
  actions, children, maxWidth = 1200, className = '',
}: PageShellProps) {
  return (
    <div className={`page-shell-v2 ${className}`}>
      <header className="page-shell-v2__bar">
        <div className="page-shell-v2__bar-left">
          {onBack && (
            <button className="ui-button ui-button--ghost ui-button--sm" onClick={onBack}>
              <span aria-hidden>←</span> {backLabel}
            </button>
          )}
          {eyebrow && <span className="page-shell-v2__eyebrow">{eyebrow}</span>}
        </div>
        <div className="page-shell-v2__bar-right">
          {actions}
        </div>
      </header>
      {(title || subtitle) && (
        <div className="page-shell-v2__head" style={{ maxWidth }}>
          {title && <h1 className="page-shell-v2__title">{title}</h1>}
          {subtitle && <p className="page-shell-v2__subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="page-shell-v2__body" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}
