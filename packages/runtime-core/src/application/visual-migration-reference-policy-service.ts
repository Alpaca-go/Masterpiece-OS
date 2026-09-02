import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  TaskAwareReferencePolicyV1,
  VisualMigrationReferenceCandidateDeclarationV1,
  VisualMigrationReferenceTaskV1,
} from '@masterpiece/project-contracts/index.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { VisualMigrationCanonService } from './visual-migration-canon-service.ts';
import { buildVisualMigrationReferencePolicy } from './visual-migration-reference-policy-builder.ts';
import {
  createReferencePolicyError,
  validateTaskAwareReferencePolicyV1,
} from './visual-migration-reference-policy-contract.ts';

const POLICY_ID_PATTERN = /^vrp-[a-f0-9]{32}$/u;

export interface CreateVisualMigrationReferencePolicyInput {
  projectId: string;
  task: VisualMigrationReferenceTaskV1;
  candidateDeclarations?: VisualMigrationReferenceCandidateDeclarationV1[];
}

export interface VisualMigrationReferencePolicyPersistenceOptions {
  readJson?: (filename: string) => Promise<unknown | null>;
  writeJson?: (filename: string, value: unknown) => Promise<void>;
}

function inside(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw createReferencePolicyError('REFERENCE_POLICY_PATH_INVALID', 'Reference Policy 路径越界。');
  }
  return resolved;
}

async function readJson(filename: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw createReferencePolicyError('REFERENCE_POLICY_INTEGRITY_FAILED', `Reference Policy JSON 损坏：${filename}`);
  }
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw createReferencePolicyError(
      'REFERENCE_POLICY_INTEGRITY_FAILED',
      `Reference Policy 写入失败：${result.errorMessage}`,
    );
  }
}

function mapCanonResolutionError(error: unknown): Error {
  const code = String((error as { code?: unknown })?.code ?? '');
  if (code.includes('REFERENCE_PACK')) {
    return createReferencePolicyError(
      'REFERENCE_POLICY_REFERENCE_PACK_INVALID',
      `Reference Policy 的 Reference Pack 无法验证：${(error as Error).message}`,
    );
  }
  return createReferencePolicyError(
    'REFERENCE_POLICY_CANON_MISMATCH',
    `Reference Policy 的 Canon 无法验证：${(error as Error).message}`,
  );
}

