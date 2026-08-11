import test from 'node:test';
import assert from 'node:assert/strict';
import { runGoldenSuite } from './golden-suite.js';

test('S2 Golden Regression baseline passes without real provider calls', async () => {
  const report = await runGoldenSuite();
  assert.equal(report.providerCalls, 0);
  assert.equal(report.autoUpdated, false);
  assert.equal(report.overall, 'PASS', JSON.stringify(report.results, null, 2));
  assert.deepEqual(report.results.map((item) => item.id), ['G-01-01', 'G-02-01', 'G-03-01', 'G-04-01', 'G-05-01']);
  assert.ok(report.results.every((item) => item.result === 'PASS'));
});
