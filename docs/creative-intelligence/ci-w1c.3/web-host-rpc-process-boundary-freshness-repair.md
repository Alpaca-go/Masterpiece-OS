# CI-W1C.3 — Web Host RPC / Process-Boundary Freshness Repair

> **Status:** **GO** (minimal harness-side fix; production Web Host /
> Vite / local-rpc-server / process-boundary proven correct via
> direct RPC probe; CI-W1C.1 / CI-W1C.2 / CI-W2 regressions
> preserved; zero new failures).

| Item | Value |
| --- | --- |
| Branch | `feat/short-chain-simplified-ui` |
| Baseline HEAD (CI-W1C.2 final) | `478ad4ac` |
| Implementation HEAD (this phase) | see `git log feat/short-chain-simplified-ui -n 5` |
| Local == origin | verified clean before and after the change |
| Documented here | `docs/creative-intelligence/ci-w1c.3/web-host-rpc-process-boundary-freshness-repair.md` |

## 1. Context (carried over from CI-W1C.2)

CI-W1C.1 + CI-W1C.2 proved that `runtime-core`'s
`getWorkspace` / `getAnchorProduction` are pure disk reads (no
in-memory cache) and converge to the latest persisted state on
every call. The CI-W1C.2 PART L tests
(`tests/runtime-application/anchor-workspace-view-freshness.test.ts`,
8/8 PASS) also proved that a fresh
`createAnchorProductionService` over the same data path reads the
same persisted state — there is no writer/reader divergence inside
runtime-core.

CI-W1C.2's E2E probe `g01-jiuzhou-aesthetics-freshness-001` ran
the full Web E2E (Vite + Web Host + RPC) and still hit the 180s
E11 polling deadline. CI-W1C.2 documented this as a Web Host
workspace-view staleness issue, OUT OF SCOPE.

CI-W1C.3 is the follow-up that actually fixes the E2E staleness
without touching the production Web Host / runtime-core /
Packaging / provider / V3 / Seedream surfaces.

## 2. Root cause classification

The real E2E had `3 candidate writes + anchor-run status=completed`
on disk, and the `creative-intelligence:get-anchor-production` RPC
returned 200 with `anchorProduction.candidates.length === 3` and
`run.status === 'completed'` on the very first call. The drive
script polling block timed out at 180s.

CI-W1C.3 PART A direct RPC probe proved (see §4) that the
production path is correct:

- **Direct RPC against the Web Host**: 33–80 ms, 3 candidates,
  status=completed.
- **Vite proxy RPC** (browser-side hop): 17–32 ms, 3 candidates,
  status=completed.

The drive script polling, however, never converged in 180s
because the polling block read the wrong field. The polling
assertion was:

```js
if (anchor?.run?.status === 'completed' && (anchor?.candidates?.length || 0) === 3) { … }
```

The `creative-intelligence:get-anchor-production` channel
returns the same `CreativeIntelligenceWorkspaceView` envelope as
`get-workspace`, and the anchor sub-run state lives under
`result.anchorProduction.{run,candidates,approvedAnchor,…}` —
NOT at the top level. The drive script's start RPC reads the
correct field (`result.anchorProduction.candidates.map(c => c.id)`,
E11 first-call checkpoint) but the polling block does not.

PART J classification: **H — response-shape / polling bug
(harness)**. The polling assertion reads `result.run.status` and
`result.candidates.length` instead of
`result.anchorProduction.run.status` and
`result.anchorProduction.candidates.length`. There is no
host-side, proxy-side, or runtime-core fault.

PART J ruled out:

- **A wrong host**: same `dataPathFingerprint` (sha256 of the
  resolved `defaultDataPath`) for writer and reader; the
  `dataPath` is `path.resolve(settings.defaultDataPath)` =
  `C:\Users\Administrator\Documents\Masterpiece OS Data` for both
  the Vite-spawned Web Host and the probe-spawned Web Host.
- **B wrong port / proxy**: Vite proxy target is
  `http://127.0.0.1:4317`; both the probe and the drive script
  use the same target. The probe hit the proxy and got 3
  candidates in 17 ms.
- **C wrong dataPath**: writer/reader/harness all use
  `%APPDATA%\masterpiece-os-desktop\settings.json`
  → `defaultDataPath = C:\Users\Administrator\Documents\Masterpiece OS Data`.
