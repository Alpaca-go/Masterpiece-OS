import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

/**
 * Toast — non-blocking notification stack (Linear/Vercel/Notion style).
 * Bottom-right corner, auto-dismiss, max 3 visible.
 *
 * Usage:
 *   const { toasts, push } = useToasts();
 *   push({ title: 'Saved', tone: 'success' });
 */

export type ToastTone = 'default' | 'success' | 'warning' | 'error' | 'hot';

export interface Toast {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** Duration in ms (default 4000; pass 0 to disable auto-dismiss) */
  duration?: number;
  action?: { label: string; onClick(): void };
}

interface ToastItemProps {
  toast: Toast;
  onDismiss(id: string): void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const tone = toast.tone || 'default';
  useEffect(() => {
    if (toast.duration === 0) return;
    const ms = toast.duration ?? 4000;
    const t = window.setTimeout(() => onDismiss(toast.id), ms);
    return () => window.clearTimeout(t);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div className={`toast toast--${tone}`} role="status">
      <div className="toast__body">
        <div className="toast__title">{toast.title}</div>
        {toast.description && <div className="toast__description">{toast.description}</div>}
      </div>
      {toast.action && (
        <button
          className="toast__action"
          onClick={() => { toast.action!.onClick(); onDismiss(toast.id); }}
        >
          {toast.action.label}
        </button>
      )}
      <button className="toast__dismiss" aria-label="关闭" onClick={() => onDismiss(toast.id)}>×</button>
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => {
      const next = [...current, { ...toast, id }];
      // Cap at 5 visible
      return next.slice(-5);
    });
    return id;
  }, []);

  return { toasts, push, dismiss };
}

interface ToastViewportProps {
  toasts: Toast[];
  onDismiss(id: string): void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
