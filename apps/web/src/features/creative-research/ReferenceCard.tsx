import { useEffect, useState } from 'react';
import type {
  CreativeResearchReferenceAttributeDto,
  CreativeResearchReferenceDto,
  CreativeResearchReferenceSelectionDto,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { safeReferenceUrl } from './creative-research-view-model';
import { ReferenceAttributePicker } from './ReferenceAttributePicker';

type SelectionChange = {
  state: CreativeResearchReferenceSelectionDto['state'];
  selectedAttributes: CreativeResearchReferenceAttributeDto[];
  designerNote?: string;
  rejectionReason?: string;
};

export function ReferenceCard({ reference, selection, display, busy, readOnly = false, onSelectionChange, onRemove, onUpdateSource }: {
  reference: CreativeResearchReferenceDto;
  selection?: CreativeResearchReferenceSelectionDto;
  display: 'IMAGE' | 'WEB';
  busy: boolean;
  readOnly?: boolean;
  onSelectionChange(change: SelectionChange): Promise<void>;
  onRemove?(): Promise<void>;
  onUpdateSource?(input: { sourceUrl?: string; sourceLabel?: string }): Promise<void>;
}) {
  const [broken, setBroken] = useState(false);
  const [note, setNote] = useState(selection?.designerNote || '');
  const [rejectionReason, setRejectionReason] = useState('');
  const [sourceUrl, setSourceUrl] = useState(reference.sourceUrl || '');
  const [sourceLabel, setSourceLabel] = useState(reference.sourceLabel || '');
  useEffect(() => setNote(selection?.designerNote || ''), [selection?.designerNote]);
  const state = selection?.state || 'NONE';
  const attributes = selection?.selectedAttributes || [];
  const source = () => {
    const url = reference.sourceUrl ? safeReferenceUrl(reference.sourceUrl) : null;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };
  const set = (change: SelectionChange) => onSelectionChange(change);
  const controls = readOnly ? <div className="cr-reference-judgment">
    <div className="cr-reference-actions">
      {reference.sourceUrl && <button type="button" onClick={source}>查看来源 ↗</button>}
    </div>
  </div> : <div className="cr-reference-judgment">
    <div className="cr-reference-actions">
      <button type="button" className={state === 'SELECTED' ? 'is-selected' : ''} disabled={busy} onClick={() => void set(state === 'SELECTED'
        ? { state: 'NONE', selectedAttributes: [] }
        : { state: 'SELECTED', selectedAttributes: attributes, designerNote: note })}>{state === 'SELECTED' ? '取消收藏' : '收藏'}</button>
      <button type="button" className={state === 'REJECTED' ? 'is-rejected' : ''} disabled={busy} onClick={() => void set(state === 'REJECTED'
        ? { state: 'NONE', selectedAttributes: [] }
        : { state: 'REJECTED', selectedAttributes: [], rejectionReason })}>{state === 'REJECTED' ? '取消排除' : '不要类似'}</button>
      {reference.sourceUrl && <button type="button" onClick={source}>查看来源 ↗</button>}
      {onRemove && state === 'NONE' && <button type="button" disabled={busy} onClick={() => void onRemove()}>删除</button>}
    </div>
    {state === 'SELECTED' && <div className="cr-selected-detail">
      <ReferenceAttributePicker value={attributes} disabled={busy} onChange={(next) => void set({ state: 'SELECTED', selectedAttributes: next, designerNote: note })} />
      <input aria-label="设计师备注" value={note} disabled={busy} placeholder="备注：只参考版式，不喜欢配色" onChange={(event) => setNote(event.target.value)} onBlur={() => {
        if (note.trim() !== (selection?.designerNote || '')) void set({ state: 'SELECTED', selectedAttributes: attributes, designerNote: note });
      }} />
    </div>}
    {state !== 'SELECTED' && <input className="cr-rejection-reason" aria-label="排除原因" value={rejectionReason} disabled={busy} placeholder="可选：为什么不要类似" onChange={(event) => setRejectionReason(event.target.value)} />}
    {onUpdateSource && reference.sourceType === 'CURATED_REFERENCE' && <details className="cr-reference-source"><summary>来源信息</summary><input aria-label="来源名称" value={sourceLabel} disabled={busy} placeholder="例如：Behance / 客户提供" onChange={(event) => setSourceLabel(event.target.value)} /><input aria-label="来源 URL" value={sourceUrl} disabled={busy} placeholder="https://…" onChange={(event) => setSourceUrl(event.target.value)} /><button type="button" disabled={busy} onClick={() => void onUpdateSource({ sourceUrl, sourceLabel })}>保存来源</button></details>}
  </div>;

  if (display === 'WEB') return <article className="cr-web-card">
    <div><strong>{reference.title}</strong><small>{reference.publisher}{reference.resultRank ? ` · 排名 ${reference.resultRank}` : ''}</small></div>
    {controls}
  </article>;

  const imageUrl = reference.cachedImageUrl || reference.thumbnailUrl || reference.remoteImageUrl;
  return <article className={`cr-image-card cr-image-card--${state.toLowerCase()}`}>
    <div className="cr-image-card__media">
      {!broken && imageUrl ? <img src={imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} /> : <span>{reference.imageStatus === 'PENDING' ? '图片缓存中' : '图片暂不可用'}</span>}
    </div>
    <div><strong>{reference.title}</strong><small>{reference.publisher}</small></div>
    {controls}
  </article>;
}
