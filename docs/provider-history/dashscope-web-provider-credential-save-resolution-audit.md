# DashScope Web Provider Credential Save / Resolve / Connection-Test Audit

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `e70a6559d393dec998662c4b13faf9e76bf3e3d7` (resolved via `git rev-parse HEAD`)
**Phase Class:** AUDIT ONLY / OFFLINE ONLY
**External Provider HTTP calls:** 0
**Production source changes:** 0
**Test source changes:** 0
**Golden:** unchanged

---

## A. External Direct-Test Fact Consumed

The user successfully called DashScope directly via PowerShell:

```
https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
Model: qwen3.6-plus
Result: SUCCESS (chat.completion)
```

Confirmed external facts (NOT re-verified in this audit):
- DashScope API Key: VALID
- qwen3.6-plus: CALLABLE
- DashScope shared Base URL: VALID

Masterpiece Web → Provider Manager → Test Connection with the newly created Qwen3.6 Plus profile returns **HTTP 401 `invalid_api_key`**.

This audit does not touch Aliyun account / model id / base URL / key re-issue. It audits only the Masterpiece-internal chain: UI Save → Credential Store → Credential Resolve → Test Connection.

---

## B. Web Failure Reproduction Context

- New Qwen3.6 Plus profile created in the Web UI.
- API Key entered and saved; UI showed "Key 已保存".
- "测试连接" then returned HTTP 401 `invalid_api_key`.

---

## C. New Profile Identity

| Field | Value |
|---|---|
| profile id | `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` |
| displayName | Qwen3.6 Plus |
| provider | dashscope |
| protocol | openai-chat-multimodal |
| modelType | analysis |
| registryModelId | qwen3.6-plus |
| modelId | qwen3.6-plus |
| baseUrl | `https://ws-1miaebhuom22vyxa.cn-beijing.maas.aliyuncs.com/api/v1` |
| isDefault | true |
| isEnabled | true |
| lastTestStatus | failed |

---

## D. UI Save Path (WC-01 → WC-02)

- `apps/web/src/components/SettingsPanel.tsx`
- "新增 API 配置" → `setEditor(profileInput())` (editor.id = undefined)
- 保存 → `saveProfile()` → `window.masterpiece.settings.saveProfile(editor)`
- Editor form carries `apiKey` (user input), `id` (undefined for new), plus provider/protocol/modelType/modelId/baseUrl/registryModelId

---

## E. Credential Write Path (WC-03 → WC-04 → WC-05)

- `apps/web-runtime/src/node-settings-store.ts` `saveApiProfile(input)` (line 284)
- `id = current?.id || 'profile-' + crypto.randomUUID()` (line 289) — id generated FIRST
- `if (input.apiKey?.trim()) await saveCredential(id, input.apiKey.trim())` (line 328) — non-empty new key ALWAYS writes, **using the final id**
- `saveCredential` → `nodeCredentials.write(profileId, apiKey)` → `createNodeCredentialStore` (AES-256-GCM encrypted file `<userData>/node-credentials/<profileId>.bin`)

Order: id → credential write(id) → settings save → publicSettings. Create and Edit share the same `saveApiProfile`; no temporary-id path exists.

**Observed on disk:** `<profileId>.bin` present (145 bytes, mtime 2026-08-15 20:34:52 — written at save time). No profile-specific env, no general env → encrypted file is the sole source.

---

## F. Credential Store (WC-05/WC-06)

- `apps/web-runtime/src/node-credential-store.ts` `createNodeCredentialStore`
- `read(profileId)`: `MASTERPIECE_API_KEY_<NORMALIZED>` → `MASTERPIECE_API_KEY` → encrypted file
- `has(profileId)`: env or file existence
- Missing: `read()` returns `''`; `has()` returns `false`

---

## G. Profile ID Continuity (H)

| Step | profileId |
|---|---|
| UI new-profile editor | `undefined` → `profile-9eb57f7e-…` (generated in saveApiProfile) |
| credential write | `profile-9eb57f7e-…` (final id) |
| UI card display | `profile-9eb57f7e-…` |
| card "测试连接" | `profile-9eb57f7e-…` (from profile.id) |
| getProviderCredentials / decryptApiKey | `profile-9eb57f7e-…` |

**All identical. No profile id binding defect.**

---

## H. Saved-Key Status Source (WC-06)

