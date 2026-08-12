# A2-H Provider Preservation Report

**Phase:** Visual Analysis A2 — Default Provider Switch
**Batch:** A2-H.11 (Qwen Preservation) + A2-H.31 / §32 / §33 / §34
**Date:** 2026-08-12
**Status:** `A2H_PROVIDER_PRESERVATION_PASS` (Qwen adapter / reasoner / baseline / fixture / contract test all preserved; explicit Qwen selection still works)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-H-Default-Provider-Switch.md` §11, §13, §31, §32, §33, §34

## 1. Qwen Preservation Checklist (per A2-H §11)

A2-H §11 forbids deletion or disablement of:

- Qwen provider registration — **PRESERVED** (still in
  `createDefaultAnalysisProviderRegistry` array, second position
  after the switch)
- Qwen adapter (`packages/model-runtime/src/qwen-analysis-provider.js`)
  — **UNCHANGED** (file mtime pre-A2-H; not touched by the diff)
- Qwen credentials / profile support — **PRESERVED**
  (`node-credential-store.ts` is provider-agnostic; the
  `MASTERPIECE_API_KEY_<PROFILE_ID>` env-var override and
  per-profile encrypted stores continue to work for any
  Qwen-profile `profileId`)
- Qwen explicit selection — **PRESERVED** (verified by
  `tests/analysis-provider-contract.test.js` L23-27 and L61-64
  post-switch)
- Qwen tests — **PRESERVED** (`tests/analysis-provider-contract.test.js`
  contract tests for Qwen still pass)
- Qwen A2 baseline — **PRESERVED**
  (`tests/provider-contract-fixtures/qwen-baseline.json`
  unchanged)
- Qwen regression fixtures — **PRESERVED** (A2-D raw outputs
  under `docs/visual-analysis/evaluation/C0X/qwen/` unchanged)

## 2. Expected State Achieved (per A2-H §11)

```text
Default = Volcengine
Alternative = Qwen
```

This is the state after the A2-H switch. The state is verified by:

- `tests/analysis-provider-contract.test.js` `default registry
  first provider is Volcengine (A2-G default)` — default first
  entry is `volcengine`
- `tests/analysis-provider-contract.test.js` `default registry
  still includes Qwen as alternative (A2-H §11 preservation)` —
  default list includes `qwen`
- `tests/volcengine-analysis-provider-contract.test.js`
  `Qwen baseline is preserved alongside the new Volcengine
  default (A2-H §11)` — explicit `provider: 'qwen'` resolves
  to `qwen`; default Volcengine configuration resolves to
  `volcengine`

## 3. Forbidden End State Not Reached (per A2-H §11)

```text
Only Provider = Volcengine
```

This state is NOT reached. Qwen remains a registered default
provider, accessible via explicit selection. The two forbidden
end states from A2-H §11 / §15 / §17 — `qwen-analysis-pipeline`
or `volcengine-analysis-pipeline` dual pipelines, or
provider-specific business branches — are also NOT reached.

## 4. Explicit Qwen Test (per A2-H §13)

Tested via:

- `tests/analysis-provider-contract.test.js` L23-27: explicit
  configuration with `provider: 'dashscope'` (the A1 baseline
  profile provider) and `model: 'qwen3.6-plus'` resolves to
  the Qwen reasoner factory. PASS.
- `tests/analysis-provider-contract.test.js` L61-64: unset
  `provider` with `model: 'qwen3.6-plus'` resolves to `qwen`
  (the model-prefix dispatch path). PASS.
- `tests/volcengine-analysis-provider-contract.test.js`
  `Qwen baseline is preserved alongside the new Volcengine
  default`: explicit `provider: 'qwen'` + `model: 'qwen3.6-plus'`
  resolves to `qwen`. PASS.

## 5. Persistence Compatibility (per A2-H §31 / §32)

- **Existing projects rewritten = NO**
- **Existing Qwen projects readable = YES (semantic claim;
  verified at read time)**

A2-H does not bulk-rewrite project files. The
project-persistence schema is provider-agnostic; existing
projects' `project-context/visual-decision-packet.json` records
their analysis provenance as
`{provider: 'qwen', model: 'qwen3.6-plus'}` and these records
are left as-is (per A2-H §32: "If old runs record
`qwen` / `qwen3.6-plus`, leave them historically accurate").

A future re-analysis of an existing project under the new default
will produce a new provenance record
(`{provider: 'volcengine', model: 'doubao-seed-2.1-turbo-260628'}`)
alongside the historical one, not rewrite the historical one.

## 6. Settings / Profile Compatibility (per A2-H §33)

- **system default vs explicit saved preference distinction = YES**

The A2-H switch is a code-level change to the
`createDefaultAnalysisProviderRegistry` factory. It does NOT
silently mutate any user-saved explicit preference in
`node-settings-store.ts`. Specifically:

- `StoredSettings.profiles` (the user's saved API Profiles) —
  unchanged. Each profile retains its own
  `provider` / `protocol` / `modelId` / `baseUrl` /
  `credentialKey` / `isDefault` / `isEnabled` fields.
- `StoredSettings.defaultProfileId` — unchanged. The user-selected
  default profile remains the user's choice; A2-H does not
  flip it.
- A user with an explicit Qwen profile does NOT silently
  migrate to Volcengine. The Qwen profile remains Qwen, and
  can be set as the default via `setDefaultApiProfile()` (the
  user-initiated action), but the system does not
  auto-overwrite it.

The distinction is recorded in
[`A2-H-default-provider-authority-audit.md` §5](./A2-H-default-provider-authority-audit.md#5-compatibility-fields).

## 7. Credentials (per A2-H §34)

- **API keys not copied between providers = YES**
- **API keys not committed = YES**
- **Full credentials not printed in logs / reports = YES**
- **Volcengine credentials absent → fail explicitly (not silent
  Qwen fallback) = YES**

A2-H does not write any credential. Test fixtures use
`apiKey: 'fixture-secret'` (redacted-style), never the real
user keys. Real-provider calls (when authorized) read keys from
the env vars `QWEN_API_KEY` / `VOLCENGINE_API_KEY` /
`MASTERPIECE_API_KEY` (per `qwen-reasoner.js` L185-187 and
`volcengine-reasoner.js` analogous), and the reasoner layer
redacts the key in error messages (per
`tests/analysis-provider-contract.test.js` `Volcengine adapter
redacts the API key from error messages via the registry`).

If a Volcengine run is requested without a Volcengine credential,
the Volcengine reasoner throws `VOLCENGINE_API_KEY_MISSING` and
the registry normalizes to `AUTHENTICATION_FAILED`. The system
does NOT silently use Qwen as a substitute.

## 8. Acceptance criteria

- A2-H §11 Qwen provider registration preserved — PASS
- A2-H §11 Qwen adapter preserved — PASS
- A2-H §11 Qwen credentials / profile support preserved — PASS
- A2-H §11 Qwen explicit selection preserved — PASS
- A2-H §11 Qwen tests preserved — PASS
- A2-H §11 Qwen A2 baseline preserved — PASS
- A2-H §11 Qwen regression fixtures preserved — PASS
- A2-H §13 explicit Qwen still resolves to Qwen — PASS
- A2-H §31 existing projects not rewritten — PASS
- A2-H §32 historical Qwen provenance left intact — PASS
- A2-H §33 explicit Qwen profile not silently migrated — PASS
- A2-H §34 credentials not committed / logged / printed — PASS
- A2-H §34 Volcengine-missing-credentials fails explicitly — PASS
- A2-H §58 Qwen adapter preserved — PASS
- A2-H §58 Qwen regression baseline preserved — PASS
- A2-H §58 Existing Qwen projects readable — PASS
- A2-H §58 Credentials committed = NO — PASS
