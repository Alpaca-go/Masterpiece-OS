import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { LockedAsset, ProjectVisualContext } from '../../../../packages/project-contracts/src/index.ts';
import {
  compileLockedAssets,
  validateLockedAsset,
  validateLockedAssetCollection,
} from '../../../../packages/creative-production-runtime/src/locked-assets.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';

interface CompileLockedAssetsInput {
  visualContext?: ProjectVisualContext;
  understanding?: {
    assetReadingSummary?: Array<{
      assetId: string;
      recommendedUsage: string;
    }>;
  };
  explicitAssets?: unknown[];
}

interface LockedAssetIndex {
  schemaVersion: '6.0';
  projectId: string;
  assetIds: string[];
  updatedAt: string;
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(`Locked Assets 保存失败：${result.errorMessage}`), { code: 'STATE_PERSIST_FAILED' });
  }
}

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8')) as T;
  } catch {
    return null;
  }
}

function inside(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw Object.assign(new Error('Locked Asset 文件路径越界。'), { code: 'LOCKED_ASSET_PATH_INVALID' });
  }
  return resolved;
}

export function createLockedAssetsService(projects: ProjectStore, sessions: CreativeSessionService) {
  async function locations(projectId: string) {
    const root = (await projects.paths(projectId)).root;
    const lockedRoot = path.join(root, 'locked-assets');
    return {
      projectRoot: root,
      inputRoot: path.join(root, 'input'),
      root: lockedRoot,
      items: path.join(lockedRoot, 'items'),
      thumbnails: path.join(lockedRoot, 'thumbnails'),
      index: path.join(lockedRoot, 'index.json'),
    };
  }

  async function list(projectId: string): Promise<LockedAsset[]> {
    const target = await locations(projectId);
    const index = await readJson<LockedAssetIndex>(target.index);
    if (!index || index.projectId !== projectId) return [];
    const items = await Promise.all(index.assetIds.map((id) =>
      readJson<LockedAsset>(path.join(target.items, `${id}.json`))));
    if (items.some((item) => !item)) {
      throw Object.assign(new Error('Locked Assets 索引引用了缺失或损坏的条目。'), {
        code: 'LOCKED_ASSET_INDEX_INVALID',
      });
    }
    return validateLockedAssetCollection(items.filter((item): item is LockedAsset => Boolean(item))) as LockedAsset[];
  }

  async function get(projectId: string, assetId: string): Promise<LockedAsset | null> {
    const active = await list(projectId);
    return active.find((asset) => asset.id === assetId) ?? null;
  }

  async function createThumbnail(
    target: Awaited<ReturnType<typeof locations>>,
    asset: LockedAsset,
  ): Promise<LockedAsset> {
    if (!asset.sourceFile || !/\.(?:png|jpe?g|webp)$/iu.test(asset.sourceFile)) return asset;
    const source = inside(target.inputRoot, path.join(target.inputRoot, asset.sourceFile));
    const stat = await fs.stat(source).catch(() => null);
    if (!stat?.isFile()) return asset;
    await fs.mkdir(target.thumbnails, { recursive: true });
    const filename = `${asset.id}.webp`;
    const destination = inside(target.thumbnails, path.join(target.thumbnails, filename));
    const temporary = `${destination}.tmp`;
    try {
      await sharp(source).rotate().resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(temporary);
      await fs.rename(temporary, destination);
      return validateLockedAsset({
        ...asset,
        thumbnail: path.relative(target.projectRoot, destination).replaceAll('\\', '/'),
      }) as LockedAsset;
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => {});
      throw Object.assign(new Error(`Locked Asset 缩略图生成失败：${error instanceof Error ? error.message : String(error)}`), {
        code: 'LOCKED_ASSET_THUMBNAIL_FAILED',
      });
    }
  }

  async function compile(projectId: string, input: CompileLockedAssetsInput = {}): Promise<LockedAsset[]> {
    const [project, existing] = await Promise.all([
      projects.get(projectId),
      list(projectId),
    ]);
    const target = await locations(projectId);
    const logoAssetIds = project.assets
      .filter((asset) => project.logoFiles.includes(asset.relativePath)
        || /logo|标志|标识|标准字/iu.test(asset.originalName))
      .map((asset) => asset.id);
    const baseVisualContext = input.visualContext ?? {
      projectId,
      identity: { brandName: project.brandName },
      lockedAssets: {
        logoLocked: project.logoLocked,
        logoAssetIds,
        lockedFacts: project.lockedFacts,
      },
      products: { coreProducts: [] },
      packaging: { status: 'unknown', structures: [] },
    };
    const identityReferenceIds = (input.understanding?.assetReadingSummary ?? [])
      .filter((item) => item.recommendedUsage === 'identity_reference')
      .map((item) => item.assetId)
      .filter((id) => project.assets.some((asset) => asset.id === id));
    const visualContext = {
      ...baseVisualContext,
      lockedAssets: {
        ...baseVisualContext.lockedAssets,
        logoAssetIds: baseVisualContext.lockedAssets.logoAssetIds?.length
          ? baseVisualContext.lockedAssets.logoAssetIds
          : identityReferenceIds.slice(0, 1),
      },
    };
    const existingById = new Map(existing.map((asset) => [asset.id, asset]));
    const compiled = compileLockedAssets({
      projectId,
      visualContext,
      understanding: input.understanding,
      explicitAssets: input.explicitAssets,
      sourceAssets: project.assets.map((asset) => ({
        id: asset.id,
        name: asset.originalName,
        sourceFile: asset.relativePath,
      })),
    }).map((asset: LockedAsset) => ({
      ...asset,
      createdAt: existingById.get(asset.id)?.createdAt ?? asset.createdAt,
    }));

    await Promise.all([target.items, target.thumbnails].map((directory) => fs.mkdir(directory, { recursive: true })));
    const withThumbnails: LockedAsset[] = [];
    for (const asset of compiled) {
      withThumbnails.push(await createThumbnail(target, asset));
    }
    await Promise.all(withThumbnails.map((asset) =>
      writeJson(path.join(target.items, `${asset.id}.json`), asset)));
    const now = new Date().toISOString();
    await writeJson(target.index, {
      schemaVersion: '6.0',
      projectId,
      assetIds: withThumbnails.map((asset) => asset.id),
      updatedAt: now,
    } satisfies LockedAssetIndex);
    await sessions.setLockedAssets(projectId, withThumbnails.map((asset) => asset.id));
    return withThumbnails;
  }

  async function save(projectId: string, asset: LockedAsset): Promise<LockedAsset> {
    const validated = validateLockedAsset(asset) as LockedAsset;
    if (validated.projectId !== projectId) {
      throw Object.assign(new Error('Locked Asset 与项目不匹配。'), { code: 'LOCKED_ASSET_INVALID' });
    }
    const target = await locations(projectId);
    const current = await list(projectId);
    const enriched = await createThumbnail(target, validated);
    const next = [...current.filter((item) => item.id !== enriched.id), enriched];
    await fs.mkdir(target.items, { recursive: true });
    await writeJson(path.join(target.items, `${enriched.id}.json`), enriched);
    await writeJson(target.index, {
      schemaVersion: '6.0',
      projectId,
      assetIds: next.map((item) => item.id),
      updatedAt: enriched.updatedAt,
    } satisfies LockedAssetIndex);
    await sessions.setLockedAssets(projectId, next.map((item) => item.id));
    return enriched;
  }

  return { compile, save, get, list };
}

export type LockedAssetsService = ReturnType<typeof createLockedAssetsService>;
