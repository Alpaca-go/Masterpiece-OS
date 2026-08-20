# CI-W1C.7.2 — Live Model-Assisted Text Qualification & Human Direction Review
# Final Report

> **Status:** VALIDATION / LIVE QUALIFICATION (FAILED AT PREFLIGHT)
> **Date:** 2026-08-20
> **Target Branch:** `feat/short-chain-simplified-ui`
> **Baseline HEAD (CI-W1C.7.1A)**: `a55bb52888fe2552bea4908979569232cc36f355`
> **Final HEAD (this phase)**: (filled at commit time)
> **Verdict**: **HOLD_FOR_PROVIDER_RUNTIME_DEFECT**

---

## 1. Baseline

| Item | Value |
|---|---|
| Branch | `feat/short-chain-simplified-ui` |
| Baseline HEAD | `a55bb528` (CI-W1C.7.1A) |
| Local == origin | YES (no remote advance) |
| Working tree | 1 known untracked smoke artifact (excluded) |

```
?? logs/
?? space-generator/v1-experimental/prompt-compiler/anchor-aware/results/ab-comparison-report.json
```

---

## 2. Commits (this phase)

Recommended commit plan (single small HOLD commit, per the spec's
STOP rule):

1. `docs(ci-w1c.7.2): record live qualification preflight HOLD`

(No production code change, no new tests, no new model calls —
the failure was at the profile-resolution preflight.)

---

## 3. G01 / G02 status

| Project | Status |
|---|---|
| G01 九州美学 | **NOT_RUN** — profile resolution failed at preflight |
| G02 一剂良方 | **NOT_RUN** — G01 did not pass, so G02 is gated per spec PART F |

The spec is explicit:
> "If profile resolution fails: STOP, HOLD_FOR_PROVIDER_RUNTIME_DEFECT"
> "If G01 fails: STOP. DO NOT run G02."

---

## 4. Profile resolution attempt (PART B)

See `qualification-profile.md` for the full record.

### 4.1 Credentials directory

```
C:\Users\Administrator\AppData\Roaming\masterpiece-os-desktop\credentials\
  profile-397281cc-653f-4822-ae4e-601ca7f8a63b.bin  (148 bytes, header "v10d")
  profile-769df0ac-e338-44c7-b23e-33f15f1b6ac0.bin  ( 77 bytes, header "v10C")
  profile-7776a9f6-7270-47b5-9e7d-4d552a1c5376.bin  ( 77 bytes, header "v10m")
  profile-e871b4c5-7499-4749-b838-02410ad19cb1.bin  ( 77 bytes, header "v10"+0xD5)
```

None of these are the documented 2310 smoke profile IDs. They
are in a legacy format the current Web Host resolver does not
recognize.

### 4.2 Web Host `settings.get` result

```json
{
  "profiles": [],
  "defaultProfileId": null,
  "provider": "",
  "model": "",
  "hasApiKey": false,
  "connectionStatus": "untested"
}
```

**No profile is resolvable. No API key is configured. The
default profile is null. The connection has never been tested.**

### 4.3 Model registry (read-only)

The `modelRegistry` portion is intact and lists `qwen3.6-plus`
(dashscope) as the default analysis model, but it cannot be used
without an API key.

---

## 5. Failure classification (per spec PART E)

| Category | Status |
|---|---|
| prompt | N/A (no model called) |
| model capability | N/A (no model called) |
| input quality | N/A (no model called) |
| gate | N/A (no model called) |
| report presentation | N/A (no model called) |
| **profile / credentials** | **FAIL — 0 profiles resolved, 0 API keys available** |

The defect is in the **provider-runtime credentials layer**, NOT
in the Creative Intelligence reasoning layer (which is
READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION per CI-W1C.7.1A).

---

## 6. Live model calls

| Metric | Value |
|---|---|
| Analysis provider calls | 0 |
| Image provider calls | 0 |
| Total text calls | 0 / 12 allowed |
| API tokens spent | 0 |
| Latency measured | 0 ms |

**Zero paid API calls were made.** The qualification stopped
at the preflight before any model call.

---

## 7. G01 / G02 / Cross-project / Human review sections

Per the spec:
> "If G01 fails: G02 files may be absent, but final report must
> say: G02 NOT_RUN due to G01 gate."

The following sections are NOT present because the failure
happened at preflight, before G01:

- ❌ `g01-live-qualification.md` — G01 was not started
- ❌ `g01-human-review.md` — no model output to review
- ❌ `g02-live-qualification.md` — G02 was not started (gated by
  G01)
- ❌ `g02-human-review.md` — no model output to review
- ❌ `cross-project-comparison.md` — no outputs to compare
- ❌ `api-usage-record.md` — no API calls were made

