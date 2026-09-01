import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  VisualMigrationReferencePackV1,
  VisualMigrationReferencePackReferenceV1,
} from '@masterpiece/project-contracts/index.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { ReferenceAnchorService } from './reference-anchor-service.ts';
import {
  VISUAL_MIGRATION_REFERENCE_PACK_SCHEMA,
  buildVisualMigrationReferencePackId,
  canonicalSerializeVisualMigrationValue,
  computeVisualMigrationManifestFingerprint,
  computeVisualMigrationSourceFingerprint,
  sha256Fingerprint,
  validateVisualMigrationReferencePackV1,
} from './visual-migration-reference-pack-contract.ts';

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};
const PACK_ID_PATTERN = /^vmrp-[a-f0-9]{32}$/u;

function packError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function inside(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw packError('VISUAL_MIGRATION_REFERENCE_PACK_PATH_INVALID', 'Reference Pack 路径越界。');
  }
  return resolved;
}

async function hashFile(filename: string): Promise<string> {
  const bytes = await fs.readFile(filename);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw packError('VISUAL_MIGRATION_REFERENCE_PACK_WRITE_FAILED', `Reference Pack 写入失败：${result.errorMessage}`);
  }
}

export function createVisualMigrationReferencePackService(
  projects: ProjectStore,
  referenceAnchors: ReferenceAnchorService,
) {
  async function locations(projectId: string, referencePackId?: string) {
    const projectRoot = (await projects.paths(projectId)).root;
    const packsRoot = inside(projectRoot, path.join(projectRoot, 'visual-migration', 'reference-packs'));
    if (!referencePackId) return { projectRoot, packsRoot };
    if (!PACK_ID_PATTERN.test(referencePackId)) {
      throw packError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'referencePackId 格式无效。');
    }
    const packRoot = inside(packsRoot, path.join(packsRoot, referencePackId));
    return { projectRoot, packsRoot, packRoot, manifest: path.join(packRoot, 'manifest.json') };
  }

  async function resolve(projectId: string, referencePackId: string) {
    const target = await locations(projectId, referencePackId);
    const raw = JSON.parse(await fs.readFile(target.manifest!, 'utf8'));
    const manifest = validateVisualMigrationReferencePackV1(raw);
    if (manifest.projectId !== projectId || manifest.referencePackId !== referencePackId) {
      throw packError('VISUAL_MIGRATION_REFERENCE_PACK_PROJECT_MISMATCH', 'Reference Pack 与项目或 Pack ID 不匹配。');
    }
    const resolvedReferences = [];
    for (const reference of manifest.references) {
      const absolutePath = inside(target.projectRoot, path.join(target.projectRoot, reference.storagePath));
      inside(target.packRoot!, absolutePath);
      const actualPath = await fs.realpath(absolutePath).catch(() => null);
      if (!actualPath || inside(target.packRoot!, actualPath) !== actualPath) {
        throw packError('VISUAL_MIGRATION_REFERENCE_PACK_PATH_INVALID', `Reference evidence 路径无效：${reference.referenceId}`);
      }
      const stat = await fs.stat(actualPath).catch(() => null);
      if (!stat?.isFile() || stat.size !== reference.byteSize) {
        throw packError('VISUAL_MIGRATION_REFERENCE_PACK_INTEGRITY_FAILED', `Reference evidence 缺失或大小不匹配：${reference.referenceId}`);
      }
      if (await hashFile(actualPath) !== reference.sha256) {
        throw packError('VISUAL_MIGRATION_REFERENCE_PACK_INTEGRITY_FAILED', `Reference evidence SHA-256 不匹配：${reference.referenceId}`);
      }
      resolvedReferences.push({ ...reference, absolutePath: actualPath });
    }
    return { manifest, references: resolvedReferences };
  }

  async function findExistingForRun(projectId: string, runId: string): Promise<VisualMigrationReferencePackV1 | null> {
    const target = await locations(projectId);
    const entries = await fs.readdir(target.packsRoot, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || !PACK_ID_PATTERN.test(entry.name)) continue;
      const manifestPath = inside(target.packsRoot, path.join(target.packsRoot, entry.name, 'manifest.json'));
      const raw = await fs.readFile(manifestPath, 'utf8').then(JSON.parse).catch(() => null);
      if (raw?.sourceReferenceAnchorRunId === runId) {
        return validateVisualMigrationReferencePackV1(raw);
      }
    }
    return null;
  }

  async function createOrGet(projectId: string, referenceAnchorRunId: string) {
    if (!String(projectId || '').trim()) {
      throw packError('VISUAL_MIGRATION_PROJECT_REQUIRED', '交接到视觉生产前必须选择项目。');
    }
    const run = await referenceAnchors.getRun(referenceAnchorRunId).catch((error) => {
      throw packError('VISUAL_MIGRATION_SOURCE_RUN_MISSING', `Reference Anchor Run 不存在：${(error as Error).message}`);
    });
    if (run.projectId !== projectId) {
      throw packError('VISUAL_MIGRATION_PROJECT_MISMATCH', 'Reference Anchor Run 不属于当前项目。');
    }
    if (run.decision !== 'approved' || ['failed', 'rejected', 'cancelled'].includes(run.status)) {
      throw packError('VISUAL_MIGRATION_SOURCE_NOT_APPROVED', '仅可交接已通过且状态有效的 Reference Anchor Run。');
    }

    const runRoot = await referenceAnchors.runRoot(referenceAnchorRunId);
    const sourceRoot = inside(runRoot, path.join(runRoot, 'input', 'reference-assets'));
    const realSourceRoot = await fs.realpath(sourceRoot).catch(() => null);
    if (!realSourceRoot) {
      throw packError('VISUAL_MIGRATION_REFERENCE_ASSETS_MISSING', 'Reference Anchor 原始参考图目录不存在。');
    }
    const entries = (await fs.readdir(realSourceRoot, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!entries.length) {
      throw packError('VISUAL_MIGRATION_REFERENCE_ASSETS_MISSING', 'Reference Anchor 中没有可交接的参考图。');
    }

    const sources: Array<{ sourcePath: string; originalFileName: string; extension: string; byteSize: number; sha256: string }> = [];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]!;
      const extension = path.extname(entry.name).toLowerCase();
      if (!IMAGE_MIME_TYPES[extension]) {
        throw packError('VISUAL_MIGRATION_REFERENCE_ASSET_UNSUPPORTED', `不支持的参考图格式：${entry.name}`);
      }
      const sourcePath = await fs.realpath(path.join(realSourceRoot, entry.name));
      inside(realSourceRoot, sourcePath);
      const stat = await fs.stat(sourcePath);
      if (!stat.isFile() || stat.size < 1) {
        throw packError('VISUAL_MIGRATION_REFERENCE_ASSET_UNREADABLE', `参考图不可读取：${entry.name}`);
      }
      sources.push({
        sourcePath,
        originalFileName: run.referenceAssetNames[index] || entry.name.replace(/^\d{2}-/u, ''),
        extension,
        byteSize: stat.size,
        sha256: await hashFile(sourcePath),
      });
    }

    const [capsule, brief] = await Promise.all([
      referenceAnchors.getCapsule(referenceAnchorRunId),
      referenceAnchors.getBrief(referenceAnchorRunId),
    ]);
    const capsuleFingerprint = sha256Fingerprint(canonicalSerializeVisualMigrationValue(capsule));
    const briefFingerprint = sha256Fingerprint(brief);
    const sourceFingerprint = computeVisualMigrationSourceFingerprint({
      projectId,
      sourceReferenceAnchorRunId: referenceAnchorRunId,
      referenceSha256: sources.map((source) => source.sha256),
      capsuleFingerprint,
      briefFingerprint,
    });

    const existing = await findExistingForRun(projectId, referenceAnchorRunId);
    if (existing) {
      if (existing.sourceFingerprint !== sourceFingerprint) {
        throw packError('VISUAL_MIGRATION_REFERENCE_SOURCE_MUTATED', '已交接 Reference Anchor Run 的源证据发生变化，拒绝覆盖不可变 Pack。');
      }
      const resolved = await resolve(projectId, existing.referencePackId);
      return { ...resolved, created: false };
    }

    const referencePackId = buildVisualMigrationReferencePackId({
      projectId,
      sourceReferenceAnchorRunId: referenceAnchorRunId,
      sourceFingerprint,
    });
    const target = await locations(projectId, referencePackId);
    await fs.mkdir(target.packsRoot, { recursive: true });
    const tempRoot = inside(target.packsRoot, path.join(target.packsRoot, `.tmp-${referencePackId}-${crypto.randomUUID()}`));
    const tempAssets = path.join(tempRoot, 'assets');
    await fs.mkdir(tempAssets, { recursive: true });
    try {
      const references: VisualMigrationReferencePackReferenceV1[] = [];
      for (let index = 0; index < sources.length; index += 1) {
        const source = sources[index]!;
        const referenceId = `reference-${String(index + 1).padStart(2, '0')}-${source.sha256.slice(0, 16)}`;
        const assetFilename = `${referenceId}${source.extension === '.jpeg' ? '.jpg' : source.extension}`;
        const tempDestination = inside(tempRoot, path.join(tempAssets, assetFilename));
        await fs.copyFile(source.sourcePath, tempDestination);
        if (await hashFile(tempDestination) !== source.sha256) {
          throw packError('VISUAL_MIGRATION_REFERENCE_PACK_COPY_FAILED', `参考图复制校验失败：${source.originalFileName}`);
        }
        references.push({
          referenceId,
          storagePath: ['visual-migration', 'reference-packs', referencePackId, 'assets', assetFilename].join('/'),
          originalFileName: path.basename(source.originalFileName),
          mimeType: IMAGE_MIME_TYPES[source.extension]!,
          byteSize: source.byteSize,
          sha256: source.sha256,
          role: 'style_reference',
          authority: null,
          transferableDimensions: [],
          forbiddenDimensions: [],
        });
      }
      const withoutFingerprint: Omit<VisualMigrationReferencePackV1, 'manifestFingerprint'> = {
        schemaVersion: VISUAL_MIGRATION_REFERENCE_PACK_SCHEMA,
        referencePackId,
        projectId,
        sourceReferenceAnchorRunId: referenceAnchorRunId,
        createdAt: new Date().toISOString(),
        sourceFingerprint,
        references,
        semanticEvidence: {
          capsuleFingerprint,
          briefFingerprint,
          creativeDecisionId: `creative-decision-quick-${referenceAnchorRunId}`,
        },
      };
      const manifest: VisualMigrationReferencePackV1 = {
        ...withoutFingerprint,
        manifestFingerprint: computeVisualMigrationManifestFingerprint(withoutFingerprint),
      };
      validateVisualMigrationReferencePackV1(manifest);
      await writeJson(path.join(tempRoot, 'manifest.json'), manifest);
      await fs.rename(tempRoot, target.packRoot!).catch(async (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST' && error.code !== 'ENOTEMPTY') throw error;
      });
      const resolved = await resolve(projectId, referencePackId);
      return { ...resolved, created: true };
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  return { createOrGet, resolve };
}

export type VisualMigrationReferencePackService = ReturnType<typeof createVisualMigrationReferencePackService>;
