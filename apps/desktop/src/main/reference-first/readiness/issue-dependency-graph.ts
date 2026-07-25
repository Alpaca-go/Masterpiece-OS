import type {
  ReadinessValidationIssue,
  ReadinessValidationIssueCategory
} from '../../../shared/types.ts';

/**
 * §6 问题依赖图（单一事实源版）。
 * 键为「下游症状码前缀」，值为其可能的「上游根因码前缀」。
 * 仅当 allIssues 中存在任一上游 blocking issue 时，该下游症状被判定为「派生」，
 * 从 rootIssues 移入 derivedIssues，不作为第一阻断原因。
 *
 * 注意：对齐 evaluateGenerationReadiness 实际产出的错误码（而非文档示意码），
 * 否则 GENERATION_BRIEF_MISSING_TASK_DETAILS 永远不会被上游问题压制。
 */
export const ISSUE_DEPENDENCY_GRAPH: Record<string, string[]> = {
  GENERATION_BRIEF_MISSING_TASK_DETAILS: [
    'REQUESTED_TASK_SUBSET_MISSING',
    'TASK_STYLE_CARRIER_INCOMPATIBLE',
    'STRUCTURE_STATUS_UNRESOLVED',
    'GENERATION_IDENTITY_PACK_EMPTY',
    'GENERATION_IDENTITY_PACK_GRANULARITY_INVALID',
    'GENERATION_CONTEXT_MANIFEST_INCOMPLETE',
    'GENERATION_IDENTITY_PACK_INVALID',
    // §9 Validator 编排级问题也必须压制 Brief 缺失，使其不成为第一根因。
    'VALIDATOR_EXECUTION_INCOMPLETE',
    'VALIDATOR_RESULT_MISSING',
    'VALIDATOR_EXECUTION_FAILED',
    'DEPENDENCY_ARTIFACT_MISSING',
    'VALIDATOR_SKIPPED_REQUIRED_DEPENDENCY'
  ],
  GENERATION_CONTEXT_MANIFEST_INCOMPLETE: [
    'REQUESTED_TASK_SUBSET_MISSING',
    'TASK_STYLE_CARRIER_INCOMPATIBLE',
    'STRUCTURE_STATUS_UNRESOLVED',
    'GENERATION_IDENTITY_PACK_EMPTY',
    'GENERATION_IDENTITY_PACK_GRANULARITY_INVALID'
  ],
  GENERATION_IDENTITY_PACK_INVALID: [
    'UNVERIFIED_ASSET_ENTERED_GENERATION_PACK',
    'FULL_PAGE_ASSET_ENTERED_IDENTITY_PACK',
    'UNVERIFIED_STRUCTURE_MARKED_CONFIRMED',
    'STRUCTURE_ONLY_ASSET_INVALID'
  ],
  GENERATION_IDENTITY_PACK_GRANULARITY_INVALID: [
    'UNVERIFIED_ASSET_ENTERED_GENERATION_PACK',
    'STRUCTURE_ONLY_ASSET_INVALID',
    'UNVERIFIED_STRUCTURE_MARKED_CONFIRMED'
  ]
};

/**
 * §8 根因优先级（数值越高越优先展示）。
 * 同时包含文档示意码，便于未来校验器接入，未出现的码不影响分类。
 */
