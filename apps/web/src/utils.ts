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

// Error codes that the vnext-service auto-recovers from on the next
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

export function errorIsAutoRecoverable(error: unknown): boolean {
  const message = cleanError(error);
  return AUTO_RECOVERABLE_CODES.some((code) => message.includes(code));
}

export function autoRecoverableHint(error: unknown): string | null {
  if (!errorIsAutoRecoverable(error)) return null;
  return '这是可自动恢复的提示：直接点击「生成」即可，无需回到报告页或重新分析。';
}
