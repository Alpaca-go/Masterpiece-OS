import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRepairPrompt } from '../../../packages/analysis-runtime/src/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

test('repair prompt includes only requested fields and selected current-project evidence', () => {
  const packet = structuredAnalysisPacketFixture();
  const result = buildRepairPrompt({
    packet,
    attempt: 1,
    batch: {
      id: 'repair-batch-01',
      strategy: 'ai_from_evidence',
      fieldPaths: ['creativeDecision.toneBoundaries'],
      evidencePaths: ['diagnosis.brandMisreadRisks'],
      evidenceRefs: ['diagnosis:risk-1'],
    },
  });

  assert.match(result.prompt, /creativeDecision\.toneBoundaries/u);
  assert.match(result.prompt, /diagnosis:risk-1/u);
  assert.match(result.prompt, /generic service venue/u);
  assert.doesNotMatch(result.prompt, /A clear opening sequence/u);
  assert.doesNotMatch(result.prompt, /project-generic/u);
  assert.deepEqual(Object.keys(result.evidence), ['diagnosis.brandMisreadRisks']);
});
