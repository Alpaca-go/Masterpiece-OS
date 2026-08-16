import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useEffect, useState } from 'react';
import type { ProjectRecord, ProjectVisualContext } from '@masterpiece/runtime-core/application-contracts.ts';
import { cleanError, formatDurationHuman } from '../utils';
import { PageShell } from './PageShell';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface Props {
  project: ProjectRecord;
  onBack(): void;
  onRerun(force: boolean): void;
  onGenerateVisual(): void;
}

export function ReportView({ project, onBack, onRerun, onGenerateVisual }: Props) {
  const [markdown, setMarkdown] = useState('');
  const [html, setHtml] = useState('');
  const [filename, setFilename] = useState(project.lastReportFilename || '');
  const [notice, setNotice] = useState('');
  const [context, setContext] = useState<ProjectVisualContext | null>(null);
  const [showContextJson, setShowContextJson] = useState(false);
  const [contextNotice, setContextNotice] = useState('');

  useEffect(() => {
    void window.masterpiece.report.read(project.id).then(setMarkdown).catch((error) => setNotice(cleanError(error)));
  }, [project.id]);

  useEffect(() => {
    setContext(null);
    setShowContextJson(false);
    setContextNotice('');
    void window.masterpiece.projectContext
      .get(project.id)
      .then(setContext)
      .catch(() => setContext(null));
  }, [project.id, project.visualContextStatus]);

  useEffect(() => {
    void Promise.resolve(marked.parse(markdown)).then((value) => setHtml(DOMPurify.sanitize(value)));
  }, [markdown]);

  async function copy() {
    await navigator.clipboard.writeText(markdown);
    setNotice('报告内容已复制。');
  }

  async function exportReport() {
    try {
      if (filename !== project.lastReportFilename) {
        const updated = await window.masterpiece.report.rename(project.id, filename);
        setFilename(updated.lastReportFilename || filename);
      }
      const saved = await window.masterpiece.report.export(project.id);
      if (saved) setNotice(`已导出：${saved}`);
    } catch (error) { setNotice(cleanError(error)); }
  }

  async function renameReport() {
    try {
      const updated = await window.masterpiece.report.rename(project.id, filename);
      setFilename(updated.lastReportFilename || filename);
      setNotice('报告文件名已更新。');
    } catch (error) { setNotice(cleanError(error)); }
  }

  const contextStatus = context ? 'ready' : project.visualContextStatus ?? 'missing';
  const contextStatusLabel =
    contextStatus === 'ready' ? '已生成' : contextStatus === 'failed' ? '生成失败' : '尚未生成';
  const contextTone = contextStatus === 'ready' ? 'success' : contextStatus === 'failed' ? 'error' : 'default';

  async function viewContextJson() {
    if (!context) {
      try {
        setContext(await window.masterpiece.projectContext.get(project.id));
      } catch (error) {
        setContextNotice(cleanError(error));
        return;
      }
    }
    setShowContextJson((value) => !value);
  }

  async function exportContextJson() {
    try {
      const saved = await window.masterpiece.projectContext.export(project.id);
      if (saved) setContextNotice(`已导出：${saved}`);
    } catch (error) { setContextNotice(cleanError(error)); }
  }

  async function rebuildContext() {
    try {
      const ctx = await window.masterpiece.projectContext.rebuild(project.id);
      setContext(ctx);
      setShowContextJson(false);
      setContextNotice('已重新编译项目视觉上下文。');
    } catch (error) { setContextNotice(cleanError(error)); }
  }

  return (
    <PageShell
      eyebrow="ANALYSIS COMPLETE"
      title={project.projectName}
      subtitle={filename}
      onBack={onBack}
      backLabel="返回项目"
      actions={
        <Button variant="primary" onClick={() => void exportReport()}>
          导出报告
        </Button>
      }
    >
      {/* Summary metrics card */}
      <div className="report-v2__metrics">
        <div className="report-metric">
          <small>模型</small>
          <strong>{project.model}</strong>
        </div>
        <div className="report-metric">
          <small>耗时</small>
          <strong>{formatDurationHuman(project.lastDurationMs)}</strong>
        </div>
        <div className="report-metric">
          <small>素材</small>
          <strong>{project.assetCount} 个</strong>
        </div>
        <div className="report-metric">
          <small>模式</small>
          <strong>融合增强</strong>
        </div>
      </div>

      {notice && (
        <div className={`notice ${/失败|不能为空|存在/.test(notice) ? 'error' : 'ok'}`}>
          {notice}
        </div>
      )}

      {/* Filename editor */}
      <div className="report-v2__filename">
        <label className="ui-field">
          <span className="ui-field__label">导出文件名</span>
          <input
            className="ui-input"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
          />
        </label>
        <Button variant="secondary" onClick={() => void renameReport()}>更新文件名</Button>
      </div>

      {/* Primary actions */}
      <div className="report-v2__actions">
        <Button variant="secondary" onClick={() => void copy()}>复制内容</Button>
        <Button variant="secondary" onClick={() => void window.masterpiece.report.openFolder(project.id)}>
          打开输出文件夹
        </Button>
        <Button
          variant="primary"
          disabled={contextStatus !== 'ready'}
          onClick={onGenerateVisual}
        >
          根据分析继续创作
        </Button>
      </div>

      {/* Visual Context panel */}
      <section className="report-v2__context">
        <div className="report-v2__context-head">
          <div>
            <span className="page-shell-v2__eyebrow">PROJECT VISUAL CONTEXT</span>
            <h3 className="report-v2__context-title">项目视觉上下文</h3>
          </div>
          <Badge tone={contextTone as 'success' | 'error' | 'default'}>{contextStatusLabel}</Badge>
        </div>
        <div className="report-v2__context-actions">
          <Button variant="secondary" size="sm" onClick={() => void viewContextJson()}>查看 JSON</Button>
          <Button variant="secondary" size="sm" onClick={() => void exportContextJson()}>导出 JSON</Button>
          <Button variant="secondary" size="sm" onClick={() => void rebuildContext()}>重新编译</Button>
          <Button variant="ghost" size="sm" onClick={() => void window.masterpiece.report.openFolder(project.id)}>
            打开输出文件夹
          </Button>
        </div>
        {showContextJson && context && (
          <pre className="report-v2__json">{JSON.stringify(context, null, 2)}</pre>
        )}
        {contextNotice && (
          <div className={`notice ${/失败|不能为空|存在/.test(contextNotice) ? 'error' : 'ok'}`}>
            {contextNotice}
          </div>
        )}
      </section>

      {/* Rerun controls */}
      <div className="report-v2__rerun">
        <Button variant="ghost" size="sm" onClick={() => onRerun(true)}>强制重新分析</Button>
        <Button variant="ghost" size="sm" onClick={() => onRerun(false)}>使用缓存重跑</Button>
      </div>

      {/* Markdown report */}
      <article className="markdown-preview report-v2__markdown" dangerouslySetInnerHTML={{ __html: html }} />
    </PageShell>
  );
}
