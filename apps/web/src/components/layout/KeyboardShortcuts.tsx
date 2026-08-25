// components/layout/KeyboardShortcuts.tsx
//
// 快捷键一览面板 — 按 ? 打开，也可通过 CommandPalette 访问。
// 展示全局快捷键 + 各工作区专属快捷键。

import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';

interface ShortcutGroup {
  title: string;
  items: Array<{ keys: string; description: string }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '全局',
    items: [
      { keys: '⌘K / Ctrl+K', description: '打开命令面板' },
      { keys: '?', description: '显示快捷键一览' },
      { keys: 'Shift+T', description: '切换亮/暗主题' },
      { keys: 'G H', description: '跳转到项目首页' },
      { keys: 'G C', description: '新建分析' },
      { keys: 'G S', description: '打开设置' },
      { keys: 'Esc', description: '关闭弹窗 / 返回' },
    ],
  },
  {
    title: '创作工作台',
    items: [
      { keys: '⌘Enter / Ctrl+Enter', description: '智能生成（聚焦 Brief 时）' },
      { keys: '1–5', description: '切换画幅比例（1:1 / 4:3 / 3:4 / 16:9 / 9:16）' },
      { keys: 'Tab', description: '在 Brief 字段间切换' },
    ],
  },
  {
    title: '命令面板',
    items: [
      { keys: '↑ / ↓', description: '切换选项' },
      { keys: 'Enter', description: '执行选中的命令' },
      { keys: 'Esc', description: '关闭' },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="快捷键" size="md">
      <div className="ui-shortcuts">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title} className="ui-shortcuts__group">
            <h4 className="ui-shortcuts__group-title">{group.title}</h4>
            <ul className="ui-shortcuts__list">
              {group.items.map((item) => (
                <li key={item.keys} className="ui-shortcuts__item">
                  <span className="ui-shortcuts__keys">
                    {item.keys.split(' / ').map((k, i) => (
                      <span key={i}>
                        {i > 0 && <span className="ui-shortcuts__sep">/</span>}
                        <kbd>{k}</kbd>
                      </span>
                    ))}
                  </span>
                  <span className="ui-shortcuts__desc">{item.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/**
 * useKeyboardShortcuts — 全局 ? 快捷键打开快捷键面板。
 * 输入框聚焦时不触发（避免输入 ? 时弹面板）。
 */
export function useKeyboardShortcuts(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 输入框中不触发
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return [open, setOpen];
}
