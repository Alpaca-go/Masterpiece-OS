export type AnalysisFailureCategory =
  | 'cancelled'
  | 'needs_user'
  | 'credentials'
  | 'transient_provider'
  | 'input'
  | 'model_output'
  | 'internal';

export interface AnalysisFailurePolicy {
  category: AnalysisFailureCategory;
  retryable: boolean;
  userMessage: string;
  suggestedAction: 'wait' | 'retry' | 'check_credentials' | 'provide_information';
}

export function classifyAnalysisFailure(error: unknown): AnalysisFailurePolicy {
  const candidate = error as { code?: unknown; message?: unknown; name?: unknown };
  const code = String(candidate?.code || '').toUpperCase();
  const message = String(candidate?.message || error || '');
  const combined = `${code} ${message}`;
  if (candidate?.name === 'AbortError' || /CANCELLED|用户.*取消/iu.test(combined)) {
    return { category: 'cancelled', retryable: false, userMessage: '分析已取消，已完成的检查点不会被当作失败结果。', suggestedAction: 'retry' };
  }
  if (/ANALYSIS_CONFIRMATION_REQUIRED|REQUIRES?_CONFIRMATION/iu.test(combined)) {
    return { category: 'needs_user', retryable: false, userMessage: message || '当前项目还缺少必须由你确认的信息。', suggestedAction: 'provide_information' };
  }
  if (/401|403|AUTH|API[_ ]?KEY|UNAUTHORIZED|FORBIDDEN/iu.test(combined)) {
    return { category: 'credentials', retryable: false, userMessage: '当前 API 配置无效或无权访问所选模型，请检查 API Profile。', suggestedAction: 'check_credentials' };
  }
  if (/408|429|QWEN_API_TRANSIENT|QWEN_REQUEST_FAILED|TIMEOUT|TIMED OUT|超时|ECONNRESET|EAI_AGAIN|ENETUNREACH|\b5\d\d\b/iu.test(combined)) {
    return { category: 'transient_provider', retryable: true, userMessage: '模型服务暂时不可用；已完成内容和检查点均已保留，可以安全重试。', suggestedAction: 'retry' };
  }
  if (/素材为空|没有可分析|UNREADABLE|UNSUPPORTED|文件.*损坏|ENCRYPTED/iu.test(combined)) {
    return { category: 'input', retryable: false, userMessage: message, suggestedAction: 'provide_information' };
  }
  if (/RESPONSE_INVALID|EMPTY_REPORT|SCHEMA|JSON|结构化.*校验|ANALYSIS_REPAIR_FAILED/iu.test(combined)) {
    return { category: 'model_output', retryable: true, userMessage: '模型输出未达到结构要求；已保留项目资料，可以重新分析。', suggestedAction: 'retry' };
  }
  return { category: 'internal', retryable: true, userMessage: message || '分析未完成；已保留项目资料和运行记录。', suggestedAction: 'retry' };
}

/** A completed human-readable analysis must survive failures in a downstream,
 * deliverable-specific enrichment step. User confirmation and cancellation are
 * workflow states, so they must still propagate instead of being hidden. */
export function shouldDegradeStructuredSubstep(error: unknown): boolean {
  const category = classifyAnalysisFailure(error).category;
  return category !== 'cancelled' && category !== 'needs_user';
}
