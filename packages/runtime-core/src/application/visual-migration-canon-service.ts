import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  LockedAsset,
  ReferenceStyleCapsule,
  StyleProfile,
  VisualMigrationCanonPointerV1,
  VisualMigrationCanonV1,
} from '@masterpiece/project-contracts/index.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { VisualMigrationReferencePackService } from './visual-migration-reference-pack-service.ts';
import { buildVisualMigrationCanon } from './visual-migration-canon-builder.ts';
import {
  VISUAL_MIGRATION_CANON_POINTER_SCHEMA,
  validateVisualMigrationCanonPointerV1,
  validateVisualMigrationCanonV1,
} from './visual-migration-canon-contract.ts';

const CANON_ID_PATTERN = /^vmc-[a-f0-9]{32}$/u;

export interface CreateVisualMigrationCanonInput {
  projectId: string;
  referenceAnchorRunId: string;
  referencePackId: string;
  capsule: ReferenceStyleCapsule;
  styleProfile: StyleProfile;
  lockedAssets: LockedAsset[];
}

export interface VisualMigrationCanonPersistenceOptions {
  readJson?: (filename: string) => Promise<unknown | null>;
  writeJson?: (filename: string, value: unknown) => Promise<void>;
}

function canonError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function inside(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw canonError('VISUAL_MIGRATION_CANON_PATH_INVALID', 'Visual Migration Canon 路径越界。');
  }
  return resolved;
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', `Visual Migration Canon 写入失败：${result.errorMessage}`);
  }
}

async function readJson(filename: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', `Visual Migration Canon JSON 损坏：${filename}`);
  }
}

