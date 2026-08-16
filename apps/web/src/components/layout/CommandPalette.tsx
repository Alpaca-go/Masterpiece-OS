import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * CommandPalette — Linear / Raycast style Cmd+K launcher.
 *
 * - Global hotkey: Cmd/Ctrl+K opens, Esc closes.
 * - Fuzzy-ish filter on label + keywords.
 * - Arrow keys + Enter to select.
 * - Pure UI: parent owns the command list and the action handler.
 */

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  section?: string;
  shortcut?: string;
  keywords?: string[];
  /** When true, item is rendered but not selectable. */
  disabled?: boolean;
}

interface Props {
  open: boolean;
  onClose(): void;
  items: CommandItem[];
  onSelect(item: CommandItem): void;
  placeholder?: string;
  emptyText?: string;
}

export function CommandPalette({ open, onClose, items, onSelect, placeholder = '搜索命令、项目或记录…', emptyText = '无匹配命令' }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [item.label, item.hint, item.section, ...(item.keywords || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  // Group by section for display
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const key = item.section || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    // Defer to next tick so the input is in DOM
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[active];
        if (item && !item.disabled) { onSelect(item); onClose(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, active, onClose, onSelect]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="cmd-palette-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-palette__search">
          <span className="cmd-palette__icon" aria-hidden>⌘</span>
          <input
            ref={inputRef}
            className="cmd-palette__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
          />
          <kbd className="cmd-palette__esc">ESC</kbd>
        </div>
        <div className="cmd-palette__list">
          {filtered.length === 0 ? (
            <div className="cmd-palette__empty">{emptyText}</div>
          ) : (
            grouped.map(([section, items]) => (
              <div key={section} className="cmd-palette__section">
                <div className="cmd-palette__section-label">{section}</div>
                {items.map((item) => {
                  flatIndex += 1;
                  const isActive = flatIndex === active;
                  return (
                    <button
                      key={item.id}
                      className={`cmd-palette__item ${isActive ? 'is-active' : ''} ${item.disabled ? 'is-disabled' : ''}`}
                      onClick={() => { if (!item.disabled) { onSelect(item); onClose(); } }}
                      onMouseEnter={() => setActive(flatIndex)}
                      disabled={item.disabled}
                    >
                      <span className="cmd-palette__item-label">{item.label}</span>
                      {item.hint && <span className="cmd-palette__item-hint">{item.hint}</span>}
                      {item.shortcut && <kbd className="cmd-palette__item-kbd">{item.shortcut}</kbd>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="cmd-palette__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> 切换</span>
          <span><kbd>↵</kbd> 选择</span>
          <span><kbd>ESC</kbd> 关闭</span>
        </div>
      </div>
    </div>
  );
}

/**
 * useCommandPalette — wires global Cmd/Ctrl+K hotkey.
 * Returns [open, setOpen] controlled state.
 */
export function useCommandPalette(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return [open, setOpen];
}
