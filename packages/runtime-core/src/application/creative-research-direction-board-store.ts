import fs from 'node:fs/promises';
import path from 'node:path';
import type { DirectionBoard } from './creative-research/contracts.ts';
import { assertJsonSerializable } from './creative-research/evidence.ts';
import type { DirectionBoardRepository } from './creative-research/ports.ts';
import { assertInside } from './analysis-contract.ts';
import { atomicWriteJsonWithRetry, type AtomicWriteResult } from './runtime/atomic-write.ts';
import { creativeResearchDirectionError } from './creative-research-direction-errors.ts';

type JsonWriter = (targetPath: string, value: unknown) => Promise<AtomicWriteResult>;

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
    throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_STORE_FAILED', `读取 Direction Board 失败：${filename}`, { cause: error });
  }
}

function assertDirectionBoardShape(board: DirectionBoard): void {
  if (!board.id?.trim()) throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', 'Direction Board id 不能为空');
  if (!board.sessionId?.trim()) throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', 'Direction Board sessionId 不能为空');
  if (!Number.isInteger(board.revision) || board.revision < 1) {
    throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', 'Direction Board revision 必须是正整数');
  }
  if (!board.summary?.trim()) throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', 'Direction Board summary 不能为空');
  for (const [field, value] of Object.entries({ createdAt: board.createdAt, updatedAt: board.updatedAt })) {
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
      throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', `Direction Board ${field} 必须是 ISO 8601 字符串`);
    }
  }
  for (const [field, value] of Object.entries({
    visualKeywords: board.visualKeywords,
    referenceIds: board.referenceIds,
    referenceRegionIds: board.referenceRegionIds,
    negativeSignalIds: board.negativeSignalIds,
    designerNotes: board.designerNotes,
  })) {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', `Direction Board ${field} 必须是字符串数组`);
    }
  }
  assertJsonSerializable(board, 'directionBoard');
}

function boardFileName(board: DirectionBoard): string {
  return `${String(board.revision).padStart(4, '0')}-${safeIdentifier(board.id, 'Board ID')}.json`;
}

export function createCreativeResearchDirectionBoardStore(options: {
  readDefaultDataPath: () => string | Promise<string>;
  writeJson?: JsonWriter;
}): DirectionBoardRepository {
  const writeJson = options.writeJson || atomicWriteJsonWithRetry;
  const locks = new Map<string, Promise<unknown>>();
  const dataRoot = async () => path.join(path.resolve(await options.readDefaultDataPath()), 'creative-research');
  const boardsDirectory = async (sessionId: string) => {
    const root = await dataRoot();
    return assertInside(root, path.join(root, safeIdentifier(sessionId, 'Session ID'), 'direction', 'boards'));
  };
  const persist = async (filename: string, value: DirectionBoard) => {
    const result = await writeJson(filename, value);
    if (!result.success) throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_STORE_FAILED', `写入 Direction Board 失败：${result.errorMessage || result.errorCode || 'unknown error'}`);
  };
  const serialize = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
    const previous = locks.get(key) || Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    locks.set(key, current);
    try { return await current; } finally { if (locks.get(key) === current) locks.delete(key); }
  };
  const listBoards = async (sessionId: string): Promise<DirectionBoard[]> => {
    const directory = await boardsDirectory(sessionId);
    const entries = await fs.readdir(directory).catch(() => []);
    const values = await Promise.all(entries.filter((entry) => entry.endsWith('.json'))
      .map((entry) => readJson<DirectionBoard>(path.join(directory, entry))));
    return values.filter((item): item is DirectionBoard => Boolean(item)).map((item) => {
      assertDirectionBoardShape(item);
      if (item.sessionId !== sessionId) throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_STORE_FAILED', 'Direction Board session identity 不匹配');
      return item;
    }).sort((left, right) => left.revision - right.revision);
  };

  return Object.freeze({
    async saveRevision(board: DirectionBoard) {
      assertDirectionBoardShape(board);
      return serialize(board.sessionId, async () => {
        const history = await listBoards(board.sessionId);
        const expectedRevision = history.length ? history[history.length - 1]!.revision + 1 : 1;
        if (board.revision !== expectedRevision || history.some((item) => item.revision === board.revision)) {
          throw creativeResearchDirectionError(
            'CREATIVE_RESEARCH_DIRECTION_STORE_FAILED',
            `Direction Board revision 必须单调递增：期望 ${expectedRevision}，实际 ${board.revision}`,
          );
        }
        const filename = path.join(await boardsDirectory(board.sessionId), boardFileName(board));
        if (await readJson<DirectionBoard>(filename)) {
          throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_STORE_FAILED', `Direction Board revision 不可覆盖：${board.revision}`);
        }
        await persist(filename, board);
        return board;
      });
    },
    async getCurrent(sessionId: string) {
      const history = await listBoards(sessionId);
      return history.length ? history[history.length - 1]! : null;
    },
    listRevisionHistory(sessionId: string) {
      return listBoards(sessionId);
    },
  });
}
