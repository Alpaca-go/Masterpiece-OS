# P3-D3.3 — Provider Credential Injection & Auth Contract Audit

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `1e1f1fd8583e1198f3b7930a114b7c2f4dcbf5b8` (resolved via `git rev-parse HEAD`)
**Phase Class:** AUDIT ONLY / OFFLINE ONLY
**External Provider HTTP calls:** 0
**Production source changes:** 0
**Test source changes:** 0
**Golden:** unchanged

---

## A. Previous Canary Consumed

P3-D3 RE-RUN #2A CALL-01 (`1e1f1fd`) failed at the Provider auth layer:

```
GENERATION_PROVIDER_FAILED
  └─ MODEL_ADAPTER_AUTH_FAILED   (HTTP 401/403 — Provider rejected authentication)
```

Offline preflight PASSed; the production path reached the Provider authentication handshake. This audit answers one question: is the local credential injection + auth contract chain fully correct per the current production code?

---

## B. Credential Presence (safe booleans only)

```
GENERAL MASTERPIECE_API_KEY:       SET
PROFILE-SPECIFIC CREDENTIAL:       NOT SET
SELECTED SOURCE:                   GENERAL
```

No credential content, prefix, suffix, length, or structural information was read or recorded.

---

## C. Credential Store Owner

| Field | Value |
|---|---|
| File | `apps/web-runtime/src/node-credential-store.ts` |
| Factory | `createNodeCredentialStore(root, environment = process.env)` |
| Root | `<userData>/node-credentials` (`createNodeRuntimePaths` — `APPDATA` / `MASTERPIECE_USER_DATA_DIR`) |
| Functions | `has(profileId)` / `read(profileId)` / `write(profileId, apiKey)` / `remove(profileId)` |
| Env lookup precedence | `MASTERPIECE_API_KEY_<NORMALIZED>` → `MASTERPIECE_API_KEY` (line 39) |
| Fallback after env | encrypted file `<profileId>.bin` (AES-256-GCM, `master.key`) |
| Return shape | raw credential string (from env or decrypted file) |
| Credential field name | n/a (returns a string; the caller names it) |
| Missing behavior | `read()` returns `''`; `has()` returns `false` |
| Error codes | `NODE_CREDENTIAL_MASTER_KEY_INVALID` / `NODE_CREDENTIAL_PAYLOAD_INVALID` / `NODE_CREDENTIAL_MASTER_KEY_MISSING` |
| Redaction | none needed (returns raw; never logs) |

**Claim check (from the previous phase report):** "profile-specific credential env 优先于 MASTERPIECE_API_KEY" — **CONFIRMED by current code** (`node-credential-store.ts:39`: `environment[profileEnvironmentName(profileId)] || environment.MASTERPIECE_API_KEY || ''`).

---

## D. Environment Precedence (current code)

```
1. MASTERPIECE_API_KEY_<PROFILE-NORMALIZED>   (profile-specific)
2. MASTERPIECE_API_KEY                        (general)
3. <userData>/node-credentials/<profileId>.bin (encrypted file fallback)
```

Normalization rule for the profile-specific env name (`node-credential-store.ts:8-10`):

```
`MASTERPIECE_API_KEY_` + profileId.replace(/[^a-zA-Z0-9]/gu, '_').toUpperCase()
```

Non-alphanumeric chars → `_`; then upper-case. Hyphens and UUID dashes become underscores.

---

## E. Profile-Specific Env Name (resolved, no value)

For the Seedream profile `profile-e871b4c5-7499-4749-b838-02410ad19cb1`, the resolved env **NAME** (not value) is:

```
MASTERPIECE_API_KEY_PROFILE_E871B4C5_7499_4749_B838_02410AD19CB1
```

This is the only profile-specific variable the runtime attempts for this profile. Env variable names are not secrets; the value was never read.

---

## F. Current Selected Credential Source

```
SELECTED CREDENTIAL SOURCE:  GENERAL ENV (MASTERPIECE_API_KEY)
```

Profile-specific env: NOT SET. General env: SET. Per the code precedence, `read()` resolves from the general env. No shadowing exists.

---

