import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDeterministicRepairs,
  applySystemDefaults,
} from '../../../packages/analysis-runtime/src/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

test('deterministic repair restores packet shape without inventing creative answers', () => {
  const packet = structuredClone(structuredAnalysisPacketFixture()) as unknown as Record<string, unknown>;
  delete packet.schemaVersion;
  const provenance = packet.provenance as Record<string, unknown>;
  delete provenance.generatedAt;
  delete provenance.sourceFingerprint;
  const creativeDecision = packet.creativeDecision as Record<string, unknown>;
  delete creativeDecision.toneBoundaries;

  const result = applyDeterministicRepairs({
    packet,
    issues: [],
    now: '2026-02-01T00:00:00.000Z',
  });

  assert.equal(result.packet.schemaVersion, '1.0');
  assert.equal(
    (result.packet.provenance as Record<string, unknown>).generatedAt,
    '2026-02-01T00:00:00.000Z',
  );
  assert.match(
    String((result.packet.provenance as Record<string, unknown>).sourceFingerprint),
    /^sha256:[a-f0-9]{64}$/u,
  );
  assert.deepEqual(
    (result.packet.creativeDecision as Record<string, unknown>).toneBoundaries,
    [],
  );
});

test('system defaults apply execution parameters with explicit provenance', () => {
  const result = applySystemDefaults({
    deliverable: 'space',
    issues: [
      {
        path: 'execution.camera.focalLength',
        code: 'CAMERA_DEFAULT_APPLIED',
        severity: 'defaultable',
        repairStrategy: 'system_default',
        appliesTo: ['space'],
        requiredEvidencePaths: [],
        availableEvidenceRefs: [],
        message: 'camera missing',
      },
      {
        path: 'execution.outputLanguage',
        code: 'OUTPUT_LANGUAGE_DEFAULT_APPLIED',
        severity: 'defaultable',
        repairStrategy: 'system_default',
        appliesTo: ['space'],
        requiredEvidencePaths: [],
        availableEvidenceRefs: [],
        message: 'language missing',
      },
      {
        path: 'execution.aspectRatio',
        code: 'ASPECT_RATIO_DEFAULT_APPLIED',
        severity: 'defaultable',
        repairStrategy: 'system_default',
        appliesTo: ['space'],
        requiredEvidencePaths: [],
        availableEvidenceRefs: [],
        message: 'ratio missing',
      },
    ],
    sourceFingerprint: 'sha256:source',
    projectLanguage: 'en-US',
  });

  assert.deepEqual(result.execution, {
    camera: { focalLength: '24-28mm' },
    outputLanguage: 'en-US',
    aspectRatio: '16:9',
  });
  assert.equal(result.defaulted['execution.camera.focalLength']?.status, 'system_default');
  assert.equal(result.defaulted['execution.outputLanguage']?.generatedBy, 'system_default');
});
