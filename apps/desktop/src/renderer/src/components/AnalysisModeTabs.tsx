export type AnalysisMode = 'visual-analysis' | 'document-context' | 'reference-anchor' | 'visual-translation' | 'reference-translation';

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
    <button role="tab" aria-selected={value === 'visual-translation'} className={value === 'visual-translation' ? 'active' : ''} onClick={() => onChange('visual-translation')}>
      <span>文档视觉转译（旧）</span><small>旧三方向流程：上传策略文档，生成三个视觉方向</small>
    </button>
    <button role="tab" aria-selected={value === 'reference-translation'} className={value === 'reference-translation' ? 'active' : ''} onClick={() => onChange('reference-translation')}>
      <span>参考风格重构（旧）</span><small>开发者模式保留：旧参考转译流程与 GPT 执行文档</small>
    </button>
  </div>;
}