## G. Profile Binding

| Field | Value |
|---|---|
| Profile id | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` |
| vendor | `volcengine` |
| protocol | `seedream-image` |
| registryModelId | `seedream-5.0-pro` |
| provider modelId | `doubao-seedream-5-0-pro-260628` |
| baseUrl | `https://ark.cn-beijing.volces.com/api/v3/images/generations` |
| enabled | yes |
| credential namespace | `node-credentials` (shared store) |

Binding trace (execute path):

```
Workspace apiProfileId (intent or caller)
  → buildExecutionDeps: settings.profiles.find(p.id === apiProfileId)   [exact match; not found → throw]
  → readCredentials(apiProfileId) = getProviderCredentials(profileId)   [same profile id]
  → profile.registryModelId vs intent.providerModelId identity gate     [EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH fail-closed]
  → adapter(modelId = profile.modelId)
```

No second profile resolution, no legacy profile shadowing, no disabled-profile selection, no registry/runtime mismatch on the execute path.

---

## H. Credential Object Shape

| Layer | Field |
|---|---|
| `getProviderCredentials` return | `{ profileId, provider, protocol, modelType, baseUrl, model, apiKey }` |
| `buildExecutionDeps` extraction | `credentials?.apiKey` → `apiKey` |
| adapter config | `{ adapterId, apiKey, baseUrl, modelId }` |
| `buildSeedreamRequest` header | `Authorization: 'Bearer ' + config.apiKey` |

Field names are consistent end-to-end (`apiKey`); no `key`/`token`/`credential` mismatch.

---

## I. Execution Dependency Injection

| Layer | Input field | Output field | Owner | Verdict |
|---|---|---|---|---|
| ops execute | `caller apiProfileId / intent.apiProfileId` | `apiProfileId` | packaging-operations.js `buildExecutionDeps` | exact profile match |
| credential read | `apiProfileId` | `credentials.apiKey` | `readCredentials` = `getProviderCredentials` | resolved after profile selection ✓ |
| adapter factory | `apiKey` | `config.apiKey` | `createMultiModelImageAdapter` | direct |
| P2 execute | `executionConfig.apiKey` | adapter `apiKey` | `buildAdapter` | same value |
| request builder | `config.apiKey` | `headers.Authorization` | `buildSeedreamRequest` | single Bearer prefix |

- Credential resolved **after** profile selection ✓
- Profile id cannot be lost (exact find or throw) ✓
- No shallow-copy field loss (apiKey passed by value through each boundary) ✓

---

## J. Adapter Credential Input

`createMultiModelImageAdapter({ adapterId: 'seedream-5.0-pro', apiKey, baseUrl, modelId })` — `config.apiKey` is the exact credential string (trimmed). `compileRequest` fail-closes when empty (`MODEL_ADAPTER_AUTH_REQUIRED`).

---

## K. Authorization Header Owner

```
AUTH HEADER OWNER:
packages/image-generation-adapter/src/multi-model.js — buildSeedreamRequest (line 226)
```

Single owner. The credential store returns the raw credential (no prefix). The adapter is the only place the `Bearer ` prefix is added. No double-prefix path exists.

---

## L. Authorization Header Contract

```js
headers: {
  Authorization: `Bearer ${config.apiKey}`,
  'Content-Type': 'application/json',
}
```

- header name: `Authorization`
- scheme: `Bearer`
- credential field: `config.apiKey`
- shared helper: `buildSeedreamRequest` (adapter-local, single site)
- no double prefix / missing prefix / quote wrapping / JSON encoding / URL encoding / base64 / interpolation error
- `compileRequest` guards empty key before header construction

---

## M. Synthetic Sentinel Tests (offline, no network)

Synthetic sentinel `TEST_ONLY_CREDENTIAL_SENTINEL` (not a secret; never a real credential) was pushed through the **real production functions** (`createNodeCredentialStore`, `createMultiModelImageAdapter`):

