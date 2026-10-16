import { resolveRepairConflict } from "./conflict-resolver.js";
import {
  isRecord,
  setValueAtPath,
  valueAtPath
} from "./path-utils.js";
function validRepairPatch(patch, sourceFingerprint) {
  return ["inferred", "proposed"].includes(patch.value.status) && patch.value.generatedBy === "repair_model" && patch.value.sourceFingerprint === sourceFingerprint && patch.value.confidence >= 0 && patch.value.confidence <= 1 && patch.value.evidenceRefs.length > 0;
}
function evidenceSafeMerge(input) {
  if (!isRecord(input.packet)) {
    throw Object.assign(new Error("Cannot merge into a corrupted analysis packet."), {
      code: "PROJECT_CONTEXT_CORRUPTED"
    });
  }
  const packet = structuredClone(input.packet);
  const applied = [];
  const unchanged = [];
  const rejected = [];
  const conflicts = [];
  const metadata = {};
  const repairedAt = input.repairedAt ?? (/* @__PURE__ */ new Date()).toISOString();
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
      repairablePaths: input.repairablePaths
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
      repairedAt
    };
    applied.push(patch.path);
  }
  const existingMetadata = isRecord(packet.repairMetadata) && isRecord(packet.repairMetadata.fields) ? packet.repairMetadata.fields : {};
  packet.repairMetadata = {
    schemaVersion: "1.0",
    fields: {
      ...structuredClone(existingMetadata),
      ...metadata
    }
  };
  return {
    packet,
    applied,
    unchanged,
    rejected,
    conflicts,
    metadata
  };
}
export {
  evidenceSafeMerge
};
