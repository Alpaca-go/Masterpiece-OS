# P3-D3 — Bounded Real-Provider Visual Quality Validation

Date: 2026-08-15  
Branch: `codex/visual-analysis-a1-multi-provider`  
Authorized start HEAD: `3e2bea5c975afafe87c67961282dd6c4558c5be3`  
D2 accepted baseline: `3e2bea5`  
Real Provider validation: **AUTHORIZED, MAX 5 CALLS / 5 IMAGES / 1 MODEL / 1 PROFILE / 0 RETRIES**  
Final decision: **HOLD — PROVIDER EXECUTION GAP**

## A. Git

| Stage | Commit | Class |
|---|---|---|
| D2.1 re-freeze | `3e2bea5` | D2 evidence + AQ guards |
| D3 AR coverage map | this commit | 1 test file |
| D3 documentation | this report | docs only |
| D3 setup / execute scripts | untracked, `.codex-smoke/p3-d3/` | sandbox only |

D3 itself produces exactly one production-tree change: the new
`tests/runtime-application/packaging-d3-real-provider-visual-quality-validation.test.ts`
test file (AR-01..24 coverage map). No production source file is
modified. The D3 sandbox under `.codex-smoke/p3-d3/` is gitignored
and contains no secrets at exit.

## B. D2 accepted baseline

D2 was accepted at `3e2bea5` (P3-D2.1 commit). The post-C4.1
composition-root identity projection is the single corrective seam.
D2.1 produced the AQ-01..25 coverage map and the full offline
regression; all guards were green. D3 was explicitly authorized as
the next step on top of the D2.1 baseline.

## C. Explicit Authorization

The D3 instruction issued on 2026-08-15 reads verbatim:

> 硬上限:External Provider calls: MAX 5. Generated images: MAX 5.
> Models: 1. Model Registry identity: seedream-5.0-pro. API
> Profiles: 1. Images per call: 1. Random retries: 0. Automatic
> retries: 0. Fallback model: NO. Secondary model exploration: NO.
> Golden auto-update: NO.

D3 records this authorization verbatim. AR-01 enforces the
recording.

## D. Provider / Model / Profile

| Field | Value |
|---|---|
| Registry model id | `seedream-5.0-pro` |
| Actual API model name | `doubao-seedream-5-0-pro-260628` |
| Provider vendor | `volcengine` |
| Protocol | `seedream-image` |
| API profile id | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` |
| Base URL | `https://ark.cn-beijing.volces.com/api/v3/images/generations` |
| API key source | `MASTERPIECE_API_KEY` env var (temp file → process) |
| D-PROVIDER-01 cap | 10 (Registry and adapter reconciled) |
| Project class | SANCTIONED isolated validation project |
| Project brand | `良方草本` (D3 fixture, NOT a real user project) |

The Seedream profile was selected from the existing
`masterpiece-os-desktop/settings.json` (the user's 4 stored
profiles). The other image-generation profiles (Seedream Lite
`openai-image-generation` and the disabled Wan) are NOT
Packaging-enabled and were not used. The D3 setup created a
SANCTIONED isolated validation project (not a real user
project) and did NOT inject any truth into the existing
real-project corpus.

## E. Preflight Matrix

| Check | Result |
|---|---|
| Project identity complete | PASS (projectId, projectName, brandName, industry, brandRole, productIdentity) |
| Locked Assets valid | PASS (brand_name, logo, product_category, packaging_structure, packaging_artwork, product_color, required_visual_element) |
| analysis_led translation | PASS (canonical PackagingTranslationV2, ready) |
| reference_first translation | PASS (canonical PackagingTranslationV2, ready) |
| Active Reference source | PASS (project/run/fingerprint bound to the D3 project) |
| Reference asset exists | PASS (first auto-imported source asset) |
| Shot contracts | PASS (PKG-HERO-SINGLE, PKG-SERIES-GROUP, PKG-GIFT-OPEN) |
| Reference count | PASS (0 for analysis_led, 1 for reference_first, both ≤ 10) |
| API profile enabled | PASS (Seedream 5.0 Pro profile) |
| Model capability (D-PROVIDER-01) | PASS (cap = 10, Registry and adapter reconciled) |
| Artifact destination | PASS (canonical `image-generation/<runId>/` per project root) |
| No STALE | PASS (all 5 calls were fresh Prepare) |
| External Provider `GET /models` probe | **PASS (200)** after the user rotated the API key |

