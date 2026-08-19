// One-off: extract key data from G01/G02 evidence-stream.json files.
import fs from 'node:fs';
const arg = process.argv[2];
if (!arg) { console.error('usage: extract-evidence.mjs <run-alias>'); process.exit(1); }
const streamPath = `.codex-smoke/ci-w1c/${arg}/evidence/evidence-stream.json`;
const jsonPath = `.codex-smoke/ci-w1c/${arg}/evidence/evidence.json`;
const stream = JSON.parse(fs.readFileSync(streamPath, 'utf8'));
console.log('=== stream keys ===');
console.log(JSON.stringify(Object.keys(stream), null, 2));
console.log('=== stream.qualified ===', stream.qualified);
console.log('=== stream.ciRunId ===', stream.ciRunId);
console.log('=== errors ===', stream.errors?.length || 0);
console.log('=== checkpoints ===');
for (const cp of stream.checkpoints || []) {
  console.log('  ' + (cp.label || '').padEnd(40) + (cp.status || '').padEnd(10) + (cp.at || ''));
}
if (stream.finalWorkspace) {
  console.log('=== finalWorkspace present ===');
  const w = stream.finalWorkspace;
  const ap = w.anchorProduction;
  if (ap) {
    console.log('  anchorProduction.run.status:', ap.run?.status);
    console.log('  anchorProduction.candidates.length:', ap.candidates?.length);
    console.log('  anchorProduction.approvedAnchor.candidateId:', ap.approvedAnchor?.candidateId);
    console.log('  anchorProduction.approvalHistory.length:', ap.approvalHistory?.length);
  }
  console.log('  visualCanon.canonVersion:', w.visualCanon?.canonVersion);
  console.log('  visualCanon.grammarRefCount:', w.visualCanon?.visualGrammar?.compositionRules?.length);
  console.log('  visualCanon.dnaRefCount:', w.visualCanon?.visualDNA?.requiredElementIds?.length);
  console.log('  run.selectedDirectionId:', w.run?.selectedDirectionId);
  console.log('  run.selectionRevision:', w.run?.selectionRevision);
  console.log('  directionSet.directionCount:', w.directionSet?.directions?.length);
  console.log('  evaluation.recommendedDirectionId:', w.evaluation?.recommendedDirectionId);
  console.log('  productionTranslation.space.mustPreserve.length:', w.productionTranslation?.space?.mustPreserve?.length);
  console.log('  productionTranslation.space.mustNotIntroduce.length:', w.productionTranslation?.space?.mustNotIntroduce?.length);
  console.log('  productionTranslation.packaging.mustPreserve.length:', w.productionTranslation?.packaging?.mustPreserve?.length);
  console.log('  productionTranslation.packaging.mustNotIntroduce.length:', w.productionTranslation?.packaging?.mustNotIntroduce?.length);
}
