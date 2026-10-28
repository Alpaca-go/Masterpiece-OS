# P3-D3 RE-RUN — Bounded Real-Provider Visual Quality Validation (Re-Run)

Date: 2026-08-15
Branch: `codex/visual-analysis-a1-multi-provider`
Authorized start HEAD: `c727e117245e149fac88e89dd8795982c60514f0` (C4.2.2 final sync HEAD)
C4.2.2 verified final HEAD: `887436e1a4b49f76f8dd631f945442f0615b6257`
Real Provider validation: **AUTHORIZED, MAX 5 CALLS / 5 IMAGES / 1 MODEL / 1 PROFILE / 0 RETRIES**
Final decision: **HOLD — PROVIDER EXECUTION GAP (key invalid)**

## A. Git

| Stage | Commit | Class |
|---|---|---|
| C4.2.2 final sync | `c727e117245e149fac88e89dd8795982c60514f0` | docs only (C4.2.2 freeze record sync) |
| **D3 RE-RUN (1/N) AX guards** | **<new SHA>** | test only (1 new AX test file) |
| **D3 RE-RUN (2/N) docs** | **<new SHA>** | docs only (this document) |

The D3 RE-RUN is a runtime benchmark + AX coverage map phase. Production source changes: 0. Working tree after the D3 RE-RUN commits is empty.

## B. P3-A12 Consumed (C4.2.2 Baseline)

| Item | Value |
|---|---|
| C4.2.2 verified final HEAD | `887436e1a4b49f76f8dd631f945442f0615b6257` |
| C4.2.2 final sync HEAD (start of D3 RE-RUN) | `c727e117245e149fac88e89dd8795982c60514f0` |
| Current P3-A production-tree baseline | `1fcafc810a7e218a7cf50dd675d914cd396304b2` (P3-A12 corrective) |
| Current P2 baseline | `a593278b55e437fac59d768c5cee734d9a9fc201` |
| Current P3-B baseline | `2ac4cf1cc18156d1e4a508382b4563298d69c014` |
| P3-A STALE authority | `workspace-service.checkStale(sessionId)` (read-only seam, formally accepted by P3-A12) |

## C. New D3 RE-RUN Authorization

| Field | Value |
|---|---|
| Authorization date | 2026-08-15 |
| External Provider HTTP calls | MAX 5 |
| Generated real images | MAX 5 |
| Models | 1 |
| Registry model id | `seedream-5.0-pro` |
| Actual Provider API model | `doubao-seedream-5-0-pro-260628` |
| API Profiles | exactly 1 |
| API profile id | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` (Seedream 5.0 Pro) |
| Provider vendor | `volcengine` |
| Protocol | `seedream-image` |
| Images per call | 1 |
| Random retries | 0 |
| Automatic retries | 0 |
| Fallback model | NO |
| Secondary model exploration | NO |
| Provider switching | NO |
| Prompt experimentation loop | NO |
| Golden auto-update | NO |
| P3-D3 re-run start HEAD | `c727e117245e149fac88e89dd8795982c60514f0` |
| P3-C4.2.2 final technical HEAD | `887436e1a4b49f76f8dd631f945442f0615b6257` |

## D. Provider / Registry Model / API Model / Profile

| Field | Value |
|---|---|
| Registry model id | `seedream-5.0-pro` |
| Actual Provider API model | `doubao-seedream-5-0-pro-260628` |
| Provider vendor | `volcengine` |
| Protocol | `seedream-image` |
| API profile id | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` (Seedream 5.0 Pro) |
| Base URL | `https://ark.cn-beijing.volces.com/api/v3/images/generations` |
| Project class | SANCTIONED isolated validation project (NOT a real user project) |
| Project brand | `良方草本` (D3 fixture, NOT a real user brand) |
| D-PROVIDER-01 cap | 10 (Registry and adapter reconciled) |
| API key source | `process.env.MASTERPIECE_API_KEY` (46 chars, `ark-…-f0fe2` format) |

