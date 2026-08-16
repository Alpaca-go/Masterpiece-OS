import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  hot?: boolean; // Single accent — uses warm-orange (for destructive emphasis)
}

/**
 * Masterpiece UI Button — Notion × Figma editorial.
 * Hairline-first, monochrome black default, restrained warm-orange for "hot" CTAs.
 * No drop shadows, no gradient fills, no scale-on-hover.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  hot = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    `ui-button--${size}`,
    fullWidth ? 'ui-button--full' : '',
    icon ? `ui-button--icon-${iconPosition}` : '',
    hot ? 'ui-button--hot' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} {...rest}>
      {icon && iconPosition === 'left' && <span className="ui-button__icon">{icon}</span>}
      {children && <span className="ui-button__label">{children}</span>}
      {icon && iconPosition === 'right' && <span className="ui-button__icon">{icon}</span>}
    </button>
  );
}
