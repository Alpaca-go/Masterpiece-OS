// §16 runAllValidators 生产执行：全部执行、执行清单完整、阶段化（上游 blocked 不跑 Brief Validator）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { runAllValidators, VALIDATOR_IDS } from '../src/main/reference-first/index.ts';
import type { GenerationValidationContext } from '../src/main/reference-first/validators/validator-registry.ts';
import { buildValidContext } from './reference-first-fixtures.ts';

test('runAllValidators executes every registered validator and reports complete', () => {
  const { results, manifest } = runAllValidators(buildValidContext() as unknown as GenerationValidationContext);
  assert.equal(results.length, 9);
  assert.equal(manifest.expectedValidatorCount, 9);
  assert.equal(manifest.executedValidatorCount, 9);
  assert.equal(manifest.skippedValidatorIds.length, 0);
  assert.equal(manifest.failedValidatorIds.length, 0);
  assert.equal(manifest.complete, true);
});

test('does not run generation brief validator before upstream readiness', () => {
  // 构造上游 blocked 的上下文：请求任务缺少真实 Task Reference Subset。
  const ctx = buildValidContext() as unknown as Record<string, unknown>;
  ctx.requiredTaskOutputTypes = ['anchor_vi_system'];
  ctx.taskReferenceSubsets = [];
  const { results, manifest } = runAllValidators(ctx as unknown as GenerationValidationContext);
  const briefResult = results.find((r) => r.validatorId === VALIDATOR_IDS.GENERATION_BRIEF);
  assert.ok(briefResult, 'Brief Validator 必须出现在结果中（阶段化跳过也产出结果）');
  assert.equal(briefResult!.skipped, true, '上游 blocked 时 Brief Validator 必须被阶段化跳过');
  assert.ok(
    manifest.skippedValidatorIds.includes(VALIDATOR_IDS.GENERATION_BRIEF),
    '执行清单必须记录 Brief 阶段化跳过'
  );
  // 阶段化跳过是预期行为，不破坏 complete。
  assert.equal(manifest.complete, true, '阶段化跳过不得使执行清单变为 incomplete');
  // 上游阻断项必须仍进入 root（被收集）。
  assert.ok(
    results.some((r) => r.issues.some((i) => i.code === 'REQUESTED_TASK_SUBSET_MISSING')),
    '上游阻断项必须被收集'
  );
});

test('manifest records complete coverage for happy path', () => {
  const { manifest } = runAllValidators(buildValidContext() as unknown as GenerationValidationContext);
  assert.equal(manifest.complete, true);
  assert.equal(
    manifest.executedValidatorCount,
    manifest.expectedValidatorCount,
    'happy path 下执行数必须等于注册数'
  );
});
