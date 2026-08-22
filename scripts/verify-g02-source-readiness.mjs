#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(process.cwd());
const OUTPUT_ROOT = path.join(ROOT, 'docs/creative-intelligence/ci-w1c.8-g02-a');
const identity = JSON.parse(readFileSync(path.join(OUTPUT_ROOT, 'g02-source-identity.redacted.json'), 'utf8'));
const anchorMap = JSON.parse(readFileSync(path.join(OUTPUT_ROOT, 'g02-ground-truth-anchor-map.json'), 'utf8'));
const g01 = JSON.parse(readFileSync(path.join(ROOT, 'docs/creative-intelligence/ci-w1c.7.5-r1.7/g01-frozen-baseline.manifest.json'), 'utf8'));
const expectedG01Anchors = new Set(g01.anchors?.keys ?? []);
const results = [];

function record(id, description, status, detail = '') {
  results.push({ id, description, status, detail });
  console.log(`${id} ${status} - ${description}${detail ? `: ${detail}` : ''}`);
}

function check(id, description, condition, detail = '') {
  record(id, description, condition ? 'PASS' : 'FAIL', condition ? '' : detail);
}

function blocked(id, description, reason) {
  record(id, description, 'BLOCKED', reason);
}

const anchors = Array.isArray(anchorMap.anchors) ? anchorMap.anchors : [];
check('G02SRC-01', 'exactly one explicit source is selected',
  identity.schemaVersion === 'ci-g02-source-identity-v1'
    && identity.sourceBoundary?.selectedSourceCount === 1
    && typeof identity.source?.filename === 'string');
check('G02SRC-02', 'source SHA is stable',
  identity.source?.sha256 === '94EE096E905943F463B54199A7E1D0F27F88CDF7DA8AF06FD12EE5CAC688A509');
check('G02SRC-03', 'parent directory scan count is zero',
  identity.sourceBoundary?.parentDirectoryScans === 0);
check('G02SRC-04', 'sibling source read count is zero',
  identity.sourceBoundary?.siblingSourceReads === 0);
check('G02SRC-05', 'material independence dimensions are at least three',
  identity.g01Collision?.materiallyDifferentDimensionCount >= 3,
  `actual ${identity.g01Collision?.materiallyDifferentDimensionCount}; candidate is identical to frozen G01`);

check('G02ROLE-01', 'deterministic document role is resolved',
  identity.documentRole?.classifier === '@masterpiece/document-ingestion classifyDocumentRole'
    && identity.documentRole?.selectedRole === 'brand-strategy');
check('G02ROLE-02', 'role is Planning Strategic Evidence eligible',
  identity.documentRole?.sourceRole === 'PLANNING_STRATEGIC_SOURCE'
    && identity.documentRole?.planningStrategicEvidenceEligible === true);

check('G02ANCHOR-01', 'anchor-map schema envelope is valid',
  anchorMap.schemaVersion === 'ci-qualification-anchor-map-v1'
    && anchorMap.status === 'BLOCKED_SOURCE_NOT_INDEPENDENT'
    && Array.isArray(anchorMap.anchors));
if (anchors.length === 0) {
  blocked('G02ANCHOR-02', 'all anchor IDs are unique', 'independent anchor construction not authorized');
  blocked('G02ANCHOR-03', 'every anchor has sourceSectionRefs', 'independent anchor construction not authorized');
} else {
  check('G02ANCHOR-02', 'all anchor IDs are unique', new Set(anchors.map((entry) => entry.anchorId)).size === anchors.length);
  check('G02ANCHOR-03', 'every anchor has sourceSectionRefs', anchors.every((entry) => Array.isArray(entry.sourceSectionRefs) && entry.sourceSectionRefs.length > 0));
}
check('G02ANCHOR-04', 'anchor map contains no G01 claim IDs',
  !JSON.stringify(anchorMap).includes(':PLANNING_STRATEGIC_SOURCE:'));
check('G02ANCHOR-05', 'anchor map is not a mechanical copy of the G01 12-key set',
  anchors.length !== 12 || anchors.some((entry) => !expectedG01Anchors.has(entry.key)));
if (anchors.length === 0) {
  blocked('G02ANCHOR-06', 'anchor materiality values are valid', 'independent anchor construction not authorized');
  blocked('G02ANCHOR-07', 'human review passes', 'source-selection gate failed before anchor review');
} else {
  check('G02ANCHOR-06', 'anchor materiality values are valid', anchors.every((entry) => ['CRITICAL', 'IMPORTANT', 'SUPPLEMENTARY'].includes(entry.materiality)));
  check('G02ANCHOR-07', 'human review passes', anchorMap.humanReviewed === true && anchorMap.reviewStatus === 'PASS');
}
check('G02ANCHOR-08', 'trace granularity is declared', anchorMap.traceGranularity === 'section-level');

check('G02READY-07', 'live execution authorization is false',
  identity.authorizations?.g02LiveQualification === false
    && identity.executionRecord?.g02Executions === 0);
check('G02READY-08', 'timeout recalibration remains required',
  identity.timeoutCalibration?.strategicTimeoutRecalibrationRequired === true
    && identity.timeoutCalibration?.inheritsG01StrategicTimeout === false);

const failures = results.filter((entry) => entry.status === 'FAIL');
const blockedCount = results.filter((entry) => entry.status === 'BLOCKED').length;
console.log(`G02 source readiness: ${results.length - failures.length - blockedCount} PASS | ${failures.length} FAIL | ${blockedCount} BLOCKED`);
console.log('verdict: HOLD_FOR_G02_SOURCE_SELECTION_REPAIR');
if (failures.length > 0) process.exitCode = 1;
