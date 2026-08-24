// sdk/errors.ts
//
// 统一错误模型 — 路线 A / P0 骨架 (§4.4)
//
// 文档契约（§4.4）：
//   - operationId 与主机 OperationRegistry 对齐
//   - code 与主机 OperationRegistry 错误码对齐
//   - retryable 由 SDK 决定（不在 Host 端重复定义）
//   - hint 是 UI-friendly 文案，可直接进 toast/banner

export interface SdkError {
  operationId: string;
  code: string;
  message: string;
  retryable: boolean;
  hint?: string;
}

/**
 * Type guard — final usage in P1, when client.ts starts emitting SdkError.
 * P0 阶段仅占位，零运行时影响。
 */
export function isSdkError(value: unknown): value is SdkError {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.operationId === 'string' &&
    typeof v.code === 'string' &&
    typeof v.message === 'string' &&
    typeof v.retryable === 'boolean'
  );
}