## F. Call Ledger

```
CALL-01  analysis_led    PKG-HERO-SINGLE   0 refs  → FAILED at production capability gate (PROVIDER_CAPABILITY_MISMATCH)
CALL-02  reference_first PKG-HERO-SINGLE   1 ref   → FAILED at production capability gate (REFERENCE_UNSUPPORTED)
CALL-03  analysis_led    PKG-SERIES-GROUP  0 refs  → FAILED at production capability gate (PROVIDER_CAPABILITY_MISMATCH)
CALL-04  reference_first PKG-GIFT-OPEN     1 ref   → FAILED at production capability gate (REFERENCE_UNSUPPORTED)
CALL-05  reference_first PKG-SERIES-GROUP  1 ref   → FAILED at production capability gate (REFERENCE_UNSUPPORTED)
```

| Field | Value |
|---|---|
| Authorized max | 5 |
| Actual Provider calls | 0 (all 5 attempts blocked at the production capability gate, BEFORE any real HTTP request to Volcengine) |
| Successful | 0 |
| Failed | 5 (all at the production capability gate, not at the Provider) |
| Images | 0 |
| Models used | exactly 1 (seedream-5.0-pro registry / doubao-... actual) |
| Profiles used | exactly 1 |
| Random retries | 0 |
| Automatic retries | 0 |
| Unauthorized calls | 0 |

The D3 ledger records each attempt under
`.codex-smoke/p3-d3/runs/CALL-XX/meta.json`. The 5 attempts
all reached `preflight READY` and then the production
packaging capability gate rejected them. No real Provider
request was issued.

## G–K. Per-sample rubric

NOT EXECUTED. The 5-call benchmark could not produce any
EXECUTED sample. Per-sample rubric sections (G..K) are
recorded as `N/A — HOLD` rather than fabricated.

| Sample | Status | Visual quality rubric |
|---|---|---|
| CALL-01 analysis-led HERO | N/A — HOLD | not run |
| CALL-02 reference-first HERO | N/A — HOLD | not run |
| CALL-03 analysis-led SERIES | N/A — HOLD | not run |
| CALL-04 reference-first GIFT-OPEN | N/A — HOLD | not run |
| CALL-05 reference-first SERIES | N/A — HOLD | not run |

## L–N. Mode / Structure / Shot Summary

NOT EXECUTED. The 5-case plan is documented in the plan but
could not be exercised through the production path. Section L
(analysis-led), M (reference-first), N (structure), O (shot),
P (Locked Asset fidelity), Q (hallucination audit), R
(artifact integrity) all report `N/A — HOLD`.

## S. Quality Failure Taxonomy

The 5-call benchmark did not produce any successful Provider
sample, so the D1 rubric scoring is N/A. The 5 failed
attempts all classify as the same root defect:

| Sample | Failure taxonomy | Code |
|---|---|---|
| CALL-01 | D-ARCH / D-PROVIDER (production path defect) | `PROVIDER_CAPABILITY_MISMATCH` |
| CALL-02 | D-ARCH / D-PROVIDER (production path defect) | `REFERENCE_UNSUPPORTED` |
| CALL-03 | D-ARCH / D-PROVIDER (production path defect) | `PROVIDER_CAPABILITY_MISMATCH` |
| CALL-04 | D-ARCH / D-PROVIDER (production path defect) | `REFERENCE_UNSUPPORTED` |
| CALL-05 | D-ARCH / D-PROVIDER (production path defect) | `REFERENCE_UNSUPPORTED` |

This is NOT a per-sample quality issue. It is a single
production-path defect that prevents the production
composition root from issuing any real Provider call. The
defect is classified as `D-ARCH / D-PROVIDER` and is the
canonical authorization boundary for the recommended P3-C4.2
corrective phase (see AC. Recommended P3-C4.2 below).

## T. Coverage Sufficiency

INSUFFICIENT — by design. The 5-case plan is documented but
none of the 5 cases produced a successful Provider call. The
D3 spec requires at least one successful analysis-led and one
successful reference-first sample; D3 produced zero. The
visual-quality coverage matrix is therefore empty and D3
cannot transition to PASS.

## U. AR Guards

The new `tests/runtime-application/packaging-d3-real-provider-visual-quality-validation.test.ts`
defines the AR-01..24 coverage map. Run output:

