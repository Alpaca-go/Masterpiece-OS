// primitives/Dialog.tsx — 路线 A / P0 §3.4 / §5 组件清单
//
// 用途: 模态对话框 (替代 v1 Modal.tsx, 但视觉与 §3 dark-first 对齐)。
// 当前阶段零运行时影响 — 不被 App.tsx import, 仅作为 spec 命名空间占位。
//
// 设计:
//   - size: 'sm' (320) | 'md' (480) | 'lg' (720)
//   - 关闭行为: Esc + backdrop click (可配置)
//   - focus trap: 简化版 (P1 接入完整 a11y 时补)
//
// 与 v1 Modal 差异:
//   - 不依赖 useId hook (避免 hydration mismatch)
//   - 默认 backdrop 可关闭 (v1 默认 true, 一致)
//   - 不暴露 closeOnBackdrop: false (P1 补)

import { useEffect, useRef } from 'react';
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** sm 320 / md 480 / lg 720 px */
  size?: 'sm' | 'md' | 'lg';
  /** 底部操作区 (按钮组) */
  footer?: ReactNode;
}

export type { DialogProps };

const SIZE_WIDTH = { sm: 320, md: 480, lg: 720 } as const;

export function Dialog({
  open,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // 锁定 body scroll + Esc 关闭
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    // 自动聚焦第一个可聚焦元素
    queueMicrotask(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  function onBackdropClick() {
    onClose();
  }

  function onDialogKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Tab') {
      // 简化 focus trap: 在 dialog 内循环
      const focusables = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div
      className="ui-dialog-overlay"
      role="presentation"
      onClick={onBackdropClick}
    >
      <div
        ref={dialogRef}
        className={`ui-dialog ui-dialog--${size}`}
        style={{ width: SIZE_WIDTH[size] }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        onKeyDown={onDialogKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <header className="ui-dialog__header">
            <h2 className="ui-dialog__title">{title}</h2>
            <button
              className="ui-dialog__close"
              onClick={onClose}
              aria-label="关闭"
              type="button"
            >
              ×
            </button>
          </header>
        )}
        <div className="ui-dialog__body">{children}</div>
        {footer && <footer className="ui-dialog__footer">{footer}</footer>}
      </div>
    </div>
  );
}