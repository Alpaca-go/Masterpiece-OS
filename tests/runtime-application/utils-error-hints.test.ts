// r2.0 / r10.4 UX: error helpers used by the ShortChainGenerationWorkspace
// error banner. Pins:
//   - errorIsAutoRecoverable recognises the vnext-service codes that
//     are silently recovered on the next submit, so the renderer can
//     show a "直接重新点生成" hint instead of letting the user reach
//     for "强制重新分析" on the report page.
//   - autoRecoverableHint returns the right Chinese copy for the
//     recognised codes, and null for anything else (so unknown
//     errors don't get a misleading hint).
import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanError, errorIsAutoRecoverable, autoRecoverableHint } from '../../apps/web/src/utils.ts';

const RECOVERABLE_SAMPLES = [
  'PROMPT_PREFLIGHT_BLOCKED: SPACE_PROVIDER_PROMPT_INVALID, SPACE_NEGATIVE_DENSITY_TOO_HIGH',
  'SPACE_PROMPT_BUDGET_BLOCKED: SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT',
  'VNEXT_COMPILE_INPUT_STALE: Project context changed after compilation; compile the task again',
  'SPACE_PROVIDER_PROMPT_INVALID: Provider prompt gate B failed closed.',
  // The IPC layer wraps thrown errors as `${code}: ${message}` strings.
  'Error invoking remote method \'image-generation:start-validated-vnext\': Error: PROMPT_PREFLIGHT_BLOCKED: ...',
];

const NON_RECOVERABLE_SAMPLES = [
  'Failed to fetch',
  'Connection refused',
  'VNEXT_FORMAL_FIRST_COUNT_INVALID: Short-Chain formal-first generation starts with exactly one image',
  'SPACE_COMPILER_ROUTE_MISMATCH: ...',
  'Unknown error',
  '',
];

test('cleanError strips the IPC wrapper + the leading "Error:" so the banner shows only the meaningful code', () => {
  assert.equal(
    cleanError(new Error('PROMPT_PREFLIGHT_BLOCKED: ...')),
    'PROMPT_PREFLIGHT_BLOCKED: ...',
  );
  assert.equal(
    cleanError("Error invoking remote method 'foo': Error: PROMPT_PREFLIGHT_BLOCKED: ..."),
    'PROMPT_PREFLIGHT_BLOCKED: ...',
  );
});

test('errorIsAutoRecoverable returns true for the known auto-recoverable codes', () => {
  for (const sample of RECOVERABLE_SAMPLES) {
    assert.ok(errorIsAutoRecoverable(sample), `should recognise: ${sample}`);
    assert.ok(errorIsAutoRecoverable(new Error(sample)), `should recognise (Error wrapper): ${sample}`);
  }
});

test('errorIsAutoRecoverable returns false for unrelated / unknown errors', () => {
  for (const sample of NON_RECOVERABLE_SAMPLES) {
    assert.equal(errorIsAutoRecoverable(sample), false, `should NOT recognise: "${sample}"`);
  }
});

test('autoRecoverableHint returns the Chinese copy for recoverable codes, null for the rest', () => {
  for (const sample of RECOVERABLE_SAMPLES) {
    const hint = autoRecoverableHint(sample);
    assert.ok(hint && hint.includes('直接点击「生成」'),
      `recoverable sample should yield a hint: ${sample}`);
  }
  for (const sample of NON_RECOVERABLE_SAMPLES) {
    assert.equal(autoRecoverableHint(sample), null,
      `non-recoverable sample should yield no hint: "${sample}"`);
  }
});
