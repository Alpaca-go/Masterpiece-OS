# P3-D3 RE-RUN #2A — CALL-01 Credential / Production Canary (HOLD)

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `48d68f966f7f69fc849ca82ee571e295a606d416` (resolved via `git rev-parse HEAD`)
**Authorization:** NEW explicit human real-provider authorization — CALL-01 only
**Status:** **HOLD — PROVIDER EXECUTION GAP** (credential / Provider auth rejected)
**External image-generation HTTP calls:** 1 (authorized max 1; no retry)
**Generated images:** 0
**Production source changes:** 0
**Test source changes:** 0
**Golden update:** NO

---

## A. Git

| Field | Value |
|---|---|
| Branch | `codex/visual-analysis-a1-multi-provider` |
| Start HEAD (resolved) | `48d68f966f7f69fc849ca82ee571e295a606d416` |
| Working tree | clean (no tracked change from this canary) |

---

## B. Authorization (CALL-01 only)

| Field | Authorized |
|---|---|
| External image-generation HTTP calls | MAX 1 |
| Generated images | MAX 1 |
| Registry model | `seedream-5.0-pro` |
| Provider API model | `doubao-seedream-5-0-pro-260628` |
| API profiles | exactly 1 (`profile-e871b4c5-7499-4749-b838-02410ad19cb1`) |
| Provider | Volcengine / Ark |
| Retries | 0 |
| Fallback / second model / second profile | NO |
| Direct probe / GET /models | NO |
| Prompt tuning | NO |
| Golden update | NO |
| CALL-02..05 | NOT AUTHORIZED |

---

## C. Credential Gate

```
CREDENTIAL ENV: SET
```

`MASTERPIECE_API_KEY` is present (User scope). Only presence was recorded; no key content, prefix, suffix, or length was read/printed/persisted.

The production `node-credential-store` resolves the key from `MASTERPIECE_API_KEY_<PROFILE>` then `MASTERPIECE_API_KEY` (env); the canary driver used the production `getProviderCredentials(profileId)` seam (no direct key handling, no key logging).

---

## D. CALL-01 Offline Preflight

`analysis_led / PKG-HERO-SINGLE / 4:5 / 0 references` through the canonical production path (workspace `create-session → update-intent → set-truth-snapshot → checkStale → prepare-generation`):

| Check | Result |
|---|---|
| project identity | PASS (sanctioned project `9e6158f0`) |
| Locked Assets | PASS (canonical project truth) |
| PackagingTranslation | PASS (real P2 frozen prepare) |
| generationMode | PASS (`analysis_led`) |
| Shot Contract | PASS (`PKG-HERO-SINGLE`, 4:5) |
| profile enabled | PASS (`profile-e871b4c5…`) |
| Registry model valid | PASS (`seedream-5.0-pro`, capability accepted) |
| Provider API identity resolved | PASS (`doubao-seedream-5-0-pro-260628`, baseUrl `…/api/v3/images/generations`) |
| no STALE | PASS (`{ stale: false, reasons: [] }`) |
| Prepare READY | PASS (`status: ready`, prepared snapshot present) |
| artifact destination | PASS (`<project>/image-generation/<runId>/`) |

Preflight PASS. No production change was needed.

---

## E. CALL-01 Real Provider Call

The single authorized call went through the canonical production path:

```
Workspace → Prepare → Execute → Packaging Artifact Store deps
→ multi-model adapter → Volcengine Seedream endpoint → Run / Artifact lifecycle
```

**Result: FAILED at the Provider layer.**

```
GENERATION_PROVIDER_FAILED
  └─ MODEL_ADAPTER_AUTH_FAILED   (HTTP 401/403 — credential / Provider auth rejected)
```

The Provider rejected the request at authentication. No image was returned; no run / artifact was created. This is the same failure class as the historical D3 / D3 RE-RUN auth rejections — a credential/Provider execution gap, NOT a production defect.

---

## F. Provider Accounting

```
Authorized Provider calls:      1
Actual Provider HTTP calls:     1
Successful responses:           0
Generated images:               0
Failed calls:                   1   (MODEL_ADAPTER_AUTH_FAILED)
Retries:                        0
Models:                         1
Profiles:                       1
Direct probes:                  0
Unauthorized calls:             0
```

No retry was attempted. Remaining authorization (CALL-02..05) is NOT consumed and NOT carried forward.

---

## G. Canary Decision

```
CALL-01 CANARY:   FAIL   (credential / Provider auth rejected)
P3-D3:            HOLD — PROVIDER EXECUTION GAP
P3-D4:            LOCKED
P3-E:             LOCKED
```

Per P3-D3 RE-RUN #2A §7 / §13A: the canary failed at the Provider auth layer; STOP. No further calls.

---

## H. Failure Taxonomy

- **D-PROVIDER** (credential rejected by Provider) — the production path reached the Provider and the Provider rejected authentication (HTTP 401/403). This matches the historical D3 / D3 RE-RUN auth failure class.
- NOT a D-ARCH / D-REFERENCE / D-ARTIFACT / D-QUALITY defect.
- NOT a production execution gap: prepare, preflight, execution deps, and artifact lifecycle wiring all behaved correctly up to the Provider auth handshake.

---

## I. Secret Audit

- No API key content was read, printed, echoed, or persisted.
- No prefix / suffix / length was logged.
- The driver and this document contain no credential material.
- Production redaction layer sanitized the Provider error message.

---

## J. Production / Golden / Regression

- Production source changes: **0**
- Test source changes: **0**
- Golden: **NO UPDATE**
- No offline regression is required for a canary that changed no code; the P3-D3.2 post-commit `repo:verify` baseline remains valid.

---

## K. Working Tree / Local / Remote

- Working tree: EMPTY (this canary made no tracked change).
- Local == Remote: MATCH at Start HEAD `48d68f9`.

---

## L. Final Decision

```
P3-D3:  HOLD — PROVIDER EXECUTION GAP
CALL-01 CANARY: FAIL
P3-D4:  LOCKED
P3-E:   LOCKED
```

---

## M. Next Step

1. User re-issues a valid Volcengine / Ark credential for `seedream-5.0-pro` (the current `MASTERPIECE_API_KEY` is rejected by the Provider at auth).
2. On a new explicit authorization with a working credential, re-run CALL-01 canary (fresh 1-call budget). The production path is healthy and offline preflight PASSes.
3. **STOP. No automatic re-run. No CALL-02..05 without a new authorization.**
