# A4 Operational Runbook

**Phase:** Visual Analysis A4 — Production Freeze & Operational Baseline
**Date:** 2026-08-12
**Status:** `A4_OPERATIONAL_RUNBOOK_FROZEN`
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A4-Production-Freeze-Operational-Baseline.md` §14
**Predecessor:** A4-1 + A4-2 + A4-3 + A4-4
                A3 `VISUAL_ANALYSIS_A3_PASS` (`2514784`)

## 1. Purpose (per A4 spec §14)

Provide actual repository commands / paths for the canonical
operational tasks. Rollback must use the **current
provider-policy authority**. It must **NOT** restore an old
branch, duplicate a legacy pipeline, or rewrite historical
projects.

## 2. Identify resolved provider / model (per A4 spec §14)

### 2.1 From a Node / Shared Runtime consumer

```js
import { getCurrentProviderPolicy } from '@masterpiece/runtime-core/application/provider-policy.js';

const policy = getCurrentProviderPolicy();
const resolved = {
  provider: policy.default.provider,  // 'volcengine'
  model:    policy.default.model,     // 'doubao-seed-2.1-turbo' (canonical)
};
```

### 2.2 From the canonical Analysis Provider Registry

```js
import { createDefaultAnalysisProviderRegistry } from '@masterpiece/model-runtime/analysis-provider-registry.js';

const registry = createDefaultAnalysisProviderRegistry();
const provider = registry.resolve({});  // empty config -> policy default
console.log(provider.id);                // 'volcengine'
```

### 2.3 From the CLI

```bash
# Print the policy default + alternatives
node -e "import('./packages/runtime-core/src/application/provider-policy.js').then(m => console.log(JSON.stringify(m.getCurrentProviderPolicy(), null, 2)))"

# Run a real analysis with the policy default
node apps/cli/bin/masterpiece-os.js analyze <素材目录>

# Run with explicit Qwen (verifies the A2-H §11 preservation)
node apps/cli/bin/masterpiece-os.js analyze <素材目录> --provider qwen
```

### 2.4 From the Web

The Web `ProviderBadge` component
(`apps/web/src/components/ProviderBadge.tsx`) shows the current
provider + model + fallback availability in the Analysis
workspace header. It reads from `ProjectRecord.provider` /
`ProjectRecord.model` (which the runtime populates from the
policy default).

## 3. Inspect a failed analysis run (per A4 spec §14)

### 3.1 Per-run JSON (CLI)

The CLI run-logger writes a per-run JSON to
`<projectRoot>/outputs/runtime/analysis-run-<timestamp>.json` (or
the user-configured output path). Each run report includes:

```text
status               'success' | 'failed'
failureStage         'asset-inventory' | 'visual-preparation' | ... | 'creative-director' | 'output-write'
error.code           <canonical code, e.g. 'AUTHENTICATION_FAILED', 'TIMEOUT', 'RATE_LIMITED', ...>
error.message        <redacted message>
error.cause          <upstream code, e.g. 'QWEN_REQUEST_TIMEOUT'>
model                <model that was used, e.g. 'doubao-seed-2-1-turbo-260628'>
provider             <provider that was used, e.g. 'volcengine'>
```

### 3.2 Reasoner provenance (per call)

`packages/model-runtime/src/{qwen,volcengine}-reasoner.js` attach
a `provenance` object to every successful canonical result:

```text
provenance.startedAt        ISO-8601 timestamp (before the HTTP call)
provenance.latencyMs        wall-clock duration of the HTTP call
provenance.status           'ok'
provenance.retryCount       0  (A3 does not retry)
provenance.fallback         null (A3 does not execute fallback)
provenance.usage            { inputTokens, outputTokens, totalTokens, raw, cost:'UNKNOWN' } | null
```

For a failed run, the canonical contract is NOT returned; the
caller sees the error object with the upstream `code` (e.g.
`QWEN_REQUEST_TIMEOUT`) and the message. The
`normalizeAnalysisProviderError` wrapper at
`packages/model-runtime/src/analysis-provider.js:38-49` maps the
upstream code to one of the 6 canonical error codes:

```text
AUTHENTICATION_FAILED, TIMEOUT, RATE_LIMITED, MALFORMED_RESPONSE,
MODEL_UNAVAILABLE, REQUEST_FAILED
```

## 4. Distinguish credential / network / provider / schema failure (per A4 spec §14)

The canonical error code (in the run report's `error.code`) is
the first classifier. For deeper triage, look at the upstream
`error.cause` (in the error object) and the A4-2 Operational
Failure Matrix (`docs/visual-analysis/A4-operational-failure-matrix.md`).

| Canonical code | Likely cause | Upstream `error.cause` clues | First action |
|---|---|---|---|
| `AUTHENTICATION_FAILED` | missing / wrong API key | `*_API_KEY_MISSING`, `*_API_ERROR (HTTP 401/403)` | check `QWEN_API_KEY` / `VOLCENGINE_API_KEY` / `ARK_API_KEY` env |
| `TIMEOUT` | upstream too slow | `*_REQUEST_TIMEOUT` | re-run; if persistent, the alternative provider is the rollback path (post A3.x fallback executor) |
| `RATE_LIMITED` | upstream throttling | `*_API_ERROR (HTTP 429)` | re-run after a delay; alternative provider is the rollback path |
| `MALFORMED_RESPONSE` | provider returned invalid JSON or empty report | `*_RESPONSE_INVALID`, `*_EMPTY_REPORT` | re-run; if persistent, the provider may be returning a contract change (canonical contract defect) |
| `MODEL_UNAVAILABLE` | model not found / not deployed | `*_API_ERROR (HTTP 404)`, `ANALYSIS_PROVIDER_UNSUPPORTED:<id>` | verify model name in the policy; verify the API key has access to the model |
| `REQUEST_FAILED` | network error or generic upstream failure | `*_REQUEST_FAILED` with the network error text | check connectivity; check upstream status page; A3-B classifies as `TRANSPORT_FAILURE` for fallback purposes |

For deeper triage, run the A3-F health probe:

```bash
node scripts/a3-provider-health-probe.mjs --provider volcengine
node scripts/a3-provider-health-probe.mjs --provider qwen
node scripts/a3-provider-health-probe.mjs --all
node scripts/a3-provider-health-probe.mjs --list
node scripts/a3-provider-health-probe.mjs --clear
```

The probe sends a 1-char prompt and records the result via
`setProviderHealth(providerId, state)`. The cache is
process-local; the `--list` output shows the cached state per
provider.

## 5. Verify fallback occurrence (per A4 spec §14)

**Important:** A3 classifies errors for fallback eligibility but
does NOT execute the fallback. A4-2 §6 freezes this. To verify
the classification (without execution), inspect:

```js
import { isFallbackEligible, classifyFallbackReason } from '@masterpiece/runtime-core/application/provider-policy.js';

