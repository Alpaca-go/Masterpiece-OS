import {
  setValueAtPath
} from "./path-utils.js";
import { migrateAnalysisPacket } from "./schema-migrations.js";
import { computeSourceFingerprint } from "./source-fingerprint.js";
function applyDeterministicRepairs(input) {
  const now = input.now ?? (/* @__PURE__ */ new Date()).toISOString();
  const migration = migrateAnalysisPacket(input.packet, now);
  const packet = migration.packet;
  const repaired = [...migration.changes];
  for (const issue of input.issues) {
    if (issue.repairStrategy !== "deterministic") continue;
    if (issue.path === "schemaVersion") {
      packet.schemaVersion = "1.0";
    } else if (issue.path === "provenance.generatedAt") {
      setValueAtPath(packet, issue.path, now);
    } else if (issue.path === "provenance.sourceFingerprint") {
      setValueAtPath(packet, issue.path, computeSourceFingerprint(packet));
    } else {
      continue;
    }
    if (!repaired.includes(issue.path)) repaired.push(issue.path);
  }
  return { packet, repaired };
}
function evidenceBackedDefault(value, sourceFingerprint) {
  return {
    value,
    status: "system_default",
    confidence: 1,
    evidenceRefs: [],
    generatedBy: "system_default",
    sourceFingerprint,
    schemaVersion: "1.0"
  };
}
function applySystemDefaults(input) {
  const execution = structuredClone(input.execution ?? {});
  const defaulted = {};
  for (const issue of input.issues) {
    if (issue.repairStrategy !== "system_default") continue;
    if (issue.path === "execution.camera.focalLength" && input.deliverable === "space") {
      execution.camera = {
        ...execution.camera,
        focalLength: execution.camera?.focalLength || "24-28mm"
      };
      defaulted[issue.path] = evidenceBackedDefault(
        execution.camera.focalLength,
        input.sourceFingerprint
      );
    } else if (issue.path === "execution.outputLanguage") {
      execution.outputLanguage = execution.outputLanguage || input.projectLanguage?.trim() || "zh-CN";
      defaulted[issue.path] = evidenceBackedDefault(
        execution.outputLanguage,
        input.sourceFingerprint
      );
    } else if (issue.path === "execution.aspectRatio") {
      execution.aspectRatio = execution.aspectRatio || (input.deliverable === "space" ? "16:9" : "3:4");
      defaulted[issue.path] = evidenceBackedDefault(
        execution.aspectRatio,
        input.sourceFingerprint
      );
    }
  }
  return { execution, defaulted };
}
export {
  applyDeterministicRepairs,
  applySystemDefaults
};
