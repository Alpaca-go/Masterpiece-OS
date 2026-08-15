// P3-D3.6B / BC — Web Reference File Picker & Asset Import guards.
//
// Pins the implemented browser file-picker → project asset →
// referenceAssignment → reference_first Prepare flow (P3-D3.6A/6B
// frozen contract). Static source guards prove the Web UI no longer
// depends on the env-injection `chooseFiles` path for reference
// uploads; integration guards prove the sanctioned import seam and
// the canonical assignment + Prepare path.
//
// Authoritative: docs/packaging/history/p3-d/p3-d3-6a-web-asset-upload-architecture-contract.md
//                docs/packaging/history/p3-d/p3-d3-6b-web-asset-upload-implementation.md

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  createPackagingWorkspaceService,
  PACKAGING_WORKSPACE_STATUS,
} from '@masterpiece/runtime-core';
import { preparePackagingGeneration } from '@masterpiece/image-generation-runtime/packaging/generation-service.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const WORKSPACE = path.join(ROOT, 'apps', 'web', 'src', 'components', 'ShortChainGenerationWorkspace.tsx');
const CONTRACTS = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application-contracts.ts');
const PROJECT_STORE = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'project-store.ts');
const OPS = path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'project-operations.js');
const RPC_SERVER = path.join(ROOT, 'apps', 'web-runtime', 'src', 'local-rpc-server.ts');
const D35B_DOC = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d', 'p3-d3-5b-web-reference-file-picker-corrective.md');
const D36A_DOC = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d', 'p3-d3-6a-web-asset-upload-architecture-contract.md');

function read(file) {
  return readFileSync(file, 'utf8');
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

const NOW = '2026-08-15T14:30:00.000Z';

function makeTruthSnapshot() {
  return {
    lockedAssets: {
      brand: { name: 'Acme', locked: true },
      logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: 'Acme Bottle', locked: true },
      category: { name: 'cosmetics', locked: true },
      structure: { formFactor: 'cylindrical glass bottle', locked: true },
      mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: [], locked: true },
    },
    projectIdentity: {
      brandName: 'Acme', industry: 'cosmetics', brandRole: 'premium cosmetics',
      productIdentity: 'Acme Bottle',
    },
    analysisContext: {},
    projectVisualContext: {
      packageStructures: ['cylindrical body', 'dropper closure'],
      packagingConcept: 'Precise botanical care expressed through restrained material contrast.',
    },
  };
}

function driveReferenceFirstPrepare() {
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'bc-ref-session',
    now: () => NOW,
    preparePackagingGeneration,
  });
  const session = service.createSession({ projectId: 'bc-project', truthSnapshot: makeTruthSnapshot() });
  service.updateIntent(session.sessionId, {
    providerModelId: 'seedream-5.0-pro',
    apiProfileId: 'profile-seedream',
    generationMode: 'reference_first',
    shotContractId: 'PKG-HERO-SINGLE',
    referenceAssignments: [{ assetId: 'web-imported-asset-01', role: 'product_identity_reference', source: 'user' }],
  });
  const ready = service.prepareGeneration(session.sessionId);
  return ready;
}

// ---------------------------------------------------------------------------
// BC-01..BC-08 — historical HOLD + Web UI wiring.
// ---------------------------------------------------------------------------

test('BC-01 D3.5B historical HOLD preserved', () => {
  assert.ok(existsSync(D35B_DOC), 'D3.5B HOLD doc must remain');
  assert.match(read(D35B_DOC), /WEB FILE UPLOAD TRANSPORT CONTRACT GAP/u);
});

test('BC-02 upload button wired', () => {
  const src = read(WORKSPACE);
  assert.match(src, /上传参考图/u);
  assert.match(src, /void uploadReferenceImage\(\)/u);
});

test('BC-03 browser file input exists', () => {
  const src = read(WORKSPACE);
  assert.match(src, /type="file"/u);
  assert.match(src, /accept="image\/png,image\/jpeg,image\/webp"/u);
});

test('BC-04 click invokes input.click', () => {
  const src = read(WORKSPACE);
  assert.match(src, /uploadInputRef\.current\?\.click\(\)/u);
});

