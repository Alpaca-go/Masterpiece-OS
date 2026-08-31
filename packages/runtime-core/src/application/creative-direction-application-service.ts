import { randomUUID } from 'node:crypto';
import type { CreativeIntelligenceWorkspaceView } from '../application-contracts.ts';
import type {
  CreateCreativeDirectionSessionInput,
  CreativeDirectionLane,
  CreativeDirectionProductionHandoff,
  CreativeDirectionSession,
  CreativeDirectionWorkspace,
  FinalCreativeDirection,
  SharedProjectFact,
  StrategyContribution,
  UpdateFinalCreativeDirectionInput,
  UpdateSharedProjectContextInput,
  VisualContribution,
} from './creative-direction-contracts.ts';
import { projectStrategyContribution } from './creative-direction-strategy-projection.ts';
import { projectVisualContribution, type CreativeDirectionVisualSource } from './creative-direction-visual-projection.ts';
import { buildCreativeDirectionSourceFingerprint, sameCreativeDirectionSourceFingerprint } from './creative-direction-source-fingerprint.ts';
import { synthesizeCreativeDirection } from './creative-direction-synthesis-service.ts';
import type { CreativeDirectionSynthesisAdapter } from './creative-direction-synthesis-adapter.ts';
import {
  validateCreativeDirectionProductionCompileResult,
  type CreativeDirectionProductionCompiler,
} from './creative-direction-production-compiler.ts';
import type { CreativeDirectionStore } from './creative-direction-store.ts';

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
  loadVisualResearch: (sessionId: string) => Promise<CreativeDirectionVisualSource>;
  createVisualResearch: (input: { projectId: string; sourceDocumentIds: string[] }) => Promise<CreativeDirectionVisualSource['session']>;
  productionCompiler?: CreativeDirectionProductionCompiler;
  synthesisAdapter?: CreativeDirectionSynthesisAdapter;
  now?: () => string;
  createId?: () => string;
}) {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || randomUUID;

  const required = async (id: string) => {
    const [session, context, finalDirection, productionHandoff] = await Promise.all([
      options.store.getSession(id), options.store.getContext(id), options.store.getFinal(id), options.store.getProductionHandoff(id),
    ]);
    if (!session || !context) throw new Error(`CREATIVE_DIRECTION_SESSION_NOT_FOUND: ${id}`);
    return { session, context, finalDirection, productionHandoff };
  };

  const laneState = async (session: CreativeDirectionSession): Promise<CreativeDirectionLane[]> => {
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

  const contributions = async (session: CreativeDirectionSession, lanes: CreativeDirectionLane[]) => {
    let strategy: StrategyContribution | null = null;
    let visual: VisualContribution | null = null;
    if (lanes[0]?.state === 'READY' && session.strategyRunId) strategy = projectStrategyContribution(await options.loadStrategy(session.strategyRunId));
    if (lanes[1]?.state === 'READY' && session.visualResearchSessionId) visual = projectVisualContribution(await options.loadVisualResearch(session.visualResearchSessionId));
    return { strategy, visual };
  };

  const workspace = async (id: string): Promise<CreativeDirectionWorkspace> => {
    const value = await required(id);
    const lanes = await laneState(value.session);
    if (!value.finalDirection) return { ...value, lanes };
    const current = await contributions(value.session, lanes);
    const fingerprint = buildCreativeDirectionSourceFingerprint({ contextRevision: value.context.revision, ...current });
    const stale = !sameCreativeDirectionSourceFingerprint(value.finalDirection.sourceFingerprint, fingerprint);
    return {
      ...value,
      lanes,
      finalDirection: stale ? { ...value.finalDirection, stale: true } : value.finalDirection,
      productionHandoff: stale && value.productionHandoff ? { ...value.productionHandoff, status: 'STALE' } : value.productionHandoff,
    };
  };

  const markDownstreamStale = async (id: string, finalDirection: FinalCreativeDirection | null, handoff: CreativeDirectionProductionHandoff | null, timestamp: string) => {
    if (finalDirection) await options.store.saveFinal(id, { ...finalDirection, stale: true, updatedAt: timestamp });
    if (handoff) await options.store.saveProductionHandoff(id, { ...handoff, status: 'STALE', updatedAt: timestamp });
  };

  const compileProduction = async (id: string): Promise<CreativeDirectionWorkspace> => {
    const current = await required(id);
    if (!current.finalDirection || current.finalDirection.status !== 'FINALIZED') throw new Error('CREATIVE_DIRECTION_FINALIZED_REQUIRED');
    const lanes = await laneState(current.session);
    const source = await contributions(current.session, lanes);
    const fingerprint = buildCreativeDirectionSourceFingerprint({ contextRevision: current.context.revision, ...source });
    if (!sameCreativeDirectionSourceFingerprint(current.finalDirection.sourceFingerprint, fingerprint)) {
      const timestamp = now();
      await markDownstreamStale(id, current.finalDirection, current.productionHandoff, timestamp);
      throw new Error('CREATIVE_DIRECTION_FRESH_FINAL_REQUIRED');
    }
    const timestamp = now();
    const base: CreativeDirectionProductionHandoff = current.productionHandoff ?? {
      schemaVersion: 'creative-direction-production-handoff-v0.1', sessionId: id,
      finalDirectionId: current.finalDirection.id, finalDirectionRevision: current.finalDirection.revision,
      projectId: current.session.projectId, status: 'PENDING', sourceFingerprint: fingerprint,
      createdAt: timestamp, updatedAt: timestamp,
    };
    if (!source.visual) {
      await options.store.saveProductionHandoff(id, { ...base, status: 'PENDING', pendingReason: 'VISUAL_RESEARCH_REQUIRED', updatedAt: timestamp });
      await options.store.saveSession({ ...current.session, status: 'FINALIZED', updatedAt: timestamp });
      return workspace(id);
    }
    if (!options.productionCompiler) {
      await options.store.saveProductionHandoff(id, { ...base, status: 'PENDING', pendingReason: 'PRODUCTION_COMPILER_UNAVAILABLE', updatedAt: timestamp });
      await options.store.saveSession({ ...current.session, status: 'FINALIZED', updatedAt: timestamp });
      return workspace(id);
    }
    await options.store.saveProductionHandoff(id, { ...base, status: 'COMPILING', pendingReason: undefined, errorCode: undefined, errorMessage: undefined, updatedAt: timestamp });
    await options.store.saveSession({ ...current.session, status: 'COMPILING_PRODUCTION', updatedAt: timestamp });
    try {
      const result = validateCreativeDirectionProductionCompileResult(await options.productionCompiler.compile({
        session: current.session,
        context: current.context,
        finalDirection: current.finalDirection,
      }));
      const completedAt = now();
      await options.store.saveProductionHandoff(id, { ...base, ...result, status: 'READY', pendingReason: undefined, errorCode: undefined, errorMessage: undefined, updatedAt: completedAt });
      await options.store.saveSession({ ...current.session, status: 'PRODUCTION_READY', updatedAt: completedAt });
    } catch (error) {
      const failedAt = now();
      const cause = error as { code?: string; message?: string };
      await options.store.saveProductionHandoff(id, { ...base, status: 'FAILED', pendingReason: undefined, errorCode: cause.code || 'PRODUCTION_COMPILE_FAILED', errorMessage: cause.message || String(error), updatedAt: failedAt });
      await options.store.saveSession({ ...current.session, status: 'PRODUCTION_FAILED', updatedAt: failedAt });
    }
    return workspace(id);
  };

  return Object.freeze({
    listSessions: (projectId?: string) => options.store.list(projectId),
    async createSession(input: CreateCreativeDirectionSessionInput) {
      if (!input.projectId?.trim() || !input.projectName?.trim()) throw new Error('CREATIVE_DIRECTION_PROJECT_REQUIRED');
      const sourceDocumentIds = [...new Set((input.sourceDocumentIds || []).map((value) => String(value || '').trim()).filter(Boolean))];
      if (!sourceDocumentIds.length) throw new Error('CREATIVE_DIRECTION_DOCUMENT_REQUIRED');
      const sourceDocumentLabels = [...new Set((input.sourceDocumentLabels || []).map((value) => String(value || '').replace(/\\/gu, '/').split('/').pop()?.trim() || '').filter(Boolean))].slice(0, sourceDocumentIds.length);
      const visualResearch = await options.createVisualResearch({ projectId: input.projectId, sourceDocumentIds });
      const timestamp = now();
      const id = `cd-${createId()}`;
      const facts: SharedProjectFact[] = [
        { key: 'projectName', value: input.projectName, authority: 'PROJECT_RECORD', evidence: ['项目记录'] },
        ...(input.brandName ? [{ key: 'brandName' as const, value: input.brandName, authority: 'PROJECT_RECORD' as const, evidence: ['项目记录'] }] : []),
        ...(input.industry ? [{ key: 'industry' as const, value: input.industry, authority: 'PROJECT_RECORD' as const, evidence: ['项目记录'] }] : []),
        ...(input.description ? [{ key: 'description' as const, value: input.description, authority: 'PROJECT_RECORD' as const, evidence: ['项目记录'] }] : []),
        ...(input.lockedFacts || []).map((value) => ({ key: 'lockedFact' as const, value, authority: 'AUTHORITATIVE_DOCUMENT' as const, evidence: ['项目锁定事实'] })),
      ];
      const session: CreativeDirectionSession = {
        schemaVersion: 'creative-direction-session-v0.1', id, projectId: input.projectId,
        projectName: input.projectName.trim(), sourceDocumentCount: sourceDocumentIds.length,
        sourceDocumentLabels, contextRevision: 1, strategyRunId: null,
        visualResearchSessionId: visualResearch.id, status: 'CONTEXT_REVIEW', createdAt: timestamp, updatedAt: timestamp,
      };
      const context = {
        schemaVersion: 'shared-project-context-v0.1' as const, projectId: input.projectId, revision: 1,
        facts: normalizeFacts(facts), confirmedByUser: false, createdAt: timestamp, updatedAt: timestamp,
      };
      await options.store.create(session, context);
      return workspace(id);
    },
    async deleteSession(id: string) {
      const current = await required(id);
      const deleted = await options.store.delete(id);
      return { deleted, retainedStrategyRunId: current.session.strategyRunId, retainedVisualResearchSessionId: current.session.visualResearchSessionId };
    },
    getWorkspace: workspace,
    async updateContext(id: string, input: UpdateSharedProjectContextInput) {
      const current = await required(id);
      if (!input.confirm) throw new Error('CREATIVE_DIRECTION_CONTEXT_CONFIRMATION_REQUIRED');
      const timestamp = now();
      const context = { ...current.context, revision: current.context.revision + 1, facts: normalizeFacts(input.facts), confirmedByUser: true, updatedAt: timestamp };
      await options.store.saveContext(id, context);
      await markDownstreamStale(id, current.finalDirection, current.productionHandoff, timestamp);
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
      if (current.session.strategyRunId !== runId) await markDownstreamStale(id, current.finalDirection, current.productionHandoff, timestamp);
      await options.store.saveSession({ ...current.session, strategyRunId: runId, status: 'IN_PROGRESS', updatedAt: timestamp });
      return workspace(id);
    },
    async linkVisualResearch(id: string, sourceId: string | null) {
      const current = await required(id);
      if (sourceId && (await options.loadVisualResearch(sourceId)).session.projectId !== current.session.projectId) throw new Error('CREATIVE_DIRECTION_PROJECT_MISMATCH');
      const timestamp = now();
      if (current.session.visualResearchSessionId !== sourceId) await markDownstreamStale(id, current.finalDirection, current.productionHandoff, timestamp);
      await options.store.saveSession({ ...current.session, visualResearchSessionId: sourceId, status: 'IN_PROGRESS', updatedAt: timestamp });
      return workspace(id);
    },
    async synthesize(id: string) {
      const current = await required(id);
      if (!current.context.confirmedByUser) throw new Error('CREATIVE_DIRECTION_CONTEXT_NOT_CONFIRMED');
      const lanes = await laneState(current.session);
      const source = await contributions(current.session, lanes);
      const timestamp = now();
      const finalDirection = await synthesizeCreativeDirection({
        sessionId: id, projectName: current.session.projectName, context: current.context, ...source,
        previous: current.finalDirection, id: `fd-${createId()}`, timestamp, adapter: options.synthesisAdapter,
      });
      finalDirection.sourceCoverage = {
        strategy: source.strategy ? 'USED' : current.session.strategyRunId ? 'NOT_READY' : 'NOT_LINKED',
        visualResearch: source.visual ? 'USED' : current.session.visualResearchSessionId ? 'NOT_READY' : 'NOT_LINKED',
        contextRevision: current.context.revision,
      };
      await options.store.saveFinal(id, finalDirection);
      if (current.productionHandoff) await options.store.saveProductionHandoff(id, { ...current.productionHandoff, status: 'STALE', updatedAt: timestamp });
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
      const currentWorkspace = await workspace(id);
      if (!currentWorkspace.finalDirection || currentWorkspace.finalDirection.stale) throw new Error('CREATIVE_DIRECTION_FRESH_DRAFT_REQUIRED');
      const timestamp = now();
      const finalized = { ...currentWorkspace.finalDirection, status: 'FINALIZED' as const, finalizedAt: timestamp, updatedAt: timestamp };
      await options.store.saveFinal(id, finalized);
      await options.store.saveSession({ ...currentWorkspace.session, status: 'FINALIZED', updatedAt: timestamp });
      await options.store.saveProductionHandoff(id, {
        schemaVersion: 'creative-direction-production-handoff-v0.1', sessionId: id,
        finalDirectionId: finalized.id, finalDirectionRevision: finalized.revision,
        projectId: currentWorkspace.session.projectId, status: 'PENDING', sourceFingerprint: finalized.sourceFingerprint,
        createdAt: timestamp, updatedAt: timestamp,
      });
      return compileProduction(id);
    },
    getProductionHandoff: async (id: string) => (await workspace(id)).productionHandoff,
    compileProduction,
    retryProduction: compileProduction,
  });
}

export type CreativeDirectionApplicationService = ReturnType<typeof createCreativeDirectionApplicationService>;
