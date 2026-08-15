# P3-D3 RE-RUN #2B — CALL-01 Seedream Credential Canary (PASS)

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `a183622b65692415429b9251c42355366221971c` (resolved via `git rev-parse HEAD`)
**Authorization:** NEW explicit human real-provider authorization — CALL-01 only
**Status:** **CALL-01 CANARY: PASS** — new Seedream profile-specific credential accepted by Volcengine/Ark; canonical Packaging production execution succeeded; real image generated
**External image-generation HTTP calls:** 1 (authorized max 1; no retry)
**Generated images:** 1
**Production source changes:** 0
**Test source changes:** 0
**Golden update:** NO

---

## A. Git

| Field | Value |
|---|---|
| Branch | `codex/visual-analysis-a1-multi-provider` |
| Start HEAD (resolved) | `a183622b65692415429b9251c42355366221971c` |
| Working tree | clean (no tracked change from this canary) |

---

## B. New Authorization (recorded)

| Field | Authorized |
|---|---|
| External image-generation HTTP calls | MAX 1 |
| Generated images | MAX 1 |
| Registry model | `seedream-5.0-pro` |
| Provider API model | `doubao-seedream-5-0-pro-260628` |
| API profile | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` |
| Credential source | PROFILE-SPECIFIC |
| Provider | Volcengine / Ark |
| Retries | 0 |
| Fallback / second model / second profile | NO |
| Direct probe / GET /models | NO |
| Prompt tuning | NO |
| Golden update | NO |
| CALL-02..05 | NOT AUTHORIZED |

---

## C. Credential Source (safe booleans only)

```
PROFILE-SPECIFIC CREDENTIAL:   SET
GENERAL MASTERPIECE_API_KEY:   NOT SET
SELECTED CREDENTIAL SOURCE:    PROFILE-SPECIFIC
```

No credential content, prefix, suffix, or length was read or recorded.

---

## D. Credential Resolution

```
GET_PROVIDER_CREDENTIALS:       SUCCESS
PROFILE ID RESOLVED:            YES (profile-e871b4c5…)
CREDENTIAL FIELD PRESENT:       YES (non-empty string)
credential source:              PROFILE-SPECIFIC
```

Via the production `getProviderCredentials(profileId)` seam (`node-credential-store` reads `MASTERPIECE_API_KEY_PROFILE_E871B4C5_7499_4749_B838_02410AD19CB1`).

---

## E. Offline Preflight (CALL-01)

`analysis_led / PKG-HERO-SINGLE / 4:5 / 0 references` through the canonical production path:

| Check | Result |
|---|---|
| project identity | PASS (sanctioned project `9e6158f0`) |
| Locked Assets | PASS |
| PackagingTranslation | PASS (real P2 frozen prepare) |
| generationMode | PASS (`analysis_led`) |
| Shot Contract | PASS (`PKG-HERO-SINGLE`, 4:5) |
| profile enabled | PASS |
| Registry model valid | PASS (`seedream-5.0-pro`, capability accepted) |
| Provider API identity resolved | PASS (`doubao-seedream-5-0-pro-260628`) |
| credential resolution | SUCCESS |
| selected credential source | PROFILE-SPECIFIC |
| no STALE | PASS (`{ stale: false, reasons: [] }`) |
| Prepare READY | PASS (`status: ready`) |
| artifact destination | PASS |

Preflight PASS. No production change was needed.

---

## F. CALL-01 Real Provider Call

Single authorized call through the canonical production path:

```
Workspace → Prepare → Execute → buildExecutionDeps
→ getProviderCredentials(profileId) → multi-model adapter
→ buildSeedreamRequest → Volcengine / Ark → canonical run / artifact lifecycle
```

**Result: SUCCESS.**

---

## G. Provider Authentication Result

**ACCEPTED.** No HTTP 401/403, no `MODEL_ADAPTER_AUTH_FAILED`, no model identity error. The new profile-specific Seedream credential passed Volcengine/Ark authentication and the request completed with a real image.

---

## H. Provider Accounting

```
Authorized Provider calls:      1
Actual Provider HTTP calls:     1
Successful Provider responses:  1
Generated images:               1
Failed calls:                   0
Retries:                        0
Models:                         1   (seedream-5.0-pro / doubao-seedream-5-0-pro-260628)
Profiles:                       1   (profile-e871b4c5…)
Direct probes:                  0
Unauthorized calls:             0
```

---

## I. Artifact Lifecycle

| Field | Value |
|---|---|
| runId | `pkg-7730f56b-7b9d-4eee-8188-215900afbaa7` |
| artifact id | `image-01` |
| canonical run | `run.json` status `succeeded` (registered) |
| artifact sidecar | `packaging-generation-result.json` present |
| artifact bytes | 360240 |
| MIME | image/png |
| dimensions | 1856 × 2320 (4:5) |
| sha256 | `f3df20954eae17e0a5c32c17aa2751fa3c56c22489f0a161d74cda4260d2ab49` |
| thumbnail | `thumbnails/image-01.webp` (25176 bytes) |
| production decode/verify | `decoded=true, written=true` (download-verify) |

---

## J. Generated Image Evidence

```
GENERATED IMAGE PATH:
D:\Masterpiece-OS\.codex-smoke\p3-d3-rerun-2a\rerun-2a\evidence\RERUN2-CALL-01.png
(also canonical: <dataPath>\projects\9e6158f0-…\image-generation\pkg-7730f56b-…\images\image-01.png)
```

The image was verified with the production `downloadAndVerifyImage` (decoded, written, sha256 match, 4:5, image/png).

---

## K. Compiled Prompt Evidence

```
COMPILED PROMPT PATH:
D:\Masterpiece-OS\.codex-smoke\p3-d3-rerun-2a\rerun-2a\evidence\RERUN2-CALL-01-compiled-prompt.txt
```

2740 characters; produced by the real production P2 `preparePackagingGeneration` compiler (`payload.prompt`), 4:5, 0 references, capability accepted. Secret-safe.

---

## L. Secret Audit

- No credential content read, printed, echoed, or persisted.
- No prefix / suffix / length / substring / hash / fingerprint recorded.
- Driver and evidence contain no credential material.

---

## M. Production Changes

```
Production source changes:  0
Test source changes:        0
```

## N. Golden

```
Golden auto-update:         NO
Golden changed:             NO
```

## O. Working Tree

EMPTY after this doc commit.

## P. Local / Remote

MATCH after push of this doc commit.

---

## Q. Final Decision

```
CALL-01 CANARY:                     PASS
D-PROVIDER CREDENTIAL BLOCKER:      CLOSED
P3-D3:                              HOLD — HUMAN VISUAL REVIEW / NEXT LIVE AUTHORIZATION REQUIRED
P3-D4:                              LOCKED
P3-E:                               LOCKED
```

The new Seedream profile-specific credential is accepted by the Provider; the production Packaging path executed end-to-end and produced a real image with a canonical run + artifact + preview + compiled prompt. Visual quality is NOT auto-accepted:

```
VISUAL STATUS: HUMAN REVIEW REQUIRED
```

---

## R. Next Step

1. Human visual review of the generated image (path above) — rubric scoring per P3-D3 RE-RUN spec §16, to be performed by the user / ChatGPT.
2. On human acceptance + a new explicit authorization, the next live phase (CALL-02 reference-first HERO, etc.) may be scheduled with a fresh budget.
3. **STOP. No automatic CALL-02..05. No further Provider call.**
