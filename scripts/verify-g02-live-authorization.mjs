import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DIR = path.join(ROOT, 'docs', 'creative-intelligence', 'ci-w1c.8-g02-b');
const A3_DIR = path.join(ROOT, 'docs', 'creative-intelligence', 'ci-w1c.8-g02-a.3');
const G01_DIR = path.join(ROOT, 'docs', 'creative-intelligence', 'ci-w1c.7.5-r1.7');
const MANIFEST_PATH = path.resolve(process.argv[2] ?? path.join(DEFAULT_DIR, 'g02-live-authorization.manifest.json'));
const EXPECTED_G01_FINGERPRINT = 'eda3982872a0545f8d8f30f34c931a423bd1c134e14f430ac93e132544e58d12';
const ALLOWED_VERDICTS = new Set([
  'READY_FOR_G02_ATTEMPT_1_AUTHORIZATION',
  'HOLD_FOR_AUTHORIZATION_CONTRACT_REPAIR',
  'HOLD_FOR_PROVIDER_POLICY_REPAIR',
  'HOLD_FOR_BUDGET_POLICY_REPAIR',
  'HOLD_FOR_TIMEOUT_POLICY_REPAIR',
  'HOLD_FOR_EVIDENCE_CONTRACT_REPAIR',
  'HOLD_FOR_ROLLBACK_REPAIR',
  'HOLD_FOR_G01_BASELINE_GUARD_REPAIR',
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function manifestFingerprint(manifest) {
  const copy = structuredClone(manifest);
  delete copy.manifestFingerprint;
  return fingerprint(copy);
}

function evaluate(manifest, identity, anchors, g01Fingerprint) {
  const checks = [];
  const add = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });
  const sourceBinding = {
    sha256: identity?.source?.sha256,
    documentRole: identity?.documentRole?.selectedRole,
    sourceRole: identity?.documentRole?.sourceRole,
    planningStrategicEvidenceEligible: identity?.documentRole?.planningStrategicEvidenceEligible,
  };
  const policy = manifest?.providerPolicy ?? {};
  const timeout = manifest?.timeoutPolicy ?? {};
  const retry = manifest?.retryPolicy ?? {};
  const budget = manifest?.budgetPolicy ?? {};
  const evidence = manifest?.evidencePolicy ?? {};
  const failure = manifest?.failurePolicy ?? {};
  const rollback = manifest?.rollbackPolicy ?? {};
  const gate = manifest?.authorizationGate ?? {};
  const boundary = manifest?.executionBoundary ?? {};
  const zeroBoundary = Object.values(boundary).every((value) => value === 0);

  add('AUTH-01', manifest?.sourceFingerprint === fingerprint(sourceBinding)
    && manifest?.sourceIdentity?.replacementSha256 === identity?.source?.sha256
    && manifest?.sourceIdentity?.anchorMapFingerprint === fingerprint(anchors), 'source and anchor fingerprints are frozen');
  add('AUTH-02', typeof policy.provider === 'string' && typeof policy.modelFamily === 'string'
    && Array.isArray(policy.allowedStages) && policy.allowedStages.length > 0
    && policy.automaticProviderSwitch === false && policy.fallbackPolicy?.enabled === false, 'provider, family, stages, and no-fallback policy are frozen');
  add('AUTH-03', timeout.calibratedTimeoutMs === 360000 && timeout.inheritsG01Timeout === false
    && timeout.automaticLoweringAllowed === false && timeout.runtimeChanged === false, 'A.3 timeout is frozen without runtime mutation');
  add('AUTH-04', retry.maximumProviderAttemptsPerStage === 3
    && retry.maximumTransportRetriesPerStage === 1 && retry.maximumSemanticRepairsPerStage === 1
    && retry.infiniteRetryAllowed === false, 'bounded retry budget is present');
  const preliveGate = gate.humanAuthorized === false && manifest?.authorizationStatus === 'G02_PRELIVE_READY';
  const authorizedGate = gate.humanAuthorized === true && manifest?.authorizationStatus === 'G02_AUTHORIZED'
    && gate.authorizationRecord?.authorizationScope === 'G02 Attempt 1 Live Qualification only'
    && JSON.stringify(gate.authorizationRecord?.approvedStages) === JSON.stringify(['Planning', 'Strategic'])
    && gate.authorizationRecord?.provider === policy.provider
    && gate.authorizationRecord?.model === policy.model
    && gate.authorizationRecord?.timeoutMs === timeout.calibratedTimeoutMs
    && gate.authorizationRecord?.allowConcept === false
    && gate.authorizationRecord?.allowDirection === false
    && gate.authorizationRecord?.allowImage === false;
  add('AUTH-05', gate.humanAuthorizationRequired === true && gate.automaticTransitionAllowed === false
    && (preliveGate || authorizedGate), 'human approval state is explicit, scoped, and never inferred');
  add('AUTH-06', /^[a-f0-9]{64}$/.test(manifest?.manifestFingerprint ?? '')
    && manifest.manifestFingerprint === manifestFingerprint(manifest), 'manifest canonical fingerprint is deterministic');

  add('BUDGET-01', budget.countersAreIndependent === true && budget.counterNames?.includes('providerAttempts'), 'providerAttempts is isolated');
  add('BUDGET-02', budget.counterNames?.includes('transportRetries') && budget.initialCounters?.transportRetries === 0, 'transportRetries is isolated');
  add('BUDGET-03', budget.counterNames?.includes('semanticRepairAttempts') && budget.initialCounters?.semanticRepairAttempts === 0, 'semanticRepairAttempts is isolated');
  add('BUDGET-04', budget.maximumLiveCalls === policy.allowedStages?.length * retry.maximumProviderAttemptsPerStage
    && budget.perStageMaximumLiveCalls === retry.maximumProviderAttemptsPerStage, 'qualification-wide and per-stage live-call caps are enforced');

  add('FAIL-01', failure.transport?.types?.includes('TRANSPORT_TIMEOUT'), 'timeout has an explicit transport classification');
  add('FAIL-02', failure.transport?.action === 'ALLOW_BOUNDED_TRANSPORT_RETRY'
    && retry.maximumTransportRetriesPerStage === 1, 'transport retry is bounded');
  add('FAIL-03', failure.semantic?.action === 'ALLOW_BOUNDED_SEMANTIC_REPAIR'
    && retry.semanticRepairRequiresUsablePreviousResponse === true, 'semantic repair is bounded and requires a usable response');
  add('FAIL-04', failure.qualification?.action === 'STOP'
    && ['GROUNDING_LOSS', 'TRACEABILITY_FAILURE', 'REVIEW_FAILURE'].every((type) => failure.qualification?.types?.includes(type)), 'qualification failures stop execution');

  add('ROLLBACK-01', rollback.failureState === 'G02_PRELIVE_READY' && rollback.restoreState === 'G02_PRELIVE_READY', 'failure restores pre-live state');
  add('ROLLBACK-02', g01Fingerprint === EXPECTED_G01_FINGERPRINT
    && manifest?.g01Protection?.fingerprint === EXPECTED_G01_FINGERPRINT
    && manifest?.g01Protection?.semanticMutationCount === 0, 'G01 fingerprint is unchanged');
  add('ROLLBACK-03', rollback.immutableArtifacts?.includes('G02_GROUND_TRUTH_ANCHOR_MAP')
    && manifest?.sourceIdentity?.anchorMapFingerprint === fingerprint(anchors), 'Anchor Map is immutable and fingerprint-bound');

  const requiredEvidence = [
    ['planningRequired', ['inputFingerprint', 'claims', 'needs', 'refs', 'artifact']],
    ['strategicRequired', ['inputEvidence', 'promptIdentity', 'providerMetadata', 'outputArtifact', 'traceMap']],
    ['failureRequired', ['errorType', 'attemptNumber', 'latencyMs', 'providerState']],
  ];
  const evidenceComplete = requiredEvidence.every(([key, required]) => required.every((field) => evidence[key]?.includes(field)))
    && evidence.rawSecretsForbidden === true && evidence.redactionRequired === true;

  let verdict = 'READY_FOR_G02_ATTEMPT_1_AUTHORIZATION';
  if (!checks.find((check) => check.id === 'ROLLBACK-02')?.pass) verdict = 'HOLD_FOR_G01_BASELINE_GUARD_REPAIR';
  else if (!checks.find((check) => check.id === 'AUTH-02')?.pass) verdict = 'HOLD_FOR_PROVIDER_POLICY_REPAIR';
  else if (!checks.filter((check) => check.id.startsWith('BUDGET-')).every((check) => check.pass)) verdict = 'HOLD_FOR_BUDGET_POLICY_REPAIR';
  else if (!checks.find((check) => check.id === 'AUTH-03')?.pass) verdict = 'HOLD_FOR_TIMEOUT_POLICY_REPAIR';
  else if (!evidenceComplete) verdict = 'HOLD_FOR_EVIDENCE_CONTRACT_REPAIR';
  else if (!checks.filter((check) => check.id.startsWith('ROLLBACK-')).every((check) => check.pass)) verdict = 'HOLD_FOR_ROLLBACK_REPAIR';
  else if (!checks.filter((check) => check.id.startsWith('AUTH-')).every((check) => check.pass) || !zeroBoundary) verdict = 'HOLD_FOR_AUTHORIZATION_CONTRACT_REPAIR';

  return { checks, verdict, evidenceComplete, zeroBoundary };
}

