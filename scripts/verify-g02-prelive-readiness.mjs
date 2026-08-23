#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { G02_ANCHOR_EPISTEMIC_EXPECTATIONS } from './lib/g02-qualification-contract.mjs';

const ROOT = path.resolve(process.cwd());
const DEFAULT_ROOT = path.join(ROOT, 'docs/creative-intelligence/ci-w1c.8-g02-a.3');
const EXPECTED_G01_FINGERPRINT = 'eda3982872a0545f8d8f30f34c931a423bd1c134e14f430ac93e132544e58d12';
const EXPECTED_ROLE = 'business-plan';
const EXPECTED_SOURCE_ROLE = 'PLANNING_STRATEGIC_SOURCE';
const REQUIRED_SG_GATES = Object.freeze(['SG-01', 'SG-11', 'SG-12', 'SG-13', 'SG-14', 'SG-15']);
const CLAIM_EPISTEMIC_TYPES = new Set(['FACT', 'USER_REQUIREMENT', 'MODEL_INFERENCE', 'UNKNOWN']);
const ANCHOR_EPISTEMIC_TYPES = new Set(G02_ANCHOR_EPISTEMIC_EXPECTATIONS);
const MATERIALITY = new Set(['CRITICAL', 'IMPORTANT', 'SUPPLEMENTARY']);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--self-test-only') args.selfTestOnly = true;
    else if (token.startsWith('--')) args[token.slice(2)] = argv[++index];
  }
  return args;
}

function loadJson(filename) {
  return JSON.parse(readFileSync(filename, 'utf8'));
}

function check(id, description, condition, detail = '') {
  return { id, description, status: condition ? 'PASS' : 'FAIL', detail: condition ? '' : detail };
}

function exactSet(actual, expected) {
  return actual.length === expected.length && actual.every((value) => expected.includes(value));
}

