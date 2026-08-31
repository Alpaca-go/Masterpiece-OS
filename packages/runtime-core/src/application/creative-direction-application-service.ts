import { randomUUID } from 'node:crypto';
import type { CreativeIntelligenceWorkspaceView } from '../application-contracts.ts';
import type { CreativeDirectionContext, CreativeResearchSession, DirectionBoard } from './creative-research/contracts.ts';
import type {
  CreateCreativeDirectionSessionInput,
  CreativeDirectionLane,
  CreativeDirectionWorkspace,
  FinalCreativeDirection,
  SharedProjectFact,
  UpdateFinalCreativeDirectionInput,
  UpdateSharedProjectContextInput,
} from './creative-direction-contracts.ts';
import type { CreativeDirectionStore } from './creative-direction-store.ts';

type VisualSource = { session: CreativeResearchSession; board: DirectionBoard | null; context: CreativeDirectionContext | null };

function texts(value: unknown, output: string[] = []): string[] {
  if (typeof value === 'string' && value.trim()) output.push(value.trim());
  else if (Array.isArray(value)) value.forEach((item) => texts(item, output));
  else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach((item) => texts(item, output));
  return output;
}

function unique(values: string[], max = 8): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, max);
}

function normalizeFacts(facts: SharedProjectFact[]): SharedProjectFact[] {
  return facts.map((fact) => ({
    key: fact.key,
    value: String(fact.value || '').trim(),
    authority: fact.authority,
    evidence: unique(fact.evidence || [], 12),
  })).filter((fact) => fact.value);
}

