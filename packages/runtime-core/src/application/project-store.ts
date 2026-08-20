import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import sharp from 'sharp';
import type {
  AssetItem,
  AssetSummary,
  CreateProjectInput,
  ImportFileBytesInput,
  ImportFileBytesResult,
  ImportResult,
  ProjectAsset,
  ProjectPlanningBriefRecord,
  ProjectRecord,
  PublicSettings
} from '../shared/types.ts';
import { assertInside, sanitizeFilenamePart } from './analysis-contract.ts';
import { detectIntakeIdentity, type IntakeSource } from './project-intake.ts';
import { parseStrategyDocument } from './document-processing.ts';
import {
  PLANNING_BRIEF_SUPPORTED_EXTENSIONS,
  assertPlanningBriefFilename,
  buildPlanningBriefRecord,
  buildPlanningBriefSourceId,
  planningBriefContentHash
} from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';

const SUPPORTED_DIRECT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.zip']);
const SUPPORTED_ASSET = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_ZIP_ENTRIES = 2_000;
const MAX_ZIP_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_IMPORTED_FILES = 2_000;

// P3-D3.6A/6B — Web Reference upload contract limits.
// Reference images only: PNG / JPEG / WEBP. Per-file raw cap
// 8 MiB (base64 ≈ 10.7 MiB < upload-channel 64 MiB body cap).
const UPLOAD_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const UPLOAD_IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};
const UPLOAD_MAX_FILE_BYTES = 8 * 1024 * 1024;

function uploadError(code: string, message: string): Error {
  const err = new Error(`${code}: ${message}`);
  err.name = 'UploadError';
  (err as Error & { code?: string }).code = code;
  return err;
}

function sanitizeUploadFilename(raw: string): string {
  const basename = String(raw || '').split(/[\\/]/u).pop() || '';
  return sanitizeFilenamePart(basename) || 'reference-image';
}

export type SettingsReader = () => Promise<PublicSettings>;

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

function normalizeProjectRecord(record: ProjectRecord): ProjectRecord {
  return {
    ...record,
    detectedProjectName: record.detectedProjectName || record.projectName,
    projectNameSource: record.projectNameSource || 'common-file-prefix',
    projectNameConfidence: record.projectNameConfidence ?? record.factConfidence?.brandName ?? 0,
    detectedBrandName: record.detectedBrandName || record.brandName || record.projectName,
    detectedIndustry: record.detectedIndustry || record.industry || '待确认（基于现有素材推断）',
    factConfidence: record.factConfidence || {
      brandName: record.brandName ? 1 : 0,
      industry: record.industry ? 1 : 0
    },
    apiProfileId: record.apiProfileId || null,
    logoLocked: record.logoLocked !== false,
    outputLanguage: 'zh-CN',
    analysisProfile: 'fusion-enhanced',
    assets: Array.isArray(record.assets)
      ? record.assets.map((asset) => ({ ...asset, usage: asset.usage ?? 'analysis_source' }))
      : [],
    // CI-W1C.7.4-R1 — additive planning brief registry. Distinct from
    // `briefFiles` (visual-context auto-detect).
    planningBriefFiles: Array.isArray(record.planningBriefFiles)
      ? record.planningBriefFiles.filter(
          (item): item is ProjectPlanningBriefRecord =>
            !!item && typeof item === 'object' && typeof item.sourceId === 'string'
        )
      : [],
    visualContextVNextFilename: record.visualContextVNextFilename || null,
    visualContextVNextStatus: record.visualContextVNextStatus || 'missing',
    visualContextVNextVersion: record.visualContextVNextVersion || null,
    visualContextVNextLastBuiltAt: record.visualContextVNextLastBuiltAt || null
  };
}

function projectFile(projectRoot: string): string {
  return path.join(projectRoot, 'project.json');
}

