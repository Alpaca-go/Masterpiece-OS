import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text' | 'link';
type Size = 'sm' | 'md' | 'lg';
/** Step 5: visual tone orthogonal to variant. Default = existing behavior.
 *  'destructive' = Notion-style — text-only red, fill only on hover.
 *  Combine with variant='ghost' for the canonical "delete" look, or
 *  with variant='primary' + filled=true for a hot filled destructive CTA
 *  (e.g. "取消运行" while the run is mid-flight). */
type Tone = 'default' | 'destructive';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  hot?: boolean; // Single accent — uses warm-orange (for destructive emphasis)
  /** Step 5: tone overlay — destructive uses error palette, default uses accent. */
  tone?: Tone;
  /** Step 5: when tone='destructive', opt in to a filled CTA style. */
  filled?: boolean;
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
  tone = 'default',
  filled = false,
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
    tone !== 'default' ? `ui-button--tone-${tone}` : '',
    tone === 'destructive' && filled ? 'ui-button--tone-destructive-filled' : '',
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
