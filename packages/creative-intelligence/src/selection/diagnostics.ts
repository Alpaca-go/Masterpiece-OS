/**
 * Selection diagnostic constants.
 */

import type { SelectionDiagnosticCode } from './contracts.ts';

export const SELECTION_DIAGNOSTIC_CODES: readonly SelectionDiagnosticCode[] = [
  'SELECTION_ACTION_REQUIRED',
  'SELECTION_DIRECTION_NOT_FOUND',
  'SELECTION_DIRECTION_BLOCKED',
  'SELECTION_PROJECT_MISMATCH',
  'SELECTION_ALREADY_SELECTED',
  'SELECTION_INVALIDATED',
  'SELECTION_REVISION_CONFLICT',
] as const;
