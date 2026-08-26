import type {
  AssetSummary,
  GenerationContextReadiness,
  ProjectRecord,
  PublicSettings,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { formatBytes } from '../utils';
import { ContextIntegrationPanel } from './ContextIntegrationPanel';
import { PageShell } from './PageShell';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface ApiProfileLite {
  id: string;
  displayName: string;
  provider: string;
  modelId: string;
  hasApiKey: boolean;
  baseUrl?: string;
  isDefault?: boolean;
  isEnabled?: boolean;
}

interface Props {
  project: ProjectRecord;
  settings: PublicSettings;
  assets: AssetSummary | null;
  analysisProfiles: ApiProfileLite[];
  selectedProfile?: ApiProfileLite;
  selectedApiProfileId: string;
  generationReadiness: GenerationContextReadiness | null;
  batches: Array<[string, { label: string; count: number }]>;
  error: string;
  onSelectApiProfile(id: string): void;
  onImportMore(kind: 'assets'): void;
  onClearAssets(): void;
  onRemoveBatch(batchId: string, label: string): void;
  onRemoveAsset(id: string): void;
  onRun(force: boolean): void;
  onGoHome(): void;
  onGoReport(): void;
  onGoCreative(): void;
  onOpenReference(): void;
}

function projectStatusTone(status: ProjectRecord['status']): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'running') return 'primary';
  if (status === 'ready') return 'info' as 'primary';
  return 'default';
}

function projectStatusLabel(status: ProjectRecord['status']): string {
  const labels: Record<ProjectRecord['status'], string> = {
    draft: '待导入', ready: '可分析', running: '分析中',
    completed: '已完成', failed: '失败', cancelled: '已取消'
  };
  return labels[status];
}

