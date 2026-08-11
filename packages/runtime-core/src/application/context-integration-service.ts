/**
 * Phase 4「三大功能轻量整合」Context Integration 服务层。
 *
 * 职责（编排 + 关联持久化；纯逻辑在 context-resolver.ts）：
 * - 视觉项目 ↔ 文档 Context 关联（§8）：一个文档 Context 可被多个视觉项目引用；
 *   解除关联只删 Link，不删原文档任务；删除被引用 Context 前检查引用。
 * - Resolved Context 生成与读取（§5/§6.4）：优先读取已合并的 Resolved Context，
 *   没有时返回 null（调用方回退 Project Visual Context）。
 * - 缓存失效（§10）：依 sourceFingerprint（视觉/文档上下文 generatedAt）判断 Resolved 是否过期，
 *   视觉身份或文档目标用户等变化使 Resolved 失效。
 * - 冲突确认（§9）：listConflicts / applyConflictResolution。
 * - 旧数据按需迁移（§12）：migrate 重建视觉上下文（若缺失）并在已关联时重新合并。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ConflictResolutionInput,
  ContextConflict,
  ProjectDocumentContextLink,
  PublicSettings,
  ResolvedProjectContext
} from '../shared/types.ts';
import { applyUserOverride, resolveProjectContext } from './context-resolver.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { ProjectContextService } from './project-context-service.ts';
import type { DocumentContextService } from './document-context-service.ts';

const RESOLVED_FILENAME = 'resolved-project-context.json';
const LINKS_FILENAME = 'context-integration-links.json';

type SettingsReader = () => Promise<PublicSettings> | PublicSettings;

export interface ContextIntegrationDeps {
  readSettings: SettingsReader;
  projects: ProjectStore;
  projectContext: ProjectContextService;
  documentContext: DocumentContextService;
  showSaveDialog?: (defaultPath: string) => Promise<{ canceled: boolean; filePath?: string } | null>;
}

function readJsonSafe<T>(filePath: string): Promise<T | null> {
  return fs.readFile(filePath, 'utf8').then((text) => JSON.parse(text) as T).catch(() => null);
}

export class ContextIntegrationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ContextIntegrationError';
  }
}

export function createContextIntegrationService(deps: ContextIntegrationDeps) {
  const { projects, projectContext, documentContext } = deps;

  function dataRoot(): Promise<string> {
    return Promise.resolve(deps.readSettings()).then((settings) => path.resolve(settings.defaultDataPath));
  }

  async function linksPath(): Promise<string> {
    return path.join(await dataRoot(), 'context-integration', LINKS_FILENAME);
  }

  async function readLinks(): Promise<ProjectDocumentContextLink[]> {
    const stored = await readJsonSafe<ProjectDocumentContextLink[]>(await linksPath());
    return Array.isArray(stored) ? stored : [];
  }

  async function writeLinks(links: ProjectDocumentContextLink[]): Promise<void> {
    const target = await linksPath();
    const result = await atomicWriteJsonWithRetry(target, links);
    if (!result.success) {
      throw new ContextIntegrationError('LINK_WRITE_FAILED', `关联记录写入失败：${result.errorMessage}`);
    }
  }

  async function getLink(projectId: string): Promise<ProjectDocumentContextLink | null> {
    const links = await readLinks();
    return links.find((link) => link.projectId === projectId) ?? null;
  }

  async function resolvedPathFor(projectId: string): Promise<string> {
    const paths = await projects.paths(projectId);
    return path.join(paths.outputs, RESOLVED_FILENAME);
  }

  return {
    async linkDocumentContext(projectId: string, runId: string): Promise<ProjectDocumentContextLink> {
      const run = await documentContext.getRun(runId).catch(() => null);
      if (!run) throw new ContextIntegrationError('DOCUMENT_CONTEXT_NOT_FOUND', '要关联的文档 Context 任务不存在');
      const links = await readLinks();
      const existing = links.find((link) => link.projectId === projectId);
      const link: ProjectDocumentContextLink = {
        projectId,
        documentContextRunId: runId,
        linkedAt: existing?.linkedAt ?? new Date().toISOString(),
        lastResolvedAt: existing?.lastResolvedAt
      };
      const next = links.filter((item) => item.projectId !== projectId);
      next.push(link);
      await writeLinks(next);
      return link;
    },

    async unlinkDocumentContext(projectId: string): Promise<void> {
      const links = await readLinks();
      const next = links.filter((item) => item.projectId !== projectId);
      if (next.length !== links.length) await writeLinks(next);
    },

    /** §8 某个文档 Context 是否被任一视觉项目引用（删除前检查）。 */
    async isDocumentContextReferenced(runId: string): Promise<boolean> {
      const links = await readLinks();
      return links.some((link) => link.documentContextRunId === runId);
    },

    getLink,

    async getVisualStatus(
      projectId: string
    ): Promise<{ status: 'missing' | 'ready' | 'failed'; schemaVersion?: string | null }> {
      const project = await projects.get(projectId).catch(() => null);
      if (!project) return { status: 'missing', schemaVersion: null };
      return {
        status: (project.visualContextStatus ?? 'missing') as 'missing' | 'ready' | 'failed',
        schemaVersion: project.visualContextSchemaVersion ?? null
      };
    },

    /** §6.4 优先读取 Resolved Context；过期或不存在返回 null（调用方回退 Project Visual Context）。 */
    async getResolved(projectId: string): Promise<ResolvedProjectContext | null> {
      const link = await getLink(projectId);
      if (!link) return null;
      const resolved = await readJsonSafe<ResolvedProjectContext>(await resolvedPathFor(projectId));
      if (!resolved || resolved.schemaVersion !== '1.0') return null;
      // §10 缓存失效：视觉上下文生成时间变化 → 过期
      const visual = await projectContext.get(projectId).catch(() => null);
      if (!visual) return null;
      if (resolved.sourceFingerprint?.visualGeneratedAt && resolved.sourceFingerprint.visualGeneratedAt !== visual.generatedAt) {
        return null;
      }
      // §10 文档目标用户等变化时，关联文档生成时间变化 → 过期
      if (link.documentContextRunId) {
        const document = await documentContext.getExtracted(link.documentContextRunId).catch(() => null);
        if (!document) return null;
        if (resolved.sourceFingerprint?.documentGeneratedAt && resolved.sourceFingerprint.documentGeneratedAt !== document.generatedAt) {
          return null;
        }
      }
      return resolved;
    },

    /** §6.3/§13 生成 Resolved Context（视觉为��、文档补充、用户覆盖优先）。 */
    async resolve(
      projectId: string,
      userOverrides?: Record<string, unknown>
    ): Promise<ResolvedProjectContext> {
      const visual = await projectContext.get(projectId); // 视觉上下文缺失 → 抛错，由调用方处理
      const link = await getLink(projectId);
      const document = link
        ? await documentContext.getExtracted(link.documentContextRunId).catch(() => null)
        : null;
      const resolved = resolveProjectContext({ projectId, projectVisualContext: visual, documentVisualContext: document, userOverrides });
      const target = await resolvedPathFor(projectId);
      const write = await atomicWriteJsonWithRetry(target, resolved);
      if (!write.success) {
        throw new ContextIntegrationError('RESOLVED_CONTEXT_WRITE_FAILED', `Resolved Context 写入失败：${write.errorMessage}`);
      }
      if (link) {
        const links = await readLinks();
        const next = links.map((item) =>
          item.projectId === projectId ? { ...item, lastResolvedAt: resolved.generatedAt } : item
        );
        await writeLinks(next);
      }
      return resolved;
    },

    async listConflicts(projectId: string): Promise<ContextConflict[]> {
      const resolved = await this.getResolved(projectId);
      return resolved?.conflicts ?? [];
    },

    /** §9 应用冲突确认；resolution=user_confirmed 且带 value 时覆盖字段。 */
    async applyConflictResolution(
      projectId: string,
      resolutions: ConflictResolutionInput[]
    ): Promise<ResolvedProjectContext> {
      const resolved = await this.getResolved(projectId);
      if (!resolved) throw new ContextIntegrationError('RESOLVED_CONTEXT_MISSING', '尚无 Resolved Context，无法确认冲突');
      for (const input of resolutions) {
        const conflict = resolved.conflicts.find((item) => item.field === input.field);
        if (!conflict) continue;
        conflict.resolution = input.resolution;
        if (input.value !== undefined) applyUserOverride(resolved, input.field, input.value);
      }
      const target = await resolvedPathFor(projectId);
      const write = await atomicWriteJsonWithRetry(target, resolved);
      if (!write.success) {
        throw new ContextIntegrationError('RESOLVED_CONTEXT_WRITE_FAILED', `冲突确认后写入失败：${write.errorMessage}`);
      }
      const link = await getLink(projectId);
      if (link) {
        const links = await readLinks();
        const next = links.map((item) =>
          item.projectId === projectId ? { ...item, lastResolvedAt: resolved.generatedAt } : item
        );
        await writeLinks(next);
      }
      return resolved;
    },

    /** §12 旧项目按需迁移：重建视觉上下文（若缺失），已关联则重新合并。 */
    async migrate(projectId: string): Promise<{ visualContextStatus: string; resolvedGeneratedAt?: string | null }> {
      const before = await projects.get(projectId).catch(() => null);
      if (before && before.visualContextStatus !== 'ready') {
        await projectContext.rebuild(projectId).catch(() => undefined);
      }
      const after = await projects.get(projectId).catch(() => null);
      const link = await getLink(projectId);
      if (link) {
        await this.resolve(projectId).catch(() => undefined);
      }
      const refreshed = await getLink(projectId);
      return {
        visualContextStatus: after?.visualContextStatus ?? 'missing',
        resolvedGeneratedAt: refreshed?.lastResolvedAt ?? null
      };
    },

    async export(projectId: string): Promise<string | null> {
      const resolved = await this.getResolved(projectId);
      if (!resolved || !deps.showSaveDialog) return null;
      const source = await resolvedPathFor(projectId);
      await fs.access(source);
      const result = await deps.showSaveDialog(RESOLVED_FILENAME);
      if (!result || result.canceled || !result.filePath) return null;
      await fs.copyFile(source, result.filePath);
      return result.filePath;
    }
  };
}

export type ContextIntegrationService = ReturnType<typeof createContextIntegrationService>;
