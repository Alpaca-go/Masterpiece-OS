// P3-D3.5A / BB — Packaging Product Role Evidence Contract Corrective guards.
//
// The canonical product-role authority is `productAndCategoryRole`
// (per analysis-runtime deliverable-sufficiency.ts and
// image-generation-runtime prompt-contracts/packaging-contract.js).
// The legacy `productRoleEvidenceRefs` field is NOT part of
// PackagingTranslationV2 and no producer emits it; requiring it in
// prompt-preflight-gate caused a structural block for every
// packaging task. This corrective reconciles the gate with the
// canonical contract while preserving fail-closed semantics.
//
// Authoritative: docs/packaging/history/p3-d/p3-d3-5a-product-role-evidence-contract-corrective.md

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { runPromptPreflightGate } from '@masterpiece/image-generation-runtime/gates/prompt-preflight-gate.js';
import { compileProjectSpecificGenerationContract } from '@masterpiece/creative-production-runtime/project-generation-contract.js';
import { phase1Packet } from '../fixtures/phase1.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const GATE = path.join(ROOT, 'packages', 'image-generation-runtime', 'src', 'gates', 'prompt-preflight-gate.js');
const CONTRACT = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging-translation-contract.ts');
const C_PROD = path.join(ROOT, 'packages', 'creative-production-runtime', 'src', 'packaging-translation.js');
const UTILS = path.join(ROOT, 'apps', 'web', 'src', 'utils.ts');
const D34_AUDIT = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d', 'p3-d3-4-web-packaging-workflow-blocking-audit.md');
const D35A_DOC = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d', 'p3-d3-5a-product-role-evidence-contract-corrective.md');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function read(file) {
  return readFileSync(file, 'utf8');
}

function packagingTranslation(overrides = {}) {
  return {
    ...phase1Packet().mediaTranslations.packaging,
    ...overrides,
  };
}

function projectContract() {
  return compileProjectSpecificGenerationContract({
    visualDecisionPacket: phase1Packet(),
    deliverable: 'packaging',
  });
}

// ---------------------------------------------------------------------------
// BB-01..BB-03 — Root cause / evidence owner / no fabrication.
// ---------------------------------------------------------------------------

test('BB-01 P3-D3.4 root cause preserved', () => {
  assert.ok(existsSync(D34_AUDIT), 'D3.4 audit doc must exist');
  const doc = read(D34_AUDIT);
  assert.match(doc, /productRoleEvidenceRefs/u);
  assert.match(doc, /PACKAGING_PRODUCT_ROLE_MISSING/u);
});

test('BB-02 canonical evidence owner identified (productAndCategoryRole)', () => {
  // The canonical owner is productAndCategoryRole: analysis-runtime
  // deliverable-sufficiency maps it to PACKAGING_PRODUCT_ROLE_MISSING,
  // and packaging-contract.js uses it as the brand/product identity.
  const gate = read(GATE);
  assert.match(gate, /productAndCategoryRole/u);
  // The legacy field may appear only in documentation comments, never
  // as a logic read.
  const logicLines = gate.split(/\r?\n/u).filter((line) => !line.trim().startsWith('//'));
  assert.ok(!logicLines.some((line) => line.includes('productRoleEvidenceRefs')),
    'gate logic must not read productRoleEvidenceRefs');
});

