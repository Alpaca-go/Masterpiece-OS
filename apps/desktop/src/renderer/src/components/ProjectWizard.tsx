import { useState } from 'react';
import type { AssetSummary, ProjectRecord, PublicSettings } from '../../../shared/types';
import { cleanError, formatBytes } from '../utils';

interface Props {
  settings: PublicSettings;
  onStart(project: ProjectRecord): void;
  onCancel(): void;
}

export function ProjectWizard({ settings, onStart, onCancel }: Props) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function prepare(paths: string[]) {
    const unique = [...new Set(paths.filter(Boolean))];
    if (!unique.length) return;
    setBusy(true);
    setError('');
    try {
      if (project) {
        const imported = await window.masterpiece.projects.importFiles(project.id, unique, 'assets');
        setSummary(imported.summary);
        setProject(await window.masterpiece.projects.get(project.id));
      } else {
        const created = await window.masterpiece.projects.create({ sourcePaths: unique });
        setProject(created);
        setSummary(await window.masterpiece.projects.scanAssets(created.id));
      }
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function chooseFiles() {
    await prepare(await window.masterpiece.projects.chooseFiles('assets'));
  }

  async function chooseFolder() {
    await prepare(await window.masterpiece.projects.chooseFolder());
  }

  function addDropped(fileList: FileList | null) {
    if (!fileList) return;
    void prepare(Array.from(fileList).map((file) => window.masterpiece.files.getPathForFile(file)));
  }

  async function cancel() {
    if (project) await window.masterpiece.projects.remove(project.id).catch(() => {});
    onCancel();
  }

  const ready = Boolean(project && summary?.totalFiles && settings.hasApiKey && settings.baseUrl && settings.model);

  return <div className="page wizard-page minimal-intake-page">
    <header className="page-header">
      <div><p className="eyebrow">NEW ANALYSIS</p><h1>导入视觉方案</h1><p>上传素材后，系统自动生成项目名称并识别品牌与行业线索。</p></div>
      <button className="button ghost" onClick={() => void cancel()}>取消</button>
    </header>

    <section className="panel intake-panel">
      <div
        className={`drop-zone intake-drop-zone ${busy ? 'busy' : ''}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); addDropped(event.dataTransfer.files); }}
      >
        <div className="upload-orbit">↥</div>
        <strong>{busy ? '正在读取与整理素材…' : '将 ZIP、图片、PDF 或文件夹拖到这里'}</strong>
        <p>支持 ZIP、JPG、JPEG、PNG、WEBP、PDF，可多选</p>
        <div className="button-row">
          <button className="button secondary" type="button" disabled={busy} onClick={() => void chooseFiles()}>选择文件</button>
          <button className="button ghost" type="button" disabled={busy} onClick={() => void chooseFolder()}>选择文件夹</button>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}

      {project && summary && <div className="intake-result">
        <div className="intake-heading">
          <div><small>自动项目名称</small><h2>{project.projectName}</h2></div>
          <span className="badge ready">素材已就绪</span>
        </div>
        <div className="intake-metrics">
          <div><small>文件</small><strong>{summary.totalFiles}</strong></div>
          <div><small>图片</small><strong>{summary.imageCount}</strong></div>
          <div><small>PDF</small><strong>{summary.pdfCount}</strong></div>
          <div><small>总大小</small><strong>{formatBytes(summary.totalBytes)}</strong></div>
          <div><small>Logo 线索</small><strong>{summary.logoDetected ? '已识别' : '默认锁定'}</strong></div>
        </div>
        {summary.items.length > 0 && <div className="intake-thumbnails">
          {summary.items.slice(0, 12).map((item) => <div className="asset-card" key={item.relativePath}>
            {item.thumbnailDataUrl
              ? <img src={item.thumbnailDataUrl} alt="" />
              : <div className={`file-placeholder ${item.kind}`}>{item.extension.replace('.', '').toUpperCase()}</div>}
            <strong title={item.relativePath}>{item.name}</strong>
          </div>)}
        </div>}
        <div className="auto-facts-note">
          <div><small>品牌线索</small><strong>{project.detectedBrandName}</strong><span>置信度 {Math.round(project.factConfidence.brandName * 100)}%</span></div>
          <div><small>行业线索</small><strong>{project.detectedIndustry}</strong><span>置信度 {Math.round(project.factConfidence.industry * 100)}%</span></div>
          <p>以上内容由素材自动识别；不确定信息将在报告中标记为“基于现有素材推断”或“待确认”。原始 Logo 默认锁定，固定输出简体中文。</p>
        </div>
      </div>}
    </section>

    <footer className="intake-footer">
      <div className="readonly-model"><small>当前模型</small><strong>{settings.model || '尚未配置'}</strong><span>{settings.provider} · {settings.connectionStatus === 'connected' ? '连接正常' : '连接未确认'}</span></div>
      <div className="button-row"><button className="button ghost" onClick={() => void cancel()}>取消</button><button className="button primary large" disabled={!ready || busy} onClick={() => project && onStart(project)}>开始分析</button></div>
    </footer>
    {!settings.hasApiKey && <p className="inline-warning intake-warning">请先在全局设置中保存 API Key。</p>}
  </div>;
}
