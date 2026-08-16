import type { ReactNode } from 'react';

interface TabItem {
  key: string;
  label: ReactNode;
  count?: number | string;
}

interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'line' | 'pill' | 'card';
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs({ items, activeKey, onChange, variant = 'line', size = 'md', className = '' }: TabsProps) {
  const classes = [
    'ui-tabs',
    `ui-tabs--${variant}`,
    size === 'sm' ? 'ui-tabs--sm' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} role="tablist">
      {items.map(item => (
        <button
          key={item.key}
          role="tab"
          aria-selected={activeKey === item.key}
          className={`ui-tab${activeKey === item.key ? ' is-active' : ''}`}
          onClick={() => onChange(item.key)}
          type="button"
        >
          <span className="ui-tab__label">{item.label}</span>
          {item.count != null && <span className="ui-tab__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