The only `ci-w1c.7.2` document is `qualification-profile.md`
(this file's parent), which records the failure.

---

## 8. Regression (PART K)

Per the spec, regression runs even when the qualification fails:

| Command | Result |
|---|---|
| `npm test` | (pre-existing failures unchanged; see §9) |
| `npm run runtime:test` | (pre-existing failures unchanged) |
| `npm run web-runtime:test` | PASS (0 fail) |
| `npm run cli:test` | (pre-existing failures unchanged) |
| `npm run web:typecheck` | PASS |
| `npm run verify:version-consistency` | PASS |
| `npm run verify:version-naming` | PASS |
| `npm run verify:workspace-boundaries` | PRE-EXISTING FAIL (line 218 script bug) |
| `npm run verify:production-boundaries` | PASS |
| `npm run verify:golden-boundary` | PASS |
| `npm run verify:no-obsolete-code` | PASS |
| `npm run verify:no-project-specific-production-rules` | PASS |
| `npm run verify:tracked-runtime-assets` | PASS |
| `npm run verify:current-flows` | PRE-EXISTING FAIL |

(Full regression run is in the spec; for the HOLD verdict, the
relevant check is that **no new failures were introduced**.)

---

## 9. Pre-existing failures (unchanged from CI-W1C.7.1A)

| Failure | Source |
|---|---|
| `verify:workspace-boundaries` line 218 script bug | pre-existing in CI-W1C.7.1 |
| `verify:current-flows` BE-19 / packaging-* / short-chain-default-entry | pre-existing in CI-W1C.7.1 |
| `tests/image-generation/contracts-schema.test.js` V3 source bundle | pre-existing in CI-W1C.7 |
| `tests/packages/creative-intelligence/decision-runtime-parity.test.js` 1ms timing flake | pre-existing |
| 16 C4.2.x diff-against-historical-baseline runtime tests | pre-existing in CI-W1C.7.1 |

**0 new failures introduced by this phase.**

---

## 10. New failures

**0.**

---

## 11. Analysis / image provider call count

```
analysisProviderCallCount: 0
imageProviderCallCount:    0
```

**Zero paid API calls. Zero image generations.** The
qualification was aborted at the preflight, before any model
call.

---

## 12. Production semantic delta

**Zero production code changes.** The agent did not modify any
production code in this phase. The defect is in the credentials
layer (OS-level), not in the Creative Intelligence code.

---

## 13. Frozen surfaces preserved

All CI-W1C.7.1A frozen surfaces remain frozen:
- Document Intelligence, DVC, Truth, Conflict Detector
- Concept / Direction gates, CI-7 Evaluation, Selection, Canon
- Anchor, Image Runtime, Translation, Space / Packaging consumers
- CI-W1C.6 legacy visual demotion
- CI-W1C.7.1 prompt builders
- CI-W1C.7.1A semantic fingerprint + budget gate
- CI-10 (NOT STARTED)
- LEGACY_VISUAL_EVIDENCE demoted
- Recommendation != Selection

---

## 14. Hard rules (PART J)

| Rule | Value |
|---|:---:|
| 0 image provider calls | 0 (no calls were attempted) |
| 0 analysis provider calls | 0 (no calls were attempted) |
| 0 unsupported FACT | 0 (no model output) |
| 0 legacy visual positive authority | 0 (no model output) |
| 0 locked conflict | 0 (no model output) |
| 0 prohibited violation | 0 (no model output) |
| 0 mock output | 0 (no model output) |
| 0 cross-project contamination | 0 (no G02 to compare) |
| 0 new regression | 0 |

**All hard rules = 0. PASS for the layer that was actually
exercised (the preflight).**

---

## 15. Final verdict

**`HOLD_FOR_PROVIDER_RUNTIME_DEFECT`**

The CI-W1C.7.2 preflight failed because no analysis profile can
be resolved and no API key is configured. The Creative
Intelligence reasoning pipeline is fully ready (per
CI-W1C.7.1A `READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION`), but
the provider-runtime credentials layer is not.

---

## 16. To unlock CI-W1C.7.2

The user must:

1. **Open the Masterpiece OS Desktop settings UI** (or run the
   CLI profile management flow) and create a new analysis
   profile. Recommended:
   - provider: `dashscope`
   - model: `qwen3.6-plus`
   - apiKey: the user's actual Qwen API key (NEVER commit this)
2. **Re-run `apps/web-runtime/scripts/ci-w1c/list-profiles.mjs`**
   to confirm `profiles.length > 0` and `hasApiKey: true`.
3. **Re-authorize CI-W1C.7.2** with the resolved
   `analysisProfileId` so the agent can pass it to
   `creative-reasoning-service.run({ analysisProfileId, useMock: false, ... })`.

Once the preflight passes, the agent can proceed to G01 then
G02 with the same profile / model / budget / repair policy /
prompt versions.

---

## 17. CI-W1C.6.1 status

`DEFERRED` (NOT STARTED). No change since CI-W1C.7.1A.

---

## 18. CI-10 status

`NOT STARTED`. No change since CI-W1C.7.1A.

---

## 19. STOP

The agent **does NOT**:

- recreate the analysis profile (cannot — needs user credentials)
- call Qwen (cannot — no profile, no key)
- run live G01 qualification (gated by preflight failure)
- run live G02 qualification (gated by G01)
- start CI-W1C.6.1
- generate images
- start CI-10
- switch consumers

The agent **waits for the user** to:
1. Create a working analysis profile (via the OS settings UI)
2. Confirm `list-profiles.mjs` shows `profiles.length > 0`
3. Re-authorize CI-W1C.7.2 with the resolved `analysisProfileId`
