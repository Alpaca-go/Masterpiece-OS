import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  NegativeSignal,
  ReferenceItem,
  ReferenceRegion,
  ReferenceSelection,
  SearchQuery,
  WebReferenceItem,
} from './creative-research/contracts.ts';
import {
  assertNegativeSignal,
  assertReferenceItem,
  assertReferenceRegion,
  assertReferenceSelection,
  assertSearchQuery,
} from './creative-research/evidence.ts';
import type { ReferenceResearchRepository, SearchHistoryRepository } from './creative-research/ports.ts';
import { assertInside } from './analysis-contract.ts';
import { atomicWriteJsonWithRetry, type AtomicWriteResult } from './runtime/atomic-write.ts';
import { creativeResearchSearchError } from './creative-research-search-errors.ts';

type DataPathReader = () => string | Promise<string>;
type JsonWriter = (targetPath: string, value: unknown) => Promise<AtomicWriteResult>;

function safeIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value)) throw creativeResearchSearchError('STORE_FAILED', `${label} 无效`);
  return value;
}

async function readJson<T>(filename: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(filename, 'utf8')) as T; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw creativeResearchSearchError('STORE_FAILED', `读取研究数据失败：${filename}`, { cause: error });
  }
}

export function createCreativeResearchResearchStore(options: {
  readDefaultDataPath: DataPathReader;
  writeJson?: JsonWriter;
}): { history: SearchHistoryRepository; references: ReferenceResearchRepository } {
  const writeJson = options.writeJson || atomicWriteJsonWithRetry;
  const locks = new Map<string, Promise<unknown>>();
  const dataRoot = async () => path.join(path.resolve(await options.readDefaultDataPath()), 'creative-research');
  const sessionRoot = async (sessionId: string) => {
    const root = await dataRoot();
    return assertInside(root, path.join(root, safeIdentifier(sessionId, 'Session ID')));
  };
  const queryDirectory = async (sessionId: string) => path.join(await sessionRoot(sessionId), 'research', 'queries');
  const referenceDirectory = async (sessionId: string) => path.join(await sessionRoot(sessionId), 'research', 'references');
  const selectionDirectory = async (sessionId: string) => path.join(await sessionRoot(sessionId), 'research', 'selections');
  const regionDirectory = async (sessionId: string) => path.join(await sessionRoot(sessionId), 'research', 'regions');
  const negativeSignalDirectory = async (sessionId: string) => path.join(await sessionRoot(sessionId), 'research', 'negative-signals');
  const queryPath = async (sessionId: string, queryId: string) => path.join(await queryDirectory(sessionId), `${safeIdentifier(queryId, 'Query ID')}.json`);
  const referencePath = async (sessionId: string, referenceId: string) => path.join(await referenceDirectory(sessionId), `${safeIdentifier(referenceId, 'Reference ID')}.json`);
  const selectionPath = async (sessionId: string, referenceId: string) => path.join(await selectionDirectory(sessionId), `${safeIdentifier(referenceId, 'Reference ID')}.json`);
  const regionPath = async (sessionId: string, regionId: string) => path.join(await regionDirectory(sessionId), `${safeIdentifier(regionId, 'Region ID')}.json`);
  const negativeSignalPath = async (sessionId: string, signalId: string) => path.join(await negativeSignalDirectory(sessionId), `${safeIdentifier(signalId, 'Negative Signal ID')}.json`);
  const associationPath = async (sessionId: string) => path.join(await sessionRoot(sessionId), 'research', 'associations', 'reference-query.jsonl');
  const persist = async (filename: string, value: unknown) => {
    const result = await writeJson(filename, value);
    if (!result.success) throw creativeResearchSearchError('STORE_FAILED', `写入研究数据失败：${result.errorMessage || result.errorCode || 'unknown error'}`);
  };
  const serialize = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
    const previous = locks.get(key) || Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    locks.set(key, current);
    try { return await current; } finally { if (locks.get(key) === current) locks.delete(key); }
  };
  const listJson = async <T>(directory: string, assertValue: (value: T) => void): Promise<T[]> => {
    const entries = await fs.readdir(directory).catch(() => []);
    const values = await Promise.all(entries
      .filter((entry) => entry.endsWith('.json'))
      .map((entry) => readJson<T>(path.join(directory, entry))));
    return values.filter((item): item is T => Boolean(item)).map((item) => { assertValue(item); return item; });
  };

  const history: SearchHistoryRepository = {
    async appendQuery(query) {
      assertSearchQuery(query);
      const filename = await queryPath(query.sessionId, query.id);
      return serialize(filename, async () => {
        if (await readJson(filename)) throw creativeResearchSearchError('STORE_FAILED', `Search Query 已存在：${query.id}`);
        await persist(filename, query);
        return query;
      });
    },
    async recordQueryProgress(sessionId, queryId, update) {
      const filename = await queryPath(sessionId, queryId);
      return serialize(filename, async () => {
        const previous = await readJson<SearchQuery>(filename);
        if (!previous) throw creativeResearchSearchError('QUERY_NOT_FOUND', `Search Query 不存在：${queryId}`);
        const next: SearchQuery = { ...previous, ...update };
        assertSearchQuery(next);
        await persist(filename, next);
        return next;
      });
    },
    async listSessionSearchHistory(sessionId) {
      const directory = await queryDirectory(sessionId);
      const entries = await fs.readdir(directory).catch(() => []);
      const values = await Promise.all(entries.filter((entry) => entry.endsWith('.json')).map((entry) => readJson<SearchQuery>(path.join(directory, entry))));
      return values.filter((item): item is SearchQuery => Boolean(item)).map((item) => { assertSearchQuery(item); return item; })
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    },
  };

  const references: ReferenceResearchRepository = {
    async storeReference(reference) {
      assertReferenceItem(reference);
      if (reference.sourceType !== 'WEB_REFERENCE') throw creativeResearchSearchError('STORE_FAILED', 'CI-R3 研究存储只接受 WEB_REFERENCE');
      const filename = await referencePath(reference.sessionId, reference.id);
      return serialize(filename, async () => {
        const previous = await readJson<WebReferenceItem>(filename);
        if (previous && previous.sessionId !== reference.sessionId) throw creativeResearchSearchError('STORE_FAILED', 'Reference session identity 不匹配');
        const matchedQueryIds = [...new Set([...(previous?.matchedQueryIds || [previous?.queryId].filter(Boolean) as string[]), ...(reference.matchedQueryIds || [reference.queryId])])];
        const merged: WebReferenceItem = previous
          ? { ...previous, matchedQueryIds, resultRank: Math.min(previous.resultRank, reference.resultRank) }
          : { ...reference, matchedQueryIds };
        assertReferenceItem(merged);
        await persist(filename, merged);
        const association = await associationPath(reference.sessionId);
        await fs.mkdir(path.dirname(association), { recursive: true });
        await fs.appendFile(association, `${JSON.stringify({ referenceId: reference.id, queryId: reference.queryId })}\n`, 'utf8')
          .catch((error) => { throw creativeResearchSearchError('STORE_FAILED', '写入 Reference 查询关联失败', { cause: error }); });
        return merged;
      });
    },
    async getReference(sessionId, referenceId) {
      const value = await readJson<ReferenceItem>(await referencePath(sessionId, referenceId));
      if (value) assertReferenceItem(value);
      return value;
    },
    async listSessionReferences(sessionId) {
      const directory = await referenceDirectory(sessionId);
      const entries = await fs.readdir(directory).catch(() => []);
      const values = await Promise.all(entries.filter((entry) => entry.endsWith('.json')).map((entry) => readJson<ReferenceItem>(path.join(directory, entry))));
      return values.filter((item): item is ReferenceItem => Boolean(item)).map((item) => { assertReferenceItem(item); return item; })
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    },
    async saveSelection(selection) {
      assertReferenceSelection(selection);
      const filename = await selectionPath(selection.sessionId, selection.referenceId);
      return serialize(filename, async () => {
        const reference = await readJson<ReferenceItem>(await referencePath(selection.sessionId, selection.referenceId));
        if (!reference) throw creativeResearchSearchError('STORE_FAILED', `Reference 不存在：${selection.referenceId}`);
        if (reference.sessionId !== selection.sessionId) throw creativeResearchSearchError('STORE_FAILED', 'Selection session identity 不匹配');
        const previous = await readJson<ReferenceSelection>(filename);
        if (previous && previous.sessionId !== selection.sessionId) throw creativeResearchSearchError('STORE_FAILED', 'Selection session identity 不匹配');
        await persist(filename, selection);
        return selection;
      });
    },
    async listSelections(sessionId) {
      const values = await listJson<ReferenceSelection>(await selectionDirectory(sessionId), assertReferenceSelection);
      return values.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.referenceId.localeCompare(right.referenceId));
    },
    async saveRegion(region) {
      assertReferenceRegion(region);
      const filename = await regionPath(region.sessionId, region.id);
      return serialize(filename, async () => {
        if (!await readJson<ReferenceItem>(await referencePath(region.sessionId, region.referenceId))) {
          throw creativeResearchSearchError('STORE_FAILED', `Reference 不存在：${region.referenceId}`);
        }
        const previous = await readJson<ReferenceRegion>(filename);
        if (previous) throw creativeResearchSearchError('STORE_FAILED', `Reference Region 已存在：${region.id}`);
        await persist(filename, region);
        return region;
      });
    },
    async listRegions(sessionId) {
      const values = await listJson<ReferenceRegion>(await regionDirectory(sessionId), assertReferenceRegion);
      return values.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    },
    async saveNegativeSignal(signal) {
      assertNegativeSignal(signal);
      const filename = await negativeSignalPath(signal.sessionId, signal.id);
      return serialize(filename, async () => {
        if (signal.sourceReferenceId && !await readJson<ReferenceItem>(await referencePath(signal.sessionId, signal.sourceReferenceId))) {
          throw creativeResearchSearchError('STORE_FAILED', `Reference 不存在：${signal.sourceReferenceId}`);
        }
        if (await readJson<NegativeSignal>(filename)) throw creativeResearchSearchError('STORE_FAILED', `Negative Signal 已存在：${signal.id}`);
        await persist(filename, signal);
        return signal;
      });
    },
    async listNegativeSignals(sessionId) {
      const values = await listJson<NegativeSignal>(await negativeSignalDirectory(sessionId), assertNegativeSignal);
      return values.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    },
  };

  return { history, references };
}
