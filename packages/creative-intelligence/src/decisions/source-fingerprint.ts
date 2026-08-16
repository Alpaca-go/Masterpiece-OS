import crypto from 'node:crypto';
import type { RepairFieldMetadata } from './contracts.ts';
import {
  isRecord,
  stableValue,
} from './path-utils.ts';

const VOLATILE_KEYS = new Set([
  'generatedAt',
  'updatedAt',
  'completedAt',
  'repairMetadata',
  'validation',
]);

function sourceValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sourceValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !VOLATILE_KEYS.has(key))
      .map(([key, child]) => [key, sourceValue(child)]),
  );
}

export function computeSourceFingerprint(value: unknown): string {
  const serialized = JSON.stringify(stableValue(sourceValue(value)));
  return `sha256:${crypto.createHash('sha256').update(serialized).digest('hex')}`;
}

export function markStaleRepairMetadata(input: {
  metadata: Record<string, RepairFieldMetadata>;
  sourceFingerprint: string;
}): {
  metadata: Record<string, RepairFieldMetadata>;
  staleFields: string[];
} {
  const metadata = structuredClone(input.metadata);
  const staleFields: string[] = [];
  Object.entries(metadata).forEach(([path, item]) => {
    if (
      item.sourceFingerprint !== input.sourceFingerprint
      && (item.status === 'inferred' || item.status === 'proposed')
    ) {
      item.status = 'stale';
      staleFields.push(path);
    }
  });
  return { metadata, staleFields };
}
