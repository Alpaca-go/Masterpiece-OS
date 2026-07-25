import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectVisualContext } from '../shared/types';
import type { ProjectStore } from './project-store';
import {
  compileProjectVisualContext,
  writeProjectVisualContext,
  readProjectVisualContextFile,
  ProjectVisualContextError,
  PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION
} from './project-visual-context-compiler';

export const PROJECT_VISUAL_CONTEXT_FILENAME = 'project-visual-context.json';

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

  return { get, rebuild, export: exportContext };
}

export type ProjectContextService = ReturnType<typeof createProjectContextService>;
