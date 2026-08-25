import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
  /** 关闭时焦点返回的元素 — 默认返回触发打开的元素 */
  returnFocusRef?: React.RefObject<HTMLElement>;
}

/**
 * 获取 Modal 内所有可聚焦元素
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  returnFocusRef,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // 保存当前聚焦元素，关闭时返回
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // 自动聚焦第一个可聚焦元素
    const modal = modalRef.current;
    if (modal) {
      requestAnimationFrame(() => {
        const focusable = getFocusableElements(modal);
        if (focusable.length > 0) {
          focusable[0]?.focus();
        } else {
          modal.focus();
        }
      });
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      // Tab 焦点陷阱
      if (e.key === 'Tab' && modal) {
        const focusable = getFocusableElements(modal).filter(
          (el) => !el.hasAttribute('disabled'),
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        const active = document.activeElement as HTMLElement;

        if (e.shiftKey) {
          if (active === first || !modal.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';

      // 关闭时返回焦点
      const returnTo = returnFocusRef?.current || previouslyFocusedRef.current;
      if (returnTo && typeof returnTo.focus === 'function') {
        requestAnimationFrame(() => returnTo.focus());
      }
    };
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;

  return (
    <div
      className="ui-modal-overlay"
      onClick={() => closeOnBackdrop && onClose()}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`ui-modal ui-modal--${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? undefined : undefined}
        tabIndex={-1}
      >
        {title && (
          <div className="ui-modal__header">
            <h2 className="ui-modal__title">{title}</h2>
            <button
              className="ui-modal__close"
              onClick={onClose}
              aria-label="关闭"
              type="button"
            >
              ×
            </button>
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