const error = { code: 'RATE_LIMITED', message: 'too many requests' };
console.log(isFallbackEligible(error));     // true
console.log(classifyFallbackReason(error)); // 'RATE_LIMIT'
```

For the offline contract tests of `isFallbackEligible` /
`classifyFallbackReason`, run:

```bash
node --test tests/a3-fallback-classification.test.js
```

10/10 PASS at A4 freeze.

## 6. Run offline provider contract tests (per A4 spec §14)

```bash
# All A3 + A4 contract tests
node --test tests/a3-provider-policy.test.js tests/a3-fallback-classification.test.js tests/a3-provenance-shape.test.js tests/a3-observability-fields.test.js tests/a3-cli-default-resolution.test.js tests/a3-provider-health.test.js tests/a4-anti-regression-guards.test.js tests/analysis-provider-contract.test.js tests/volcengine-analysis-provider-contract.test.js

# Or, all root tests + per-package tests
npm test
```

Result at A4 freeze: 842/842 PASS.

## 7. Run opt-in real smoke (per A4 spec §14)

The real provider smoke is **manual / opt-in / credential-
dependent / cost-sensitive**. It is NEVER in `repo:verify`.

### 7.1 Pre-requisite

Source the env file (gitignored; never committed):

```powershell
. .codex-smoke/a2-h-env.ps1
$env:VOLCENGINE_MODEL = 'doubao-seed-2-1-turbo-260628'
$env:QWEN_MODEL       = 'qwen3.6-plus'
```

### 7.2 Run

```bash
# Volcengine default-path smoke + Qwen explicit smoke
node .codex-smoke/a2-h-real-smoke.mjs

# Health probe (each provider independently)
node scripts/a3-provider-health-probe.mjs --all
```

The smoke runner writes an audit JSON to
`.codex-smoke/a2-h-real-smoke/<timestamp>.json` (gitignored). The
file contains the canonical results, provenance, and the
provider's response. The keys are NEVER written to the audit
JSON (the runner uses environment variables; the response body is
recorded verbatim from the upstream).

## 8. Verify Frozen Prompt (per A4 spec §14)

```bash
# Recompute SHA-256 against A2-final-freeze §6 digests
node scripts/verify-a4-frozen-prompt.mjs
```

The script returns PASS if the digests match; FAIL with the
specific file + observed/expected digest if any digest has
drifted. The offline contract test
`tests/a4-anti-regression-guards.test.js` independently verifies
that the guard's source contains the recorded digests.

## 9. Verify Golden (per A4 spec §14)

```bash
# Full Golden test (Q-01..Q-05 + G-04 hard gate)
npm run golden:test

