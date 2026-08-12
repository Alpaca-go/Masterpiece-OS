import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectVisualContext, ProjectVisualContextShortChain } from '../shared/types.ts';
import type { ProjectStore } from './project-store.ts';
import {
  compileProjectVisualContext,
  writeProjectVisualContext,
  readProjectVisualContextFile,
  ProjectVisualContextError,
  PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION
} from './project-visual-context-compiler.ts';
import {
  buildProjectVisualContext,
  migrateProjectVisualContext,
  validateProjectVisualContext,
  writeProjectVisualContext as writeStructuredProjectVisualContext,
} from './project-visual-context-builder.ts';

export const PROJECT_VISUAL_CONTEXT_FILENAME = 'project-visual-context.json';
export const PROJECT_VISUAL_CONTEXT_VNEXT_FILENAME = 'project-visual-context.vnext.json';

export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface ProjectContextServiceDeps {
  projects: ProjectStore;
  showSaveDialog?: (defaultPath: string) => Promise<SaveDialogResult | null>;
}

export class ProjectContextNotReadyError extends Error {
  code = 'PROJECT_VISUAL_CONTEXT_SOURCE_MISSING';
  constructor(message: string) {
    super(message);
    this.name = 'ProjectContextNotReadyError';
  }
}

export function createProjectContextService(deps: ProjectContextServiceDeps) {
  const { projects } = deps;

  function contextTarget(outputsDir: string): string {
    return path.join(outputsDir, PROJECT_VISUAL_CONTEXT_FILENAME);
  }

  function contextShortChainTarget(projectRoot: string): string {
    return path.join(projectRoot, 'project-context', PROJECT_VISUAL_CONTEXT_VNEXT_FILENAME);
  }

  async function get(projectId: string): Promise<ProjectVisualContext> {
    const project = await projects.get(projectId);
    if (project.visualContextStatus !== 'ready' || !project.visualContextFilename) {
      throw new ProjectContextNotReadyError('项目视觉上下文尚未生成或已失败');
    }
    const paths = await projects.paths(projectId);
    return readProjectVisualContextFile(path.join(paths.outputs, project.visualContextFilename));
  }

  async function rebuild(projectId: string): Promise<ProjectVisualContext> {
    const project = await projects.get(projectId);
    if (!project.lastReportFilename) {
      throw new ProjectContextNotReadyError('项目尚未生成报告，无法编译视觉上下文');
    }

    const paths = await projects.paths(projectId);
    const reportPath = path.join(paths.outputs, project.lastReportFilename);
    const runtimeReportPath = path.join(paths.runtime, 'run-report.json');

    let reportMarkdown: string;
    try {
      reportMarkdown = await fs.readFile(reportPath, 'utf8');
    } catch {
      await projects
        .update(projectId, {
          visualContextStatus: 'failed',
          visualContextLastBuiltAt: new Date().toISOString()
        })
        .catch(() => undefined);
      throw new ProjectContextNotReadyError('报告文件读取失败');
    }

    let runtimeReport: Record<string, unknown> = {};
    try {
      runtimeReport = JSON.parse(await fs.readFile(runtimeReportPath, 'utf8')) as Record<string, unknown>;
    } catch {
      runtimeReport = {};
    }

    const provider =
      typeof runtimeReport.provider === 'string' && runtimeReport.provider
        ? runtimeReport.provider
        : project.provider;
    const model =
      typeof runtimeReport.model === 'string' && runtimeReport.model
        ? runtimeReport.model
        : project.model;
    const sourceRunId =
      typeof runtimeReport.runId === 'string' && runtimeReport.runId
        ? runtimeReport.runId
        : project.id;

    const context = compileProjectVisualContext({
      project,
      sourceRunId,
      reportMarkdown,
      reportPath,
      runtimeReportPath,
      assetCount: project.assetCount ?? 0,
      imageCount: project.imageCount ?? 0,
      provider,
      model
    });

    const target = contextTarget(paths.outputs);
    try {
      await writeProjectVisualContext(target, context);
      await projects.update(projectId, {
        visualContextFilename: PROJECT_VISUAL_CONTEXT_FILENAME,
        visualContextStatus: 'ready',
        visualContextSchemaVersion: PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION,
        visualContextLastBuiltAt: context.generatedAt
      });
    } catch (error) {
      await projects
        .update(projectId, {
          visualContextStatus: 'failed',
          visualContextLastBuiltAt: new Date().toISOString()
        })
        .catch(() => undefined);
      if (error instanceof ProjectVisualContextError) throw error;
      throw new ProjectVisualContextError(
        'PROJECT_VISUAL_CONTEXT_WRITE_FAILED',
        error instanceof Error ? error.message : String(error)
      );
    }
    return context;
  }

  async function getShortChain(projectId: string): Promise<ProjectVisualContextShortChain> {
    const project = await projects.get(projectId);
    if (project.visualContextVNextStatus !== 'ready' || !project.visualContextVNextFilename) {
      throw new ProjectContextNotReadyError('Project Visual Context is not ready');
    }
    const paths = await projects.paths(projectId);
    const filename = path.basename(project.visualContextVNextFilename);
    const value = JSON.parse(
      await fs.readFile(path.join(paths.root, 'project-context', filename), 'utf8'),
    ) as ProjectVisualContextShortChain;
    const validation = validateProjectVisualContext(value);
    if (!validation.valid) {
      throw new ProjectContextNotReadyError(`Project Visual Context is invalid: ${validation.errors.join('; ')}`);
    }
    return migrateProjectVisualContext(value);
  }

  // r2.0 / r10.4 UX: unified predicate that decides whether the
  // *persisted* project state has the minimum data needed to start a
  // vnext image generation, without going through the full LLM
  // analysis report page. Mirrors the failure conditions of
  // `getShortChain` (which is what `vnext-service.compile` calls), plus
  // the legacy visual context sanity check that the vnext context
  // is built on top of. The predicate is the single source of
  // truth for "can the user click 直接创作 / 继续创作 on the project
  // page?" — the renderer asks this question and only shows the
  // entry when ready.
  //
  // IMPORTANT: this is about data readiness, not about whether the
  // analysis report exists. The full LLM report is no longer a
  // hard product gate for entering image generation; the
  // Project Context is. `reasons` lists every missing field so
  // the UI can surface a precise "what's blocking" message instead
  // of forcing the user to start a fresh analysis blind.
  async function getGenerationContextReadiness(projectId: string): Promise<{
    ready: boolean;
    reasons: string[];
    vnextSchemaVersion: number | null;
    vnextBuiltAt: string | null;
  }> {
    const reasons: string[] = [];
    const project = await projects.get(projectId).catch(() => null);
    if (!project) {
      return { ready: false, reasons: ['项目记录不存在'], vnextSchemaVersion: null, vnextBuiltAt: null };
    }
    // Legacy visual context is the source the vnext context is
    // built from. If it never reached `ready`, the vnext context
    // also cannot exist.
    if (project.visualContextStatus !== 'ready') {
      reasons.push('视觉上下文尚未生成或已失败');
    }
    if (!project.visualContextSchemaVersion) {
      reasons.push('视觉上下文 schema 版本缺失');
    }
    // vNext context — the actual data shape the vnext service
    // consumes. All three conditions must hold:
    //   1) status is `ready`
    //   2) filename is recorded
    //   3) the file exists, is parseable, and passes
    //      `validateProjectVisualContext` (this is the same
    //      check `getShortChain` performs before handing the context to
    //      the compiler; mirroring it here means "if this returns
    //      ready=true, then `vnext-service.compile` will not throw
    //      ProjectContextNotReadyError on the way in").
    if (project.visualContextVNextStatus !== 'ready') {
      reasons.push('Project Visual Context 尚未生成或已失败');
    }
    if (!project.visualContextVNextFilename) {
      reasons.push('Project Visual Context 文件名缺失');
    }
    if (project.visualContextVNextStatus === 'ready' && project.visualContextVNextFilename) {
      const paths = await projects.paths(projectId).catch(() => null);
      if (!paths) {
        reasons.push('项目目录不可访问');
      } else {
        const filename = path.basename(project.visualContextVNextFilename);
        const target = path.join(paths.root, 'project-context', filename);
        try {
          const raw = await fs.readFile(target, 'utf8');
          const value = JSON.parse(raw) as unknown;
          const validation = validateProjectVisualContext(value);
          if (!validation.valid) {
            reasons.push(`Project Visual Context 文件校验失败：${validation.errors.join('; ')}`);
          }
        } catch (error) {
          reasons.push(
            `Project Visual Context 文件不可读：${(error as Error).message || '未知错误'}`,
          );
        }
      }
    }
    return {
      ready: reasons.length === 0,
      reasons,
      vnextSchemaVersion: project.visualContextVNextVersion ?? null,
      vnextBuiltAt: project.visualContextVNextLastBuiltAt ?? null,
    };
  }

  async function rebuildShortChain(projectId: string): Promise<ProjectVisualContextShortChain> {
    const project = await projects.get(projectId);
    const paths = await projects.paths(projectId);
    const previousContext = await getShortChain(projectId).catch(() => null);
    const context = buildProjectVisualContext({
      project,
      previousContext,
    });
    try {
      await writeStructuredProjectVisualContext(contextShortChainTarget(paths.root), context);
      await projects.update(projectId, {
        visualContextVNextFilename: PROJECT_VISUAL_CONTEXT_VNEXT_FILENAME,
        visualContextVNextStatus: 'ready',
        visualContextVNextVersion: context.version,
        visualContextVNextLastBuiltAt: context.generatedAt,
      });
    } catch (error) {
      await projects.update(projectId, {
        visualContextVNextStatus: 'failed',
        visualContextVNextLastBuiltAt: new Date().toISOString(),
      }).catch(() => undefined);
      throw error;
    }
    return context;
  }

  async function exportContext(projectId: string): Promise<string | null> {
    const context = await get(projectId);
    if (!deps.showSaveDialog) throw new Error('未配置导出对话框');
    const paths = await projects.paths(projectId);
    const source = path.join(paths.outputs, PROJECT_VISUAL_CONTEXT_FILENAME);
    await fs.access(source);
    const result = await deps.showSaveDialog(PROJECT_VISUAL_CONTEXT_FILENAME);
    if (!result || result.canceled || !result.filePath) return null;
    await fs.copyFile(source, result.filePath);
    return result.filePath;
  }

  return { get, rebuild, export: exportContext, getShortChain, rebuildShortChain, getGenerationContextReadiness };
}

export type ProjectContextService = ReturnType<typeof createProjectContextService>;
