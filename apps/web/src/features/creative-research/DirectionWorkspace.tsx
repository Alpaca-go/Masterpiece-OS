import { useEffect, useMemo, useState } from 'react';
import type {
  CreativeDirectionContextDto,
  CreativeResearchBriefDto,
  CreativeResearchDirectionBoardDto,
  CreativeResearchNegativeSignalDto,
  CreativeResearchPendingInsightDto,
  CreativeResearchPreferenceInsightDto,
  CreativeResearchReferenceDto,
  CreativeResearchReferenceSelectionDto,
  CreativeResearchSessionDto,
  UpdateCreativeResearchDirectionBoardInput,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { Button } from '../../components/ui/Button';
import { safeReferenceUrl } from './creative-research-view-model';
import { REFERENCE_ATTRIBUTE_LABELS } from './ReferenceAttributePicker';

const ATTRIBUTE_LABELS = new Map(REFERENCE_ATTRIBUTE_LABELS.map((item) => [item.value, item.label]));

const SECTION_FIELDS = [
  { key: 'typography', label: '字体 Typography' },
  { key: 'layout', label: '版式 Layout' },
  { key: 'color', label: '色彩 Color' },
  { key: 'graphic', label: '图形 Graphic' },
  { key: 'material', label: '材质 Material' },
  { key: 'photography', label: '摄影 Photography' },
] as const;

type SectionKey = (typeof SECTION_FIELDS)[number]['key'];

const INSIGHT_SECTION_MAP: Partial<Record<string, SectionKey>> = {
  TYPOGRAPHY: 'typography',
  LAYOUT: 'layout',
  COLOR: 'color',
  GRAPHIC: 'graphic',
  MATERIAL: 'material',
  PHOTOGRAPHY: 'photography',
};

interface DirectionDraft {
  summary: string;
  visualKeywords: string[];
  typography: string;
  layout: string;
  color: string;
  graphic: string;
  material: string;
  photography: string;
  referenceIds: string[];
  referenceRegionIds: string[];
  negativeSignalIds: string[];
  designerNotes: string[];
}

function toDraft(board: CreativeResearchDirectionBoardDto): DirectionDraft {
  return {
    summary: board.summary,
    visualKeywords: board.visualKeywords,
    typography: board.typography || '',
    layout: board.layout || '',
    color: board.color || '',
    graphic: board.graphic || '',
    material: board.material || '',
    photography: board.photography || '',
    referenceIds: board.referenceIds,
    referenceRegionIds: board.referenceRegionIds,
    negativeSignalIds: board.negativeSignalIds,
    designerNotes: board.designerNotes,
  };
}

function listText(value: string): string[] {
  return value.split(/\r?\n|，|,/u).map((item) => item.trim()).filter(Boolean);
}

function DirectionReferenceCard({ reference, editable, onRemove }: {
  reference: CreativeResearchReferenceDto;
  editable: boolean;
  onRemove(): void;
}) {
  const [broken, setBroken] = useState(false);
  const imageUrl = reference.cachedImageUrl || reference.thumbnailUrl || reference.remoteImageUrl;
  return <article className="cr-direction-ref">
    <div className="cr-direction-ref__media">
      {!broken && imageUrl ? <img src={imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} /> : <span>图片暂不可用</span>}
    </div>
    <div><strong>{reference.title}</strong><small>{reference.publisher}{reference.sourceUrl ? ` · ${reference.sourceUrl}` : ''}</small></div>
    <div className="cr-direction-ref__actions">
      {reference.sourceUrl && <button type="button" onClick={() => {
        const url = safeReferenceUrl(reference.sourceUrl!);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      }}>查看来源 ↗</button>}
      {editable && <button type="button" onClick={onRemove}>从方向中移除</button>}
    </div>
  </article>;
}

function DirectionContextView({ context, references }: {
  context: CreativeDirectionContextDto;
  references: CreativeResearchReferenceDto[];
}) {
  const [copyState, setCopyState] = useState<'' | 'done' | 'failed'>('');
  const referencesById = new Map(references.map((item) => [item.id, item]));
  async function copyContext() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(context, null, 2));
      setCopyState('done');
    } catch {
      setCopyState('failed');
    }
  }
  const attributeLabels = context.preferredAttributes.map((item) => ATTRIBUTE_LABELS.get(item) || item);
  return <section className="cr-direction-section cr-direction-context" aria-label="方向上下文">
    <header><h3>方向上下文</h3>
      <Button size="sm" variant="secondary" onClick={() => void copyContext()}>{copyState === 'done' ? '已复制' : copyState === 'failed' ? '复制失败，请重试' : '复制方向上下文 JSON'}</Button>
    </header>
    <dl>
      <dt>方向摘要</dt><dd>{context.directionSummary || '（空）'}</dd>
      <dt>视觉关键词</dt><dd>{context.visualKeywords.length ? context.visualKeywords.join('、') : '（空）'}</dd>
      <dt>Preferred Attributes</dt><dd>{attributeLabels.length ? attributeLabels.join('、') : '（空）'}</dd>
      <dt>已纳入 Reference（{context.selectedReferenceIds.length}）</dt>
      <dd>{context.selectedReferenceIds.length ? context.selectedReferenceIds.map((id) => referencesById.get(id)?.title || id).join('、') : '（空）'}</dd>
      <dt>Negative Signals（{context.negativeSignals.length}）</dt>
      <dd>{context.negativeSignals.length ? <ul>{context.negativeSignals.map((signal) => <li key={signal.id}>{signal.type} · {signal.scope}{signal.reason ? ` · ${signal.reason}` : ''}{signal.value ? ` · ${signal.value}` : ''}</li>)}</ul> : '（空）'}</dd>
      <dt>设计师备注</dt>
      <dd>{context.designerNotes.length ? <ul>{context.designerNotes.map((note, index) => <li key={index}>{note}</li>)}</ul> : '（空）'}</dd>
      <dt>约束</dt>
      <dd>{context.constraints.length ? <ul>{context.constraints.map((item, index) => <li key={index}>{item}</li>)}</ul> : '（空）'}</dd>
      <dt>Project Brief</dt><dd>{context.projectBrief || '（空）'}</dd>
      <dt>Provenance</dt>
      <dd>Brief {context.provenance.designBriefId}（Revision {context.briefRevision}） · Direction Board {context.provenance.directionBoardId}（Revision {context.directionBoardRevision}） · 来源文档 {context.provenance.sourceDocumentCount} 份{context.provenance.sourceDocumentLabels.length ? `（${context.provenance.sourceDocumentLabels.join('、')}）` : ''}</dd>
      <dt>生成时间</dt><dd>{context.createdAt}</dd>
    </dl>
  </section>;
}

