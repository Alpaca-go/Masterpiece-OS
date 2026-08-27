import type {
  CreativeResearchReferenceDto,
  CreativeResearchReferenceSelectionDto,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { deriveSelectionTraySummary } from './creative-research-view-model';
import { REFERENCE_ATTRIBUTE_LABELS } from './ReferenceAttributePicker';

export function SelectionTray({ selections, references, expanded, onToggle, onAnalyze, busy }: {
  selections: CreativeResearchReferenceSelectionDto[];
  references: CreativeResearchReferenceDto[];
  expanded: boolean;
  onToggle(): void;
  onAnalyze(): void;
  busy: boolean;
}) {
  const summary = deriveSelectionTraySummary(selections);
  const selectedIds = new Set(selections.filter((item) => item.state === 'SELECTED').map((item) => item.referenceId));
  const selectedReferences = references.filter((reference) => selectedIds.has(reference.id));
  return <aside className="cr-selection-tray" aria-label="Selection Tray">
    <header><div><span>Selection Tray / 灵感篮</span><h3>已选择 {summary.selectedCount}</h3></div></header>
    <dl>{REFERENCE_ATTRIBUTE_LABELS.filter((attribute) => summary.attributeCounts[attribute.value]).map((attribute) => <div key={attribute.value}><dt>{attribute.label}</dt><dd>{summary.attributeCounts[attribute.value]}</dd></div>)}</dl>
    <div className="cr-tray-actions">
      <button type="button" onClick={onToggle}>{expanded ? '收起我的选择' : '查看我的选择'}</button>
      <button type="button" className={summary.selectedCount >= 10 ? 'is-strong' : ''} disabled={busy || summary.selectedCount < 3} onClick={onAnalyze}>分析我的选择</button>
    </div>
    {summary.selectedCount < 3 && <small>至少选择 3 个参考，才能形成有意义的视觉倾向。</small>}
    {expanded && <div className="cr-tray-selection-list">{selectedReferences.map((reference) => <div key={reference.id}><strong>{reference.title}</strong><span>{reference.publisher}</span></div>)}</div>}
  </aside>;
}
