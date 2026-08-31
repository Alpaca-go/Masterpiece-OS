import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { CuratedReferenceItem } from './creative-research/contracts.ts';
import type { CreativeResearchSessionRepository, ReferenceResearchRepository } from './creative-research/ports.ts';
import { assertInside } from './analysis-contract.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';

const MIME_BY_EXTENSION = new Map<string, CuratedReferenceItem['mimeType']>([
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'], ['.webp', 'image/webp'],
] as const);
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_BATCH_FILES = 30;
const MAX_SESSION_FILES = 50;

function safeIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value)) throw new Error(`${label} 无效`);
  return value;
}

function safeName(value: string): string {
  return path.basename(String(value || '')).replace(/[<>:"/\\|?*\x00-\x1F]/gu, '_').slice(0, 180) || 'reference';
}

export interface CuratedReferenceImportFile {
  path: string;
  originalFileName?: string;
  sourceUrl?: string;
  sourceLabel?: string;
}

export function createCreativeResearchCuratedReferenceService(options: {
  readDefaultDataPath(): string | Promise<string>;
  sessions: CreativeResearchSessionRepository;
  references: ReferenceResearchRepository;
  now?: () => string;
  createId?: () => string;
}) {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || randomUUID;
  const sessionRoot = async (sessionId: string) => {
    const root = path.join(path.resolve(await options.readDefaultDataPath()), 'creative-research');
    return assertInside(root, path.join(root, safeIdentifier(sessionId, 'Session ID')));
  };
  async function requireWritableSession(sessionId: string) {
    const session = await options.sessions.get(sessionId);
    if (!session) throw new Error(`Creative Research Session 不存在：${sessionId}`);
    if (session.status !== 'RESEARCH') throw new Error('精选参考只能在 RESEARCH 阶段导入或删除');
    return session;
  }
  async function listCuratedReferences(sessionId: string): Promise<CuratedReferenceItem[]> {
    if (!await options.sessions.get(sessionId)) throw new Error(`Creative Research Session 不存在：${sessionId}`);
    return (await options.references.listSessionReferences(sessionId))
      .filter((item): item is CuratedReferenceItem => item.sourceType === 'CURATED_REFERENCE');
  }
  async function importCuratedReferences(sessionId: string, files: CuratedReferenceImportFile[]): Promise<CuratedReferenceItem[]> {
    await requireWritableSession(sessionId);
    if (!Array.isArray(files) || files.length === 0) throw new Error('请选择至少一张参考图');
    if (files.length > MAX_BATCH_FILES) throw new Error(`每次最多导入 ${MAX_BATCH_FILES} 张参考图`);
    const existing = await listCuratedReferences(sessionId);
    if (existing.length + files.length > MAX_SESSION_FILES) throw new Error(`单个 Session 最多保留 ${MAX_SESSION_FILES} 张参考图`);
    const hashes = new Set(existing.map((item) => item.contentHash));
    const imported: CuratedReferenceItem[] = [];
    for (const file of files) {
      const source = path.resolve(String(file.path || ''));
      const extension = path.extname(source).toLowerCase();
      const mimeType = MIME_BY_EXTENSION.get(extension);
      if (!mimeType) throw new Error('图片格式不支持；仅支持 JPG / JPEG / PNG / WEBP');
      const stat = await fs.stat(source);
      if (!stat.isFile() || stat.size === 0) throw new Error(`参考图为空：${safeName(file.originalFileName || source)}`);
      if (stat.size > MAX_FILE_BYTES) throw new Error(`参考图超过 20 MiB：${safeName(file.originalFileName || source)}`);
      const content = await fs.readFile(source);
      const contentHash = createHash('sha256').update(content).digest('hex');
      if (hashes.has(contentHash)) continue;
      hashes.add(contentHash);
      const id = createId();
      const root = await sessionRoot(sessionId);
      const referenceRoot = assertInside(root, path.join(root, 'curated-references', safeIdentifier(id, 'Reference ID')));
      const destination = assertInside(referenceRoot, path.join(referenceRoot, `original${extension}`));
      await fs.mkdir(referenceRoot, { recursive: true });
      await fs.copyFile(source, destination);
      const timestamp = now();
      const reference: CuratedReferenceItem = {
        id, sessionId, sourceType: 'CURATED_REFERENCE', title: safeName(file.originalFileName || source), tags: [],
        originalFileName: safeName(file.originalFileName || source), localPath: destination, mimeType,
        ...(file.sourceUrl?.trim() ? { sourceUrl: file.sourceUrl.trim() } : {}),
        ...(file.sourceLabel?.trim() ? { sourceLabel: file.sourceLabel.trim() } : {}),
        importedAt: timestamp, createdAt: timestamp, contentHash,
        cachedImageUrl: `/_masterpiece/creative-research/${encodeURIComponent(sessionId)}/curated-references/${encodeURIComponent(id)}/image`,
      };
      const result = await atomicWriteJsonWithRetry(path.join(referenceRoot, 'metadata.json'), reference);
      if (!result.success) throw new Error(`参考图元数据写入失败：${result.errorMessage || result.errorCode || 'unknown error'}`);
      await options.references.storeReference(reference);
      imported.push(reference);
    }
    return imported;
  }
  async function removeCuratedReference(sessionId: string, referenceId: string): Promise<boolean> {
    await requireWritableSession(sessionId);
    const reference = await options.references.getReference(sessionId, referenceId);
    if (!reference || reference.sourceType !== 'CURATED_REFERENCE') return false;
    const selection = (await options.references.listSelections(sessionId)).find((item) => item.referenceId === referenceId);
    if (selection && selection.state !== 'NONE') throw new Error('该参考已进入 Evidence，清除判断后才能删除');
    if (!options.references.removeReference) throw new Error('当前 Reference Store 不支持删除');
    await fs.rm(path.dirname(reference.localPath), { recursive: true, force: true });
    return options.references.removeReference(sessionId, referenceId);
  }
  async function updateCuratedReferenceSource(sessionId: string, referenceId: string, input: { sourceUrl?: string; sourceLabel?: string }): Promise<CuratedReferenceItem> {
    await requireWritableSession(sessionId);
    const reference = await options.references.getReference(sessionId, referenceId);
    if (!reference || reference.sourceType !== 'CURATED_REFERENCE') throw new Error(`精选 Reference 不存在：${referenceId}`);
    const sourceUrl = String(input.sourceUrl || '').trim();
    if (sourceUrl) {
      const url = new URL(sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('来源 URL 只支持 HTTP / HTTPS');
    }
    const sourceLabel = String(input.sourceLabel || '').trim().slice(0, 160);
    const updated: CuratedReferenceItem = {
      ...reference,
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(sourceLabel ? { sourceLabel } : {}),
    };
    if (!sourceUrl) delete updated.sourceUrl;
    if (!sourceLabel) delete updated.sourceLabel;
    const result = await atomicWriteJsonWithRetry(path.join(path.dirname(reference.localPath), 'metadata.json'), updated);
    if (!result.success) throw new Error(`参考来源写入失败：${result.errorMessage || result.errorCode || 'unknown error'}`);
    return await options.references.storeReference(updated) as CuratedReferenceItem;
  }
  return Object.freeze({ listCuratedReferences, importCuratedReferences, removeCuratedReference, updateCuratedReferenceSource });
}

export type CreativeResearchCuratedReferenceService = ReturnType<typeof createCreativeResearchCuratedReferenceService>;
