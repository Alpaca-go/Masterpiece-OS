import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import sharp from 'sharp';
import type {
  AssetItem, AssetSummary, CreateProjectInput, ImportResult, ProjectRecord, PublicSettings
} from '../shared/types';
import { assertInside, sanitizeFilenamePart } from './analysis-contract.ts';
import { detectIntakeIdentity, type IntakeSource } from './project-intake.ts';

const SUPPORTED_DIRECT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.zip', '.md', '.txt', '.json']);
const SUPPORTED_ZIP_ENTRY = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.md', '.txt', '.json']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_ZIP_ENTRIES = 2_000;
const MAX_ZIP_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_IMPORTED_FILES = 2_000;

export type SettingsReader = () => Promise<PublicSettings>;

function normalizeProjectRecord(record: ProjectRecord): ProjectRecord {
  return {
    ...record,
    projectNameSource: record.projectNameSource || 'common-file-prefix',
    detectedBrandName: record.detectedBrandName || record.brandName || record.projectName,
    detectedIndustry: record.detectedIndustry || record.industry || '待确认（基于现有素材推断）',
    factConfidence: record.factConfidence || {
      brandName: record.brandName ? 1 : 0,
      industry: record.industry ? 1 : 0
    },
    logoLocked: record.logoLocked !== false,
    outputLanguage: 'zh-CN',
    analysisProfile: 'fusion-enhanced'
  };
}

function projectFile(projectRoot: string): string {
  return path.join(projectRoot, 'project.json');
}