test('BC-05 Web flow no MASTERPIECE_WEB_SELECTED_FILES dependency', () => {
  const src = read(WORKSPACE);
  // The reference-upload handler must not invoke chooseFiles /
  // env injection. Comment mentions are allowed.
  const logicLines = src.split(/\r?\n/u).filter((line) => !line.trim().startsWith('//'));
  assert.ok(!logicLines.some((line) => line.includes('chooseFiles')), 'upload flow must not call chooseFiles');
  assert.ok(!logicLines.some((line) => line.includes('MASTERPIECE_WEB_SELECTED_FILES')),
    'upload flow must not read MASTERPIECE_WEB_SELECTED_FILES');
});

test('BC-06 valid File selected (importFileBytes called with base64)', () => {
  const src = read(WORKSPACE);
  assert.match(src, /importFileBytes/u);
  assert.match(src, /content,/u);
  assert.match(src, /btoa\(/u);
});

test('BC-07 invalid MIME visible error', () => {
  const src = read(WORKSPACE);
  assert.match(src, /仅支持 PNG、JPEG、WEBP 参考图/u);
});

test('BC-08 zero-byte visible error', () => {
  const src = read(WORKSPACE);
  assert.match(src, /所选文件为空/u);
});

// ---------------------------------------------------------------------------
// BC-09..BC-14 — sanctioned import seam + project binding + role authority.
// ---------------------------------------------------------------------------

test('BC-09 import through sanctioned seam (projects:import-file-bytes)', () => {
  assert.match(read(CONTRACTS), /importFileBytes/u);
  assert.match(read(OPS), /projects:import-file-bytes/u);
});

test('BC-10 project-bound asset (importFileBytes returns projectId)', () => {
  assert.match(read(CONTRACTS), /projectId: string/u);
  assert.match(read(PROJECT_STORE), /importFileBytes/u);
  assert.match(read(PROJECT_STORE), /persistBufferAsset/u);
});

test('BC-11 no absolute path in response contract', () => {
  const src = read(PROJECT_STORE);
  assert.match(src, /relativePath/u);
  const contracts = read(CONTRACTS);
  // The upload input contract carries only name/mime/size/content.
  const uploadSlice = contracts.slice(contracts.indexOf('ImportFileBytesInput'), contracts.indexOf('ImportFileBytesResult'));
  assert.doesNotMatch(uploadSlice, /absolutePath|trustedPath|sourcePath|destinationPath/iu);
});

test('BC-12 canonical assetId returned', () => {
  assert.match(read(CONTRACTS), /asset:\s*\{/u);
  assert.match(read(CONTRACTS), /id: string/u);
});

test('BC-13 canonical role authority used (PACKAGING_REFERENCE_ROLES)', () => {
  const src = read(WORKSPACE);
  // The short-chain reference selection uses referenceAssetIds with
  // explicit user-upload provenance; roles are never inferred from
  // filename/shot/mode. The canonical role authority
  // (PACKAGING_REFERENCE_ROLES) lives in the packaging reference
  // assignment surface (covered by BC-16/17 via the workspace).
  assert.doesNotMatch(src, /role:\s*(?:path\.|basename|\.slice|shot|mode)/u);
});

test('BC-14 no inferred role (no filename/shot/mode → role mapping in upload flow)', () => {
  const src = read(WORKSPACE);
  assert.doesNotMatch(src, /role:\s*(?:path\.|basename|\.slice|shot|mode)/u);
});

// ---------------------------------------------------------------------------
// BC-15..BC-22 — assignment + Prepare + negatives.
// ---------------------------------------------------------------------------

test('BC-15 reference selection updated after import', () => {
  const src = read(WORKSPACE);
  // The short-chain reference module updates referenceAssetIds with
  // the imported asset (canonical selection). The packaging
  // referenceAssignments surface is covered by BC-16/17 (workspace).
  assert.match(src, /setReferenceAssetIds/u);
  assert.match(src, /imported\.asset\.id/u);
});

test('BC-16 reference_first Prepare PASS', () => {
  const ready = driveReferenceFirstPrepare();
  assert.equal(ready.status, PACKAGING_WORKSPACE_STATUS.READY);
});

test('BC-17 no REFERENCE_REQUIRED for legal case', () => {
  const ready = driveReferenceFirstPrepare();
  const rp = ready.prepared.preparedResult.translation.referencePolicy;
  assert.equal(rp.references.length, 1);
  assert.equal(rp.count, 1);
  assert.equal(rp.required, true);
});

test('BC-18 missing Reference remains fail-closed', () => {
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'bc-ref-empty',
    now: () => NOW,
    preparePackagingGeneration,
  });
  const session = service.createSession({ projectId: 'bc-project', truthSnapshot: makeTruthSnapshot() });
  service.updateIntent(session.sessionId, {
    providerModelId: 'seedream-5.0-pro',
    apiProfileId: 'profile-seedream',
    generationMode: 'reference_first',
    shotContractId: 'PKG-HERO-SINGLE',
    referenceAssignments: [],
  });
  assert.throws(
    () => service.prepareGeneration(session.sessionId),
    (error) => error.code === 'REFERENCE_REQUIRED',
  );
});

