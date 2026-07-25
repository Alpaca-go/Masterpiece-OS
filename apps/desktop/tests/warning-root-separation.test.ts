// §16 / §11 Warning / Root / Derived 分流：TARGET_AUDIENCE_UNAVAILABLE_NON_BLOCKING 必须进 warnings，不得进 root。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runAllValidators,
  resolveGenerationReadinessResult
} from '../src/main/reference-first/index.ts';
import type { GenerationReadinessGate } from '../src/shared/types.ts';
import type { GenerationValidationContext } from '../src/main/reference-first/validators/validator-registry.ts';
import { buildValidContext } from './reference-first-fixtures.ts';

test('does not classify warning as root issue', () => {
  const ctx = buildValidContext() as unknown as GenerationValidationContext;
  const { results } = runAllValidators(ctx);
  const gate = {
    status: 'needs_review',
    blockingReasons: [],
    warnings: []
  } as unknown as GenerationReadinessGate;
  const readiness = resolveGenerationReadinessResult({
    gate,
    jobId: 'job-warn',
    outputType: 'anchor_vi_system',
    validatorResults: results
  });
  const warningCodes = readiness.warnings.map((i) => i.code);
  const rootCodes = readiness.rootIssues.map((i) => i.code);
  assert.ok(
    warningCodes.includes('TARGET_AUDIENCE_UNAVAILABLE_NON_BLOCKING'),
    `TARGET_AUDIENCE_UNAVAILABLE_NON_BLOCKING 必须在 warnings，实际：${warningCodes.join(', ')}`
  );
  assert.ok(
    !rootCodes.includes('TARGET_AUDIENCE_UNAVAILABLE_NON_BLOCKING'),
    'warning 不得进入阻断根因区'
  );
});

test('validator execution manifest separates warnings from blocking', () => {
  const ctx = buildValidContext() as unknown as GenerationValidationContext;
  const { results, manifest } = runAllValidators(ctx);
  const runtimeResult = results.find((r) => r.validatorId === 'runtime-fact');
  assert.ok(runtimeResult, 'runtime-fact 必须执行');
  assert.ok(
    runtimeResult!.issues.some((i) => i.code === 'TARGET_AUDIENCE_UNAVAILABLE_NON_BLOCKING' && i.severity === 'warning'),
    'runtime-fact 必须产出 warning 级问题'
  );
  assert.equal(manifest.complete, true, '仅有 warning 时执行清单仍应 complete');
});