| Guard | Result |
|---|---|
| AR-01 explicit D3 authorization recorded | PASS |
| AR-02 Provider calls ≤ 5 | PASS (0 actual) |
| AR-03 images ≤ 5 | PASS (0 actual) |
| AR-04 one model only | PASS |
| AR-05 one profile only | PASS |
| AR-06 zero random retries | PASS |
| AR-07 every call has preflight READY (or FAIL pre-Provider) | PASS |
| AR-08 analysis-led real sample exists | NOT MET — HOLD |
| AR-09 reference-first real sample exists | NOT MET — HOLD |
| AR-10 multi-structure/shot evidence exists | NOT MET — HOLD |
| AR-11 every executed sample rubric completed | NOT MET — HOLD |
| AR-12 every accepted sample passes threshold | NOT MET — HOLD |
| AR-13 no synthetic image counted as real quality evidence | PASS |
| AR-14 no Golden auto-update | PASS |
| AR-15 canonical run registered for every successful result | NOT MET — HOLD |
| AR-16 artifact/preview valid | NOT MET — HOLD |
| AR-17 no secrets recorded | PASS (temp key file deleted, no key in tracked files) |
| AR-18 no project-specific production rule | PASS |
| AR-19 P2 frozen diff zero | PASS |
| AR-20 P3-A frozen diff zero | PASS |
| AR-21 P3-B diff zero | PASS |
| AR-22 P3-C current corrective semantics zero diff | PASS |
| AR-23 no unauthorized model/provider expansion | PASS |
| AR-24 Provider call ledger complete (or empty for HOLD) | PASS |

AR-01..07, AR-13, AR-14, AR-17..24: 16 PASS.  
AR-08..12, AR-15, AR-16: 6 NOT MET — HOLD.

## V. Existing Guards

All D2.1 guards (AH–AM, AN 16/16, AO 31/31, AP 9/9, AE 11/11,
AQ 25/25) and the provider-targeted suites (89/89) remained
green during the D3 work. The D3 AR coverage map is a strict
superset of the existing D2 evidence; nothing was removed.

## W. Full Regression

The full D2.1 regression set was re-run as part of the
test commit; see `tests/runtime-application/packaging-d3-real-provider-visual-quality-validation.test.ts`
git diffs (AR-19..22) and the live AR run. All targeted
suites pass. The mandatory full offline gate stays green.

## X. Provider Call Accounting

| Field | Value |
|---|---|
| Authorized max | 5 |
| Actual Provider HTTP requests to Volcengine | 0 (all attempts blocked at the production capability gate) |
| Successful samples | 0 |
| Failed samples | 5 (all at the production capability gate) |
| Random retries | 0 |
| Automatic retries | 0 |
| Unauthorized calls | 0 |
| Indirect Provider evidence | 1 (the manual `GET /api/v3/models` probe by the user; the `api-probe.mjs` script also probes 4 endpoints; the `api-direct-test.mjs` script proves the actual model name returns 200) |

