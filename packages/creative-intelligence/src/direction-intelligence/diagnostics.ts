/**
 * Direction Intelligence diagnostics.
 *
 * Stable error codes used across Direction Intelligence modules.
 * CI-6 diagnostics follow CI-2/3/4/5 conventions: uppercase SNAKE + severity.
 */

import type { DirectionDiagnosticCode } from './contracts.ts';

export const DIRECTION_DIAGNOSTIC_CODES: readonly DirectionDiagnosticCode[] = [
  'DIRECTION_TRACE_MISSING',
  'DIRECTION_DANGLING_REF',
  'DIRECTION_REFERENCE_CONTAMINATION',
  'DIRECTION_IDENTITY_VIOLATION',
  'DIRECTION_UNAUTHORIZED_ASSET',
  'DIRECTION_UNSUPPORTED_CLAIM',
  'DIRECTION_UNKNOWN_DEPENDENCY',
  'DIRECTION_CONFLICT_BLOCKED',
  'DIRECTION_FAKE_DIVERSITY',
  'DIRECTION_ANCHOR_LEAKAGE',
  'DIRECTION_PROMPT_LEAKAGE',
  'DIRECTION_PRODUCTION_TRANSLATION',
  'DIRECTION_UNGROUNDED',
] as const;
