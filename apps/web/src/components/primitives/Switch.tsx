// primitives/Switch.tsx — 路线 A / P0 §3.4 / §5 组件清单
//
// 用途: 开关 (替代 v1 <input type=checkbox> + .toggle class 模式)。
// 当前阶段零运行时影响。

import type { ChangeEvent } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange(next: boolean): void;
  disabled?: boolean;
  label?: string;
  /** i18n label (右侧文字) */
  description?: string;
}

export type { SwitchProps };

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  description,
}: SwitchProps) {
  function handle(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.checked);
  }
  return (
    <label className={`ui-switch${disabled ? ' ui-switch--disabled' : ''}`}>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={handle}
        className="ui-switch__input"
      />
      <span className="ui-switch__track" aria-hidden>
        <span className="ui-switch__thumb" />
      </span>
      {(label || description) && (
        <span className="ui-switch__caption">
          {label && <span className="ui-switch__label">{label}</span>}
          {description && (
            <span className="ui-switch__description">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}