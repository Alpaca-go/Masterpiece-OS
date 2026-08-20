# CI-W1C.7.2 — Qualification Profile (HOLD_FOR_PROVIDER_RUNTIME_DEFECT)

> Date: 2026-08-20
> Phase: CI-W1C.7.2
> Verdict: **HOLD_FOR_PROVIDER_RUNTIME_DEFECT** (profile resolution failed)

---

## 1. Why this document exists

CI-W1C.7.2 PART B requires the agent to "Create/re-create ONE
analysis profile" before any model call. The same profile must
be used for both G01 九州美学 and G02 一剂良方.

The spec also says:
> "Verify profile resolution before model call. If profile
> resolution fails: STOP, HOLD_FOR_PROVIDER_RUNTIME_DEFECT"

This document records the preflight attempt and the failure
state. **No model call was made.**

---

## 2. Profile resolution attempt

### 2.1 Credentials directory snapshot

The OS-level credentials directory
`C:\Users\Administrator\AppData\Roaming\masterpiece-os-desktop\credentials`
contains 4 `.bin` profile files:

| File | Length | Header (first 4 bytes, hex) |
|---|---:|---|
| `profile-397281cc-653f-4822-ae4e-601ca7f8a63b.bin` | 148 | `76 31 30 64` (ASCII: `v10d`) |
| `profile-769df0ac-e338-44c7-b23e-33f15f1b6ac0.bin` | 77 | `76 31 30 43` (ASCII: `v10C`) |
| `profile-7776a9f6-7270-47b5-9e7d-4d552a1c5376.bin` | 77 | `76 31 30 6D` (ASCII: `v10m`) |
| `profile-e871b4c5-7499-4749-b838-02410ad19cb1.bin` | 77 | `76 31 30 D5` (ASCII: `v10` + 0xD5) |

All four files begin with `v1` — a versioned credential format
that pre-dates the current Web Host profile resolver.

The 2310 smoke profile IDs documented in earlier CI-W1C memories
(`profile-9eb57f7e-…`, `profile-fa854643-…`,
`profile-8e7fb1b7-…`) are **NOT present** in the current
credentials directory.

### 2.2 New Web Host profile resolution

The current profile resolution path is the Node Web Host's
`settings.get` RPC. The harness invoked this path via
`apps/web-runtime/scripts/ci-w1c/list-profiles.mjs`. The result:

```json
{
  "result": {
    "profiles": [],
    "defaultProfileId": null,
    "provider": "",
    "model": "",
    "hasApiKey": false,
    "connectionStatus": "untested"
  }
}
```

Key fields:

| Field | Value | Implication |
|---|---|---|
| `profiles` | `[]` | 0 profiles visible to the resolver |
| `defaultProfileId` | `null` | no default fallback |
| `provider` | `""` | no provider configured |
| `model` | `""` | no model configured |
| `hasApiKey` | `false` | **no API key available** |
| `connectionStatus` | `"untested"` | no connection has ever been attempted |

### 2.3 Model registry (read-only)

The `modelRegistry` portion of the same response is intact and
lists 5 supported models:

| id | type | provider | protocol | enabledByDefault |
|---|---|---|---|:---:|
| `qwen3.6-plus` | analysis | dashscope | openai-chat-multimodal | YES |
| `gpt-image-2` | image_generation | openai | openai-image-generation | YES |
| `nano-banana` | image_generation | google | google-gemini-image | YES |
| `seedream-5.0-pro` | image_generation | volcengine | seedream-image | YES |
| `wan2.7-image-pro` | image_generation | dashscope | dashscope-wan-image | NO (legacy) |

The default analysis model is `qwen3.6-plus` (dashscope), but
**no API key exists in the credentials directory**, so even the
default model cannot be used.

---

## 3. Classification of the failure

Per CI-W1C.7.2 PART E failure-classification taxonomy
(`prompt` / `model capability` / `input quality` / `gate` /
`report presentation`):

| Category | Status |
|---|---|
| prompt | N/A (no model called) |
| model capability | N/A (no model called) |
| input quality | N/A (no model called) |
| gate | N/A (no model called) |
| report presentation | N/A (no model called) |
| **profile / credentials** | **FAIL — 0 profiles resolved, 0 API keys available** |

The failure is NOT a creative-reasoning defect. The CI-W1C.7.1
qualification was a different layer (zero-network prompt
wiring). The live layer is the provider-runtime layer, which is
OUT OF SCOPE for CI-W1C.

---

## 4. What was NOT done (per spec STOP rules)

- ❌ No live analysis model call was made
- ❌ No G01 qualification was started
- ❌ No G02 qualification was started
- ❌ No image model call was made
- ❌ No model profile was created or committed
- ❌ No API key was logged or persisted

---

## 5. What needs to happen to unlock CI-W1C.7.2

To proceed to the actual qualification, the user must:

1. **Provide a Qwen (or equivalent) analysis-profile API key**
   for `qwen3.6-plus` via the Web Host's profile management flow
   (or via the existing `masterpiece-os-desktop` settings UI).
2. **Re-run `list-profiles.mjs`** to confirm the profile is
   visible to the resolver.
3. **Provide the resolved `analysisProfileId`** so the harness
   can wire it into `creative-reasoning-service.run({ analysisProfileId, useMock: false, ... })`.

The agent cannot proceed without explicit user action because
profile creation requires real API credentials that must be
typed in via the OS-level settings UI (the `.bin` files are
encrypted with the user's session key).

---

## 6. Why this matches the verdict

The verdict `HOLD_FOR_PROVIDER_RUNTIME_DEFECT` is the spec's
explicit response to a profile resolution failure. The creative
reasoning pipeline (CI-W1C.7.1) and the prompt qualification
harness (CI-W1C.7.1A) are both fully ready. The defect is in the
provider-runtime credentials layer, not in the Creative
Intelligence code.

The next phase may proceed once the user supplies a working
analysis profile and confirms the `list-profiles.mjs` output
shows `profiles.length > 0`.
