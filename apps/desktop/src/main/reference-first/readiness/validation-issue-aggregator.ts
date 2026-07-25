import type {
  ReadinessValidationIssue,
  ReadinessValidatorResult,
  ReadinessValidationAggregation
} from '../../../shared/types.ts';
import {
  classifyRootAndDerivedIssues,
  resolveReadinessStatus,
  sortRootIssues
} from './issue-dependency-graph.ts';

export interface ValidationAggregationInput {
  results: ReadinessValidatorResult[];
}

/**
 * §5 ValidationIssue Aggregator。
 * 收集全部 Validator 的问题 → 压缩派生症状（根因 / 派生分离）→ 优先级排序 → 解析状态。
 * 这是所有报告 / UI 读取的单一事实源入口。
 */
export function aggregateValidationIssues(
  input: ValidationAggregationInput
): ReadinessValidationAggregation {
  const allIssues: ReadinessValidationIssue[] = input.results.flatMap(
    (result) => result.issues
  );

  // §10 防御性检查：显式声明为非阻断的码绝不允许被标记为 blocking。
  // 正式逻辑仍以 severity 为准；此检查只拦截明显的编程错误。
  for (const issue of allIssues) {
    const prefix = issue.code.split(':')[0] ?? issue.code;
    if (prefix.endsWith('_NON_BLOCKING') && issue.severity === 'blocking') {
      throw new Error(
        `Non-blocking issue marked as blocking: ${issue.code}`
      );
    }
  }

  // §11 Warning / Root / Derived 分离：warning 级问题仅进入 warnings 区，
  // 绝不进入根因（root）或派生（derived）区，避免污染阻断根因列表。
  const warnings = allIssues.filter(
    (issue) => issue.severity === 'warning'
  );
  const blockingAndErrorIssues = allIssues.filter(
    (issue) => issue.severity !== 'warning'
  );

  const {
    rootIssues,
    derivedIssues
  } = classifyRootAndDerivedIssues(blockingAndErrorIssues);

  return {
    allIssues,
    rootIssues: sortRootIssues(rootIssues),
    derivedIssues,
    warnings,
    status: resolveReadinessStatus(
      rootIssues,
      warnings
    )
  };
}
