/**
 * SettingsNav — left-rail navigation inside Settings (Stripe / Vercel style).
 * Click a section to scroll to it. Tracks active section via IntersectionObserver
 * so the active item updates as the user scrolls.
 */
import { useEffect, useState } from 'react';

export interface NavItem {
  id: string;
  label: string;
  hint?: string;
}

interface Props {
  items: NavItem[];
}

export function SettingsNav({ items }: Props) {
  const [active, setActive] = useState<string>(items[0]?.id ?? '');

  useEffect(() => {
    if (items.length === 0) return;
    const observers: IntersectionObserver[] = [];
    const visible = new Map<string, number>();
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) visible.set(item.id, e.intersectionRatio);
          // pick the most visible section
          let best = active;
          let bestRatio = -1;
          visible.forEach((ratio, id) => { if (ratio > bestRatio) { bestRatio = ratio; best = id; } });
          if (best && best !== active) setActive(best);
        },
        { rootMargin: '-30% 0% -50% 0%', threshold: [0, 0.25, 0.5, 0.75, 1] }
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => { observers.forEach((o) => o.disconnect()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  }

  return (
    <nav className="settings-nav" aria-label="Settings sections">
      <div className="settings-nav__heading">设置</div>
      <ul className="settings-nav__list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`settings-nav__item ${active === item.id ? 'is-active' : ''}`}
              onClick={() => scrollTo(item.id)}
            >
              <span className="settings-nav__label">{item.label}</span>
              {item.hint && <span className="settings-nav__hint">{item.hint}</span>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
