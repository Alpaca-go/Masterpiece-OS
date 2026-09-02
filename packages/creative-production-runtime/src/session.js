import crypto from 'node:crypto';

export const CREATIVE_WORKFLOW_STATES = Object.freeze([
  'CREATED', 'FILES_IMPORTED', 'ANALYZING', 'ANALYSIS_COMPLETED', 'VISUAL_ANALYSIS_COMPLETED',
  'SESSION_CREATED', 'DIRECTION_GENERATING', 'CREATIVE_DIRECTION_GENERATING',
  'DIRECTION_READY', 'CREATIVE_DIRECTION_READY', 'BLUEPRINT_GENERATING', 'BLUEPRINT_READY',
  'CREATIVE_DECISION_COMPLETED', 'STYLE_PROFILE_COMPILING', 'STYLE_PROFILE_CREATED',
  'VISUAL_EXPLORATION_GENERATING', 'VISUAL_EXPLORATION_READY', 'VISUAL_DIRECTION_SELECTED',
  'PRIMARY_ANCHOR_READY', 'PRIMARY_ANCHOR_GENERATING', 'PRIMARY_ANCHOR_PENDING_REVIEW',
  'PRIMARY_ANCHOR_CONFIRMED', 'CANON_BUILDING', 'VISUAL_CANON_CONFIRMED',
  'GENERATION_READY', 'GENERATING', 'IMAGE_GENERATING', 'REVIEWING_OUTPUTS', 'REVISION_IN_PROGRESS',
  'COMPLETED', 'FAILED', 'CANCELLED',
]);

