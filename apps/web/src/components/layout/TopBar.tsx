import type { ReactNode } from 'react';

/**
 * TopBar — Figma-style sticky app top bar.
 * Three regions: left (brand + breadcrumb), center (segmented nav), right (actions + user).
 */
interface Props {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

export function TopBar({ left, center, right }: Props) {
  return (
    <header className="app-topbar-arch">
      <div className="app-topbar-arch__left">{left}</div>
      {center && <div className="app-topbar-arch__center">{center}</div>}
      <div className="app-topbar-arch__right">{right}</div>
    </header>
  );
}

/** Brand mark + product name */
export function TopBarBrand({ mark = 'M', name = 'Masterpiece OS', tag }: { mark?: string; name?: string; tag?: string }) {
  return (
    <div className="app-topbar-arch__brand">
      <div className="app-topbar-arch__brand-mark">{mark}</div>
      <span className="app-topbar-arch__brand-name">
        {name}
        {tag && <span className="app-topbar-arch__brand-tag">{tag}</span>}
      </span>
    </div>
  );
}

/** Breadcrumb (e.g. Project › Project Name) */
export function TopBarBreadcrumb({ items }: { items: Array<{ label: string; onClick?(): void; href?: string }> }) {
  return (
    <nav className="app-topbar-arch__crumbs" aria-label="breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="app-topbar-arch__crumb">
          {item.onClick ? (
            <button type="button" onClick={item.onClick}>{item.label}</button>
          ) : item.href ? (
            <a href={item.href}>{item.label}</a>
          ) : (
            <span>{item.label}</span>
          )}
          {i < items.length - 1 && <span className="app-topbar-arch__crumb-sep" aria-hidden>/</span>}
        </span>
      ))}
    </nav>
  );
}

/** Segmented nav (Figma file/editor switcher style) */
export function TopBarSegment<T extends string>({ value, onChange, options }: {
  value: T;
  onChange(v: T): void;
  options: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div className="app-topbar-arch__segment" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          className={opt.value === value ? 'is-active' : ''}
          onClick={() => onChange(opt.value)}
        >
          <span>{opt.label}</span>
          {opt.count !== undefined && <span className="app-topbar-arch__segment-count">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Right side action cluster */
export function TopBarActions({ children }: { children: ReactNode }) {
  return <div className="app-topbar-arch__actions">{children}</div>;
}