export function evaluateG02PreliveArtifacts({ identity, coverage, evidenceMap, anchorMap, timeout, readiness }) {
  const boundary = identity?.sourceBoundary ?? {};
  const role = identity?.documentRole ?? {};
  const sourceCatalog = Array.isArray(evidenceMap?.sourceCatalog) ? evidenceMap.sourceCatalog : [];
  const sourceIds = new Set(sourceCatalog.map((entry) => entry.sourceRef));
  const claims = Array.isArray(evidenceMap?.claims) ? evidenceMap.claims : [];
  const claimIds = new Set(claims.map((claim) => claim.claimId));
  const anchors = Array.isArray(anchorMap?.anchors) ? anchorMap.anchors : [];

  const sourceChecks = [
    check('G02A3SRC-01', 'source identity schema is valid', identity?.schemaVersion === 'ci-g02-source-identity-v1'),
    check('G02A3SRC-02', 'selected source read count is exactly one', boundary.selectedSourceReads === 1),
    check('G02A3SRC-03', 'parent and sibling reads are zero', boundary.parentDirectoryScans === 0 && boundary.siblingSourceReads === 0),
    check('G02A3SRC-04', 'legacy and unrelated reads are zero', boundary.legacyPngReads === 0 && boundary.unrelatedSourceReads === 0),
    check('G02A3SRC-05', 'A.2 role and eligibility are preserved', role.selectedRole === EXPECTED_ROLE && role.sourceRole === EXPECTED_SOURCE_ROLE && role.planningStrategicEvidenceEligible === true)
  ];

  const coverageChecks = [
    check('G02COV-01', 'coverage schema is valid', coverage?.schemaVersion === 'ci-g02-structured-coverage-v1'),
    check('G02COV-02', 'content is non-empty', Number.isInteger(coverage?.characterCount) && coverage.characterCount > 0),
    check('G02COV-03', 'parser and logical section counts are recorded', coverage?.parserSectionCount >= 1 && coverage?.logicalSectionCount >= coverage.parserSectionCount),
    check('G02COV-04', 'table count is recorded', Number.isInteger(coverage?.tableCount) && coverage.tableCount >= 0),
    check('G02COV-05', 'strategic semantic domains are independently mapped', Array.isArray(coverage?.semanticDomains) && coverage.semanticDomains.length >= 4 && coverage.semanticDomains.every((domain) => Array.isArray(domain.sourceRefs) && domain.sourceRefs.length > 0)),
    check('G02COV-06', 'coverage ratio is bounded and meets pre-live threshold', typeof coverage?.coverageRatio === 'number' && coverage.coverageRatio >= 0.75 && coverage.coverageRatio <= 1),
    check('G02COV-07', 'missing areas are explicit diagnostics', Array.isArray(coverage?.missingAreas)),
    check('G02COV-08', 'coverage does not change extraction schema', coverage?.extractionSchemaChanged === false)
  ];

  const evidenceChecks = [
    check('G02EVID-01', 'evidence map schema is valid', evidenceMap?.schemaVersion === 'ci-g02-planning-evidence-map-v1'),
    check('G02EVID-02', 'source catalog is non-empty and unique', sourceCatalog.length > 0 && sourceIds.size === sourceCatalog.length),
    check('G02EVID-03', 'claims are non-empty and unique', claims.length > 0 && claimIds.size === claims.length),
    check('G02EVID-04', 'every claim resolves to a source reference', claims.length > 0 && claims.every((claim) => sourceIds.has(claim.sourceRef))),
    check('G02EVID-05', 'every claim has a valid epistemic type', claims.length > 0 && claims.every((claim) => CLAIM_EPISTEMIC_TYPES.has(claim.epistemicType))),
    check('G02EVID-06', 'every claim carries traceability', claims.length > 0 && claims.every((claim) => typeof claim.traceability === 'string' && claim.traceability.length > 0)),
    check('G02EVID-07', 'needs resolve to claims and sources', Array.isArray(evidenceMap?.needs) && evidenceMap.needs.length > 0 && evidenceMap.needs.every((need) => need.claimRefs.every((id) => claimIds.has(id)) && need.sourceRefs.every((id) => sourceIds.has(id)))),
    check('G02EVID-08', 'evidence links resolve to claims and sources', Array.isArray(evidenceMap?.evidenceLinks) && evidenceMap.evidenceLinks.length > 0 && evidenceMap.evidenceLinks.every((link) => claimIds.has(link.claimId) && sourceIds.has(link.sourceRef)))
  ];

  const anchorIds = anchors.map((anchor) => anchor.anchorId);
  const anchorChecks = [
    check('G02A3ANCHOR-01', 'anchor-map schema is valid', anchorMap?.schemaVersion === 'ci-qualification-anchor-map-v1'),
    check('G02A3ANCHOR-02', 'anchor count is between 8 and 16', anchors.length >= 8 && anchors.length <= 16),
    check('G02A3ANCHOR-03', 'anchor IDs are unique', new Set(anchorIds).size === anchorIds.length),
    check('G02A3ANCHOR-04', 'anchor source references resolve', anchors.length > 0 && anchors.every((anchor) => sourceIds.has(anchor.sourceReference) && anchor.sourceSectionRefs.every((ref) => sourceIds.has(ref)))),
    check('G02A3ANCHOR-05', 'anchor claim references resolve', anchors.length > 0 && anchors.every((anchor) => anchor.claimRefs.length > 0 && anchor.claimRefs.every((id) => claimIds.has(id)))),
    check('G02A3ANCHOR-06', 'anchor semantic fields are present', anchors.length > 0 && anchors.every((anchor) => typeof anchor.semanticMeaning === 'string' && anchor.semanticMeaning.length > 0 && typeof anchor.semanticExpectation === 'string' && anchor.semanticExpectation.length > 0)),
    check('G02A3ANCHOR-07', 'anchor epistemic expectations use the frozen enum', anchors.length > 0 && anchors.every((anchor) => ANCHOR_EPISTEMIC_TYPES.has(anchor.epistemicExpectation))),
    check('G02A3ANCHOR-08', 'anchor materiality is valid', anchors.length > 0 && anchors.every((anchor) => MATERIALITY.has(anchor.materiality))),
    check('G02A3ANCHOR-09', 'every anchor passed independent review', anchorMap?.humanReviewed === true && anchorMap?.reviewStatus === 'PASS' && anchors.every((anchor) => anchor.reviewStatus === 'PASS')),
    check('G02A3ANCHOR-10', 'anchor map declares independence from G01', anchorMap?.independence?.inheritsG01Anchors === false && anchorMap?.independence?.copiesG01Claims === false)
  ];

  const gateEntries = Array.isArray(readiness?.traceabilityGates) ? readiness.traceabilityGates : [];
  const gateIds = gateEntries.map((gate) => gate.gateId);
  const traceChecks = [
    check('G02TRACE-01', 'required SG gate set is exact', exactSet(gateIds, REQUIRED_SG_GATES)),
    check('G02TRACE-02', 'every SG gate passes the pre-live contract', gateEntries.length === REQUIRED_SG_GATES.length && gateEntries.every((gate) => gate.status === 'PASS_PRELIVE_CONTRACT')),
    check('G02TRACE-03', 'claim to source trace is complete', readiness?.traceability?.claimToSource === 'PASS'),
    check('G02TRACE-04', 'anchor to source trace is complete', readiness?.traceability?.anchorToSource === 'PASS'),
    check('G02TRACE-05', 'future Strategic output must cite Planning evidence', readiness?.traceability?.strategicOutputToPlanningEvidence === 'REQUIRED_AT_LIVE_GATE'),
    check('G02TRACE-06', 'live Strategic gate execution remains zero', readiness?.g02Executions === 0 && readiness?.g02Attempt1Executions === 0)
  ];

  const timeoutChecks = [
    check('G02TIMEOUT-01', 'timeout calibration schema is valid', timeout?.schemaVersion === 'ci-g02-timeout-calibration-v1'),
    check('G02TIMEOUT-02', 'G01 timeout is not inherited', timeout?.inheritsG01Timeout === false),
    check('G02TIMEOUT-03', 'recommendation exceeds G01 timeout', timeout?.recommendedRequestTimeoutMs > timeout?.g01RequestTimeoutMs),
    check('G02TIMEOUT-04', 'recommendation has at least 20 percent margin over accepted G01 latency', timeout?.recommendedRequestTimeoutMs >= Math.ceil(timeout?.g01AcceptedLatencyMs * 1.2)),
    check('G02TIMEOUT-05', 'risk assessment is explicit and runtime remains unchanged', typeof timeout?.riskAssessment === 'string' && timeout.riskAssessment.length > 0 && timeout?.runtimeChanged === false)
  ];

  const g01Checks = [
    check('G02G01-01', 'G01 role remains brand-strategy and eligible', readiness?.g01Protection?.documentRole === 'brand-strategy' && readiness?.g01Protection?.planningStrategicEvidenceEligible === true),
    check('G02G01-02', 'G01 fingerprint is unchanged', readiness?.g01Protection?.fingerprint === EXPECTED_G01_FINGERPRINT),
    check('G02G01-03', 'G01 manifest semantic mutation count is zero', readiness?.g01Protection?.manifestSemanticMutations === 0)
  ];

  const groups = { sourceChecks, coverageChecks, evidenceChecks, anchorChecks, traceChecks, timeoutChecks, g01Checks };
  const failed = Object.values(groups).flat().filter((entry) => entry.status === 'FAIL');
  let verdict = 'READY_FOR_G02_PRELIVE_READINESS';
  if (g01Checks.some((entry) => entry.status === 'FAIL')) verdict = 'HOLD_FOR_G01_BASELINE_GUARD_REPAIR';
  else if (coverageChecks.some((entry) => entry.status === 'FAIL') || sourceChecks.some((entry) => entry.status === 'FAIL') || evidenceChecks.some((entry) => entry.status === 'FAIL')) verdict = 'HOLD_FOR_SOURCE_COVERAGE_REPAIR';
  else if (anchorChecks.some((entry) => entry.status === 'FAIL')) verdict = 'HOLD_FOR_ANCHOR_REPAIR';
  else if (traceChecks.some((entry) => entry.status === 'FAIL')) verdict = 'HOLD_FOR_TRACEABILITY_REPAIR';
  else if (timeoutChecks.some((entry) => entry.status === 'FAIL')) verdict = 'HOLD_FOR_TIMEOUT_CALIBRATION';
  return { ...groups, failedCount: failed.length, verdict };
}