export function createProjectStore(readSettings: SettingsReader) {
  async function dataRoot(): Promise<string> {
    const settings = await readSettings();
    const root = path.resolve(settings.defaultDataPath);
    await fs.mkdir(path.join(root, 'projects'), { recursive: true });
    return root;
  }

  async function projectsRoot(): Promise<string> {
    return path.join(await dataRoot(), 'projects');
  }

  async function rootForId(projectId: string): Promise<string> {
    if (!/^[a-f0-9-]{36}$/i.test(projectId)) throw new Error('项目 ID 无效');
    const root = await projectsRoot();
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(root, entry.name);
      try {
        const record = JSON.parse(await fs.readFile(projectFile(candidate), 'utf8')) as ProjectRecord;
        if (record.id === projectId) return candidate;
      } catch { /* skip malformed folders in list/search */ }
    }
    throw new Error('项目不存在');
  }

  async function readProject(projectRoot: string): Promise<ProjectRecord> {
    return normalizeProjectRecord(JSON.parse(await fs.readFile(projectFile(projectRoot), 'utf8')) as ProjectRecord);
  }

  async function writeProject(projectRoot: string, record: ProjectRecord): Promise<ProjectRecord> {
    record.updatedAt = new Date().toISOString();
    await fs.writeFile(projectFile(projectRoot), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    return record;
  }

  async function inspectSources(sourcePaths: string[]): Promise<{ sources: IntakeSource[]; labels: string[] }> {
    const sources: IntakeSource[] = [];
    const labels: string[] = [];
    for (const supplied of [...new Set(sourcePaths.map((item) => path.resolve(item)))]) {
      const stat = await fs.stat(supplied).catch(() => null);
      if (!stat || (!stat.isFile() && !stat.isDirectory())) continue;
      sources.push({ sourcePath: supplied, isDirectory: stat.isDirectory() });
      labels.push(path.basename(supplied));
      if (stat.isDirectory()) {
        const pending = [supplied];
        while (pending.length && labels.length < 500) {
          const directory = pending.shift()!;
          for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
            const target = path.join(directory, entry.name);
            if (entry.isDirectory()) pending.push(target);
            else labels.push(entry.name);
            if (labels.length >= 500) break;
          }
        }
      } else if (path.extname(supplied).toLowerCase() === '.zip') {
        try {
          labels.push(...new AdmZip(supplied).getEntries().slice(0, 500).map((entry) => entry.entryName));
        } catch {
          throw new Error(`ZIP 无法读取：${path.basename(supplied)}`);
        }
      }
    }
    if (!sources.length) throw new Error('请选择至少一个可读取的视觉方案文件或文件夹');
    return { sources, labels };
  }

  async function create(input: CreateProjectInput): Promise<ProjectRecord> {
    const intake = await inspectSources(input.sourcePaths);
    const identity = detectIntakeIdentity(intake.sources, intake.labels);
    const settings = await readSettings();
    const id = crypto.randomUUID();
    const directory = `${sanitizeFilenamePart(identity.projectName)}-${id.slice(0, 8)}`;
    const root = assertInside(await projectsRoot(), path.join(await projectsRoot(), directory));
    await Promise.all(['input', 'prepared', 'outputs', 'runtime'].map((folder) => fs.mkdir(path.join(root, folder), { recursive: true })));
    const now = new Date().toISOString();
    const record: ProjectRecord = {
      id,
      projectName: identity.projectName,
      projectNameSource: identity.projectNameSource,
      brandName: identity.detectedBrandName,
      industry: identity.detectedIndustry,
      detectedBrandName: identity.detectedBrandName,
      detectedIndustry: identity.detectedIndustry,
      factConfidence: identity.factConfidence,
      description: '基于已上传的视觉方案完成融合增强分析；品牌与行业信息由素材线索自动识别，低置信度事实必须标记为待确认。',
      logoLocked: true,
      lockedFacts: [
        '原始 Logo Locked：不得修改、重绘、拆解、替换、仿造或改变内部字形。',
        '输出语言固定为简体中文。'
      ],
      outputLanguage: 'zh-CN',
      provider: settings.provider,
      model: settings.model,
      analysisProfile: 'fusion-enhanced',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      lastRunAt: null,
      lastDurationMs: null,
      assetCount: 0,
      imageCount: 0,
      lastReportFilename: null,
      lastError: null,
      logoFiles: [],
      briefFiles: []
    };
    await writeProject(root, record);
    try {
      const imported = await importFiles(id, input.sourcePaths, 'assets');
      if (imported.summary.imageCount + imported.summary.pdfCount === 0) {
        throw new Error('上传内容中未发现可分析的图片或 PDF');
      }
      return get(id);
    } catch (error) {
      await fs.rm(root, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  async function list(): Promise<ProjectRecord[]> {
    const root = await projectsRoot();
    const entries = await fs.readdir(root, { withFileTypes: true });
    const records = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
      try { return await readProject(path.join(root, entry.name)); } catch { return null; }
    }));
    return records.filter((item): item is ProjectRecord => Boolean(item))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async function get(projectId: string): Promise<ProjectRecord> {
    return readProject(await rootForId(projectId));
  }

  async function update(projectId: string, changes: Partial<ProjectRecord>): Promise<ProjectRecord> {
    const root = await rootForId(projectId);
    const current = await readProject(root);
    return writeProject(root, { ...current, ...changes, id: current.id });
  }

  async function uniqueDestination(directory: string, filename: string): Promise<string> {
    const parsed = path.parse(filename);
    let candidate = path.join(directory, sanitizeFilenamePart(filename));
    for (let index = 2; await fs.stat(candidate).then(() => true).catch(() => false); index += 1) {
      candidate = path.join(directory, `${sanitizeFilenamePart(parsed.name)}-${index}${parsed.ext.toLowerCase()}`);
    }
    return candidate;
  }

  async function extractZip(zipPath: string, destination: string): Promise<{ extracted: string[]; skipped: string[] }> {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    if (entries.length > MAX_ZIP_ENTRIES) throw new Error(`ZIP 文件条目过多（${entries.length}），上限为 ${MAX_ZIP_ENTRIES}`);
    const total = entries.reduce((sum, entry) => sum + Number(entry.header.size || 0), 0);
    if (total > MAX_ZIP_UNCOMPRESSED_BYTES) throw new Error('ZIP 解压后体积超过 2 GB 安全上限');
    const extracted: string[] = [];
    const skipped: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const normalized = entry.entryName.replaceAll('\\', '/');
      const extension = path.extname(normalized).toLowerCase();
      if (!SUPPORTED_ZIP_ENTRY.has(extension) || normalized.includes('\0')) {
        skipped.push(entry.entryName);
        continue;
      }
      const target = assertInside(destination, path.join(destination, ...normalized.split('/')));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, entry.getData());
      extracted.push(path.relative(destination, target).replaceAll('\\', '/'));
    }
    return { extracted, skipped };
  }

  async function scan(projectId: string): Promise<AssetSummary> {
    const root = await rootForId(projectId);
    const input = path.join(root, 'input');
    const items: AssetItem[] = [];
    const unreadableFiles: string[] = [];
    async function walk(directory: string): Promise<void> {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) { await walk(absolute); continue; }
        const extension = path.extname(entry.name).toLowerCase();
        const stat = await fs.stat(absolute);
        const relativePath = path.relative(input, absolute).replaceAll('\\', '/');
        const item: AssetItem = {
          relativePath,
          name: entry.name,
          extension,
          bytes: stat.size,
          kind: IMAGE_EXTENSIONS.has(extension) ? 'image'
            : extension === '.pdf' ? 'pdf'
              : extension === '.zip' ? 'zip'
                : ['.md', '.txt', '.json'].includes(extension) ? 'document' : 'unsupported'
        };
        if (item.kind === 'image' && items.filter((candidate) => candidate.thumbnailDataUrl).length < 24) {
          try {
            const thumbnail = await sharp(absolute).rotate().resize({ width: 240, height: 160, fit: 'cover' }).jpeg({ quality: 72 }).toBuffer();
            item.thumbnailDataUrl = `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
          } catch {
            item.warning = '图片损坏或无法读取';
            unreadableFiles.push(relativePath);
          }
        }
        items.push(item);
      }
    }
    await walk(input);
    const project = await readProject(root);
    const detectedLogoFiles = items
      .filter((item) => /logo|标志|标识|品牌字|标准字/i.test(item.name))
      .map((item) => item.relativePath);
    const detectedBriefFiles = items
      .filter((item) => /brief|说明|规范|手册|guideline|brandbook/i.test(item.name))
      .map((item) => item.relativePath);
    const summary: AssetSummary = {
      totalFiles: items.length,
      totalBytes: items.reduce((sum, item) => sum + item.bytes, 0),
      imageCount: items.filter((item) => item.kind === 'image').length,
      pdfCount: items.filter((item) => item.kind === 'pdf').length,
      zipCount: items.filter((item) => item.kind === 'zip').length,
      logoDetected: project.logoFiles.length > 0 || detectedLogoFiles.length > 0,
      unreadableFiles,
      items
    };
    await update(projectId, {
      assetCount: summary.totalFiles,
      imageCount: summary.imageCount,
      logoFiles: [...new Set([...project.logoFiles, ...detectedLogoFiles])],
      briefFiles: [...new Set([...project.briefFiles, ...detectedBriefFiles])],
      status: summary.totalFiles ? 'ready' : 'draft'
    });
    return summary;
  }

  async function importFiles(projectId: string, paths: string[], kind: 'assets' | 'logo' | 'brief'): Promise<ImportResult> {
    const root = await rootForId(projectId);
    const input = path.join(root, 'input');
    const project = await readProject(root);
    const imported: string[] = [];
    const extracted: string[] = [];
    const skipped: string[] = [];
    const logoFiles = [...project.logoFiles];
    const briefFiles = [...project.briefFiles];
    const baseFolder = kind === 'logo' ? path.join(input, 'logo') : kind === 'brief' ? path.join(input, 'brief') : input;

    async function importSourceFile(source: string, destinationFolder: string): Promise<void> {
      const extension = path.extname(source).toLowerCase();
      if (!SUPPORTED_DIRECT.has(extension)) { skipped.push(path.basename(source)); return; }
      await fs.mkdir(destinationFolder, { recursive: true });
      const destination = assertInside(input, await uniqueDestination(destinationFolder, path.basename(source)));
      await fs.copyFile(source, destination);
      const relative = path.relative(input, destination).replaceAll('\\', '/');
      imported.push(relative);
      if (kind === 'logo') logoFiles.push(relative);
      if (kind === 'brief') briefFiles.push(relative);
      if (extension !== '.zip') return;
      const extractedRoot = assertInside(input, path.join(destinationFolder, 'extracted', sanitizeFilenamePart(path.parse(destination).name)));
      await fs.mkdir(extractedRoot, { recursive: true });
      const result = await extractZip(destination, extractedRoot);
      extracted.push(...result.extracted.map((item) => path.relative(input, path.join(extractedRoot, item)).replaceAll('\\', '/')));
      skipped.push(...result.skipped);
    }

    async function directoryFiles(directory: string): Promise<Array<{ source: string; relative: string }>> {
      const files: Array<{ source: string; relative: string }> = [];
      const pending = [directory];
      while (pending.length) {
        const current = pending.shift()!;
        for (const entry of await fs.readdir(current, { withFileTypes: true })) {
          const target = path.join(current, entry.name);
          if (entry.isDirectory()) pending.push(target);
          else files.push({ source: target, relative: path.relative(directory, target) });
          if (files.length > MAX_IMPORTED_FILES) throw new Error(`文件夹内文件超过 ${MAX_IMPORTED_FILES} 个安全上限`);
        }
      }
      return files;
    }

    for (const supplied of paths) {
      const source = path.resolve(supplied);
      const stat = await fs.stat(source).catch(() => null);
      if (!stat || (!stat.isFile() && !stat.isDirectory())) { skipped.push(path.basename(source)); continue; }
      if (stat.isDirectory()) {
        const folderRoot = assertInside(input, path.join(baseFolder, sanitizeFilenamePart(path.basename(source))));
        for (const file of await directoryFiles(source)) {
          await importSourceFile(file.source, path.join(folderRoot, path.dirname(file.relative)));
        }
      } else {
        await importSourceFile(source, baseFolder);
      }
    }
    await update(projectId, { logoFiles: [...new Set(logoFiles)], briefFiles: [...new Set(briefFiles)] });
    return { imported, extracted, skipped, summary: await scan(projectId) };
  }

  async function remove(projectId: string): Promise<void> {
    const root = await rootForId(projectId);
    const parent = await projectsRoot();
    assertInside(parent, root);
    await fs.rm(root, { recursive: true, force: false });
  }

  async function paths(projectId: string) {
    const root = await rootForId(projectId);
    return {
      root,
      input: path.join(root, 'input'),
      prepared: path.join(root, 'prepared'),
      outputs: path.join(root, 'outputs'),
      runtime: path.join(root, 'runtime')
    };
  }

  return { create, list, get, update, scan, importFiles, remove, paths };
}

export type ProjectStore = ReturnType<typeof createProjectStore>;
