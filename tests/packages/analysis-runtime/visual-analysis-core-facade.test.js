import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VISUAL_ANALYSIS_CORE_ID,
  completeStructuredAnalysis as completeThroughCore,
} from '@masterpiece/analysis-runtime/core/visual-analysis-core.ts';
import { completeStructuredAnalysis as historicalCompletion } from '@masterpiece/analysis-runtime/analysis-completion-orchestrator.ts';

test('Visual Analysis Core is a single facade over structured analysis completion', () => {
  assert.equal(VISUAL_ANALYSIS_CORE_ID, 'visual-analysis-core@1.0.0');
  assert.equal(completeThroughCore, historicalCompletion);
});
