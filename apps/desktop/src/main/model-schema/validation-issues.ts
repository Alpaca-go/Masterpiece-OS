export type ValidationIssueType =
  | 'json_parse_error'
  | 'markdown_wrapper'
  | 'truncated'
  | 'invalid_type'
  | 'invalid_enum'
  | 'missing_required'
  | 'format_error'
  | 'insufficient_evidence'
  | 'fact_status_overclaimed'
  | 'fact_pollution'
  | 'semantic_conflict'
  | 'unsupported_value';

export interface ValidationIssue {
  path: string;
  issueType: ValidationIssueType;
  receivedValue?: unknown;
  message: string;
  allowedValues?: unknown[];
  validExamples?: unknown[];
  evidenceContext?: {
    sourceIds?: string[];
    confidence?: number;
  };
  repairInstruction: string;
  severity: 'warning' | 'error' | 'blocking';
}

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  issues: ValidationIssue[];
}

export interface RuntimeSchema<T> {
  safeParse(value: unknown): ParseResult<T>;
  summary: string;
}

export function blockingIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => issue.severity === 'blocking' || issue.severity === 'error');
}

export function validationErrorCode(issues: ValidationIssue[]): string {
  if (issues.some((issue) => issue.issueType === 'json_parse_error')) return 'MODEL_OUTPUT_JSON_PARSE_ERROR';
  if (issues.some((issue) => issue.issueType === 'markdown_wrapper')) return 'MODEL_OUTPUT_MARKDOWN_WRAPPER';
  if (issues.some((issue) => issue.issueType === 'truncated')) return 'MODEL_OUTPUT_TRUNCATED';
  if (issues.some((issue) => issue.issueType === 'invalid_enum')) return 'MODEL_OUTPUT_INVALID_ENUM';
  if (issues.some((issue) => issue.issueType === 'missing_required')) return 'MODEL_OUTPUT_MISSING_FIELD';
  if (issues.some((issue) => issue.issueType === 'format_error')) return 'MODEL_OUTPUT_INVALID_RANGE';
  if (issues.some((issue) => issue.issueType === 'fact_status_overclaimed')) return 'FACT_STATUS_OVERCLAIMED';
  if (issues.some((issue) => issue.issueType === 'fact_pollution')) return 'FACT_EVIDENCE_POLLUTION';
  if (issues.some((issue) => issue.issueType === 'insufficient_evidence')) return 'FACT_INSUFFICIENT_EVIDENCE';
  return 'MODEL_OUTPUT_INVALID_TYPE';
}

export function throwForValidationIssues(
  issues: ValidationIssue[],
  fallbackMessage = '模型输出未通过运行时 Schema 校验'
): void {
  const failures = blockingIssues(issues);
  if (!failures.length) return;
  const first = failures[0]!;
  throw Object.assign(new Error(first.message || fallbackMessage), {
    code: validationErrorCode(failures),
    issues: failures.map((issue) => issue.path),
    details: { issues: failures }
  });
}

function printable(value: unknown): string {
  if (value === undefined) return '未提供';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function compileRepairPrompt(input: {
  issues: ValidationIssue[];
  schemaSummary: string;
  attempt: number;
  maxAttempts: number;
}): string {
  const fields = input.issues.map((issue) => [
    `- 字段：${issue.path}`,
    `  失败值：${printable(issue.receivedValue)}`,
    `  错误类型：${issue.issueType}`,
    `  规则：${issue.message}`,
    issue.allowedValues ? `  允许值：${printable(issue.allowedValues)}` : '',
    issue.validExamples ? `  合法示例：${printable(issue.validExamples)}` : '',
    `  修复要求：${issue.repairInstruction}`
  ].filter(Boolean).join('\n')).join('\n');
  return `

你需要修复模型输出中的结构化错误（第 ${input.attempt} 次修复，最多 ${input.maxAttempts} 次）。
不得改变已经通过校验的字段。不得新增 Schema 未定义的字段。不得创建新的枚举值。
证据不足时必须使用空数组、null 或 unverified，具体以字段规则为准。

Schema 摘要：
${input.schemaSummary}

以下字段失败：
${fields}

只返回符合完整 Schema 的 JSON。修复后所有字段都会重新执行完整校验。`;
}

export function invalidEnumIssue(
  path: string,
  receivedValue: unknown,
  allowedValues: readonly string[]
): ValidationIssue {
  return {
    path,
    issueType: 'invalid_enum',
    receivedValue,
    message: `${path} 的值 ${printable(receivedValue)} 不属于允许的协议枚举。`,
    allowedValues: [...allowedValues],
    validExamples: allowedValues.length ? [allowedValues[0]] : [],
    repairInstruction: '从允许枚举中选择语义最接近的值；不得创造新枚举。',
    severity: 'blocking'
  };
}

export function invalidTypeIssue(
  path: string,
  receivedValue: unknown,
  message: string,
  validExamples?: unknown[]
): ValidationIssue {
  return {
    path,
    issueType: 'invalid_type',
    receivedValue,
    message,
    validExamples,
    repairInstruction: '按字段定义返回正确类型；证据不足时遵循该字段的空值规则。',
    severity: 'blocking'
  };
}
