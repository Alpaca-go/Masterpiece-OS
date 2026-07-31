import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { completeStructuredAnalysis } from '../../../packages/analysis-runtime/src/index.ts';
import { createAnalysisRepairStore } from '../src/main/analysis-repair-store.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

test('repair store separates formal packet history from temporary runtime artifacts', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-repair-audit-'));
  try {
    const projectRoot = path.join(temp, 'project');
    const dataRoot = path.join(temp, 'data');
    const runId = 'repair-run-44444444-4444-4444-8444-444444444444';
    const store = createAnalysisRepairStore({ projectRoot, dataRoot, runId });
    const packet = structuredAnalysisPacketFixture();
    packet.creativeDecision.toneBoundaries = [];

    const result = await completeStructuredAnalysis({
      packet,
      deliverable: 'space',
      execution: {
        camera: { focalLength: '24-28mm' },
        outputLanguage: 'zh-CN',
        aspectRatio: '16:9',
      },
      model: async () => ({
        repairs: [{
          path: 'creativeDecision.toneBoundaries',
          value: [
            { target: 'confident', avoid: ['institutional'] },
            { target: 'warm', avoid: ['decorative nostalgia'] },
          ],
          status: 'inferred',
          confidence: 0.88,
          evidenceRefs: ['diagnosis:risk-1'],
        }],
      }),
      persistence: store,
      runId,
      now: () => '2026-02-01T00:00:00.000Z',
    });

    assert.equal(result.status, 'ready');
    const expected = [
      path.join(store.paths.history, 'visual-decision-packet.initial.json'),
      path.join(store.paths.history, 'visual-decision-packet.repaired-01.json'),
      path.join(store.paths.projectContext, 'visual-decision-packet.json'),
      path.join(store.paths.projectContext, 'analysis-repair-audit.json'),
      path.join(store.paths.runtime, 'initial-validation.json'),
      path.join(store.paths.runtime, 'repair-plan.json'),
      path.join(store.paths.runtime, 'repair-prompt.redacted.md'),
      path.join(store.paths.runtime, 'repair-response.redacted.json'),
      path.join(store.paths.runtime, 'merge-report.json'),
      path.join(store.paths.runtime, 'final-validation.json'),
    ];
    assert.ok((await Promise.all(expected.map(async (filename) => (
      fs.stat(filename).then(() => true).catch(() => false)
    )))).every(Boolean));

    const finalPacket = JSON.parse(await fs.readFile(
      path.join(store.paths.projectContext, 'visual-decision-packet.json'),
      'utf8',
    )) as Record<string, unknown>;
    assert.equal('promptRedacted' in finalPacket, false);
    assert.equal('responseRedacted' in finalPacket, false);
    const audit = JSON.parse(await fs.readFile(
      path.join(store.paths.projectContext, 'analysis-repair-audit.json'),
      'utf8',
    )) as { status: string; modelCallCount: number };
    assert.equal(audit.status, 'ready');
    assert.equal(audit.modelCallCount, 1);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
