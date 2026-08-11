import fs from 'node:fs/promises';
import path from 'node:path';
import { assertInside, sanitizeFilenamePart } from './analysis-contract.ts';
import type { ProjectStore } from './project-store.ts';

export function createReportService(projects: ProjectStore) {
  return Object.freeze({
    async read(projectId: string): Promise<string> {
      const project = await projects.get(projectId);
      if (!project.lastReportFilename) throw new Error('项目尚未生成报告');
      const paths = await projects.paths(projectId);
      return fs.readFile(assertInside(paths.outputs, path.join(paths.outputs, project.lastReportFilename)), 'utf8');
    },
    async rename(projectId: string, requestedFilename: string) {
      const project = await projects.get(projectId);
      if (!project.lastReportFilename) throw new Error('项目尚未生成报告');
      const base = sanitizeFilenamePart(path.parse(String(requestedFilename || '')).name);
      if (!base || base === '未命名') throw new Error('报告文件名不能为空');
      const filename = `${base}.md`;
      if (filename === project.lastReportFilename) return project;
      const paths = await projects.paths(projectId);
      const source = assertInside(paths.outputs, path.join(paths.outputs, project.lastReportFilename));
      const destination = assertInside(paths.outputs, path.join(paths.outputs, filename));
      if (await fs.stat(destination).then(() => true).catch(() => false)) throw new Error('输出目录中已存在同名报告');
      await fs.rename(source, destination);
      return projects.update(projectId, { lastReportFilename: filename });
    },
  });
}

export type ReportService = ReturnType<typeof createReportService>;
