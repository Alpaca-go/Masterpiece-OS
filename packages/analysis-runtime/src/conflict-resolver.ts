import type { RepairFieldPatch } from './contracts.ts';
import {
  isMeaningfulValue,
  valueAtPath,
} from './path-utils.ts';

const ALWAYS_PROTECTED_PREFIXES = [
  'projectId',
  'projectFacts',
  'lockedAssets',
];

export interface RepairConflict {
  path: string;
  code: 'LOCKED_ASSET_CONFLICT' | 'CONFIRMED_FIELD_CONFLICT' | 'EXISTING_VALUE_CONFLICT';
  message: string;
}

export function resolveRepairConflict(input: {
  packet: unknown;
  patch: RepairFieldPatch;
  lockedPaths?: string[];
  confirmedPaths?: string[];
}): RepairConflict | null {
  const lockedPaths = [
    ...ALWAYS_PROTECTED_PREFIXES,
    ...(input.lockedPaths ?? []),
  ];
  if (lockedPaths.some((path) => (
    input.patch.path === path || input.patch.path.startsWith(`${path}.`)
  ))) {
    return {
      path: input.patch.path,
      code: 'LOCKED_ASSET_CONFLICT',
      message: `Repair cannot modify locked field ${input.patch.path}.`,
    };
  }
  if ((input.confirmedPaths ?? []).some((path) => (
    input.patch.path === path || input.patch.path.startsWith(`${path}.`)
  ))) {
    return {
      path: input.patch.path,
      code: 'CONFIRMED_FIELD_CONFLICT',
      message: `Repair cannot modify user-confirmed field ${input.patch.path}.`,
    };
  }
  const existing = valueAtPath(input.packet, input.patch.path);
  if (
    isMeaningfulValue(existing)
    && JSON.stringify(existing) !== JSON.stringify(input.patch.value.value)
  ) {
    return {
      path: input.patch.path,
      code: 'EXISTING_VALUE_CONFLICT',
      message: `Repair cannot overwrite existing field ${input.patch.path}.`,
    };
  }
  return null;
}
