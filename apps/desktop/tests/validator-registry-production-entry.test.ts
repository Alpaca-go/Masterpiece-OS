// §16 生产主链路接线：验证生产入口（orchestrateGenerationReadiness）真实调用 runAllValidators，
// 9 个 Validator 全部注册、全部进入结果，且产物（validatorResults / manifest）即单一事实源。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  orchestrateGenerationReadiness,
  runAllValidators,
  REFERENCE_FIRST_VALIDATORS,
  VALIDATOR_IDS,
  validateValidatorRegistry
} from '../src/main/reference-first/index.ts';
import type { GenerationValidationContext } from '../src/main/reference-first/validators/validator-registry.ts';
import { minimalOrchestratorInput, buildValidContext } from './reference-first-fixtures.ts';

test('production entry executes all 9 registered validators', () => {
  const orchestration = orchestrateGenerationReadiness(minimalOrchestratorInput());
  // 注册 9，结果 9（含阶段化跳过的 Brief），执行清单 expected = 9。
  assert.equal(orchestration.validatorResults.length, REFERENCE_FIRST_VALIDATORS.length);
  assert.equal(REFERENCE_FIRST_VALIDATORS.length, Object.keys(VALIDATOR_IDS).length);
  assert.equal(orchestration.validatorExecutionManifest.expectedValidatorCount, 9);
  assert.equal(orchestration.validatorExecutionManifest.registeredValidatorIds.length, 9);
  // 单一事实源字段均由生产入口产出。
  assert.ok(orchestration.generationReadinessResult, '必须产出 GenerationReadinessResult 单一事实源');
  assert.ok(orchestration.validatorExecutionManifest, '必须产出执行清单');
});

test('no legacy two-validator aggregation path remains', () => {
  // 旧的双 Validator 聚合（仅 Generation Brief + Runtime Fact）不应再作为权威来源：
  // 生产入口必须执行全部 9 个，而非 2 个。
  const validation = validateValidatorRegistry();
  assert.equal(validation.passed, true, 'Registry 必须完整（9 个必需 Validator）');
  const ctx = buildValidContext() as unknown as GenerationValidationContext;
  const { results } = runAllValidators(ctx);
  assert.equal(results.length, 9, 'runAllValidators 必须执行全部 9 个，而非 2 个旧路径');
});

test('single source result reflects same root issues across the run', () => {
  const orchestration = orchestrateGenerationReadiness(minimalOrchestratorInput());
  const rootCodes = orchestration.generationReadinessResult.rootIssues.map((issue) => issue.code);
  // 上游缺失 Task Subset 必然出现在根因（单一事实源），而非被静默吞掉。
  assert.ok(
    rootCodes.includes('REQUESTED_TASK_SUBSET_MISSING'),
    `根因必须包含 REQUESTED_TASK_SUBSET_MISSING，实际：${rootCodes.join(', ')}`
  );
});