function selfTests(artifacts) {
  const ready = evaluateG02PreliveArtifacts(artifacts).verdict;
  const badCoverage = structuredClone(artifacts);
  badCoverage.coverage.coverageRatio = 0.5;
  const badAnchor = structuredClone(artifacts);
  badAnchor.anchorMap.anchors = [];
  const badTrace = structuredClone(artifacts);
  badTrace.readiness.traceability.claimToSource = 'FAIL';
  const badTimeout = structuredClone(artifacts);
  badTimeout.timeout.inheritsG01Timeout = true;
  badTimeout.timeout.recommendedRequestTimeoutMs = badTimeout.timeout.g01RequestTimeoutMs;
  const badG01 = structuredClone(artifacts);
  badG01.readiness.g01Protection.fingerprint = '0'.repeat(64);
  return [
    check('A3VER-01', 'valid artifacts compute READY', ready === 'READY_FOR_G02_PRELIVE_READINESS'),
    check('A3VER-02', 'insufficient coverage computes coverage HOLD', evaluateG02PreliveArtifacts(badCoverage).verdict === 'HOLD_FOR_SOURCE_COVERAGE_REPAIR'),
    check('A3VER-03', 'missing anchors compute anchor HOLD', evaluateG02PreliveArtifacts(badAnchor).verdict === 'HOLD_FOR_ANCHOR_REPAIR'),
    check('A3VER-04', 'broken trace computes traceability HOLD', evaluateG02PreliveArtifacts(badTrace).verdict === 'HOLD_FOR_TRACEABILITY_REPAIR'),
    check('A3VER-05', 'unsafe timeout computes timeout HOLD', evaluateG02PreliveArtifacts(badTimeout).verdict === 'HOLD_FOR_TIMEOUT_CALIBRATION'),
    check('A3VER-06', 'G01 drift computes baseline HOLD', evaluateG02PreliveArtifacts(badG01).verdict === 'HOLD_FOR_G01_BASELINE_GUARD_REPAIR')
  ];
}