# Recompute SHA-256 against A2-final-freeze §7 digests
node scripts/verify-a4-golden-mutation.mjs
```

`golden:test` runs 5 Golden cases; G-04 is the hard gate. The
`verify-a4-golden-mutation` guard checks the SHA-256 of the two
canonical baseline JSON files (`qwen-baseline.json` and
`volcengine-baseline.json`).

## 10. Safely roll back the default provider (per A4 spec §14)

The rollback is a **single line change** in
`packages/runtime-core/src/application/provider-policy.js`. It
swaps `default.provider` from `volcengine` to `qwen` (and
`default.model` to `qwen3.6-plus`). The Volcengine provider
remains registered as `alternative[0]`; it is NOT deleted. The
Qwen provider remains the explicit / fallback-eligible
alternative.

```diff
- default: Object.freeze({ provider: 'volcengine', model: 'doubao-seed-2.1-turbo' }),
+ default: Object.freeze({ provider: 'qwen',      model: 'qwen3.6-plus' }),
```

After the change:

```bash
# Re-run the full verify suite to confirm the rollback is clean
npm run repo:verify
npm test
npm run cli:test
npm run runtime:test
npm run golden:test
```

The rollback does NOT:

- restore an old branch
- duplicate a legacy pipeline
- rewrite historical projects
- delete the alternative provider

After the rollback, the audit trail (golden, run reports, project
records) is preserved verbatim. The `current product feature
lost` count is 0; the `current authority conflict` count is 0
(there is still exactly one source of truth: the policy file).

## 11. Verify A4 guard intent (per A4 spec §11 + §14)

| Guard intent | How to verify |
|---|---|
| G-A4-01 default authority | `npm run verify:a4-default-authority` |
| G-A4-02 registry bypass | `npm run verify:workspace-boundaries` (existing) |
| G-A4-03 frozen prompt | `npm run verify:a4-frozen-prompt` |
| G-A4-04 provider-specific downstream | `npm run verify:production-boundaries` + `npm run verify:workspace-boundaries` (existing) |
| G-A4-05 version namespace | `npm run verify:a4-version-namespace` |
| G-A4-06 legacy desktop | `npm run verify:a4-legacy-desktop` |
| G-A4-07 golden mutation | `npm run verify:a4-golden-mutation` |
| G-A4-08 provider contract | `npm run repo:guard:test` (includes `tests/analysis-provider-contract.test.js` + `tests/volcengine-analysis-provider-contract.test.js`) |
| G-A4-09 default/fallback separation | `npm run verify:a4-default-authority` (covered together with G-A4-01) |
| G-A4-10 secret safety | `npm run verify:a4-secret-safety` |

The aggregate `npm run verify:a4` runs all 6 new A4 guards; the
`npm run repo:verify` runs all 9 verify gates (including
`verify:a4`).

## 12. Run the full final verification (per A4 spec §12)

```bash
# 1. Run targeted tests for changed guards
node --test tests/a4-anti-regression-guards.test.js

# 2. Run the complete CURRENT verification suite
npm run repo:verify

# 3. Run CURRENT full-flow verification
npm test
npm run cli:test
npm run runtime:test
npm run web:smoke
npm run golden:test

# 4. Launch Actual Web again on the final accepted code
npm run web:smoke

# 5. Verify default provider resolution
node -e "import('./packages/runtime-core/src/application/provider-policy.js').then(m => console.log(m.getCurrentProviderPolicy().default))"

# 6. Verify explicit Qwen resolution
node -e "import('./packages/model-runtime/analysis-provider-registry.js').then(m => { const r = m.createDefaultAnalysisProviderRegistry().resolve({ provider: 'qwen' }); console.log(r.id); })"

# 7. Verify unknown provider explicit error
node -e "import('./packages/model-runtime/analysis-provider-registry.js').then(m => { try { m.createDefaultAnalysisProviderRegistry().resolve({ provider: 'not-a-real-provider' }); } catch (e) { console.log(e.code, e.message); } })"

# 8. Verify Golden 5/5 and G-04
npm run golden:test

# 9. Verify Repository Contract
npm run verify:repository-contract

# 10. Verify clean secret scan and version/authority guards
npm run verify:a4-secret-safety
npm run verify:version-consistency
npm run verify:version-naming
```

If code changes after any final run, rerun the affected tests and
then the complete final verification.
