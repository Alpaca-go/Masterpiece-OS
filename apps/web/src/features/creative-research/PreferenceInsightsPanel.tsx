import { useState } from 'react';
import type {
  CreativeResearchNegativeSignalDto,
  CreativeResearchPreferenceInsightDto,
  CreativeResearchReferenceDto,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { REFERENCE_ATTRIBUTE_LABELS } from './ReferenceAttributePicker';

const LABELS = new Map(REFERENCE_ATTRIBUTE_LABELS.map((item) => [item.value, item.label]));

function confidenceLabel(value?: number): string {
  if (value === undefined) return '';
  if (value >= .75) return '高';
  if (value >= .45) return '中';
  return '低';
}

export function PreferenceInsightsPanel({ insights, references, negativeSignals, busy, readOnly = false, onUpdate, onFinalize }: {
  insights: CreativeResearchPreferenceInsightDto[];
  references: CreativeResearchReferenceDto[];
  negativeSignals: CreativeResearchNegativeSignalDto[];
  busy: boolean;
  readOnly?: boolean;
  onUpdate(insightId: string, designerOverride: string): Promise<void>;
  onFinalize(insightId: string): Promise<void>;
}) {
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [override, setOverride] = useState('');
  const referencesById = new Map(references.map((item) => [item.id, item]));
  const negativeById = new Map(negativeSignals.map((item) => [item.id, item]));
  return <section className="cr-preferences" aria-label="我的视觉倾向">
    <header><div><span>Preference evidence</span><h3>我的视觉倾向</h3></div><p>这是根据你目前的选择整理出的视觉倾向。</p></header>
    <div className="cr-insight-list">{insights.map((insight) => {
      const evidenceCount = insight.supportingReferenceIds.length + insight.supportingNegativeSignalIds.length;
      return <article key={insight.id} className={insight.status === 'FINALIZED' ? 'is-finalized' : ''}>
        <div className="cr-insight-head"><strong>{LABELS.get(insight.category) || insight.category}</strong><span>{insight.status === 'FINALIZED' ? '已确认' : '草稿'}{confidenceLabel(insight.confidence) ? ` · 置信度${confidenceLabel(insight.confidence)}` : ''}</span></div>
        <p>{insight.designerOverride || insight.summary}</p>
        {insight.designerOverride && <small>AI 原始解释：{insight.summary}</small>}
        <div className="cr-insight-actions">
          <button type="button" onClick={() => setEvidenceId(evidenceId === insight.id ? null : insight.id)}>查看依据（{evidenceCount}）</button>
          {!readOnly && <button type="button" disabled={busy} onClick={() => { setEditingId(insight.id); setOverride(insight.designerOverride || insight.summary); }}>修改</button>}
          {!readOnly && insight.status === 'DRAFT' && <button type="button" disabled={busy} onClick={() => void onFinalize(insight.id)}>确认这条倾向</button>}
        </div>
        {editingId === insight.id && <div className="cr-insight-override"><textarea aria-label="设计师修正" value={override} onChange={(event) => setOverride(event.target.value)} /><div><button type="button" onClick={() => setEditingId(null)}>取消</button><button type="button" disabled={busy || !override.trim()} onClick={() => void onUpdate(insight.id, override).then(() => setEditingId(null))}>保存修正</button></div></div>}
        {evidenceId === insight.id && <div className="cr-insight-evidence">
          {insight.supportingReferenceIds.map((id) => <div key={id}><b>Reference</b><span>{referencesById.get(id)?.title || id}</span><small>{referencesById.get(id)?.publisher || '来源不可用'}</small></div>)}
          {insight.supportingNegativeSignalIds.map((id) => <div key={id}><b>Negative Signal</b><span>{negativeById.get(id)?.reason || '设计师标记为不要类似'}</span><small>{negativeById.get(id)?.sourceReferenceId || id}</small></div>)}
        </div>}
      </article>;
    })}</div>
  </section>;
}