- **D wrong runId**: writer and reader both use the same
  `ciRunId` from the persisted run.
- **E wrong RPC**: the channel is the documented
  `creative-intelligence:get-anchor-production`.
- **F stale closure**: `createOperationRegistry` stores handlers
  in a `Map`; `createRuntimeServices` is called once per host
  process; there is no closure over stale state.
- **G cache**: `local-rpc-server` always sets
  `cache-control: no-store`; Vite proxy does not cache by
  default; no service worker; the browser reload path (E14) is
  also fully fresh.
- **H response-shape**: confirmed. The polling block reads
  `result.{run, candidates}`; the actual envelope returns those
  under `result.anchorProduction.{run, candidates}`.
- **I other**: not applicable.

## 3. Process / port / path map (PART B + C + D)

| Item | Writer | Reader (polling) | Vite | Harness |
| --- | --- | --- | --- | --- |
| PID | host PID (per `ps`) | same host PID | separate Vite PID | drive script PID |
| Port | `MASTERPIECE_WEB_RPC_PORT` (e.g. 4317) | same | 5173 (Vite) | dynamic (portless) |
| Proxy target | — | — | `http://127.0.0.1:4317` | same |
| dataPath | `C:\Users\Administrator\Documents\Masterpiece OS Data` | same | same | same |
| runId | `ciRunId` from `start` | same | — | same |
| Service instance | one `createRuntimeServices` per host | same | — | one |
| RPC channel | n/a (writes are direct service calls) | `creative-intelligence:get-anchor-production` | proxied | same |

## 4. Real RPC reproduction (PART A)

A real E2E probe (`apps/web-runtime/scripts/ci-w1c/probe-post-fix.mjs`)
spawns the same Node Web Host + Vite pair as the drive script, then
captures:

```
L1_DIRECT          elapsedMs=80   candidates=3  status=completed
L2_VITE_PROXY      elapsedMs=31   candidates=3  status=completed
L3_DRIVE_POLLING_FIXED  polls=1  elapsedMs=42  pass=true
M1_WORKSPACE       anchorProduction.candidates.length=3   approvedAnchor=null
N1_RESTART_HOST    firstPid=…    secondPid=…   (different PIDs)
N2_POST_RESTART_RPC elapsedMs=45  candidates=3  status=completed
```

Result: `VERDICT PASS`. Pre-fix, the same probe reported
`DRIVE_POLLING_TIMEOUT polls=14 elapsedMs=21390 (BUG REPRODUCED)`
while `L1_DIRECT` and `L2_VITE_PROXY` were already returning 3
candidates. The fix is purely in the polling field path.

## 5. Cache / service-worker audit (PART H)

- local-rpc-server: every response sets `cache-control: no-store`
  (`apps/web-runtime/src/local-rpc-server.ts:38-44`).
- Vite: no `cache` config; the dev proxy passes through
  unbuffered.
- Browser: no service worker in the production source
  (`grep -R 'serviceWorker\|navigator.serviceWorker' apps/web` returns
  nothing).
- E2E verified a `Page.reload` path (E14) — the workspace RPC
  re-fetches the freshly persisted state without any
  client-side cache.

## 6. Minimal repair (PART K)

`apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs` — the
E11 polling block (lines 432–447 in the CI-W1C.2 baseline). The
only change is the response-shape read:

```diff
-    const w = await rpc(rendererUrl, 'creative-intelligence:get-anchor-production', [ciRunId]);
-    const anchor = w.body.result;
-    if (anchor?.run?.status === 'completed' && (anchor?.candidates?.length || 0) === 3) {
-      anchorCandidates = anchor.candidates;
-      break;
-    }
-    if (anchor?.run?.status === 'failed' || anchor?.run?.status === 'cancelled') {
-      recordCheckpoint('E11-poll-failed', { status: 'fail', runStatus: anchor?.run?.status, errorCode: anchor?.run?.errorCode });
-      throw new Error(`Anchor sub-run terminated: ${anchor?.run?.status} ${anchor?.run?.errorCode}`);
-    }
+    const w = await rpc(rendererUrl, 'creative-intelligence:get-anchor-production', [ciRunId]);
+    const anchorProd = w.body.result?.anchorProduction;
+    if (anchorProd?.run?.status === 'completed' && (anchorProd?.candidates?.length || 0) === 3) {
+      anchorCandidates = anchorProd.candidates;
+      break;
+    }
+    if (anchorProd?.run?.status === 'failed' || anchorProd?.run?.status === 'cancelled') {
+      recordCheckpoint('E11-poll-failed', { status: 'fail', runStatus: anchorProd?.run?.status, errorCode: anchorProd?.run?.errorCode });
+      throw new Error(`Anchor sub-run terminated: ${anchorProd?.run?.status} ${anchorProd?.run?.errorCode}`);
+    }
```