const [manifest, identity, anchors, g01ShaFile] = await Promise.all([
  readFile(MANIFEST_PATH, 'utf8').then(JSON.parse),
  readFile(path.join(A3_DIR, 'g02-source-identity.redacted.json'), 'utf8').then(JSON.parse),
  readFile(path.join(A3_DIR, 'g02-ground-truth-anchor-map.json'), 'utf8').then(JSON.parse),
  readFile(path.join(G01_DIR, 'g01-frozen-baseline.manifest.sha256'), 'utf8'),
]);
const g01Fingerprint = g01ShaFile.trim().split(/\s+/)[0];
const result = evaluate(manifest, identity, anchors, g01Fingerprint);

for (const check of result.checks) console.log(`${check.id} ${check.pass ? 'PASS' : 'FAIL'} - ${check.detail}`);
console.log(`EVIDENCE ${result.evidenceComplete ? 'PASS' : 'FAIL'} - required capture fields and redaction contract`);
console.log(`ZERO-LIVE ${result.zeroBoundary ? 'PASS' : 'FAIL'} - all live execution counters are zero`);
console.log(`verdict: ${result.verdict}`);

if (!ALLOWED_VERDICTS.has(result.verdict) || result.verdict !== manifest.verdict
  || result.checks.some((check) => !check.pass) || !result.evidenceComplete || !result.zeroBoundary) {
  process.exitCode = 1;
}

export { canonicalize, evaluate, fingerprint, manifestFingerprint };