function printChecks(checks) {
  for (const entry of checks) console.log(`${entry.id} ${entry.status} - ${entry.description}${entry.detail ? `: ${entry.detail}` : ''}`);
}

const args = parseArgs(process.argv.slice(2));
const artifactRoot = path.resolve(args.root ?? DEFAULT_ROOT);
const artifacts = {
  identity: loadJson(path.join(artifactRoot, 'g02-source-identity.redacted.json')),
  coverage: loadJson(path.join(artifactRoot, 'g02-structured-coverage.json')),
  evidenceMap: loadJson(path.join(artifactRoot, 'g02-planning-evidence-map.json')),
  anchorMap: loadJson(path.join(artifactRoot, 'g02-ground-truth-anchor-map.json')),
  timeout: loadJson(path.join(artifactRoot, 'g02-timeout-calibration.json')),
  readiness: loadJson(path.join(artifactRoot, 'g02-prelive-readiness.json'))
};
const verifierChecks = selfTests(artifacts);
printChecks(verifierChecks);
if (!args.selfTestOnly) {
  const evaluation = evaluateG02PreliveArtifacts(artifacts);
  printChecks(Object.values(evaluation).filter(Array.isArray).flat());
  console.log(`verdict: ${evaluation.verdict}`);
  console.log(`current artifact: ${evaluation.failedCount} failed checks`);
  if (evaluation.verdict !== 'READY_FOR_G02_PRELIVE_READINESS') process.exitCode = 1;
}
if (verifierChecks.some((entry) => entry.status === 'FAIL')) process.exitCode = 1;
