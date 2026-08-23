# CI-W1C.7.2-R0 — Qualification Profile Resolution (PART D)

> Date: 2026-08-20
> Phase: CI-W1C.7.2-R0
> Verdict: **PASS** (profile is resolvable)

---

## 1. Probe

After the user confirmed they had saved a profile through the
Masterpiece OS Desktop web settings UI, I wrote
`apps/web-runtime/scripts/ci-w1c/probe-actual-userdata-profiles.mjs`
which probes the **actual** userData directory (not the temp dir
the original `list-profiles.mjs` uses). This boots the Web Host
with `MASTERPIECE_USER_DATA_DIR=%APPDATA%/masterpiece-os-desktop`
and queries `settings:get`.

The original `apps/web-runtime/scripts/ci-w1c/list-profiles.mjs`
was returning `profiles: []` because it uses a temp
`.codex-smoke/ci-w1c/node-user-data-XXX/` directory, which is
empty. The probe-actual-userdata-profiles.mjs script uses the
real user data dir and is the correct way to verify the user's
saved profile.

---

## 2. Probe result

### 2.1 `settings.json` summary (read directly from disk)

```json
{
  "profiles": 5,
  "defaultProfileId": "profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca"
}
```

### 2.2 All 5 profiles (from `settings.json`)

| id | displayName | provider | modelId | isDefault | isEnabled |
|---|---|---|---|:---:|:---:|
| `profile-9eb57f7e-…` | Qwen3.6 Plus | dashscope | `qwen3.6-plus` | true | true |
| `profile-8e7fb1b7-…` | Seedream 5.0 Pro | volcengine | `doubao-seedream-5-0-pro-260628` | false | true |
| `profile-a7c15c5e-…` | Seed 2.1 Turbo | volcengine | `doubao-seed-2.1-turbo` | false | true |
| `profile-ec1d299b-…` | Seedream 5.0 Lite | volcengine | `doubao-seedream-5.0-lite` | false | true |
| `profile-fa854643-…` | Qwen3.7 Plus | dashscope | `qwen3.7-plus-2026-05-26` | false | true |

### 2.3 Credentials dir contents

```
C:\Users\Administrator\AppData\Roaming\masterpiece-os-desktop\node-credentials\
  master.key                                            (32 bytes, mode 0o600)
  profile-8e7fb1b7-2221-40c7-9f9e-a4e2452c3489.bin
  profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca.bin
  profile-a7c15c5e-ea5c-4e2a-85f9-ff572b5296c6.bin
  profile-ec1d299b-4939-4df7-bb5e-1b029b82374e.bin
  profile-fa854643-4c01-43e7-8e5a-4ec52862c23b.bin
```

All 5 profile credential files are present, plus the AES-256-GCM
master key.

### 2.4 Web Host `settings:get` result

```json
{
  "profiles": [ ... 5 profiles, each with hasApiKey: true ... ],
  "defaultProfileId": "profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca",
  "provider": "dashscope",
  "baseUrl": "https://ws-1miaebhuom22vyxa.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  "model": "qwen3.6-plus",
  "hasApiKey": true,
  "defaultDataPath": "C:\\Users\\Administrator\\Documents\\Masterpiece OS Data",
  "cacheEnabled": true,
  "logLevel": "info",
  "directionGenerationMode": "execution_oriented_v2",
  "analysisPipelineMode": "retrieval_first",
  "imageGenerationPipelineMode": "vnext",
  "connectionStatus": "connected"
}
```

### 2.5 Spec-required fields

| Field | Required | Actual |
|---|---|---|
| `profiles.length > 0` | YES | 5 |
| new profile visible | YES | Qwen3.6 Plus (id `profile-9eb57f7e-…`) is visible |
| `hasApiKey = true` | YES | true |
| `provider = dashscope` | YES | "dashscope" |
| `model = qwen3.6-plus` | YES | "qwen3.6-plus" |
| `connectionStatus` (informational) | any | "connected" |

**PART D: PASS.**

---

## 3. Recorded for PART F

```yaml
analysisProfileId: "profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca"
defaultProfileId: "profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca"
provider:          "dashscope"
model:             "qwen3.6-plus"
baseUrl:           "https://ws-1miaebhuom22vyxa.cn-beijing.maas.aliyuncs.com/compatible-mode/v1"
protocol:          "openai-chat-multimodal"
hasApiKey:         true
connectionStatus:  "connected"
promptVersions:    ci-w1c.7.1-strategic-synthesis-v0.2
                   ci-w1c.7.1-model-assisted-concept-v0.2
                   ci-w1c.7.1-model-assisted-direction-v0.2
```

The API key is **NEVER** recorded in this document. The
`hasApiKey: true` flag is the only proof that the key is loaded;
the key itself is encrypted at
`<userData>/node-credentials/<profileId>.bin` with the AES-256-GCM
master key at `<userData>/node-credentials/master.key`.

---

## 4. Same profile will be used for G02 (per spec)

Per the CI-W1C.7.2 spec PART F: "Same profile, provider, model,
prompt versions, budget policy, repair policy, gate versions"
must be used for G01 and G02.

R0 confirms: the resolved profile is
`profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` and will be used
for both G01 and G02.

The user has an alternative Qwen3.7 Plus profile
(`profile-fa854643-…`) but the spec requires the SAME profile
across G01 and G02. The default (Qwen3.6 Plus) is the chosen
qualification profile.
