import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { readJson, writeJson, assertId, inside } from './configuration.js';
import { parseZip } from './cli/parsers.js';
import { normalizeProjectFacts } from "./runtime/project-facts.js";

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf' };
const timestamp = () => new Date().toISOString();
export function createProjectStore(dataRoot) {
  const root = path.join(dataRoot, 'projects');
  const projectRoot = id => path.join(root, assertId(id));
  async function paths(id) {
    const directory = projectRoot(id);
    await get(id);
    return { root: directory, input: path.join(directory, 'input'), outputs: path.join(directory, 'outputs'), runtime: path.join(directory, 'runtime'), prepared: path.join(directory, 'prepared') };
  }
  async function get(id) {
    const record = await readJson(path.join(projectRoot(id), 'project.json'));
    if (record.id !== id || record.workflowOwner !== 'visual-workflow') throw new Error('VISUAL_WORKFLOW_PROJECT_OWNERSHIP_REQUIRED');
    // Completed analysis is authoritative for identified Logos, including
    // migrated projects whose intake records predate the role field.
    if (record.status === 'completed' && record.visualContextVNextStatus === 'ready') {
      const packet = await readJson(path.join(projectRoot(id), 'project-context/visual-decision-packet.json')).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      const logoIds = new Set((packet?.lockedAssets || []).filter(item => item.type === 'logo').map(item => item.assetId));
      if (logoIds.size) {
        record.assets = record.assets.map(asset => ({ ...asset, role: logoIds.has(asset.id) ? 'logo' : 'visual' }));
        record.logoFiles = record.assets.filter(asset => asset.role === 'logo').map(asset => asset.relativePath);
      }
    }
    return record;
  }
  async function update(id, patch) {
    const value = { ...await get(id), ...patch, id, workflowOwner: 'visual-workflow', updatedAt: timestamp() };
    await writeJson(path.join(projectRoot(id), 'project.json'), value);
    return value;
  }
  async function list() {
    await fs.mkdir(root, { recursive: true });
    const entries = await fs.readdir(root, { withFileTypes: true });
    const projects = [];
    for (const entry of entries) if (entry.isDirectory() && /^[a-f0-9-]{36}$/iu.test(entry.name)) {
      const record = await get(entry.name).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (record) projects.push(record);
    }
    return projects.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async function updateDetails(id, input = {}) {
    const project = await get(id);
    if (project.status === 'running') throw new Error('分析期间不能修改项目资料');
    if (typeof input.expectedUpdatedAt !== 'string' || input.expectedUpdatedAt !== project.updatedAt) throw new Error('项目资料已变化，请重新打开项目后再保存');
    const projectName = typeof input.projectName === 'string' ? input.projectName.trim() : '';
    const industry = typeof input.industry === 'string' ? input.industry.trim() : '';
    if (!projectName || projectName.length > 200 || !industry || industry.length > 200) throw new Error('项目名称和所属行业不能为空，且各不超过 200 字');
    // Facts are analysis inputs too: storing a different set invalidates the
    // existing analysis the same way a name/industry change does.
    const facts = normalizeProjectFacts(input.facts);
    const factsChanged = JSON.stringify(facts) !== JSON.stringify(project.facts || {});
    if (projectName === project.projectName && industry === project.industry && !factsChanged) return project;
    // Identity is an analysis input. Retain historical outputs, but never reuse
    // their context for generation under new project facts.
    return update(id, {projectName,brandName:projectName,industry,facts,projectNameSource:'user_input',projectNameConfidence:1,
      factConfidence:{...project.factConfidence,brandName:1,industry:1},
      status:project.assets.length ? 'ready' : 'draft',visualContextStatus:'missing',visualContextVNextStatus:'missing'});
  }
  async function create(input = {}) {
    const id = crypto.randomUUID();
    const name = String(input.projectName || '未命名视觉项目').trim();
    const now = timestamp();
    const record = { id, workflowOwner: 'visual-workflow', projectName: name, brandName: String(input.brandName || name), detectedProjectName: name, detectedBrandName: String(input.brandName || name), industry: String(input.industry || '待确认'), detectedIndustry: String(input.industry || '待确认'), description: String(input.description || ''), facts: normalizeProjectFacts(input.facts), projectNameSource: 'user_input', projectNameConfidence: 1, factConfidence: {brandName: 1, industry: input.industry ? 1 : 0}, logoLocked: true, logoFiles: [], briefFiles: [], lockedFacts: [], assets: [], assetCount: 0, imageCount: 0, status: 'draft', outputLanguage: 'zh-CN', analysisProfile: 'fusion-enhanced', apiProfileId: input.apiProfileId || null, lastReportFilename: null, visualContextStatus: 'missing', visualContextVNextStatus: 'missing', createdAt: now, updatedAt: now };
    for (const directory of ['input/assets', 'prepared', 'outputs', 'runtime', 'project-context']) await fs.mkdir(path.join(projectRoot(id), directory), { recursive: true });
    await writeJson(path.join(projectRoot(id), 'project.json'), record);
    return record;
  }
  async function importFiles(id, files) {
    const project = await get(id);
    if (project.status === 'running') throw new Error('分析期间不能修改素材');
    const assets = [...project.assets];
    const batchId = crypto.randomUUID();
    let totalBytes = 0;
    async function persist(name, bytes) {
      const ext = path.extname(name).toLowerCase();
      if (!MIME[ext]) return;
      totalBytes += bytes.length;
      if (!bytes.length || bytes.length > 32 * 1024 * 1024 || totalBytes > 256 * 1024 * 1024 || assets.length >= 2000) throw new Error('素材数量或大小超出限制');
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      if (assets.some(asset => asset.sha256 === sha256)) return;
      const assetId = crypto.randomUUID();
      const filename = path.basename(name).replace(/[<>:"/\\|?*\x00-\x1f]/gu, '_');
      const relativePath = `assets/${assetId}-${filename}`;
      await fs.writeFile(inside(path.join(projectRoot(id), 'input'), relativePath), bytes);
      assets.push({ id: assetId, batchId, sourceType: 'file', originalName: filename, relativePath, mimeType: MIME[ext], sizeBytes: bytes.length, sha256, status: 'ready', usage: 'analysis_source', role: /logo|标志|标识/iu.test(filename) ? 'logo' : 'visual', createdAt: timestamp() });
    }
    if (!Array.isArray(files) || !files.length || files.length > 100) throw new Error('请选择要导入的素材');
    for (const file of files) {
      const bytes = Buffer.from(String(file.content || ''), 'base64');
      if (bytes.length !== file.size || !bytes.length || bytes.length > 32 * 1024 * 1024) throw new Error('素材上传数据无效');
      if (path.extname(file.name).toLowerCase() === '.zip') {
        const zip = parseZip(bytes);
        if (zip.entries.length > 2000 || zip.entries.reduce((sum,item) => sum + item.size, 0) > 256 * 1024 * 1024) throw new Error('ZIP 解压内容超出限制');
        for (const entry of zip.entries) if (!entry.isDirectory && MIME[path.extname(entry.name).toLowerCase()]) {
          if (entry.name.split(/[\\/]/u).includes('..')) throw new Error('ZIP 路径无效');
          await persist(entry.name, zip.readEntry(entry));
        }
      } else {
        if (!MIME[path.extname(file.name).toLowerCase()]) throw new Error('支持图片、PDF 和 ZIP 素材');
        await persist(file.name, bytes);
      }
    }
    return update(id, { assets, logoFiles: assets.filter(a => a.role === 'logo').map(a => a.relativePath), assetCount: assets.length, imageCount: assets.filter(a => a.mimeType.startsWith('image/')).length, status: 'ready', visualContextStatus: 'missing', visualContextVNextStatus: 'missing' });
  }
  async function scan(id) {
    const project = await get(id);
    return { projectId: id, totalFiles: project.assets.length, imageCount: project.imageCount, items: project.assets.map(asset => ({ ...asset, name: asset.originalName, kind: asset.mimeType.startsWith('image/') ? 'image' : 'pdf', usage: 'analysis_source' })) };
  }
  return { create, list, get, update, updateDetails, paths, scan, importFiles, projectRoot };
}
