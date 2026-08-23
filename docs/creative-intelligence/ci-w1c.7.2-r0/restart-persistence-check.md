# CI-W1C.7.2-R0 — Restart Persistence Check (PART E)

> Date: 2026-08-20
> Phase: CI-W1C.7.2-R0
> Verdict: **PASS** (profile persists across Web Host restarts)

---

## 1. Method

The R0 PART E restart-persistence check boots the Web Host 3
times in a row, each time pointing at the real userData dir
(`%APPDATA%/masterpiece-os-desktop/`), and probes `settings:get`
via the host's local RPC. The probe is implemented in
`apps/web-runtime/scripts/ci-w1c/probe-actual-userdata-profiles.mjs`.

If the same profile (with the same `profileId`, `provider`,
`model`, `hasApiKey`) is resolvable across all 3 boots, the
restart-persistence check PASSes.

---

## 2. Result across 3 boots

Each boot spawned a fresh `tsx` process running
`apps/web-runtime/src/main.ts`, which mounted a fresh in-process
Web Host. The probe then issued `settings:get` to that fresh
host. All 3 boots returned the identical `settings.json` content
because the file is read from disk on every boot.

| Field | Boot 1 | Boot 2 | Boot 3 |
|---|---|---|---|
| `profiles.length` | 5 | 5 | 5 |
| `defaultProfileId` | `profile-9eb57f7e-…` | `profile-9eb57f7e-…` | `profile-9eb57f7e-…` |
| `provider` | `dashscope` | `dashscope` | `dashscope` |
| `model` | `qwen3.6-plus` | `qwen3.6-plus` | `qwen3.6-plus` |
| `hasApiKey` | true | true | true |
| `connectionStatus` | `connected` | `connected` | `connected` |
| `DASHSCOPE_QWEN36_PLUS_PRESENT` | true | true | true |

All 3 boots return the same `analysisProfileId`. The profile
persists across Web Host restarts.

---

## 3. Why this passes

The persistence model is straightforward:

- `<userData>/settings.json` — plaintext profile metadata, no
  secrets. Read on every `getSettings()` call.
- `<userData>/node-credentials/master.key` — 32-byte AES-256-GCM
  master key, mode 0o600. Read on first credential access.
- `<userData>/node-credentials/<profileId>.bin` — AES-256-GCM
  ciphertext (IV ‖ tag ‖ ciphertext), mode 0o600. Read on
  `hasCredential` and `decryptApiKey`.

There is no in-memory cache, no transient store, no in-process
key derivation. Every host boot re-reads the same files. The
restart-persistence check is therefore a true end-to-end
verification that the Web Host can re-discover the profile
after a fresh process start.

The legacy `.bin` files in `<userData>/credentials/` are NOT
touched. The current resolver only reads from
`<userData>/node-credentials/`.

---

## 4. What if the check had FAILED

The R0 spec is explicit:
> "If a NEW profile created through the CURRENT supported flow
> still disappears / resolves to profiles=[] / hasApiKey=false:
> STOP.
> R0 verdict: ESCALATE_TO_CI-W1C.7.2-R1.
> Do NOT run G01."

The check did NOT fail. The profile is visible, hasApiKey=true,
and persists across 3 boots. No escalation to R1 is required.

---

## 5. R0 verdict (PART E)

**R0 verdict: PROFILE_RUNTIME_READY.**

The qualification may proceed to PART F (resume CI-W1C.7.2 G01
qualification) with:
- `analysisProfileId = profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca`
- `useMock = false`
- Same `provider`, `model`, `promptVersions`, `budget`,
  `repair`, `gate` versions for G02 (per CI-W1C.7.2 PART F).
