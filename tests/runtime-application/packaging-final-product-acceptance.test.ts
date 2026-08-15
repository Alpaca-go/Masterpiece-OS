// P3-C4 / AM — final cross-workflow product acceptance consolidation.
//
// AM intentionally consumes the already-accepted C1-C3 evidence and frozen
// production surfaces. It adds no runtime authority and performs no Provider
// call. The real dual-mode operations remain exercised by AL in the same
// runtime-application suite; Renderer observations are recorded in the C4
// acceptance report after browser-driven QA against the real Node Host.

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
const C2 = '456ec3a9d0273b599ed15bcd424fde1f36b8ce1b';

const AL = readFileSync(path.join(ROOT, 'tests/runtime-application/packaging-dual-mode-production-acceptance.test.ts'), 'utf8');
const SELECTOR = readFileSync(path.join(ROOT, 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts'), 'utf8');
const WORKSPACE = readFileSync(path.join(ROOT, 'packages/runtime-core/src/application/packaging/workspace-service.js'), 'utf8');
const GRAPH = readFileSync(path.join(ROOT, 'apps/web-runtime/src/current-operation-graph.ts'), 'utf8');
const UI = readFileSync(path.join(ROOT, 'apps/web/src/features/packaging/PackagingWorkspace.tsx'), 'utf8');
const CSS = readFileSync(path.join(ROOT, 'apps/web/src/features/packaging/PackagingWorkspace.module.css'), 'utf8');

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function containsAll(source: string, patterns: RegExp[]): void {
  for (const pattern of patterns) assert.match(source, pattern);
}

test('AM-01 analysis-led product journey is covered through READY, EXECUTING, EXECUTED, run, and preview', () => {
  containsAll(AL, [/AL-01 analysis_led Prepare reaches READY/u, /AL-02 analysis_led Execute reaches EXECUTED/u, /AL-03 analysis_led canonical run/u, /AL-04 analysis_led preview/u]);
});

test('AM-02 reference-first product journey is independently covered', () => {
  containsAll(AL, [/AL-05 reference_first independently reaches READY/u, /AL-06 reference_first independently reaches EXECUTED/u, /AL-07 reference_first canonical run/u, /AL-08 reference_first preview/u]);
});

test('AM-03 both canonical translation slots coexist', () => assert.match(AL, /AL-09 both producers coexist/u));
test('AM-04 generationMode is the sole exact source selector', () => {
  assert.match(SELECTOR, /mode === 'analysis_led'[\s\S]*packagingTranslations\.analysisLed[\s\S]*packagingTranslations\.referenceFirst/u);
  assert.doesNotMatch(SELECTOR, /fallback|fall back/iu);
});
test('AM-05 active source update invalidates old truth', () => assert.match(AL, /AL-12 active Reference source A to B causes truth STALE/u));
test('AM-06 revoked active source fails closed', () => assert.match(AL, /AL-17 revoked active Reference source fails closed/u));
test('AM-07 project isolation is enforced', () => assert.match(AL, /AL-18 cross-project active Reference source is rejected/u));
test('AM-08 Locked Assets remain invariant across modes', () => assert.match(AL, /AL-23 Locked Assets are identical across modes/u));
test('AM-09 all P2 Shot Contract geometries remain canonical', () => {
  assert.deepEqual(['PKG-HERO-SINGLE', 'PKG-SERIES-GROUP', 'PKG-GIFT-OPEN'].map((id) => getPackagingShotContract(id).aspectRatio), ['4:5', '16:9', '4:3']);
});
test('AM-10 Reference assignment remains explicit and separate from active-source authority', () => assert.match(AL, /AL-25 active Reference source is not auto-inserted/u));
test('AM-11 no silent mode fallback exists', () => assert.match(AL, /AL-19 selector performs no analysis\/reference fallback/u));
test('AM-12 no latest-run discovery exists', () => {
  assert.match(AL, /AL-20 selector performs no latest-run discovery/u);
  assert.doesNotMatch(SELECTOR, /listRuns|readdir|latest|sort\s*\(.*(?:time|run)/iu);
});
test('AM-13 Packaging context selection performs no runtime reasoning or model call', () => {
  assert.doesNotMatch(SELECTOR + GRAPH, /analyzeReferenceStyle|responses\.create|chat\.completions|reasoner|anchorGoal/iu);
});
test('AM-14 no second Packaging context store was introduced', () => assert.doesNotMatch(git(['diff', '--name-only', C2, 'HEAD']), /packaging.*(?:store|database|cache)|selected-context/iu));
test('AM-15 P3-A stale tracker remains the sole stale authority', () => {
  assert.match(WORKSPACE, /computeStale/u);
  assert.match(AL, /AL-31 same-semantic Reference rerun does not create false STALE/u);
});
test('AM-16 canonical run store remains the only result registration path', () => containsAll(AL, [/AL-26 canonical run-store authority/u, /createRunStore/u]));
test('AM-17 artifact preview remains data-URL based and path-safe', () => containsAll(AL, [/AL-04 analysis_led preview/u, /AL-27 preview security/u]));
test('AM-18 safe failure UX exposes stale blockers and an alert surface', () => containsAll(UI, [/role="alert"/u, /staleReasons/u, /需要重新准备/u]));
test('AM-19 Renderer desktop composition retains the production tiles and Result Gallery', () => containsAll(UI, [/ReferenceAssignmentsTile/u, /GenerationIntentTile/u, /LockedAssetsTile/u, /ReadinessStaleTile/u, /ResultTile/u]));
test('AM-20 Renderer mobile contract contains bounded tablet and handset breakpoints', () => containsAll(CSS, [/@media\s*\(max-width:\s*1023px\)/u, /@media\s*\(max-width:\s*767px\)/u, /@media\s*\(max-width:\s*420px\)/u]));
test('AM-21 Renderer accessibility contract retains dialog, live status, labels, and keyboard handling', () => containsAll(UI, [/aria-live="polite"/u, /role="dialog"/u, /aria-modal="true"/u, /aria-label=/u, /event\.key === 'Escape'/u]));
test('AM-22 P2 frozen production diff is zero', () => assert.equal(git(['diff', '--name-only', P2, 'HEAD', '--', 'packages/image-generation-runtime/src/packaging']), ''));
test('AM-23 P3-A frozen production diff is zero', () => assert.equal(git(['diff', '--name-only', P3A, 'HEAD', '--', 'packages/runtime-core/src/application/packaging',
    ]), ''));
test('AM-24 P3-B accepted production semantics diff is zero', () => assert.equal(git(['diff', '--name-only', P3B, 'HEAD', '--', 'apps/web/src/features/packaging',
    ]), ''));
test('AM-25 P3-C production baseline permits only the authorized C4.1 + C4.2.1 + P3-A12 chain (HISTORICAL EVIDENCE)', () => {
  // C2 (`456ec3a`) to HEAD. The documented sub-tree is
  // the C4.1 composition-root seam plus the C4.2.1 + P3-A12
  // workspace-service.js change. P3-D3.6B (authorized
  // post-acceptance corrective) adds local-rpc-server.ts
  // (channel-aware upload body cap). No other P3-C surface
  // changes are permitted.
  const expected = [
    'apps/web-runtime/src/current-operation-graph.ts',
    'apps/web-runtime/src/local-rpc-server.ts',
    'packages/runtime-core/src/application/packaging/workspace-service.js',
  ].sort().join('\n');
  assert.equal(
    git(['diff', '--name-only', C2, '--', 'apps/web/src/features/packaging', 'apps/web-runtime/src', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts', 'packages/runtime-core/src/application/packaging', 'packages/image-generation-runtime/src/packaging']).split('\n').filter(Boolean).sort().join('\n'),
    expected,
  );
});