export function createVisualMigrationReferencePolicyService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  canons: VisualMigrationCanonService,
  lockedAssets: LockedAssetsService,
  persistence: VisualMigrationReferencePolicyPersistenceOptions = {},
) {
  const loadJson = persistence.readJson ?? readJson;
  const persistJson = persistence.writeJson ?? writeJson;

  async function locations(projectId: string, policyId?: string) {
    const projectRoot = (await projects.paths(projectId)).root;
    const policiesRoot = inside(projectRoot, path.join(projectRoot, 'visual-migration', 'reference-policies'));
    if (!policyId) return { projectRoot, policiesRoot };
    if (!POLICY_ID_PATTERN.test(policyId)) {
      throw createReferencePolicyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'policyId 格式无效。');
    }
    const policyRoot = inside(policiesRoot, path.join(policiesRoot, policyId));
    return { projectRoot, policiesRoot, policyRoot, policyFile: path.join(policyRoot, 'policy.json') };
  }

  async function resolve(projectId: string, policyId: string): Promise<TaskAwareReferencePolicyV1> {
    const target = await locations(projectId, policyId);
    const raw = await loadJson(target.policyFile!);
    if (!raw) {
      throw createReferencePolicyError('REFERENCE_POLICY_INTEGRITY_FAILED', `Reference Policy 不存在：${policyId}`);
    }
    const policy = validateTaskAwareReferencePolicyV1(raw);
    if (policy.projectId !== projectId || policy.policyId !== policyId) {
      throw createReferencePolicyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Reference Policy 与项目或 policyId 不匹配。');
    }
    const resolved = await canons.resolve(projectId, policy.canon.canonId).catch((error) => {
      throw mapCanonResolutionError(error);
    });
    if (resolved.canon.canonFingerprint !== policy.canon.canonFingerprint
      || resolved.canon.sourceFingerprint !== policy.canon.canonSourceFingerprint) {
      throw createReferencePolicyError('REFERENCE_POLICY_CANON_MISMATCH', 'Reference Policy 的 Canon fingerprint 不匹配。');
    }
    if (resolved.referencePack.referencePackId !== policy.referencePack.referencePackId
      || resolved.referencePack.manifestFingerprint !== policy.referencePack.manifestFingerprint) {
      throw createReferencePolicyError(
        'REFERENCE_POLICY_REFERENCE_PACK_INVALID',
        'Reference Policy 的 Reference Pack linkage 不匹配。',
      );
    }
    return policy;
  }

  async function createOrGet(input: CreateVisualMigrationReferencePolicyInput) {
    if (!String(input.projectId ?? '').trim()) {
      throw createReferencePolicyError('REFERENCE_POLICY_PROJECT_REQUIRED', 'Reference Policy 必须选择项目。');
    }
    const session = await sessions.get(input.projectId);
    if (!session?.visualMigrationCanonId
      || !session.visualMigrationCanonFingerprint
      || !session.visualMigrationCanonSourceFingerprint
      || !session.referencePackId) {
      throw createReferencePolicyError(
        'REFERENCE_POLICY_CANON_REQUIRED',
        '当前 Creative Session 尚未绑定完整的 Visual Migration Canon。',
      );
    }
    const resolved = await canons.resolve(input.projectId, session.visualMigrationCanonId).catch((error) => {
      throw mapCanonResolutionError(error);
    });
    if (resolved.canon.canonFingerprint !== session.visualMigrationCanonFingerprint
      || resolved.canon.sourceFingerprint !== session.visualMigrationCanonSourceFingerprint) {
      throw createReferencePolicyError('REFERENCE_POLICY_CANON_MISMATCH', 'Creative Session 的 Canon linkage 不一致。');
    }
    if (resolved.referencePack.referencePackId !== session.referencePackId) {
      throw createReferencePolicyError(
        'REFERENCE_POLICY_REFERENCE_PACK_INVALID',
        'Creative Session 的 Reference Pack linkage 不一致。',
      );
    }
    const [project, locks] = await Promise.all([
      projects.get(input.projectId),
      lockedAssets.list(input.projectId),
    ]);
    const built = buildVisualMigrationReferencePolicy({
      projectId: input.projectId,
      task: input.task,
      canon: resolved.canon,
      referencePack: resolved.referencePack,
      projectAssets: project.assets.map((asset) => ({
        id: asset.id,
        mimeType: asset.mimeType,
        status: asset.status,
      })),
      lockedAssets: locks,
      candidateDeclarations: input.candidateDeclarations,
    });
    const target = await locations(input.projectId, built.policyId);
    const existingRaw = await loadJson(target.policyFile!);
    if (existingRaw) {
      const existing = validateTaskAwareReferencePolicyV1(existingRaw);
      if (existing.projectId !== built.projectId
        || existing.policyId !== built.policyId
        || existing.sourceFingerprint !== built.sourceFingerprint
        || existing.policyFingerprint !== built.policyFingerprint) {
        throw createReferencePolicyError(
          'REFERENCE_POLICY_INTEGRITY_FAILED',
          'Deterministic Reference Policy ID 已存在但内容不一致。',
        );
      }
      await resolve(input.projectId, existing.policyId);
      return { policy: existing, created: false };
    }
    await persistJson(target.policyFile!, built);
    const policy = await resolve(input.projectId, built.policyId);
    if (policy.sourceFingerprint !== built.sourceFingerprint
      || policy.policyFingerprint !== built.policyFingerprint) {
      throw createReferencePolicyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Reference Policy 写入后完整性不一致。');
    }
    return { policy, created: true };
  }

  return { createOrGet, resolve };
}

export type VisualMigrationReferencePolicyService = ReturnType<typeof createVisualMigrationReferencePolicyService>;
