import { useEffect, useState } from 'react';
import type { CreativeResearchBriefDto, UpdateCreativeResearchSearchStrategyInput } from '@masterpiece/runtime-core/application-contracts.ts';
import { Button } from '../../components/ui/Button';

const FEEDBACK = ['太保守', '太行业化', '太常规', '太年轻', '太成熟', '太商业', '太艺术', '关键词理解偏了'];
function lines(value: string): string[] { return value.split(/\r?\n|，|,/u).map((item) => item.trim()).filter(Boolean); }

export function CorrectionToolbar({ brief, busy, onRefresh, onAdjust, onReanalyze }: {
  brief: CreativeResearchBriefDto;
  busy: boolean;
  onRefresh(): Promise<void>;
  onAdjust(input: UpdateCreativeResearchSearchStrategyInput): Promise<void>;
  onReanalyze(feedback: string[]): Promise<void>;
}) {
  const [mode, setMode] = useState<'NONE' | 'ADJUST' | 'REANALYZE'>('NONE');
  const [concept, setConcept] = useState(brief.conceptKeywords.join('\n'));
  const [visual, setVisual] = useState(brief.visualKeywords.join('\n'));
  const [keywords, setKeywords] = useState(brief.searchKeywords);
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  useEffect(() => { setConcept(brief.conceptKeywords.join('\n')); setVisual(brief.visualKeywords.join('\n')); setKeywords(brief.searchKeywords); }, [brief]);
  return <section className="cr-correction-toolbar" aria-label="研究纠偏">
    <div className="cr-correction-toolbar__actions">
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => void onRefresh()}>换一批</Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setMode(mode === 'ADJUST' ? 'NONE' : 'ADJUST')}>调整关键词</Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setMode(mode === 'REANALYZE' ? 'NONE' : 'REANALYZE')}>重新分析</Button>
    </div>
    {mode === 'ADJUST' && <div className="cr-correction-panel">
      <h3>调整搜索策略</h3><p>只修改概念、视觉和搜索关键词；项目事实保持不变。</p>
      <label>概念词<textarea value={concept} onChange={(event) => setConcept(event.target.value)} /></label>
      <label>视觉词<textarea value={visual} onChange={(event) => setVisual(event.target.value)} /></label>
      <div className="cr-correction-keywords">{keywords.map((keyword, index) => <div key={keyword.id}>
        <input type="checkbox" checked={keyword.enabled} onChange={(event) => { const next = [...keywords]; next[index] = { ...keyword, enabled: event.target.checked }; setKeywords(next); }} />
        <select value={keyword.kind} onChange={(event) => { const next = [...keywords]; next[index] = { ...keyword, kind: event.target.value as typeof keyword.kind }; setKeywords(next); }}><option value="CONCEPT">概念</option><option value="CATEGORY">品类</option><option value="VISUAL">视觉</option></select>
        <input value={keyword.value} onChange={(event) => { const next = [...keywords]; next[index] = { ...keyword, value: event.target.value }; setKeywords(next); }} />
        <button type="button" onClick={() => setKeywords(keywords.filter((_, itemIndex) => itemIndex !== index))}>移除</button>
      </div>)}</div>
      <button type="button" onClick={() => setKeywords([...keywords, { id: `draft-${Date.now()}`, value: '', kind: 'CONCEPT', source: 'DESIGNER', enabled: true }])}>添加关键词</button>
      <label>调整说明（可选）<input value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div><button type="button" onClick={() => setMode('NONE')}>取消</button><Button size="sm" variant="primary" disabled={busy} onClick={() => void onAdjust({
        conceptKeywords: lines(concept), visualKeywords: lines(visual), designerNote: note || undefined,
        searchKeywords: keywords.filter((item) => item.value.trim()).map(({ id, value, kind, enabled, rationale, locale }) => ({ id: id.startsWith('draft-') ? undefined : id, value, kind, enabled, rationale, locale })),
      }).then(() => setMode('NONE'))}>保存并搜索</Button></div>
    </div>}
    {mode === 'REANALYZE' && <div className="cr-correction-panel">
      <h3>重新分析项目理解</h3><p>系统会重新读取原始文档。之前的参考、选择和排除记录都会保留。</p>
      <div className="cr-feedback-options">{FEEDBACK.map((item) => <label key={item}><input type="checkbox" checked={feedback.includes(item)} onChange={(event) => setFeedback(event.target.checked ? [...feedback, item] : feedback.filter((value) => value !== item))} />{item}</label>)}</div>
      <label>自定义反馈<textarea value={custom} onChange={(event) => setCustom(event.target.value)} /></label>
      <div><button type="button" onClick={() => setMode('NONE')}>取消</button><Button size="sm" variant="primary" disabled={busy || (!feedback.length && !custom.trim())} onClick={() => void onReanalyze([...feedback, ...lines(custom)]).then(() => setMode('NONE'))}>确认重新分析</Button></div>
    </div>}
  </section>;
}