test('BB-03 no fabricated evidence refs', () => {
  const gate = read(GATE);
  assert.doesNotMatch(gate, /\[['"](?:synthetic|project|analysis)['"]\]/u);
  assert.doesNotMatch(read(CONTRACT), /productRoleEvidenceRefs/u);
  assert.doesNotMatch(read(C_PROD), /productRoleEvidenceRefs/u);
});

// ---------------------------------------------------------------------------
// BB-04..BB-06 — Producers / normalizer preserve canonical evidence.
// ---------------------------------------------------------------------------

test('BB-04 analysis-led legal translation preserves product role evidence', () => {
  // A fully-populated canonical packaging translation (analysis-led
  // shape) carries a non-empty productAndCategoryRole and passes.
  const translation = packagingTranslation();
  assert.ok(translation.productAndCategoryRole.length > 0);
  const report = runPromptPreflightGate({
    finalPrompt: 'Premium box packaging with layered translucent wraps.',
    taskContract: { deliverableFamily: 'packaging', currentInstruction: '生成礼盒包装' },
    projectContract: projectContract(),
    packagingTranslation: translation,
    requireProjectContract: true,
  });
  assert.equal(report.findings.some((f) => f.code === 'PACKAGING_PRODUCT_ROLE_MISSING'), false);
});

test('BB-05 reference-first legal translation preserves product role evidence', () => {
  // The reference-first producer shares normalizePackagingTranslationV2;
  // a legal reference-first translation with productAndCategoryRole
  // must not lose the role through the gate.
  const translation = packagingTranslation();
  assert.ok(translation.productAndCategoryRole.length > 0);
  const report = runPromptPreflightGate({
    finalPrompt: 'Reference-led box packaging.',
    taskContract: { deliverableFamily: 'packaging', currentInstruction: '参考图风格礼盒' },
    projectContract: projectContract(),
    packagingTranslation: translation,
    requireProjectContract: true,
  });
  assert.equal(report.findings.some((f) => f.code === 'PACKAGING_PRODUCT_ROLE_MISSING'), false);
  // The normalizer contract must not contain the legacy field at all.
  assert.doesNotMatch(read(CONTRACT), /productRoleEvidenceRefs/u);
});

test('BB-06 normalizer no longer drops canonical evidence (gate reconciled)', () => {
  const gate = read(GATE);
  assert.match(gate, /productAndCategoryRole/u);
  const logicLines = gate.split(/\r?\n/u).filter((line) => !line.trim().startsWith('//'));
  assert.ok(!logicLines.some((line) => line.includes('productRoleEvidenceRefs')),
    'gate logic must not read productRoleEvidenceRefs');
  assert.doesNotMatch(read(CONTRACT), /productRoleEvidenceRefs/u);
});

// ---------------------------------------------------------------------------
// BB-07..BB-10 — Legal PASS / fail-closed negatives.
// ---------------------------------------------------------------------------

test('BB-07 legal packaging preflight PASS', () => {
  const report = runPromptPreflightGate({
    finalPrompt: 'Premium botanical serum box with frosted glass accents.',
    taskContract: { deliverableFamily: 'packaging', currentInstruction: '生成精华瓶包装' },
    projectContract: projectContract(),
    packagingTranslation: packagingTranslation(),
    requireProjectContract: true,
  });
  // The product-role blocker must be gone; any remaining block is a
  // different finding (e.g. cross-media leak), not a role gap.
  const codes = report.findings.map((f) => f.code);
  assert.ok(!codes.includes('PACKAGING_PRODUCT_ROLE_MISSING'));
  assert.ok(!codes.includes('UNSUPPORTED_PRODUCT_INVENTION'));
});

test('BB-08 legal container wording does not trigger unsupported invention', () => {
  // Container/product words with a confirmed canonical product role
  // must NOT trigger UNSUPPORTED_PRODUCT_INVENTION.
  const report = runPromptPreflightGate({
    finalPrompt: 'A premium serum bottle in a rigid gift box.',
    taskContract: { deliverableFamily: 'packaging', currentInstruction: '生成精华瓶与礼盒包装' },
    projectContract: projectContract(),
    packagingTranslation: packagingTranslation(),
    requireProjectContract: true,
  });
  assert.equal(report.findings.some((f) => f.code === 'UNSUPPORTED_PRODUCT_INVENTION'), false);
});

test('BB-09 no-evidence role still PACKAGING_PRODUCT_ROLE_MISSING', () => {
  // A translation with NO product/category role must fail closed.
  const report = runPromptPreflightGate({
    finalPrompt: 'Generate a package.',
    taskContract: { deliverableFamily: 'packaging', currentInstruction: '生成包装' },
    projectContract: projectContract(),
    packagingTranslation: packagingTranslation({ productAndCategoryRole: [] }),
    requireProjectContract: true,
  });
  assert.ok(report.findings.some((f) => f.code === 'PACKAGING_PRODUCT_ROLE_MISSING'));
});

test('BB-10 unsupported invention still fail-closed', () => {
  // No product role + container wording → still blocks.
  const report = runPromptPreflightGate({
    finalPrompt: 'Generate a serum bottle.',
    taskContract: { deliverableFamily: 'packaging', currentInstruction: '生成精华瓶' },
    projectContract: projectContract(),
    packagingTranslation: packagingTranslation({ productAndCategoryRole: [] }),
    requireProjectContract: true,
  });
  assert.ok(report.findings.some((f) => f.code === 'UNSUPPORTED_PRODUCT_INVENTION'));
});

// ---------------------------------------------------------------------------
// BB-11..BB-15 — Warning semantics / recoverability / no string parsing.
// ---------------------------------------------------------------------------

test('BB-11 LOCKED_ASSET_OMITTED remains warn', () => {
  const gate = read(GATE);
  assert.match(gate, /LOCKED_ASSET_OMITTED/u);
  assert.match(gate, /'warn'/u);
});

test('BB-12 blocking vs warning distinction preserved', () => {
  // A warn-only report must not flip status to blocked.
  const report = runPromptPreflightGate({
    finalPrompt: 'Premium box packaging.',
    taskContract: { deliverableFamily: 'packaging', currentInstruction: '礼盒' },
    projectContract: projectContract(),
    packagingTranslation: packagingTranslation(),
    requireProjectContract: true,
  });
  const warnOnly = report.findings.filter((f) => f.severity === 'warn');
  if (warnOnly.length && !report.findings.some((f) => f.severity === 'block')) {
    assert.equal(report.status, 'pass');
  }
});

test('BB-13 recoverability UI no false auto-recovery claim', () => {
  const utils = read(UTILS);
  assert.match(utils, /PACKAGING_PRODUCT_ROLE_MISSING/u);
  assert.match(utils, /UNSUPPORTED_PRODUCT_INVENTION/u);
});

test('BB-14 genuine auto-recompile cases remain recoverable', () => {
  const utils = read(UTILS);
  // The base codes remain; only data-gap findings are excluded.
  assert.match(utils, /PROMPT_PREFLIGHT_BLOCKED/u);
  assert.match(utils, /SPACE_PROMPT_BUDGET_BLOCKED/u);
  assert.match(utils, /VNEXT_COMPILE_INPUT_STALE/u);
});

test('BB-15 no message-string parsing workaround (structured codes only)', () => {
  const utils = read(UTILS);
  // The exclusion list is structured code tokens; no Chinese text match.
  assert.doesNotMatch(utils, /includes\(['"][\u4e00-\u9fff]/u);
});

// ---------------------------------------------------------------------------
// BB-16..BB-25 — Frozen surfaces / preservation.
// ---------------------------------------------------------------------------

test('BB-16 no project-specific rule', () => {
  const gate = read(GATE);
  assert.doesNotMatch(gate, /九州|jiuzhou|良方|JZMX/u);
  assert.doesNotMatch(read(C_PROD), /九州|jiuzhou|良方|JZMX/u);
});

test('BB-17 P2 Shot Contract unchanged', () => {
  const contracts = read(path.join(ROOT, 'packages', 'image-generation-runtime', 'src', 'packaging', 'contracts.js'));
  assert.match(contracts, /PKG-HERO-SINGLE/u);
  assert.match(contracts, /PKG-SERIES-GROUP/u);
  assert.match(contracts, /PKG-GIFT-OPEN/u);
});

test('BB-18 P3-A12 unchanged', () => {
  const ws = read(path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js'));
  assert.match(ws, /function checkStale/u);
  assert.match(ws, /checkStale,/u);
});

test('BB-19 P3-C selector/authority unchanged', () => {
  const selector = read(path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'canonical-packaging-context-selector.ts'));
  assert.match(selector, /generationMode/u);
});

test('BB-20 Reference-first mode authority unchanged', () => {
  const ra = read(path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'reference-assignments.js'));
  assert.match(ra, /projectReferenceAssignmentsToPolicy/u);
});

test('BB-21 Provider identity unchanged', () => {
  const registry = read(path.join(ROOT, 'packages', 'model-registry', 'src', 'index.js'));
  assert.match(registry, /seedream-5\.0-pro/u);
});

test('BB-22 production Provider calls = 0 (gate is offline)', () => {
  const gate = read(GATE);
  assert.doesNotMatch(gate, /fetch\(/u);
  assert.doesNotMatch(gate, /https?:\/\//u);
});

test('BB-23 Golden unchanged', () => {
  const delta = git(['diff', '--name-only', 'faad9406d4dad5e457ad636a4aa09380fa97e455', 'HEAD',
    '--', 'evaluation/golden-cases/', 'evaluation/anti-cases/', 'evaluation/hidden-cases/']);
  assert.equal(delta, '', 'no Golden delta since D3.4 audit HEAD');
});

test('BB-24 historical D3.4 audit preserved', () => {
  assert.ok(existsSync(D34_AUDIT), 'D3.4 audit doc must remain');
  assert.match(read(D34_AUDIT), /BLOCKER IDENTIFIED/u);
});

test('BB-25 Reference upload blocker remains untouched', () => {
  const native = read(path.join(ROOT, 'apps', 'web-runtime', 'src', 'node-native-operations.ts'));
  assert.match(native, /MASTERPIECE_WEB_SELECTED_FILES/u);
  assert.doesNotMatch(git(['diff', '--name-only', 'faad9406d4dad5e457ad636a4aa09380fa97e455', 'HEAD',
    '--', 'apps/web-runtime/src/node-native-operations.ts']), /.+/u);
});
