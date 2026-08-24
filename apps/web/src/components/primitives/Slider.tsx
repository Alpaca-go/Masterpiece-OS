// primitives/Slider.tsx — 路线 A / P0 §3.4 / §5 组件清单
//
// 用途: 数值滑块 (aspect ratio / 强度 / 数量等连续值输入)。
// 当前阶段零运行时影响。
//
// 设计:
//   - 受控 (value + onChange)
//   - min/max/step 三参数
//   - 显示当前数值在 thumb 右侧

import { useId } from 'react';
import type { ChangeEvent } from 'react';

interface SliderProps {
  value: number;
  onChange(next: number): void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  /** 显示单位 (如 's' / 'px' / '%') */
  unit?: string;
  /** 小数位, 默认 0 */
  precision?: number;
}

export type { SliderProps };

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled = false,
  unit,
  precision = 0,
}: SliderProps) {
  const id = useId();
  function handle(e: ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    if (Number.isFinite(n)) onChange(n);
  }
  return (
    <div className={`ui-slider${disabled ? ' ui-slider--disabled' : ''}`}>
      {label && (
        <label htmlFor={id} className="ui-slider__label">{label}</label>
      )}
      <div className="ui-slider__row">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handle}
          className="ui-slider__input"
        />
        <output className="ui-slider__value">
          {value.toFixed(precision)}{unit ?? ''}
        </output>
      </div>
    </div>
  );
}