export const ROOT_CAUSE_PRIORITY: Record<string, number> = {
  VALIDATOR_RESULT_MISSING: 99,
  VALIDATOR_EXECUTION_INCOMPLETE: 99,
  VALIDATOR_EXECUTION_FAILED: 97,
  DEPENDENCY_ARTIFACT_MISSING: 96,
  VALIDATOR_SKIPPED_REQUIRED_DEPENDENCY: 96,
  REFERENCE_IDENTITY_IN_STYLE_CARRIER: 100,
  REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIER: 100,
  REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIERS: 100,
  REFERENCE_COPY_IN_STYLE_CARRIER: 100,
  REQUESTED_TASK_SUBSET_MISSING: 90,
  TASK_STYLE_CARRIER_INCOMPATIBLE: 90,
  UNVERIFIED_STRUCTURE_MARKED_CONFIRMED: 85,
  UNVERIFIED_ASSET_ENTERED_GENERATION_PACK: 85,
  STRUCTURE_ONLY_ASSET_INVALID: 85,
  GENERATION_IDENTITY_PACK_EMPTY: 95,
  GENERATION_IDENTITY_PACK_GRANULARITY_INVALID: 80,
  ANCHOR_SINGLE_SOURCE_VIOLATION: 80,
  FULL_PAGE_ASSET_ENTERED_IDENTITY_PACK: 80,
  LOCKED_ASSET_USAGE_TOO_BROAD: 80,
  STRUCTURE_STATUS_UNRESOLVED: 75,
  LEGACY_ANCHOR_COMPILER_ACTIVE: 75,
  PROJECT_GRAPHIC_ANCHOR_CONTRADICTION: 75,
  PROJECT_RUNTIME_FACTS_NOT_RESOLVED: 70,
  GENERATION_TASK_DEFINITION_INCOMPLETE: 60,
  AUDIT_BRIEF_TASK_MISMATCH: 65,
  AUDIT_BRIEF_STYLE_CARRIER_MISMATCH: 65,
  TASK_REFERENCE_MATCH_CONTRADICTION: 65,
  GENERATION_BRIEF_MISSING_TASK_DETAILS: 10,
  TARGET_AUDIENCE_UNAVAILABLE_NON_BLOCKING: 5,
  HUMAN_REVIEW_REQUIRED: 5
};

export function codePrefix(code: string): string {
  return code.split(':')[0] ?? code;
}

/**
 * §7 派生症状判定：当存在任一上游 blocking issue 时，本 issue 视为下游派生。
 */
export function isDerivedIssue(
  issue: ReadinessValidationIssue,
  allIssues: ReadinessValidationIssue[]
): boolean {
  const possibleCauses = ISSUE_DEPENDENCY_GRAPH[codePrefix(issue.code)] ?? [];
  if (possibleCauses.length === 0) return false;
  return possibleCauses.some((prefix) =>
    allIssues.some(
      (item) => codePrefix(item.code) === prefix && item.severity === 'blocking'
    )
  );
}

/**
 * §7 根因 / 派生症状分离。派生症状标记 derived=true，不再作为第一阻断原因。
 */
export function classifyRootAndDerivedIssues(issues: ReadinessValidationIssue[]) {
  const rootIssues: ReadinessValidationIssue[] = [];
  const derivedIssues: ReadinessValidationIssue[] = [];
  for (const issue of issues) {
    if (isDerivedIssue(issue, issues)) {
      derivedIssues.push(issue);
    } else {
      rootIssues.push(issue);
    }
  }
  return { rootIssues, derivedIssues };
}

/**
 * §8 根因按优先级排序（高 → 低）。
 */
export function sortRootIssues(
  issues: ReadinessValidationIssue[]
): ReadinessValidationIssue[] {
  return [...issues].sort(
    (a, b) =>
      (ROOT_CAUSE_PRIORITY[codePrefix(b.code)] ?? 0) -
      (ROOT_CAUSE_PRIORITY[codePrefix(a.code)] ?? 0)
  );
}

/**
 * §13 状态解析（单一事实源）：
 * - 存在任意 blocking 根因 → blocked；
 * - 存在 error 根因或任意 warning → needs_review；
 * - 否则 → ready。
 */
export function resolveReadinessStatus(
  rootIssues: ReadinessValidationIssue[],
  warnings: ReadinessValidationIssue[]
): 'ready' | 'needs_review' | 'blocked' {
  if (rootIssues.some((issue) => issue.severity === 'blocking')) {
    return 'blocked';
  }
  if (
    rootIssues.some((issue) => issue.severity === 'error') ||
    warnings.length > 0
  ) {
    return 'needs_review';
  }
  return 'ready';
}

export function statusLabel(
  status: 'ready' | 'needs_review' | 'blocked' | 'passed'
): string {
  if (status === 'ready' || status === 'passed') return 'passed';
  if (status === 'needs_review') return 'needs_review';
  return 'blocked';
}

/** 按分类聚合是否存在某严重度的问题，供审计报告三段状态拆分。 */
export function categoryHasSeverity(
  issues: ReadinessValidationIssue[],
  category: ReadinessValidationIssueCategory,
  severities: Array<ReadinessValidationIssue['severity']>
): boolean {
  return issues.some(
    (item) => item.category === category && severities.includes(item.severity)
  );
}
