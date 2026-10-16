import crypto from "node:crypto";
function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function buildTrace({
  compilerId,
  compilerVersion,
  packetFingerprint,
  blockSources,
  anchors,
  referencePolicy,
  adapter,
  extra = {}
}) {
  const traceValue = {
    packetFingerprint,
    blockSources,
    anchors,
    referencePolicy,
    ...extra
  };
  return {
    compilerId,
    compilerVersion,
    adapterId: adapter?.id ?? null,
    adapterVersion: adapter?.version ?? null,
    sourceFingerprint: fingerprint(traceValue),
    ...anchors ? { anchorIds: anchors.map((a) => a.id) } : {},
    ...extra
  };
}
export {
  buildTrace,
  fingerprint
};