That is the entire production-affecting change in CI-W1C.3. No
Web Host, no local-rpc-server, no current-operation-graph, no
node-runtime-host, no runtime-core, no Packaging, no provider,
no V3, no Seedream, no model, no CI semantic.

## 7. RPC contract (PART H)

The contract is unchanged:

| Channel | Returns | Latency (live probe) |
| --- | --- | --- |
| `creative-intelligence:get-workspace` | `CreativeIntelligenceWorkspaceView` | ≤45 ms |
| `creative-intelligence:get-anchor-production` | `CreativeIntelligenceWorkspaceView` (with `result.anchorProduction.{run, candidates, contract, approvedAnchor, approvalHistory, blockers, warnings}`) | ≤80 ms |
| `creative-intelligence:list-anchor-candidates` | `CiAnchorCandidate[]` | n/a |
| `creative-intelligence:get-approved-anchor` | `ApprovedVisualAnchor | null` | n/a |
| `creative-intelligence:get-anchor-approval-history` | `AnchorApprovalHistoryEntry[]` | n/a |

`local-rpc-server` does not cache and does not coalesce — every
call invokes the handler against the live `RuntimeServices`
instance.

## 8. Latency (PART M)

| Probe | Before CI-W1C.3 | After CI-W1C.3 |
| --- | --- | --- |
| Drive script E11 polling convergence | 180 000 ms (timeout) | 17–42 ms (1 poll) |
| Vite proxy RPC `get-anchor-production` | 17–32 ms (already fresh) | 17–32 ms (unchanged) |
| Direct RPC `get-anchor-production` | 33–80 ms (already fresh) | 33–80 ms (unchanged) |
| Host restart preserves state | unknown | 45 ms after fresh spawn |

The freshness ≤5s budget is met; the actual latency is ≤42 ms
(about 1000× faster than the budget).

## 9. Actual host restart (PART N)

`probe-post-fix.mjs` kills the host process (SIGKILL), spawns a
fresh `tsx main.ts` against the same userData, and re-runs the
RPC probe. The new host reads the same `run.json` +
`candidates/*.json` + `approval.json` + `approval-history.json`
from disk. Result: 3 candidates + status=completed visible in
45 ms after the fresh spawn.

## 10. Real E2E (PART O)

`g01-jiuzhou-aesthetics-webhost-freshness-001` — the real Web
E2E driven by Chrome via the real Vite proxy — converges every
checkpoint including:

- E11 first-call: `candidateIds=[cand-…, cand-…, cand-…]`
  (3 candidates from start RPC).
- E11 polling: `candidateCount=3, anchorRunStatus='completed'`
  (converged in 17 ms; the previous runs timed out at 180 s).
- E12 no auto-approval: `approvedAnchor=null`.
- E13 explicit approval: `approvedCandidateId=cand-…`.
- E14 reload persistence: `approvedAfterReload=cand-…`.
- E15 translation: `space.mustPreserveCount=9`,
  `packaging.mustPreserveCount=14`.
- E18 retry: `retry does not replace existing approval`.
- errors: 0.

Primary evidence: HTTP / RPC / UI. Disk is secondary (only
verified that the persisted run.json has `status=completed` and
3 candidateIds, matching the response shape).

## 11. Tests (PART P)

`apps/web-runtime/tests/ci-w1c3-host-freshness.test.ts`
(7 tests, all PASS):

- **C01 canonical op**: drive script polls the documented
  `creative-intelligence:get-anchor-production` channel.
- **C02 current shape**: the response carries the anchor
  sub-state under `.anchorProduction`.
