import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface TabItem {
  key: string;
  label: ReactNode;
  count?: number | string;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'line' | 'pill' | 'card';
  size?: 'sm' | 'md';
  className?: string;
  /** Tab 方向：水平（默认）或垂直 */
  orientation?: 'horizontal' | 'vertical';
}

export function Tabs({
  items,
  activeKey,
  onChange,
  variant = 'line',
  size = 'md',
  className = '',
  orientation = 'horizontal',
}: TabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, items.length);
  }, [items.length]);

  function getEnabledItems(): Array<{ index: number; key: string }> {
    return items
      .map((item, index) => ({ index, key: item.key, disabled: item.disabled }))
      .filter((item) => !item.disabled);
  }

  function focusTab(index: number) {
    const tab = tabRefs.current[index];
    if (tab) {
      tab.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, currentIndex: number) {
    const enabled = getEnabledItems();
    if (enabled.length === 0) return;

    const currentEnabledIdx = enabled.findIndex((e) => e.index === currentIndex);
    if (currentEnabledIdx < 0) return;

    const isHorizontal = orientation === 'horizontal';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

    if (e.key === prevKey) {
      e.preventDefault();
      const prevIdx = enabled[(currentEnabledIdx - 1 + enabled.length) % enabled.length];
      if (prevIdx) {
        onChange(prevIdx.key);
        focusTab(prevIdx.index);
      }
    } else if (e.key === nextKey) {
      e.preventDefault();
      const nextIdx = enabled[(currentEnabledIdx + 1) % enabled.length];
      if (nextIdx) {
        onChange(nextIdx.key);
        focusTab(nextIdx.index);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = enabled[0];
      if (first) {
        onChange(first.key);
        focusTab(first.index);
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = enabled[enabled.length - 1];
      if (last) {
        onChange(last.key);
        focusTab(last.index);
      }
    }
  }

  const classes = [
    'ui-tabs',
    `ui-tabs--${variant}`,
    size === 'sm' ? 'ui-tabs--sm' : '',
    orientation === 'vertical' ? 'ui-tabs--vertical' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      role="tablist"
      aria-orientation={orientation}
    >
      {items.map((item, index) => (
        <button
          key={item.key}
          ref={(el) => { tabRefs.current[index] = el; }}
          role="tab"
          aria-selected={activeKey === item.key}
          aria-disabled={item.disabled || undefined}
          tabIndex={activeKey === item.key ? 0 : -1}
          className={`ui-tab${activeKey === item.key ? ' is-active' : ''}${item.disabled ? ' is-disabled' : ''}`}
          onClick={() => { if (!item.disabled) onChange(item.key); }}
          onKeyDown={(e) => handleKeyDown(e, index)}
          type="button"
          disabled={item.disabled}
        >
          <span className="ui-tab__label">{item.label}</span>
          {item.count != null && <span className="ui-tab__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
