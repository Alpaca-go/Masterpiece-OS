import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createCreativeSession,
  appendSessionMessage,
  migrateLegacyCreativeSession,
  recordSessionDecision,
  transitionCreativeSession,
  updateSessionEntityReference,
  validateCreativeSession,
} from '../packages/creative-production-runtime/src/session.js';

test('Creative Session keeps context and entity references but never stores a final prompt', () => {
  let session = createCreativeSession({
    projectId: 'project-1',
    projectContext: { brandName: 'Demo', goals: ['系列一致性', '系列一致性'] },
    inputs: { originalAssetIds: ['a1'] },
  }, '2026-07-28T00:00:00.000Z');
  session = recordSessionDecision(session, {
    type: 'primary_direction',
    summary: '确认温暖、克制的主方向',
    outcome: 'confirmed',
    source: 'user',
  }, '2026-07-28T00:01:00.000Z');
  session = updateSessionEntityReference(session, 'style_profile', { id: 'style-1', version: '1.0.0' });
  session = transitionCreativeSession(session, 'STYLE_PROFILE_CREATED', 'Style Profile 已创建');

  assert.equal(session.activeStyleProfileId, 'style-1');
  assert.equal(session.projectContext.goals.length, 1);
  assert.equal(session.decisions.length, 1);
  assert.equal(Object.hasOwn(session, 'finalPrompt'), false);
  assert.equal(Object.hasOwn(session, 'finalGenerationInstruction'), false);
  assert.deepEqual(session.messages, []);
  assert.deepEqual(session.generationRunIds, []);
  assert.deepEqual(session.lockedAssetIds, []);
});

test('Creative Session rejects backward and terminal transitions', () => {
  const session = transitionCreativeSession(
    createCreativeSession({ projectId: 'p' }),
    'STYLE_PROFILE_CREATED',
    'profile ready',
  );
  assert.throws(
    () => transitionCreativeSession(session, 'ANALYSIS_COMPLETED', 'go back'),
    (error) => error.code === 'SESSION_INVALID',
  );
  const completed = transitionCreativeSession(session, 'COMPLETED', 'done');
  assert.throws(
    () => transitionCreativeSession(completed, 'GENERATING', 'restart'),
    (error) => error.code === 'SESSION_INVALID',
  );
});

test('V18 migration removes Final Generation Instruction and preserves decisions/references', () => {
  const migrated = migrateLegacyCreativeSession({
    id: 'legacy-session',
    projectId: 'project-1',
    projectContext: { brandName: 'Legacy' },
    decisions: [{ type: 'direction', label: '保留暖色' }],
    styleProfileId: 'style-old',
    messages: [{
      role: 'assistant',
      type: 'generation_instruction',
      content: '{"finalPrompt":"must not survive"}',
      generationRunId: 'run-old',
    }],
    finalGenerationInstruction: 'must not survive',
    finalPrompt: 'must not survive',
  }, '2026-07-28T00:00:00.000Z');

  assert.equal(migrated.schemaVersion, '6.0');
  assert.equal(migrated.activeStyleProfileId, 'style-old');
  assert.equal(migrated.decisions[0].source, 'migration');
  assert.equal(Object.hasOwn(migrated, 'finalGenerationInstruction'), false);
  assert.equal(migrated.messages[0].type, 'system_event');
  assert.doesNotMatch(migrated.messages[0].content, /must not survive/);
  assert.deepEqual(migrated.generationRunIds, ['run-old']);
  assert.doesNotThrow(() => validateCreativeSession(migrated));
});

test('Session records natural-language requests and run references without embedding prompts', () => {
  let session = createCreativeSession({ projectId: 'p' });
  session = appendSessionMessage(session, {
    role: 'user',
    type: 'generation_request',
    content: '生成一张店内装修效果图',
  });
  session = appendSessionMessage(session, {
    role: 'assistant',
    type: 'generation_result',
    content: '已生成候选图。',
    generationRunId: 'run-1',
  });
  assert.equal(session.messages.length, 2);
  assert.deepEqual(session.generationRunIds, ['run-1']);
  assert.throws(
    () => appendSessionMessage(session, { content: '{"finalPrompt":"hidden"}' }),
    (error) => error.code === 'SESSION_INVALID',
  );
});

test('Creative Session JSON Schema exists and forbids unknown prompt fields', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.resolve('schemas/creative-production/creative-session.schema.json'),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.finalPrompt, undefined);
  assert.equal(schema.properties.finalGenerationInstruction, undefined);
  assert.equal(schema.properties.schemaVersion.const, '6.0');
});
