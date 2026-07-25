import type {
  ReadinessValidationIssue,
  ReferenceFirstValidatorResult,
  ValidatorExecutionManifest
} from '../../../shared/types.ts';
import { buildReadinessIssue } from '../readiness/generation-readiness-resolver.ts';
import {
  REFERENCE_FIRST_VALIDATORS,
  type GenerationValidationContext,
  type ReferenceFirstValidator
} from './validator-registry.ts';

/**
 * §5 runAllValidators 编排结果。
 * - results：每个已注册 Validator 的完整执行结果（含 skipped / 时间戳 / 产物路径）。
 * - manifest：执行清单（注册 / 执行 / 跳过 / 失败），供落盘 validator-execution-manifest.json。
 * - orchestrationIssues：编排级问题（执行失败 / 结果缺失 / 执行不完整），交由聚合器进入单一事实源。
 */
export interface RunAllValidatorsResult {
  results: ReferenceFirstValidatorResult[];
  manifest: ValidatorExecutionManifest;
  orchestrationIssues: ReadinessValidationIssue[];
}

/** §6 阶段：brief_compilation 阶段的 Validator 仅在上游（含跨工件）校验通过后才执行。 */
const BRIEF_PHASE_STAGE = 'brief_compilation';

interface OneResult {
  result: ReferenceFirstValidatorResult;
  failed: boolean;
  issue?: ReadinessValidationIssue;
}

/**
 * 执行单个 Validator，统一处理异常 / skipped / 时间戳。
 * 返回是否执行失败（异常路径），以及编排级问题（如有）。
 */
