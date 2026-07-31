export type AnalysisMode = 'visual-analysis' | 'document-context' | 'reference-anchor';

interface Props {
  value: AnalysisMode;
  onChange(value: AnalysisMode): void;
}

export function AnalysisModeTabs({ value, onChange }: Props) {
  return <div className="analysis-mode-tabs" role="tablist" aria-label="分析功能">
    <button role="tab" aria-selected={value === 'visual-analysis'} className={value === 'visual-analysis' ? 'active' : ''} onClick={() => onChange('visual-analysis')}>
      <span>视觉分析</span><small>上传视觉方案、图片、PDF 或 ZIP</small>
    </button>
    <button role="tab" aria-selected={value === 'document-context'} className={value === 'document-context' ? 'active' : ''} onClick={() => onChange('document-context')}>
      <span>文档上下文提取</span><small>提取品牌视觉事实，人工确认后生成项目简报</small>
    </button>
    <button role="tab" aria-selected={value === 'reference-anchor'} className={value === 'reference-anchor' ? 'active' : ''} onClick={() => onChange('reference-anchor')}>
      <span>参考锚定（Anchor）</span><small>上传参考图提炼风格规则，生成 Anchor Brief 交人工确认</small>
    </button>
  </div>;
}
