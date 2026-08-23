# CI-W1C.7.2-R0 — Profile Management Path Audit

> Date: 2026-08-20
> Phase: CI-W1C.7.2-R0
> Verdict prerequisite: identify the CURRENT supported flow before asking the user to create a profile

---

## 1. Why this audit

CI-W1C.7.2 failed at PART B preflight because no analysis profile
is resolvable through the current Web Host. Four legacy `.bin`
files exist in
`C:\Users\Administrator\AppData\Roaming\masterpiece-os-desktop\credentials`
but the new resolver does not recognize them.

R0 needs to identify the **CURRENT** supported profile-creation
flow so the user can create a profile through it (NOT by
manually editing a `.bin` file).

The spec is explicit:
- DO NOT modify / decrypt legacy `.bin` files
- DO NOT hardcode credentials
- DO NOT touch Creative Intelligence semantics
- DO NOT start CI-W1C.6.1 / CI-10 / image generation

---

## 2. The current supported flow

### 2.1 Source code audit

| Component | File | Role |
|---|---|---|
| Profile store | `apps/web-runtime/src/node-settings-store.ts` | All profile CRUD + credential read/write |
| Credential store | `apps/web-runtime/src/node-credential-store.ts` | AES-256-GCM encryption of API keys |
| Path resolution | `apps/web-runtime/src/runtime-paths.ts` | Resolves `<userData>` + `<settingsFile>` + `<credentials>` |
| Host wiring | `apps/web-runtime/src/node-runtime-host.ts` | Registers `settings:saveProfile` / `settings:deleteProfile` / `settings:setDefaultProfile` / `settings:testProfile` / `settings:get` operations |
| RPC server | `apps/web-runtime/src/local-rpc-server.ts` | Exposes the operations to the web renderer |
| Profiles list probe | `apps/web-runtime/scripts/ci-w1c/list-profiles.mjs` | Boots the host in a temp userData dir and probes `settings:get` |

### 2.2 Storage locations (default Windows)

```
<userData> = %APPDATA%/masterpiece-os-desktop/  (or MASTERPIECE_USER_DATA_DIR override)
├── settings.json                            # profile metadata (no secrets)
├── node-credentials/                        # encrypted API keys
│   ├── master.key                           # 32-byte AES-256-GCM master key (mode 0o600)
│   └── <profileId>.bin                      # AES-256-GCM-encrypted API key
```

The path is overridable via:
- `MASTERPIECE_USER_DATA_DIR` env var
- `MASTERPIECE_REPO_ROOT` env var (only `repoRoot`)

### 2.3 Profile creation RPC

The only supported flow is the **Web Host's
`settings:saveProfile` RPC**, which:

1. Validates `input.displayName`, `input.provider`, `input.protocol`,
   `input.baseUrl`, `input.modelId` via
   `validateProfileInput(input)`.
2. Generates a new `profileId` if `input.id` is absent:
   `profile-${crypto.randomUUID()}`.
3. Stores the profile metadata in `<userData>/settings.json`
   (no API key, no secret).
4. If `input.apiKey?.trim()` is set, encrypts it with AES-256-GCM
   and writes the ciphertext + IV + authTag to
   `<userData>/node-credentials/<profileId>.bin`.
5. Marks the new profile as default if `isDefault: true` or if
   no other profile exists.
6. Returns the new `PublicSettings` (with `hasApiKey: true` for
   the new profile).

The flow is exposed to the web renderer through the
`_masterpiece/rpc/<channel>` HTTP RPC and is what the settings
UI in the web app uses.

### 2.4 Why the legacy `.bin` files are not seen

The four `.bin` files at
`C:\Users\Administrator\AppData\Roaming\masterpiece-os-desktop\credentials/`
are in a legacy format:

| Property | Legacy | Current |
|---|---|---|
| Directory | `credentials/` | `node-credentials/` |
| Master key | absent | `<userData>/node-credentials/master.key` (32 bytes) |
| Cipher | unknown | AES-256-GCM with `iv ‖ tag ‖ ciphertext` |
| Header | `v10…` (4 bytes) | (no header) |

The new `node-credential-store.ts` reads from
`<userData>/node-credentials/<profileId>.bin` ONLY. The legacy
`credentials/<profileId>.bin` files are in a different directory,
have no companion `master.key`, and use a different ciphertext
format. The current resolver does not see them.

**They are NOT used by the current supported flow. Touching them
is explicitly forbidden by the spec.**

---

