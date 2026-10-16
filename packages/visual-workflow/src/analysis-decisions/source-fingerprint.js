import crypto from "node:crypto";
import {
  isRecord,
  stableValue
} from "./path-utils.js";
const VOLATILE_KEYS = /* @__PURE__ */ new Set([
  "generatedAt",
  "updatedAt",
  "completedAt",
  "repairMetadata",
  "validation"
]);
function sourceValue(value) {
  if (Array.isArray(value)) return value.map(sourceValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !VOLATILE_KEYS.has(key)).map(([key, child]) => [key, sourceValue(child)])
  );
}
function computeSourceFingerprint(value) {
  const serialized = JSON.stringify(stableValue(sourceValue(value)));
  return `sha256:${crypto.createHash("sha256").update(serialized).digest("hex")}`;
}
function markStaleRepairMetadata(input) {
  const metadata = structuredClone(input.metadata);
  const staleFields = [];
  Object.entries(metadata).forEach(([path, item]) => {
    if (item.sourceFingerprint !== input.sourceFingerprint && (item.status === "inferred" || item.status === "proposed")) {
      item.status = "stale";
      staleFields.push(path);
    }
  });
  return { metadata, staleFields };
}
export {
  computeSourceFingerprint,
  markStaleRepairMetadata
};