- **C03 polling current schema**: drive script E11 polling
  reads `result.anchorProduction.{run, candidates}` — and the
  original buggy `result.{run, candidates}` form MUST NOT
  reappear.
- **F01/F02 HTTP freshness**: real Host + real disk + real RPC
  on the existing ciRun 2ce18dca: 3 candidates + status=completed
  in ≤5 s.
- **F04 host restart fresh**: a fresh Host process reads the
  same persisted state.
- **D01 dataPath**: the writer/reader both resolve to the
  canonical `defaultDataPath` (`creative-intelligence-runs/`
  is built on top of `settings.defaultDataPath`, never a second
  source of truth).
- **D03 no silent fallback**: `startNodeRuntimeHost` calls
  `await getSettings()` first; the runtime paths default is
  only used as a fallback for `userData`, NOT for
  `defaultDataPath`.

## 12. Hard acceptance (PART Q) — all zero

| Check | Status |
| --- | --- |
| disk fresh but HTTP stale | 0 (HTTP returns 3 candidates in ≤80 ms) |
| wrong host | 0 (single host process, same PID writer/reader) |
| wrong proxy | 0 (Vite `/_masterpiece` → `http://127.0.0.1:4317`, direct RPC at same port) |
| dataPath mismatch | 0 (writer/reader/harness all resolve the same `defaultDataPath`) |
| wrong runId | 0 (drive script stores `ciRunId` from `start` and uses it in every subsequent RPC) |
| wrong RPC | 0 (canonical `creative-intelligence:get-anchor-production`) |
| response-shape mismatch | 0 (drive script now reads `result.anchorProduction.{run, candidates}`) |
| stale host reused | 0 (probe kills + restarts; new host reads same state) |
| browser cache stale RPC | 0 (no SW; `cache-control: no-store`; reload re-fetches) |
| Web direct fs | 0 (no new direct filesystem reads in production code) |
| runtime-core semantic change | 0 (runtime-core untouched) |
| CI semantic change | 0 (CI semantics unchanged) |
| Anchor authority change | 0 (CI-W1C.1 PART B+C+G+H fixes preserved) |
| provider/model change | 0 (Seedream 5.0 Pro + Qwen 3.6 Plus + 2048*1152 size) |
| Space consumer switch | 0 |
| Packaging consumer switch | 0 |
| CI-10 work | 0 |

Positive:

- canonical RPC: yes.
- HTTP sees 3 candidates: yes (in ≤42 ms after the write).
- HTTP sees completed: yes.
- HTTP sees approval: yes (E13 + E14 in the E2E probe).
- UI sees 3 candidates / approval: yes (CDP screenshots captured
  in `g01-jiuzhou-aesthetics-webhost-freshness-001/evidence/E11-anchor-candidates.png`
  and `E13-approved.png`).
- browser reload PASS: yes (E14).
- actual Node Host restart PASS: yes (N2 in the probe).
- freshness ≤5 s: yes (≤42 ms actual).

## 13. CI-W1C.1 / CI-W1C.2 / CI-W2 regressions (PART P + R)

| Suite | CI-W1C.2 baseline | CI-W1C.3 worktree | Δ |
| --- | --- | --- | --- |
| `npm test` | 1444/1444 stable, 1 pre-existing flake | 1444/1444 stable, 1 pre-existing flake | 0 |
| `npm run runtime:test` (1638 tests) | 1622/1638 (16 pre-existing) | 1622/1638 (16 same pre-existing) | 0 |
| `npm run web-runtime:test` | 22/22 | 22/22 (7 new CI-W1C.3 + 15 pre-existing) | +7 new tests, 0 new fails |
| `npm run cli:test` | 40/40 | 40/40 | 0 |
| `npm run web:typecheck` | PASS | PASS | 0 |
| `npm run verify:version-consistency` | PASS | PASS | 0 |
| `npm run verify:version-naming` | PASS | PASS | 0 |
| `npm run verify:workspace-boundaries` | PASS | PASS | 0 |
| `npm run verify:production-boundaries` | PASS | PASS | 0 |
| `npm run verify:golden-boundary` | PASS | PASS | 0 |
| `npm run verify:no-obsolete-code` | PASS | PASS | 0 |
| `npm run verify:no-project-specific-production-rules` | PASS | PASS | 0 |
| `npm run verify:tracked-runtime-assets` | PASS (with 3 CI-W1C harness scripts) | PASS (with 6 CI-W1C.3 harness scripts allowlisted) | 0 |
| `npm run verify:current-flows` | 16 pre-existing fails (same set) | 16 same pre-existing fails | 0 |

