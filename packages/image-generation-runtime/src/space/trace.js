// Trace helpers for the Phase 9B-quality space compiler.
//
// The trace records which V5 VisualDecisionPacket fields fed each block and
// which architecture anchors / references were selected, so an image-level
// regression can be traced back to its inputs. This mirrors the recovery
// doc §9.1 (reference trace written into the run snapshot).

import crypto from 'node:crypto';

export function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
}

export function buildTrace({
  compilerId,
  compilerVersion,
  packetFingerprint,
  blockSources,
  anchors,
  referencePolicy,
  adapter,
  extra = {},
}) {
  const traceValue = {
    packetFingerprint,
    blockSources,
    anchors,
    referencePolicy,
    ...extra,
  };
  return {
    compilerId,
    compilerVersion,
    adapterId: adapter?.id ?? null,
    adapterVersion: adapter?.version ?? null,
    sourceFingerprint: fingerprint(traceValue),
    ...(anchors ? { anchorIds: anchors.map((a) => a.id) } : {}),
    ...extra,
  };
}
