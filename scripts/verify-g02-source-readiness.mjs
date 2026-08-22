#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.cwd());
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, 'docs/creative-intelligence/ci-w1c.8-g02-a.1');
const DEFAULT_G01 = path.join(ROOT, 'docs/creative-intelligence/ci-w1c.7.5-r1.7/g01-frozen-baseline.manifest.json');
const G01_KEYS = new Set(['industry', 'brand_role', 'business_model', 'target_audience', 'audience_problem', 'brand_promise', 'competitive_context', 'differentiation_logic', 'strategic_objective', 'brand_positioning', 'brand_personality', 'transformation_objective']);
const MATERIALITY = new Set(['CRITICAL', 'IMPORTANT', 'SUPPLEMENTARY']);
const APPLICABILITY = new Set(['APPLICABLE', 'NOT_APPLICABLE']);
const EPISTEMIC = new Set(['FACT', 'USER_REQUIREMENT', 'MIXED', 'UNKNOWN']);
const SHA256 = /^[0-9a-f]{64}$/i;

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

function result(id, description, condition, detail = '') {
  return { id, description, status: condition ? 'PASS' : 'FAIL', detail: condition ? '' : detail };
}

function isMechanicalG01Copy(anchors) {
  return anchors.length === G01_KEYS.size && anchors.every((anchor) => G01_KEYS.has(anchor.key));
}

