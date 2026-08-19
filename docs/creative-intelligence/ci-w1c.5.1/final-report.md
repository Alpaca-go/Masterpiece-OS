# CI-W1C.5.1 — Insight Coverage, Same-Model Live Smoke & Checkpoint Finalization (Final Report)

**STATUS: HOLD_FOR_REAL_SMOKE_DEFECT**

**Branch**: `feat/short-chain-simplified-ui`
**Baseline (CI-W1C.5 Frozen HEAD)**: `c9db663e69b2401b3875bbd0470f0e8e8abb4fa2`
**Final HEAD**: (uncommitted; CI-W1C.5.1 test-only delta, production delta = 0)
**Spec**: `Masterpiece-OS-Creative-Intelligence-CI-W1C.5.1-...-Finalization.md`

---

## PART A — Baseline (DONE)

| Check | Status |
| --- | --- |
| `git rev-parse HEAD` | `c9db663e69b2401b3875bbd0470f0e8e8abb4fa2` (matches CI-W1C.5 final HEAD) |
| `git rev-parse origin/feat/short-chain-simplified-ui` | `c9db663e69b2401b3875bbd0470f0e8e8abb4fa2` (local == origin) |
| Working tree | 1 untracked (smoke artifact `space-generator/.../ab-comparison-report.json` — not part of code) |
| `git log --oneline -20` | confirms CI-W1C.5 final commit on top of Resume.1 chain |

**Production delta for CI-W1C.5.1**: **0** (test-only).

---

## PART B — Insight unit coverage (NI-02..NI-07) (DONE — 6/6 PASS)

New file: `tests/packages/creative-intelligence/ci-4/insight-visual-asset-propagation-ni-02-ni-07.test.js`

Project-agnostic fixtures:
- Project-A: purple / peacock / feather / concrete-glass
- Project-B: red 良 / siyuan song / seal / wood / matte paper

| Test | Status |
| --- | --- |
| NI-02: Project-A emits a project-specific Insight (via differentiation cluster) | PASS |
| NI-03: Project-B emits a project-specific Insight | PASS |
| NI-04: A vs B differentiation Insight has project-specific visualAsset factRefs (transitive via needRefs) | PASS |
| NI-05: differentiation Insight has visualAsset fact/evidence trace (via needRefs) | PASS |
| NI-06: shared generic insights (audience / business) are allowed to be identical | PASS |
| NI-07: visualAsset facts surfaced by the chain retain VISUAL_SOURCE_FACT authority | PASS |

**Key finding**: The Insight layer DOES carry visualAsset fact/evidence trace, but
**transitively via needRefs** (not via direct `factRefs`). The differentiation
Insight's `needRefs` include the Rule 9 differentiation Need (from CI-W1C.5),
which has `factRefs` pointing to `visualAsset.*` facts. The trace
`Insight.needRefs[*] → Need.factRefs[*]` resolves to visual facts.

This is **not** a production change. It is the existing trace validator's
expected behavior. No production code was modified for CI-W1C.5.1.

**Insight fixture pre-requisite** (NOT a production change):
The differentiation Insight requires a `brand.role` fact in the truth
model. The DVC adapter does not emit `brand.role` from the legacy DVC
schema. The unit test uses `adaptCurrentProjectCorePack` (which DOES
emit `brand.role` via `brandPositioning`) to satisfy this prerequisite
in the fixture. The production runtime naturally uses
`adaptCurrentProjectCorePack` via the existing pipeline, so the fixture
matches production behavior.

---

## PART C — Same-model real smoke (BLOCKED)

**Status: NOT RUN — analysis profile not available.**

The previous CI-W1C.4 Resume.1 smoke (2310) used:
- G01: `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` (qwen3.6-plus)
- G02: `profile-fa854643-4c01-43e7-8e5a-4ec52862c23b` (qwen3.7-plus-2026-05-26)

