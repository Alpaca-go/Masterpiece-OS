// One-off helper: print the CI-W1C.3 E2E evidence summary.
import fs from 'node:fs';
const ev = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log('qualified:', ev.qualified);
console.log('ciRunId:', ev.ciRunId);
console.log('completedAt:', ev.completedAt);
console.log('---');
console.log('Checkpoints:');
for (const cp of ev.checkpoints) {
  console.log('  ' + cp.label.padEnd(40) + ' ' + (cp.status||'').padEnd(10) + ' ' + (cp.at || ''));
}
console.log('---');
console.log('Errors:', ev.errors.length);
for (const e of ev.errors) console.log('  ', e.at, e.message);
console.log('---');
const w = ev.finalWorkspace;
const ap = w?.anchorProduction;
console.log('finalWorkspace.anchorProduction:');
console.log('  run.status:', ap?.run?.status);
console.log('  run.candidateIds.length:', ap?.run?.candidateIds?.length);
console.log('  candidates.length:', ap?.candidates?.length);
console.log('  approvedAnchor.candidateId:', ap?.approvedAnchor?.candidateId);
console.log('  approvalHistory.length:', ap?.approvalHistory?.length);