| Case | Result |
|---|---|
| AUTH-01 general env synthetic → correct resolution | PASS |
| AUTH-02 profile-specific synthetic wins over general | PASS (precedence per code) |
| AUTH-02b general-only fallback | PASS |
| AUTH-02c missing → empty string (no throw) | PASS |
| AUTH-02d `has()` false when missing | PASS |
| AUTH-03 missing credential → `MODEL_ADAPTER_AUTH_REQUIRED` | PASS |
| AUTH-04 synthetic credential → adapter credential object | PASS |
| AUTH-05 header contract = `Bearer <credential>` | PASS |
| AUTH-06 no double Bearer | PASS |
| AUTH-07 no JSON quoting | PASS |
| AUTH-08 no `[object Object]` | PASS |
| AUTH-09 POST → `/images/generations`, body.model = `doubao-seedream-5-0-pro-260628` | PASS |
| AUTH-10 adapter receives exactly the expected credential field | PASS |

The header was generated by the real production `compileRequest` (not hand-written), then inspected in-memory; the sentinel was substituted in the report.

---

## N. Double Prefix Audit

**NONE.** The credential store returns the raw string; `buildSeedreamRequest` adds `Bearer ` exactly once. Verified by AUTH-06 (synthetic) and by code path (single construction site).

---

## O. Mutation Audit

| Site | Transform | Class |
|---|---|---|
| `node-credential-store.ts:39` `environmentValue` | `.trim()` (surrounding whitespace only) | INTENTIONAL SAFE MUTATION |
| `packaging-operations.js` `asString(credentials?.apiKey)` | trim | INTENTIONAL SAFE MUTATION |
| `generation-service.js` `asStringTrim(executionConfig.apiKey)` | trim | INTENTIONAL SAFE MUTATION |
| adapter `text(config.apiKey)` | trim | INTENTIONAL SAFE MUTATION |
| `buildSeedreamRequest` | no transform (interpolation into header) | NO MUTATION |

No `replace()` / `substring()` / `slice()` / `normalize()` / JSON encode / URL encode / base64 / prefix/suffix stripping is applied to the credential. Classification: **A. NO MUTATION** (except B. intentional safe whitespace trim). No C.

---

## P. Current Runtime Safe Resolution

Invoked production `getProviderCredentials(profileId)` with a safe wrapper (no content printed):

```
GET_PROVIDER_CREDENTIALS:   SUCCESS
PROFILE ID RESOLVED:        YES (profile-e871b4c5…)
provider:                   volcengine
protocol:                   seedream-image
modelType:                  image_generation
baseUrl present:            YES
model matches authorized:   YES (doubao-seedream-5-0-pro-260628)
CREDENTIAL FIELD PRESENT:   YES (non-empty string)
CREDENTIAL FIELD TYPE:      string
```

---

## Q. Redaction / Logging Audit

| Surface | Owner | Verdict |
|---|---|---|
| Provider request audit | `generation-service.js` `redactProviderRequest` → `../redact.js` | Authorization header stripped (`AUTH_HEADER_DENY_LIST`); signed-URL params redacted; base64/data-URI stripped |
| Provider response audit | `redactProviderResponse` | response body sanitized |
| Metadata sensitive keys | `metadata.js` deny list (`apiKey`, `accessToken`, `authorization`, `cookie`, `secret`) | present |
| Error wrapping | `toGenerationProviderFailed` | public message sanitized; cause keeps code only |
| run metadata / artifact metadata | artifact store writes safe record | no credential |

No SECURITY FINDING identified. The Authorization header / apiKey / credential does not enter tracked or runtime logs.

---

## R. CA-01..CA-10 Trace

