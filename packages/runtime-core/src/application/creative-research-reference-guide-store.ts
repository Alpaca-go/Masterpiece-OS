import fs from 'node:fs/promises';
import path from 'node:path';
import type { CreativeResearchReferenceGuide } from './creative-research/contracts.ts';
import type { CreativeResearchReferenceGuideRepository } from './creative-research/ports.ts';
import { assertInside } from './analysis-contract.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';

function safeIdentifier(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value)) throw new Error('Reference Guide Session ID 无效');
  return value;
}

function assertGuide(value: CreativeResearchReferenceGuide): void {
  if (!value.id || !value.sessionId || !value.briefRevisionId || !Number.isFinite(Date.parse(value.createdAt))) {
    throw new Error('Reference Guide provenance 无效');
  }
  if (!Array.isArray(value.territories) || value.territories.length < 2 || value.territories.length > 4) {
    throw new Error('Reference Guide 必须包含 2 至 4 个 Territory');
  }
  const ids = new Set<string>();
  for (const territory of value.territories) {
    if (!territory.id || ids.has(territory.id) || !['INDUSTRY', 'POSITIONING', 'CROSS_CATEGORY', 'CUSTOM'].includes(territory.kind)) {
      throw new Error('Reference Guide Territory 无效');
    }
    ids.add(territory.id);
    if (!territory.title.trim() || !territory.rationale.trim() || !territory.keywords.length || !territory.observe.length) {
      throw new Error('Reference Guide Territory 内容不完整');
    }
  }
}

export function createCreativeResearchReferenceGuideStore(options: {
  readDefaultDataPath(): string | Promise<string>;
}): CreativeResearchReferenceGuideRepository {
  const guidePath = async (sessionId: string) => {
    const root = path.join(path.resolve(await options.readDefaultDataPath()), 'creative-research');
    return assertInside(root, path.join(root, safeIdentifier(sessionId), 'reference-guide', 'guide.json'));
  };
  const store: CreativeResearchReferenceGuideRepository = {
    async save(guide) {
      assertGuide(guide);
      const result = await atomicWriteJsonWithRetry(await guidePath(guide.sessionId), guide);
      if (!result.success) throw new Error(`Reference Guide 写入失败：${result.errorMessage || result.errorCode || 'unknown error'}`);
      return guide;
    },
    async get(sessionId) {
      try {
        const value = JSON.parse(await fs.readFile(await guidePath(sessionId), 'utf8')) as CreativeResearchReferenceGuide;
        assertGuide(value);
        return value;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    },
  };
  return Object.freeze(store);
}