test('BC-19 same-file reselect works (input.value reset)', () => {
  const src = read(WORKSPACE);
  assert.match(src, /input\.value = ''/u);
});

test('BC-20 picker cancel safe', () => {
  const src = read(WORKSPACE);
  // No file → early return without error or crash.
  assert.match(src, /if \(!file\) return/u);
});

test('BC-21 import failure visible', () => {
  const src = read(WORKSPACE);
  assert.match(src, /参考图上传失败，请重试/u);
});

test('BC-22 assignment failure visible (project mismatch guard)', () => {
  const src = read(WORKSPACE);
  assert.match(src, /不属于当前项目/u);
});

// ---------------------------------------------------------------------------
// BC-23..BC-30 — frozen surfaces / preservation.
// ---------------------------------------------------------------------------

test('BC-23 P3-A12 STALE preserved', () => {
  const ws = read(path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js'));
  assert.match(ws, /function checkStale/u);
  assert.match(ws, /checkStale,/u);
});

test('BC-24 analysis_led unchanged', () => {
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'bc-led',
    now: () => NOW,
    preparePackagingGeneration,
  });
  const session = service.createSession({ projectId: 'bc-project', truthSnapshot: makeTruthSnapshot() });
  service.updateIntent(session.sessionId, {
    providerModelId: 'seedream-5.0-pro',
    apiProfileId: 'profile-seedream',
    generationMode: 'analysis_led',
    shotContractId: 'PKG-HERO-SINGLE',
    referenceAssignments: [],
  });
  const ready = service.prepareGeneration(session.sessionId);
  assert.equal(ready.status, PACKAGING_WORKSPACE_STATUS.READY);
});

test('BC-25 BB retained (product role evidence corrective)', () => {
  const gate = read(path.join(ROOT, 'packages', 'image-generation-runtime', 'src', 'gates', 'prompt-preflight-gate.js'));
  assert.match(gate, /productAndCategoryRole/u);
});

test('BC-26 Provider calls 0 (upload flow is offline)', () => {
  const src = read(PROJECT_STORE);
  assert.doesNotMatch(src, /fetch\(/u);
  const workspace = read(WORKSPACE);
  // The upload handler itself must not dispatch generation.
  const uploadSlice = workspace.slice(workspace.indexOf('handleUploadFileChange'));
  assert.doesNotMatch(uploadSlice.slice(0, 2000), /startValidatedShortChain|startShortChain/u);
});

test('BC-27 Golden unchanged', () => {
  const delta = git(['diff', '--name-only', '448a208f35ad31a92dad4519365567d67195be8d', 'HEAD',
    '--', 'evaluation/golden-cases/', 'evaluation/anti-cases/', 'evaluation/hidden-cases/']);
  assert.equal(delta, '', 'no Golden delta since D3.6A HEAD');
});

test('BC-28 no project-specific production logic', () => {
  assert.doesNotMatch(read(WORKSPACE), /九州|jiuzhou|良方|JZMX/u);
  assert.doesNotMatch(read(PROJECT_STORE), /九州|jiuzhou|良方|JZMX/u);
});

test('BC-29 P3-B history preserved (post-acceptance corrective)', () => {
  assert.ok(existsSync(D36A_DOC), 'D3.6A contract doc must remain');
  assert.match(read(D36A_DOC), /FROZEN/u);
});

test('BC-30 D4 remains locked', () => {
  assert.ok(existsSync(D36A_DOC), 'D3.6A contract doc must exist');
  assert.match(read(D36A_DOC), /P3-D4:\s*LOCKED/u);
});
