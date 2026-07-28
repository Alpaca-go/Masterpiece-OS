import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  CreativeSession,
  CreativeSessionDecision,
  CreativeWorkflowState,
} from '../../../../packages/project-contracts/src/index.ts';
import {
  createCreativeSession,
  migrateLegacyCreativeSession,
  recordSessionDecision,
  appendSessionMessage,
  setCreativeUnderstanding,
  setSessionLockedAssetReferences,
  transitionCreativeSession,
  updateSessionEntityReference,
  validateCreativeSession,
} from '../../../../packages/creative-production-runtime/src/session.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';

const SESSION_FILENAME = 'session.json';

async function readJson(filename: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8'));
  } catch {
    return null;
  }
}

export function createCreativeSessionService(projects: ProjectStore) {
  async function locations(projectId: string) {
    const projectPaths = await projects.paths(projectId);
    return {
      session: path.join(projectPaths.root, SESSION_FILENAME),
      logs: path.join(projectPaths.root, 'logs', 'creative-session.ndjson'),
    };
  }

  async function persist(session: CreativeSession, event: string): Promise<CreativeSession> {
    validateCreativeSession(session);
    const target = await locations(session.projectId);
    const result = await atomicWriteJsonWithRetry(target.session, session);
    if (!result.success) {
      throw Object.assign(new Error(`Creative Session 保存失败：${result.errorMessage}`), { code: 'STATE_PERSIST_FAILED' });
    }
    await fs.mkdir(path.dirname(target.logs), { recursive: true });
    await fs.appendFile(target.logs, `${JSON.stringify({
      timestamp: session.updatedAt,
      event,
      projectId: session.projectId,
      sessionId: session.id,
      workflowState: session.workflowState,
    })}\n`, 'utf8');
    return session;
  }

  async function get(projectId: string): Promise<CreativeSession | null> {
    const target = await locations(projectId);
    const raw = await readJson(target.session);
    if (!raw) return null;
    if ((raw as { schemaVersion?: string; lockedAssetIds?: unknown }).schemaVersion !== '6.0'
      || !Array.isArray((raw as { lockedAssetIds?: unknown }).lockedAssetIds)) {
      return persist(migrateLegacyCreativeSession(raw), 'SESSION_MIGRATED');
    }
    return validateCreativeSession(raw) as CreativeSession;
  }

  async function create(projectId: string): Promise<CreativeSession> {
    const existing = await get(projectId);
    if (existing) return existing;
    const project = await projects.get(projectId);
    const session = createCreativeSession({
      projectId,
      projectContext: {
        brandName: project.brandName,
        industry: project.industry,
        projectType: project.description,
        goals: [],
        constraints: project.lockedFacts,
      },
      inputs: {
        originalAssetIds: project.assets.map((asset) => asset.id),
        referenceAssetIds: [],
        documentIds: [],
      },
    }) as CreativeSession;
    return persist(session, 'SESSION_CREATED');
  }

  async function transition(projectId: string, nextState: CreativeWorkflowState, summary: string): Promise<CreativeSession> {
    const current = await create(projectId);
    return persist(transitionCreativeSession(current, nextState, summary) as CreativeSession, 'WORKFLOW_TRANSITION');
  }

  async function recordDecision(projectId: string, decision: Omit<CreativeSessionDecision, 'id' | 'createdAt'>): Promise<CreativeSession> {
    const current = await create(projectId);
    return persist(recordSessionDecision(current, decision) as CreativeSession, 'DECISION_RECORDED');
  }

  async function setActiveEntity(
    projectId: string,
    entityType: 'creative_direction' | 'generation_blueprint' | 'style_profile' | 'visual_canon' | 'generation_series',
    entity: { id: string; version?: string },
  ): Promise<CreativeSession> {
    const current = await create(projectId);
    return persist(
      updateSessionEntityReference(current, entityType, entity) as CreativeSession,
      'ACTIVE_ENTITY_CHANGED',
    );
  }

  async function appendMessage(projectId: string, message: unknown): Promise<CreativeSession> {
    const current = await create(projectId);
    return persist(appendSessionMessage(current, message) as CreativeSession, 'MESSAGE_APPENDED');
  }

  async function saveUnderstanding(projectId: string, understanding: unknown): Promise<CreativeSession> {
    const current = await create(projectId);
    return persist(setCreativeUnderstanding(current, understanding) as CreativeSession, 'UNDERSTANDING_SAVED');
  }

  async function setLockedAssets(projectId: string, lockedAssetIds: string[]): Promise<CreativeSession> {
    const current = await create(projectId);
    return persist(
      setSessionLockedAssetReferences(current, lockedAssetIds) as CreativeSession,
      'LOCKED_ASSETS_UPDATED',
    );
  }

  return {
    create,
    get,
    transition,
    recordDecision,
    setActiveEntity,
    appendMessage,
    saveUnderstanding,
    setLockedAssets,
  };
}

export type CreativeSessionService = ReturnType<typeof createCreativeSessionService>;
