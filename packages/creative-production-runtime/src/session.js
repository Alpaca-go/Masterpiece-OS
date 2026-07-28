import crypto from 'node:crypto';

export const CREATIVE_WORKFLOW_STATES = Object.freeze([
  'CREATED', 'FILES_IMPORTED', 'ANALYZING', 'ANALYSIS_COMPLETED', 'SESSION_CREATED',
  'CREATIVE_DECISION_COMPLETED', 'STYLE_PROFILE_COMPILING', 'STYLE_PROFILE_CREATED',
  'PRIMARY_ANCHOR_READY', 'PRIMARY_ANCHOR_GENERATING', 'PRIMARY_ANCHOR_PENDING_REVIEW',
  'PRIMARY_ANCHOR_CONFIRMED', 'CANON_BUILDING', 'VISUAL_CANON_CONFIRMED',
  'GENERATION_READY', 'GENERATING', 'REVIEWING_OUTPUTS', 'REVISION_IN_PROGRESS',
  'COMPLETED', 'FAILED', 'CANCELLED',
]);

const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const RECOVERABLE_TERMINAL_TRANSITIONS = new Set(['FAILED:SESSION_CREATED', 'CANCELLED:SESSION_CREATED']);

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value).trim()).filter(Boolean))];
}

function requireText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw Object.assign(new Error(`${field} 不能为空。`), { code: 'SESSION_INVALID' });
  return text;
}

function historyEntry(event, summary, now, detail = {}) {
  return { id: `history-${crypto.randomUUID()}`, event, summary, ...detail, createdAt: now };
}

export function createCreativeSession(input, now = new Date().toISOString()) {
  const projectId = requireText(input?.projectId, 'projectId');
  const session = {
    schemaVersion: '6.0',
    id: input?.id || `session-${crypto.randomUUID()}`,
    projectId,
    status: 'active',
    workflowState: 'SESSION_CREATED',
    projectContext: {
      brandName: String(input?.projectContext?.brandName ?? '').trim(),
      industry: String(input?.projectContext?.industry ?? '').trim(),
      projectType: String(input?.projectContext?.projectType ?? '').trim(),
      goals: uniqueStrings(input?.projectContext?.goals),
      constraints: uniqueStrings(input?.projectContext?.constraints),
    },
    inputs: {
      originalAssetIds: uniqueStrings(input?.inputs?.originalAssetIds),
      referenceAssetIds: uniqueStrings(input?.inputs?.referenceAssetIds),
      documentIds: uniqueStrings(input?.inputs?.documentIds),
    },
    analysis: { ...(input?.analysis ?? {}) },
    decisions: [],
    history: [historyEntry('SESSION_CREATED', 'Creative Session 已创建。', now, { toState: 'SESSION_CREATED' })],
    createdAt: now,
    updatedAt: now,
  };
  return validateCreativeSession(session);
}

export function validateCreativeSession(session) {
  if (!session || session.schemaVersion !== '6.0') {
    throw Object.assign(new Error('Creative Session Schema 版本无效。'), { code: 'SESSION_INVALID' });
  }
  requireText(session.id, 'session.id');
  requireText(session.projectId, 'session.projectId');
  if (!['active', 'archived', 'failed'].includes(session.status)) {
    throw Object.assign(new Error('Creative Session 生命周期状态无效。'), { code: 'SESSION_INVALID' });
  }
  if (!CREATIVE_WORKFLOW_STATES.includes(session.workflowState)) {
    throw Object.assign(new Error('Creative Session 工作流状态无效。'), { code: 'SESSION_INVALID' });
  }
  for (const forbidden of ['finalPrompt', 'prompt', 'finalGenerationInstruction']) {
    if (Object.hasOwn(session, forbidden)) {
      throw Object.assign(new Error(`Creative Session 禁止保存 ${forbidden}。`), { code: 'SESSION_INVALID' });
    }
  }
  if (!Array.isArray(session.decisions) || !Array.isArray(session.history)) {
    throw Object.assign(new Error('Creative Session decisions/history 必须为数组。'), { code: 'SESSION_INVALID' });
  }
  return session;
}