function executeValidator(
  validator: ReferenceFirstValidator,
  context: GenerationValidationContext
): OneResult {
  const startedAt = new Date().toISOString();
  try {
    const outcome = validator.validate(context);
    const completedAt = new Date().toISOString();
    const issues = [...outcome.issues];

    if (outcome.skipped) {
      // §5.2 required Validator 不允许静默跳过：缺少依赖且未自带 blocking 时升级为 blocking。
      if (validator.required && !issues.some((issue) => issue.severity === 'blocking')) {
        issues.push(
          buildReadinessIssue(
            `VALIDATOR_SKIPPED_REQUIRED_DEPENDENCY:${validator.id}`,
            'blocking'
          )
        );
      }
    }

    return {
      failed: false,
      result: {
        validatorId: validator.id,
        stage: validator.stage,
        passed: issues.every((issue) => issue.severity !== 'blocking'),
        skipped: outcome.skipped,
        issues,
        startedAt,
        completedAt,
        artifactPaths: outcome.artifactPaths
      }
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : String(error);
    const issue = buildReadinessIssue(
      `VALIDATOR_EXECUTION_FAILED:${validator.id}`,
      'blocking',
      { receivedValue: message }
    );
    return {
      failed: true,
      issue,
      result: {
        validatorId: validator.id,
        stage: validator.stage,
        passed: false,
        skipped: false,
        issues: [issue],
        startedAt,
        completedAt,
        artifactPaths: []
      }
    };
  }
}

/**
 * §5 执行 Registry 中全部 Validator。
 *
 * 严格约束（对齐开发文档）：
 * - 禁止静默跳过：required Validator 若 skipped 且未自带 blocking，则补 VALIDATOR_SKIPPED_REQUIRED_DEPENDENCY。
 * - Validator 抛异常 → 捕获为 VALIDATOR_EXECUTION_FAILED（blocking），不得中断其余 Validator。
 * - 缺少某已注册 Validator 结果 → VALIDATOR_RESULT_MISSING（blocking）。
 * - 已执行数量少于注册数量 → VALIDATOR_EXECUTION_INCOMPLETE（blocking）。
 *
 * §6 阶段化：先执行非 brief_compilation 阶段（上游 + 跨工件一致性），判断是否 upstream blocked；
 * 若上游已阻断，则 brief_compilation 阶段 Validator 被「阶段化跳过」（不执行），避免
 * blocked → 不生成 Brief → Brief 缺 outputType → 再次 blocked 的循环。
 * 阶段化跳过属于预期行为，不破坏 complete（与依赖缺失导致的意外跳过区分）。
 */
export function runAllValidators(
  context: GenerationValidationContext,
  validators: ReferenceFirstValidator[] = REFERENCE_FIRST_VALIDATORS
): RunAllValidatorsResult {
  const results: ReferenceFirstValidatorResult[] = [];
  const orchestrationIssues: ReadinessValidationIssue[] = [];
  const executedValidatorIds: string[] = [];
  const skippedValidatorIds: string[] = [];
  const failedValidatorIds: string[] = [];
  const phaseGatedSkipIds: string[] = [];
  const registeredValidatorIds = validators.map((validator) => validator.id);

  const upstreamValidators = validators.filter((validator) => validator.stage !== BRIEF_PHASE_STAGE);
  const briefValidators = validators.filter((validator) => validator.stage === BRIEF_PHASE_STAGE);

  // Phase A + B：上游生成上下文校验 + 跨工件一致性。
  let upstreamBlocked = false;
  for (const validator of upstreamValidators) {
    const { result, failed, issue } = executeValidator(validator, context);
    if (failed && issue) {
      failedValidatorIds.push(validator.id);
      orchestrationIssues.push(issue);
    } else if (result.skipped) {
      skippedValidatorIds.push(validator.id);
    } else {
      executedValidatorIds.push(validator.id);
    }
    if (result.issues.some((item) => item.severity === 'blocking')) upstreamBlocked = true;
    results.push(result);
  }

  // Phase C：仅在上游未阻断时才编译并校验 Generation Brief（§6）。
  for (const validator of briefValidators) {
    if (upstreamBlocked) {
      const startedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      const skipIssue = buildReadinessIssue(
        `VALIDATOR_SKIPPED_UPSTREAM_BLOCKED:${validator.id}`,
        'warning',
        { receivedValue: 'upstream blocked; brief validation deferred until upstream is ready' }
      );
      skippedValidatorIds.push(validator.id);
      phaseGatedSkipIds.push(validator.id);
      results.push({
        validatorId: validator.id,
        stage: validator.stage,
        passed: true,
        skipped: true,
        issues: [skipIssue],
        startedAt,
        completedAt,
        artifactPaths: []
      });
      continue;
    }
    const { result, failed, issue } = executeValidator(validator, context);
    if (failed && issue) {
      failedValidatorIds.push(validator.id);
      orchestrationIssues.push(issue);
    } else if (result.skipped) {
      skippedValidatorIds.push(validator.id);
    } else {
      executedValidatorIds.push(validator.id);
    }
    results.push(result);
  }

  // §5.3 防御式：任何已注册 Validator 缺失结果都必须显式阻断。
  for (const id of registeredValidatorIds) {
    if (!results.some((result) => result.validatorId === id)) {
      orchestrationIssues.push(
        buildReadinessIssue(`VALIDATOR_RESULT_MISSING:${id}`, 'blocking')
      );
    }
  }

  const expectedValidatorCount = validators.length;
  const executedValidatorCount = executedValidatorIds.length;

  if (results.length < expectedValidatorCount) {
    orchestrationIssues.push(
      buildReadinessIssue('VALIDATOR_EXECUTION_INCOMPLETE', 'blocking', {
        receivedValue: { expected: expectedValidatorCount, produced: results.length }
      })
    );
  }

  // §6 complete：执行失败 / 编排级问题 / 非阶段化的意外跳过 才破坏完整性；
  // 阶段化跳过（上游 blocked 时 defer Brief 校验）是预期���为，保持 complete = true。
  const unexpectedSkips = skippedValidatorIds.filter((id) => !phaseGatedSkipIds.includes(id));
  const complete =
    results.length === expectedValidatorCount &&
    failedValidatorIds.length === 0 &&
    orchestrationIssues.length === 0 &&
    unexpectedSkips.length === 0;

  const manifest: ValidatorExecutionManifest = {
    jobId: context.jobId,
    registeredValidatorIds,
    executedValidatorIds,
    skippedValidatorIds,
    failedValidatorIds,
    expectedValidatorCount,
    executedValidatorCount,
    complete
  };

  return { results, manifest, orchestrationIssues };
}
