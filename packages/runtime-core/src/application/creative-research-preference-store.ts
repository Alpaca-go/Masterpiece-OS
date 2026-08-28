import fs from 'node:fs/promises';
import path from 'node:path';
import type { PreferenceInsight } from './creative-research/contracts.ts';
import { assertPreferenceInsight } from './creative-research/evidence.ts';
import type { PreferenceEvidenceRepository } from './creative-research/ports.ts';
import { assertInside } from './analysis-contract.ts';
import { atomicWriteJsonWithRetry, type AtomicWriteResult } from './runtime/atomic-write.ts';
import { creativeResearchPreferenceError } from './creative-research-preference-errors.ts';

type JsonWriter = (targetPath: string, value: unknown) => Promise<AtomicWriteResult>;

function safeIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value)) {
    throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED', `${label} 无效`);
  }
  return value;
}

async function readJson<T>(filename: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(filename, 'utf8')) as T; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED', `读取 Preference Insight 失败：${filename}`, { cause: error });
  }
}

export function createCreativeResearchPreferenceStore(options: {
  readDefaultDataPath: () => string | Promise<string>;
  writeJson?: JsonWriter;
}): PreferenceEvidenceRepository {
  const writeJson = options.writeJson || atomicWriteJsonWithRetry;
  const locks = new Map<string, Promise<unknown>>();
  const dataRoot = async () => path.join(path.resolve(await options.readDefaultDataPath()), 'creative-research');
  const insightDirectory = async (sessionId: string) => {
    const root = await dataRoot();
    return assertInside(root, path.join(root, safeIdentifier(sessionId, 'Session ID'), 'research', 'preference-insights'));
  };
  const insightPath = async (sessionId: string, insightId: string) =>
    path.join(await insightDirectory(sessionId), `${safeIdentifier(insightId, 'Insight ID')}.json`);
  const persist = async (filename: string, value: PreferenceInsight) => {
    const result = await writeJson(filename, value);
    if (!result.success) throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED', `写入 Preference Insight 失败：${result.errorMessage || result.errorCode || 'unknown error'}`);
  };
  const serialize = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
    const previous = locks.get(key) || Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    locks.set(key, current);
    try { return await current; } finally { if (locks.get(key) === current) locks.delete(key); }
  };

  return Object.freeze({
    async saveInsight(insight) {
      assertPreferenceInsight(insight);
      const filename = await insightPath(insight.sessionId, insight.id);
      return serialize(filename, async () => {
        const previous = await readJson<PreferenceInsight>(filename);
        if (previous?.sessionId !== undefined && previous.sessionId !== insight.sessionId) {
          throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED', 'Preference Insight session identity 不匹配');
        }
        if (previous?.status === 'FINALIZED' && insight.status !== 'FINALIZED') {
          throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED', '已确认的 Preference Insight 不能降级为草稿');
        }
        if (previous?.status === 'FINALIZED' && previous.finalizedAt !== insight.finalizedAt) {
          throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED', '已确认的 Preference Insight finalizedAt 不能修改');
        }
        await persist(filename, insight);
        return insight;
      });
    },
    async listInsights(sessionId) {
      const directory = await insightDirectory(sessionId);
      const entries = await fs.readdir(directory).catch(() => []);
      const values = await Promise.all(entries.filter((entry) => entry.endsWith('.json'))
        .map((entry) => readJson<PreferenceInsight>(path.join(directory, entry))));
      return values.filter((item): item is PreferenceInsight => Boolean(item)).map((item) => {
        assertPreferenceInsight(item);
        if (item.sessionId !== sessionId) throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED', 'Preference Insight session identity 不匹配');
        return item;
      }).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    },
    async storeDesignerOverride(sessionId, insightId, designerOverride) {
      const filename = await insightPath(sessionId, insightId);
      return serialize(filename, async () => {
        const previous = await readJson<PreferenceInsight>(filename);
        if (!previous || previous.sessionId !== sessionId) {
          throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED', `Preference Insight 不存在：${insightId}`);
        }
        const value = designerOverride.trim();
        const { designerOverride: _previousOverride, ...withoutOverride } = previous;
        const next: PreferenceInsight = { ...withoutOverride, ...(value ? { designerOverride: value } : {}) };
        assertPreferenceInsight(next);
        await persist(filename, next);
        return next;
      });
    },
  });
}