export function DirectionWorkspace({ session, brief, board, references, selections, negativeSignals, insights, pendingFinalizedInsights, context, busy, onSave, onReturnToResearch, onComplete }: {
  session: CreativeResearchSessionDto;
  brief: CreativeResearchBriefDto;
  board: CreativeResearchDirectionBoardDto;
  references: CreativeResearchReferenceDto[];
  selections: CreativeResearchReferenceSelectionDto[];
  negativeSignals: CreativeResearchNegativeSignalDto[];
  insights: CreativeResearchPreferenceInsightDto[];
  pendingFinalizedInsights: CreativeResearchPendingInsightDto[];
  context: CreativeDirectionContextDto | null;
  busy: boolean;
  onSave(input: UpdateCreativeResearchDirectionBoardInput): Promise<void>;
  onReturnToResearch(): Promise<void>;
  onComplete(): Promise<void>;
}) {
  const editable = session.status === 'DIRECTION';
  const [draft, setDraft] = useState<DirectionDraft>(() => toDraft(board));
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setDraft(toDraft(board)), [board]);

  const referencesById = useMemo(() => new Map(references.map((item) => [item.id, item])), [references]);
  const negativeById = useMemo(() => new Map(negativeSignals.map((item) => [item.id, item])), [negativeSignals]);
  const boardReferences = draft.referenceIds.map((id) => referencesById.get(id)).filter((item): item is CreativeResearchReferenceDto => Boolean(item));
  const selectedReferenceIds = useMemo(() => new Set(selections.filter((item) => item.state === 'SELECTED').map((item) => item.referenceId)), [selections]);
  const availableReferences = references.filter((reference) => selectedReferenceIds.has(reference.id) && !draft.referenceIds.includes(reference.id));
  const finalizedInsights = insights.filter((item) => item.status === 'FINALIZED');
  const draftInsights = insights.filter((item) => item.status === 'DRAFT');
  const preferredAttributeLabels = useMemo(() => {
    const attributes = new Set(selections.filter((item) => draft.referenceIds.includes(item.referenceId)).flatMap((item) => item.selectedAttributes));
    return [...attributes].map((item) => ATTRIBUTE_LABELS.get(item) || item);
  }, [selections, draft.referenceIds]);

  const textField = (key: 'summary' | SectionKey) => ({
    value: draft[key],
    disabled: !editable,
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft({ ...draft, [key]: event.target.value }),
  });
  const applyInsight = (insight: CreativeResearchPreferenceInsightDto) => {
    const text = insight.designerOverride || insight.summary;
    if (!text.trim()) return;
    const key = INSIGHT_SECTION_MAP[insight.category];
    setDraft((current) => key
      ? { ...current, [key]: current[key] ? `${current[key]}\n${text}` : text }
      : { ...current, summary: current.summary ? `${current.summary}\n${text}` : text });
  };
  const save = () => onSave({
    summary: draft.summary,
    visualKeywords: draft.visualKeywords,
    typography: draft.typography,
    layout: draft.layout,
    color: draft.color,
    graphic: draft.graphic,
    material: draft.material,
    photography: draft.photography,
    referenceIds: draft.referenceIds,
    referenceRegionIds: draft.referenceRegionIds,
    negativeSignalIds: draft.negativeSignalIds,
    designerNotes: draft.designerNotes,
  });

  return <section className="cr-direction">
    <header className="cr-panel__head cr-direction__head"><div><span>Direction Board</span><h2>视觉方向</h2></div><b>Revision {board.revision}</b></header>

    <section className="cr-direction-section cr-direction-brief" aria-label="Project Brief">
      <header><h3>Project Brief</h3><small>只读 · 来自 Brief Revision {brief.revision}</small></header>
      <strong>项目摘要</strong><p>{brief.projectSummary || '（空）'}</p>
      <strong>设计任务</strong><p>{brief.designTask || '（空）'}</p>
    </section>

    <section className="cr-direction-section" aria-label="方向内容">
      <header><h3>方向内容</h3></header>
      <div className="cr-direction-grid">
        <label className="cr-direction-field cr-direction-field--wide">方向摘要<textarea aria-label="方向摘要" {...textField('summary')} /></label>
        <label className="cr-direction-field cr-direction-field--wide">核心视觉关键词（每行一项）<textarea aria-label="核心视觉关键词" value={draft.visualKeywords.join('\n')} disabled={!editable} onChange={(event) => setDraft({ ...draft, visualKeywords: listText(event.target.value) })} /></label>
        {SECTION_FIELDS.map((field) => <label key={field.key} className="cr-direction-field">{field.label}<textarea aria-label={field.label} {...textField(field.key)} /></label>)}
      </div>
    </section>

    <section className="cr-direction-section" aria-label="已纳入方向的参考">
      <header><h3>Selected References</h3><span>{boardReferences.length}</span></header>
      {availableReferences.length > 0 && <div className="cr-direction-hint" role="status">
        <span>还有 {availableReferences.length} 个新收藏的 Reference 尚未加入方向</span>
        {availableReferences.map((reference) => <div className="cr-direction-hint__row" key={reference.id}>
          <span>{reference.title}<small>{reference.publisher}</small></span>
          {editable && <button type="button" onClick={() => setDraft({ ...draft, referenceIds: [...draft.referenceIds, reference.id] })}>加入方向</button>}
        </div>)}
      </div>}
      {boardReferences.length ? <div className="cr-direction-refs">{boardReferences.map((reference) => <DirectionReferenceCard key={reference.id} reference={reference} editable={editable} onRemove={() => setDraft({ ...draft, referenceIds: draft.referenceIds.filter((id) => id !== reference.id) })} />)}</div> : <div className="cr-empty">尚未把任何参考加入方向。</div>}
    </section>

    {(finalizedInsights.length > 0 || draftInsights.length > 0) && <section className="cr-direction-section" aria-label="倾向建议">
      <header><h3>倾向建议</h3>{pendingFinalizedInsights.length > 0 && <span className="cr-direction-hint-inline">有新的已确认倾向可参考</span>}</header>
      {finalizedInsights.length > 0 && <div className="cr-direction-insights">
        <h4>已确认倾向</h4>
        {finalizedInsights.map((insight) => <article className="cr-direction-insight" key={insight.id}>
          <header><strong>{ATTRIBUTE_LABELS.get(insight.category) || insight.category}</strong></header>
          <p>{insight.designerOverride || insight.summary}</p>
          {editable && <button type="button" onClick={() => applyInsight(insight)}>应用到方向</button>}
        </article>)}
      </div>}
      {draftInsights.length > 0 && <div className="cr-direction-insights">
        <h4>未确认倾向</h4>
        {draftInsights.map((insight) => <article className="cr-direction-insight" key={insight.id}>
          <header><strong>{ATTRIBUTE_LABELS.get(insight.category) || insight.category}</strong><small>草稿</small></header>
          <p>{insight.designerOverride || insight.summary}</p>
        </article>)}
      </div>}
    </section>}

    {draft.negativeSignalIds.length > 0 && <section className="cr-direction-section" aria-label="Avoid">
      <header><h3>Avoid / Negative Signals</h3><span>{draft.negativeSignalIds.length}</span></header>
      <div className="cr-direction-avoid">
        {draft.negativeSignalIds.map((id) => {
          const signal = negativeById.get(id);
          const sourceTitle = signal?.sourceReferenceId ? referencesById.get(signal.sourceReferenceId)?.title : undefined;
          return <div className="cr-direction-avoid__row" key={id}>
            <span>{signal?.reason || signal?.value || '设计师标记为不要类似'}{sourceTitle ? <small> · 来自「{sourceTitle}」</small> : null}</span>
            {editable && <button type="button" onClick={() => setDraft({ ...draft, negativeSignalIds: draft.negativeSignalIds.filter((item) => item !== id) })}>从 Direction 中移除</button>}
          </div>;
        })}
      </div>
    </section>}

    <section className="cr-direction-section" aria-label="设计师备注">
      <header><h3>Designer Notes</h3></header>
      <label className="cr-direction-field">设计师备注（每行一项）<textarea aria-label="设计师备注" value={draft.designerNotes.join('\n')} disabled={!editable} onChange={(event) => setDraft({ ...draft, designerNotes: listText(event.target.value) })} /></label>
    </section>

    {editable && <footer className="cr-direction-actions">
      <Button variant="ghost" disabled={busy} onClick={() => void onReturnToResearch()}>返回继续研究</Button>
      <Button variant="secondary" disabled={busy} onClick={() => void save()}>保存方向</Button>
      <Button variant="primary" disabled={busy} onClick={() => setConfirming(true)}>完成方向</Button>
    </footer>}

    {editable && confirming && <div className="cr-alert cr-alert--warning cr-direction-confirm" role="dialog" aria-label="确认完成方向">
      <p>完成后本次 Creative Research 将进入只读完成状态。</p>
      <dl>
        <div><dt>方向摘要</dt><dd>{draft.summary || '（空）'}</dd></div>
        <div><dt>已纳入 Reference 数</dt><dd>{draft.referenceIds.length}</dd></div>
        <div><dt>Preferred Attributes</dt><dd>{preferredAttributeLabels.length ? preferredAttributeLabels.join('、') : '（空）'}</dd></div>
        <div><dt>Negative Signals 数</dt><dd>{draft.negativeSignalIds.length}</dd></div>
      </dl>
      <div className="cr-direction-confirm__actions">
        <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>取消</Button>
        <Button variant="primary" disabled={busy} onClick={() => { setConfirming(false); void onComplete(); }}>确认完成</Button>
      </div>
    </div>}

    {session.status === 'COMPLETED' && (context
      ? <DirectionContextView context={context} references={references} />
      : <div className="cr-alert cr-alert--warning">方向上下文尚未生成。</div>)}
  </section>;
}
