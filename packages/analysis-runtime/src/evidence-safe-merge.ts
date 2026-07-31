import type {
  EvidenceSafeMergeReport,
  RepairFieldMetadata,
  RepairFieldPatch,
} from './contracts.ts';
import { resolveRepairConflict } from './conflict-resolver.ts';
import {
  isRecord,
  setValueAtPath,
  valueAtPath,
} from './path-utils.ts';

function validRepairPatch(
  patch: RepairFieldPatch,
  sourceFingerprint: string,
): boolean {
  return (
    ['inferred', 'proposed'].includes(patch.value.status)
    && patch.value.generatedBy === 'repair_model'
    && patch.value.sourceFingerprint === sourceFingerprint
    && patch.value.confidence >= 0
    && patch.value.confidence <= 1
    && patch.value.evidenceRefs.length > 0
  );
}

export function evidenceSafeMerge(input: {
  packet: unknown;
  patches: RepairFieldPatch[];
  sourceFingerprint: string;
  repairedAt?: string;
  lockedPaths?: string[];
  confirmedPaths?: string[];
  repairablePaths?: string[];
}): EvidenceSafeMergeReport {
  if (!isRecord(input.packet)) {
    throw Object.assign(new Error('Cannot merge into a corrupted analysis packet.'), {
      code: 'PROJECT_CONTEXT_CORRUPTED',
    });
  }
  const packet = structuredClone(input.packet);
  const applied: string[] = [];
  const unchanged: string[] = [];
  const rejected: string[] = [];
  const conflicts: string[] = [];
  const metadata: Record<string, RepairFieldMetadata> = {};
  const repairedAt = input.repairedAt ?? new Date().toISOString();

  for (const patch of input.patches) {
    if (!validRepairPatch(patch, input.sourceFingerprint)) {
      rejected.push(patch.path);
      conflicts.push(`REPAIR_EVIDENCE_INVALID:${patch.path}`);
      continue;
    }
    const existing = valueAtPath(packet, patch.path);
    if (JSON.stringify(existing) === JSON.stringify(patch.value.value)) {
      unchanged.push(patch.path);
      continue;
    }
    const conflict = resolveRepairConflict({
      packet,
      patch,
      lockedPaths: input.lockedPaths,
      confirmedPaths: input.confirmedPaths,
      repairablePaths: input.repairablePaths,
    });
    if (conflict) {
      rejected.push(patch.path);
      conflicts.push(`${conflict.code}:${patch.path}`);
      continue;
    }
    setValueAtPath(packet, patch.path, structuredClone(patch.value.value));
    metadata[patch.path] = {
      status: patch.value.status,
      confidence: patch.value.confidence,
      evidenceRefs: [...patch.value.evidenceRefs],
      generatedBy: patch.value.generatedBy,
      sourceFingerprint: patch.value.sourceFingerprint,
      schemaVersion: patch.value.schemaVersion,
      repairVersion: patch.value.repairVersion,
      repairedAt,
    };
    applied.push(patch.path);
  }

  const existingMetadata = isRecord(packet.repairMetadata)
    && isRecord(packet.repairMetadata.fields)
    ? packet.repairMetadata.fields
    : {};
  packet.repairMetadata = {
    schemaVersion: '1.0',
    fields: {
      ...structuredClone(existingMetadata),
      ...metadata,
    },
  };

  return {
    packet,
    applied,
    unchanged,
    rejected,
    conflicts,
    metadata,
  };
}
