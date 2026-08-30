import fs from 'node:fs/promises';
import path from 'node:path';
import type { CreativeResearchSession, DesignBrief } from './creative-research/contracts.ts';
import { assertCreativeResearchSession, assertDesignBrief } from './creative-research/evidence.ts';
import type { CreativeResearchSessionRepository, DesignBriefRepository } from './creative-research/ports.ts';
import { creativeResearchError } from './creative-research-errors.ts';
import { assertInside } from './analysis-contract.ts';
import { atomicWriteJsonWithRetry, type AtomicWriteResult } from './runtime/atomic-write.ts';
import { appendRuntimeEvent } from './runtime/event-log.ts';

type DataPathReader = () => string | Promise<string>;
type JsonWriter = (targetPath: string, value: unknown) => Promise<AtomicWriteResult>;

function safeIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value)) throw new Error(`${label} 无效`);
  return value;
}

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export function createCreativeResearchStore(options: {
  readDefaultDataPath: DataPathReader;
  writeJson?: JsonWriter;
}) : {
  sessions: CreativeResearchSessionRepository;
  briefs: DesignBriefRepository;
} {
  const writeJson = options.writeJson || atomicWriteJsonWithRetry;
  const dataRoot = async () => path.join(path.resolve(await options.readDefaultDataPath()), 'creative-research');
  const sessionRoot = async (sessionId: string) => {
    const root = await dataRoot();
    return assertInside(root, path.join(root, safeIdentifier(sessionId, 'Creative Research Session ID')));
  };
  const sessionPath = async (sessionId: string) => path.join(await sessionRoot(sessionId), 'runtime', 'session.json');
  const eventRoot = async (sessionId: string) => path.join(await sessionRoot(sessionId), 'runtime');
  const briefPath = async (sessionId: string, revision: number) => {
    if (!Number.isInteger(revision) || revision < 1 || revision > 9999) throw new Error('Design Brief revision 无效');
    return path.join(await sessionRoot(sessionId), 'briefs', `${String(revision).padStart(4, '0')}.json`);
  };
  const persist = async (filename: string, value: unknown) => {
    const result = await writeJson(filename, value);
    if (!result.success) {
      throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_WRITE_FAILED', `写入 Creative Research 数据失败：${result.errorMessage || result.errorCode || 'unknown error'}`);
    }
  };

  const sessions: CreativeResearchSessionRepository = {
    async create(session) {
      assertCreativeResearchSession(session);
      if (await readJson(await sessionPath(session.id))) {
        throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', `Creative Research Session 已存在：${session.id}`);
      }
      await persist(await sessionPath(session.id), session);
      await appendRuntimeEvent(await eventRoot(session.id), session.id, 'CREATIVE_RESEARCH_SESSION_CREATED', {
        project_id: session.projectId,
        source_document_count: session.sourceDocumentIds.length,
      });
      return session;
    },
    async get(id) {
      const value = await readJson<CreativeResearchSession>(await sessionPath(id));
      if (value) assertCreativeResearchSession(value);
      return value;
    },
    async save(session) {
      assertCreativeResearchSession(session);
      const previous = await sessions.get(session.id);
      if (!previous) throw creativeResearchError('CREATIVE_RESEARCH_SESSION_NOT_FOUND', `Creative Research Session 不存在：${session.id}`);
      if (previous.projectId !== session.projectId || previous.createdAt !== session.createdAt) {
        throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', 'Creative Research Session identity 不可变');
      }
      await persist(await sessionPath(session.id), session);
      await appendRuntimeEvent(await eventRoot(session.id), session.id, 'CREATIVE_RESEARCH_SESSION_UPDATED', {
        status: session.status,
        active_design_brief_id: session.activeDesignBriefId || null,
      });
      return session;
    },
    async listByProject(projectId) {
      const root = await dataRoot();
      const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
      const values = await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => sessions.get(entry.name).catch(() => null)));
      return values.filter((item): item is CreativeResearchSession => item?.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async delete(id) {
      const target = await sessionRoot(id);
      if (!await sessions.get(id)) return false;
      await fs.rm(target, { recursive: true, force: false, maxRetries: 3, retryDelay: 50 });
      return true;
    },
  };

  const briefs: DesignBriefRepository = {
    async saveRevision(brief) {
      assertDesignBrief(brief);
      const session = await sessions.get(brief.sessionId);
      if (!session) throw creativeResearchError('CREATIVE_RESEARCH_SESSION_NOT_FOUND', `Creative Research Session 不存在：${brief.sessionId}`);
      const revisions = await briefs.listRevisions(brief.sessionId);
      const expected = revisions.length ? revisions[revisions.length - 1]!.revision + 1 : 1;
      if (brief.revision !== expected) {
        throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_CONFLICT', `Design Brief revision 必须为 ${expected}`);
      }
      const filename = await briefPath(brief.sessionId, brief.revision);
      const lockPath = `${filename}.lock`;
      await fs.mkdir(path.dirname(filename), { recursive: true });
      const lock = await fs.open(lockPath, 'wx').catch((error) => {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_CONFLICT', `Design Brief revision ${brief.revision} 正在写入`);
        }
        throw error;
      });
      try {
        if (await fs.access(filename).then(() => true).catch(() => false)) {
          throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_CONFLICT', `Design Brief revision ${brief.revision} 已存在`);
        }
        await persist(filename, brief);
        await appendRuntimeEvent(await eventRoot(brief.sessionId), brief.sessionId, 'CREATIVE_RESEARCH_BRIEF_REVISION_SAVED', {
          brief_id: brief.id,
          revision: brief.revision,
        });
      } finally {
        await lock.close().catch(() => undefined);
        await fs.unlink(lockPath).catch(() => undefined);
      }
      return brief;
    },
    async getActiveRevision(sessionId) {
      const session = await sessions.get(sessionId);
      if (!session?.activeDesignBriefId) return null;
      return (await briefs.listRevisions(sessionId)).find((brief) => brief.id === session.activeDesignBriefId) || null;
    },
    async listRevisions(sessionId) {
      const directory = path.join(await sessionRoot(sessionId), 'briefs');
      const entries = await fs.readdir(directory).catch(() => []);
      const filenames = entries.filter((entry) => /^\d{4}\.json$/u.test(entry)).sort();
      const values = await Promise.all(filenames.map((entry) => readJson<DesignBrief>(path.join(directory, entry))));
      return values.filter((item): item is DesignBrief => Boolean(item)).map((item) => {
        assertDesignBrief(item);
        if (item.sessionId !== sessionId) throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_CONFLICT', 'Design Brief session identity 不匹配');
        return item;
      }).sort((a, b) => a.revision - b.revision);
    },
  };

  return { sessions, briefs };
}
