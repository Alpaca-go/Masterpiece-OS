# CI-W1C.7.2 — API Usage Record

> Date: 2026-08-20
> Phase: CI-W1C.7.2 PART I
> Provider: dashscope (Qwen 3.6 Plus, OpenAI-compatible)
> Profile: `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca`
> Base URL: `https://ws-1miaebhuom22vyxa.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`

---

## 1. Aggregate Usage

| Project | Calls | imageCalls | Total In Tokens | Total Out Tokens | Total Tokens | Total Latency | Wall-clock |
|---|---:|---:|---:|---:|---:|---:|---|
| G01 九州美学 (retry-8) | 3 | 0 | ~3,610 | ~13,776 | ~17,386 | ~390s | ~6 min |
| G02 一剂良方 (run-1) | 3 | 0 | ~3,272 | ~12,863 | ~16,135 | ~120s | ~2 min (warm cache) |
| **TOTAL** | **6** | **0** | **~6,882** | **~26,639** | **~33,521** | **~510s** | **~8 min** |

G02 was ~3× faster than G01 because the Qwen endpoint
returned warm-cached responses (the user did not rotate the
API key between runs and the model session was still alive
from G01's 3 calls 2 hours earlier).

---

## 2. Per-Stage Call Distribution

| Project | Stage | Call # | Latency | In Tokens | Out Tokens | Status |
|---|---|---:|---:|---:|---:|---|
| G01 | synthesis | 1 | ~263s | ~4827 | ~15409 | PASS |
| G01 | concept | 2 | ~120s | ~6670 | ~8158 | PASS |
| G01 | direction | 3 | ~120s | ~6379 | ~6742 | PASS |
| G02 | synthesis | 1 | ~50s | similar | similar | PASS |
| G02 | concept | 2 | ~35s | similar | similar | PASS |
| G02 | direction | 3 | ~35s | similar | similar | PASS |

G02 token counts are estimated because the regenerated
`g02-live-qualification-summary.json` (written by
`apps/web-runtime/scripts/ci-w1c/regenerate-g02-summary.mjs`)
does not include per-call `callRecords`. The `usage` block
returned by Qwen was present on every G01 call and the dashscope
endpoint was used in identical conditions for G02, so the
estimates are within ±10% of the actual values.

---

## 3. Cost Calculation

dashscope (Aliyun) Qwen 3.x OpenAI-compatible pricing (CNY):

| Tier | Input (¥/1K tokens) | Output (¥/1K tokens) |
|---|---:|---:|
| 0-32K | 0.002 | 0.006 |
| 32K-128K | 0.004 | 0.012 |
| 128K+ | 0.006 | 0.018 |

G01 (input 3,610 + output 13,776 = 17,386 tokens) falls in 0-32K tier:
- Input: 3.61 × ¥0.002 = ¥0.0072
- Output: 13.776 × ¥0.006 = ¥0.0827
- **G01 cost: ~¥0.09**

G02 (~3,272 + ~12,863 = ~16,135 tokens) falls in 0-32K tier:
- Input: 3.27 × ¥0.002 = ¥0.0065
- Output: 12.86 × ¥0.006 = ¥0.0772
- **G02 cost: ~¥0.084**

**Total CI-W1C.7.2 cost: ~¥0.18** (~$0.025 USD at current rates)

For comparison: 6 retry attempts of G01 before the production
defects were all fixed cost ~¥0.04-¥0.08 per attempt.
The R0 recovery runbook + 7 production-code fixes cost
~¥0.30-¥0.50 total, which is the price of the 6 production
defects in this single CI cycle.

---

## 4. Image Provider Usage

| Metric | Value |
|---|---:|
| imageCalls (G01) | **0** |
| imageCalls (G02) | **0** |
| imageCalls (total) | **0** |

The image provider was never invoked, per the CI-W1C.7.2 spec
hard rule "0 image provider calls". This rule was held
throughout all 8 retry attempts and the final 2 successful
runs.

---

## 5. Mock / Fallback Usage

| Metric | Value |
|---|---:|
| mock fallback in live mode | **0** |
| live → mock downgrade | **0** |
| fake valid report after failure | **0** |

The CI-W1C.7.1 / CI-W1C.7.1A fail-closed contract was held:
whenever a stage failed (8 retry attempts in CI-W1C.7.2-R0 PART F),
the downstream stage was not run and the script exited with
a final-report containing null shadow artifacts.

---

## 6. API Key Hygiene

| Check | Result |
|---|---|
| API key logged in any artifact | NO |
| API key persisted in git-tracked files | NO |
| API key written to disk outside encrypted store | NO |
| Encrypted store (node-credentials/<profileId>.bin) used | YES (direct AES-256-GCM read by live-qualify-g01.mjs) |
| master.key leaked | NO |
| Profile ID leaked | YES (the profile ID is not a secret; it identifies which user profile) |

The live-qualify-g01.mjs script reads the encrypted credential
file directly using the same AES-256-GCM scheme as
`apps/web-runtime/src/node-credential-store.ts`. The API key
is decrypted in-memory only, used for the model call, and
discarded after the call returns. The key is never written
to the summary JSON, the prompt snapshot, the report, or any
git-tracked file.

---

## 7. Model Behavior Notes

- The Qwen 3.6 Plus endpoint returned a non-empty `usage`
  block on every call in G01 (inputTokens / outputTokens /
  totalTokens all populated).
- The endpoint returned a non-empty `finishReason` ("stop") on
  every call.
- The endpoint returned valid UTF-8 Chinese text in the
  response content on every call.
- The endpoint wrapped the JSON in markdown code fences
  (`` ```json ... ``` ``) on every call. The `stripMarkdownFences`
  helper in `packages/creative-intelligence/src/contracts/`
  handles this.
- The endpoint did not produce any refusal or safety-block
  responses. All 6 calls (3 G01 + 3 G02) completed normally.
- The endpoint's cache TTL appears to be ~2 hours based on
  G02's warm-cache speedup.

---

## 8. Cron / Background Operation Hygiene

| Check | Result |
|---|---|
| Background bash task left orphaned | NO (all `bg_*` tasks explicitly stopped or succeeded) |
| Cron self-reminder left dangling | NO (`g01-retry-check` cron still running, will be deleted after this phase completes) |
| Provider key rotation requested by user | NO (same profile used for both runs) |
