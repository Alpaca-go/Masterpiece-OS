// P3-D1 / AN — deterministic cross-project hardening contract guards.
//
// These guards consume repository sources and the committed audit record only.
// They intentionally never read machine-local projects, credentials, ignored
// artifacts, or Provider output.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getPackagingShotContract } from '@masterpiece/image-generation-runtime/packaging/contracts.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A = '1fcafc810a7e218a7cf50dd675d914cd396304b2';
const P3B = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const P3C = '3da7a14424074b85d5fd3a735d006749cd5f03a9';
const AUDIT = readFileSync(path.join(ROOT, 'docs/packaging/history/p3-d/p3-d1-cross-project-hardening-audit.md'), 'utf8');
const SELECTOR = readFileSync(path.join(ROOT, 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts'), 'utf8');
const OPERATIONS = readFileSync(path.join(ROOT, 'packages/runtime-core/src/operations/packaging-operations.js'), 'utf8');

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function hasAll(source: string, patterns: RegExp[]): void {
  for (const pattern of patterns) assert.match(source, pattern);
}

test('AN-01 corpus distinguishes real audit evidence from sanctioned synthetic validation', () => {
  hasAll(AUDIT, [/Real Project count: \*\*3\*\*/u, /End-to-end Packaging-ready real project count: \*\*0\*\*/u, /Sanctioned synthetic validation corpus/u, /not called real projects/u]);
});

test('AN-02 project-specific production rules remain prohibited', () => {
  execFileSync(process.execPath, ['scripts/verify-no-project-specific-production-rules.mjs'], { cwd: ROOT, stdio: 'pipe' });
});

test('AN-03 canonical project truth selection validates every project binding', () => {
  hasAll(SELECTOR, [/assertProjectBinding\(context\.projectId, projectId/u, /validateSource\(source, mode, projectId\)/u, /PACKAGING_CONTEXT_PROJECT_MISMATCH/u]);
});

test('AN-04 active Reference authority is project, run, and fingerprint bound', () => {
  hasAll(SELECTOR, [/assertProjectBinding\(active\.projectId, projectId/u, /source\.producerRunId !== active\.runId/u, /source\.sourceFingerprint !== active\.sourceFingerprint/u]);
});

test('AN-05 run, artifact, and preview resolution remains project-bound', () => {
  hasAll(OPERATIONS, [/createRunStore\(dataPath, projectId\)/u, /canonicalReadRun\(\{ projectId, runId \}\)/u, /runRootForProject\(projectId, runId\)/u, /runId does not match the session execution/u]);
});

test('AN-06 matrix includes all three canonical Shot Contracts and exact ratios', () => {
  const expected = new Map([['PKG-HERO-SINGLE', '4:5'], ['PKG-SERIES-GROUP', '16:9'], ['PKG-GIFT-OPEN', '4:3']]);
  for (const [id, ratio] of expected) {
    assert.equal(getPackagingShotContract(id).aspectRatio, ratio);
    assert.match(AUDIT, new RegExp('`' + id + '`[\\s\\S]{0,80}`' + ratio + '`', 'u'));
  }
});

test('AN-07 both modes are required and reference-first remains independent', () => {
  hasAll(AUDIT, [/analysis-led/u, /reference-first/u, /Reference-first must work with the analysis slot absent/u, /no analysis fallback/u]);
});

test('AN-08 Locked Assets matrix covers complete, partial, missing, and conflicts', () => {
  hasAll(AUDIT, [/complete Locked Assets/u, /partial but valid/u, /missing required locked truth/u, /upstream visual conflicts/u, /Reference conflicts/u]);
});

test('AN-09 visual-quality rubric is defined without fabricated D1 scores', () => {
  hasAll(AUDIT, [/Score only real generated images/u, /Brand fidelity/u, /Artifact usability/u, /D1 assigns \*\*no scores\*\*/u]);
  assert.doesNotMatch(AUDIT, /(?:8|9)\s*\/\s*10/u);
});

test('AN-10 real Provider policy is explicit, bounded, and unauthorized in D1', () => {
  hasAll(AUDIT, [/REAL PROVIDER VALIDATION: NOT YET AUTHORIZED/u, /Maximum 5 calls\/images/u, /zero random retries/u, /D-PROVIDER-01/u]);
});

test('AN-11 Golden regression evidence is not used as real-project visual-quality evidence', () => {
  hasAll(AUDIT, [/local executor cannot score quality/iu, /Synthetic cases[\s\S]*cannot supply visual-quality evidence/u, /Golden remains unchanged/u]);
});

test('AN-12 hardening and new-feature scope are explicitly separated', () => {
  hasAll(AUDIT, [/BUG \/ HARDENING/u, /NEW FEATURE \/ DEFERRED/u, /custom aspect ratio/u, /automatic Reference assignment/u, /History UI/u]);
});

test('AN-13 P2 frozen production diff remains zero', () => assert.equal(git(['diff', '--name-only', P2, 'HEAD', '--', 'packages/image-generation-runtime/src/packaging']), ''));
test('AN-14 P3-A12 current baseline direct frozen diff is zero (no exclusion)', () => assert.equal(
  git(['diff', '--name-only', P3A, 'HEAD',
    '--', 'packages/runtime-core/src/application/packaging']),
  '',
));
test('AN-15 P3-B accepted UI and Workspace semantic diff remains zero (P3-A12 absorbed)', () => assert.equal(
  git(['diff', '--name-only', P3B, 'HEAD',
    '--', 'apps/web/src/features/packaging']),
  '',
));
// P3-C4.2 — Provider Model Identity Separation Corrective.
// C4.2 narrowed AN-16 to the original P3-C frozen surface
// (the path diff between P3C integration and the C4.2
// corrective baseline must equal the C4.1 composition-root
// seam). The C4.2 surface change is verified separately by
// AN-16b / AS-09..AS-20 against the C4.2 corrective
// commit. The C4.2 corrective is itself a new authorized
// P3-C surface change; it does NOT relax the P3-C frozen
// surface between P3C integration and C4.2.
const C4_2_CORRECTIVE = '4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551';

test('AN-16 P3-C frozen integration permits only the authorized C4.1 + C4.2.1 documented sub-tree', () => assert.equal(
  git(['diff', '--name-only', P3C, '--', 'apps/web/src/features/packaging', 'apps/web-runtime/src', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts', 'packages/runtime-core/src/application/packaging', 'packages/image-generation-runtime/src/packaging']).split('\n').filter(Boolean).sort().join('\n'),
  [
    'apps/web-runtime/src/current-operation-graph.ts',
    'apps/web-runtime/src/local-rpc-server.ts', // P3-D3.6B authorized: channel-aware upload body cap
    'packages/runtime-core/src/application/packaging/workspace-service.js',
  ].sort().join('\n'),
));

test('AN-16b P3-C4.2.1 corrective permits only the documented ops-layer sub-tree', () => {
  // The C4.2.1 corrective re-freezes the P3-C surface on
  // top of C4.1 + C4.2. The documented allowed set is:
  //   - packages/runtime-core/src/operations/packaging-operations.js
  //     (C4.2 identity split retained + C4.2.1
  //     execution preflight mismatch throw + STALE-first
  //     ordering at the execute-generation boundary)
  //   - packages/runtime-core/src/application/packaging/workspace-service.js
  //     (C4.2.1 adds a read-only `checkStale` helper;
  //     the C4.2 identity-mismatch block was reverted
  //     in C4.2.1 because the P3-A STALE surface is
  //     frozen.)
  // Everything else in the P3-C surface must remain
  // unchanged from the C4.2.1 corrective baseline.
  const C4_2_1_CORRECTIVE = 'b6730c3ca78289a72ec624c475d3945e08d4b5ca';
  const diff = git([
    'diff', '--name-only', C4_2_1_CORRECTIVE, 'HEAD',
    '--', 'apps/web/src/features/packaging', 'apps/web-runtime/src', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts', 'packages/runtime-core/src/application/packaging', 'packages/runtime-core/src/operations/packaging-operations.js', 'packages/image-generation-runtime/src/packaging',
  ]).split('\n').filter(Boolean).sort().join('\n');
  const expected = [
    // P3-D3.6B (authorized post-acceptance corrective): channel-aware
    // upload body cap in the Web Runtime RPC server.
    'apps/web-runtime/src/local-rpc-server.ts',
    'packages/runtime-core/src/application/packaging/workspace-service.js',
    'packages/runtime-core/src/operations/packaging-operations.js',
  ].sort().join('\n');
  assert.equal(diff, expected);
});