function hashBuffer(value: Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function hashFile(filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fsSync.createReadStream(filename);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// P3-D3.6A/6B — canonical single-asset buffer persistence.
// Shared by `importFiles` (zip extraction) and the Web asset
// upload RPC (`importFileBytes`). One persistence path, one
// sha256 dedup, one asset-id authority, one project-binding
// rule. No second asset store.
async function persistBufferAsset(options: {
  root: string;
  assetsRoot: string;
  generationReference: boolean;
  assets: ProjectAsset[];
  knownHashes: Set<string>;
  buffer: Buffer;
  originalName: string;
  batchId: string;
  sourceType: ProjectAsset['sourceType'];
  archiveSourceName?: string;
}): Promise<{ ok: boolean; created?: ProjectAsset; duplicate?: { id: string; name: string } }> {
  const {
    root, assetsRoot, generationReference, assets, knownHashes,
    buffer, originalName, batchId, sourceType, archiveSourceName,
  } = options;
  const extension = path.extname(originalName).toLowerCase();
  if (!SUPPORTED_ASSET.has(extension)) return { ok: false };
  const sha256 = hashBuffer(buffer);
  if (knownHashes.has(sha256)) {
    const existing = assets.find((asset) =>
      asset.sha256 === sha256 && (generationReference || asset.usage !== 'generation_reference'));
    if (existing) return { ok: false, duplicate: { id: existing.id, name: existing.originalName } };
  }
  const id = crypto.randomUUID();
  const filename = `${id}${extension === '.jpeg' ? '.jpg' : extension}`;
  const destination = assertInside(generationReference ? root : path.join(root, 'input'), path.join(assetsRoot, filename));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, buffer);
  const stat = await fs.stat(destination);
  const record: ProjectAsset = {
    id,
    batchId,
    sourceType,
    originalName: path.basename(originalName),
    relativePath: path.relative(generationReference ? root : path.join(root, 'input'), destination).replaceAll('\\', '/'),
    mimeType: MIME_TYPES[extension] || 'application/octet-stream',
    sizeBytes: stat.size,
    sha256,
    status: 'ready',
    usage: generationReference ? 'generation_reference' : 'analysis_source',
    archiveSourceName
  };
  assets.push(record);
  knownHashes.add(sha256);
  return { ok: true, created: record };
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
          throw new Error(`压缩包解压失败，未加入分析素材：${path.basename(supplied)}`);
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
    const profile = settings.profiles.find((item) => item.id === input.apiProfileId && item.isEnabled);
    if (!profile) throw new Error('请选择一个已启用的 API Profile');
    const id = crypto.randomUUID();
    const directory = `${sanitizeFilenamePart(identity.projectName)}-${id.slice(0, 8)}`;
    const root = assertInside(await projectsRoot(), path.join(await projectsRoot(), directory));
    await Promise.all(['input/assets', 'prepared', 'outputs', 'runtime'].map((folder) => fs.mkdir(path.join(root, folder), { recursive: true })));
    const now = new Date().toISOString();
    const record: ProjectRecord = {
      id,
      projectName: identity.projectName,
      detectedProjectName: identity.projectName,
      projectNameSource: identity.projectNameSource,
      projectNameConfidence: identity.factConfidence.brandName,
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
      provider: profile.provider,
      model: profile.modelId,
      apiProfileId: profile.id,
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
      briefFiles: [],
      planningBriefFiles: [],
      assets: []
    };
    await writeProject(root, record);
    try {
      const imported = await importFiles(id, input.sourcePaths, 'assets');
      if (imported.summary.totalFiles === 0) throw new Error('上传内容中未发现可分析的图片或 PDF');
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

  async function invalidatePrepared(projectRoot: string): Promise<void> {
    const prepared = assertInside(projectRoot, path.join(projectRoot, 'prepared'));
    await fs.rm(prepared, { recursive: true, force: true });
    await fs.mkdir(prepared, { recursive: true });
  }

  async function invalidateReport(projectRoot: string, project: ProjectRecord): Promise<void> {
    if (!project.lastReportFilename) return;
    const outputs = assertInside(projectRoot, path.join(projectRoot, 'outputs'));
    const report = assertInside(outputs, path.join(outputs, path.basename(project.lastReportFilename)));
    await fs.rm(report, { force: true });
  }

  function assetAbsolutePath(projectRoot: string, asset: ProjectAsset): string {
    if (asset.usage === 'generation_reference') {
      return assertInside(projectRoot, path.join(projectRoot, asset.relativePath));
    }
    const inputRoot = path.join(projectRoot, 'input');
    return assertInside(inputRoot, path.join(inputRoot, asset.relativePath));
  }

  async function importFiles(
    projectId: string,
    paths: string[],
    kind: 'assets' | 'logo' | 'brief' | 'reference'
  ): Promise<ImportResult> {
    const root = await rootForId(projectId);
    const input = path.join(root, 'input');
    const generationReference = kind === 'reference';
    const assetsRoot = generationReference
      ? path.join(root, 'generation-references')
      : path.join(input, 'assets');
    await fs.mkdir(assetsRoot, { recursive: true });
    const project = await readProject(root);
    const assets = [...project.assets.filter((asset) => asset.status === 'ready')];
    const duplicateCandidates = generationReference
      ? assets
      : assets.filter((asset) => asset.usage !== 'generation_reference');
    const knownHashes = new Set(duplicateCandidates.map((asset) => asset.sha256));
    const imported: string[] = [];
    const extracted: string[] = [];
    const skipped: string[] = [];
    const duplicates: Array<{ id: string; name: string }> = [];
    const createdFiles: string[] = [];

    async function persistAsset(options: {
      buffer?: Buffer;
      sourcePath?: string;
      originalName: string;
      batchId: string;
      sourceType: ProjectAsset['sourceType'];
      archiveSourceName?: string;
    }): Promise<boolean> {
      const extension = path.extname(options.originalName).toLowerCase();
      if (!SUPPORTED_ASSET.has(extension)) {
        skipped.push(options.originalName);
        return false;
      }
      if (options.buffer) {
        const result = await persistBufferAsset({
          root,
          assetsRoot,
          generationReference,
          assets,
          knownHashes,
          buffer: options.buffer,
          originalName: options.originalName,
          batchId: options.batchId,
          sourceType: options.sourceType,
          archiveSourceName: options.archiveSourceName,
        });
        if (result.duplicate) {
          duplicates.push(result.duplicate);
          skipped.push(`${options.originalName}（重复）`);
          return false;
        }
        if (!result.created) {
          skipped.push(options.originalName);
          return false;
        }
        createdFiles.push(path.join(
          generationReference ? root : path.join(root, 'input'),
          result.created.relativePath,
        ));
        imported.push(result.created.relativePath);
        if (options.sourceType === 'archive-extracted') extracted.push(result.created.relativePath);
        return true;
      }
      const sha256 = await hashFile(options.sourcePath!);
      if (knownHashes.has(sha256)) {
        const existing = assets.find((asset) =>
          asset.sha256 === sha256 && (generationReference || asset.usage !== 'generation_reference'));
        if (existing) duplicates.push({ id: existing.id, name: existing.originalName });
        skipped.push(`${options.originalName}（重复）`);
        return false;
      }
      const id = crypto.randomUUID();
      const filename = `${id}${extension === '.jpeg' ? '.jpg' : extension}`;
      const destination = assertInside(generationReference ? root : input, path.join(assetsRoot, filename));
      await fs.copyFile(options.sourcePath!, destination);
      createdFiles.push(destination);
      const stat = await fs.stat(destination);
      const record: ProjectAsset = {
        id,
        batchId: options.batchId,
        sourceType: options.sourceType,
        originalName: path.basename(options.originalName),
        relativePath: path.relative(generationReference ? root : input, destination).replaceAll('\\', '/'),
        mimeType: MIME_TYPES[extension] || 'application/octet-stream',
        sizeBytes: stat.size,
        sha256,
        status: 'ready',
        usage: generationReference ? 'generation_reference' : 'analysis_source',
        archiveSourceName: options.archiveSourceName
      };
      assets.push(record);
      knownHashes.add(sha256);
      imported.push(record.relativePath);
      if (options.sourceType === 'archive-extracted') extracted.push(record.relativePath);
      return true;
    }

    async function importZip(source: string, batchId: string): Promise<void> {
      let zip: AdmZip;
      try { zip = new AdmZip(source); }
      catch { throw new Error(`压缩包解压失败，未加入分析素材：${path.basename(source)}`); }
      const entries = zip.getEntries();
      if (entries.length > MAX_ZIP_ENTRIES) throw new Error(`ZIP 文件条目过多（${entries.length}），上限为 ${MAX_ZIP_ENTRIES}`);
      const total = entries.reduce((sum, entry) => sum + Number(entry.header.size || 0), 0);
      if (total > MAX_ZIP_UNCOMPRESSED_BYTES) throw new Error('ZIP 解压后体积超过 2 GB 安全上限');
      let validEntries = 0;
      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const normalized = entry.entryName.replaceAll('\\', '/');
        const extension = path.extname(normalized).toLowerCase();
        if (!SUPPORTED_ASSET.has(extension) || normalized.includes('\0')) {
          skipped.push(entry.entryName);
          continue;
        }
        if (normalized.split('/').some((part) => part === '..')) throw new Error('ZIP 包含路径穿越风险，未加入分析素材');
        let value: Buffer;
        try { value = entry.getData(); }
        catch { throw new Error(`压缩包可能已损坏或受密码保护：${path.basename(source)}`); }
        validEntries += 1;
        await persistAsset({
          buffer: value,
          originalName: path.basename(normalized),
          batchId,
          sourceType: 'archive-extracted',
          archiveSourceName: path.basename(source)
        });
      }
      if (!validEntries) throw new Error(`压缩包解压后没有有效的 JPG、PNG、WEBP 或 PDF：${path.basename(source)}`);
    }

    async function directoryFiles(directory: string): Promise<string[]> {
      const files: string[] = [];
      const pending = [directory];
      while (pending.length) {
        const current = pending.shift()!;
        for (const entry of await fs.readdir(current, { withFileTypes: true })) {
          const target = path.join(current, entry.name);
          if (entry.isDirectory()) pending.push(target);
          else files.push(target);
          if (files.length > MAX_IMPORTED_FILES) throw new Error(`文件夹内文件超过 ${MAX_IMPORTED_FILES} 个安全上限`);
        }
      }
      return files;
    }

    try {
      for (const supplied of paths) {
        const source = path.resolve(supplied);
        const stat = await fs.stat(source).catch(() => null);
        if (!stat || (!stat.isFile() && !stat.isDirectory())) {
          skipped.push(path.basename(source));
          continue;
        }
        const batchId = crypto.randomUUID();
        if (stat.isDirectory()) {
          for (const file of await directoryFiles(source)) {
            const extension = path.extname(file).toLowerCase();
            if (extension === '.zip') await importZip(file, batchId);
            else if (SUPPORTED_DIRECT.has(extension)) {
              await persistAsset({
                sourcePath: file,
                originalName: path.basename(file),
                batchId,
                sourceType: 'folder'
              });
            } else skipped.push(path.relative(source, file).replaceAll('\\', '/'));
          }
        } else if (path.extname(source).toLowerCase() === '.zip') {
          await importZip(source, batchId);
        } else if (SUPPORTED_DIRECT.has(path.extname(source).toLowerCase())) {
          await persistAsset({
            sourcePath: source,
            originalName: path.basename(source),
            batchId,
            sourceType: 'file'
          });
        } else skipped.push(path.basename(source));
      }
    } catch (error) {
      await Promise.all(createdFiles.map((filename) => fs.rm(filename, { force: true }).catch(() => {})));
      throw error;
    }

    if (generationReference) {
      await writeProject(root, { ...project, assets });
    } else {
      await invalidateReport(root, project);
      await writeProject(root, {
        ...project,
        assets,
        status: assets.some((asset) => asset.usage !== 'generation_reference') ? 'ready' : 'draft',
        lastReportFilename: null,
        lastError: null
      });
      await invalidatePrepared(root);
      await reidentifyProject(projectId);
    }
    return { imported, extracted, skipped, duplicates, summary: await scan(projectId) };
  }

  // P3-D3.6A/6B — Web Asset Upload Contract (frozen).
  // Browser File bytes → project-bound generation_reference asset.
  // Reuses persistBufferAsset (canonical sha256 dedup, project
  // binding via assertInside, asset id authority, MIME/extension
  // validation). Never accepts an absolute path; never stores a
  // second asset authority.
  async function importFileBytes(input: ImportFileBytesInput): Promise<ImportFileBytesResult> {
    const projectId = typeof input?.projectId === 'string' ? input.projectId.trim() : '';
    if (!projectId) throw uploadError('UPLOAD_PROJECT_NOT_FOUND', '项目不存在');
    let root: string;
    try {
      root = await rootForId(projectId);
    } catch {
      throw uploadError('UPLOAD_PROJECT_NOT_FOUND', '项目不存在');
    }
    const project = await readProject(root);
    const file = (input?.file && typeof input.file === 'object' ? input.file : {}) as ImportFileBytesInput['file'];
    const rawName = typeof file.name === 'string' ? file.name : '';
    const mime = typeof file.mime === 'string' ? file.mime.trim().toLowerCase() : '';
    const declaredSize = typeof file.size === 'number' ? file.size : Number(file.size);
    const content = typeof file.content === 'string' ? file.content : '';
    const name = sanitizeUploadFilename(rawName);
    const extension = path.extname(name).toLowerCase();
    if (!UPLOAD_IMAGE_EXTENSIONS.has(extension) || !SUPPORTED_ASSET.has(extension)) {
      throw uploadError('UPLOAD_FILE_TYPE_UNSUPPORTED', '仅支持 PNG、JPEG、WEBP 参考图');
    }
    const expectedMime = UPLOAD_IMAGE_MIME[extension];
    if (!expectedMime || (mime && mime !== expectedMime && mime !== `image/jpg`)) {
      throw uploadError('UPLOAD_FILE_TYPE_UNSUPPORTED', '文件类型与扩展名不一致');
    }
    if (!Number.isFinite(declaredSize) || declaredSize <= 0) {
      throw uploadError('UPLOAD_FILE_EMPTY', '文件内容为空');
    }
    if (declaredSize > UPLOAD_MAX_FILE_BYTES) {
      throw uploadError('UPLOAD_FILE_TOO_LARGE', `文件超过 ${UPLOAD_MAX_FILE_BYTES / (1024 * 1024)} MiB 上限`);
    }
    if (!content) throw uploadError('UPLOAD_FILE_EMPTY', '文件内容为空');
    let buffer: Buffer;
    try {
      buffer = Buffer.from(content, 'base64');
    } catch {
      throw uploadError('UPLOAD_TRANSPORT_FAILED', '文件内容编码无效');
    }
    if (buffer.length !== declaredSize) {
      throw uploadError('UPLOAD_TRANSPORT_FAILED', '文件内容与声明大小不一致');
    }
    const assetsRoot = path.join(root, 'generation-references');
    await fs.mkdir(assetsRoot, { recursive: true });
    const assets = [...project.assets.filter((asset) => asset.status === 'ready')];
    const knownHashes = new Set(assets.map((asset) => asset.sha256));
    const batchId = crypto.randomUUID();
    const result = await persistBufferAsset({
      root,
      assetsRoot,
      generationReference: true,
      assets,
      knownHashes,
      buffer,
      originalName: name,
      batchId,
      sourceType: 'file',
    });
    if (result.duplicate) {
      const existing = project.assets.find((asset) => asset.id === result.duplicate!.id);
      if (existing) {
        return {
          asset: {
            id: existing.id,
            projectId,
            name: existing.originalName,
            mime: existing.mimeType,
            sizeBytes: existing.sizeBytes,
            relativePath: existing.relativePath,
            sha256: existing.sha256,
            usage: 'generation_reference',
          },
          duplicate: true,
          existingAssetId: existing.id,
        };
      }
    }
    if (!result.created) throw uploadError('UPLOAD_PERSIST_FAILED', '文件保存失败');
    await writeProject(root, { ...project, assets });
    return {
      asset: {
        id: result.created.id,
        projectId,
        name: result.created.originalName,
        mime: result.created.mimeType,
        sizeBytes: result.created.sizeBytes,
        relativePath: result.created.relativePath,
        sha256: result.created.sha256,
        usage: 'generation_reference',
      },
      duplicate: false,
    };
  }

  async function migrateLegacyAssets(projectId: string, root: string, project: ProjectRecord): Promise<ProjectRecord> {
    if (project.assets.length) return project;
    const input = path.join(root, 'input');
    const assetsRoot = path.join(input, 'assets');
    await fs.mkdir(assetsRoot, { recursive: true });
    const discovered: ProjectAsset[] = [];
    const hashes = new Set<string>();
    async function walk(directory: string): Promise<void> {
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) { await walk(absolute); continue; }
        const extension = path.extname(entry.name).toLowerCase();
        if (extension === '.zip') {
          await fs.rm(absolute, { force: true });
          continue;
        }
        if (!SUPPORTED_ASSET.has(extension)) continue;
        const sha256 = await hashFile(absolute);
        if (hashes.has(sha256)) {
          await fs.rm(absolute, { force: true });
          continue;
        }
        hashes.add(sha256);
        const id = crypto.randomUUID();
        const destination = path.join(assetsRoot, `${id}${extension === '.jpeg' ? '.jpg' : extension}`);
        if (path.resolve(absolute) !== path.resolve(destination)) {
          await fs.copyFile(absolute, destination);
          await fs.rm(absolute, { force: true });
        }
        const stat = await fs.stat(destination);
        discovered.push({
          id,
          batchId: `legacy-${projectId}`,
          sourceType: 'file',
          originalName: entry.name,
          relativePath: path.relative(input, destination).replaceAll('\\', '/'),
          mimeType: MIME_TYPES[extension] || 'application/octet-stream',
          sizeBytes: stat.size,
          sha256,
          status: 'ready',
          usage: 'analysis_source'
        });
      }
    }
    await walk(input);
    return writeProject(root, { ...project, assets: discovered });
  }

  async function reidentifyProject(projectId: string): Promise<ProjectRecord> {
    const root = await rootForId(projectId);
    const project = await readProject(root);
    const labels = project.assets
      .filter((asset) => asset.status === 'ready' && asset.usage !== 'generation_reference')
      .flatMap((asset) => [asset.originalName, asset.archiveSourceName || ''])
      .filter(Boolean);
    if (!labels.length) return project;
    const syntheticSources: IntakeSource[] = labels.map((label) => ({
      sourcePath: path.join('C:/intake', label),
      isDirectory: false
    }));
    const identity = detectIntakeIdentity(syntheticSources, labels);
    const shouldReplace = identity.factConfidence.brandName > project.projectNameConfidence
      || project.projectNameSource === 'fallback-datetime';
    return writeProject(root, {
      ...project,
      projectName: shouldReplace ? identity.projectName : project.projectName,
      detectedProjectName: shouldReplace ? identity.projectName : project.detectedProjectName,
      projectNameSource: shouldReplace ? identity.projectNameSource : project.projectNameSource,
      projectNameConfidence: shouldReplace ? identity.factConfidence.brandName : project.projectNameConfidence,
      brandName: identity.factConfidence.brandName >= project.factConfidence.brandName
        ? identity.detectedBrandName : project.brandName,
      detectedBrandName: identity.factConfidence.brandName >= project.factConfidence.brandName
        ? identity.detectedBrandName : project.detectedBrandName,
      industry: identity.factConfidence.industry >= project.factConfidence.industry
        ? identity.detectedIndustry : project.industry,
      detectedIndustry: identity.factConfidence.industry >= project.factConfidence.industry
        ? identity.detectedIndustry : project.detectedIndustry,
      factConfidence: {
        brandName: Math.max(identity.factConfidence.brandName, project.factConfidence.brandName),
        industry: Math.max(identity.factConfidence.industry, project.factConfidence.industry)
      }
    });
  }

  async function scan(projectId: string): Promise<AssetSummary> {
    const root = await rootForId(projectId);
    let project = await readProject(root);
    project = await migrateLegacyAssets(projectId, root, project);
    const items: AssetItem[] = [];
    const unreadableFiles: string[] = [];
    for (const asset of project.assets.filter((item) => item.status === 'ready')) {
      const absolute = assetAbsolutePath(root, asset);
      const stat = await fs.stat(absolute).catch(() => null);
      if (!stat?.isFile()) continue;
      const extension = path.extname(asset.originalName).toLowerCase();
      const item: AssetItem = {
        id: asset.id,
        batchId: asset.batchId,
        sourceType: asset.sourceType,
        relativePath: asset.relativePath,
        name: asset.originalName,
        extension,
        bytes: stat.size,
        kind: IMAGE_EXTENSIONS.has(extension) ? 'image' : extension === '.pdf' ? 'pdf' : 'unsupported',
        sha256: asset.sha256,
        usage: asset.usage ?? 'analysis_source',
        archiveSourceName: asset.archiveSourceName
      };
      if (item.kind === 'image' && items.filter((candidate) => candidate.thumbnailDataUrl).length < 36) {
        try {
          const thumbnail = await sharp(absolute).rotate().resize({ width: 240, height: 160, fit: 'cover' }).jpeg({ quality: 72 }).toBuffer();
          item.thumbnailDataUrl = `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
        } catch {
          item.warning = '图片损坏或无法读取';
          unreadableFiles.push(item.relativePath);
        }
      }
      items.push(item);
    }
    const analysisItems = items.filter((item) => item.usage === 'analysis_source');
    const detectedLogoFiles = analysisItems
      .filter((item) => /logo|标志|标识|品牌字|标准字/i.test(item.name))
      .map((item) => item.relativePath);
    const detectedBriefFiles = analysisItems
      .filter((item) => /brief|说明|规范|手册|guideline|brandbook/i.test(item.name))
      .map((item) => item.relativePath);
    const summary: AssetSummary = {
      totalFiles: items.length,
      totalBytes: items.reduce((sum, item) => sum + item.bytes, 0),
      imageCount: items.filter((item) => item.kind === 'image').length,
      pdfCount: items.filter((item) => item.kind === 'pdf').length,
      logoDetected: detectedLogoFiles.length > 0,
      unreadableFiles,
      items
    };
    await writeProject(root, {
      ...project,
      assets: project.assets.filter((asset) => items.some((item) => item.id === asset.id)),
      assetCount: analysisItems.length,
      imageCount: analysisItems.filter((item) => item.kind === 'image').length,
      logoFiles: detectedLogoFiles,
      briefFiles: detectedBriefFiles,
      status: analysisItems.length ? (project.status === 'draft' ? 'ready' : project.status) : 'draft'
    });
    return summary;
  }

  async function removeAssets(projectId: string, predicate: (asset: ProjectAsset) => boolean): Promise<AssetSummary> {
    const root = await rootForId(projectId);
    const project = await readProject(root);
    const removed = project.assets.filter(predicate);
    for (const asset of removed) {
      const target = assetAbsolutePath(root, asset);
      await fs.rm(target, { force: true });
    }
    const remaining = project.assets.filter((asset) => !predicate(asset));
    const analysisChanged = removed.some((asset) => asset.usage !== 'generation_reference');
    if (analysisChanged) {
      await invalidateReport(root, project);
      await writeProject(root, {
        ...project,
        assets: remaining,
        status: remaining.some((asset) => asset.usage !== 'generation_reference') ? 'ready' : 'draft',
        lastReportFilename: null,
        lastError: null
      });
      await invalidatePrepared(root);
      await reidentifyProject(projectId);
    } else {
      await writeProject(root, { ...project, assets: remaining });
    }
    return scan(projectId);
  }

  async function removeAsset(projectId: string, assetId: string): Promise<AssetSummary> {
    return removeAssets(projectId, (asset) => asset.id === assetId);
  }

  async function removeBatch(projectId: string, batchId: string): Promise<AssetSummary> {
    return removeAssets(projectId, (asset) => asset.batchId === batchId);
  }

  async function clearAssets(projectId: string): Promise<AssetSummary> {
    return removeAssets(projectId, () => true);
  }

  // ---------------------------------------------------------------------
  // CI-W1C.7.4-R1 — Planning brief registration (project mutation).
  //
  // This is the real project-store mutator for planning briefs. It
  // owns file IO, content hashing, dedupe, path safety, and the
  // update of `project.planningBriefFiles[]`. Creative Intelligence
  // is the policy layer; runtime-core/application is the IO layer.
  //
  // Hard rules (spec PART B / PART C / PART H):
  //  - Validate extension up-front.
  //  - Reuse existing parseStrategyDocument (no second parser).
  //  - Persist file at <root>/planning-briefs/<contentHash[:16]>.<ext>.
  //  - Never store raw binary / base64 in project.json.
  //  - Dedupe by contentHash; same content returns the existing
  //    record (no double-registration).
  //  - Reject path traversal via assertInside.
  //  - For replacement (same filename, different content), the new
  //    content gets a new sourceId (content-hash-based) and a new
  //    on-disk file; the old one stays in the list unless removed.
  //  - Removal deletes both the on-disk file and the metadata row.
  // ---------------------------------------------------------------------

  /**
   * Sanitize a planning-brief destination relative path. Ensures
   * the relative path stays inside the project root and is
   * canonical (no `..`).
   */
  function planningBriefRelativePath(contentHash: string, extension: string): string {
    const normalizedExtension = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
    return `planning-briefs/${contentHash.slice(0, 16)}${normalizedExtension}`;
  }

  /**
   * Register a planning brief file from an on-disk source path.
   *
   * Steps:
   *  1. Validate the source file exists + extension is supported.
   *  2. Parse via `parseStrategyDocument` (reuses existing parser,
   *     PDF/DOCX/MD/TXT).
   *  3. Compute contentHash (LF-normalized SHA-256 of parsed text).
   *  4. If a record with this sourceId already exists on the
   *     project, return the existing record (idempotent dedupe).
   *  5. Otherwise, copy the source file to
   *     `<root>/planning-briefs/<contentHash[:16]>.<ext>` and
   *     append a new `PlanningBriefRecord` to
   *     `project.planningBriefFiles[]`.
   *  6. Persist the project.
   *  7. Return the record.
   */
  async function registerPlanningBriefFromPath(input: {
    projectId: string;
    sourcePath: string;
    displayFilename?: string;
  }): Promise<ProjectPlanningBriefRecord> {
    const { projectId, sourcePath } = input;
    if (!projectId) throw new Error('PLANNING-BRIEF-NO-PROJECT: projectId is required');
    if (!sourcePath) throw new Error('PLANNING-BRIEF-NO-SOURCE: sourcePath is required');

    const resolvedSource = path.resolve(sourcePath);
    const stat = await fs.stat(resolvedSource).catch(() => null);
    if (!stat?.isFile()) throw new Error(`PLANNING-BRIEF-SOURCE-MISSING: ${resolvedSource}`);

    const sourceFilename = input.displayFilename
      ? sanitizeFilenamePart(input.displayFilename)
      : path.basename(resolvedSource);
    if (!sourceFilename) throw new Error('PLANNING-BRIEF-NO-FILENAME: displayFilename is required');
    assertPlanningBriefFilename(sourceFilename);

    const root = await rootForId(projectId);
    const project = await readProject(root);

    // 1) Parse via existing parser.
    const parsed = await parseStrategyDocument(resolvedSource);
    if (!parsed.rawText || !parsed.rawText.trim()) {
      throw new Error('PLANNING-BRIEF-PARSE-FAILED: empty text');
    }

    // 2) Compute content hash.
    const contentHash = planningBriefContentHash(parsed.rawText);
    const sourceId = buildPlanningBriefSourceId(projectId, contentHash);

    // 3) Dedupe by sourceId.
    const existing = (project.planningBriefFiles ?? []).find((record) => record.sourceId === sourceId);
    if (existing) return existing;

    // 4) Persist file under hash-based name inside project root.
    const extension = path.extname(sourceFilename).toLowerCase();
    const relativePath = planningBriefRelativePath(contentHash, extension);
    const destination = assertInside(root, path.join(root, relativePath));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(resolvedSource, destination);

    // 5) Build record.
    const registeredAt = new Date().toISOString();
    const record = buildPlanningBriefRecord({
      projectId,
      filename: sourceFilename,
      relativePath,
      rawText: parsed.rawText,
      registeredAt
    });
    // Defensive: assert sourceId matches what we computed.
    if (record.sourceId !== sourceId) {
      throw new Error('PLANNING-BRIEF-SOURCEID-MISMATCH: buildPlanningBriefRecord produced a divergent sourceId');
    }

    // 6) Persist project.
    const next = (project.planningBriefFiles ?? []).concat(record);
    await writeProject(root, { ...project, planningBriefFiles: next });
    return record;
  }

  /**
   * Register a planning brief from raw bytes already in memory.
   * Used by tests + Web upload paths where the source file is not
   * on disk under a known path.
   *
   * The function writes the bytes to a temp file, calls the same
   * parseStrategyDocument path, and then cleans up the temp file.
   */
  async function registerPlanningBriefFromBytes(input: {
    projectId: string;
    bytes: Buffer;
    displayFilename: string;
  }): Promise<ProjectPlanningBriefRecord> {
    const { projectId, bytes, displayFilename } = input;
    if (!projectId) throw new Error('PLANNING-BRIEF-NO-PROJECT: projectId is required');
    if (!Buffer.isBuffer(bytes)) throw new Error('PLANNING-BRIEF-NO-BYTES: bytes must be a Buffer');
    const filename = sanitizeFilenamePart(displayFilename);
    if (!filename) throw new Error('PLANNING-BRIEF-NO-FILENAME: displayFilename is required');
    assertPlanningBriefFilename(filename);
    const extension = path.extname(filename).toLowerCase();
    if (!PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has(extension)) {
      throw new Error(`PLANNING-BRIEF-UNSUPPORTED-EXT: ${extension}`);
    }

    const root = await rootForId(projectId);
    const project = await readProject(root);

    // Write to a temp file so parseStrategyDocument can read it
    // (which expects a filename on disk).
    const tempDir = assertInside(root, path.join(root, 'runtime'));
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilename = `.planning-brief-tmp-${crypto.randomUUID()}${extension}`;
    const tempPath = assertInside(tempDir, path.join(tempDir, tempFilename));
    try {
      await fs.writeFile(tempPath, bytes);
      // Parse + dedupe.
      const parsed = await parseStrategyDocument(tempPath);
      if (!parsed.rawText || !parsed.rawText.trim()) {
        throw new Error('PLANNING-BRIEF-PARSE-FAILED: empty text');
      }
      const contentHash = planningBriefContentHash(parsed.rawText);
      const sourceId = buildPlanningBriefSourceId(projectId, contentHash);
      const existing = (project.planningBriefFiles ?? []).find((record) => record.sourceId === sourceId);
      if (existing) return existing;

      const relativePath = planningBriefRelativePath(contentHash, extension);
      const destination = assertInside(root, path.join(root, relativePath));
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(tempPath, destination);

      const registeredAt = new Date().toISOString();
      const record = buildPlanningBriefRecord({
        projectId,
        filename,
        relativePath,
        rawText: parsed.rawText,
        registeredAt
      });
      if (record.sourceId !== sourceId) {
        throw new Error('PLANNING-BRIEF-SOURCEID-MISMATCH: buildPlanningBriefRecord produced a divergent sourceId');
      }
      const next = (project.planningBriefFiles ?? []).concat(record);
      await writeProject(root, { ...project, planningBriefFiles: next });
      return record;
    } finally {
      await fs.rm(tempPath, { force: true });
    }
  }

  /**
   * Remove a planning brief by sourceId. Deletes the on-disk file
   * and removes the metadata row. Idempotent: removing a missing
   * sourceId is a no-op (no error).
   */
  async function removePlanningBrief(projectId: string, sourceId: string): Promise<ProjectRecord> {
    if (!projectId) throw new Error('PLANNING-BRIEF-NO-PROJECT: projectId is required');
    if (!sourceId) throw new Error('PLANNING-BRIEF-NO-SOURCEID: sourceId is required');
    const root = await rootForId(projectId);
    const project = await readProject(root);
    const records = project.planningBriefFiles ?? [];
    const target = records.find((record) => record.sourceId === sourceId);
    if (!target) {
      // Idempotent: sourceId not present.
      return project;
    }
    const absolute = assertInside(root, path.join(root, target.relativePath));
    await fs.rm(absolute, { force: true });
    const next = records.filter((record) => record.sourceId !== sourceId);
    return writeProject(root, { ...project, planningBriefFiles: next });
  }

  /**
   * List planning brief records on a project.
   */
  async function listPlanningBriefs(projectId: string): Promise<ProjectPlanningBriefRecord[]> {
    if (!projectId) throw new Error('PLANNING-BRIEF-NO-PROJECT: projectId is required');
    const root = await rootForId(projectId);
    const project = await readProject(root);
    return [...(project.planningBriefFiles ?? [])];
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

  return {
    create,
    list,
    get,
    update,
    scan,
    importFiles,
    importFileBytes,
    removeAsset,
    removeBatch,
    clearAssets,
    // CI-W1C.7.4-R1 — planning brief registration surface.
    registerPlanningBriefFromPath,
    registerPlanningBriefFromBytes,
    removePlanningBrief,
    listPlanningBriefs,
    remove,
    paths
  };
}

export type ProjectStore = ReturnType<typeof createProjectStore>;
