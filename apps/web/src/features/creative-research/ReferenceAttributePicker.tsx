import type { CreativeResearchReferenceAttributeDto } from '@masterpiece/runtime-core/application-contracts.ts';

export const REFERENCE_ATTRIBUTE_LABELS: ReadonlyArray<{
  value: CreativeResearchReferenceAttributeDto;
  label: string;
}> = [
  { value: 'TYPOGRAPHY', label: '字体' },
  { value: 'LAYOUT', label: '版式' },
  { value: 'COLOR', label: '色彩' },
  { value: 'GRAPHIC', label: '图形' },
  { value: 'MATERIAL', label: '材质' },
  { value: 'PHOTOGRAPHY', label: '摄影' },
  { value: 'IMAGE_TREATMENT', label: '图像处理' },
  { value: 'APPLICATION', label: '应用方式' },
  { value: 'ATMOSPHERE', label: '氛围' },
];

export function ReferenceAttributePicker({ value, disabled, onChange }: {
  value: CreativeResearchReferenceAttributeDto[];
  disabled?: boolean;
  onChange(value: CreativeResearchReferenceAttributeDto[]): void;
}) {
  const active = new Set(value);
  return <div className="cr-attribute-picker" aria-label="参考属性">
    {REFERENCE_ATTRIBUTE_LABELS.map((attribute) => <button
      type="button"
      key={attribute.value}
      className={active.has(attribute.value) ? 'is-active' : ''}
      disabled={disabled}
      aria-pressed={active.has(attribute.value)}
      onClick={() => onChange(active.has(attribute.value)
        ? value.filter((item) => item !== attribute.value)
        : [...value, attribute.value])}
    >{attribute.label}</button>)}
  </div>;
}