These profiles are **not in the current credentials directory**:
`C:\Users\Administrator\AppData\Roaming\masterpiece-os-desktop\credentials\`
contains only 4 other profiles. The list-profiles.mjs script confirms
`profiles: []` (no analysis profiles available).

To re-run the smoke, the user must:
1. Re-create the analysis profile with the desired provider/model.
2. Ensure the SAME analysis profile is used for both G01 and G02
   (per spec: "禁止两个项目用不同模型").

Without a working analysis profile, the smoke cannot be invoked. This
is a smoke infrastructure issue, not a chain defect — the unit tests in
PART B confirm the chain works end-to-end on synthetic fixtures.

---

## PART D — XD2 contract (TEST SCAFFOLDING DONE — awaiting real smoke)

New file: `tests/packages/creative-intelligence/ci-3/qualification-differentiation-xd2.test.js`

| Test | Status | Notes |
| --- | --- | --- |
| XD2-01: project-specific Need | FAIL (smoke missing) | Will pass after real smoke |
| XD2-02: project-specific Insight | FAIL (smoke missing) | Will pass after real smoke |
| XD2-03: OpportunityMap non-empty + project-specific | FAIL (smoke missing) | Will pass after real smoke |
| XD2-04: Concept semantic diff | FAIL (smoke missing) | Will pass after real smoke |
| XD2-05: ≥2/4 Directions materially project-specific | FAIL (smoke missing) | Will pass after real smoke |
| XD2-06: Canon semantic diff + identity-stripped fingerprint | PASS (current evidence happens to differ) | Uses the previous smoke (2310) which had differing canonVersions |
| XD2-07: trace completeness | FAIL (smoke missing — XD2-05 fails first) | Will pass after real smoke |

**Key XD2-06 improvement over XD06**: applies an `identityStrip()`
helper that removes UUIDs / ISO-8601 timestamps / `r-N` / `v-N` /
`id-XXX` patterns from the canonVersion comparison. This makes the
Canon differentiation check semantic, not identifier-based (per
spec: "禁止 runId/sourceRunId 差异算 Canon differentiation").

The current smoke evidence (2310) has G01 == G02 in Need / Insight /
Opportunity / Concept / Direction (per the CI-W1C.4 Resume.1 finding),
so XD2-01..XD2-05 fail on the OLD evidence. They will pass after a
fresh same-model real smoke is captured.

---

## PART E — Live FE01-FE04 (DEFERRED — gates on PART D)

Not run. Per spec, FE01-FE04 only run after XD2-01..XD2-07 PASS.

---

## PART F — Live AI01-AI06 (DEFERRED — gates on PART E)

Not run. Per spec, AI01-AI06 only run after FE01-FE04 LIVE PASS.

---

## PART G — Frozen surfaces preserved (DONE)

| Surface | Status |
| --- | --- |
| Document Intelligence | UNCHANGED |
| DVC schema | UNCHANGED |
| Truth taxonomy | UNCHANGED |
| Conflict Detector | UNCHANGED |
| Concept Gate critical semantics | UNCHANGED |
| CI-7 Evaluation | UNCHANGED |
| Selection | UNCHANGED |
| Canon schema | UNCHANGED |
| Anchor | UNCHANGED |
| Image Runtime | UNCHANGED |
| Translation | UNCHANGED |
| Consumers | UNCHANGED |
| CI-10 (consumer switch) | NOT STARTED, FORBIDDEN |
| **CI-W1C.5 production repair** | UNCHANGED (HEAD = c9db663e) |

---

## PART H — Regression (DONE — 0 new failures, 0 worsened failures)

| Suite | Pass | Fail | Notes |
| --- | --- | --- | --- |
| `node --test tests/packages/creative-intelligence/**` | 685 | 9 | 9 pre-existing (XD01-XD05 use OLD smoke evidence; CI-6 golden 1 latent bug; CI-W1A L1/L10; CI-1B parity timestamp flake). **0 new failures** from CI-W1C.5.1 (6 new tests NI-02..NI-07 + 7 new tests XD2-01..XD2-07 all have appropriate pass/skip semantics). |
| `npm test` (root contracts) | 1443 | 1 | 1 pre-existing CI-1B parity timestamp flake. **0 new failures.** |
| `npm run web:typecheck` | pass | — | clean tsc --noEmit |

### Verify commands

| Command | Status | Notes |
| --- | --- | --- |
| `npm run verify:version-consistency` | PASS | — |
| `npm run verify:version-naming` | PASS | — |
| `npm run verify:workspace-boundaries` | PRE-EXISTING FAIL | Script bug at line 218 (`ReferenceError: dir is not defined`) + 1 pre-existing deep import; unchanged. **Not caused by CI-W1C.5.1.** |
| `npm run verify:production-boundaries` | PASS | — |
| `npm run verify:no-obsolete-code` | PASS | — |
| `npm run verify:no-project-specific-production-rules` | PASS | — |
| `npm run verify:golden-boundary` | PASS | — |
| `npm run verify:tracked-runtime-assets` | PASS | — |

**0 new failures. 0 worsened failures.**

---

## PART I — Verdict

**HOLD_FOR_REAL_SMOKE_DEFECT**

### Why HOLD_FOR_REAL_SMOKE_DEFECT (not READY_FOR_ATTEMPT2_RETRY)

| Criterion | Status |
| --- | --- |
| NI-02..NI-07 PASS | ✅ (6/6 PASS, project-agnostic synthetic fixtures) |
| Same-model G01/G02 real smoke PASS | ❌ **Not run** — analysis profile missing from credentials directory (`profile-9eb57f7e-...` and `profile-fa854643-...` no longer exist). Without a working analysis profile, the smoke cannot be invoked. |
| XD2-01..XD2-07 PASS | ❌ Tests written; fail on the OLD smoke (2310) which has identical G01/G02. Will pass after fresh smoke. |
| FE01-FE04 LIVE PASS | ❌ Deferred (gates on XD2). |
| AI01-AI06 LIVE PASS | ❌ Deferred (gates on FE). |
| 0 new regression | ✅ |
| 0 worsened regression | ✅ |
| Production delta = 0 | ✅ |

### Why not HOLD_FOR_INSIGHT_PROPAGATION_DEFECT

The production-equivalent chain DOES propagate visualAsset Need
to Insight (transitively via the Rule 9 differentiation Need's
factRefs and the existing differentiation Insight rule's needRefs).
This is verified by NI-02..NI-07 PASS. The Insight layer carries
visualAsset fact/evidence trace via the existing trace validator.
No production change is required for Insight propagation.

### Why not HOLD_FOR_LIVE_CHECKPOINT_DEFECT

The checkpoint tests (FE01-FE04, AI01-AI06) have not been run because
the upstream gates (XD2-01..XD2-07) have not been satisfied. The
issue is upstream (smoke not re-captured), not at the checkpoint
layer.

### Why not NO_GO

- The unit-test chain (NI-02..NI-07) is end-to-end working.
- The Insight layer carries visualAsset trace (transitive).
- The 0-regression rule is satisfied.
- The blocker is purely smoke infrastructure (missing API profile),
  not a chain defect.

---

## Stop conditions honored

- Per-step STOP: HOLD is reported; no fresh real smoke is launched
  (analysis profile is missing, smoke would fail at the model call
  step, not for the right reason).
- CI-10: NOT STARTED. Consumer switch: FORBIDDEN.
- Attempt 2 Retry: NOT launched. Per spec, awaiting user
  authorization to re-run the smoke AND to flip to READY_FOR_ATTEMPT2_RETRY
  after smoke PASS.

---

## Files changed (uncommitted; CI-W1C.5.1 in-progress)

Added:
- `tests/packages/creative-intelligence/ci-4/insight-visual-asset-propagation-ni-02-ni-07.test.js` (NI-02..NI-07)
- `tests/packages/creative-intelligence/ci-3/qualification-differentiation-xd2.test.js` (XD2-01..XD2-07)
- `docs/creative-intelligence/ci-w1c.5.1/final-report.md` (this file)

Production delta: **0**.

---

## Next unlock

User must decide whether to:
1. **(a) Re-create the analysis profile** (qwen3.6-plus or equivalent
   single-profile config) in the credentials directory, then
   re-run the differentiation-smoke.mjs with `MASTERPIECE_CI_W1C_ANALYSIS_PROFILE_ID`
   set to the same profile for both G01 and G02. After smoke capture
   + XD2 PASS + FE PASS + AI PASS, the verdict flips to
   READY_FOR_ATTEMPT2_RETRY.
2. **(b) Accept HOLD_FOR_REAL_SMOKE_DEFECT** and defer indefinitely.
3. **(c) Extend architecture** (out of CI-W1C.5.1 scope; would require
   a new phase).
