import fs from 'node:fs/promises';
import path from 'node:path';
import type { CreativeDirectionContext } from './creative-research/contracts.ts';
import { assertCreativeDirectionContextBoundary } from './creative-research/direction-context.ts';
import type { CreativeDirectionContextRepository } from './creative-research/ports.ts';
import { assertInside } from './analysis-contract.ts';
import { atomicWriteJsonWithRetry, type AtomicWriteResult } from './runtime/atomic-write.ts';
import { creativeResearchDirectionError } from './creative-research-direction-errors.ts';

type JsonWriter = (targetPath: string, value: unknown) => Promise<AtomicWriteResult>;

const CONTEXT_FILE_NAME = 'current.json';

function safeIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value)) {
    throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_STORE_FAILED', `${label} 无效`);
  }
  return value;
}

async function readJson<T>(filename: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(filename, 'utf8')) as T; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_STORE_FAILED', `读取 Creative Direction Context 失败：${filename}`, { cause: error });
  }
}

export function createCreativeDirectionContextStore(options: {
  readDefaultDataPath: () => string | Promise<string>;
  writeJson?: JsonWriter;
}): CreativeDirectionContextRepository {
  const writeJson = options.writeJson || atomicWriteJsonWithRetry;
  const locks = new Map<string, Promise<unknown>>();
  const dataRoot = async () => path.join(path.resolve(await options.readDefaultDataPath()), 'creative-research');
  const contextPath = async (sessionId: string) => {
    const root = await dataRoot();
    const directory = assertInside(root, path.join(root, safeIdentifier(sessionId, 'Session ID'), 'direction', 'context'));
    return path.join(directory, CONTEXT_FILE_NAME);
  };
  const persist = async (filename: string, value: CreativeDirectionContext) => {
    const result = await writeJson(filename, value);
    if (!result.success) throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_STORE_FAILED', `写入 Creative Direction Context 失败：${result.errorMessage || result.errorCode || 'unknown error'}`);
  };
  const serialize = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
    const previous = locks.get(key) || Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    locks.set(key, current);
    try { return await current; } finally { if (locks.get(key) === current) locks.delete(key); }
  };

  return Object.freeze({
    async save(context: CreativeDirectionContext) {
      assertCreativeDirectionContextBoundary(context);
      const filename = await contextPath(context.sessionId);
      return serialize(filename, async () => {
        const existing = await readJson<CreativeDirectionContext>(filename);
        if (existing) {
          if (JSON.stringify(existing) === JSON.stringify(context)) return existing;
          throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_CONTEXT_IMMUTABLE', 'Creative Direction Context 已冻结，不能修改');
        }
        await persist(filename, context);
        return context;
      });
    },
    async getCurrent(sessionId: string) {
      const context = await readJson<CreativeDirectionContext>(await contextPath(sessionId));
      if (!context) return null;
      assertCreativeDirectionContextBoundary(context);
      if (context.sessionId !== sessionId) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_STORE_FAILED', 'Creative Direction Context session identity 不匹配');
      }
      return context;
    },
  });
}