- UI "Key 已保存" = `profile.hasApiKey`
- `publicSettings()` → `hasApiKey: await hasCredential(profile.id)` → `nodeCredentials.has(profileId)`
- **Real store check** (env or file), not a form flag, not a metadata flag, not cached UI state.
- Verified at runtime: `hasApiKeyReported: true`.

**No UI credential status false positive.**

---

## I. Credential Precedence (WC-10)

```
PROFILE-SPECIFIC ENV (MASTERPIECE_API_KEY_PROFILE_9EB57F7E_7BC5_4214_B325_A013FF1F8ECA):  NOT SET
GENERAL ENV (MASTERPIECE_API_KEY):                                                         NOT SET
ENCRYPTED FILE (<profileId>.bin):                                                          PRESENT
SELECTED SOURCE:                                                                            ENCRYPTED FILE
```

`DASHSCOPE_API_KEY` (used in the user's direct test) is **NOT read anywhere** in Masterpiece (`node-credential-store` / `node-settings-store` / `provider-connection-test` contain zero references). The direct-test env and the Masterpiece runtime credential are independent sources; no shadowing exists.

---

## J. Current Selected Source

```
SELECTED CREDENTIAL SOURCE:  ENCRYPTED FILE
```

Runtime safe resolution (booleans only):

```
GET_PROVIDER_CREDENTIALS:   SUCCESS
PROFILE ID RESOLVED:        YES
CREDENTIAL FIELD PRESENT:   YES (non-empty string)
credential type:            string
store.has():                true
getProviderCredentials.apiKey === store.read(profileId):  MATCH
```

---

## K. Test Connection Path (WC-07 → WC-08 → WC-09)

- UI card "测试连接" → `testProfile(profileInput(profile), ...)`
- `profileInput(profile)` returns `apiKey: ''` (SettingsPanel.tsx line 27) — card test never sends a form key
- `window.masterpiece.settings.testProfile(input)` → `testApiProfile` (`node-settings-store.ts` line 399)
- `storedKey = input.id ? await decryptApiKey(input.id) : ''` → `nodeCredentials.read(profileId)`
- `apiKey = input.apiKey?.trim() || storedKey`

**The card test path resolves the credential through the SAME `nodeCredentials.read(profileId)` as formal execution.** No second credential path on the card button.

Note: the editor-page "测试模型连接" button passes the editor (with any typed key). That is a different input but still `input.apiKey || storedKey` — consistent.

---

## L. Adapter Credential Input (WC-11 → WC-12)

- `testApiProfile` → `runProviderConnectionTest({ provider, protocol, modelType, baseUrl, model, apiKey })`
- `packages/runtime-core/src/application/provider-connection-test.ts`
- Analysis + `openai-chat-multimodal` → POST `endpointUrl(baseUrl, '/chat/completions')`, headers `{ Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }`, body `{ model, messages: [{role:'user',content:'Reply with OK.'}], max_tokens: 1, stream: false }`

Single Bearer construction site; no double prefix, no quoting, no encoding.

---

## M. Synthetic Sentinel Test (offline, no network)

Sentinel `TEST_ONLY_DASHSCOPE_SENTINEL` (obvious fake) through the real production `runProviderConnectionTest` with an intercepted transport:

| Check | Result |
|---|---|
| URL = `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | PASS (exact) |
| Authorization header = `Bearer <SENTINEL>` | PASS (exact) |
| method = POST | PASS |
| body.model = `qwen3.6-plus` | PASS |
| 401 → `invalid_api_key` parsed correctly | PASS |
| MAAS baseUrl variant → URL `…/api/v1/chat/completions` | PASS (URL construction per profile baseUrl) |

The test-connection request contract is correct.

---

## N. WC-01..WC-12 Trace

| Boundary | Owner | File / Function | Profile ID | Credential Source | Credential Present | Verdict |
|---|---|---|---|---|---|---|
| WC-01 form state | Web UI | SettingsPanel.tsx editor | undefined → 9eb57f7e… | n/a | n/a | GOOD |
| WC-02 save action | Web UI | saveProfile → settings.saveProfile | 9eb57f7e… | n/a | n/a | GOOD |
| WC-03 profile persistence | node-settings-store | saveApiProfile (id=uuid) | 9eb57f7e… | n/a | n/a | GOOD |
| WC-04 credential write request | node-settings-store | saveCredential(id, key) | 9eb57f7e… | input.apiKey | yes | GOOD |
| WC-05 store write | node-credential-store | write(profileId, apiKey) | 9eb57f7e… | input | yes | GOOD |
| WC-06 saved existence | node-credential-store | has(profileId) | 9eb57f7e… | file/env | yes | GOOD |
| WC-07 test action | Web UI | testProfile(profileInput) | 9eb57f7e… | n/a | n/a | GOOD |
| WC-08 profileId for test | Web UI | profile.id | 9eb57f7e… | n/a | n/a | GOOD |
| WC-09 getProviderCredentials/decrypt | node-settings-store | decryptApiKey(id) | 9eb57f7e… | file | yes | GOOD |
| WC-10 source resolution | node-credential-store | read(): env → file | 9eb57f7e… | file | yes | GOOD |
| WC-11 test adapter input | provider-connection-test | runProviderConnectionTest | 9eb57f7e… | apiKey | yes | GOOD |
| WC-12 Authorization header | provider-connection-test | `Bearer ${apiKey}` | 9eb57f7e… | apiKey | yes | GOOD |

---

## O. Last Known Good / First Broken Boundary

**ALL BOUNDARIES (WC-01..WC-12) ARE HEALTHY.**

**FIRST BROKEN BOUNDARY: NONE** in the Masterpiece credential save / resolve / test-connection chain.

The local chain correctly:
1. writes the non-empty user key to the encrypted credential file under the final profile id,
2. reports "Key 已保存" from a real store existence check,
3. resolves the saved credential through the same `nodeCredentials.read(profileId)`,
4. constructs `Authorization: Bearer <credential>` to POST the chat completions endpoint.

---

## P. Root Cause

No local credential injection / binding / resolution / header defect was found. The credential the connection test sends is the exact value saved to the encrypted store, and the request shape matches the production contract.

**Observation (not a credential defect, per scope):** the profile's configured `baseUrl` is the MAAS workspace endpoint (`https://ws-1miaebhuom22vyxa.cn-beijing.maas.aliyuncs.com/api/v1`) while the user's direct successful test used the DashScope shared compatible-mode endpoint (`https://dashscope.aliyuncs.com/compatible-mode/v1`). Per the phase scope, Base URL was not investigated; this is recorded as an observation for the user, not a finding of this audit.

Given the direct-test key is valid against the shared endpoint, the most probable explanations are outside the audited local chain (e.g. the key saved differs from the direct-test key, or the endpoint/account binding for the saved key differs). These require user-side verification, not a code change.

---

## Q. Corrective Owner

**NONE — no local defect found.** If the user wants to pursue further, the next check is user-side: confirm the key stored via the Web UI equals the key that succeeded in the direct test (provider-side verification), and confirm the configured Base URL / model binding.

---

## R. Production / Test / Provider

```
Production source changes:  0
Test source changes:        0
External Provider HTTP:     0
Image generation:           0
GET models:                 0
Direct probe:               0
```

## S. Golden

```
Golden auto-update:         NO
Golden changed:             NO
```

## T. Secret Audit

- No credential content read, printed, echoed, or persisted.
- No prefix / suffix / length / substring / hash / fingerprint.
- Only boolean status (SET / NOT SET / PRESENT / ABSENT / SUCCESS / MATCH).
- Synthetic sentinel was an obvious fake, substituted in the report.

---

## U. Working Tree / Local / Remote

- Working tree: EMPTY (after this doc commit).
- Local == Remote: MATCH (post-push).

---

## V. Final Decision

```
AUDIT:                      PASS
FIRST BROKEN BOUNDARY:      NONE (WC-01..WC-12 healthy)
ROOT CAUSE:                 NO LOCAL CREDENTIAL DEFECT FOUND
CORRECTIVE OWNER:           NONE
PRODUCTION CORRECTIVE:      NOT REQUIRED
```

The Masterpiece Web credential save / resolve / test-connection chain is internally correct. The saved key is the key the connection test sends, in the exact production `Authorization: Bearer <key>` contract. Remaining discrepancy (Web 401 vs direct-test success) is external to this audited chain (user-side key/endpoint/account verification).

---

## W. Next Step

1. User verifies that the key stored through the Web UI is the same key that succeeded in the direct PowerShell test (re-enter / re-save if needed).
2. User confirms the profile's Base URL (currently a MAAS workspace endpoint) matches the intended DashScope access mode.
3. Re-run "测试连接" from the Web UI.
4. **STOP. No automatic remediation. No Provider call.**
