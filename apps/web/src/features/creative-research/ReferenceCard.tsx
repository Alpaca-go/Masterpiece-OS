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

export function ReferenceCard({ reference, selection, display, busy, readOnly = false, onSelectionChange, onFindSimilar }: {
  reference: CreativeResearchReferenceDto;
  selection?: CreativeResearchReferenceSelectionDto;
  display: 'IMAGE' | 'WEB';
  busy: boolean;
  readOnly?: boolean;
  onSelectionChange(change: SelectionChange): Promise<void>;
  onFindSimilar(dimension: CreativeResearchReferenceAttributeDto | 'PEER_CASE'): Promise<void>;
}) {
  const [broken, setBroken] = useState(false);
  const [note, setNote] = useState(selection?.designerNote || '');
  const [rejectionReason, setRejectionReason] = useState('');
  const [similarDimension, setSimilarDimension] = useState<CreativeResearchReferenceAttributeDto | 'PEER_CASE'>('LAYOUT');
  useEffect(() => setNote(selection?.designerNote || ''), [selection?.designerNote]);
  const state = selection?.state || 'NONE';
  const attributes = selection?.selectedAttributes || [];
  const source = () => {
    const url = safeReferenceUrl(reference.sourceUrl);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };
  const set = (change: SelectionChange) => onSelectionChange(change);
  const controls = readOnly ? <div className="cr-reference-judgment">
    <div className="cr-reference-actions">
      <button type="button" onClick={source}>查看来源 ↗</button>
    </div>
  </div> : <div className="cr-reference-judgment">
    <div className="cr-reference-actions">
      <button type="button" className={state === 'SELECTED' ? 'is-selected' : ''} disabled={busy} onClick={() => void set(state === 'SELECTED'
        ? { state: 'NONE', selectedAttributes: [] }
        : { state: 'SELECTED', selectedAttributes: attributes, designerNote: note })}>{state === 'SELECTED' ? '取消收藏' : '收藏'}</button>
      <button type="button" className={state === 'REJECTED' ? 'is-rejected' : ''} disabled={busy} onClick={() => void set(state === 'REJECTED'
        ? { state: 'NONE', selectedAttributes: [] }
        : { state: 'REJECTED', selectedAttributes: [], rejectionReason })}>{state === 'REJECTED' ? '取消排除' : '不要类似'}</button>
      <button type="button" onClick={source}>查看来源 ↗</button>
      <select aria-label="找相似维度" value={similarDimension} disabled={busy} onChange={(event) => setSimilarDimension(event.target.value as typeof similarDimension)}>
        <option value="TYPOGRAPHY">字体</option><option value="LAYOUT">版式</option><option value="COLOR">色彩</option>
        <option value="GRAPHIC">图形</option><option value="MATERIAL">材质</option><option value="PHOTOGRAPHY">摄影</option>
        <option value="IMAGE_TREATMENT">图像处理</option><option value="APPLICATION">应用方式</option><option value="ATMOSPHERE">氛围</option><option value="PEER_CASE">同类案例</option>
      </select>
      <button type="button" disabled={busy} onClick={() => void onFindSimilar(similarDimension)}>找相似</button>
    </div>
    {state === 'SELECTED' && <div className="cr-selected-detail">
      <ReferenceAttributePicker value={attributes} disabled={busy} onChange={(next) => void set({ state: 'SELECTED', selectedAttributes: next, designerNote: note })} />
      <input aria-label="设计师备注" value={note} disabled={busy} placeholder="备注：只参考版式，不喜欢配色" onChange={(event) => setNote(event.target.value)} onBlur={() => {
        if (note.trim() !== (selection?.designerNote || '')) void set({ state: 'SELECTED', selectedAttributes: attributes, designerNote: note });
      }} />
    </div>}
    {state !== 'SELECTED' && <input className="cr-rejection-reason" aria-label="排除原因" value={rejectionReason} disabled={busy} placeholder="可选：为什么不要类似" onChange={(event) => setRejectionReason(event.target.value)} />}
  </div>;

  if (display === 'WEB') return <article className="cr-web-card">
    <div><strong>{reference.title}</strong><small>{reference.publisher} · 排名 {reference.resultRank}</small></div>
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
