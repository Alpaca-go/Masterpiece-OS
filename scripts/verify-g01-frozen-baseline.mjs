#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(process.cwd());
const MANIFEST_RELATIVE = 'docs/creative-intelligence/ci-w1c.7.5-r1.7/g01-frozen-baseline.manifest.json';
const MANIFEST_DIRECTORY = path.dirname(path.join(ROOT, MANIFEST_RELATIVE));
const FINGERPRINT_RELATIVE = 'docs/creative-intelligence/ci-w1c.7.5-r1.7/g01-frozen-baseline.manifest.sha256';
const METHODOLOGY_RELATIVE = 'docs/creative-intelligence/ci-w1c.7.5-r1.7/08-g02-qualification-methodology.md';
const EXPECTED_ANCHORS = Object.freeze([
  'industry',
  'brand_role',
  'business_model',
  'target_audience',
  'audience_problem',
  'brand_promise',
  'competitive_context',
  'differentiation_logic',
  'strategic_objective',
  'brand_positioning',
  'brand_personality',
  'transformation_objective',
]);
const EXPECTED_SG_GATES = Object.freeze(['SG-01', 'SG-11', 'SG-12', 'SG-13', 'SG-14', 'SG-15']);
const EXPECTED_HUMAN_REVIEW_DIMENSIONS = Object.freeze([
  'Planning Fidelity',
  'Strategic Specificity',
  'Semantic Retention',
  'Insight Quality',
  'Traceability',
]);
const EXPECTED_PROVIDER_FAILURE_TAXONOMY = Object.freeze([
  'TRANSPORT_TIMEOUT',
  'TRANSPORT_CONNECTION',
  'RATE_LIMIT_RETRYABLE',
  'PROVIDER_5XX_RETRYABLE',
  'PROVIDER_4XX_NON_RETRYABLE',
  'AUTHENTICATION_ERROR',
  'CANCELLED',
  'SEMANTIC_PARSE_FAILURE',
  'SEMANTIC_GATE_FAILURE',
  'UNKNOWN_PROVIDER_FAILURE',
]);
const EXPECTED_LEDGER_FIELDS = Object.freeze([
  'stage',
  'attemptKind',
  'provider',
  'model',
  'latencyMs',
  'success',
  'errorCode',
  'causeCode',
  'failureClass',
  'retryable',
  'responseHeadersReceived',
  'finishReason',
  'usage',
]);
const EXPECTED_SOURCE_SHA = '94EE096E905943F463B54199A7E1D0F27F88CDF7DA8AF06FD12EE5CAC688A509';
const EXPECTED_REGISTERED_HASH = '97e9a84e41d59e37bba8edc7a6512916fd287caa856ce64a35a75f69fd5db2dd';
const results = [];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(canonicalize(value)), 'utf8');
}

function sameArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function check(id, description, condition, detail = '') {
  const pass = Boolean(condition);
  results.push({ id, description, pass, detail });
  console.log(`${id} ${pass ? 'PASS' : 'FAIL'} - ${description}${pass || !detail ? '' : `: ${detail}`}`);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function isRepoRelative(relativePath) {
  return typeof relativePath === 'string'
    && relativePath.length > 0
    && !path.isAbsolute(relativePath);
}

function resolveInsideRepo(relativePath, base = ROOT) {
  if (!isRepoRelative(relativePath)) return null;
  const absolutePath = path.resolve(base, relativePath);
  return absolutePath.startsWith(`${ROOT}${path.sep}`) ? absolutePath : null;
}

function run() {
  let manifest;
  try {
    manifest = readJson(MANIFEST_RELATIVE);
  } catch (error) {
    console.error(`BASELINE-01 FAIL - manifest schema valid: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const requiredTopLevel = [
    'schemaVersion', 'baselineId', 'status', 'frozenByPhase', 'frozenAtCommit',
    'qualificationVerdict', 'source', 'provenance', 'anchors', 'frozenContracts',
    'acceptedRunProvenance', 'operationalRisk', 'invalidationPolicy', 'g02Readiness',
    'canonicalization', 'zeroNetworkRecord',
  ];
  const provenancePaths = Object.values(manifest.provenance ?? {});
  const noAbsolutePaths = provenancePaths.every((relativePath) => resolveInsideRepo(relativePath, MANIFEST_DIRECTORY))
    && !JSON.stringify(manifest).includes('C:\\')
    && !JSON.stringify(manifest).includes('D:\\');

  check('BASELINE-01', 'manifest schema valid',
    manifest.schemaVersion === 'ci-g01-frozen-baseline-v1'
      && requiredTopLevel.every((key) => Object.hasOwn(manifest, key))
      && manifest.baselineId === 'G01'
      && manifest.frozenByPhase === 'CI-W1C.7.5-R1.6'
      && manifest.frozenAtCommit === '0d8ff3ec54b7cc3ff9679ef33364bef0845fb89f'
      && manifest.qualificationVerdict === 'G01_ATTEMPT_5_PASS'
      && noAbsolutePaths,
    'identity, required sections, or repo-relative path rule mismatch');
  check('BASELINE-02', 'status is FROZEN',
    manifest.status === 'FROZEN'
      && manifest.stateMachine?.currentState === 'FROZEN'
      && manifest.stateMachine?.automaticTransitionAllowed === false);

  const evidencePath = manifest.provenance?.evidence;
  const evidenceAbsolutePath = resolveInsideRepo(evidencePath, MANIFEST_DIRECTORY);
  const evidenceExists = evidenceAbsolutePath && existsSync(evidenceAbsolutePath);
  const evidence = evidenceExists ? JSON.parse(readFileSync(evidenceAbsolutePath, 'utf8')) : null;
  check('BASELINE-03', 'source SHA and registered content hash match R1.6',
    manifest.source?.sha256 === EXPECTED_SOURCE_SHA
      && manifest.source?.registeredContentHash === EXPECTED_REGISTERED_HASH
      && evidence?.sourceHashes?.sha256 === EXPECTED_SOURCE_SHA
      && evidence?.sourceHashes?.registeredContentHash === EXPECTED_REGISTERED_HASH);
  check('BASELINE-04', 'anchor set is the exact frozen 12-key sequence',
    manifest.anchors?.anchorCount === 12
      && manifest.anchors?.requiredMaterialRetention === 12
      && sameArray(manifest.anchors?.keys, EXPECTED_ANCHORS));
  check('BASELINE-05', 'SG gate set is SG-01/11/12/13/14/15',
    sameArray(manifest.frozenContracts?.sgGateSet, EXPECTED_SG_GATES));
  check('BASELINE-06', 'R1.6 canonical provenance paths exist',
    provenancePaths.length === 3
      && provenancePaths.every((relativePath) => {
        const absolutePath = resolveInsideRepo(relativePath, MANIFEST_DIRECTORY);
        return absolutePath && existsSync(absolutePath);
      }));
  check('BASELINE-07', 'evidence schema is ci-qualification-evidence-v2.1',
    manifest.frozenContracts?.evidence?.schemaVersion === 'ci-qualification-evidence-v2.1'
      && evidence?.schemaVersion === 'ci-qualification-evidence-v2.1');

  let fingerprint = '';
  try {
    fingerprint = readFileSync(path.join(ROOT, FINGERPRINT_RELATIVE), 'utf8').trim();
  } catch {}
  const digest = createHash('sha256').update(canonicalBytes(manifest)).digest('hex');
  check('BASELINE-08', 'manifest fingerprint is valid',
    fingerprint === `${digest}  g01-frozen-baseline.manifest.json`,
    `expected ${digest}`);
  check('BASELINE-09', 'Attempt 6 authorization is false',
    manifest.authorizations?.g01Attempt6 === false
      && manifest.zeroNetworkRecord?.g01Attempt6Executions === 0);
  check('BASELINE-10', 'G02 execution authorization is false',
    manifest.authorizations?.g02LiveQualification === false
      && manifest.g02Readiness?.liveExecutionAuthorized === false
      && manifest.g02Readiness?.executions === 0);
  check('BASELINE-11', 'Human Review applicable dimensions are exact',
    sameArray(manifest.frozenContracts?.humanReview?.applicableDimensions, EXPECTED_HUMAN_REVIEW_DIMENSIONS));
  check('BASELINE-12', 'Human Review thresholds are exactly 2 and 2.4',
    manifest.frozenContracts?.humanReview?.minimumEachApplicable === 2
      && manifest.frozenContracts?.humanReview?.minimumApplicableAverage === 2.4);
  check('BASELINE-13', 'traceability hard contract is exact',
    manifest.frozenContracts?.traceability?.hardAcceptance?.allFrozenAnchorsEvaluated === true
      && manifest.frozenContracts?.traceability?.hardAcceptance?.materialSemanticRetention === '12/12'
      && manifest.frozenContracts?.traceability?.hardAcceptance?.materialSilentLossCount === 0
      && manifest.frozenContracts?.traceability?.hardAcceptance?.contradictions === 0
      && manifest.frozenContracts?.traceability?.hardAcceptance?.allSgGatesPass === true
      && manifest.frozenContracts?.traceability?.hardAcceptance?.minimumTraceabilityScore === 2);
  check('BASELINE-14', 'diagnostics cannot become implicit hard gates',
    manifest.frozenContracts?.traceability?.diagnosticsMayBecomeImplicitHardGates === false);
  check('BASELINE-15', 'stage scope stops after synthesis',
    manifest.frozenContracts?.stageScope?.stopAfter === 'synthesis');
  check('BASELINE-16', 'Concept and Direction remain NOT_RUN with zero attempts',
    ['concept', 'direction'].every((stage) => {
      const value = manifest.frozenContracts?.stageScope?.[stage];
      return value?.status === 'NOT_RUN' && value?.attempts === 0 && value?.providerAttempts === 0;
    }));
  check('BASELINE-17', 'timeout authority is requestTimeoutMs',
    manifest.frozenContracts?.transport?.timeoutAuthority === 'requestTimeoutMs');
  check('BASELINE-18', 'retry budget is BASE1/TRANSPORT1/SEMANTIC1/max3',
    manifest.frozenContracts?.transport?.retryStateMachine?.BASE === 1
      && manifest.frozenContracts?.transport?.retryStateMachine?.TRANSPORT_RETRY === 1
      && manifest.frozenContracts?.transport?.retryStateMachine?.SEMANTIC_REPAIR === 1
      && manifest.frozenContracts?.transport?.retryStateMachine?.maximumProviderAttempts === 3);
  check('BASELINE-19', 'provider failure taxonomy is exact',
    sameArray(manifest.frozenContracts?.providerFailureTaxonomy, EXPECTED_PROVIDER_FAILURE_TAXONOMY));
  check('BASELINE-20', 'provider ledger required-field set is exact',
    sameArray(manifest.frozenContracts?.evidence?.requiredProviderCallLedgerFields, EXPECTED_LEDGER_FIELDS));

  const methodology = readFileSync(path.join(ROOT, METHODOLOGY_RELATIVE), 'utf8');
  check('G02READY-01', 'methodology contains no G01 project claim IDs',
    !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:PLANNING_STRATEGIC_SOURCE:/iu.test(methodology)
      && !methodology.includes(manifest.source?.registeredContentHash));
  check('G02READY-02', 'source-selection contract hardcodes no G02 file',
    manifest.g02Readiness?.selectedSource === null
      && manifest.g02Readiness?.sourceRead === false);
  check('G02READY-03', 'independent human-reviewed anchor map is required',
    manifest.g02Readiness?.independentHumanReviewedAnchorMapRequired === true
      && manifest.g02Readiness?.copyG01AnchorKeysMechanically === false);
  check('G02READY-04', 'SG architecture is inherited',
    sameArray(manifest.g02Readiness?.inheritedSgGateSet, EXPECTED_SG_GATES));
  check('G02READY-05', 'Strategic timeout requires G02 recalibration',
    manifest.g02Readiness?.timeoutMechanismInherited === 'requestTimeoutMs'
      && manifest.g02Readiness?.strategicTimeoutRecalibrationRequired === true
      && manifest.g02Readiness?.strategicTimeoutMsInheritedFromG01 === false
      && manifest.operationalRisk?.g02MayAutomaticallyInheritStrategicTimeout === false);
  check('G02READY-06', 'live G02 execution authorization is false',
    manifest.g02Readiness?.liveExecutionAuthorized === false
      && manifest.authorizations?.g02LiveQualification === false);

  const failures = results.filter((result) => !result.pass);
  console.log(`G01 frozen baseline verification: ${results.length - failures.length}/${results.length} PASS`);
  console.log('network calls: 0 | external source reads: 0 | Attempt 6: 0 | G02 executions: 0 | image calls: 0');
  if (failures.length > 0) process.exitCode = 1;
}

run();