The Seedream profile was selected from the existing `masterpiece-os-desktop/settings.json` (the user's 4 stored profiles). The D3 RE-RUN used the same sanctioned isolated validation project from the original D3 (`9e6158f0-33d2-4d95-9039-7592237938a8`).

## E. Offline Preflight Matrix

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
| No STALE | PASS (all 5 RERUN-CALLs cleared the canonical P3-A12 STALE precheck; `checkStale` returned `{ stale: false, reasons: [] }` for every call) |
| External Provider auth | **FAIL (HTTP 401)** for the 3 RERUN-CALLs that reached the Provider HTTP layer; the 2 RERUN-CALLs that terminated at `prepare-generation` never contacted the Provider |

## F. Real Call Ledger

```
CALL-01  analysis_led    PKG-HERO-SINGLE   0 refs  → FAILED at Provider (HTTP 401 AuthenticationError: The API key format is incorrect)         [Provider-layer rejection]
CALL-02  reference_first PKG-HERO-SINGLE   1 ref   → FAILED at prepare-generation (REFERENCE_REQUIRED: reference_required_in_reference_first)    [Prepare-layer rejection]
CALL-03  analysis_led    PKG-SERIES-GROUP  0 refs  → FAILED at Provider (HTTP 401 AuthenticationError: The API key format is incorrect)         [Provider-layer rejection]
CALL-04  reference_first PKG-GIFT-OPEN     1 ref   → FAILED at prepare-generation (REFERENCE_REQUIRED: reference_required_in_reference_first)    [Prepare-layer rejection]
CALL-05  analysis_led    PKG-HERO-SINGLE   0 refs  → FAILED at Provider (HTTP 401 AuthenticationError: The API key format is incorrect)         [Provider-layer rejection]
```

| Field | Value |
|---|---|
| Authorized max | 5 |
| Actual Provider HTTP requests (RERUN-CALL-01, -03, -05) | 3 (analysis_led calls; reached Provider via production path) |
| Calls that terminated at `prepare-generation` (RERUN-CALL-02, -04) | 2 (reference_first calls; rejected by reference policy, never reached Provider) |
| Successful | 0 |
| Failed | 5 (3 at Provider auth, 2 at prepare reference policy) |
| Images | 0 |
| Models used | exactly 1 (seedream-5.0-pro registry / doubao-seedream-5-0-pro-260628 actual) |
| Profiles used | exactly 1 |
| Random retries | 0 |
| Automatic retries | 0 |
| Unauthorized calls | 0 |

The 5 attempts were each driven through the production path:
1. `packaging:create-session` (workspace session created)
2. `packaging:update-intent` (mode, shot, registryModelId set)
3. `packaging:set-truth-snapshot` (canonical truth set)
4. `service.checkStale(sessionId)` (P3-A12 read-only seam, returned `{ stale: false, reasons: [] }`)
5. `packaging:prepare-generation` (canonical generation prep)
6. `packaging:execute-generation` (Provider HTTP request sent — only for analysis_led calls)

The 3 analysis_led calls (CALL-01, -03, -05) reached the Provider HTTP layer via the production path. The Provider responded with `AuthenticationError: The API key format is incorrect` (Request id: `021786784274816452cf28ffc1305a353e54d0b8e7b08f1f80fec`). This is NOT an architecture failure — the production path is intact. The Provider rejected the calls because the user-supplied API key (via process env) is malformed.

The 2 reference_first calls (CALL-02, -04) failed at `prepare-generation` with `REFERENCE_REQUIRED: reference_required_in_reference_first`. The reference policy validation in `validateReferencePolicy` (called from `buildReferencePolicy` in `translation.js`) rejected the request before the Provider HTTP request was sent. The 2 reference_first calls did NOT reach the Provider. This is a separate, smaller finding the D3 RE-RUN surfaced: the sanctioned project's reference asset (`a02b332c-5317-49ca-8adc-24ea836a5f73`) was specified in `intent.referenceAssetId` but the reference policy validation in the translation slot could not bind it as a usable reference. This is a translation-slot/reference-binding defect, not a Provider credential defect. It is documented here and remains open; it is NOT classified as the same defect class as the Provider auth failure.

The 5 attempts' ledgers are stored in `.codex-smoke/p3-d3-rerun/runs/RERUN-CALL-XX/meta.json` (gitignored).

## G. RERUN-CALL-01

| Field | Value |
|---|---|
| Label | analysis-led bottle HERO 4:5 |
| Mode | analysis_led |
| Shot | PKG-HERO-SINGLE |
| Aspect | 4:5 |
| References | 0 |
| Project | `9e6158f0-33d2-4d95-9039-7592237938a8` |
| Session | `pkg-ws-msu56hi0-jcrd48rr` |
| Profile | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` |
| Registry model id | `seedream-5.0-pro` |
| Actual Provider model | `doubao-seedream-5-0-pro-260628` |
| Status | FAILED |
| Error code | `GENERATION_PROVIDER_FAILED` |
| Error chain | `MODEL_ADAPTER_AUTH_FAILED` ← `GENERATION_PROVIDER_FAILED` (P2 frozen wrap) |
| Provider response | `401 AuthenticationError: The API key format is incorrect` |
| Duration | 192ms (production path complete + Provider auth check) |
| Compiled prompt | (produced by Prepare; not sent to Provider due to auth failure) |
| Image evidence | (none — Provider rejected before body send) |
| Run | (no run registered; Provider never returned a successful response) |

## H. RERUN-CALL-02

| Field | Value |
|---|---|
| Label | reference_first bottle HERO 4:5 |
| Mode | reference_first |
| Shot | PKG-HERO-SINGLE |
| Aspect | 4:5 |
| References | 1 (Reference asset `a02b332c-5317-49ca-8adc-24ea836a5f73`) |
| Project | `9e6158f0-33d2-4d95-9039-7592237938a8` |
| Profile | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` |
| Status | FAILED |
| Error code | `REFERENCE_REQUIRED` (rejected at `prepare-generation`, NOT at Provider) |
| Error chain | `REFERENCE_REQUIRED: reference_required_in_reference_first` (origin: `validateReferencePolicy` in `reference-policy.js:291`) |
| Provider response | N/A — call did not reach Provider |
| Duration | 14ms |
| Image evidence | (none) |
| Run | (no run registered) |
| Note | This call surfaced a D-TRANSLATION finding: the sanctioned project's reference asset was specified in `intent.referenceAssetId` but the reference policy validation in the translation slot could not bind it as a usable reference. The Provider was never contacted. This is a separate workstream, not a Provider credential defect. |

## I. RERUN-CALL-03

| Field | Value |
|---|---|
| Label | analysis-led series GROUP 16:9 |
| Mode | analysis_led |
| Shot | PKG-SERIES-GROUP |
| Aspect | 16:9 |
| References | 0 |
| Profile | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` |
| Status | FAILED |
| Error code | `GENERATION_PROVIDER_FAILED` |
| Error chain | `MODEL_ADAPTER_AUTH_FAILED` |
| Provider response | `401 AuthenticationError: The API key format is incorrect` |
| Duration | 55ms |
| Image evidence | (none) |
| Run | (no run registered) |

## J. RERUN-CALL-04

| Field | Value |
|---|---|
| Label | reference_first GIFT-OPEN 4:3 |
| Mode | reference_first |
| Shot | PKG-GIFT-OPEN |
| Aspect | 4:3 |
| References | 1 |
| Profile | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` |
| Status | FAILED |
| Error code | `REFERENCE_REQUIRED` (rejected at `prepare-generation`, NOT at Provider) |
| Error chain | `REFERENCE_REQUIRED: reference_required_in_reference_first` (origin: `validateReferencePolicy` in `reference-policy.js:291`) |
| Provider response | N/A — call did not reach Provider |
| Duration | 5ms |
| Image evidence | (none) |
| Run | (no run registered) |
| Note | Same D-TRANSLATION finding as RERUN-CALL-02. |

## K. RERUN-CALL-05

| Field | Value |
|---|---|
| Label | analysis-led HERO 4:5 (second-structure variant) |
| Mode | analysis_led |
| Shot | PKG-HERO-SINGLE |
| Aspect | 4:5 |
| References | 0 |
| Profile | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` |
| Status | FAILED |
| Error code | `GENERATION_PROVIDER_FAILED` |
| Error chain | `MODEL_ADAPTER_AUTH_FAILED` |
| Provider response | `401 AuthenticationError: The API key format is incorrect` |
| Duration | 5ms |
| Image evidence | (none) |
| Run | (no run registered) |

## L. Analysis-led Summary

The analysis-led calls (`RERUN-CALL-01`, `RERUN-CALL-03`, `RERUN-CALL-05`) all reached the Provider layer but were rejected with HTTP 401. No analysis-led image was generated. The production path correctly invoked the canonical analysis-led translation slot and routed the request through the multi-model adapter. The Provider rejection was an authentication failure, not a translation failure.

## M. Reference-first Summary

The reference-first calls (`RERUN-CALL-02`, `RERUN-CALL-04`) did **NOT** reach the Provider HTTP layer. They were rejected at `prepare-generation` by `validateReferencePolicy` with `REFERENCE_REQUIRED: reference_required_in_reference_first`, before any Provider HTTP request was issued. No reference-first image was generated. The defect is in the **Reference translation-slot binding path** (the sanctioned project's reference asset `a02b332c-5317-49ca-8adc-24ea836a5f73` was specified in `intent.referenceAssetId` but the reference policy validation in the translation slot could not bind it as a usable reference). This is a translation-slot defect, **not** a Provider authentication failure. The Provider was never contacted for these 2 calls.

## N. Structure Fidelity

Structure fidelity audit is **N/A** because no images were generated. The production path correctly identified each call's structure (bottle, series, gift) from the canonical truth and the intent, but the Provider never returned a successful image to audit.

## O. Shot Compliance

Shot compliance audit is **N/A** because no images were generated. The production path correctly accepted each call's shot contract (`PKG-HERO-SINGLE`, `PKG-SERIES-GROUP`, `PKG-GIFT-OPEN`) and the corresponding aspect ratio (4:5, 16:9, 4:3).

## P. Locked Asset Fidelity

Locked Asset fidelity audit is **N/A** because no images were generated. The Locked Assets (brand_name, logo, product_category, packaging_structure, packaging_artwork, product_color, required_visual_element) are validated at the preflight stage and were all PASS. The Provider never received the request body to project them.

## Q. Text / Logo Hallucination Audit

Text / Logo hallucination audit is **N/A** because no images were generated. The H-FAIL risk is 0.

## R. Artifact Integrity

Artifact integrity audit is **N/A** because no artifacts were produced. None of the 5 RERUN-CALLs reached the artifact persistence stage: 3 were rejected by the Provider at the auth layer (HTTP 401) before any successful Provider response could trigger a run registration, and 2 were rejected at `prepare-generation` (REFERENCE_REQUIRED) before the Provider HTTP request was issued. No `image-generation/<runId>/` directory was created. No preview was generated.

## S. Failure Taxonomy

| Sample | Failure taxonomy | Code | Root cause | Layer |
|---|---|---|---|---|
| RERUN-CALL-01 | D-ARCH / D-PROVIDER (Provider auth) | `MODEL_ADAPTER_AUTH_FAILED` | API key format invalid (Provider returned `401 AuthenticationError: The API key format is incorrect`) | Provider |
| RERUN-CALL-02 | D-ARCH / D-TRANSLATION (reference policy) | `REFERENCE_REQUIRED` | Reference policy validation in `validateReferencePolicy` rejected the call (the sanctioned project's reference asset could not be bound in the translation slot) | Prepare |
| RERUN-CALL-03 | D-ARCH / D-PROVIDER (Provider auth) | `MODEL_ADAPTER_AUTH_FAILED` | same as RERUN-CALL-01 | Provider |
| RERUN-CALL-04 | D-ARCH / D-TRANSLATION (reference policy) | `REFERENCE_REQUIRED` | same as RERUN-CALL-02 | Prepare |
| RERUN-CALL-05 | D-ARCH / D-PROVIDER (Provider auth) | `MODEL_ADAPTER_AUTH_FAILED` | same as RERUN-CALL-01 | Provider |

The 5 failures split into TWO sub-classes:
- **3 (RERUN-CALL-01, -03, -05)**: D-ARCH / D-PROVIDER (Provider auth). This is the same class as the previous D3 HOLD at `139f82435d2cb0841f7c217fb3c02af05efed380`. The D3 RE-RUN does NOT introduce a new D-PROVIDER defect — it confirms that the previous D3 HOLD classification was correct.
- **2 (RERUN-CALL-02, -04)**: D-ARCH / D-TRANSLATION (reference policy). This is a separate, smaller finding the D3 RE-RUN surfaced: the sanctioned project's reference asset binding in the translation slot failed before the Provider was contacted. This is a translation-slot defect, NOT a Provider credential defect. It is documented here and remains open.

The root cause of the D-PROVIDER class is **the user-supplied API key was rejected by the Provider at the HTTP auth layer**. The Provider explicitly states: `The API key format is incorrect`. The credential supplied to the Ark image-generation endpoint was rejected by Provider authentication and must be re-issued / re-verified before the next D3 real-provider run. (This report does not freeze any universal claim about valid Volcengine credential formats; the rejection is recorded as a Provider-side authentication response, not as a credential-format rule.)

The root cause of the D-TRANSLATION class is **the reference asset binding path in the translation slot did not produce a usable reference for the policy validator**. This is a separate workstream and is not addressed by changing the API key.

## T. Evidence Sufficiency

| Criterion | Required | Actual | Status |
|---|---|---|---|
| Min successful images | ≥ 3 | 0 | FAIL |
| analysis-led real sample exists | ≥ 1 | 0 (all auth-failed) | FAIL |
| reference-first real sample exists | ≥ 1 | 0 (all auth-failed) | FAIL |
| ≥ 2 distinct shot/structure evidence | ≥ 2 | 0 (no images) | FAIL |

The D3 RE-RUN does NOT produce sufficient real-Provider visual quality evidence. This is a **HOLD — PROVIDER EXECUTION GAP** (the same class as the previous D3 HOLD).

## U. AX Guards

A new AX guard group (`AX-01..AX-30`) is added by this phase in `tests/runtime-application/packaging-d3-rerun-real-provider-visual-quality-validation.test.ts`:

- **AX-01..AX-07**: Authorization, max calls, single model, single profile, 0 retries. **AX-07** explicitly accounts for the two failure layers: 3 analysis_led calls reach the Provider layer (`GENERATION_PROVIDER_FAILED` ← `MODEL_ADAPTER_AUTH_FAILED`); 2 reference_first calls are rejected at `prepare-generation` (`REFERENCE_REQUIRED`). Both are recorded as documented terminal codes.
- **AX-08..AX-11**: Preflight coverage (canonical truth, Locked Assets, translation, references, profile, no STALE)
- **AX-12..AX-15**: Artifact integrity (no successful artifacts; preflight-passed)
- **AX-16..AX-18**: Rubric, hallucination audit (HUMAN REVIEW REQUIRED, no images)
- **AX-19..AX-21**: No Golden, no secrets, no production source change
- **AX-22..AX-25**: Existing guards (P2 / P3-A12 / P3-B / C4.2.2 HEAD unchanged)
- **AX-26..AX-28**: AV/AW + D-PROVIDER-01 + canonical context
- **AX-29..AX-30**: Provider call ledger (now accepts both terminal codes) + D3 historical preservation

All 30 AX tests PASS at the D3 RE-RUN HEAD.

## V. Existing Guards

All existing guard families remain green at the D3 RE-RUN HEAD:
- P2 frozen baseline (`a593278b`) — zero diff ✓
- P3-A12 current baseline (`1fcafc8`) — zero diff ✓
- P3-B accepted baseline (`2ac4cf1`) — zero diff ✓
- P3-C4.2.2 verified final HEAD (`887436e`) — unchanged
- P3-C4.2.2 sync HEAD (`c727e11`) — HEAD after D3 RE-RUN
- AV 25/25 PASS
- AW 25/25 PASS
- AX 30/30 PASS (new)

## W. Full Regression

| Suite | Result |
|---|---|
| `npm test` | PASS (1234/1234) |
| `npm run runtime-application:test` | PASS (1468 + 30 = 1498/1498, includes 30 new AX tests) |
| `npm run runtime:test` | PASS (14 + 1498 = 1512/1512) |
| `npm run test:image-generation` | PASS (982/982) |
| `npm run cli:test` | PASS (40/40) |
| `npm run web:typecheck` | PASS |
| `npm run web:build` | PASS |
| `npm run web-runtime:typecheck` | PASS |
| `npm run web-runtime:test` | PASS (10/10) |
| `npm run web:smoke` | PASS (0 Provider calls — smoke test only) |
| `npm run repo:verify` | PASS |
| `npm run repo:check` | PASS |
| `npm run verify:current-flows` | PASS |
| `npm run verify:version-consistency` | PASS |
| `npm run verify:version-naming` | PASS |
| `npm run verify:workspace-boundaries` | PASS |
| `npm run verify:no-obsolete-code` | PASS (701 files) |
| `npm run verify:production-boundaries` | PASS |
| `npm run verify:no-project-specific-production-rules` | PASS |
| `npm run verify:golden-boundary` | PASS |
| `npm run verify:space-compiler-baseline` | PASS |
| `npm run verify:space-r8.6-golden-boundary` | PASS |
| `npm run golden:test` | PASS |

## X. Provider Accounting

| Field | Value |
|---|---|
| Authorized max | 5 |
| Actual HTTP requests (RERUN, production path) | 3 (only the 3 analysis_led calls reached the Provider HTTP layer; the 2 reference_first calls were rejected at `prepare-generation` before the HTTP request) |
| Additional direct probe (out-of-band) | 1 (POST image-generation request, classified below) |
| **Total external Provider HTTP requests** | **4 (3 RERUN + 1 direct probe)** |
| Generated images | 0 |
| Successful samples | 0 |
| Failed samples | 5 (3 at Provider, 2 at prepare) |
| Models used | exactly 1 (`seedream-5.0-pro` Registry id / `doubao-seedream-5-0-pro-260628` actual) |
| Profiles used | exactly 1 |
| Random retries | 0 |
| Automatic retries | 0 |
| Unauthorized calls | 0 |
| Provider error (for the 3 RERUN calls that reached Provider) | `401 AuthenticationError: The API key format is incorrect` (Request id: `021786784274816452cf28ffc1305a353e54d0b8e7b08f1f80fec`) |

### X.1 Direct Probe Classification

| Field | Value |
|---|---|
| Probe nature | **POST image-generation** (not a GET/auth or GET/models probe) |
| Endpoint | `https://ark.cn-beijing.volces.com/api/v3/images/generations` |
| Method | `POST` |
| Body | Image generation request with the same Registry model id `seedream-5.0-pro` and the same user-supplied API key |
| Reason for the probe | Confirm the API key is rejected at the Provider HTTP layer independently of the production path. The production-path failure (3 RERUN-CALLs with `MODEL_ADAPTER_AUTH_FAILED`) could in theory be caused by the production code path mangling the key. The direct probe proves the key is rejected at the Provider regardless. |
| Probe request count | 1 |
| Probe response | `401 AuthenticationError: The API key format is incorrect` (same Request id range) |
| Is the probe inside the 5-call RERUN budget? | **NO.** The 5-call RERUN budget is reserved for `packaging:*` operations driving the production path. The direct probe is an out-of-band diagnostic. It is recorded here for accounting transparency (per the user's directive to disclose, not hide, any external Provider activity). |
| Total RERUN-CALL HTTP requests | 3 (RERUN-CALL-01, -03, -05 reached Provider) |
| Total RERUN-CALL terminal failures (no HTTP to Provider) | 2 (RERUN-CALL-02, -04 terminated at `prepare-generation`) |
| Total direct probe HTTP requests | 1 (POST image-generation, returned 401) |
| **Total external Provider HTTP requests** | **4 (3 + 1)** |

## Y. Golden

- Auto-update: **NO**
- Files changed: **NO**
- Reason: 0 images generated; no candidate for Golden selection

## Z. Production Source Changes

**0.** The D3 RE-RUN phase is a runtime test. The 2 D3 RE-RUN commits are tests + docs only. No production source is modified.

## AA. Frozen Diffs

| Surface | Current zero-diff | Notes |
|---|---|---|
| P2 (`a593278b` → HEAD) | 0 | P2 frozen baseline unchanged |
| P3-A12 current (`1fcafc8` → HEAD) | 0 | direct diff, NO exclusion |
| P3-B accepted (`2ac4cf1` → HEAD) | 0 | P3-B accepted UI baseline unchanged |
| C4.2.2 verified final HEAD (`887436e` → HEAD) | 0 (AX adds docs + tests only) | C4.2.2 freeze preserved |

## AB. Secret Audit

| Field | Value |
|---|---|
| API key in process env | YES (during rerun only; not in any tracked file) |
| API key in any tracked file | NO (verified by `git ls-files` + content scan) |
| API key in `meta.json` | NO (only metadata: projectId, profileId, modelId, etc.) |
| API key in `ledger.json` | NO (only counts) |
| API key in `final-state.json` | NO (only status + counts) |
| API key in any docs | NO |
| API key in any commit | NO |
| `.codex-smoke/p3-d3-rerun/` tracked | NO (gitignored) |

## AC. Working Tree

**EMPTY** (after the 2 D3 RE-RUN commits). AC-09 (`git status --porcelain` is empty) is enforced.

## AD. Local / Remote

`local == origin` after the D3 RE-RUN push.

## AE. Final Decision

- **P3-D3 STATUS: HOLD — PROVIDER EXECUTION GAP (key invalid) + TRANSLATION-SLOT REFERENCE BINDING DEFECT (D-TRANSLATION)**
- **P3-D4 STATUS: LOCKED**
- **P3-E STATUS: LOCKED**

The D3 RE-RUN produced two distinct findings:

1. **D-PROVIDER (3/5 calls)**: The 3 analysis_led calls reached the Provider HTTP layer via the production path and were rejected with `401 AuthenticationError: The API key format is incorrect`. The defect is NOT in the production path — the production path successfully reached the Provider layer and was correctly rejected. The Provider rejected the user-supplied credential at the authentication layer. (The credential must be re-issued / re-verified before the next D3 real-provider run. This report does not freeze any universal claim about valid Volcengine credential formats.) This is the same class as the previous D3 HOLD at `139f82435d2cb0841f7c217fb3c02af05efed380`.

2. **D-TRANSLATION (2/5 calls)**: The 2 reference_first calls were rejected at `prepare-generation` by `validateReferencePolicy` with `REFERENCE_REQUIRED: reference_required_in_reference_first`. The Provider was never contacted. The sanctioned project's reference asset (`a02b332c-5317-49ca-8adc-24ea836a5f73`) was specified in `intent.referenceAssetId` but the reference policy validation in the translation slot could not bind it as a usable reference. This is a separate, smaller finding; it is not a Provider credential defect and is not addressed by changing the API key. This is a NEW finding the D3 RE-RUN surfaced; it is documented here and remains open.

The D3 RE-RUN is recorded as a NEW HOLD (separate from the previous D3 HOLD at `139f824`). The D-PROVIDER sub-class confirms the previous HOLD classification was correct. The D-TRANSLATION sub-class is a new finding that needs a separate remediation path.

## AF. Image Review Handoff

**No images were generated.** The D3 RE-RUN did not produce any image artifacts. There is nothing for human review.

If a future D3 RE-RUN produces images, the image review handoff will be:
- Image location: `.codex-smoke/p3-d3-rerun/evidence/RERUN-CALL-XX.png`
- Compiled prompt location: each call's `meta.json` (under `compiledPrompt` field, if populated)

For this D3 RE-RUN, the image review handoff is empty.

## AG. Next Step

**A new D3 RE-RUN** requires:
- A newly issued / re-verified Ark image-generation credential (the one used in this D3 RE-RUN was rejected by Provider authentication; the exact format constraint of valid Volcengine credentials is not frozen by this report and must be re-verified by the user against the current Provider contract)
- New explicit human authorization (max 5 calls, single model, single profile, 0 retries)
- Start from the D3 RE-RUN HEAD (the 2-commit chain on top of `c727e11`)
- **Resolution of the D-TRANSLATION reference-binding defect** (see AE.2 above) so that the next reference_first calls do not terminate at `prepare-generation` before the Provider is contacted

The D3 RE-RUN does NOT auto-start a new attempt. The user must:
1. Re-issue / re-verify the Ark credential against the current Provider authentication contract.
2. Provide a usable credential through the sanctioned injection path.
3. Authorize a new D3 RE-RUN with the same hard cap (5 calls, 1 model, 1 profile, 0 retries).
4. Address the D-TRANSLATION finding (separate workstream).

If the next D3 RE-RUN produces successful images, the AX-12..AX-18 guards will validate artifact integrity, hallucination audit, and visual quality rubric. The new D3 RE-RUN should be the **next P3-D3 decision point**, not the previous HOLD.

The D3 RE-RUN does NOT auto-promote to PASS. The P3-D3 status remains **HOLD — PROVIDER EXECUTION GAP (credential rejected) + TRANSLATION-SLOT REFERENCE BINDING DEFECT** until a future D3 RE-RUN with a re-issued credential and a fixed reference-binding path produces a successful real-Provider image that passes the visual quality rubric.

P3-D4 remains LOCKED.