| Boundary | Owner | File/Function | Input → Output | Source | Shape | Mutation | Verdict |
|---|---|---|---|---|---|---|---|
| CA-01 presence | runtime env | process env | `MASTERPIECE_API_KEY` → string | GENERAL ENV | string | n/a | SET |
| CA-02 profile env lookup | credential store | `node-credential-store.ts` `profileEnvironmentName` / `environmentValue` | profileId → `MASTERPIECE_API_KEY_<NORMALIZED>` | env | string | `_`/upper normalization of NAME only | NOT SET (general used) |
| CA-03 store resolution | credential store | `read(profileId)` | env → raw string | GENERAL ENV | string | trim | correct |
| CA-04 `getProviderCredentials` | settings store | `node-settings-store.ts` `getProviderCredentials(profileId)` | profileId → `{...apiKey}` | store+env | object | trim | correct |
| CA-05 execution deps injection | ops layer | `packaging-operations.js` `buildExecutionDeps` | credentials.apiKey → adapter config | profile-bound | string | trim | correct |
| CA-06 adapter credential object | adapter | `multi-model.js` `createMultiModelImageAdapter` | `{apiKey}` → `config.apiKey` | same | string | trim | correct |
| CA-07 Seedream request builder | adapter | `buildSeedreamRequest` | config.apiKey → headers.Authorization | same | string | none | correct |
| CA-08 Authorization header | adapter | `buildSeedreamRequest` line 226 | `Bearer ${apiKey}` | same | string | none | correct |
| CA-09 transport input | adapter | `execute` → `fetchImpl(url, { headers })` | headers verbatim | same | object | none | correct |
| CA-10 redaction/logging | generation-service + redact | `redactProviderRequest/Response` | audit surfaces sanitized | n/a | n/a | strip auth | correct |

---

## S. Last Known Good

**ALL BOUNDARIES (CA-01..CA-10) ARE HEALTHY.**

## T. First Broken Boundary

**NONE.** No local credential injection / auth contract defect found.

---

## U. Root Conclusion

```
LOCAL CREDENTIAL INJECTION:   PASS
AUTH HEADER CONTRACT:         PASS
PRODUCTION AUTH PATH:         HEALTHY
```

The full local chain — `MASTERPIECE_API_KEY` → credential store → profile resolution → `getProviderCredentials` → execution deps → multi-model adapter → `buildSeedreamRequest` → `Authorization: Bearer <key>` — conforms to the current production auth contract. Credential resolution, profile binding, credential object shape, header construction, double-prefix absence, mutation absence, and redaction are all correct.

The remaining blocker from the #2A canary is therefore classified as:

```
EXTERNAL CREDENTIAL / ACCOUNT / PROVIDER AUTHORIZATION
REQUIRES USER RE-ISSUE OR PROVIDER-SIDE VERIFICATION
```

This audit cannot and does not claim "the API key is invalid" — it did not contact the Provider. It only establishes that the local chain would send `Authorization: Bearer <credential>` exactly per contract.

---

## V. Production Changes

```
Production source changes:  0
Test source changes:        0
```

## W. External Provider Calls

```
External Provider HTTP:     0
Image generation:           0
GET models:                 0
Direct probe:               0
Retries:                    0
```

## X. Golden

```
Golden auto-update:         NO
Golden changes:             0
```

## Y. Secret Audit

- No credential content read, printed, echoed, or persisted.
- No prefix / suffix / length / substring / hash / base64 / character-type / structural inference.
- Only boolean status recorded (SET / NOT SET / MATCH / SUCCESS / FAIL).
- Synthetic sentinel was an obvious fake, substituted in the report.

---

## Z. Historical Preservation

- D3, D3 RE-RUN, D3.1, D3.2, #2 credential gate, #2A canary HOLD — all preserved; no file overwritten.

---

## AA. Final Decision

```
P3-D3.3 AUDIT:              PASS
LOCAL CREDENTIAL INJECTION: PASS
AUTH HEADER CONTRACT:       PASS
PRODUCTION AUTH PATH:       HEALTHY
P3-D3:                      HOLD — EXTERNAL CREDENTIAL / PROVIDER AUTHORIZATION VERIFICATION REQUIRED
P3-D4:                      LOCKED
P3-E:                       LOCKED
```

---

## AB. Recommended Next Step

1. User re-issues / re-verifies the Volcengine / Ark credential for `seedream-5.0-pro` (account / project / model authorization on the Provider side), or confirms the current `MASTERPIECE_API_KEY` is the correct active key.
2. On a new explicit 1-call canary authorization, re-run CALL-01. The local auth path is verified; the blocker is external.
3. **STOP. No automatic canary, no Provider call, no remediation.**

## AC. Git

- Working tree: EMPTY (after this doc commit).
- Local == Remote: MATCH (post-push).
