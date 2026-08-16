export function formatDuration(milliseconds: number | null): string {
  if (milliseconds === null) return '—';
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatDurationHuman(milliseconds: number | null): string {
  if (milliseconds === null) return '—';
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}分${String(seconds % 60).padStart(2, '0')}秒`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function filename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

export function cleanError(error: unknown): string {
  return String((error as Error)?.message || error || '未知错误')
    .replace(/^Error invoking remote method '[^']+': Error:\s*/, '')
    .replace(/^Error:\s*/, '');
}

// Compatibility error codes that Short-Chain Generation auto-recovers from on the next
// submit. When the user sees one of these, the right next action is
// "click 生成 again" — the system has already (or will) re-compile /
// re-pick the current context under the hood. Surfacing this in the
// banner stops the user from going back to the report page and
// hitting "强制重新分析" out of caution.
//
// Codes are matched as substrings of the thrown error message because
// the IPC layer wraps them as `${code}: ${message}` strings before the
// renderer sees them.
const AUTO_RECOVERABLE_CODES = [
  'PROMPT_PREFLIGHT_BLOCKED',
  'SPACE_PROMPT_BUDGET_BLOCKED',
  'VNEXT_COMPILE_INPUT_STALE',
  'SPACE_PROVIDER_PROMPT_INVALID',
];

// P3-D3.5A: `PROMPT_PREFLIGHT_BLOCKED` is only auto-recoverable when
// the underlying findings are recompile-recoverable (fingerprint
// staleness / rule-version drift / compile-time normalization). Data-gap
// findings — a missing canonical product/category role or an unsupported
// product invention — cannot be repaired by clicking 生成 again; the
// auto-recompile path re-compiles with the same project truth. Marking
// those as "可自动恢复" was a false recoverability claim. These findings
// are matched on their structured code tokens (part of the error message),
// never on human-readable Chinese text.
const PREFLIGHT_DATA_GAP_FINDINGS = [
  'PACKAGING_PRODUCT_ROLE_MISSING',
  'UNSUPPORTED_PRODUCT_INVENTION',
];

export function errorIsAutoRecoverable(error: unknown): boolean {
  const message = cleanError(error);
  if (!AUTO_RECOVERABLE_CODES.some((code) => message.includes(code))) return false;
  if (message.includes('PROMPT_PREFLIGHT_BLOCKED')
    && PREFLIGHT_DATA_GAP_FINDINGS.some((code) => message.includes(code))) {
    return false;
  }
  return true;
}

export function autoRecoverableHint(error: unknown): string | null {
  if (!errorIsAutoRecoverable(error)) return null;
  return '这是可自动恢复的提示：直接点击「生成」即可，无需回到报告页或重新分析。';
}

/**
 * Format an ISO timestamp string as a human-readable relative time
 * (e.g. "3 分钟前", "2 小时前", "昨天", "7 月 15 日").
 */
export function formatRelativeTime(iso: string): string {
  if (!iso) return '—';
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = now - then;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay === 1) return '昨天';
  if (diffDay < 7) return `${diffDay} 天前`;

  const d = new Date(then);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  if (d.getFullYear() === new Date(now).getFullYear()) {
    return `${month} 月 ${day} 日`;
  }
  return `${d.getFullYear()} 年 ${month} 月 ${day} 日`;
}