export function ProjectDetail({
  project, assets, analysisProfiles, selectedProfile, selectedApiProfileId,
  generationReadiness, batches, error,
  onSelectApiProfile, onImportMore, onClearAssets, onRemoveBatch, onRemoveAsset,
  onRun, onGoHome, onGoReport, onGoCreative, onOpenReference,
}: Props) {
  const canAnalyze = Boolean(assets?.totalFiles && selectedProfile?.hasApiKey && selectedProfile.baseUrl && selectedProfile.modelId);

  return (
    <PageShell
      eyebrow="PROJECT WORKSPACE"
      title={project.projectName}
      subtitle={
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span>{project.brandName} · {project.industry}</span>
          <Badge tone={projectStatusTone(project.status)} size="sm">{projectStatusLabel(project.status)}</Badge>
        </span>
      }
      onBack={onGoHome}
      backLabel="返回首页"
    >
      {error && (
        <div className={`notice ${/忽略/.test(error) ? 'ok' : 'error'}`} style={{ marginBottom: 'var(--space-6)' }}>
          {error}
        </div>
      )}

      <div className="project-v2__grid">
        {/* ── Left: Assets ── */}
        <section className="project-v2__panel">
          <div className="project-v2__section-head">
            <div>
              <span className="project-v2__section-num">01</span>
              <h2>视觉素材</h2>
              <p>{assets?.totalFiles ?? project.assetCount} 个文件 · {assets ? formatBytes(assets.totalBytes) : '正在读取'}</p>
            </div>
            <div className="project-v2__section-actions">
              <Button variant="text" size="sm" onClick={() => onImportMore('assets')}>+ 添加素材</Button>
              <Button variant="ghost" size="sm" disabled={!assets?.totalFiles} onClick={onClearAssets}>清空</Button>
            </div>
          </div>

          {batches.length > 1 && <details className="ux-advanced project-v2__batch-details">
            <summary>管理 {batches.length} 个导入批次</summary>
            <div className="project-v2__batches">
              {batches.map(([batchId, batch]) => <button key={batchId} onClick={() => onRemoveBatch(batchId, batch.label)}>{batch.label} · {batch.count} 个 ×</button>)}
            </div>
          </details>}

          {assets?.items.length ? (
            <div className="project-v2__assets">
              {assets.items.map((item) => (
                <div className="project-v2__asset" key={item.id}>
                  <button
                    className="project-v2__asset-remove"
                    title={`删除 ${item.name}`}
                    aria-label={`删除 ${item.name}`}
                    onClick={() => onRemoveAsset(item.id)}
                  >×</button>
                  {item.thumbnailDataUrl ? (
                    <img src={item.thumbnailDataUrl} alt="" />
                  ) : (
                    <div className={`file-placeholder ${item.kind}`}>
                      {item.extension.replace('.', '').toUpperCase()}
                    </div>
                  )}
                  <strong title={item.relativePath}>{item.name}</strong>
                  <small>{formatBytes(item.bytes)}</small>
                  {item.warning && <em>{item.warning}</em>}
                </div>
              ))}
            </div>
          ) : (
            <div className="project-v2__empty">
              <strong>尚未导入素材</strong>
              <p>支持 ZIP、JPG、JPEG、PNG、WEBP 和 PDF。</p>
              <Button variant="secondary" onClick={() => onImportMore('assets')}>选择视觉方案</Button>
            </div>
          )}
        </section>

        {/* ── Right: Pre-flight & actions ── */}
        <aside className="project-v2__sidebar">
          <div className="project-v2__panel">
            <div className="project-v2__section-head">
              <div>
                <span className="project-v2__section-num">02</span>
                <h2>下一步</h2>
                <p>{project.lastReportFilename ? '查看结论或继续创作' : '素材准备好后即可开始分析'}</p>
              </div>
            </div>

            {!canAnalyze && <div className="notice warn">{!assets?.totalFiles ? '请先添加视觉素材。' : '分析服务尚未配置完整，请前往设置。'}</div>}

            <div className="project-v2__facts">
              <small>当前导入线索</small>
              <p>项目：{project.detectedProjectName}</p>
              <p>行业：{project.detectedIndustry}</p>
              <p className="project-v2__facts-hint">系统会在分析中核对这些线索。</p>
            </div>

            <div className="project-v2__cta-stack">
              {generationReadiness?.ready && (
                <Button
                  variant="primary"
                  fullWidth
                  onClick={onGoCreative}
                  title={generationReadiness.vnextSchemaVersion
                    ? `Project Visual Context ${generationReadiness.vnextSchemaVersion} 已就绪`
                    : 'Project Context 已就绪'}
                >
                  继续创作
                </Button>
              )}
              {project.lastReportFilename
                ? <Button variant="secondary" fullWidth onClick={onGoReport}>查看分析报告</Button>
                : <Button variant="primary" fullWidth disabled={!canAnalyze} onClick={() => onRun(true)}>开始分析</Button>}
            </div>

            <details className="ux-advanced">
              <summary>高级分析设置</summary>
              <label className="ui-field">
                <span className="ui-field__label">分析配置</span>
                <select className="ui-select" value={selectedApiProfileId} onChange={(event) => onSelectApiProfile(event.target.value)}>
                  {!analysisProfiles.length && <option value="">尚无可用分析配置</option>}
                  {analysisProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}
                </select>
              </label>
              {project.lastReportFilename && <div className="button-row">
                <Button variant="ghost" size="sm" disabled={!canAnalyze} onClick={() => onRun(true)}>重新分析全部素材</Button>
                <Button variant="ghost" size="sm" disabled={!canAnalyze} onClick={() => onRun(false)}>复用已有结果重跑</Button>
              </div>}
            </details>
          </div>
        </aside>
      </div>

      <details className="ux-advanced project-v2__context-details">
        <summary>高级：文档关联与上下文冲突处理</summary>
        <ContextIntegrationPanel projectId={project.id} projectName={project.projectName} onOpenReference={onOpenReference} />
      </details>
    </PageShell>
  );
}