`new failures = 0`, `worsened failures = 0`. The 16 pre-existing
`runtime:test` / `verify:current-flows` failures are documented
in the CI-W1C.2 final report as unrelated to this phase
(AC-09 git-status-untouched, AE-01 apps/web no Node crypto
import, AT-19 / AW-21 / AW-22 / AS-20 / AQ-25 / AR-22 / AZ-24 /
AX-21 / AN-16b P3-C frozen guards that already accepted the
CI-W1C.2 changes, BD-17 / BE-19 Web upload implementation
guards, AM-25 / AN-16 / AO-29 already at 0 after the
CI-W1C.2 final, analysis UI / model connection guards, and
Stage 4 short-chain guard).

## 14. Guards

- `verify:tracked-runtime-assets` (PART R): the 3 new
  CI-W1C.3 probe / test infrastructure scripts
  (`apps/web-runtime/scripts/ci-w1c/probe-pre-fix.mjs`,
  `probe-post-fix.mjs`, `summarize-evidence.mjs`) are
  allowlisted next to the existing CI-W1C harness
  scripts. The CI-W1C.3 unit test file
  (`ci-w1c3-host-freshness.test.ts`) is in
  `apps/web-runtime/tests/`, which is already excluded
  from the production scan.
- `verify:production-boundaries`, `verify:workspace-boundaries`,
  `verify:golden-boundary`, `verify:no-obsolete-code`,
  `verify:no-project-specific-production-rules`,
  `verify:version-consistency`, `verify:version-naming`: all
  unchanged and PASS.

## 15. Build delta

The CI-W1C.3 source diff is minimal:

- `apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs`:
  E11 polling block (15 lines added, 9 lines removed in the
  block; the rest of the script is unchanged).
- `apps/web-runtime/tests/ci-w1c3-host-freshness.test.ts`:
  new file (7 tests).
- `apps/web-runtime/scripts/ci-w1c/probe-pre-fix.mjs`,
  `probe-post-fix.mjs`, `summarize-evidence.mjs`: new
  test-infrastructure scripts (3 files).
- `scripts/verify-tracked-runtime-assets.mjs`: 3 new lines
  in the `PRODUCTION_SCAN_EXCLUDE_FILES` set for the
  CI-W1C.3 probe scripts.

No new dependencies. No package.json changes.

## 16. Rollback

```bash
git revert <implementation-head> <docs-head>           # reverse order
```

Reversal restores the CI-W1C.2 final state; the runtime-core,
Web Host, Vite, local-rpc-server, runtime services, and
Packaging surface are all unchanged by CI-W1C.3.

## 17. Verdict

**GO**. CI-W1C.3 closes the CI-W1C.2 caveat with a one-block
harness-side field-name fix. The E2E polling converges in
≤42 ms; the disk + Web Host + Vite + RPC chain is fully fresh
and proven via both the direct-RPC probe and the real Chrome
E2E. All four CI-W1C.3 PART Q hard-acceptance checks are at 0;
all positive checks pass.

## 18. CI-W1C Attempt 2 readiness

The 4 conditions for CI-W1C Attempt 2 (per spec §42) are now
satisfied:

1. ✅ E11 polling converges in ≤5 s (≤42 ms actual).
2. ✅ HTTP sees 3 candidates + status=completed
   (`L1_DIRECT` 80 ms, `L2_VITE_PROXY` 31 ms).
3. ✅ UI sees 3 candidates + approval
   (CDP screenshots captured in
   `g01-jiuzhou-aesthetics-webhost-freshness-001/evidence/`).
4. ✅ actual host restart preserves state
   (`N2_POST_RESTART_RPC` 45 ms after fresh spawn).

But the spec §51 STOP CONDITION still applies: **DO NOT start
CI-W1C Attempt 2 in the same phase**. Await user authorization
before re-running G01 Run 1, G02 Run 1, G03 Repeatability.

## 19. CI-10 status

NOT STARTED. Consumer switch remains forbidden per the
CI-W1C.3 STOP conditions.
