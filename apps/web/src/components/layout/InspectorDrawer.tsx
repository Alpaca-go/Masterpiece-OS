import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * InspectorDrawer — Figma right-rail style slide-in panel.
 * - Anchored to right edge of the AppShell.
 * - Esc closes.
 * - Optional title + actions.
 */
interface Props {
  open: boolean;
  onClose(): void;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  width?: number;
  children: ReactNode;
}

export function InspectorDrawer({ open, onClose, title, subtitle, actions, width = 360, children }: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} />}
      <aside
        className={`drawer ${open ? 'is-open' : ''}`}
        style={{ width: open ? width : 0 }}
        aria-hidden={!open}
      >
        <div className="drawer__inner" style={{ width }}>
          {(title || actions) && (
            <header className="drawer__head">
              <div className="drawer__head-titles">
                {title && <div className="drawer__title">{title}</div>}
                {subtitle && <div className="drawer__subtitle">{subtitle}</div>}
              </div>
              <div className="drawer__head-actions">
                {actions}
                <button className="drawer__close" onClick={onClose} aria-label="关闭">×</button>
              </div>
            </header>
          )}
          <div className="drawer__body">{children}</div>
        </div>
      </aside>
    </>
  );
}

/**
 * InspectorSection — a labeled group inside an Inspector (Figma-style).
 */
export function InspectorSection({ title, children, action }: { title?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="inspector-section">
      {(title || action) && (
        <header className="inspector-section__head">
          {title && <h4 className="inspector-section__title">{title}</h4>}
          {action}
        </header>
      )}
      <div className="inspector-section__body">{children}</div>
    </section>
  );
}

/** Field row in an inspector */
export function InspectorField({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="inspector-field">
      <div className="inspector-field__label">{label}</div>
      <div className="inspector-field__value">{children}</div>
      {hint && <div className="inspector-field__hint">{hint}</div>}
    </div>
  );
}

/** Small key-value pair (compact row) */
export function InspectorRow({ label, value, mono = false }: { label: ReactNode; value: ReactNode; mono?: boolean }) {
  return (
    <div className="inspector-row">
      <span className="inspector-row__label">{label}</span>
      <span className={`inspector-row__value ${mono ? 'is-mono' : ''}`}>{value}</span>
    </div>
  );
}

/** Hook to manage drawer open state (controlled) */
export function useDrawer(initial = false): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(initial);
  return [open, setOpen];
}