export function createCreativeDirectionApplicationService(options: {
  store: CreativeDirectionStore;
  loadStrategy: (runId: string) => Promise<CreativeIntelligenceWorkspaceView>;
  loadVisualResearch: (sessionId: string) => Promise<VisualSource>;
  now?: () => string;
  createId?: () => string;
}) {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || randomUUID;
  const required = async (id: string) => {
    const [session, context, finalDirection] = await Promise.all([
      options.store.getSession(id), options.store.getContext(id), options.store.getFinal(id),
    ]);
    if (!session || !context) throw new Error(`CREATIVE_DIRECTION_SESSION_NOT_FOUND: ${id}`);
    return { session, context, finalDirection };
  };
  const laneState = async (session: Awaited<ReturnType<typeof required>>['session']): Promise<CreativeDirectionLane[]> => {
    let strategy: CreativeDirectionLane = { kind: 'STRATEGY', linkedId: session.strategyRunId, state: 'EMPTY', summary: '尚未关联策略推演' };
    if (session.strategyRunId) {
      try {
        const source = await options.loadStrategy(session.strategyRunId);
        strategy = source.run.projectId && source.run.projectId !== session.projectId
          ? { ...strategy, state: 'BLOCKED', summary: '策略推演属于其他项目' }
          : source.selectedDirectionSnapshot
            ? { ...strategy, state: 'READY', summary: '已采用用户确认的策略方向' }
            : { ...strategy, state: 'IN_PROGRESS', summary: '等待用户选择策略方向' };
      } catch { strategy = { ...strategy, state: 'BLOCKED', summary: '无法读取关联的策略推演' }; }
    }
    let visual: CreativeDirectionLane = { kind: 'VISUAL_RESEARCH', linkedId: session.visualResearchSessionId, state: 'EMPTY', summary: '尚未关联视觉研究' };
    if (session.visualResearchSessionId) {
      try {
        const source = await options.loadVisualResearch(session.visualResearchSessionId);
        visual = source.session.projectId !== session.projectId
          ? { ...visual, state: 'BLOCKED', summary: '视觉研究属于其他项目' }
          : source.context
            ? { ...visual, state: 'READY', summary: '已采用设计师确认的视觉方向' }
            : { ...visual, state: 'IN_PROGRESS', summary: '等待完成视觉方向' };
      } catch { visual = { ...visual, state: 'BLOCKED', summary: '无法读取关联的视觉研究' }; }
    }
    return [strategy, visual];
  };
  const workspace = async (id: string): Promise<CreativeDirectionWorkspace> => {
    const value = await required(id);
    return { ...value, lanes: await laneState(value.session) };
  };

  return Object.freeze({
    listSessions: (projectId?: string) => options.store.list(projectId),
    async createSession(input: CreateCreativeDirectionSessionInput) {
      if (!input.projectId?.trim() || !input.projectName?.trim()) throw new Error('CREATIVE_DIRECTION_PROJECT_REQUIRED');
      const timestamp = now();
      const id = `cd-${createId()}`;
      const facts: SharedProjectFact[] = [
        { key: 'projectName', value: input.projectName, authority: 'PROJECT_RECORD', evidence: ['项目记录'] },
        ...(input.brandName ? [{ key: 'brandName' as const, value: input.brandName, authority: 'PROJECT_RECORD' as const, evidence: ['项目记录'] }] : []),
        ...(input.industry ? [{ key: 'industry' as const, value: input.industry, authority: 'PROJECT_RECORD' as const, evidence: ['项目记录'] }] : []),
        ...(input.description ? [{ key: 'description' as const, value: input.description, authority: 'PROJECT_RECORD' as const, evidence: ['项目记录'] }] : []),
        ...(input.lockedFacts || []).map((value) => ({ key: 'lockedFact' as const, value, authority: 'AUTHORITATIVE_DOCUMENT' as const, evidence: ['项目锁定事实'] })),
      ];
      const session = {
        schemaVersion: 'creative-direction-session-v0.1' as const, id, projectId: input.projectId,
        projectName: input.projectName.trim(), contextRevision: 1, strategyRunId: null,
        visualResearchSessionId: null, status: 'CONTEXT_REVIEW' as const, createdAt: timestamp, updatedAt: timestamp,
      };
      const context = {
        schemaVersion: 'shared-project-context-v0.1' as const, projectId: input.projectId, revision: 1,
        facts: normalizeFacts(facts), confirmedByUser: false, createdAt: timestamp, updatedAt: timestamp,
      };
      await options.store.create(session, context);
      return workspace(id);
    },
    getWorkspace: workspace,
    async updateContext(id: string, input: UpdateSharedProjectContextInput) {
      const current = await required(id);
      if (!input.confirm) throw new Error('CREATIVE_DIRECTION_CONTEXT_CONFIRMATION_REQUIRED');
      const timestamp = now();
      const context = { ...current.context, revision: current.context.revision + 1, facts: normalizeFacts(input.facts), confirmedByUser: true, updatedAt: timestamp };
      await options.store.saveContext(id, context);
      if (current.finalDirection) await options.store.saveFinal(id, { ...current.finalDirection, stale: true, updatedAt: timestamp });
      await options.store.saveSession({ ...current.session, contextRevision: context.revision, status: 'IN_PROGRESS', updatedAt: timestamp });
      return workspace(id);
    },
    async linkStrategy(id: string, runId: string | null) {
      const current = await required(id);
      if (runId) {
        const source = await options.loadStrategy(runId);
        if (source.run.projectId && source.run.projectId !== current.session.projectId) throw new Error('CREATIVE_DIRECTION_PROJECT_MISMATCH');
      }
      const timestamp = now();
      if (current.finalDirection && current.session.strategyRunId !== runId) {
        await options.store.saveFinal(id, { ...current.finalDirection, stale: true, updatedAt: timestamp });
      }
      await options.store.saveSession({ ...current.session, strategyRunId: runId, status: 'IN_PROGRESS', updatedAt: timestamp });
      return workspace(id);
    },
    async linkVisualResearch(id: string, sourceId: string | null) {
      const current = await required(id);
      if (sourceId && (await options.loadVisualResearch(sourceId)).session.projectId !== current.session.projectId) throw new Error('CREATIVE_DIRECTION_PROJECT_MISMATCH');
      const timestamp = now();
      if (current.finalDirection && current.session.visualResearchSessionId !== sourceId) {
        await options.store.saveFinal(id, { ...current.finalDirection, stale: true, updatedAt: timestamp });
      }
      await options.store.saveSession({ ...current.session, visualResearchSessionId: sourceId, status: 'IN_PROGRESS', updatedAt: timestamp });
      return workspace(id);
    },
    async synthesize(id: string) {
      const current = await required(id);
      if (!current.context.confirmedByUser) throw new Error('CREATIVE_DIRECTION_CONTEXT_NOT_CONFIRMED');
      const lanes = await laneState(current.session);
      const strategyReady = lanes[0]?.state === 'READY';
      const visualReady = lanes[1]?.state === 'READY';
      if (!strategyReady && !visualReady) throw new Error('CREATIVE_DIRECTION_SOURCE_NOT_READY');
      const strategy = strategyReady && current.session.strategyRunId ? await options.loadStrategy(current.session.strategyRunId) : null;
      const visual = visualReady && current.session.visualResearchSessionId ? await options.loadVisualResearch(current.session.visualResearchSessionId) : null;
      const strategyTexts = unique(texts(strategy?.selectedDirectionSnapshot), 12);
      const visualTexts = unique(texts(visual?.context), 16);
      const board = visual?.board;
      const factTexts = current.context.facts.map((fact) => fact.value);
      const conflicts: string[] = [];
      const strategicCorpus = strategyTexts.join(' ').toLowerCase();
      const visualCorpus = visualTexts.join(' ').toLowerCase();
      if (/(trust|professional|可信|专业|清晰|information)/u.test(strategicCorpus) && /(extreme|minimal|极简|留白)/u.test(visualCorpus)) {
        conflicts.push('保留克制与留白，但信息层级和关键事实的可读性优先。');
      }
      const timestamp = now();
      const previous = current.finalDirection;
      const finalDirection: FinalCreativeDirection = {
        schemaVersion: 'final-creative-direction-v0.1', id: previous?.id || `fd-${createId()}`,
        sessionId: id, revision: (previous?.revision || 0) + 1, status: 'DRAFT', stale: false,
        title: previous?.title || `${current.session.projectName} 创意方向`,
        proposition: previous?.proposition || strategyTexts[0] || board?.summary || visual?.context?.directionSummary || '围绕已确认项目事实建立一致的策略与视觉表达。',
        strategicPrinciples: unique(strategyTexts.slice(1, 6), 5),
        visualPrinciples: unique([...(board?.visualKeywords || []), ...visualTexts.slice(0, 5)], 8),
        negativeConstraints: unique([...(visual?.context?.negativeSignals || []).map((item) => item.reason || item.value || item.type), ...current.context.facts.filter((fact) => fact.key === 'lockedFact').map((fact) => `不得违背：${fact.value}`)], 8),
        risks: unique([...conflicts.map((item) => `策略与视觉张力：${item}`), ...(strategy?.warnings || [])], 8),
        conflictResolutions: conflicts,
        evidence: unique([...factTexts.map((value) => `共享事实：${value}`), ...(strategy ? [`策略方向：${current.session.strategyRunId}`] : []), ...(visual ? [`视觉研究：${current.session.visualResearchSessionId}`] : [])], 16),
        sourceCoverage: { strategy: strategy ? 'USED' : current.session.strategyRunId ? 'NOT_READY' : 'NOT_LINKED', visualResearch: visual ? 'USED' : current.session.visualResearchSessionId ? 'NOT_READY' : 'NOT_LINKED', contextRevision: current.context.revision },
        createdAt: previous?.createdAt || timestamp, updatedAt: timestamp,
      };
      await options.store.saveFinal(id, finalDirection);
      await options.store.saveSession({ ...current.session, status: 'DRAFT_READY', updatedAt: timestamp });
      return workspace(id);
    },
    async updateDraft(id: string, patch: UpdateFinalCreativeDirectionInput) {
      const current = await required(id);
      if (!current.finalDirection || current.finalDirection.status !== 'DRAFT') throw new Error('CREATIVE_DIRECTION_DRAFT_NOT_FOUND');
      const next = { ...current.finalDirection, ...patch, updatedAt: now() };
      await options.store.saveFinal(id, next);
      return workspace(id);
    },
    async finalize(id: string, confirm: boolean) {
      if (!confirm) throw new Error('CREATIVE_DIRECTION_FINAL_CONFIRMATION_REQUIRED');
      const current = await required(id);
      if (!current.finalDirection || current.finalDirection.stale) throw new Error('CREATIVE_DIRECTION_FRESH_DRAFT_REQUIRED');
      const timestamp = now();
      await options.store.saveFinal(id, { ...current.finalDirection, status: 'FINALIZED', finalizedAt: timestamp, updatedAt: timestamp });
      await options.store.saveSession({ ...current.session, status: 'FINALIZED', updatedAt: timestamp });
      return workspace(id);
    },
  });
}

export type CreativeDirectionApplicationService = ReturnType<typeof createCreativeDirectionApplicationService>;