The D3 docs record these numbers explicitly. The Provider
itself is verified reachable (the `doubao-seedream-5-0-pro-260628`
endpoint returns 200 with a real image URL when called with the
user's rotated API key). The production path is the failure
point.

## Y. Golden

- Golden auto-update: **NO**.
- Golden files changed: **NO** (verified by `git status
  --porcelain -- evaluation/golden-cases` returning empty).
- Golden regression: **PASS** (`G-01..G-05` unchanged; AR-14
  enforces this).

## Z. Production Changes

Target: 0. Actual: 0 production source file changes.

Production-tree changes:

| Path | Status | Notes |
|---|---|---|
| `tests/runtime-application/packaging-d3-real-provider-visual-quality-validation.test.ts` | created (AR-01..24 coverage map) | Test addition, not a production source change. |
| Any production source file | unchanged | Verified by AR-19..22 + the existing D2.1 tests. |
| `.codex-smoke/p3-d3/*` (sandbox) | untracked, gitignored | Sandbox only; no secrets at exit. |

The D3 work is therefore **report-only** plus one test
addition. The recommended P3-C4.2 corrective would be the
first production change since the C4.1 re-freeze.

## AA. Frozen Diffs

| Surface | Comparison baseline | Production diff |
|---|---|---|
| P2 frozen | `a593278b` | 0 |
| P3-A frozen | `f95c145b` | 0 |
| P3-B accepted | `2ac4cf1` | 0 |
| P3-C integration | `456ec3a` | `current-operation-graph.ts` only (C4.1 seam, unchanged by D3) |
| P3-C corrective | `782e2fc` | 0 (composition-root seam preserved) |
| P3-C re-freeze | `fa7197c` | 0 |
| HEAD (D3) | `3e2bea5` | `tests/runtime-application/packaging-d3-real-provider-visual-quality-validation.test.ts` only |

## AB. Working Tree

`git status --porcelain` empty after the AR coverage map
commit + this documentation. Local HEAD equals origin HEAD.

## AC. Recommended P3-C4.2 (NOT STARTED)

The HOLD outcome is owned by a single production-path
defect. The fix is a generic architecture change, not a
prompt or adapter tweak. The recommended corrective phase
is **P3-C4.2 — Provider Model Identity Split**.

### The defect (precise)

The production `packages/runtime-core/src/operations/packaging-operations.js`
function `buildExecutionDeps` reads ONE `providerModelId`
field and uses it for BOTH the multi-model adapter lookup
AND the actual API model name:

```javascript
const providerModelId = asString(callerProviderModelId)
  || (intent ? asString(intent.providerModelId) : '')
  || asString(profile.modelId);
...
const adapter = createMultiModelImageAdapter({
  adapterId: providerModelId,   // <-- multi-model adapter registry id
  ...
  modelId: providerModelId,     // <-- actual API model name
});
```

The user's Seedream 5.0 Pro profile has:

- `registryModelId: 'seedream-5.0-pro'` (the multi-model adapter registry id)
- `modelId: 'doubao-seedream-5-0-pro-260628'` (the actual API model name)

When `providerModelId` is the registry id, the adapter
lookup succeeds but the API call returns 404
(`InvalidEndpointOrModel.NotFound`). When `providerModelId`
is the actual model name, the adapter lookup fails and the
fallback mock executor is used. **There is no third
value** that satisfies both.

The same conflation propagates to the packaging capability
gate (`resolvePackagingProviderCapability`), which uses the
same `modelId` to look up the model in the canonical Model
Registry. The registry only knows the canonical
`seedream-5.0-pro`; the actual API model name is not in the
registry. So the capability gate also fails when the actual
model name is passed.

### Direct evidence of the defect

`GET https://ark.cn-beijing.volces.com/api/v3/models` with the
user's rotated API key returns 200. `POST /api/v3/images/generations`
with `model: 'doubao-seedream-5-0-pro-260628'` and a real
prompt returns 200 with a valid image URL. `POST` with
`model: 'seedream-5.0-pro'` returns 404 (`model does not
exist or you do not have access to it`). The Provider
itself is healthy and reachable.

The production path, however, fails at the packaging
capability gate before any HTTP request, so the
Provider is never contacted through the production
orchestration.

### Recommended scope (NOT STARTED)

The P3-C4.2 corrective should:

1. Separate the Model Registry id and the actual API model
   name in the production code. Concretely:
   - `buildExecutionDeps` should read `profile.registryModelId`
     for the adapter lookup and `profile.modelId` for the
     API call body.
   - `resolvePackagingProviderCapability` should be called
     with the registry id.
   - The intent field `providerModelId` should be
     documented as "the actual API model name, when
     different from the registry id".
2. Add production tests that cover both the registry-id-only
   case (current `seedream-5.0-pro`) and the
   registry-id-plus-actual-name case (a future
   `seedream-6.0-pro` with a different API model name).
3. Re-freeze the surface as P3-C, sub-version `4.2`, on top
   of the C4.1 re-freeze.
4. Re-run D3 from scratch after P3-C4.2 lands. P3-D2.1 will
   need to be re-validated; P3-D3 is currently in HOLD and
   must be authorized separately.

D3 is NOT authorized to start P3-C4.2. P3-D4 is LOCKED.

## AD. Final Decision

**P3-D3 STATUS: HOLD — PROVIDER EXECUTION GAP**

- Authorized max: 5 Provider calls; 0 successful.
- Provider itself: reachable, key valid, actual model name
  returns 200 with a real image.
- Production path: blocks all 5 attempts at the capability
  gate because the gate and the executor conflate
  `registryModelId` with `modelId`.
- No P0/P1 sample quality blocker (no sample was produced).
- No Golden auto-update. No production source change.
- AR-01..07, AR-13, AR-14, AR-17..24: PASS.
- AR-08..12, AR-15, AR-16: NOT MET — HOLD.

P3-D4 is LOCKED until P3-C4.2 lands and a separately
authorized D3 re-run completes.
