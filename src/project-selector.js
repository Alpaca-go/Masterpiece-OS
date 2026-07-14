import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_PROJECTS_ROOT, getProjectPaths, validateProjectName } from './project-paths.js';

const SYSTEM_NAMES = new Set(['.gitkeep', '.DS_Store', 'Thumbs.db', 'desktop.ini']);

export async function listProjects(projectsRoot = DEFAULT_PROJECTS_ROOT) {
  const root = path.resolve(projectsRoot);
  await fs.mkdir(root, { recursive: true });
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !SYSTEM_NAMES.has(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export async function selectProject(options = {}) {
  const projectsRoot = path.resolve(options.projectsRoot || DEFAULT_PROJECTS_ROOT);
  const projects = await listProjects(projectsRoot);
  if (options.projectName) {
    const projectName = validateProjectName(options.projectName);
    if (!projects.includes(projectName)) {
      throw new Error(`项目不存在：${projectName}\n可用项目：${projects.length ? projects.join('、') : '无'}`);
    }
    return getProjectPaths(projectName, { projectsRoot });
  }
  if (projects.length === 0) throw new Error(`projects/ 中没有项目。请先将已命名的项目文件夹放入：${projectsRoot}`);
  if (projects.length > 1) {
    throw new Error(`检测到多个项目，必须使用 --project 指定：\n${projects.map((name) => `- ${name}`).join('\n')}`);
  }
  return getProjectPaths(projects[0], { projectsRoot });
}
