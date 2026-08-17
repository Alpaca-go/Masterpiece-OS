// AnalysisModeTabs — visible analysis-mode entry selector.
//
// CI-W1B adds `creative-intelligence` as the primary new entry. The legacy
// `document-context` mode key is preserved for back-compat (the
// DocumentContextWorkspace still works at `/document-context`), but the
// tab UI no longer surfaces it. Hidden users get a migration notice from
// the `App.tsx` home entry.

export type AnalysisMode = 'visual-analysis' | 'creative-intelligence' | 'document-context' | 'reference-anchor';

interface Props {
  value: AnalysisMode;
  onChange(value: AnalysisMode): void;
}

const VISIBLE_MODES: Array<{ key: AnalysisMode; label: string; hint: string; primary?: boolean }> = [
  { key: 'visual-analysis', label: '视觉分析', hint: '上传视觉方案、图片、PDF 或 ZIP' },
  { key: 'creative-intelligence', label: 'Creative Intelligence', hint: '上传资料 → 确认事实 → 选择创意方向 → 视觉系统', primary: true },
  { key: 'reference-anchor', label: '参考锚定（Anchor）', hint: '上传参考图提炼风格规则，生成 Anchor Brief 交人工确认' }
];

export function AnalysisModeTabs({ value, onChange }: Props) {
  return <div className="analysis-mode-tabs analysis-mode-tabs--ci" role="tablist" aria-label="分析功能">
    {VISIBLE_MODES.map((mode) => {
      const active = value === mode.key;
      const className = [
        active ? 'active' : '',
        mode.primary ? 'is-primary' : ''
      ].filter(Boolean).join(' ');
      return <button key={mode.key} role="tab" aria-selected={active} className={className} onClick={() => onChange(mode.key)}>
        <span>{mode.label}</span><small>{mode.hint}</small>
      </button>;
    })}
  </div>;
}