const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const RECOVERABLE_TERMINAL_TRANSITIONS = new Set(['FAILED:SESSION_CREATED', 'CANCELLED:SESSION_CREATED']);
const BLUEPRINT_LOOP_TARGETS = new Set([
  'PRIMARY_ANCHOR_READY',
  'PRIMARY_ANCHOR_GENERATING',
  'GENERATION_READY',
  'GENERATING',
  'IMAGE_GENERATING',
]);

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
    ...(input?.sourceVisualRunId ? { sourceVisualRunId: String(input.sourceVisualRunId) } : {}),
    ...(input?.sourceReportPath ? { sourceReportPath: String(input.sourceReportPath) } : {}),
    ...(input?.understanding ? { understanding: input.understanding } : {}),
    messages: [],
    generationRunIds: [],
    lockedAssetIds: [],
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
  if (!Array.isArray(session.messages) || !Array.isArray(session.generationRunIds)
    || !Array.isArray(session.lockedAssetIds)
    || !Array.isArray(session.decisions) || !Array.isArray(session.history)) {
    throw Object.assign(new Error('Creative Session messages/generationRunIds/lockedAssetIds/decisions/history 必须为数组。'), { code: 'SESSION_INVALID' });
  }
  if (session.messages.some((message) => message.type === 'generation_instruction' || /"finalPrompt"\s*:/.test(message.content))) {
    throw Object.assign(new Error('Creative Session 消息禁止保存完整 Final Generation Instruction。'), { code: 'SESSION_INVALID' });
  }
  const canonFields = [
    session.visualMigrationCanonId,
    session.visualMigrationCanonFingerprint,
    session.visualMigrationCanonSourceFingerprint,
  ];
  if (canonFields.some((value) => value !== undefined)) {
    if (!/^vmc-[a-f0-9]{32}$/u.test(String(session.visualMigrationCanonId ?? ''))
      || !/^sha256:[a-f0-9]{64}$/u.test(String(session.visualMigrationCanonFingerprint ?? ''))
      || !/^sha256:[a-f0-9]{64}$/u.test(String(session.visualMigrationCanonSourceFingerprint ?? ''))) {
      throw Object.assign(new Error('Creative Session 的 Visual Migration Canon 关联无效。'), { code: 'SESSION_INVALID' });
    }
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
  const blueprintLoop = nextState === 'BLUEPRINT_GENERATING'
    || (session.workflowState === 'BLUEPRINT_READY' && BLUEPRINT_LOOP_TARGETS.has(nextState));
  const evaluationLoop = ['REVIEWING_OUTPUTS', 'REVISION_IN_PROGRESS'].includes(session.workflowState)
    && ['REVISION_IN_PROGRESS', 'GENERATING'].includes(nextState);
  if (TERMINAL_STATES.has(session.workflowState) && !terminalRecovery) {
    throw Object.assign(new Error(`终态 ${session.workflowState} 不能直接转为 ${nextState}。`), { code: 'SESSION_INVALID' });
  }
  if (!terminalRecovery && !blueprintLoop && !evaluationLoop
    && nextState !== 'FAILED' && nextState !== 'CANCELLED' && nextIndex < currentIndex) {
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
    creative_direction: 'activeCreativeDirectionId',
    generation_blueprint: 'activeGenerationBlueprintId',
    style_profile: 'activeStyleProfileId',
    visual_exploration: 'activeVisualExplorationId',
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

export function appendSessionMessage(session, message, now = new Date().toISOString()) {
  validateCreativeSession(session);
  const type = message?.type || 'system_event';
  const allowedTypes = [
    'reading_instruction', 'reading_result', 'generation_request',
    'generation_result', 'user_feedback', 'system_event',
  ];
  if (!allowedTypes.includes(type)) {
    throw Object.assign(new Error(`Session 消息类型无效：${type}`), { code: 'SESSION_INVALID' });
  }
  const content = String(message?.content ?? '').trim();
  if (!content) throw Object.assign(new Error('Session 消息不能为空。'), { code: 'SESSION_INVALID' });
  if (/"finalPrompt"\s*:/.test(content)) {
    throw Object.assign(new Error('Session 消息不得嵌入 Final Prompt。'), { code: 'SESSION_INVALID' });
  }
  const entry = {
    messageId: message?.messageId || `message-${crypto.randomUUID()}`,
    role: message?.role || 'user',
    type,
    content,
    ...(message?.generationRunId ? { generationRunId: String(message.generationRunId) } : {}),
    createdAt: now,
  };
  return validateCreativeSession({
    ...session,
    messages: [...session.messages, entry],
    generationRunIds: entry.generationRunId
      ? uniqueStrings([...session.generationRunIds, entry.generationRunId])
      : session.generationRunIds,
    updatedAt: now,
  });
}

export function setCreativeUnderstanding(session, understanding, now = new Date().toISOString()) {
  validateCreativeSession(session);
  if (!understanding || understanding.schemaVersion !== '1.0') {
    throw Object.assign(new Error('Creative Understanding 无效。'), { code: 'CREATIVE_UNDERSTANDING_MISSING' });
  }
  return validateCreativeSession({
    ...session,
    understanding,
    messages: [...session.messages, {
      messageId: `message-${crypto.randomUUID()}`,
      role: 'assistant',
      type: 'reading_result',
      content: 'Creative Understanding 已生成并保存。',
      createdAt: now,
    }],
    updatedAt: now,
  });
}

export function setSessionLockedAssetReferences(session, lockedAssetIds, now = new Date().toISOString()) {
  validateCreativeSession(session);
  const references = uniqueStrings(lockedAssetIds);
  return validateCreativeSession({
    ...session,
    lockedAssetIds: references,
    history: [...session.history, historyEntry(
      'LOCKED_ASSETS_UPDATED',
      'Locked Assets 引用已更新。',
      now,
      { lockedAssetIds: references },
    )],
    updatedAt: now,
  });
}

export function setSessionVisualMigrationReference(session, reference, now = new Date().toISOString()) {
  validateCreativeSession(session);
  const referencePackId = requireText(reference?.referencePackId, 'reference.referencePackId');
  const sourceReferenceAnchorRunId = requireText(
    reference?.sourceReferenceAnchorRunId,
    'reference.sourceReferenceAnchorRunId',
  );
  const referencePackSourceFingerprint = requireText(
    reference?.sourceFingerprint,
    'reference.sourceFingerprint',
  );
  return validateCreativeSession({
    ...session,
    referencePackId,
    sourceReferenceAnchorRunId,
    referencePackSourceFingerprint,
    history: [...session.history, historyEntry(
      'VISUAL_MIGRATION_REFERENCE_LINKED',
      `Production Reference Pack ${referencePackId} 已关联。`,
      now,
      { entityType: 'decision', entityId: referencePackId },
    )],
    updatedAt: now,
  });
}

export function setSessionVisualMigrationCanon(session, reference, now = new Date().toISOString()) {
  validateCreativeSession(session);
  const visualMigrationCanonId = requireText(reference?.canonId, 'reference.canonId');
  const visualMigrationCanonFingerprint = requireText(reference?.canonFingerprint, 'reference.canonFingerprint');
  const visualMigrationCanonSourceFingerprint = requireText(
    reference?.sourceFingerprint,
    'reference.sourceFingerprint',
  );
  return validateCreativeSession({
    ...session,
    visualMigrationCanonId,
    visualMigrationCanonFingerprint,
    visualMigrationCanonSourceFingerprint,
    history: [...session.history, historyEntry(
      'VISUAL_MIGRATION_CANON_LINKED',
      'Visual Migration Canon 已关联。',
      now,
      { entityType: 'decision', entityId: visualMigrationCanonId },
    )],
    updatedAt: now,
  });
}

export function migrateLegacyCreativeSession(legacy, now = new Date().toISOString()) {
  if (legacy?.schemaVersion === '6.0') {
    return validateCreativeSession({
      ...legacy,
      messages: Array.isArray(legacy.messages) ? legacy.messages : [],
      generationRunIds: uniqueStrings(legacy.generationRunIds),
      lockedAssetIds: uniqueStrings(legacy.lockedAssetIds),
      decisions: Array.isArray(legacy.decisions) ? legacy.decisions : [],
      history: Array.isArray(legacy.history) ? legacy.history : [],
      updatedAt: legacy.updatedAt || now,
    });
  }
  const session = createCreativeSession({
    id: legacy?.id,
    projectId: legacy?.projectId,
    projectContext: legacy?.projectContext,
    inputs: legacy?.inputs,
    analysis: legacy?.analysis,
    sourceVisualRunId: legacy?.sourceVisualRunId,
    sourceReportPath: legacy?.sourceReportPath,
    understanding: legacy?.understanding,
  }, legacy?.createdAt || now);
  let migrated = {
    ...session,
    activeStyleProfileId: legacy?.activeStyleProfileId || legacy?.styleProfileId || undefined,
    activeVisualExplorationId: legacy?.activeVisualExplorationId || undefined,
    activeVisualCanonId: legacy?.activeVisualCanonId || legacy?.visualCanonId || undefined,
    activeSeriesId: legacy?.activeSeriesId || legacy?.seriesId || undefined,
    visualMigrationCanonId: legacy?.visualMigrationCanonId || undefined,
    visualMigrationCanonFingerprint: legacy?.visualMigrationCanonFingerprint || undefined,
    visualMigrationCanonSourceFingerprint: legacy?.visualMigrationCanonSourceFingerprint || undefined,
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
    messages: Array.isArray(legacy?.messages)
      ? legacy.messages.map((item) => {
          const isInstruction = item.type === 'generation_instruction';
          return {
            messageId: item.messageId || `message-${crypto.randomUUID()}`,
            role: ['system', 'user', 'assistant'].includes(item.role) ? item.role : 'system',
            type: isInstruction ? 'system_event' : (
              ['reading_instruction', 'reading_result', 'generation_request', 'generation_result', 'user_feedback', 'system_event'].includes(item.type)
                ? item.type
                : 'system_event'
            ),
            content: isInstruction
              ? `旧版 Final Generation Instruction 已迁移为运行快照引用${item.generationRunId ? `：${item.generationRunId}` : ''}。`
              : String(item.content || '旧版会话事件'),
            ...(item.generationRunId ? { generationRunId: String(item.generationRunId) } : {}),
            createdAt: item.createdAt || now,
          };
        })
      : [],
    generationRunIds: uniqueStrings(legacy?.generationRunIds || legacy?.generationRuns),
    lockedAssetIds: uniqueStrings(legacy?.lockedAssetIds),
    updatedAt: now,
  };
  migrated = {
    ...migrated,
    generationRunIds: uniqueStrings([
      ...migrated.generationRunIds,
      ...migrated.messages.map((message) => message.generationRunId).filter(Boolean),
    ]),
    history: [...migrated.history, historyEntry(
      'SESSION_MIGRATED',
      '旧版 Creative Session 已迁移；Final Generation Instruction 未被保留。',
      now,
    )],
  };
  return validateCreativeSession(migrated);
}
