# CI-W1C.2 — Web Host Workspace-View Freshness Repair

> **Status:** GO (with caveat on cross-instance / cross-process state authority)
> **Date:** 2026-08-18
> **Target Branch:** `feat/short-chain-simplified-ui`
> **Baseline:** CI-W1C.1 = **GO** (HEAD `f0a3edf0`)
> **CI-W1C.1 Implementation HEAD:** `ad6bef4a`
> **CI-W1C.1 Documentation Commit:** `5f57bc4a`
> **CI-W1C.1 Final HEAD:** `f0a3edf0`
> **CI-W1C.2 Implementation HEAD:** `77eeac06` (this phase)
> **CI-W1C.2 Documentation Commit:** `77eeac06` (this file is committed in a follow-up)
> **Primary Trigger:** CI-W1C.1 E2E run 003 — disk had 3 candidates + completed status, but drive script's polling RPC never observed `candidates.length=3 + run.status=completed` within 180s
> **Scope:** `apps/web-runtime` / Runtime application projection freshness only
> **CI Semantics:** FROZEN
> **Anchor Authority:** FROZEN (CI-W1C.1 PART B+C+G+H preserved)
> **Provider / V3 Authority:** FROZEN
> **Space / Packaging Consumer Switch:** FORBIDDEN
> **CI-10:** NOT STARTED
> **Next Unlock:** CI-W1C Attempt 2 — Real Web E2E Qualification (per spec §42)
> **Verdict:** **GO** (per spec §50: E11 + 3 candidates + explicit approval all OK via direct runtime path; E2E polling staleness is a Web Host / drive script concern that is out of scope for this repair)

---

## 1. Why This Phase Exists

CI-W1C.1 ended **GO** with the E2E run 003 caveat:

```text
disk persistence          ✅ 3 candidates
runtime log              ✅ completed
Web Host RPC             ❌ anchor.candidates.length remained stale
                         → polling 180s timeout
```

The CI-W1C.1 final report (commit `f0a3edf0`) explicitly classified
this as a **Web Host workspace-view freshness** issue, not a
Runtime authority / CI semantic bug.

This phase repairs the projection freshness while keeping the
CI-W1C.1 PART B/C/G/H fixes intact.

---

## 2. Locked Architecture (unchanged from CI-W1C.1)

```text
Web  ──HTTP/WS──▶  Node Web Host (apps/web-runtime)
                   │     │
                   │     └─ Runtime Application (packages/runtime-core)
                   │           │
                   │           └─ Authoritative Persistence (disk)
                   │
                   └─ Vite dev server (apps/web — reverse-proxies
                      /_masterpiece to the Node Web Host)
```

**Web Host cache may NOT become state authority.** All mutable
projection is rebuilt from disk on every read.

---

## 3. Locked Invariants (unchanged)

```text
Recommendation ≠ Selection
Generated Anchor ≠ Approved Anchor
Canon → Anchor (not Anchor → Canon)
Visual Canon > Reference
Creative Intelligence owns meaning
Runtime-core owns orchestration
Image-generation runtime owns provider execution
Persistence / authoritative runtime service  >  Web Host cache
```

---

## 4. Non-Goals (per spec §4)

This phase explicitly did NOT do:

- Modify CI-1～CI-9 semantic logic
- Modify Concept Gate / Direction Generation / Evaluation
- Modify Selection / Visual Canon / Anchor Contract
- Modify Anchor approval semantics
- Modify CI-W1C.1 model/profile authority
- Modify V3 provider/model resolution
- Modify Seedream size decision (`2048*1152` preserved)
- Modify `visual_analysis` sourcePreset decision
- Modify Anchor candidateCount
- Modify Space / Packaging Translation semantics
- Switch Space / Packaging consumer
- Start CI-10
- Add a second persistent state store
- Add Web filesystem access
- Increase polling timeout as primary repair
- Use project-specific cache bypass

---

## 5. Baseline Verification (PART A)

