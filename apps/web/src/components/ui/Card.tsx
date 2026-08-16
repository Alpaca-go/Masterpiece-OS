import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  className?: string;
  hoverable?: boolean;
  selected?: boolean;
}

/**
 * Card — surface container with subtle border and soft shadow.
 */
export function Card({
  children,
  title,
  subtitle,
  action,
  padding = 'md',
  className = '',
  hoverable = false,
  selected = false,
}: CardProps) {
  const classes = [
    'ui-card',
    `ui-card--p-${padding}`,
    hoverable ? 'ui-card--hoverable' : '',
    selected ? 'ui-card--selected' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {(title || action) && (
        <div className="ui-card__header">
          <div className="ui-card__titles">
            {title && <h3 className="ui-card__title">{title}</h3>}
            {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
          </div>
          {action && <div className="ui-card__action">{action}</div>}
        </div>
      )}
      <div className="ui-card__body">{children}</div>
    </div>
  );
}