## 3. The 4 user-facing ways to create a profile (current support)

### 3.1 Settings UI (recommended for human user)

The web app exposes a settings page that calls the
`settings:saveProfile` RPC. The user:
1. Opens the Masterpiece OS Desktop web app.
2. Goes to **Settings → API Profiles → Add profile**.
3. Fills in:
   - displayName: `CI-W1C.7.2 Qualification`
   - provider: `dashscope`
   - protocol: `openai-chat-multimodal` (the `inferProtocol`
     function picks this for `dashscope + qwen3.6-plus`; the UI
     may default to it from the model registry)
   - modelId: `qwen3.6-plus`
   - baseUrl: `https://dashscope.aliyuncs.com/compatible-mode/v1`
     (the dashscope OpenAI-compatible endpoint; the UI may
     pre-populate this from the model registry)
   - apiKey: `<the user's actual Qwen / DashScope API key>` (NEVER
     logged, NEVER committed)
   - isDefault: `true` (so the new profile is the default for
     `getProviderCredentials(undefined)`)
4. Clicks **Save**. The web app calls `settings:saveProfile`,
   which writes `settings.json` + the encrypted `.bin`.

The user can also click **Test connection** to verify the
profile works before saving.

### 3.2 Direct RPC call (programmatic)

`fetch('http://127.0.0.1:<web-rpc-port>/_masterpiece/rpc/settings:saveProfile', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    args: [{
      displayName: 'CI-W1C.7.2 Qualification',
      provider: 'dashscope',
      protocol: 'openai-chat-multimodal',
      modelId: 'qwen3.6-plus',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: '<the actual key>',
      isDefault: true,
      isEnabled: true,
    }],
  }),
})`

This requires the user to type the key into the request body. The
agent CANNOT do this without the user's key.

### 3.3 CLI flow

The CLI does NOT currently expose a `profile create` command. The
existing CLI commands are:

- `masterpiece-os analyze` — runs visual analysis (requires an
  existing profile)
- `masterpiece-os inventory` — lists assets

No `masterpiece-os profile create` exists. Creating a profile
requires the settings UI or the direct RPC.

### 3.4 Manual `.bin` creation (FORBIDDEN)

Writing to `<userData>/node-credentials/<profileId>.bin` directly
would require generating a valid AES-256-GCM ciphertext with the
master key. This is what the spec explicitly forbids. The
intended path is for the user to enter the key through the
settings UI.

---

## 4. Persistence & restart behavior

The current `node-settings-store.ts` writes `<userData>/settings.json`
and the credential store writes `<userData>/node-credentials/*.bin`
synchronously. The Web Host reads them on every `settings:get`
call. So:

- A restart of the Web Host re-reads the same files.
- The same profile must still be visible after a restart.

If R0 PART E (restart-persistence check) shows the same profile
disappears / `hasApiKey` flips to `false` after a restart, the
defect is in the persistence layer and must be escalated to
R1. R1 is NOT STARTED in this phase.

---

## 5. What R0 will do

R0 is an **operational recovery runbook**, not an architecture
phase. The flow:

1. (PART B) — this audit document. **DONE.**
2. (PART C) — the user creates ONE profile through the supported
   flow (3.1 or 3.2 above) with:
   - displayName: `CI-W1C.7.2 Qualification`
   - provider: `dashscope`
   - modelId: `qwen3.6-plus`
   - baseUrl: `https://dashscope.aliyuncs.com/compatible-mode/v1`
   - isDefault: `true`
3. (PART D) — re-run `list-profiles.mjs` and confirm
   `profiles.length > 0`, the new profile is visible,
   `hasApiKey: true`, `provider = "dashscope"`, `model = "qwen3.6-plus"`.
4. (PART E) — restart the Web Host, re-run `list-profiles.mjs`,
   confirm the same profile still resolves.
5. (PART F) — if R0 verdict = `PROFILE_RUNTIME_READY`, resume
   CI-W1C.7.2 PART C with `analysisProfileId = <resolved id>`.

R0 stops if PART E fails (escalate to R1).

---

## 6. R0 stops on STOP conditions

Per the spec:
- DO NOT modify / decrypt legacy `.bin` files
- DO NOT hardcode credentials
- DO NOT touch Creative Intelligence semantics
- DO NOT start CI-W1C.6.1
- DO NOT start CI-10
- DO NOT call image models

R0 has produced 0 production code change and 0 model call so far.
The next step (PART C) is the user's action.
