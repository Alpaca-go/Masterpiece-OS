// components/ui/ConfirmDialog.tsx
//
// 确认对话框 — 替换 window.confirm，保持 Notion 风视觉一致。
// 用法：用 useConfirm() hook 拿到 confirm() 函数 + ConfirmDialog 组件。
// 在组件树顶层放 <ConfirmDialog />，然后调用 confirm({...}) 即可。

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** 'default' | 'destructive' — destructive 时确认按钮是红色文字 */
  tone?: 'default' | 'destructive';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}

interface ConfirmProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: { message: '' },
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state]);

  const { title, message, confirmText = '确认', cancelText = '取消', tone = 'default' } = state.options;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        open={state.open}
        onClose={handleCancel}
        size="sm"
        closeOnBackdrop={false}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              {cancelText}
            </Button>
            <Button
              variant={tone === 'destructive' ? 'ghost' : 'primary'}
              size="sm"
              className={tone === 'destructive' ? 'ui-button--destructive' : ''}
              onClick={handleConfirm}
              autoFocus
            >
              {confirmText}
            </Button>
          </>
        }
      >
        {title && <h3 className="ui-confirm__title">{title}</h3>}
        <div className="ui-confirm__message">{message}</div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