function evaluate(identity, anchorMap, g01) {
  const frozenSha = g01?.source?.sha256;
  const anchors = Array.isArray(anchorMap?.anchors) ? anchorMap.anchors : [];
  const sourceBoundary = identity?.sourceBoundary ?? {};
  const comparison = identity?.g01Comparison ?? identity?.g01Collision ?? {};
  const role = identity?.documentRole ?? {};
  const sourceResults = [
    result('G02RSRC-01', 'exactly one replacement source is selected', identity?.schemaVersion === 'ci-g02-source-identity-v1' && sourceBoundary.selectedSourceCount === 1 && sourceBoundary.selectedSourceReads === 1 && typeof identity?.source?.filename === 'string'),
    result('G02RSRC-02', 'replacement SHA is valid and stable', SHA256.test(identity?.source?.sha256 ?? '') && identity?.integrity?.sha256VerifiedFromSingleRead === true),
    result('G02RSRC-03', 'replacement SHA differs from frozen G01 SHA', SHA256.test(frozenSha ?? '') && identity?.source?.sha256 !== frozenSha),
    result('G02RSRC-04', 'parent directory scans are zero', sourceBoundary.parentDirectoryScans === 0),
    result('G02RSRC-05', 'sibling source reads are zero', sourceBoundary.siblingSourceReads === 0),
    result('G02RSRC-06', 'material independence dimensions are at least three', comparison.materiallyDifferentDimensionCount >= 3, `actual ${comparison.materiallyDifferentDimensionCount ?? 'missing'}`),
    result('G02RSRC-07', 'selection status is SELECTED_INDEPENDENT', identity?.selectionStatus === 'SELECTED_INDEPENDENT')
  ];
  const roleResults = [
    result('G02ROLE-01', 'deterministic role is resolved', role.classifier === '@masterpiece/document-ingestion classifyDocumentRole' && typeof role.selectedRole === 'string'),
    result('G02ROLE-02', 'role is Planning Strategic Evidence eligible', role.sourceRole === 'PLANNING_STRATEGIC_SOURCE' && role.planningStrategicEvidenceEligible === true),
    result('G02ROLE-03', 'no manual role override was used', role.manualOverride === false)
  ];
  const ids = anchors.map((anchor) => anchor.anchorId);
  const anchorResults = [
    result('G02ANCHOR-01', 'anchor-map schema is valid', anchorMap?.schemaVersion === 'ci-qualification-anchor-map-v1'),
    result('G02ANCHOR-02', 'anchor map is non-empty', anchors.length > 0),
    result('G02ANCHOR-03', 'anchor IDs are unique', new Set(ids).size === ids.length),
    result('G02ANCHOR-04', 'every anchor has sourceSectionRefs', anchors.length > 0 && anchors.every((anchor) => Array.isArray(anchor.sourceSectionRefs) && anchor.sourceSectionRefs.length > 0)),
    result('G02ANCHOR-05', 'anchor map contains no G01 claim IDs', !JSON.stringify(anchorMap).includes(':PLANNING_STRATEGIC_SOURCE:')),
    result('G02ANCHOR-06', 'anchor map is not a mechanical G01 12-key copy', !isMechanicalG01Copy(anchors)),
    result('G02ANCHOR-07', 'materiality values are valid', anchors.length > 0 && anchors.every((anchor) => MATERIALITY.has(anchor.materiality))),
    result('G02ANCHOR-08', 'applicability values are valid', anchors.length > 0 && anchors.every((anchor) => APPLICABILITY.has(anchor.applicability))),
    result('G02ANCHOR-09', 'epistemic expectations are valid', anchors.length > 0 && anchors.every((anchor) => EPISTEMIC.has(anchor.epistemicExpectation))),
    result('G02ANCHOR-10', 'human review is recorded', anchorMap?.humanReviewed === true),
    result('G02ANCHOR-11', 'human review status is PASS', anchorMap?.reviewStatus === 'PASS'),
    result('G02ANCHOR-12', 'trace granularity is section-level', anchorMap?.traceGranularity === 'section-level')
  ];
  const boundaryPass = sourceBoundary.selectedSourceCount === 1 && sourceBoundary.selectedSourceReads === 1 && sourceBoundary.parentDirectoryScans === 0 && sourceBoundary.siblingSourceReads === 0 && sourceBoundary.unrelatedSourceReads === 0;
  const sourcePass = sourceResults.every((entry) => entry.status === 'PASS');
  const rolePass = roleResults.every((entry) => entry.status === 'PASS');
  const anchorPass = anchorResults.every((entry) => entry.status === 'PASS');
  let verdict;
  if (!boundaryPass) verdict = 'HOLD_FOR_G02_SOURCE_BOUNDARY_REPAIR';
  else if (!sourcePass) verdict = 'HOLD_FOR_G02_REPLACEMENT_SOURCE_SELECTION_REPAIR';
  else if (!rolePass) verdict = 'HOLD_FOR_G02_DOCUMENT_ROLE_REPAIR';
  else if (!anchorPass) verdict = 'HOLD_FOR_G02_ANCHOR_MAP_REPAIR';
  else verdict = 'READY_FOR_G02_PRELIVE_READINESS';
  return { sourceResults, roleResults, anchorResults, verdict };
}

function fixtures(g01) {
  const frozenSha = g01.source.sha256;
  const independentSha = frozenSha.replace(/^./, frozenSha[0] === 'A' ? 'B' : 'A');
  const identity = {
    schemaVersion: 'ci-g02-source-identity-v1', selectionStatus: 'SELECTED_INDEPENDENT',
    source: { filename: 'fixture.docx', sha256: independentSha }, integrity: { sha256VerifiedFromSingleRead: true },
    sourceBoundary: { selectedSourceCount: 1, selectedSourceReads: 1, parentDirectoryScans: 0, siblingSourceReads: 0, unrelatedSourceReads: 0 },
    g01Comparison: { materiallyDifferentDimensionCount: 4 },
    documentRole: { classifier: '@masterpiece/document-ingestion classifyDocumentRole', selectedRole: 'brand-strategy', sourceRole: 'PLANNING_STRATEGIC_SOURCE', planningStrategicEvidenceEligible: true, manualOverride: false }
  };
  const anchor = { anchorId: 'G02-FIXTURE-01', key: 'service_system', sourceSectionRefs: ['Section 1'], semanticExpectation: 'fixture', materiality: 'CRITICAL', applicability: 'APPLICABLE', epistemicExpectation: 'FACT', reviewerNote: 'fixture' };
  const validMap = { schemaVersion: 'ci-qualification-anchor-map-v1', traceGranularity: 'section-level', humanReviewed: true, reviewStatus: 'PASS', anchors: [anchor] };
  const invalidMap = { ...validMap, humanReviewed: false, reviewStatus: 'BLOCKED', anchors: [] };
  return { identity, validMap, invalidMap };
}

