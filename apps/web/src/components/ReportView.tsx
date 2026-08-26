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

function extractDecisionSummary(markdown: string): string {
  const section = markdown.match(/(?:^|\n)##\s+5\.[^\n]*\n([\s\S]*?)(?=\n##\s|$)/)?.[1] ?? '';
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, '').replace(/^\[[^\]]+\]\s*/, '').trim())
    .filter(Boolean);
  return lines.slice(0, 3).join(' ') || '视觉分析已经完成。请先查看关键结论，再决定是否继续创作或展开完整报告。';
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
    >
      {/* Summary metrics card */}
      <div className="report-v2__metrics">
        <div className="report-metric">
          <small>状态</small>
          <strong>分析完成</strong>
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
          <small>推荐下一步</small>
          <strong>继续创作</strong>
        </div>
      </div>

      {notice && (
        <div className={`notice ${/失败|不能为空|存在/.test(notice) ? 'error' : 'ok'}`}>
          {notice}
        </div>
      )}

      {/* Primary actions */}
      <div className="report-v2__actions">
        <Button
          variant="primary"
          disabled={contextStatus !== 'ready'}
          onClick={onGenerateVisual}
        >
          根据分析继续创作
        </Button>
        <Button variant="secondary" onClick={() => void exportReport()}>导出报告</Button>
        <Button variant="ghost" onClick={() => void copy()}>复制内容</Button>
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
        <p className="report-v2__context-copy">继续创作时会自动读取已确认的视觉结论，无需手动处理上下文文件。</p>
        {contextNotice && (
          <div className={`notice ${/失败|不能为空|存在/.test(contextNotice) ? 'error' : 'ok'}`}>
            {contextNotice}
          </div>
        )}
      </section>

      <details className="ux-advanced report-v2__advanced">
        <summary>高级操作与诊断</summary>
        <div className="report-v2__filename">
          <label className="ui-field">
            <span className="ui-field__label">导出文件名</span>
            <input className="ui-input" value={filename} onChange={(event) => setFilename(event.target.value)} />
          </label>
          <Button variant="secondary" onClick={() => void renameReport()}>更新文件名</Button>
        </div>
        <div className="report-v2__context-actions">
          <Button variant="secondary" size="sm" onClick={() => void viewContextJson()}>查看上下文数据</Button>
          <Button variant="secondary" size="sm" onClick={() => void exportContextJson()}>导出上下文数据</Button>
          <Button variant="secondary" size="sm" onClick={() => void rebuildContext()}>重新生成上下文</Button>
          <Button variant="ghost" size="sm" onClick={() => void window.masterpiece.report.openFolder(project.id)}>打开输出文件夹</Button>
          <Button variant="ghost" size="sm" onClick={() => onRerun(true)}>重新分析全部素材</Button>
          <Button variant="ghost" size="sm" onClick={() => onRerun(false)}>复用已有结果重跑</Button>
        </div>
        {showContextJson && context && <pre className="report-v2__json">{JSON.stringify(context, null, 2)}</pre>}
      </details>

      <section className="report-v2__decision-summary">
        <span className="page-shell-v2__eyebrow">KEY DECISION</span>
        <h2>关键升级判断</h2>
        <p>{extractDecisionSummary(markdown)}</p>
      </section>

      <details className="ux-advanced report-v2__full-report">
        <summary>查看完整分析报告与证据</summary>
        <article className="markdown-preview report-v2__markdown" dangerouslySetInnerHTML={{ __html: html }} />
      </details>
    </PageShell>
  );
}
