import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { assertInside } from '@masterpiece/runtime-core/application/analysis-contract.ts';
import type { RuntimeServices } from '@masterpiece/runtime-core/application/runtime-services.ts';
import type { NodeRuntimePaths } from './runtime-paths.ts';

function configuredPaths(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw.split(path.delimiter).map((value) => value.trim()).filter(Boolean);
  }
}

export async function openNodePath(targetPath: string): Promise<void> {
  if (process.env.MASTERPIECE_WEB_OPEN_PATH === '0') return;
  const [command, args] = process.platform === 'win32'
    ? ['explorer.exe', [targetPath]]
    : process.platform === 'darwin' ? ['open', [targetPath]] : ['xdg-open', [targetPath]];
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

async function exportFile(source: string, filename: string, runtimePaths: NodeRuntimePaths): Promise<string> {
  const exportRoot = path.resolve(process.env.MASTERPIECE_WEB_EXPORT_DIR || path.join(runtimePaths.userData, 'exports'));
  await fs.mkdir(exportRoot, { recursive: true });
  const destination = assertInside(exportRoot, path.join(exportRoot, filename));
  await fs.copyFile(source, destination);
  return destination;
}

export function createNodeNativeOperations(services: RuntimeServices, runtimePaths: NodeRuntimePaths) {
  const { projects, documentContext, referenceAnchor, imageGeneration } = services;
  return Object.freeze({
    'projects:choose-files': () => configuredPaths('MASTERPIECE_WEB_SELECTED_FILES'),
    'projects:choose-folder': () => configuredPaths('MASTERPIECE_WEB_SELECTED_FOLDERS'),
    'report:export': async (_context: unknown, projectId: string) => {
      const project = await projects.get(projectId);
      if (!project.lastReportFilename) throw new Error('项目尚未生成报告');
      const paths = await projects.paths(projectId);
      const source = assertInside(paths.outputs, path.join(paths.outputs, project.lastReportFilename));
      return exportFile(source, project.lastReportFilename, runtimePaths);
    },
    'report:open-folder': async (_context: unknown, projectId: string) => openNodePath((await projects.paths(projectId)).outputs),
    'document-context:choose-documents': () => configuredPaths('MASTERPIECE_WEB_SELECTED_DOCUMENTS'),
    'document-context:export': async (_context: unknown, runId: string) => {
      const source = await documentContext.briefPath(runId);
      return exportFile(source, path.basename(source), runtimePaths);
    },
    'document-context:open-folder': async (_context: unknown, runId: string) => openNodePath(path.join(await documentContext.runRoot(runId), 'outputs')),
    'reference-anchor:choose-reference-assets': () => configuredPaths('MASTERPIECE_WEB_SELECTED_REFERENCES'),
    'reference-anchor:export': async (_context: unknown, runId: string) => {
      const source = await referenceAnchor.briefPath(runId);
      return exportFile(source, path.basename(source), runtimePaths);
    },
    'reference-anchor:open-folder': async (_context: unknown, runId: string) => openNodePath(path.join(await referenceAnchor.runRoot(runId), 'outputs')),
    'image-generation:open-folder': async (_context: unknown, runId: string) => imageGeneration.openFolder(runId),
  });
}
