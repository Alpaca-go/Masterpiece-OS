import type { ReactNode } from 'react';

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type Size = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  size?: Size;
  dot?: boolean;
  className?: string;
}

const toneClass: Record<Tone, string> = {
  default: 'ui-badge--default',
  primary: 'ui-badge--primary',
  success: 'ui-badge--success',
  warning: 'ui-badge--warning',
  error: 'ui-badge--error',
  info: 'ui-badge--info',
};

export function Badge({ children, tone = 'default', size = 'md', dot = false, className = '' }: BadgeProps) {
  const classes = [
    'ui-badge',
    toneClass[tone],
    size === 'sm' ? 'ui-badge--sm' : '',
    dot ? 'ui-badge--dot' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {dot && <i className="ui-badge__dot" aria-hidden />}
      {children}
    </span>
  );
}