function runSelfTests(g01, currentIdentity) {
  const { identity, validMap, invalidMap } = fixtures(g01);
  const collision = structuredClone(identity);
  collision.selectionStatus = 'REJECTED_NOT_INDEPENDENT';
  collision.source.sha256 = g01.source.sha256;
  collision.g01Comparison.materiallyDifferentDimensionCount = 0;
  const collisionVerdict = evaluate(collision, validMap, g01).verdict;
  const independentEvaluation = evaluate(identity, invalidMap, g01);
  const readyVerdict = evaluate(identity, validMap, g01).verdict;
  const invalidVerdict = independentEvaluation.verdict;
  const sourceCode = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const currentSha = currentIdentity?.source?.sha256 ?? '';
  const currentFilename = currentIdentity?.source?.filename ?? '';
  return [
    result('VERIFIER-01', 'G01 collision fixture computes source HOLD', collisionVerdict === 'HOLD_FOR_G02_REPLACEMENT_SOURCE_SELECTION_REPAIR'),
    result('VERIFIER-02', 'independent replacement passes source gates', independentEvaluation.sourceResults.every((entry) => entry.status === 'PASS')),
    result('VERIFIER-03', 'independent source plus valid anchors computes READY', readyVerdict === 'READY_FOR_G02_PRELIVE_READINESS'),
    result('VERIFIER-04', 'invalid anchors compute anchor HOLD', invalidVerdict === 'HOLD_FOR_G02_ANCHOR_MAP_REPAIR'),
    result('VERIFIER-05', 'verifier contains no current candidate SHA or filename hardcode', (!currentSha || !sourceCode.includes(currentSha)) && (!currentFilename || !sourceCode.includes(currentFilename))),
    result('VERIFIER-06', 'verdict changes with evaluated data', new Set([collisionVerdict, readyVerdict, invalidVerdict]).size === 3)
  ];
}

function printResults(results) {
  for (const entry of results) console.log(`${entry.id} ${entry.status} - ${entry.description}${entry.detail ? `: ${entry.detail}` : ''}`);
}

const args = parseArgs(process.argv.slice(2));
const g01Path = path.resolve(args['g01-manifest'] ?? DEFAULT_G01);
const identityPath = path.resolve(args.identity ?? path.join(DEFAULT_OUTPUT_ROOT, 'g02-replacement-source-identity.redacted.json'));
const anchorPath = path.resolve(args['anchor-map'] ?? path.join(DEFAULT_OUTPUT_ROOT, 'g02-ground-truth-anchor-map.json'));
const g01 = loadJson(g01Path);
const identity = loadJson(identityPath);
const selfTests = runSelfTests(g01, identity);
printResults(selfTests);
if (args.selfTestOnly) {
  if (selfTests.some((entry) => entry.status === 'FAIL')) process.exitCode = 1;
} else {
  const anchorMap = loadJson(anchorPath);
  const evaluation = evaluate(identity, anchorMap, g01);
  printResults([...evaluation.sourceResults, ...evaluation.roleResults, ...evaluation.anchorResults]);
  console.log(`verdict: ${evaluation.verdict}`);
  const currentFailures = [...evaluation.sourceResults, ...evaluation.roleResults, ...evaluation.anchorResults].filter((entry) => entry.status === 'FAIL').length;
  console.log(`current artifact: ${currentFailures} failed checks`);
  if (selfTests.some((entry) => entry.status === 'FAIL') || evaluation.verdict !== 'READY_FOR_G02_PRELIVE_READINESS') process.exitCode = 1;
}
