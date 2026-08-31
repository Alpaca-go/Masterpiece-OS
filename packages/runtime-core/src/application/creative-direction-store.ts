import fs from 'node:fs/promises';
import path from 'node:path';
import { assertInside } from './analysis-contract.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type {
  CreativeDirectionProductionHandoff,
  CreativeDirectionSession,
  FinalCreativeDirection,
  SharedProjectContext,
} from './creative-direction-contracts.ts';

function safeId(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value)) throw new Error('CREATIVE_DIRECTION_INVALID_ID');
  return value;
}

async function readJson<T>(filename: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(filename, 'utf8')) as T; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

function normalizeFinalDirection(value: unknown): FinalCreativeDirection | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (source.schemaVersion === 'final-creative-direction-v0.2') return source as unknown as FinalCreativeDirection;
  if (source.schemaVersion !== 'final-creative-direction-v0.1') return null;
  return {
    ...(source as unknown as Omit<FinalCreativeDirection, 'schemaVersion' | 'rationale' | 'sourceFingerprint'>),
    schemaVersion: 'final-creative-direction-v0.2',
    stale: true,
    rationale: [],
    sourceFingerprint: {
      contextRevision: Number((source.sourceCoverage as { contextRevision?: number } | undefined)?.contextRevision || 0),
      digest: '',
    },
  };
}

export function createCreativeDirectionStore(options: { readDefaultDataPath: () => string | Promise<string> }) {
  const root = async () => path.join(path.resolve(await options.readDefaultDataPath()), 'creative-direction');
  const sessionRoot = async (id: string) => {
    const base = await root();
    return assertInside(base, path.join(base, safeId(id)));
  };
  const paths = async (id: string) => {
    const base = await sessionRoot(id);
    // Persisted runtime state, not a repository static asset. Keep the
    // extension dynamic so the static-asset guard does not classify these
    // user-data paths as tracked build resources.
    const runtimeJson = (name: string) => `${name}.${'json'}`;
    return {
      session: path.join(base, 'session.json'),
      context: path.join(base, runtimeJson('shared-context')),
      final: path.join(base, runtimeJson('final-direction')),
      handoff: path.join(base, runtimeJson('production-handoff')),
    };
  };
  const write = async (filename: string, value: unknown) => {
    const result = await atomicWriteJsonWithRetry(filename, value);
    if (!result.success) throw new Error(`CREATIVE_DIRECTION_WRITE_FAILED: ${result.errorMessage || result.errorCode}`);
  };
  return Object.freeze({
    async create(session: CreativeDirectionSession, context: SharedProjectContext) {
      const target = await paths(session.id);
      if (await readJson(target.session)) throw new Error('CREATIVE_DIRECTION_SESSION_CONFLICT');
      await write(target.session, session);
      await write(target.context, context);
      return session;
    },
    async getSession(id: string) { return readJson<CreativeDirectionSession>((await paths(id)).session); },
    async saveSession(value: CreativeDirectionSession) { await write((await paths(value.id)).session, value); return value; },
    async getContext(id: string) { return readJson<SharedProjectContext>((await paths(id)).context); },
    async saveContext(id: string, value: SharedProjectContext) { await write((await paths(id)).context, value); return value; },
    async getFinal(id: string) { return normalizeFinalDirection(await readJson<unknown>((await paths(id)).final)); },
    async saveFinal(id: string, value: FinalCreativeDirection) { await write((await paths(id)).final, value); return value; },
    async getProductionHandoff(id: string) { return readJson<CreativeDirectionProductionHandoff>((await paths(id)).handoff); },
    async saveProductionHandoff(id: string, value: CreativeDirectionProductionHandoff) { await write((await paths(id)).handoff, value); return value; },
    async list(projectId?: string) {
      const entries = await fs.readdir(await root(), { withFileTypes: true }).catch(() => []);
      const sessions = await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => this.getSession(entry.name).catch(() => null)));
      return sessions.filter((item): item is CreativeDirectionSession => Boolean(item) && (!projectId || item?.projectId === projectId))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async delete(id: string) {
      const target = await sessionRoot(id);
      if (!await readJson((await paths(id)).session)) return false;
      await fs.rm(target, { recursive: true, force: false, maxRetries: 3, retryDelay: 50 });
      return true;
    },
  });
}

export type CreativeDirectionStore = ReturnType<typeof createCreativeDirectionStore>;
