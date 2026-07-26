import { useEffect, useState } from 'react';
import type {
  VisualTranslationRunRecord,
  ReferenceTranslationRunRecord
} from '../../../shared/types';
import { cleanError, formatDuration } from '../utils';

interface Props {
  onBack: () => void;
}

type Kind = 'vt' | 'rt';

const VT_STATUS: Record<VisualTranslationRunRecord['status'], string> = {
  pending: '等待中', running: '运行中', completed: '已完成', failed: '失败', timed_out: '已超时', cancelled: '已取消'
};
const RT_STATUS: Record<ReferenceTranslationRunRecord['status'], string> = {
  running: '运行中', completed: '已完成', failed: '失败', cancelled: '已取消'
};

export function LegacyHistoryWorkspace({ onBack }: Props) {
  const [tab, setTab] = useState<Kind>('vt');
  const [vtRuns, setVtRuns] = useState<VisualTranslationRunRecord[]>([]);
  const [rtRuns, setRtRuns] = useState<ReferenceTranslationRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<{ title: string; body: string } | null>(null);
  const [busyId, setBusyId] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [a, b] = await Promise.all([
        window.masterpiece.visualTranslation.listRuns(),
        window.masterpiece.referenceTranslation.listRuns()
      ]);
      setVtRuns(a);
      setRtRuns(b);
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function viewReport(kind: Kind, id: string, title: string) {
    try {
      const body = kind === 'vt'
        ? await window.masterpiece.visualTranslation.readReport(id)
        : await window.masterpiece.referenceTranslation.readReport(id);
      setReport({ title, body });
    } catch (reason) {
      setError(cleanError(reason));
    }
  }

  async function exportReport(kind: Kind, id: string) {
    setBusyId(id);
    try {
      const path = kind === 'vt'
        ? await window.masterpiece.visualTranslation.exportReport(id)
        : null;
      setError(path ? `已导出至：${path}` : '导出已取消');
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusyId('');
    }
  }

  async function openFolder(kind: Kind, id: string) {
    try {
      if (kind === 'vt') await window.masterpiece.visualTranslation.openFolder(id);
      else await window.masterpiece.referenceTranslation.openFolder(id);
    } catch (reason) {
      setError(cleanError(reason));
    }
  }

  async function removeRun(kind: Kind, id: string) {
    if (!window.confirm('确定删除该历史任务吗？\n此操作会永久删除本地任务文件夹，且无法撤销。')) return;
    setBusyId(id);
    try {
      if (kind === 'vt') {
        await window.masterpiece.visualTranslation.remove(id);
        setVtRuns((current) => current.filter((item) => item.id !== id));
      } else {
        await window.masterpiece.referenceTranslation.remove(id);
        setRtRuns((current) => current.filter((item) => item.id !== id));
      }
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusyId('');
    }
  }

  const runs = tab === 'vt' ? vtRuns : rtRuns;

  return <div className="page history-page">
    <header className="page-header">
      <div>
        <p className="eyebrow">HISTORY</p>
        <div className="title-line"><h1>历史任务</h1></div>
        <p>仅可查看、导出与删除旧版流程任务，不可新建或继续运行。</p>
      </div>
      <div className="button-row">
        <button className="button ghost" onClick={onBack}>返回首页</button>
      </div>
    </header>
    {error && <div className={`notice ${/已导出|已取消/.test(error) ? 'ok' : 'error'} top-notice`}>{error}</div>}
    <div className="history-tabs">
      <button className={tab === 'vt' ? 'active' : ''} onClick={() => setTab('vt')}>旧文档视觉转译（{vtRuns.length}）</button>
      <button className={tab === 'rt' ? 'active' : ''} onClick={() => setTab('rt')}>旧参考风格重构（{rtRuns.length}）</button>
    </div>
    {loading ? <div className="empty-state"><strong>正在加载历史任务…</strong></div>
      : runs.length === 0 ? <div className="empty-state"><strong>没有旧版流程任务</strong><p>历史任务来自此前版本的文档视觉转译与参考风格重构。</p></div>
      : <div className="history-list">
        {runs.map((run) => (
          <div className="history-row" key={run.id}>
            <div className="history-meta">
              <strong>{tab === 'vt' ? (run as VisualTranslationRunRecord).projectName : (run as ReferenceTranslationRunRecord).projectContextFilename}</strong>
              <small>
                <span className={`badge ${run.status}`}>{tab === 'vt' ? VT_STATUS[(run as VisualTranslationRunRecord).status] : RT_STATUS[(run as ReferenceTranslationRunRecord).status]}</span>
                {tab === 'vt' ? `${(run as VisualTranslationRunRecord).documentCount} 份文档` : (run as ReferenceTranslationRunRecord).visualAnalysisFilename}
                {' · '}{formatDuration(run.durationMs || null)}
              </small>
            </div>
            <div className="button-row history-actions">
              <button className="button text-button" disabled={busyId === run.id} onClick={() => void viewReport(tab, run.id, tab === 'vt' ? (run as VisualTranslationRunRecord).projectName : (run as ReferenceTranslationRunRecord).projectContextFilename)}>查看报告</button>
              <button className="button text-button" disabled={busyId === run.id} onClick={() => void exportReport(tab, run.id)}>导出</button>
              <button className="button text-button" disabled={busyId === run.id} onClick={() => void openFolder(tab, run.id)}>打开文件夹</button>
              <button className="button danger text-button" disabled={run.status === 'running' || busyId === run.id} onClick={() => void removeRun(tab, run.id)}>删除</button>
            </div>
          </div>
        ))}
      </div>}
    {report && <div className="modal-overlay" onClick={() => setReport(null)}>
      <div className="modal report-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head"><h2>{report.title}</h2><button className="button ghost" onClick={() => setReport(null)}>关闭</button></header>
        <pre className="report-body">{report.body}</pre>
      </div>
    </div>}
  </div>;
}
