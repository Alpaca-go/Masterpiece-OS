// components/primitives/EmptyIllustration.tsx
//
// 空状态插画 — 简约的线条 SVG 装饰，按 Notion/Figma editorial 风格设计。
// hairline-first 原则：单色线条，不填色，与文档工具的视觉语言一致。

export type IllustrationVariant =
  | 'no-projects'
  | 'no-results'
  | 'no-history'
  | 'no-output'
  | 'welcome';

interface Props {
  variant?: IllustrationVariant;
  /** 自定义 className 覆盖默认尺寸 */
  className?: string;
  /** aria-label — 默认自动根据 variant 生成 */
  ariaLabel?: string;
}

const DEFAULT_LABELS: Record<IllustrationVariant, string> = {
  'no-projects': '空状态：还没有项目',
  'no-results':  '空状态：暂无结果',
  'no-history':  '空状态：还没有历史记录',
  'no-output':   '空状态：还没有生成的产物',
  'welcome':     '欢迎',
};

export function EmptyIllustration({ variant = 'no-results', className = '', ariaLabel }: Props) {
  const cls = `ui-empty-illustration ${className}`.trim();
  const label = ariaLabel ?? DEFAULT_LABELS[variant];

  return (
    <span className={cls} role="img" aria-label={label}>
      {variant === 'no-projects' && <NoProjectsIllustration />}
      {variant === 'no-results'  && <NoResultsIllustration />}
      {variant === 'no-history'  && <NoHistoryIllustration />}
      {variant === 'no-output'   && <NoOutputIllustration />}
      {variant === 'welcome'     && <WelcomeIllustration />}
    </span>
  );
}

/* ── 各变体插画 — 都在 120x80 viewBox 内 ── */

function NoProjectsIllustration() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 文档堆 */}
      <rect x="28" y="18" width="48" height="56" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="36" y="14" width="48" height="56" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="44" y="10" width="48" height="56" rx="2" stroke="currentColor" strokeWidth="1.2" fill="var(--color-surface-soft, #F9F8F4)" />
      <line x1="52" y1="24" x2="84" y2="24" stroke="currentColor" strokeWidth="1.2" />
      <line x1="52" y1="32" x2="76" y2="32" stroke="currentColor" strokeWidth="1.2" />
      <line x1="52" y1="40" x2="80" y2="40" stroke="currentColor" strokeWidth="1.2" />
      {/* 加号 */}
      <circle cx="92" cy="56" r="8" fill="var(--color-surface-soft, #F9F8F4)" stroke="currentColor" strokeWidth="1.2" />
      <line x1="88" y1="56" x2="96" y2="56" stroke="currentColor" strokeWidth="1.2" />
      <line x1="92" y1="52" x2="92" y2="60" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function NoResultsIllustration() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 搜索框 + 放大镜 */}
      <rect x="20" y="28" width="60" height="36" rx="4" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <line x1="28" y1="40" x2="50" y2="40" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="28" y1="48" x2="44" y2="48" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5" />
      {/* 放大镜 */}
      <circle cx="80" cy="48" r="12" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <line x1="89" y1="57" x2="100" y2="68" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* 装饰点 */}
      <circle cx="36" cy="20" r="2" fill="currentColor" fillOpacity="0.4" />
      <circle cx="92" cy="22" r="1.5" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

function NoHistoryIllustration() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 时钟 */}
      <circle cx="60" cy="40" r="22" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <line x1="60" y1="40" x2="60" y2="28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="60" y1="40" x2="70" y2="40" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="60" cy="40" r="2" fill="currentColor" />
      {/* 箭头（逆时针） */}
      <path d="M 32 20 Q 26 14 30 8" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 30 8 L 30 14 L 36 14" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NoOutputIllustration() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 图片框架 */}
      <rect x="36" y="18" width="48" height="36" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="50" cy="30" r="3" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M 36 50 L 56 36 L 72 46 L 84 38" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      {/* 底座 */}
      <line x1="48" y1="62" x2="72" y2="62" stroke="currentColor" strokeWidth="1.2" />
      <line x1="60" y1="54" x2="60" y2="62" stroke="currentColor" strokeWidth="1.2" />
      {/* 闪光 */}
      <path d="M 90 22 L 92 28 L 98 30 L 92 32 L 90 38 L 88 32 L 82 30 L 88 28 Z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

function WelcomeIllustration() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 星星 */}
      <path d="M 60 16 L 62 24 L 70 26 L 62 28 L 60 36 L 58 28 L 50 26 L 58 24 Z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      {/* 弧线 */}
      <path d="M 24 56 Q 60 36 96 56" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 30 64 Q 60 50 90 64" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeOpacity="0.5" />
    </svg>
  );
}
