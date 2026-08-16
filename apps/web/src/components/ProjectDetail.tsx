import { useMemo } from 'react';
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

  const checks = useMemo(() => [
    { pass: Boolean(assets?.totalFiles), label: '项目素材不为空' },
    { pass: true, label: '真实项目名将在同次视觉分析中确认' },
    { pass: true, label: '原始 Logo 默认锁定' },
    { pass: true, label: '固定输出简体中文' },
    { pass: Boolean(selectedProfile?.hasApiKey), label: 'API Key 已安全保存' },
    { pass: Boolean(selectedProfile?.baseUrl && selectedProfile.modelId), label: selectedProfile?.modelId || '模型未配置' },
  ], [assets?.totalFiles, selectedProfile]);

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
      actions={
        project.lastReportFilename ? (
          <Button variant="secondary" onClick={onGoReport}>查看报告</Button>
        ) : undefined
      }
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

          {batches.length > 1 && (
            <div className="project-v2__batches">
              <small>导入批次</small>
              {batches.map(([batchId, batch]) => (
                <button key={batchId} onClick={() => onRemoveBatch(batchId, batch.label)}>
                  {batch.label} · {batch.count} 个 ×
                </button>
              ))}
            </div>
          )}

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
                <h2>运行前检查</h2>
                <p>选择本次分析使用的配置</p>
              </div>
            </div>

            <label className="ui-field">
              <span className="ui-field__label">分析模型</span>
              <select
                className="ui-select"
                value={selectedApiProfileId}
                onChange={(event) => onSelectApiProfile(event.target.value)}
              >
                {!analysisProfiles.length && <option value="">尚无可用分析配置</option>}
                {analysisProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName} / {profile.provider} / {profile.modelId}
                  </option>
                ))}
              </select>
            </label>

            <ul className="project-v2__checks">
              {checks.map((check, i) => (
                <li key={i} className={check.pass ? 'is-pass' : 'is-warn'}>
                  <span className="project-v2__check-marker">{check.pass ? '✓' : '!'}</span>
                  {check.label}
                </li>
              ))}
            </ul>

            <div className="project-v2__facts">
              <small>当前导入线索</small>
              <p>项目：{project.detectedProjectName}（{Math.round(project.projectNameConfidence * 100)}%）</p>
              <p>行业：{project.detectedIndustry}（{Math.round(project.factConfidence.industry * 100)}%）</p>
              <p className="project-v2__facts-hint">通用文件名不会成为最终报告名称。</p>
            </div>

            <div className="project-v2__mode-card">
              <small>默认分析模式</small>
              <strong>融合增强</strong>
              <p>一次多模态调用，强化事实判断、真实触点、材料与工艺。</p>
            </div>

            <div className="project-v2__cta-stack">
              <Button variant="primary" fullWidth disabled={!canAnalyze} onClick={() => onRun(true)}>
                开始分析
              </Button>
              <Button variant="ghost" fullWidth disabled={!project.lastReportFilename || !canAnalyze} onClick={() => onRun(false)}>
                使用精确缓存
              </Button>
              {generationReadiness?.ready && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={onGoCreative}
                  title={generationReadiness.vnextSchemaVersion
                    ? `Project Visual Context ${generationReadiness.vnextSchemaVersion} 已就绪`
                    : 'Project Context 已就绪'}
                >
                  继续创作 / 直接创作
                </Button>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ContextIntegrationPanel
        projectId={project.id}
        projectName={project.projectName}
        onOpenReference={onOpenReference}
      />
    </PageShell>
  );
}