export function createVisualMigrationCanonService(
  projects: ProjectStore,
  referencePacks: VisualMigrationReferencePackService,
  persistence: VisualMigrationCanonPersistenceOptions = {},
) {
  const loadJson = persistence.readJson ?? readJson;
  const persistJson = persistence.writeJson ?? writeJson;

  async function locations(projectId: string, canonId?: string) {
    const projectRoot = (await projects.paths(projectId)).root;
    const canonsRoot = inside(projectRoot, path.join(projectRoot, 'visual-migration', 'canons'));
    const active = inside(canonsRoot, path.join(canonsRoot, 'active.json'));
    if (!canonId) return { projectRoot, canonsRoot, active };
    if (!CANON_ID_PATTERN.test(canonId)) {
      throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'canonId 格式无效。');
    }
    const canonRoot = inside(canonsRoot, path.join(canonsRoot, canonId));
    return { projectRoot, canonsRoot, active, canonRoot, canonFile: path.join(canonRoot, 'canon.json') };
  }

  async function readPointer(projectId: string): Promise<VisualMigrationCanonPointerV1 | null> {
    const target = await locations(projectId);
    const raw = await loadJson(target.active);
    if (!raw) return null;
    const pointer = validateVisualMigrationCanonPointerV1(raw);
    if (pointer.projectId !== projectId) {
      throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Canon active pointer 与项目不匹配。');
    }
    return pointer;
  }

  async function resolve(projectId: string, canonId: string) {
    const target = await locations(projectId, canonId);
    const raw = await loadJson(target.canonFile!);
    if (!raw) throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', `Visual Migration Canon 不存在：${canonId}`);
    const canon = validateVisualMigrationCanonV1(raw);
    if (canon.projectId !== projectId || canon.canonId !== canonId) {
      throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Visual Migration Canon 与项目或 Canon ID 不匹配。');
    }
    const referencePack = await referencePacks.resolve(projectId, canon.source.referencePackId).catch((error) => {
      throw canonError(
        'VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID',
        `Visual Migration Canon 的 Reference Pack 无法验证：${(error as Error).message}`,
      );
    });
    if (referencePack.manifest.sourceReferenceAnchorRunId !== canon.source.sourceReferenceAnchorRunId
      || referencePack.manifest.sourceFingerprint !== canon.source.referencePackSourceFingerprint
      || referencePack.manifest.manifestFingerprint !== canon.source.referencePackManifestFingerprint
      || referencePack.manifest.references.length !== canon.source.referenceCount) {
      throw canonError('VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID', 'Canon 与 Reference Pack evidence linkage 不一致。');
    }
    return { canon, referencePack: referencePack.manifest, references: referencePack.references };
  }

  async function getActive(projectId: string) {
    const pointer = await readPointer(projectId);
    if (!pointer) return null;
    const resolved = await resolve(projectId, pointer.canonId);
    if (resolved.canon.sourceFingerprint !== pointer.sourceFingerprint
      || resolved.canon.canonFingerprint !== pointer.canonFingerprint) {
      throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Active Canon pointer fingerprint 或生命周期不一致。');
    }
    return resolved;
  }

  async function createOrGet(input: CreateVisualMigrationCanonInput) {
    const [project, packResolution] = await Promise.all([
      projects.get(input.projectId),
      referencePacks.resolve(input.projectId, input.referencePackId).catch((error) => {
        throw canonError(
          'VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID',
          `Canon build 前 Reference Pack 完整性验证失败：${(error as Error).message}`,
        );
      }),
    ]);
    const built = buildVisualMigrationCanon({
      projectId: input.projectId,
      referenceAnchorRunId: input.referenceAnchorRunId,
      referencePack: packResolution.manifest,
      capsule: input.capsule,
      styleProfile: input.styleProfile,
      lockedAssets: input.lockedAssets,
      project,
    });
    const target = await locations(input.projectId, built.canonId);
    const active = await readPointer(input.projectId);
    if (active) {
      const activeCanon = await resolve(input.projectId, active.canonId);
      if (activeCanon.canon.sourceFingerprint !== active.sourceFingerprint
        || activeCanon.canon.canonFingerprint !== active.canonFingerprint) {
        throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', '现有 active Canon pointer 无法恢复。');
      }
    }
    const existingRaw = await loadJson(target.canonFile!);
    let canon = built;
    let created = true;
    if (existingRaw) {
      const existing = validateVisualMigrationCanonV1(existingRaw);
      if (existing.projectId !== input.projectId || existing.canonId !== built.canonId
        || existing.sourceFingerprint !== built.sourceFingerprint
        || existing.canonFingerprint !== built.canonFingerprint) {
        throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Deterministic Canon ID 已存在但内容不一致。');
      }
      canon = existing;
      created = false;
    } else {
      await persistJson(target.canonFile!, canon);
      const persisted = await loadJson(target.canonFile!);
      if (!persisted) {
        throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', '新 Canon 写入后无法读取。');
      }
      const verified = validateVisualMigrationCanonV1(persisted);
      if (verified.canonId !== canon.canonId
        || verified.sourceFingerprint !== canon.sourceFingerprint
        || verified.canonFingerprint !== canon.canonFingerprint) {
        throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', '新 Canon 写入后完整性不一致。');
      }
      canon = verified;
    }

    const pointer: VisualMigrationCanonPointerV1 = {
      schemaVersion: VISUAL_MIGRATION_CANON_POINTER_SCHEMA,
      projectId: input.projectId,
      canonId: canon.canonId,
      sourceFingerprint: canon.sourceFingerprint,
      canonFingerprint: canon.canonFingerprint,
      updatedAt: canon.updatedAt,
    };
    validateVisualMigrationCanonPointerV1(pointer);
    if (!active || active.canonId !== pointer.canonId
      || active.sourceFingerprint !== pointer.sourceFingerprint
      || active.canonFingerprint !== pointer.canonFingerprint) {
      await persistJson(target.active, pointer);
      const activated = await readPointer(input.projectId);
      if (!activated || activated.canonId !== pointer.canonId
        || activated.sourceFingerprint !== pointer.sourceFingerprint
        || activated.canonFingerprint !== pointer.canonFingerprint) {
        throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Canon active pointer 写入后验证失败。');
      }
    }
    const resolved = await getActive(input.projectId);
    if (!resolved || resolved.canon.canonId !== canon.canonId) {
      throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', '新 Canon 未成为 active authority。');
    }
    return { ...resolved, created };
  }

  return { createOrGet, resolve, getActive };
}

export type VisualMigrationCanonService = ReturnType<typeof createVisualMigrationCanonService>;
