// §16 / §7 Requested Task Coverage：请求任务必须有真实 Task Reference Subset，否则阻断。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  orchestrateGenerationReadiness,
  REFERENCE_FIRST_VALIDATORS,
  VALIDATOR_IDS
} from '../src/main/reference-first/index.ts';
import type { GenerationValidationContext } from '../src/main/reference-first/validators/validator-registry.ts';
import { buildValidContext, validTaskSubset, minimalOrchestratorInput } from './reference-first-fixtures.ts';

const requestedTaskCoverageValidator = REFERENCE_FIRST_VALIDATORS.find(
  (v) => v.id === VALIDATOR_IDS.REQUESTED_TASK_COVERAGE
)!;

test('blocks when requested task subset is missing', () => {
  const ctx = buildValidContext() as unknown as Record<string, unknown>;
  ctx.requiredTaskOutputTypes = ['anchor_vi_system'];
  ctx.taskReferenceSubsets = [];
  const outcome = requestedTaskCoverageValidator.validate(ctx as unknown as GenerationValidationContext);
  assert.ok(
    outcome.issues.some((issue) => issue.code === 'REQUESTED_TASK_SUBSET_MISSING' && issue.severity === 'blocking'),
    '缺少真实 Task Reference Subset 必须阻断'
  );
});

test('passes when a valid task subset exists', () => {
  const ctx = buildValidContext() as unknown as Record<string, unknown>;
  ctx.requiredTaskOutputTypes = ['anchor_vi_system'];
  ctx.taskReferenceSubsets = [validTaskSubset('anchor_vi_system')];
  ctx.primaryTaskReference = validTaskSubset('anchor_vi_system');
  const outcome = requestedTaskCoverageValidator.validate(ctx as unknown as GenerationValidationContext);
  assert.ok(
    !outcome.issues.some((issue) => issue.code === 'REQUESTED_TASK_SUBSET_MISSING'),
    '存在合法 Task Reference Subset 时不得报 REQUESTED_TASK_SUBSET_MISSING'
  );
});

test('missing subset surfaces as a root issue in the single source', () => {
  // 生产入口：无 Task Subset → REQUESTED_TASK_SUBSET_MISSING 进入 rootIssues。
  const orchestration = orchestrateGenerationReadiness(minimalOrchestratorInput());
  const rootCodes = orchestration.generationReadinessResult.rootIssues.map((i) => i.code);
  assert.ok(
    rootCodes.includes('REQUESTED_TASK_SUBSET_MISSING'),
    `根因必须包含 REQUESTED_TASK_SUBSET_MISSING，实际：${rootCodes.join(', ')}`
  );
  assert.equal(
    orchestration.validatorExecutionManifest.registeredValidatorIds.includes(VALIDATOR_IDS.REQUESTED_TASK_COVERAGE),
    true
  );
});