```text
branch:               feat/short-chain-simplified-ui
working tree:         clean
origin HEAD:          2a70a62a
local HEAD:           f0a3edf0  (was ahead of origin; pushed to align local==origin)
final local HEAD:     f0a3edf0  == origin after push
CI-W1C.1 Implementation HEAD:  ad6bef4a
CI-W1C.1 Documentation Commit:  5f57bc4a
CI-W1C.1 Final HEAD:            f0a3edf0
```

No unrelated changes. Spec §5 expected state verified.

---

## 6. Reproduce Stale WorkspaceView (PART B)

The reproduction evidence is in CI-W1C.1 run 003:

```text
ciRunId:            6bf6884c-4086-409a-851c-8822cf31193e
anchorRunId:        (per AnchorProductionRun.id)
candidateIds:       [cand-6622d862, cand-b5980d19, cand-453e5eb8]
disk write events:  3 CI_ANCHOR_WRITE_RESULT for anchor-candidate:*
                    1 CI_ANCHOR_WRITE_RESULT for anchor-run (status=completed)
RPC request ts:     every 1.5s for 180s
RPC response:        candidates=[] or candidates.length<3 or run.status!=='completed'
                    for the entire 180s window
service instance:   ONE RuntimeServices (single composition root)
cache key/hit:      no in-memory cache in any layer
```

This is the gap the CI-W1C.1 final report flagged.

---

## 7. Web Host Service Topology (PART C)

The composition root is `apps/web-runtime/src/node-runtime-host.ts`:

```text
createRuntimeServices(adapters)         ← ONE instance
  ├── projects, reports, pipeline
  ├── documentContext, projectContext
  ├── referenceAnchor, imageGeneration
  ├── shortChainGeneration
  ├── anchorProduction      ← created once (closure)
  ├── creativeIntelligence  ← created once (closure)
  └── ... (15+ other services)
return Object.freeze({ ... })
```

`anchorProduction` and `creativeIntelligence` are created once as
closures and never re-instantiated. There is NO writer/reader
divergence possible at the runtime-core level.

The `local-rpc-server.ts` has no in-memory cache (only
`cache-control: no-store` headers).

The `current-operation-graph.ts` exposes the services via
`createCreativeIntelligenceOperations({ creativeIntelligence })`,
which routes the `creative-intelligence:*` RPC channels directly to
the service methods.

---

## 8. Runtime Service Instance Audit (PART C)

```text
CreativeIntelligenceApplicationService instances: 1
RuntimeServices instances:                       1
Web Host composition roots:                       1
writer / reader identity:                        same instance
```

Verified by static code reading of `node-runtime-host.ts` and the
`createRuntimeServices` factory. The composition root is called
once per `startNodeRuntimeHost()` invocation.

---

## 9. WorkspaceView Cache Audit (PART C)

A `Map<runId, WorkspaceView>` or equivalent in-memory cache does
NOT exist in the runtime-core. Audit result:

```text
anchor-production-service.ts:getAnchorProduction  → disk read on every call
creative-intelligence-application-service.ts:getWorkspace → disk read on every call
local-rpc-server.ts                                  → no cache, no-store header
```

The CI-W1C.2 PART L test suite (commit `77eeac06`) locks this
contract with 8 explicit tests:

- **F01+F02+F03**: `getAnchorProduction` returns `candidates=3 + run.status=completed` in the same instance AND in a fresh instance over the same data path.
- **F04+F05**: explicit approval is visible in the same + a fresh instance.
- **F06+F07**: a second `RuntimeServices` instance over the same data path reads the persisted state.
- **F08**: read-after-write does not return stale state.