export function transitionCreativeSession(session, nextState, summary, now = new Date().toISOString()) {
  validateCreativeSession(session);
  if (!CREATIVE_WORKFLOW_STATES.includes(nextState)) {
    throw Object.assign(new Error(`未知工作流状态：${nextState}`), { code: 'SESSION_INVALID' });
  }
  const currentIndex = CREATIVE_WORKFLOW_STATES.indexOf(session.workflowState);
  const nextIndex = CREATIVE_WORKFLOW_STATES.indexOf(nextState);
  const terminalRecovery = RECOVERABLE_TERMINAL_TRANSITIONS.has(`${session.workflowState}:${nextState}`);
  if (TERMINAL_STATES.has(session.workflowState) && !terminalRecovery) {
    throw Object.assign(new Error(`终态 ${session.workflowState} 不能直接转为 ${nextState}。`), { code: 'SESSION_INVALID' });
  }
  if (!terminalRecovery && nextState !== 'FAILED' && nextState !== 'CANCELLED' && nextIndex < currentIndex) {
    throw Object.assign(new Error(`工作流不能从 ${session.workflowState} 倒退到 ${nextState}。`), { code: 'SESSION_INVALID' });
  }
  return validateCreativeSession({
    ...session,
    status: nextState === 'FAILED' ? 'failed' : session.status === 'failed' ? 'active' : session.status,
    workflowState: nextState,
    history: [...session.history, historyEntry('WORKFLOW_TRANSITION', requireText(summary, 'transition.summary'), now, {
      fromState: session.workflowState,
      toState: nextState,
    })],
    updatedAt: now,
  });
}

export function recordSessionDecision(session, decision, now = new Date().toISOString()) {
  validateCreativeSession(session);
  const entry = {
    id: decision?.id || `decision-${crypto.randomUUID()}`,
    type: requireText(decision?.type, 'decision.type'),
    summary: requireText(decision?.summary, 'decision.summary'),
    ...(decision?.rationale ? { rationale: String(decision.rationale).trim() } : {}),
    outcome: decision?.outcome || 'confirmed',
    source: decision?.source || 'user',
    createdAt: now,
  };
  if (!['confirmed', 'rejected', 'superseded'].includes(entry.outcome)) {
    throw Object.assign(new Error('决策 outcome 无效。'), { code: 'SESSION_INVALID' });
  }
  if (!['user', 'analysis', 'migration', 'system'].includes(entry.source)) {
    throw Object.assign(new Error('决策 source 无效。'), { code: 'SESSION_INVALID' });
  }
  return validateCreativeSession({
    ...session,
    decisions: [...session.decisions, entry],
    history: [...session.history, historyEntry('DECISION_RECORDED', entry.summary, now, {
      entityType: 'decision',
      entityId: entry.id,
    })],
    updatedAt: now,
  });
}

export function updateSessionEntityReference(session, entityType, entity, now = new Date().toISOString()) {
  validateCreativeSession(session);
  const mapping = {
    style_profile: 'activeStyleProfileId',
    visual_canon: 'activeVisualCanonId',
    generation_series: 'activeSeriesId',
  };
  const field = mapping[entityType];
  if (!field) throw Object.assign(new Error(`不支持的 Session 引用类型：${entityType}`), { code: 'SESSION_INVALID' });
  const entityId = requireText(entity?.id, `${entityType}.id`);
  return validateCreativeSession({
    ...session,
    [field]: entityId,
    history: [...session.history, historyEntry('ACTIVE_ENTITY_CHANGED', `${entityType} 已切换至 ${entityId}。`, now, {
      entityType,
      entityId,
      ...(entity?.version ? { version: String(entity.version) } : {}),
    })],
    updatedAt: now,
  });
}

export function migrateLegacyCreativeSession(legacy, now = new Date().toISOString()) {
  if (legacy?.schemaVersion === '6.0') return validateCreativeSession(legacy);
  const session = createCreativeSession({
    id: legacy?.id,
    projectId: legacy?.projectId,
    projectContext: legacy?.projectContext,
    inputs: legacy?.inputs,
    analysis: legacy?.analysis,
  }, legacy?.createdAt || now);
  let migrated = {
    ...session,
    activeStyleProfileId: legacy?.activeStyleProfileId || legacy?.styleProfileId || undefined,
    activeVisualCanonId: legacy?.activeVisualCanonId || legacy?.visualCanonId || undefined,
    activeSeriesId: legacy?.activeSeriesId || legacy?.seriesId || undefined,
    decisions: Array.isArray(legacy?.decisions)
      ? legacy.decisions.map((item) => ({
          id: item.id || `decision-${crypto.randomUUID()}`,
          type: String(item.type || 'legacy_decision'),
          summary: String(item.summary || item.label || '旧版决策'),
          outcome: ['confirmed', 'rejected', 'superseded'].includes(item.outcome) ? item.outcome : 'confirmed',
          source: 'migration',
          createdAt: item.createdAt || now,
        }))
      : [],
    updatedAt: now,
  };
  migrated = {
    ...migrated,
    history: [...migrated.history, historyEntry(
      'SESSION_MIGRATED',
      '旧版 Creative Session 已迁移；Final Generation Instruction 未被保留。',
      now,
    )],
  };
  return validateCreativeSession(migrated);
}
