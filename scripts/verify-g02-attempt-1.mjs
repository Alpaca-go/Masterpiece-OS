import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phaseDir = path.join(root, 'docs', 'creative-intelligence', 'ci-w1c.8-g02-c');
const [manifest, evidence] = await Promise.all([
  readFile(path.join(phaseDir, 'g02-attempt-1.execution.manifest.json'), 'utf8').then(JSON.parse),
  readFile(path.join(phaseDir, '08-redacted-live-evidence.json'), 'utf8').then(JSON.parse),
]);

const checks = [];
const add = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });
const sgIds = ['SG-01', 'SG-11', 'SG-12', 'SG-13', 'SG-14', 'SG-15'];

add('EXEC-01', manifest.authorization?.humanAuthorized === true
  && manifest.authorization?.scope === 'G02 Attempt 1 Live Qualification only', 'human authorization is explicit and scoped');
add('EXEC-02', /^[A-F0-9]{64}$/.test(manifest.frozenInputs?.sourceSha256 ?? '')
  && /^[a-f0-9]{64}$/.test(manifest.frozenInputs?.anchorMapFingerprint ?? '')
  && manifest.frozenInputs?.g01Fingerprint === 'eda3982872a0545f8d8f30f34c931a423bd1c134e14f430ac93e132544e58d12', 'source, Anchor Map, and G01 identities are frozen');
add('EXEC-03', manifest.execution?.provider === 'dashscope' && manifest.execution?.model === 'qwen3.6-plus'
  && manifest.execution?.configuredTimeoutMs === 360000, 'Provider, model, and timeout match authorization');
add('EXEC-04', manifest.execution?.providerAttempts === 2
  && manifest.execution?.transportRetries === 0 && manifest.execution?.semanticRepairAttempts === 0
  && manifest.execution?.providerAttempts <= 6, 'independent counters remain within budget');

for (const id of ['PLIVE-01', 'PLIVE-02', 'PLIVE-03', 'PLIVE-04', 'PLIVE-05']) {
  add(id, String(manifest.planning?.gates?.[id] ?? '').startsWith('PASS'), `${id} Planning acceptance result`);
}
for (const id of sgIds) add(id, manifest.strategic?.sgGates?.[id] === 'PASS', `${id} Strategic runtime gate`);

add('TRACE-C01', manifest.qualification?.runtimeTraceability === 'PASS', 'runtime reference trace passes');
add('TRACE-C02', manifest.qualification?.groundTruthAnchorMapInjected === false, 'missing Anchor Map injection is explicitly detected');
add('TRACE-C03', manifest.qualification?.posthocAnchorReview?.criticalFullyRetained
  < manifest.qualification?.posthocAnchorReview?.criticalTotal, 'critical ground-truth retention failure is detected');
add('TRACE-C04', manifest.qualification?.failureClass === 'TRACEABILITY_FAILURE'
  && manifest.qualification?.automaticRepairAllowed === false, 'qualification failure stops without repair');
add('SCOPE-C01', manifest.execution?.conceptExecutions === 0
  && manifest.execution?.directionExecutions === 0 && manifest.execution?.imageCalls === 0, 'Concept, Direction, and Image remain zero');
add('EVID-C01', evidence.secretsPersisted === false && evidence.absoluteLocalPathsPersisted === false
  && evidence.counters?.providerAttempts === manifest.execution?.providerAttempts, 'redacted evidence contains no secrets or absolute local paths');
add('VERDICT-C01', manifest.finalVerdict === 'HOLD_FOR_TRACEABILITY_REPAIR'
  && evidence.finalVerdict === manifest.finalVerdict, 'verdict is data-driven and consistent');

for (const check of checks) console.log(`${check.id} ${check.pass ? 'PASS' : 'FAIL'} - ${check.detail}`);
console.log(`G02 Attempt 1 verification: ${checks.filter((check) => check.pass).length}/${checks.length} PASS`);
console.log(`final verdict: ${manifest.finalVerdict}`);
if (checks.some((check) => !check.pass)) process.exitCode = 1;