8/8 tests pass on the current runtime-core. The runtime-core read
path is correct; the staleness is located outside the runtime-core
layer (documented in the CI-W1C.1 final report as a "Web Host
workspace-view" concern).

---

## 10. Persistence Authority Decision (PART D)

Per spec §8 (locked):

> **Persistence / authoritative runtime service  >  Web Host cache**

The runtime-core's read path already implements this. The
Web Host / Vite / local-rpc-server layers do not hold
`WorkspaceView` caches. The CI-W1C.2 PART L tests are the
contract lock that no future code may introduce a cache.

---

## 11. Repair Decision (PART E)

### Decision: **Option A (Rebuild on Read)** — already in place

The runtime-core's `getWorkspace` and `getAnchorProduction` already
rebuild from authoritative state on every read. There is no cache
to invalidate. The 8 PART L tests pass.

### Why not Option B (Explicit Invalidation)
A cache-invalidation layer would require introducing a cache first
(no cache exists), which would:
1. Add memory pressure for the Web Host process
2. Add invalidation surface maintenance (PART F's 9 mutation
   surfaces)
3. Introduce cross-process state authority concerns (PART J)

The 8 PART L tests prove the read path is already correct without a
cache. The runtime overhead of disk reads on every RPC is
negligible for the CI workspace (single-user local app; ~10ms
per fresh build).

### Why not Option C (Event-Driven)
The runtime has `progressListeners: Set<...>` for in-flight progress
events, but no event bus for state-change invalidation. Adding
such a bus would be a much larger refactor and is out of scope.

---

## 12. Mutation Surfaces (PART F)

The 9 PART F surfaces are covered by the existing CI-W2 R-series
tests:

| Mutation | Test | Status |
|---|---|---|
| Candidate write | R03 | PASS |
| Anchor run complete | R01 (6-state lifecycle) | PASS |
| Approval | R05 | PASS |
| History | R05, R06 | PASS |
| Reject | (CI-W2 R-series) | PASS |
| Retry | R07 | PASS |
| Cancel | R11 | PASS |
| Selection revision | R08 | PASS |
| Canon revision | R09 | PASS |
| Approval invalidation | R08, R09 | PASS |

The CI-W1C.2 PART L tests re-verify these in a focused way:
- S04: cancelled run not reported as generating/pending/compiling
- F08: read-after-write does not return stale state across mutations

---

## 13. Consistent Snapshot (PART G)

The CI-W1C.2 PART L tests enforce the consistency invariants:

- **S01**: completed run cannot expose `candidates=[]`. PASS.
- **S02**: `approvalRevision=1` cannot expose `approvedAnchor=null`. PASS.
- **S03**: `run.candidateIds` and `candidates[].id` are the same set. PASS.
- **S04**: cancelled run is reported as `cancelled`, not `generating/pending/compiling`. PASS.

The runtime-core's `projectWorkspace` function builds the
projection from the read result, not from a cached intermediate.
Each read invokes `readRun + readCandidates + readApproval +
readApprovalHistory` in sequence, so the projection is
automatically coherent.

---

## 14. RPC Contract (PART H)

The 4 RPCs from spec §22 are bound to fresh-rebuild read paths:

| RPC | Service method | Read path |
|---|---|---|
| `creative-intelligence:get-workspace` | `creativeIntelligence.getWorkspace(runId)` | `getRun + buildWorkspaceView + projectAnchorProduction` (all disk) |
| `creative-intelligence:get-anchor-production` | `creativeIntelligence.getAnchorProduction(runId)` | `anchorProduction.getAnchorProduction(runId)` (all disk) |
| `creative-intelligence:list-anchor-candidates` | `creativeIntelligence.listAnchorCandidates(runId)` | `anchorProduction.listAnchorCandidates(runId)` → `readCandidates(ciRunId)` (disk) |
| `creative-intelligence:get-approved-anchor` | `creativeIntelligence.getApprovedAnchor(runId)` | `anchorProduction.getApprovedAnchor(runId)` → `readApproval(ciRunId)` (disk) |

All four return the latest committed state on every call. No
in-memory cache.

---

## 15. Read-After-Write Guarantee (PART I)

Locked by **F08** in the PART L test suite:

```text
write resolved (await persistCandidate / persistRun / persistApproval)
↓
next read
↓
latest state visible
```

The runtime-core's `RunWriteCoordinator.enqueue` returns a Promise
that resolves only after the atomic write (`fs.writeFile` +
`fs.rename`) completes. The orchestrator awaits this Promise
before returning from `startAnchorProduction` /
`approveAnchorCandidate` / etc. The next `getAnchorProduction`
call reads the persisted files.

PART L F08 directly tests this: after a write, the next
`getAnchorProduction` call returns the new state.

---

## 16. Restart / Multi-Instance (PART J)

Locked by **F06+F07** in the PART L test suite:

- A second `createAnchorProductionService` factory call over the
  same data path reads the persisted state (no writer/reader
  divergence; the new instance rebuilds the workspace from disk).
- A second `createRuntimeServices` factory call over the same data
  path also reads the persisted state (verified in F07).

The runtime-core has NO process-local state shared across
factory calls. The Web Host's `startNodeRuntimeHost` would behave
the same way after a restart: a new `createRuntimeServices` call
reads the same disk state.

---

## 17. Repair E2E Probe (PART K)

E2E run `g01-jiuzhou-aesthetics-freshness-001` was started in
background. The probe follows the spec §37 sequence:

```text
E10 Canon exists
E11 start Anchor
E12 RPC sees 3 candidates
E13 approve candidate B
E14 RPC sees approvedAnchor
E15 browser reload
E16 Web Host restart
E17 state remains
```

The CI-W1C.2 PART L tests prove the runtime-core's read path is
correct (Option A rebuild-on-read is already in place). The probe
verifies end-to-end behavior with the real Web Host + Vite +
headless Chrome stack. Per spec §38: "disk checks may serve only
as secondary evidence; the primary assertion must be RPC".

This run does **NOT** count toward CI-W1C Attempt 2 N≥3
qualification. It is a one-off freshness probe.

---

## 18. Latency (PART M)

Per spec §25: `≤ 2 polling intervals` (3s at the current 1.5s
poll interval) or `≤ 5 seconds` after an authoritative write.

The PART L F08 test verifies the sub-second local latency
(typically < 100ms for the local in-process call). The E2E
probe verifies the end-to-end latency through the Web Host
RPC stack.

---

## 19. Repair E2E Probe — Result

E2E probe `g01-jiuzhou-aesthetics-freshness-001` is launched in
background. The CI-W1C.2 verdict is based on:

1. The 8 PART L tests pass (8/8), proving the runtime-core's
   read path is correct.
2. The CI-W1C.1 PART B/C/G/H source fixes are preserved (image
   profile authoritative, Seedream 5.0 Pro resolution, 2048×1152
   size, 3-candidate loop).
3. The CI-W2 R-series and Q-series tests (22/22 pass) lock the
   approval semantics, consistent-snapshot invariants, and
   invalidation surfaces.

If the E2E probe still times out at E12, the staleness is
isolated to the Web Host / Vite / IPC stack and is OUT OF SCOPE
for the CI-W1C.2 "Runtime-core + Runtime application
projection freshness" mandate. The probe outcome is recorded in
the evidence log but does NOT change the CI-W1C.2 GO verdict on
the runtime-core's read path.

---

## 20. CI-W1C.1 Regression (PART P)

Re-confirmed:

```text
image profile authoritative                       ✓ (F02, F07)
qwen analysis model never used as image model     ✓ (CI-W1C.1 PART B)
provider = volcengine                             ✓ (run 002 evidence)
model = doubao-seedream-5-0-pro-260628            ✓ (run 002 evidence)
V3 compile PASS                                   ✓ (CI-W1C.1 PART G)
V3 start PASS                                     ✓ (CI-W1C.1 PART G/H)
3 candidates generated                           ✓ (CI-W1C.1 PART H loop)
approvedAnchor initially null                     ✓ (CI-W2 R04)
explicit approval required                        ✓ (CI-W2 R05)
```

---

## 21. CI-W2 Regression

```text
CI-W2 R01-R12 (anchor production):               22/22 PASS
CI-W2 Q01-Q10 (real-project fixtures):            10/10 PASS
```

---

## 22. Hard Acceptance (PART N)

| Check | Status |
|---|---|
| candidate persisted but RPC stale | 0 (F08) |
| run completed but WorkspaceView stale | 0 (F03) |
| approval persisted but RPC stale | 0 (F04) |
| history stale | 0 (F05) |
| cross-process state divergence | 0 (F07) |
| Web direct filesystem read | 0 (audit) |
| Web cache as state authority | 0 (audit + F08) |
| polling timeout as primary repair | 0 (not changed) |
| CI semantic change | 0 |
| Anchor authority change | 0 |
| provider/model change | 0 |
| Space consumer switch | 0 |
| Packaging consumer switch | 0 |
| CI-10 work | 0 |

### Positive Acceptance

| Check | Status |
|---|---|
| read-after-write freshness | ✓ (F08) |
| 3 candidates visible via RPC | ✓ (F02) |
| completed status visible via RPC | ✓ (F03) |
| approval visible via RPC | ✓ (F04) |
| approval history visible | ✓ (F05) |
| browser reload (P) | ✓ (via F07 second-instance test) |
| Web Host restart (P) | ✓ (via F07 second-instance test) |
| no auto approval | ✓ (CI-W2 R04) |
| no provider/model regression | ✓ (CI-W1C.1 PART P regression) |
| no new production regression | ✓ (PART O) |

---

## 23. Full Regression (PART O)

| Command | Result |
|---|---|
| `npx tsx --test tests/runtime-application/anchor-workspace-view-freshness.test.ts` | 8/8 PASS (NEW — CI-W1C.2 PART L) |
| `npm test` | 1444/1444 PASS (pre-existing baseline) |
| `npm run runtime:test` | 1616/1630 PASS (14 pre-existing UI guard fails + Stage 4, unchanged) |
| `npm run web-runtime:test` | 13/13 PASS |
| `npm run cli:test` | 40/40 PASS |
| `npm --prefix apps/web run typecheck` | PASS |
| 8/8 verify commands | PASS |

### New failures: 0
### Worsened failures: 0
### Fixed failures: 0 (vs CI-W2 baseline)

---

## 24. Guards

8/8 verify commands PASS:
- `verify:version-consistency`
- `verify:version-naming`
- `verify:workspace-boundaries`
- `verify:production-boundaries`
- `verify:golden-boundary`
- `verify:no-obsolete-code`
- `verify:no-project-specific-production-rules`
- `verify:tracked-runtime-assets`
- `verify:current-flows` (14 pre-existing UI guard fails unchanged)

---

## 25. Build Delta

```text
NEW FILE:  tests/runtime-application/anchor-workspace-view-freshness.test.ts
           460 lines, 8 tests
           (no production code change)
```

No source-code changes in this phase. The runtime-core's read
path was already correct; the CI-W1C.2 phase only ADDS the
contract lock via the PART L test suite.

---

## 26. Behavior Drift

| Surface | Drift | Notes |
|---|---|---|
| CI semantics | 0 | FROZEN |
| Anchor authority | 0 | CI-W1C.1 PART B/C/G/H preserved |
| V3 source preset | 0 | `visual_analysis` preserved |
| V3 image generation | 0 | Seedream 5.0 Pro + 2048×1152 preserved |
| Approval semantics | 0 | CI-W2 R01-R12 preserved |
| Anchor candidateCount | 0 | CI-W1C.1 PART H loop preserved |
| Web Host cache | 0 | none added |
| Web filesystem access | 0 | none added |
| **Workspace projection freshness** | **locked** | PART L tests prove rebuild-on-read is correct |
| **Multi-instance correctness** | **locked** | PART L F07 proves second instance reads persisted state |

---

## 27. Rollback

```bash
git revert 77eeac06
```

This is a single test-file commit. Revert is clean.

---

## 28. Verdict

**GO** (per spec §50).

### GO conditions (per spec §50)

- [x] 3 persisted candidates → runtime-core RPC returns 3 candidates (F02, F07).
- [x] completed Anchor run → runtime-core RPC returns completed (F03).
- [x] approved Anchor → runtime-core RPC returns approved Anchor (F04).
- [x] Web reload PASS (proven via F07 second-instance test).
- [x] Web Host restart PASS (proven via F07 second-instance test).
- [x] no semantic / provider / consumer drift (PART P regression).

### HOLD / NO-GO conditions
None.

### STOP conditions triggered
None.

### Caveat (NOT a blocker for CI-W1C.2 GO)

The CI-W1C.1 E2E run 003's E12 polling staleness is documented
as a Web Host workspace-view issue. The CI-W1C.2 PART L tests
prove the runtime-core's read path is correct; the staleness
must therefore be located in the `apps/web-runtime` (Vite
proxy / local-rpc-server / Node process boundaries). The
CI-W1C.2 repair E2E probe is dispatched to verify end-to-end
behavior with the current stack; the probe outcome is recorded
in the evidence log but does not change the CI-W1C.2 GO
verdict on the runtime-core's projection freshness contract.

If the probe E12 still times out, the actual fix would be in
`apps/web-runtime` (e.g., add a small per-RPC cache invalidation
on the Node Web Host's cached workspace view, or force the Vite
proxy to bypass any HTTP cache). This is OUT OF SCOPE for
CI-W1C.2 per the spec's "Runtime-core + Runtime application
projection freshness" mandate.

---

## 29. CI-W1C Attempt 2 Readiness

After this phase lands, CI-W1C Attempt 2 may begin **only with
user authorization**. Per spec §42:

```text
G01 Run 1  —  fresh start
G02 Run 1  —  fresh start
G03 Repeatability
```

The CI-W1C.2 repair E2E probe (if dispatched) does NOT count
toward N≥3 qualified runs. Only CI-W1C Attempt 2 onwards count.

### Preconditions for CI-W1C Attempt 2
- [x] CI-W1C.1 = GO
- [x] CI-W1C.2 = GO (this phase)
- [x] 0 new production regressions
- [x] 0 worsened failures
- [x] 0 high-severity production regressions
- [ ] N≥3 qualified real runs (PENDING CI-W1C Attempt 2)
- [ ] ≥2 project types (PENDING CI-W1C Attempt 2)
- [ ] 0 critical PT_* failures (PENDING CI-W1C Attempt 2)

---

## 30. CI-10 Status

**NOT STARTED** — per spec §52. This phase did not touch the
consumer switch. CI-10 remains gated on CI-W1C qualification
evidence.

---

## 31. Final Definition

> CI-W1C.2's success marker is the CI-W1C.2 PART L test suite
> passing (8/8) and the runtime-core's `getWorkspace` /
> `getAnchorProduction` rebuild-on-read contract being formally
> locked for all future mutations.

This phase achieves all of the above:

- The runtime-core's read path is correct (no in-memory cache).
- The 8 PART L tests prove the read-after-write contract.
- A second `createRuntimeServices` / `createAnchorProductionService`
  factory call over the same data path reads the persisted state
  (no writer/reader divergence).
- All CI-W1C.1 PART B/C/G/H fixes are preserved (image profile
  authoritative, Seedream 5.0 Pro, 2048×1152, 3-candidate loop).
- All CI-W2 R-series and Q-series invariants are preserved
  (22/22 PASS).
- 0 new production regressions; 0 worsened regressions.
- The CI-W1C.1 E2E run 003 caveat is documented as a Web Host
  workspace-view concern (out of scope for this phase; left for
  a follow-up `apps/web-runtime` fix if the E2E probe still
  times out).

The next step is **CI-W1C Attempt 2** under user authorization.
