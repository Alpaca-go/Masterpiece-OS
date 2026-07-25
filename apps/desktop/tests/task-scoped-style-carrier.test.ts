// §16 / §8 Task-Scoped Style Carriers：每个任务主载体必须 3~6 个且按约束筛选，否则阻断。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCE_FIRST_VALIDATORS,
  runAllValidators,
  VALIDATOR_IDS
} from '../src/main/reference-first/index.ts';
import type { ReadinessValidationIssue } from '../src/shared/types.ts';
import type { GenerationValidationContext } from '../src/main/reference-first/validators/validator-registry.ts';
import { buildValidContext } from './reference-first-fixtures.ts';

const taskScopedStyleCarrierValidator = REFERENCE_FIRST_VALIDATORS.find(
  (v) => v.id === VALIDATOR_IDS.TASK_SCOPED_STYLE_CARRIER
)!;

function carrierSet(outputType: string, primaryCount: number) {
  return {
    outputType,
    requiredPrimary: Array.from({ length: primaryCount }, (_, i) => ({ id: `p${i}` })),
    supportingSecondary: []
  };
}

test('blocks when task-scoped primary carriers are out of 3~6 range', () => {
  const ctx = buildValidContext() as unknown as Record<string, unknown>;
  // 仅 2 个主载体 → 不合规。
  ctx.taskScopedStyleCarriers = [carrierSet('anchor_vi_system', 2)];
  const outcome = taskScopedStyleCarrierValidator.validate(ctx as unknown as GenerationValidationContext);
  assert.ok(
    outcome.issues.some((issue: ReadinessValidationIssue) => issue.code === 'TASK_STYLE_CARRIER_INCOMPATIBLE' && issue.severity === 'blocking'),
    '主载体数量不在 3~6 必须阻断'
  );
});

test('passes for a valid 3~6 scoped carrier set', () => {
  const ctx = buildValidContext() as unknown as Record<string, unknown>;
  ctx.taskScopedStyleCarriers = [carrierSet('anchor_vi_system', 4)];
  const outcome = taskScopedStyleCarrierValidator.validate(ctx as unknown as GenerationValidationContext);
  assert.ok(
    !outcome.issues.some((issue: ReadinessValidationIssue) => issue.code === 'TASK_STYLE_CARRIER_INCOMPATIBLE'),
    '合法 3~6 主载体不得报不合规'
  );
});

test('validator is registered in the production registry', () => {
  const ctx = buildValidContext() as unknown as Record<string, unknown>;
  ctx.taskScopedStyleCarriers = [carrierSet('anchor_vi_system', 2)];
  const { results } = runAllValidators(ctx as unknown as GenerationValidationContext);
  const result = results.find((r) => r.validatorId === VALIDATOR_IDS.TASK_SCOPED_STYLE_CARRIER);
  assert.ok(result, 'Task-Scoped Style Carrier Validator 必须在生产 Registry 中执行');
});
