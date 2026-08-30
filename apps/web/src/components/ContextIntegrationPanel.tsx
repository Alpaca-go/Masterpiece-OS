import { useCallback, useEffect, useState } from 'react';
import type {
  ConflictResolutionInput,
  ContextConflict,
  DocumentContextRun,
  ProjectDocumentContextLink,
  ResolvedProjectContext
} from '@masterpiece/runtime-core/application-contracts.ts';

interface Props {
  projectId: string;
  projectName: string;
  onOpenReference(): void;
  showReferenceStyleEntry?: boolean;
}

type VisualStatus = { status: 'missing' | 'ready' | 'failed'; schemaVersion?: string | null };

function badgeTone(status: string): string {
  if (status === 'ready') return 'ready';
  if (status === 'failed' || status === 'unresolved') return 'failed';
  if (status === 'linked' || status === 'has-conflicts') return 'running';
  return 'missing';
}

function StatusRow({ label, status, detail }: { label: string; status: string; detail?: string }) {
  return (
    <li className="ctx-status-row">
      <span className={`badge ${badgeTone(status)}`}>{status}</span>
      <div><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</div>
    </li>
  );
}

export function ContextIntegrationPanel({ projectId, projectName, onOpenReference, showReferenceStyleEntry = false }: Props) {
  const [visual, setVisual] = useState<VisualStatus | null>(null);
  const [link, setLink] = useState<ProjectDocumentContextLink | null>(null);
  const [resolved, setResolved] = useState<ResolvedProjectContext | null>(null);
  const [docRuns, setDocRuns] = useState<DocumentContextRun[]>([]);
  const [selectedDocRun, setSelectedDocRun] = useState<string>('');
  const [conflicts, setConflicts] = useState<ContextConflict[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [vs, lk, rs, dr] = await Promise.all([
        window.masterpiece.contextIntegration.getVisualStatus(projectId),
        window.masterpiece.contextIntegration.getLink(projectId),
        window.masterpiece.contextIntegration.getResolved(projectId),
        window.masterpiece.documentContext.listRuns().catch(() => [] as DocumentContextRun[])
      ]);
      setVisual(vs);
      setLink(lk);
      setResolved(rs);
      setDocRuns(dr);
      setConflicts(rs?.conflicts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [projectId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function linkDocument(): Promise<void> {
    if (!selectedDocRun) return;
    setBusy(true);
    try {
      await window.masterpiece.contextIntegration.linkDocumentContext(projectId, selectedDocRun);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function unlinkDocument(): Promise<void> {
    setBusy(true);
    try {
      await window.masterpiece.contextIntegration.unlinkDocumentContext(projectId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function reMerge(): Promise<void> {
    setBusy(true);
    try {
      await window.masterpiece.contextIntegration.resolve(projectId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function upgradeContext(): Promise<void> {
    setBusy(true);
    try {
      await window.masterpiece.contextIntegration.migrate(projectId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function openVisualContext(): Promise<void> {
    try {
      await window.masterpiece.projectContext.export(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function applyResolution(conflict: ContextConflict, use: 'visual' | 'document' | 'manual', manual?: string): Promise<void> {
    setBusy(true);
    try {
      const resolution: ConflictResolutionInput = {
        field: conflict.field,
        resolution: use === 'manual' ? 'user_confirmed' : use === 'visual' ? 'visual_wins' : 'document_wins',
        value: use === 'visual' ? conflict.visualValue : use === 'document' ? conflict.documentValue : manual
      };
      await window.masterpiece.contextIntegration.applyConflictResolution(projectId, [resolution]);
      await refresh();
      setShowConflicts(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const visualStatus = visual?.status ?? 'missing';
  const docStatus = link ? 'linked' : 'missing';
  const mergedStatus = !resolved
    ? 'missing'
    : (resolved.conflicts.some((c) => c.resolution === 'unresolved') ? 'has-conflicts' : 'ready');
  const lockedAssets = resolved
    ? resolved.lockedAssets.logoAssetIds.length + resolved.lockedAssets.lockedFacts.length
    : 0;

  return (
    <section className="panel context-integration-panel">
      <div className="section-heading">
        <span>03</span>
        <div>
          <h2>项目上下文</h2>
          <p>视觉分析为主源，文档上下文补充业务，合并结果可追溯、可确认</p>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}

      <ul className="ctx-status-list">
        <StatusRow label="视觉上下文" status={visualStatus} detail={visual?.schemaVersion ? `v${visual.schemaVersion}` : undefined} />
        <StatusRow label="文档上下文" status={docStatus} detail={link ? `已关联 ${link.documentContextRunId.slice(0, 8)}` : undefined} />
        <StatusRow
          label="合并上下文"
          status={mergedStatus}
          detail={resolved ? `${resolved.conflicts.length} 项冲突 · ${lockedAssets} 项 Locked Assets` : undefined}
        />
      </ul>

      <div className="button-row ctx-actions">
        <button className="button text-button" disabled={visualStatus !== 'ready'} onClick={() => void openVisualContext()}>查看视觉上下文</button>
        {visualStatus === 'missing' && (
          <button className="button text-button" disabled={busy} onClick={() => void upgradeContext()}>升级项目上下文</button>
        )}
        {!link ? (
          <button className="button text-button" disabled={docRuns.length === 0 || busy} onClick={() => void linkDocument()}>
            关联文档上下文
          </button>
        ) : (
          <button className="button text-button" disabled={busy} onClick={() => void unlinkDocument()}>解除关联</button>
        )}
        <button className="button text-button" disabled={busy} onClick={() => { setShowConflicts(true); }}>查看冲突</button>
        <button className="button secondary" disabled={busy || visualStatus !== 'ready'} onClick={() => void reMerge()}>重新合并</button>
        {showReferenceStyleEntry && <button className="button primary" disabled={visualStatus !== 'ready'} onClick={onOpenReference}>打开参考视觉转换</button>}
      </div>

      {!link && docRuns.length > 0 && (
        <div className="ctx-link-picker">
          <label>选择要关联的文档 Context
            <select value={selectedDocRun} onChange={(event) => setSelectedDocRun(event.target.value)}>
              <option value="">— 请选择 —</option>
              {docRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.projectName}{run.documentCount ? ` · ${run.documentCount} 份文档` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {!link && docRuns.length === 0 && (
        <p className="empty-state small">尚无文档上下文任务，请先在「文档分析」中生成。</p>
      )}

      {showConflicts && (
        <div className="ctx-conflict-modal">
          <div className="ctx-conflict-inner">
            <div className="section-heading">
              <div><h2>上下文冲突确认</h2><p>身份与 Locked Assets 冲突必须人工确认，禁止静默覆盖</p></div>
              <button className="button ghost" onClick={() => setShowConflicts(false)}>关闭</button>
            </div>
            {conflicts.length === 0 ? (
              <p className="empty-state">无冲突，可直接使用合并上下文。</p>
            ) : (
              <ul className="ctx-conflict-list">
                {conflicts.map((conflict, index) => (
                  <li key={`${conflict.field}-${index}`} className={conflict.resolution === 'unresolved' ? 'conflict blocking' : 'conflict'}>
                    <div className="conflict-field"><strong>{conflict.field}</strong><span className={`badge ${conflict.resolution === 'unresolved' ? 'failed' : 'ready'}`}>{conflict.resolution}</span></div>
                    <div className="conflict-values">
                      <div><small>视觉结果</small><code>{JSON.stringify(conflict.visualValue)}</code></div>
                      <div><small>文档结果</small><code>{JSON.stringify(conflict.documentValue)}</code></div>
                    </div>
                    {conflict.note && <p className="conflict-note">{conflict.note}</p>}
                    {conflict.resolution === 'unresolved' && (
                      <div className="button-row">
                        <button className="button secondary" disabled={busy} onClick={() => void applyResolution(conflict, 'visual')}>使用视觉结果</button>
                        <button className="button secondary" disabled={busy} onClick={() => void applyResolution(conflict, 'document')}>使用文档结果</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
