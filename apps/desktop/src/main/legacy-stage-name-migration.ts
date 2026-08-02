import type { ProjectRecord } from '../shared/types.ts';

/**
 * Read-only compatibility for project data written before the Short-Chain
 * naming cleanup. New writes must never use these names.
 */
export const LEGACY_SHORT_CHAIN_CONTEXT_FILENAME = 'project-visual-context.vnext.json';
export const LEGACY_SHORT_CHAIN_GENERATION_DIRECTORY = 'image-generation-vnext';

type LegacyProjectRecord = ProjectRecord & {
  visualContextVNextFilename?: string | null;
  visualContextVNextStatus?: 'missing' | 'ready' | 'failed';
  visualContextVNextVersion?: number | null;
  visualContextVNextLastBuiltAt?: string | null;
};

export function readLegacyShortChainProjectFields(record: ProjectRecord) {
  const legacy = record as LegacyProjectRecord;
  return {
    filename: legacy.visualContextVNextFilename || null,
    status: legacy.visualContextVNextStatus || 'missing' as const,
    version: legacy.visualContextVNextVersion || null,
    lastBuiltAt: legacy.visualContextVNextLastBuiltAt || null,
  };
}
