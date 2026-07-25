// §16 / §12 blocked 状态：不得显示「可交给 GPT 生图」的成功提示。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readinessStatusUserNotice } from '../src/shared/readiness-messages.ts';
import { orchestrateGenerationReadiness } from '../src/main/reference-first/index.ts';
import { minimalOrchestratorInput } from './reference-first-fixtures.ts';

test('does not show success message when blocked', () => {
  const blocked = readinessStatusUserNotice('blocked');
  assert.ok(!blocked.includes('交给 GPT'), 'blocked 文案不得含「交给 GPT」成功诱导');
  assert.ok(blocked.includes('不可进入生图'), 'blocked 必须明确告知不可进入生图');
});

test('ready and needs_review notices also avoid success-GPT phrasing', () => {
  for (const status of ['ready', 'needs_review'] as const) {
    const msg = readinessStatusUserNotice(status);
    assert.ok(!msg.includes('交给 GPT'), `${status} 文案不得含「交给 GPT」`);
  }
});

test('blocked readiness status drives a non-success UI notice', () => {
  // 生产入口：缺 Task Subset → blocked。
  const orchestration = orchestrateGenerationReadiness(minimalOrchestratorInput());
  assert.equal(orchestration.generationReadinessResult.status, 'blocked');
  const notice = readinessStatusUserNotice(orchestration.generationReadinessResult.status);
  assert.ok(!notice.includes('交给 GPT'), 'blocked 状态不得显示可交给 GPT 成功提示');
});

test('blocked state disables copy-to-GPT entry (status contract)', () => {
  // §12：blocked 时「复制 GPT 执行文档」与「进入生图」必须禁用。
  // 该禁用由 UI 依据 generationReadinessResult.status === 'blocked' 驱动。
  const orchestration = orchestrateGenerationReadiness(minimalOrchestratorInput());
  const blocked = orchestration.generationReadinessResult.status === 'blocked';
  assert.equal(blocked, true);
  // 复制 / 进入生图入口在 blocked 时必须禁用（派生自同一状态）。
  assert.notEqual(orchestration.generationReadinessResult.status, 'ready');
});
