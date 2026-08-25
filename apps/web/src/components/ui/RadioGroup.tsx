// components/ui/RadioGroup.tsx
//
// 受控 RadioGroup — 支持方向键切换（WAI-ARIA radiogroup 模式）。
// 比原生 fieldset + radio 的优势：
//   - 方向键上下/左右切换（原生只能 Tab 切）
//   - 视觉样式更统一
//   - 自动聚焦激活项

import { useEffect, useRef, useState } from 'react';

interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

interface RadioGroupProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  /** 方向：vertical（默认，上下键）或 horizontal（左右键） */
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  /** group label — 会被 screen reader 读出 */
  ariaLabel?: string;
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  orientation = 'vertical',
  className = '',
  ariaLabel,
}: RadioGroupProps) {
  const radioRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    radioRefs.current = radioRefs.current.slice(0, options.length);
  }, [options.length]);

  function getEnabledIndices(): number[] {
    return options
      .map((opt, i) => ({ i, disabled: opt.disabled }))
      .filter((o) => !o.disabled)
      .map((o) => o.i);
  }

  function handleKeyDown(e: React.KeyboardEvent, currentIdx: number) {
    const enabled = getEnabledIndices();
    if (enabled.length === 0) return;

    const pos = enabled.indexOf(currentIdx);
    if (pos < 0) return;

    const isV = orientation === 'vertical';
    const prevKey = isV ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isV ? 'ArrowDown' : 'ArrowRight';

    let nextPos = -1;
    if (e.key === prevKey) {
      e.preventDefault();
      nextPos = (pos - 1 + enabled.length) % enabled.length;
    } else if (e.key === nextKey) {
      e.preventDefault();
      nextPos = (pos + 1) % enabled.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextPos = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextPos = enabled.length - 1;
    }

    if (nextPos >= 0) {
      const nextIdx = enabled[nextPos]!;
      const nextOpt = options[nextIdx];
      if (nextOpt) {
        onChange(nextOpt.value);
        radioRefs.current[nextIdx]?.focus();
      }
    }
  }

  const groupClass = [
    'ui-radio-group',
    `ui-radio-group--${orientation}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={groupClass}
      role="radiogroup"
      aria-orientation={orientation}
      aria-label={ariaLabel}
    >
      {options.map((opt, idx) => {
        const isChecked = opt.value === value;
        return (
          <label
            key={opt.value}
            className={`ui-radio-item${isChecked ? ' is-checked' : ''}${opt.disabled ? ' is-disabled' : ''}`}
          >
            <input
              ref={(el) => { radioRefs.current[idx] = el; }}
              type="radio"
              name={name}
              value={opt.value}
              checked={isChecked}
              disabled={opt.disabled}
              tabIndex={isChecked ? 0 : -1}
              onChange={() => !opt.disabled && onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className="ui-radio-item__input"
            />
            <span className="ui-radio-item__control" aria-hidden>
              <span className="ui-radio-item__dot" />
            </span>
            <span className="ui-radio-item__body">
              <span className="ui-radio-item__label">{opt.label}</span>
              {opt.description && (
                <span className="ui-radio-item__desc">{opt.description}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
