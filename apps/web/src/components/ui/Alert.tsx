import type { ReactNode } from 'react';

type Severity = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  children: ReactNode;
  severity?: Severity;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Alert({ children, severity = 'info', title, icon, action, className = '' }: AlertProps) {
  const classes = [
    'ui-alert',
    `ui-alert--${severity}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} role="alert">
      {icon && <span className="ui-alert__icon">{icon}</span>}
      <div className="ui-alert__content">
        {title && <strong className="ui-alert__title">{title}</strong>}
        <div className="ui-alert__message">{children}</div>
      </div>
      {action && <div className="ui-alert__action">{action}</div>}
    </div>
  );
}
